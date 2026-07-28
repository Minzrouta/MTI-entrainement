---
title: "Full-text search & Elasticsearch"
date: "2026-10-27"
category: "Data"
level: "Avancé"
summary: "Inverted index, analysis, BM25, syncing with the database: understand how a search engine works — and know when to say in an interview that Postgres is enough."
---

## The essentials

The naive reflex for finding "running shoes" in a products table is `WHERE description LIKE '%running%'`. It works in a demo, it dies in production: a `LIKE '%…%'` **cannot use a B-tree index** (the pattern starts with a wildcard), so the database scans the whole table on every query — O(n) over millions of rows. And even if you accept the slowness, the results are poor: no singular/plural matching, no typo tolerance, no relevance ranking.

Full-text search flips the problem with the **inverted index**: instead of walking through documents looking for terms, you precompute, for **each term, the list of documents** containing it. Searching becomes a direct lookup: "running" → documents 2, 7, 42. It's the structure at the heart of Lucene, hence of **Elasticsearch** and **OpenSearch** (its Apache 2.0 fork), but also of **Postgres** full-text search.

In an interview, both are expected: the mechanics (inverted index, analysis, relevance) **and** the judgment — Elasticsearch is powerful but it's a second system to operate and keep in sync; Postgres full-text already covers a huge share of real needs.

## How it works

**1. The inverted index.** At indexing time, each document is split into terms; the index stores term → list of documents (postings), with positions for phrase queries:

```text
Documents
  d1: "Lightweight running shoes"
  d2: "Running: beginner program"
  d3: "Leather dress shoes"

Inverted index (after analysis)
  shoe     → [d1, d3]
  run      → [d1, d2]
  light    → [d1]
  program  → [d2]
  beginn   → [d2]
  dress    → [d3]
  leather  → [d3]

Query "running shoes"
  run ∩ shoe = [d1]        (AND)
  run ∪ shoe = [d1, d2, d3]  (OR, sorted by score)
```

**2. Analysis.** Text never enters the index raw: it goes through an **analyzer** — tokenization (splitting into words), **lowercasing**, **stop word** removal ("the", "de"…), **stemming** (reducing to the root: "running" → "run", "shoes" → "shoe" depending on the analyzer). Crucial point: analysis is **per language** (the French stemmer knows nothing about English) and the **query goes through the same analysis** as the documents — that's what makes "Shoe" match "shoes".

**3. Relevance.** Not all matching documents are equal. The **TF-IDF** intuition: a term counts more if it's frequent in *this* document (TF) and rare across *the whole* corpus (IDF) — "running" discriminates, "the" discriminates nothing. **BM25**, the default in Elasticsearch and modern Lucene, refines the idea: TF saturation (the 50th "running" adds almost nothing over the 5th) and document-length normalization (a match in a short title weighs more than in a wall of text).

**4. Elasticsearch in practice.** **JSON documents** in indices, a **mapping** declaring each field's type — key distinction: `text` (analyzed, for search) vs `keyword` (raw, for exact filters, sorting and aggregations) — and a JSON **query DSL**:

```json
// GET /products/_search — query + filters + scoring
{
  "query": {
    "bool": {
      "must": [                       // contributes to the BM25 score
        { "match": {                  // "match" analyzes the searched text
          "name": {
            "query": "running shoe",
            "fuzziness": "AUTO"       // tolerates typos
          }
        }}
      ],
      "filter": [                     // binary filter, no scoring, cacheable
        { "term":  { "category": "shoes" } },
        { "range": { "price": { "lte": 150 } } }
      ]
    }
  }
}
```

`must` scores documents (relevance), `filter` eliminates without scoring (exact, faster, cached). This is the archetypal e-commerce search query.

## Key concepts to master

- **The DB + search index pattern**: the relational database stays the **source of truth** (transactions, constraints); the search index is a denormalized **projection** of it, optimized for reads. Every write must be propagated: that's the **sync problem**. Options: application-level double write (simple but fragile — what happens if indexing fails after the commit?), a message queue, or **CDC** (Change Data Capture: Debezium reads the WAL and replays changes). The index is **eventually consistent**: a few seconds of lag, to be owned in the UX.
- **Reindexing**: changing an analyzer or a mapping often requires rebuilding the index. Pattern: index into `products_v2`, then flip an **alias** — zero downtime.
- **Postgres full-text**: `tsvector` (the analyzed document) + `tsquery` (the query), the `@@` operator, a **GIN** index, per-language dictionaries (`'french'`), `ts_rank` for sorting. In the same database as the data: **no sync**, transactions included. Often enough.
- **Facets & aggregations**: the per-category/brand/price counters on e-commerce sites = Elasticsearch aggregations (`terms`, `range`) computed over the filtered results.
- **Autocomplete**: prefixes via `edge_ngram` at indexing time ("sho" → "shoe") or a `search_as_you_type` field; fuzziness handles typos.

