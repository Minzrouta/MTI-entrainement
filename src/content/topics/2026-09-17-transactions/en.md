---
title: "Transactions & isolation levels"
date: "2026-09-17"
category: "Data"
level: "Avancé"
summary: "ACID, dirty reads, MVCC, SELECT FOR UPDATE, deadlocks: the topic that separates those who \"write SQL\" from those who understand what happens when two queries arrive at the same time."
---

## The essentials

A **transaction** is a sequence of operations the database treats as an indivisible whole: either everything is applied (`COMMIT`), or nothing is (`ROLLBACK`). Between `BEGIN` and `COMMIT`, the database guarantees the four **ACID** properties:

- **Atomicity** — all or nothing. A crash in the middle of a transfer never leaves the debit without the credit.
- **Consistency** — each transaction moves the database from one valid state to another (constraints, foreign keys, checks respected).
- **Isolation** — concurrent transactions don't see each other's intermediate states… *to some extent*: that's the whole topic of isolation levels.
- **Durability** — once the `COMMIT` is acknowledged, the data survives a crash (write-ahead log flushed to disk before acknowledging).

Atomicity and durability are binary; **isolation is a dial**. Perfect isolation (everything behaves as if transactions ran one at a time) is expensive in concurrency: the SQL standard therefore defines four levels, from laxest to strictest, which allow or forbid specific **anomalies**.

## How it works

The four classic anomalies, as mini-scenarios (T1 and T2 are two concurrent transactions):

- **Dirty read**: T1 reads a value T2 modified *without having committed*. T2 rolls back → T1 worked on data that never existed.
- **Non-repeatable read**: T1 reads a row, T2 modifies it and commits, T1 re-reads → different value within a single transaction.
- **Phantom read**: T1 runs `SELECT COUNT(*) WHERE …`, T2 inserts a matching row and commits, T1 re-runs → "phantom" rows have appeared.
- **Lost update**: T1 and T2 read the same value, each computes in memory, each writes its result → the second write overwrites the first. The great classic of the double debit:

```text
   T1 (withdraw €80)         T2 (withdraw €50)
   BEGIN                     BEGIN
   SELECT balance → 100
                             SELECT balance → 100
   UPDATE balance = 100-80
   COMMIT       (balance=20)
                             UPDATE balance = 100-50
                             COMMIT       (balance=50)

   Result: €130 withdrawn, final balance €50.
   T1's debit is gone — lost update.
```

The standard's four isolation levels, and what they prevent:

| Level | Dirty read | Non-repeatable | Phantom |
|---|---|---|---|
| Read uncommitted | Possible | Possible | Possible |
| Read committed *(Postgres default)* | Prevented | Possible | Possible |
| Repeatable read | Prevented | Prevented | Possible* |
| Serializable | Prevented | Prevented | Prevented |

\* In Postgres, `REPEATABLE READ` also prevents phantoms (full snapshot) — a good point to mention. The **lost update** isn't in the standard's table: under `READ COMMITTED` it remains possible and must be handled explicitly (lock or atomic update); under Postgres `REPEATABLE READ`, the second write fails with a serialization error to be retried.

How Postgres maintains isolation without locking everything: **MVCC** (Multi-Version Concurrency Control). Each `UPDATE` creates a **new version** of the row instead of overwriting the old one; each transaction sees a consistent **snapshot** — the versions committed before it started. The fundamental result: **readers never block writers, and vice versa**. Old versions are cleaned up later by `VACUUM`. Only two writes to the *same row* block each other.

> 💡 **The line that lands** — "Postgres takes no locks on reads: each transaction reads an MVCC snapshot, which is why a big analytical SELECT doesn't block production." One sentence, and you've just passed 80% of candidates.

## Key concepts to master

- **`SELECT … FOR UPDATE`**: reads the row **and locks it** until the end of the transaction. Any other transaction wanting to lock or modify it waits. That's the pessimistic lock — the anti-lost-update weapon when the logic must go through application code.
- **Optimistic locking** (the lock-free alternative): a `version` column, and `UPDATE … WHERE id = ? AND version = ?`; zero rows affected = someone got there first, reload and retry. Ideal when conflicts are rare.
- **Atomic update**: the simplest when it suffices — `UPDATE accounts SET balance = balance - 80` computes *inside* the database, under an implicit row lock. No read-modify-write window, no lost update.
- **Deadlock**: T1 locks A then wants B; T2 locks B then wants A — circular wait. The database detects it and **kills one of the two** (error 40P01 in Postgres). Prevention: **always acquire locks in the same order** (ascending id, for instance) and keep transactions short. Cure: retry the killed transaction.
- **Short transactions**: a transaction held open during an external API call keeps its locks and snapshot the whole time — saturated connections, blocked VACUUM, deadlocks. Rule: never do external I/O inside a transaction.

