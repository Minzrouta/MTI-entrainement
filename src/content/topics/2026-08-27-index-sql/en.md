---
title: "Indexes, modeling & SQL optimization"
date: "2026-08-27"
category: "Data"
level: "Intermédiaire"
summary: "B-trees, EXPLAIN, composite indexes and normal forms: how to calmly answer \"this query is slow, what do you do?\" — the data question that separates candidates."
---

## The essentials

A database without indexes reads its tables the way you'd read a phone book page by page: that's the **sequential scan**, O(n). An index is an **auxiliary data structure** — almost always a **B-tree** — that the database maintains alongside the table to locate rows in **O(log n)**. It's the difference between a 400 ms query and the same one at 0.1 ms.

But nothing is free: every `INSERT`, `UPDATE` or `DELETE` must update **all** the table's indexes, and each one consumes disk and cache. Optimizing means trading reads against writes — and **modeling** (normalization, denormalization) shapes upfront the tables on which that trade-off plays out.

> 💡 **The rule that frames everything** — you index what **real** queries filter (`WHERE`), join (`JOIN … ON`) or sort (`ORDER BY`). Never "every column just in case": an unused index is a pure tax on writes.

## How it works

The B-tree ("balanced tree") is the default index in PostgreSQL as well as MySQL/InnoDB. Its nodes are **wide**: an 8 KB page holds hundreds of keys, so the tree is very flat — height 3 or 4 even for millions of rows. Looking up a value means walking down 3-4 nodes: that's your log n. The leaves are **sorted and chained** together, which also serves ranges (`BETWEEN`, `>`) and `ORDER BY`.

```text
              [ root ]                height 3-4,
             /    |    \              even for
      [int.]   [int.]  [int.]         millions of
      /  |  \    ...     ...          rows
  [leaf]  [leaf]  [leaf]
    │        │       │
    └── pointers to the rows (heap)
sorted, chained leaves → efficient ranges
```

To see what the database actually does: `EXPLAIN` shows the **estimated plan**, `EXPLAIN ANALYZE` **executes** the query and reports real timings.

```sql
-- orders table: 5M rows, no index on customer_id
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 4242;

-- BEFORE: the whole table is read
-- Seq Scan on orders  (cost=0.00..93241.00 rows=48 ...)
--   Filter: (customer_id = 4242)
--   Rows Removed by Filter: 4999952   ← 5M read to keep 48
-- Execution Time: 412.33 ms

CREATE INDEX idx_orders_customer ON orders (customer_id);

-- AFTER: the B-tree targets the right pages directly
-- Index Scan using idx_orders_customer on orders
--   (cost=0.43..12.15 rows=48 ...)
--   Index Cond: (customer_id = 4242)
-- Execution Time: 0.09 ms             ← ~4500× faster
```

What to spot in a plan: the scan type (`Seq Scan` vs `Index Scan` vs `Index Only Scan`), the gap between estimated and actual `rows` (stale statistics → run `ANALYZE`), and the node that concentrates the execution time.

## Key concepts to master