| | Postgres FTS | Elasticsearch / OpenSearch |
|---|---|---|
| Infra | Already there (your DB) | Separate cluster to operate |
| Sync | None (same database, transactional) | Mandatory (double write, CDC) |
| Relevance | Decent `ts_rank` | BM25, fine tuning, suggesters |
| Fuzzy / typos | Limited (`pg_trgm` as a complement) | Native (`fuzziness`) |
| Facets/aggs | GROUP BY (decent) | Native aggregations, very fast |
| Scale | Very far on one instance | Distributed: sharding, replicas |
| Right choice when… | Search is an app "feature" | Search IS the product |

> 💡 **Start with Postgres FTS** — if your data already lives in Postgres, `tsvector` + a GIN index give you real full-text search (stemming, ranking, multi-language) with no new system, no sync, no cluster to operate. Migrate to Elasticsearch when you hit its actual limits (advanced fuzzy, massive facets, volume) — not before. That's the answer that lands in an interview.

## In an interview

**"Why doesn't `LIKE '%word%'` scale?"** — The leading wildcard prevents any B-tree index use (B-trees order by prefix): full table scan on every query, O(n). And functionally: no stemming, no relevance, no typo tolerance. The structural answer is the inverted index — term → documents — where searching becomes a direct lookup.

**"What is an inverted index?"** — The structure that inverts the document→terms relation into term→documents. At indexing time, each document is analyzed (tokenization, lowercasing, stemming) and each term points to its list of documents (postings, with positions). A query is analyzed the same way, then you intersect (AND) or union (OR) the lists and sort by BM25 score.

**"How does an engine rank by relevance?"** — TF-IDF intuition: frequent in the document (TF) × rare in the corpus (IDF). BM25 refines it: TF saturation and document-length normalization. Bonus: mention field boosting (title > description) and that `filter` clauses don't contribute to the score.

**"How do you keep Elasticsearch in sync with your database?"** — The DB stays the source of truth, the index is a projection. Application-level double write to start (handling indexing failure: retry, queue), CDC with Debezium for robustness (reading the WAL). Either way, eventual consistency — and plan a full reindex to catch up on drift.

**"Elasticsearch or Postgres full-text?"** — Postgres FTS first if the data is already there: zero sync, transactional, `tsvector`/GIN cover stemming and ranking. Elasticsearch when search is central to the product: native fuzzy, massive facets, advanced autocomplete, horizontal scale. Elasticsearch's hidden cost isn't the search, it's operating the cluster and the sync.

## Pitfalls & misconceptions

> ⚠️ **Elasticsearch is not a primary database** — no transactions, durability designed for a rebuildable index. If the index burns down, you rebuild it from the DB; if the DB burns down and your data lived *only* in Elasticsearch, it's gone. Source of truth: always elsewhere.

- **Forgetting the query is analyzed too** — searching `Running` with a `term` query (not analyzed) against a `text` field (analyzed, so "running" is lowercased in the index) matches nothing. The classic beginner trap: `match` for analyzed text, `term` for `keyword` fields.
- **Wrong `text` vs `keyword` choices** — sorting or aggregating on an analyzed field makes no sense (you'd sort on stemmed roots); full-text searching a `keyword` field requires exact equality. Think the mapping through before indexing.
- **Underestimating the sync** — "fire and forget" double writes silently lose documents (crash between the DB commit and the indexing call). You need a catch-up mechanism: queue with retries, CDC, or periodic reindexing.
- **"Late" results** — the index is eventually consistent (default refresh ~1s, plus sync lag): a freshly created product may not appear in search immediately. Explain that to the product owner before they file a bug.

> 🎤 **In an interview** — the question "how would you add search to this app?" tests your judgment, not your query DSL knowledge. Winning answer: "Postgres FTS first since the data is already there — tsvector, GIN index, ts_rank; if the needs outgrow it (fuzzy, facets, volume), Elasticsearch with the DB as source of truth and CDC-based sync". You've just shown architecture *and* pragmatism.

## Going further

- [Elasticsearch — the definitive guide: inverted index](https://www.elastic.co/guide/en/elasticsearch/guide/current/inverted-index.html): the mechanics explained by Elastic
- [PostgreSQL — Full Text Search](https://www.postgresql.org/docs/current/textsearch.html): `tsvector`, `tsquery`, GIN — it's all there
- [Understanding BM25 (Elastic blog)](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables): the scoring formula dissected variable by variable
- [Debezium](https://debezium.io/): the open-source CDC for DB → index sync
- Exercise: index three sentences by hand (tokenize, lowercase, stem) and build the inverted index on paper — it's the archetypal whiteboard exercise