The lost update and its fixes, in SQL:

```sql
-- ❌ BUGGY: window between the read and the write
BEGIN;
SELECT balance FROM accounts WHERE id = 1;      -- reads 100
-- ... the application computes 100 - 80 ...
-- (another transaction can read 100 here too!)
UPDATE accounts SET balance = 20 WHERE id = 1;  -- blindly overwrites
COMMIT;

-- ✅ Fix 1: atomic update (prefer it when possible)
UPDATE accounts SET balance = balance - 80
WHERE id = 1 AND balance >= 80;                 -- the math AND the guard
-- happen inside the database, under a row lock; 0 rows = insufficient funds

-- ✅ Fix 2: pessimistic lock (complex application logic)
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- locks the row
-- any concurrent transaction on this row WAITS here
UPDATE accounts SET balance = 20 WHERE id = 1;
COMMIT;                                          -- releases the lock
```

> 🎤 **In an interview** — the bank transfer is THE scenario to walk through: "I debit A and credit B in a single transaction (atomicity: never one without the other). Against concurrent withdrawals, an atomic update with a `balance >= amount` guard, or `SELECT FOR UPDATE`. And to avoid the deadlock between a simultaneous A→B transfer and B→A transfer, I always lock accounts in the same order — ascending id." Atomicity, concurrency, deadlock: three points in thirty seconds.

## In an interview

**"Explain ACID with a concrete example."** — The transfer: atomicity (debit + credit, all or nothing), consistency (the `balance >= 0` constraint never violated), isolation (a concurrent transaction doesn't see the debited-but-not-credited intermediate state), durability (acknowledged commit = written to the WAL, survives a crash).

**"What's the difference between non-repeatable read and phantom read?"** — Non-repeatable: an **existing** row re-read has changed (committed UPDATE between the two reads). Phantom: the **set** of rows matching a predicate has changed (committed INSERT/DELETE) — rows appear or disappear. The nuance matters because the standard's `REPEATABLE READ` blocks the former but not the latter.

**"Why not run everything in SERIALIZABLE?"** — Cost: the database must track dependencies between transactions and **abort** some of them (serialization errors to retry); lower throughput, mandatory retry code. `READ COMMITTED` + targeted locks where it matters is the pragmatic default trade-off.

**"How does Postgres let you read without blocking writes?"** — MVCC: each UPDATE creates a new row version, each transaction reads a consistent snapshot of the versions committed at its start. Readers and writers never block each other; only two writes to the same row serialize. VACUUM recycles dead versions.

**"Two crossed transfers A→B and B→A deadlock. What happens and how do you avoid it?"** — Each holds one lock and waits for the other: circular wait. Postgres detects it and kills one transaction (to be retried by the application). Prevention: order lock acquisitions (always the smallest id first) — no cycle possible anymore — and short transactions.

## Pitfalls & misconceptions

> ⚠️ **The autocommit trap** — without an explicit `BEGIN`, each statement is its own transaction. Two consecutive `UPDATE`s in your code are **not** atomic: a crash between them leaves the database inconsistent. ORMs often open implicit transactions — know what yours does (`prisma.$transaction`, `@Transactional`…).

- **"A transaction locks the table"** — no: MVCC locks rows at worst, and reading locks nothing at all. Believing this leads to over-locking "just in case" and creating the very deadlocks you wanted to avoid.
- **"READ COMMITTED protects me from lost updates"** — no: it only prevents dirty reads. Application-level read-modify-write remains vulnerable; you need an atomic update, `FOR UPDATE` or optimistic locking.
- **`SERIALIZABLE` without retries**: this level *aborts* transactions by design. Without a retry loop on serialization errors, you've just added random 500s.
- **Long transactions**: an HTTP call, email send or user wait inside a transaction = locks held for seconds, blocked VACUUM, cascading contention. External I/O always outside the transaction.
- **Relying on the default without knowing it**: Postgres and MySQL/InnoDB share neither the same default (`READ COMMITTED` vs `REPEATABLE READ`) nor the same implementation of the levels. "It depends on the engine" is an expert answer, not a dodge.

## Going further

- [PostgreSQL — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — the chapter to read in full, with the Postgres-vs-standard subtleties
- [PostgreSQL — Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html): `FOR UPDATE`, `FOR SHARE`, deadlocks
- *Designing Data-Intensive Applications* (Kleppmann), chapter 7 "Transactions" — the best written explanation of anomalies and serializability
- Hands-on: open two `psql` side by side, `BEGIN` in each, and replay the lost update then the deadlock — ten minutes worth more than any cheat sheet
