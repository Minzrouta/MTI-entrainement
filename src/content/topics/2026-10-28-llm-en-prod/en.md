---
title: "LLMs in production: cost, latency, evals & limits"
date: "2026-10-28"
category: "IA"
level: "Avancé"
summary: "Paying per token changes everything: caching, fallback, evals, observability — what separates an LLM demo from a product, and what AI teams expect from an intern in an interview."
---

## The essentials

An LLM demo takes an afternoon: a prompt, an API call, a UI. Production reveals four walls the demo was hiding: **cost** (every call is billed per token), **latency** (several seconds per answer), **reliability** (the model returns free text, not an API contract) and **evaluation** (how do you know quality isn't degrading?). In an interview, this topic separates people who ran notebooks from people who ran a product.

The bill first. A call is paid in **input tokens** (system prompt, context, history) and **output tokens** (the answer), with output usually costing 3 to 5 times more. The hidden cost lies elsewhere: the API is **stateless**, so a chat resends the whole history on every turn. By turn 50, you are re-paying the previous 49 turns as input — the cumulative cost of a conversation grows almost quadratically with its length.

| Lever | Cost effect | Latency effect | Trade-off |
|---|---|---|---|
| Prompt caching | up to −90% on the repeated prefix | lower TTFT (prefill skipped) | prefix must be byte-identical |
| Smaller model | −80 to −95% | faster tokens/s | quality must be proven by evals |
| Batch API | typically −50% | results in minutes/hours | async workloads only |
| `max_tokens` + concise prompts | proportional | shorter answers | may truncate useful output |
| Streaming | none | perceived latency ÷ 10 | UI complexity (SSE, partial parsing) |
| Truncate/summarize history | breaks the quadratic growth | shorter input | loss of conversational memory |

## How it works

Latency is measured with two distinct metrics: **time-to-first-token** (TTFT, the delay before the first word) and **throughput** (tokens per second afterwards). **Streaming** doesn't change total duration but transforms the experience: the user reads while the model writes, and perceived latency drops to the TTFT. A chatbot without streaming feels broken past two seconds; with it, ten seconds of generation go unnoticed.

Reliability rests on one principle: **LLM output is untrusted input**. A model can return invalid JSON, a missing field, an unexpected format — even at temperature 0. The robust pipeline combines structured output (tool calling or JSON mode on the API side), **strict schema validation** (zod, pydantic), retry with backoff, and **fallback** to a second model when the primary fails or times out.

```text
Request ──▶ input guardrails (PII, injection)
   │
   ▼
Primary model ──error/timeout──▶ retry (backoff)
   │                                │ failure
   ▼                                ▼
Schema validation ──invalid──▶ fallback model
   │ ok                             │
   ▼                                ▼
Response (stream)            validation, then response
   │
   ▼
Traces: latency, tokens, cost per feature
```

The same contract in code:

```typescript
import { z } from "zod";

// The schema IS the API contract: everything the model
// outputs is validated before it enters the system.
const Invoice = z.object({
  vendor: z.string().min(1),
  total_cents: z.number().int().nonnegative(),
  currency: z.enum(["EUR", "USD"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const MODELS = ["big-model", "small-fallback-model"];

async function extractInvoice(text: string, attempt = 0) {
  const res = await llm.complete({
    model: MODELS[Math.min(attempt, 1)], // fallback on retry
    max_tokens: 300,          // hard cap on output cost
    prompt: extractionPrompt(text),
  });
  const parsed = Invoice.safeParse(JSON.parse(res.text));
  if (!parsed.success) {
    if (attempt < 2) return extractInvoice(text, attempt + 1);
    // → human review queue, never corrupted data
    throw new Error("Invalid extraction after 3 attempts");
  }
  return parsed.data; // typed, guaranteed to match the schema
}
```

> 🎤 **In an interview** — "How would you put an LLM in production without blowing the budget?" An answer that lands: "I measure first — traces with tokens and cost per call. Then, in order: prompt caching on the stable prefix, a smaller model wherever evals prove it's enough, batch for everything async, a `max_tokens` cap. All driven by a cost-per-feature dashboard, not gut feeling."

## Key concepts to master

- **Prompt caching**: the provider bills ~10% of the normal price for a prefix it has already seen. Condition: the prefix must be byte-identical. Hence the architecture rule: system instructions and stable documents at the head of the prompt, variable content at the tail.
- **Model cascade**: route simple requests to a small model, keep the big one for hard cases. The decision is based on evals, never on intuition.
- **Automated evals**: a business test set (50 to 200 annotated real cases) replayed on every prompt or model change, like regression tests. Without evals, changing a prompt in production is deploying without tests.
- **LLM-as-judge**: having another LLM grade the outputs. It scales, with documented biases: preference for long answers (verbosity bias), for the first position in a comparison (position bias), for its own outputs (self-preference). Calibrate against a human-annotated sample.
- **LLM observability**: every call traced — prompt, response, latency, tokens, cost, prompt version — and aggregated **per feature**. "Auto-summary costs 40% of the bill for 5% of usage" is a sentence that triggers decisions.
- **Hallucinations**: the model predicts the most plausible text, not the most true. It's structural — it can be **mitigated** (RAG to ground answers in sources, verifiable citations, human in the loop on critical actions), it cannot be "fixed".
- **Security**: **prompt injection** — hostile instructions hidden in processed content ("ignore your instructions and…") — has no guaranteed fix, because the model doesn't separate instructions from data. Defense in depth: least privilege for tools, output validation, human confirmation for sensitive actions.

> ⚠️ **Sensitive data** — every prompt lands on the provider's servers. Before sending customer data: data processing agreement (DPA), retention policy, training opt-out, anonymization where possible. "We'll just send it to the API" is a legal decision as much as a technical one.

## In an interview

**"How do you reduce the latency of an LLM chatbot?"** — Distinguish real from perceived latency. Perceived: streaming — the answer starts at the TTFT, a few hundred milliseconds. Real: smaller model, shorter prompt, prompt caching (a cached prefix speeds up prefill), capped output length. Bonus: precompute offline whatever can be.

**"How do you guarantee valid JSON output?"** — You "guarantee" nothing with the prompt alone: JSON mode or tool calling on the API side, then systematic schema validation (zod/pydantic) on the client side, retry on failure, fallback after that. LLM output is treated like untrusted user input.

**"How do you evaluate the quality of an LLM feature?"** — A business test set built from real cases, replayed in CI on every prompt or model change. Automatable metrics where the task allows (extraction accuracy, format compliance); LLM-as-judge calibrated on a human sample for the rest; in production, response sampling and user feedback.

**"Can hallucinations be eliminated?"** — No: they are structural, the model optimizes plausibility, not truth. You reduce their frequency and impact: RAG with citations, a constrained answer domain, allowing "I don't know", a human in the loop for consequential actions. A candidate who promises "zero hallucinations" disqualifies themselves.

**"What is prompt injection?"** — The LLM equivalent of SQL injection, without the equivalent of prepared statements: the model doesn't distinguish instructions from data in its context, so a processed document or web page can carry hostile orders. Mitigations: least privilege for the agent's tools, output validation, human confirmation of sensitive actions.

## Pitfalls & misconceptions

- **"We have 200k tokens of context, throw everything in"** — long context is paid on every call, stretches prefill, and models retrieve information buried in the middle poorly ("lost in the middle"). Selective RAG is often more accurate and cheaper.
- **"Temperature 0 = determinism"** — not guaranteed: floating-point math and server-side batching introduce variation. Validation stays mandatory even at temperature 0.
- **"The small model is necessarily worse"** — on a well-scoped task (classification, extraction), a well-prompted small model often matches the big one. Only evals settle it, in both directions.
- **Naive retries** — retrying without backoff makes a rate limit worse; retrying a non-idempotent action (sending an email) duplicates it. Exponential backoff + idempotency, like any API.
- **Taking LLM-as-judge at face value** — without human calibration, you optimize the judge's biases (length, position), not real quality.

> 💡 **Budget reflex** — the cost of an LLM feature is computed before writing it: (average input tokens × input price + average output tokens × output price) × calls per day. Three minutes of arithmetic beat a surprise at the end of the month.

## Going further

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — prompt injection at the top of the list
- [Judging LLM-as-a-Judge (Zheng et al., 2023)](https://arxiv.org/abs/2306.05685) — the reference paper on judge biases
- [Prompt caching — Anthropic docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) and [Batch API — OpenAI docs](https://platform.openai.com/docs/guides/batch)
- [Langfuse](https://langfuse.com/) and the [OpenTelemetry GenAI conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) to trace cost and latency per feature
