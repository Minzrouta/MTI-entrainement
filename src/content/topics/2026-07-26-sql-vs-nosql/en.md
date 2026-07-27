---
title: "SQL vs NoSQL"
date: "2026-07-26"
category: "Data"
level: "Fondamental"
summary: "ACID, CAP, sharding, indexes, N+1: the SQL vs NoSQL debate is an absolute interview classic — and the perfect opportunity to show you reason in trade-offs rather than slogans."
---

## The essentials

The **relational** model structures data into **tables** with an explicit **schema** (typed columns, constraints), queried with declarative SQL, recomposed through **joins**, protected by **ACID** transactions. It has dominated for 40 years because it is formidably versatile.

"**NoSQL**" is not a technology but a label: very different families, born in the 2000s at Google and Amazon for needs the relational model of the time served poorly — massive horizontal scaling, flexible schemas, specific models (graph, key-value).

The interview question is never "which one is better" but "which one for which problem". A short, defensible answer: **Postgres by default**, NoSQL when a specific access pattern justifies it — and being able to say which one.

## How it works

**The relational model relies on normalization**: every fact stored once (an address is updated in one place, not twelve), at the cost of joins to recompose data. Transactions guarantee **ACID**:

- **Atomicity** — all or nothing: a transfer debits AND credits, never one without the other.
- **Consistency** — constraints (foreign keys, uniqueness, checks) remain true after each transaction.
- **Isolation** — concurrent transactions don't see each other's intermediate states (levels: read committed, repeatable read, serializable — the stricter, the more expensive).
- **Durability** — after commit, data survives a crash (write-ahead log).

**The four NoSQL families**:

| Family | Examples | Key idea | Typical use cases |
|---|---|---|---|
| Document | MongoDB | Nested JSON: what is read together is stored together | Catalogs, profiles, shifting schema |
| Key-value | Redis, DynamoDB | GET/PUT by key, minimal latency, no rich queries | Cache, sessions, carts |
| Wide-column | Cassandra | Massive distributed writes; tables modeled from your queries | Time series, IoT, ingestion |
| Graph | Neo4j | First-class nodes and relationships, efficient deep traversals (where SQL piles up self-joins) | Social network, recommendations, fraud |

The difference in philosophy fits in two queries — recomposing through a join vs reading an aggregate:

```sql
-- Relational: normalized, every fact in one place
SELECT o.id, o.total, c.name, c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id   -- recomposition
WHERE o.id = 42;
```

```js
// Document: the whole aggregate, read in a single access
db.orders.findOne({ _id: 42 })
// → { _id: 42, total: 99.9,
//     customer: { name: "Ada", email: "ada@ex.io" } }
// Denormalized: if the email changes, update it everywhere
```

**The CAP theorem, without butchering it**: in a **distributed** system, when a **network partition** occurs (P — not a choice, it happens), you must choose between **Consistency** (refuse to answer rather than risk a wrong answer) and **Availability** (answer, even if it means diverging and reconciling later). The "pick 2 out of 3" framing is misleading: the dilemma only exists **during** a partition; the rest of the time, the real trade-off is latency versus consistency (the **PACELC** extension). And CAP doesn't apply to a single-node database.

**Eventual consistency**: replicas converge "eventually"; in the meantime, a read can return a stale value (the like that disappears then comes back). Many systems offer intermediate guarantees (read-your-writes, session consistency) or per-request tuning (Cassandra: `QUORUM` vs `ONE`).

**Scaling**: **vertical** (a bigger machine — simple, effective for a long time, but it plateaus and gets expensive at the top) vs **horizontal** (more machines). Two tools: **replication** (leader-follower: reads spread across replicas — beware of **replica lag**) and **sharding** (partitioning data by a **shard key**; a bad key creates a hot shard, and cross-shard queries are expensive). The relational model replicates very well; it's transactional sharding that is hard (Citus and Vitess exist for that). Both tools at a glance:

```text
Replication (scale reads)
             writes
                │
           ┌────▼───┐
           │ Leader │
           └────┬───┘
      async ────┤──── (replica lag!)
      ┌─────────┴─────────┐
 ┌────▼────┐         ┌────▼────┐
 │Replica 1│         │Replica 2│ ◀── reads
 └─────────┘         └─────────┘

Sharding (scale data & writes, by shard key)
 ┌─────────┐   ┌─────────┐   ┌─────────┐
 │ shard A │   │ shard B │   │ shard C │
 │  (a-h)  │   │  (i-p)  │   │  (q-z)  │
 └─────────┘   └─────────┘   └─────────┘
```

