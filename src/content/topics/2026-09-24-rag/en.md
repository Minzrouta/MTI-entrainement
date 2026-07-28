---
title: "Embeddings & RAG"
date: "2026-09-24"
category: "IA"
level: "Intermédiaire"
summary: "How to plug an LLM into data it doesn't know: embeddings, vector databases and the RAG pipeline — THE AI question in 2026 internship interviews."
---

## The essentials

An **embedding** is the representation of a text (word, sentence, document) as a **vector of floating-point numbers** — typically 384 to 3072 dimensions — produced by a model trained so that two texts **close in meaning** yield vectors **close in space**. "How do I reset my password" and "I lost my credentials" share almost no words, yet their vectors are neighbors: that's **semantic proximity**, and it's what makes embedding search superior to keyword matching.

We measure that proximity with **cosine similarity**: the cosine of the angle between two vectors (1 = same direction, 0 = orthogonal, unrelated). With normalized vectors it's a simple dot product — fast even over millions of vectors thanks to approximate indexes (HNSW).

**RAG** (Retrieval-Augmented Generation) leverages this to give an LLM knowledge it doesn't have: instead of retraining the model, you **retrieve** the relevant passages at question time and **inject them into the prompt**. The model hasn't learned anything new — it just has the right page in front of it.

## How it works

Two phases: **indexing** (offline, once and then on every update) and **querying** (online, on every question).

```text
INDEXING (offline)
docs ──▶ chunking ──▶ embedding ──▶ vector database
        (pieces)     (vectors)    (pgvector, Qdrant…)

QUERY (online)
question ──▶ embedding ──▶ top-k search
                           (cosine sim.)
                                 │
             LLM ◀── prompt ◀────┘
              │    (context + question)
              ▼
        sourced answer
```

**Indexing**: split documents into **chunks** (200 to 1000 tokens, with 10-20% overlap so an idea never gets cut in half), compute each chunk's embedding, and store vector + text + metadata (source, title, date) in a vector database.

**On vector databases**: **pgvector** (a PostgreSQL extension) is the pragmatic choice — your vectors live in the database you already run, with SQL, joins and an HNSW index for approximate search. Dedicated databases (Qdrant, Weaviate, Milvus, Pinecone as managed) bring advanced filtering and scalability — useful beyond a few million vectors, overkill before that.

**Querying**: embed the question **with the same model**, retrieve the k nearest chunks (kNN), and build the prompt: instructions ("answer only from the context, cite your sources"), chunks, then the question. The LLM generates an answer grounded in the documents.

> 💡 **Golden rule** — the same embedding model at indexing time AND at query time. Two different models produce incompatible vector spaces: similarities become meaningless. Corollary: switching embedding models = reindexing everything.

> 🎤 **In an interview** — the classic question: "how would you plug a chatbot into the internal docs?". Walk through the pipeline in order (chunking → embeddings → pgvector → retrieval → prompt), justify RAG over fine-tuning (freshness, cost, citations), and finish with retrieval evaluation. You've just covered 90% of what they expect.

## Key concepts to master

- **Chunking**: the most underestimated parameter. Naive splitting (every 500 characters) cuts sentences and tables in half → incomprehensible chunks. Better: split along structure (headings, paragraphs), keep an overlap, attach metadata (section title inside the chunk).
- **RAG vs fine-tuning**: two tools for two different problems.

| | RAG | Fine-tuning |
|---|---|---|
| Adding knowledge | ✅ the use case | ❌ fuzzy memorization, hallucinations |
| Data freshness | Reindex a doc = up to date | Retrain on every update |
| Cost | Embeddings + storage (marginal) | GPUs, dataset, iterations |
| Citations / traceability | Exact quotable sources | No traceability |
| Good for | Internal docs, FAQ, support | Style, format, behavior |

