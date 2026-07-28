---
title: "How an LLM works"
date: "2026-09-03"
category: "IA"
level: "Fondamental"
summary: "Predicting the next token, over and over: that's all an LLM does. Understanding why that's enough — and where it breaks — has become an unavoidable interview question, even for a regular dev internship."
---

## The essentials

An LLM (*Large Language Model*) does exactly one thing: **predict the next token**. Give it the beginning of a text, it computes a probability for every token in its vocabulary (~100,000 entries), one token is picked, appended to the text, and the process repeats. That's **autoregressive** generation: ChatGPT, Claude or Llama don't "answer" — they complete, token by token, a document shaped like a conversation.

The real question is: *why is that enough?* Because to predict the continuation of a text well, the model is forced to capture everything that makes that continuation predictable: grammar, common facts, style, and even the structure of reasoning itself. An LLM's "reasoning" is not a hidden logic engine behind the text — it's the statistically plausible continuation of a text that looks like reasoning. That's what makes it powerful, and it's exactly what makes it confidently wrong.

## How it works

The full pipeline, from prompt to answer:

```text
        "The cat" (text)
             │  tokenizer (BPE)
             ▼
        [791, 8415]    ← tokens = integers
             │  embedding
             ▼
        vectors (1 per token)
             │
    ┌────────▼─────────┐
    │   Transformer    │  N blocks: each token
    │  attention + MLP │  "looks at" the previous
    └────────┬─────────┘  ones, weighted by relevance
             ▼
   probabilities over the whole vocabulary
   "sleeps" 31%   "eats" 12%   "is" 9% …
             │  sampling (temperature, top-p)
             ▼
        chosen token: "sleeps"
             │
             └──▶ appended to the text, and loop
```

- **Tokenization** — text is split into **tokens**: frequent fragments (whole word, word piece, punctuation) learned by a BPE-style algorithm (*Byte Pair Encoding*). Order of magnitude: 1 token ≈ 3-4 characters, ≈ 0.75 English words. The model never sees letters, only integer identifiers.
- **Embeddings** — in one sentence: each token is converted into a vector of numbers such that geometric closeness reflects closeness in meaning ("king" and "queen" are neighbors in that space).
- **Attention, the heart of the transformer** — at each layer, every token "looks at" all the tokens before it and weights their influence by how relevant they are *to it*. In "Marie's dog sleeps because **it** is tired", the token *it* gives a strong weight to *dog* and a weak one to *Marie*. No math needed in an interview: remember **"weighted context, computed dynamically, in parallel across the whole sequence"**. That parallelism is what dethroned RNNs (the 2017 paper *Attention Is All You Need*).
- **Output and loop** — after N blocks (attention + a small feed-forward network), the model produces the next-token distribution. **Sampling** picks one, and everything starts over with one more token.

> 💡 **The "strawberry" trap** — ask an LLM how many "r"s are in *strawberry*: many answer 2. Makes sense: the word arrives cut into tokens (`straw` + `berry`), two integers with no notion of letters. Counting characters, spelling backwards, doing digit-by-digit addition: everything living "below" the token level is structurally hard for the model.

## Key concepts to master

- **Pre-training** — predicting the next token on trillions of tokens (web, books, code). The result is a *base model* that completes text but doesn't "answer" — give it a question and it may generate three more similar questions.
- **Fine-tuning (SFT)** — the base model is retrained on examples of instruction → good answer dialogues. The model learns the assistant *format*.
- **RLHF** (*Reinforcement Learning from Human Feedback*) — humans rank pairs of answers; a reward model is trained on those preferences, then the LLM is optimized against it. This is what makes the model helpful, polite, and teaches it to refuse some requests.
- **Temperature and sampling** — temperature flattens or sharpens the distribution before drawing; top-p cuts the long tail:

| Setting | Effect | Use case |
|---|---|---|
| `temperature: 0` | near deterministic: always the most probable token | extraction, classification, code |
| `temperature: 0.7` | balance of variety / coherence | assistant, writing |
| `temperature: 1.5` | very random, quickly drifts into incoherence | supervised brainstorming |
| `top_p: 0.9` | only samples from the nucleus covering 90% probability | cutting absurd tokens |