- **Composite indexes & the leftmost prefix**: an index on `(last_name, first_name)` is sorted like a phone book — by last name, then first name. It works for `WHERE last_name = …` and for `last_name = … AND first_name = …`, but **not** for `first_name` alone (finding every "Kevin" in a phone book means reading the whole book). Hence how you pick the column order: equality-filtered columns first, most selective ones leading.
- **Covering index**: if the index contains every column the query asks for (`INCLUDE` clause in PostgreSQL), the database answers **without touching the table** — that's the `Index Only Scan`, the fastest scan there is.
- **When an index is useless**: a function applied to the column (`WHERE lower(email) = …` → you need a functional index on `lower(email)`), `LIKE '%term'` (unknown prefix, the sorted tree can't help), low selectivity (a 50/50 boolean: might as well read the table), incompatible types (comparing a `text` column to an integer).
- **The write cost**: every write updates all the table's B-trees; pages split, the index fragments, writes slow down.
- **Normalization 1NF → 3NF** — eliminating redundancy and update anomalies:

| Form | Rule | Typical violation |
|---|---|---|
| 1NF | Atomic values, no lists inside a column | `tags = "a,b,c"` |
| 2NF | No dependency on *part* of a composite key | `(order_id, product_id)` but `product_name` depends only on `product_id` |
| 3NF | No transitive dependency between non-key columns | `orders` stores `customer_id` **and** `customer_city` |

- **Deliberate denormalization**: duplicating a value (a `likes_count` counter, a precomputed `total_amount`) to avoid a costly `JOIN` or `COUNT`. Legitimate **if** it's a documented choice with its sync strategy (trigger, job, event) — not an accident.
- **N+1 (preview)**: 1 query to load 100 orders, then 100 queries for their customers — the great ORM classic. It shows up in SQL logs and is fixed with a `JOIN` or eager loading (`select_related`, `includes`, `JOIN FETCH`).

> 🎤 **In an interview** — "this query is slow, what do you do?" Structured answer: 1) reproduce and measure, 2) `EXPLAIN ANALYZE`, 3) spot the costly node (seq scan on a big table? wrong estimates?), 4) check that an index exists **and is usable** (function on the column? composite order?), 5) look at the application side (N+1, `SELECT *`), 6) as a last resort: denormalize or cache. The method is worth more than the fix.

## In an interview

**"Why does an index speed up lookups?"** — Because it's a B-tree: a balanced tree with very wide nodes (hundreds of keys per page), so height 3-4 even for millions of rows. A lookup walks the tree in O(log n) instead of reading the whole table in O(n). Bonus: the sorted, chained leaves also serve ranges and `ORDER BY`.

**"Why not index every column?"** — Every index is updated on every write and occupies disk and cache; the planner will only use one or two per query anyway. An index nobody queries is pure cost. You index based on observed queries, not on the schema.

**"Index on `(a, b)`: which queries benefit?"** — Those filtering on `a`, or on `a` and `b` (leftmost prefix). `WHERE b = …` alone can't use it: the index is sorted by `a` first. Phone book analogy: finding a name when you only know the first name means reading everything.

**"EXPLAIN vs EXPLAIN ANALYZE?"** — `EXPLAIN` shows the plan and the planner's *estimated* costs; `EXPLAIN ANALYZE` actually runs the query and adds *real* times and row counts. The gap between the two reveals stale statistics. Trap: `ANALYZE` really executes — on an `UPDATE`, wrap it in `BEGIN; … ROLLBACK;`.

**"Normalize or denormalize?"** — Normalize to 3NF by default: a single source of truth, no update anomalies. Then denormalize selectively and knowingly, when a critical read justifies it — documenting how the copy stays in sync.

## Pitfalls & misconceptions

> ⚠️ **Real-world trap** — `EXPLAIN ANALYZE` **executes** the query. Harmless on a `SELECT`, but on an `UPDATE` or `DELETE` the rows really are modified. Reflex: `BEGIN; EXPLAIN ANALYZE …; ROLLBACK;`.

- **"The index exists, so it's used"** — no: a function on the column, wrong composite order, stale statistics or low selectivity can make it invisible to the planner. Always check the plan.
- **`LIKE '%term%'` cannot use a B-tree** — only a fixed prefix (`'term%'`) can. For "contains" search, PostgreSQL offers `pg_trgm` with a GIN index.
- **Foreign keys are not auto-indexed in PostgreSQL** (they are in InnoDB). FK columns used in `JOIN`s almost always deserve their own index.
- **The primary key, however, is always indexed** — no need to add another.
- ORMs hide the SQL, not its cost: enable query logs in dev to catch N+1 before production.

## Going further

- [Use The Index, Luke!](https://use-the-index-luke.com/) — the free reference online book on indexes
- [PostgreSQL — Indexes](https://www.postgresql.org/docs/current/indexes.html) and [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [explain.dalibo.com](https://explain.dalibo.com/) — paste an `EXPLAIN ANALYZE` plan and visualize it
- Hands-on exercise: generate 1M rows with `generate_series`, measure before/after adding an index — orders of magnitude stick better once you've seen them
