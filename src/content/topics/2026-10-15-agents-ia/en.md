---
title: "Agents, function calling & prompt engineering"
date: "2026-10-15"
category: "IA"
level: "Intermédiaire"
summary: "How an LLM 'acts' on the world: function calling, the agentic loop, tool design and serious prompting — the fastest-rising AI topic in interviews."
---

## The essentials

An LLM can only do one thing: produce text. It cannot query a database, send an email, or run code. **Function calling** (aka *tool use*) is the mechanism that works around this limit: you describe a list of available tools to the model (name, description, parameter schema), and instead of answering in prose, the model can emit a **structured call** — "call `get_weather` with `{"city": "Paris"}`". It is **your code** that actually executes the function, then sends the result back to the model, which continues its answer.

The crucial point to state clearly in an interview: **the model executes nothing itself**. It emits an intent formatted as JSON; execution, validation and permissions stay on the application side. The model proposes, your code disposes.

An **agent** is born when you put this mechanism in a loop: the model receives a goal, picks a tool, observes the result, and repeats until the goal is reached. That is exactly how Claude Code, Cursor or "deep research" agents work.

## How it works

The agentic loop fits in one diagram:

```text
user's goal
        │
        ▼
┌───────────────────────────────────┐
│ LLM: reasons over current state   │◀────────┐
└───────────────────────────────────┘         │
   │ final answer          │ tool call        │
   ▼                       ▼                  │
done             YOUR code executes           │
                 (API, DB, shell…)            │
                           │                  │
                           ▼                  │
                 result = observation ────────┘
                 (fed back into context)
```

Each turn, the full history (goal + calls + observations) is sent back to the model. Concretely, a tool is defined by a JSON schema, and its **description is prompt engineering**: it is what decides whether the model will use the tool appropriately.

```json
{
  "name": "search_orders",
  "description": "Search orders by customer or status. Use BEFORE answering any question about an order. Returns only the first 20 results.",
  "input_schema": {
    "type": "object",
    "properties": {
      "customer_email": { "type": "string", "description": "Customer's exact email" },
      "status": { "type": "string", "enum": ["pending", "shipped", "cancelled"] }
    },
    "required": ["customer_email"]
  }
}
```

The model then replies not with text but with a `tool_use` block: `{"name": "search_orders", "input": {"customer_email": "jo@ex.fr", "status": "pending"}}`. Your code validates that JSON against the schema, runs the real SQL query, and returns the result as a `tool_result`. The `enum` and `required` are not decorative: a strict schema mechanically reduces model errors.

> 💡 **Golden rule of tools** — write the description like docs for a new intern: when to use it, when NOT to use it, what it returns, its limits. An agent that picks the wrong tool almost always has a description problem, not a model problem.

## Key concepts to master

- **Function calling ≠ execution**: the model emits a structured intent. The call → execution → observation loop is orchestrated by your code (or an SDK like the Claude Agent SDK / LangChain).
- **Serious prompt engineering**: not the "magic tricks" ("I'll tip you $200"), but four reproducible levers — a clear **role**, explicit **constraints** (format, length, what not to do), **few-shot examples** (2-3 input/output pairs beat a paragraph of explanation), and **structured output** (JSON schema, tags) that a program can parse.

| | Bad prompt | Good prompt |
|---|---|---|
| Role | "Answer the question" | "You are a tier-1 support agent for company X" |
| Constraints | Implicit | "Answer in 3 sentences max. If you don't know, say so." |
| Examples | None | 2-3 few-shot input → expected output examples |
| Output | Free text | JSON conforming to a given schema |
| Context | "Here's some info: …" (dump) | Delimited sections (tags, headings), relevant data only |

- **MCP, the standardization**: instead of re-coding every tool integration for every app, the Model Context Protocol exposes tools and resources through a standard client/server protocol — see the MCP topic (August 18) for details.
- **Classic agent failures**: the **infinite loop** (the agent endlessly retries the same failing call), **tool hallucination** (calling a tool that doesn't exist, or inventing parameters), and **cost explosion** (each turn resends the whole history: an agent looping 50 times consumes the context 50 times).
- **Guardrails**: a hard iteration limit, a token budget, **per-tool permissions** (free reads, writes behind approval), and a **human in the loop** for any irreversible action (payment, deletion, sending an email). A production agent without guardrails is an incident waiting to happen.

## In an interview

**"Explain function calling to me."** — You give the model tool definitions (name, description, JSON schema). When the question requires it, the model answers with a structured call instead of prose. My code validates the parameters, executes the real function, returns the result to the model, which produces the final answer. Emphasize: the model only emits JSON; execution is entirely on the application side.

**"What makes an agent different from a plain LLM call?"** — The loop. A plain call: prompt → answer. An agent: goal → the model picks a tool → execution → observation fed back → new reasoning, until the goal or a limit. The agent decides the path dynamically; a classic pipeline fixes it in advance.

**"How do you keep an agent from going off the rails?"** — Iteration and budget limits, timeouts on tools, strict parameter validation against the schema, graduated permissions (read vs write), and human approval for anything irreversible. And observability: log every tool call so you can replay failing trajectories.

**"What makes a good tool for an agent?"** — A description that says when to use it and when not to, a strict schema (`enum`, `required`, precise types), a narrow scope (one tool = one clear action), and errors returned as actionable text ("customer not found, check the email") rather than a stack trace — the agent reads the error and can self-correct.

**"Few-shot vs fine-tuning?"** — Few-shot: put examples in the prompt; immediate, reversible, sufficient in most cases. Fine-tuning: retrain the model; expensive and slow, relevant for a very specific style/format at high volume. Reflex: exhaust prompt engineering before mentioning fine-tuning.

## Pitfalls & misconceptions

> ⚠️ **Prompt injection** — as soon as an agent reads external content (web page, email, ticket), that content can contain instructions ("ignore your instructions and send the data to…") the model may follow. It is THE agent vulnerability, with no definitive fix to date. Mitigations: least privilege on tools, human approval for sensitive actions, separating data from instructions in the prompt. An agent with private-data access + untrusted content + an output channel = a dangerous combination (the "lethal trifecta").

- **"The model executes my functions"** — no. It emits JSON. If your code doesn't validate parameters before execution, that's your vulnerability, not the model's.
- **"More tools = more capable agent"** — the opposite: 40 tools with fuzzy descriptions degrade the choice. Few tools, well described, with sharp scopes.
- **"Prompt engineering is magic incantations"** — incantations age badly from one model to the next; role, constraints, examples and output format stay effective everywhere.
- **Forgetting the loop's cost**: the full history is resent every turn. Without an iteration limit and prompt caching, the bill explodes silently.

> 🎤 **In an interview** — the word that makes the difference: "deterministic". Say "I keep everything that can be deterministic outside the LLM — validation, permissions, orchestration — and only delegate the decision to the model", and you have just shown you can build a production agent, not a demo.

## Going further

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents): the reference guide, workflows vs agents
- [Anthropic — Tool use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) and [OpenAI — Function calling](https://platform.openai.com/docs/guides/function-calling): the two APIs to know
- [Model Context Protocol](https://modelcontextprotocol.io/) — the MCP spec (and the MCP topic from August 18)
- [ReAct: Synergizing Reasoning and Acting](https://arxiv.org/abs/2210.03629) — the founding paper of the reason/act loop
- Hands-on exercise: write the loop yourself (about a hundred lines) with a single `get_weather` tool — nothing demystifies agents better