- **Context window** — the "working memory": everything (system prompt, history, documents) must fit in it, and everything is **reprocessed on every call**. Concrete limits: cost proportional to size, latency, and the *lost in the middle* phenomenon (information in the middle of a very long context is used less well than the beginning and end).
- **Stateless API** — the model "remembers" nothing between two calls: your code resends the entire history with every request.

```python
from openai import OpenAI          # same logic at Anthropic, Mistral…
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        # "system": frames the behavior, high priority, invisible
        {"role": "system", "content": "Answer in 2 sentences max."},
        # the FULL history is resent on every call:
        # the API is stateless, nothing is stored model-side
        {"role": "user", "content": "What is a token?"},
    ],
    temperature=0.2,   # low = factual and near reproducible
    max_tokens=150,    # generation cap (cost + latency)
)
print(resp.choices[0].message.content)
```

> 🎤 **In an interview** — "Explain an LLM to a non-technical person": "It's a supercharged autocomplete. Like your phone keyboard suggesting the next word, but trained on a giant library and able to take whole pages of context into account. It doesn't know what's true — it knows what's plausible." Three sentences, accurate, no jargon: that's what's being evaluated.

## In an interview

**"What's an LLM, in one sentence?"** — A neural network (transformer architecture) trained to predict the next token on huge corpora, then refined (fine-tuning + RLHF) to follow instructions. Everything else — dialogue, code, apparent reasoning — emerges from that objective.

**"Why does an LLM miss the number of 'r's in strawberry?"** — Because of tokenization: it manipulates token identifiers, not letters. `strawberry` arrives as two or three fragments; counting characters requires information it never directly saw. Bonus: mention the same problem for long-hand arithmetic and anagrams.

**"Pre-training, fine-tuning, RLHF: what's the difference?"** — Pre-training: learning language and the world by predicting the next token (99% of the cost). Fine-tuning: learning the instruction → answer format on curated examples. RLHF: aligning with human preferences via a reward model. Useful image: general education → job training → soft skills.

**"What is temperature for?"** — It controls the randomness of sampling: 0 = always the most probable token (extraction, reproducible tests), higher = more diversity. Defuse the trap yourself: temperature 0 doesn't make the model *more correct*, just more deterministic.

**"Why hallucinations?"** — Because the training objective rewards *plausibility*, not truth: the model has no fact database and no native mechanism to say "I don't know". An invented reference is often the most probable continuation of a niche question. Mitigations: RAG (put the sources in the context), external tools, asking for citations — but no definitive fix.

## Pitfalls & misconceptions

> ⚠️ **"Temperature 0 = truth mode"** — no: deterministic ≠ correct. The most probable token can be a very confident hallucination. Reproducibility is no guarantee of accuracy, it's just less variance.

- **"It understands what it says"** — a loaded phrasing in interviews: prefer "it models statistical regularities of language" and leave the philosophy aside.
- **"It looks things up in a database / on the Internet"** — no: knowledge is frozen into the weights at training time (hence the *knowledge cutoff*). Browsing or RAG are *external* tools plugged in around the model.
- **"More context = always better"** — a huge context is expensive, slow, and the model exploits the middle poorly (*lost in the middle*). A short, relevant context beats a long noisy one.
- **Confusing parameters and context** — parameters (7B, 70B…) are the learned weights, frozen; the context window is the temporary input of one call. Nothing that goes through the context "retrains" the model.

## Going further

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) — Jay Alammar, the visual reference
- [But what is a GPT?](https://www.3blue1brown.com/lessons/gpt) — 3Blue1Brown, the intuition, animated
- [Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) — Andrej Karpathy, 1 hour covering this whole topic
- [OpenAI's tokenizer](https://platform.openai.com/tokenizer) — paste text and *see* the tokens
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — the founding 2017 paper (skimming the figures is enough)