- **The real problems in production**: **retrieval that misses** (domain vocabulary unknown to the embedding model, vague questions), **polluted context** (off-topic chunks drowning the useful info — LLMs read the middle of a long context poorly, the famous *lost in the middle*), and the naive chunking above. Most "the LLM answers badly" cases are actually "retrieval surfaced the wrong chunks".
- **Hybrid search** (overview): combine lexical search (BM25 — exact on words) and vector search (semantic), fused with RRF. Essential for exact identifiers (error codes, product references) that embeddings miss.
- **Reranking** (overview): a cross-encoder re-ranks the top ~50 results into a far more precise top-5. Slower, so applied *after* the fast retrieval, on few candidates.
- **Evaluation: retrieval first.** If the right chunks don't come back, no prompt will save the answer. Measure retrieval (recall@k on an annotated question set "which chunk contains the answer?"), then only generation (faithfulness to context, citation rate).

The full pipeline in pseudo-code:

```python
# --- Indexing (offline) ---
for doc in documents:
    chunks = split(doc, size=500, overlap=50)  # along structure if possible
    for c in chunks:
        vec = embed(c.text)                    # same model everywhere!
        db.insert(vec, c.text, c.metadata)     # pgvector, Qdrant…

# --- Query (online) ---
q_vec = embed(question)                        # the SAME model
hits = db.search(q_vec, top_k=5)               # kNN, cosine similarity
context = "\n\n".join(h.text for h in hits)

prompt = f"""Answer only from the context.
Cite your sources. If the info isn't there, say so.

Context:
{context}

Question: {question}"""

answer = llm(prompt)                           # "augmented" generation
```

## In an interview

**"What is an embedding?"** — A dense vector of floats produced by a language model, capturing the *meaning* of a text: two semantically close texts yield close vectors. Vectors are compared with cosine similarity. It's the building block of semantic search, clustering and RAG.

**"Why RAG rather than fine-tuning for company docs?"** — Three reasons: **freshness** (reindexing a document is enough, no retraining), **cost** (embeddings versus hours of GPU), **citations** (you know which document the answer came from — critical for trust and debugging). Fine-tuning is for changing *behavior* (tone, format), not injecting factual knowledge.

**"Your RAG answers badly: how do you debug it?"** — Retrieval first, not the prompt: I log the retrieved chunks and check whether they contain the answer. If they don't → chunking problem, embedding model problem, or need for hybrid/reranking. If they do → prompt problem or polluted context (reduce k, rerank).

**"Cosine similarity vs Euclidean distance?"** — Cosine compares the *direction* of vectors, ignoring their norm; Euclidean measures absolute distance. With normalized vectors (the standard case for embedding models), both give the same ranking — cosine is the convention.

**"How do you handle doc updates?"** — Incremental reindexing: a hash per chunk, re-embed only what changed, delete orphaned chunks. Never a full reindex on every commit.

## Pitfalls & misconceptions

> ⚠️ **Classic trap** — comparing embeddings from **different models** (or different versions of the same model): the similarities are noise. Typical symptom: retrieval that turns absurd after a "simple update" of the embedding model without reindexing.

- **"More chunks in the context = better answer"** — no: beyond a certain k you add noise, cost, and the useful info gets lost in the middle (*lost in the middle*). Better 5 reranked chunks than 20 raw ones.
- **"RAG eliminates hallucinations"** — it reduces them. The model can ignore the context or embellish around it. Hence strict instructions ("if the info isn't there, say so") and verifiable citations.
- **Similarity ≠ relevance**: "how do I delete my account" and "how do I create my account" are very close in cosine… and opposite in intent. That's exactly what reranking fixes.
- **Dedicated vector database by default** — an over-engineering reflex: pgvector holds up very well into the millions of vectors, in the database you already operate.

## Going further

- [pgvector](https://github.com/pgvector/pgvector) — the PostgreSQL extension, read the full README (HNSW/IVFFlat indexes)
- [Lewis et al., 2020](https://arxiv.org/abs/2005.11401) — the founding RAG paper
- [SBERT / sentence-transformers](https://www.sbert.net/) — play with embeddings locally in 5 lines of Python
- [Pinecone — Retrieval-Augmented Generation](https://www.pinecone.io/learn/retrieval-augmented-generation/) — illustrated pipeline guide