> ⚠️ **Replica lag** — the user updates their profile (write on the leader), the page reloads (read from a lagging replica)… and shows the old value. This is exactly what "read-your-writes" guarantees fix: read from the leader right after your own write.

## Key concepts to master

- **B-tree index**: a balanced tree, O(log n) lookup, serves equality, ranges (`WHERE created_at > …`) and sorting. It's the default in every relational DBMS.
- **When an index is useless**: a low-selectivity column (a boolean — the planner prefers a scan), a function applied to the column (`WHERE lower(email) = …` without an expression index), `LIKE '%foo'` (leading wildcard), columns outside the prefix of a composite index.

> 💡 **An index is never free** — every INSERT/UPDATE must maintain it, and the optimizer ignores it if it doesn't filter enough. Index based on real queries (WHERE, JOIN, ORDER BY), and prove it with `EXPLAIN ANALYZE` — before and after.

- **ORMs and N+1**: load a list (1 query) then access a relation via lazy loading in a loop (N queries). Symptom: slow page, log full of identical queries. Fix: eager loading (`JOIN FETCH`, `include`, `select_related`/`prefetch_related`).
- **Denormalization**: deliberately duplicating to read fast; you pay for it at write time (keeping copies in sync). Document stores do it by design; relational stores can do it selectively (computed column, materialized view).

> 🎤 **In an interview** — "Postgres + JSONB" is the pragmatic answer to 80% of "we need MongoDB": a binary JSON column, indexable (GIN), queryable — document flexibility **inside** an ACID engine. Relational columns for the structured part, JSONB for the variable part. Phrasing it this way shows you reason in trade-offs, not logos.

## In an interview

**"SQL or NoSQL for this project?"** — Walk through a method, not a slogan: what access patterns? multi-entity transaction needs? actual volume and growth? rich relationships? Conclude: relational by default; key-value for cache/sessions, document for self-contained aggregates with a shifting schema, wide-column for massive ingestion, graph for deep traversals.

**"Explain ACID with an example."** — The bank transfer: atomic debit + credit; balance constraint upheld; two concurrent transfers isolated; after commit, a crash loses nothing. Bonus: mention isolation levels and the fact that read committed (Postgres default) allows certain anomalies.

**"What is the CAP theorem?"** — The correct statement: during a network partition, a choice between consistency and availability; outside of one, the trade-off is latency vs consistency (PACELC). Bonus: many databases are tunable (Cassandra per-request consistency levels, MongoDB via write/read concern).

**"Why not put an index on every column?"** — Every index costs writes and storage, and the optimizer only uses those that actually filter. Index based on real queries (WHERE, JOIN, ORDER BY), verify with EXPLAIN, drop unused indexes.

**"What is the N+1 problem?"** — 1 query for the list, then 1 per item due to the ORM's lazy loading. Detect it (SQL logs, APM), fix it (eager loading), and remember the lesson: the ORM hides SQL but doesn't excuse you from understanding it.

## Pitfalls & misconceptions

- **"NoSQL = no schema"** — the schema always exists; it's just implicit and scattered across the code (schema-on-read). Document stores relocate the rigor, they don't remove it.
- **"SQL doesn't scale"** — read replicas, partitioning, Vitess/Citus; a well-indexed Postgres handles tens of thousands of requests/s on a single machine. Most projects will never hit its limit.
- **"MongoDB has no transactions"** — outdated: multi-document transactions since 4.0 (at a cost). And single-document writes have always been atomic.
- **Choosing the shard key carelessly** — changing it afterwards means re-partitioning data live. It is THE design decision of a sharded system.
- **Invoking CAP for everything** — a single-node database isn't concerned; and "AP" doesn't mean "loses data", it means "answers during the partition, converges afterwards".

## Going further

- [Postgres documentation — Indexes](https://www.postgresql.org/docs/current/indexes.html) and [JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Use The Index, Luke](https://use-the-index-luke.com/) — the best tutorial in existence on SQL indexes
- [MongoDB — Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/): learning to think in aggregates
- Martin Kleppmann, *Designing Data-Intensive Applications* — THE reference in the field; and [jepsen.io](https://jepsen.io/analyses) for what distributed databases' guarantees are really worth
