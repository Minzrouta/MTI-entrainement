---
title: "ORMs, migrations & N+1"
date: "2026-10-08"
category: "Data"
level: "Intermédiaire"
summary: "What an ORM gives you, what it hides (the infamous N+1), and how to evolve a schema in production without breaking anything — a trio of near-guaranteed backend interview questions."
---

## The essentials

An **ORM** (Object-Relational Mapper — Prisma, SQLAlchemy, Hibernate, Entity Framework…) bridges your language's objects and relational tables. It brings three things: **mapping** (a row ↔ an object, a foreign key ↔ a property), **typed queries** (the IDE autocompletes, the compiler catches the typo before production) and **migrations** that version the schema like code.

The cost is symmetric: every innocent property access (`author.posts`) can fire a SQL query you never wrote. An ORM is a **leaky abstraction**: as soon as performance matters, you have to read the generated SQL. The most common symptom — and the most asked interview question on the topic — is called **N+1**: one query to load a list, then one query *per element* in the loop that follows.

Remember this before anything else: an ORM does not exempt you from knowing SQL. It writes it for you, and you are the reviewer.

## How it works

**N+1, with numbers.** 100 authors, each with their posts. The naive version looks clean — and fires 101 queries:

```javascript
// ❌ N+1: 1 query for the list, then 1 PER author
const authors = await prisma.author.findMany();     // 1 query
for (const author of authors) {
  const posts = await prisma.post.findMany({
    where: { authorId: author.id },                 // ×100!
  });
  console.log(author.name, posts.length);
}
// 101 queries × ~5 ms network round-trip ≈ 500 ms

// ✅ Eager loading: everything in 2 queries
const authors = await prisma.author.findMany({
  include: { posts: true },  // JOIN or WHERE authorId IN (...)
});
// 2 queries ≈ 10 ms — ~50× faster, same business logic
```

The cost isn't the data volume: it's the **network round-trip** to the database, paid N times. N+1 goes unnoticed in dev (local database, 10 seeded rows) and explodes in production (real network latency, 10,000 rows).

**Eager vs lazy loading** — two strategies to load a relation:

| | Lazy loading | Eager loading |
|---|---|---|
| Loading | On access, query on demand | With the initial query (`JOIN`/`IN`) |
| Query count | 1 + N (N+1 risk in loops) | 1 to 2, constant |
| Memory | Minimal if the relation is unused | Loads everything, even the useless |
| Good fit | Rarely-read relation | Lists, loops, API responses |

Hibernate and SQLAlchemy are lazy by default: the N+1 hides behind a simple property access. Prisma only loads a relation when asked (`include`/`select`): its N+1 is at least visible — it's the query inside the loop. Either way, detection is the same: **count the queries**.

> 💡 **Reflex to show** — turn on SQL logging in dev (`log: ['query']` in Prisma, `echo=True` in SQLAlchemy) and watch what a single screen triggers. If the query count grows with the number of displayed items, it's an N+1.

## Key concepts to master

- **When to write raw SQL**: complex reports and aggregations, window functions, bulk updates, and hot paths where the generated SQL is bad. Every ORM has an escape hatch (`$queryRaw`, `text()`, native queries) — using it isn't a failure, it's by design. The ORM keeps the 90% of repetitive CRUD.
- **Versioned migrations**: every schema change is a timestamped file, committed to the repo, with an **up** (apply) and ideally a **down** (undo). The database keeps the list of migrations already applied: the same schema guaranteed from the intern's laptop to production.
- **Never edit an applied migration**: it has already run elsewhere (on colleagues' machines, in CI, in production). Editing it makes the history diverge — tools detect it (Prisma's checksums) and refuse to proceed. Mistakes get fixed *forward*, with a new migration.
- **Expand/contract** (a.k.a. parallel change): the recipe for changing a schema without breaking code still running. Never a direct rename — three phases, three deployments:

```text
Renaming name → full_name with zero downtime

  EXPAND            MIGRATE            CONTRACT
  add               dual writes        drop
  full_name         + backfill of      name
  (nullable)        existing rows
──────────────────────────────────────────────▶ time
  deployment 1      deployment 2       deployment 3
  old code still    code reads         nobody reads
  works             full_name          name anymore
```

- **Seeds & environments**: initial data (test accounts, reference tables) is scripted and versioned, per environment. Dev wants realistic data, CI a minimal deterministic set, production — almost nothing.

> 🎤 **In an interview** — if asked to evolve a schema in production, walking through expand/contract on the whiteboard (add → migrate → remove, one deployment per phase) shows more maturity than any buzzword. It's exactly what a senior wants to hear from an intern.

## In an interview

**"What is the N+1 problem and how do you fix it?"** — One query for the list, then one per element in the loop: 100 authors = 101 queries, dominated by network round-trips. Fix: eager loading (`include`, `JOIN`, `WHERE IN`) to bring it all back in 1-2 queries. Detection: SQL logs in dev, APM in production. Giving the numbers (101 → 2) makes all the difference.

**"Eager or lazy loading by default?"** — Lazy avoids loading the useless but turns every loop into an N+1; eager guarantees a constant query count but can over-fetch. Mature answer: lazy for rarely-read relations, explicit eager everywhere you iterate — and know what *your* ORM does by default.

**"When would you write SQL by hand?"** — Complex reports, window functions, bulk operations, hot paths where the generated SQL is inefficient. The escape hatch (`$queryRaw`, `text()`) is intentional: ORM for CRUD, SQL for the rest.

**"How do you deploy a schema change with zero downtime?"** — Expand/contract: add the new (nullable column, dual writes), migrate data and code, only then remove the old. Three deployments. During a rollout, old and new code coexist: the schema must satisfy both.

**"Why never modify an already-merged migration?"** — It has already been applied to other databases; modifying it makes the history diverge (invalid checksum, inconsistent environments). You fix forward, with a new migration.

## Pitfalls & misconceptions

> ⚠️ **The Friday destructive migration** — `DROP COLUMN` deployed at 5 pm: the old code still live keeps reading the column, everything crashes over the weekend, and the down of a DROP **does not restore the data**. A destructive migration ships early in the week, in the contract phase (no readers left), after a verified backup.

- **"The ORM saves me from learning SQL"** — it's the opposite: you need SQL to *review* what the ORM generates. The day the endpoint is slow, the answer is in `EXPLAIN`, not in the ORM's docs.
- **Trusting auto-generated migrations** — the tool diffs the schema, but a rename often becomes `DROP` + `ADD`, i.e. data loss. Always read the generated SQL before merging.
- **The down migration as a safety net** — a down that undoes a `DROP COLUMN` recreates the column… empty. The real safety net is backup + expand/contract.
- **Seeding production with dev seeds** — a `db seed` run against production with test accounts ends in an incident, sometimes a data leak. Seeds are per environment, and production almost never has any.

## Going further

- [Martin Fowler — ParallelChange](https://martinfowler.com/bliki/ParallelChange.html) and [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html): expand/contract at the source
- [Prisma — Relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries): `include`, `select` and hunting N+1
- [Use The Index, Luke](https://use-the-index-luke.com/): SQL and indexes explained for developers
- [Django — Migrations](https://docs.djangoproject.com/en/stable/topics/migrations/): the reference for versioned schemas, transferable to any framework
