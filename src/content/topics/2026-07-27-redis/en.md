---
title: "Redis & caching"
date: "2026-07-27"
category: "Backend"
level: "Intermédiaire"
summary: "Event loop, TTL, cache-aside, stampede: Redis is everywhere in production, and caching is the backend topic where interviewers quickly spot who really gets it."
---

## The essentials

Redis (REmote DIctionary Server) is an **in-memory** database: rich data structures served from RAM, with sub-millisecond latencies and over 100,000 operations/s on a single core. Use case #1: a **cache** in front of a slower database. But also: session store, rate limiter, pub/sub, task queues, leaderboards.

The architecture point you absolutely must know: Redis executes commands on **a single thread**, through an **event loop** (multiplexed I/O). Two direct consequences: every command is **atomic** (no locks to manage), and a slow command **blocks the entire server**. Since Redis 6, threads handle network I/O, but command execution remains single-threaded.

## How it works

Redis is not just a giant `Map<String, String>`. Its **data structures**:

| Structure | Typical commands | Use cases |
|---|---|---|
| String | `SET`/`GET`, atomic `INCR` | Cache, counters, rate limiting |
| Hash | `HSET`/`HGETALL` | Lightweight object (`user:42` → fields) |
| List | `LPUSH` + `BRPOP` (blocking pop) | Basic task queue |
| Set | `SADD`/`SINTER` | Tags, unique visitors |
| Sorted set | `ZADD`/`ZRANGE` (score-ordered) | Leaderboards, sliding windows, priorities |
| Stream | `XADD`/`XREADGROUP`/`XACK` | Message queue: acks + consumer groups |

**TTL and eviction**: `SET key val EX 300` or `EXPIRE`. Expiration is **lazy** (checked on access) plus an **active** sampling cycle. When `maxmemory` is reached, the eviction policy decides: `noeviction` (writes fail — it's the default!), `allkeys-lru` (the caching classic), `volatile-lru` (only keys with a TTL), `allkeys-lfu` (by frequency, often better for a real cache).

**The three caching patterns**:

- **Cache-aside** (lazy loading — the standard): the app reads the cache; on a miss, it reads the DB then populates the cache with a TTL. Simple, and the cache can go down without breaking the app; in exchange: slow first access and an inconsistency window after a DB write.
- **Write-through**: every write goes through the cache, which writes to the DB synchronously. Cache always fresh, slower writes.
- **Write-behind** (write-back): you write to the cache, which flushes to the DB asynchronously. Ultra-fast writes, but **possible data loss** if a crash occurs before the flush.

> 🎤 **In an interview** — don't just recite the three patterns: name each one's flaw. Cache-aside = inconsistency window, write-through = write latency, write-behind = possible data loss. The flaw is what proves you understood.

Cache-aside in practice (Node):

```js
// Read: cache first, DB on miss, then repopulate
async function getUser(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);          // ~1 ms, DB spared

  const user = await db.users.findById(id); // miss → DB
  const ttl = 300 + Math.floor(Math.random() * 60); // jitter
  await redis.set(key, JSON.stringify(user), 'EX', ttl);
  return user;
}

// Write: DB first, then invalidate the key
async function updateUser(id, data) {
  await db.users.update(id, data);
  await redis.del(`user:${id}`); // next miss repopulates
}
```

> 💡 **Jitter costs one line** — a thousand keys created at the same moment expire at the same moment. `TTL ± random` desynchronizes expirations: the cheapest defense against a mass stampede.

**Persistence** — Redis can survive a restart:

- **RDB**: periodic binary snapshots (via `fork` and copy-on-write). Compact, fast restart; but everything after the last snapshot is lost on a crash.
- **AOF**: a journal of every write, with configurable `fsync` (`everysec`: at most ~1 s of loss). Bigger file, replayed at startup, periodically rewritten to compact it.
- In practice: both combined — or **neither**, if Redis is just a rebuildable cache.

## Key concepts to master

- **Invalidation, the hard problem** ("There are only two hard things in computer science…"). Three approaches: **TTL** (bounded staleness, the universal safety net), **explicit invalidation** (delete the key when the source changes — precise, but you must not miss a single write path), **versioned keys** (change the key, the old one expires on its own). In practice: TTL everywhere, plus explicit invalidation on critical data.
- **Cache stampede** (dogpile): a hot key expires → hundreds of requests miss at the same time → all hit the DB, which collapses. Countermeasures: a **lock** (`SET lock:k v NX EX 10` — only one recomputes, the others wait or serve the old value), **TTL jitter** (TTL ± random to desynchronize expirations), early recomputation before expiry.

The stampede in one picture:

```text
t=0 : the hot key expires
      │
      ▼  500 simultaneous requests → 500 misses
 ┌───────┐    0 hits    ┌──────┐
 │ Redis │─────────────▶│  DB  │ ×500 → overload
 └───────┘              └──────┘
Fix: SET lock:k v NX EX 10
 → only 1 request recomputes the value,
   the other 499 wait or serve the stale one
```
- **Rate limiting**: fixed window = `INCR` + `EXPIRE` (simple, but edge effects at window boundaries); sliding window = a sorted set of timestamps (`ZADD` + `ZREMRANGEBYSCORE` + `ZCARD`).
- **Multi-command atomicity**: `MULTI`/`EXEC` (transaction without rollback) and above all **Lua scripts** (`EVAL`), executed atomically — that's how you write a correct rate limiter.
- **Redis as a message queue — and its limits**: pub/sub = fire-and-forget (a disconnected subscriber loses everything); lists = no acknowledgment (crash after `BRPOP` = message lost); **streams** = acks, consumer groups, replay. For rich routing, dead-letter queues and strong contractual guarantees, a real MQ (RabbitMQ, Kafka) remains the dedicated tool.

## In an interview

**"Why is Redis so fast?"** — Full answer expected: data in RAM (no disk I/O on the request path), single-threaded event loop (zero locks, zero context switches), data structures optimized in C, minimal protocol (RESP). "Because it's RAM" isn't enough.

**"Describe the cache-aside pattern."** — Read: cache first; miss → DB → `SET` with a TTL. Write: DB then key invalidation. Name the flaw: between the DB write and the invalidation (or during the TTL), readers see the old value.

**"A key expires and 500 requests arrive at the same time: what happens?"** — That's the cache stampede: all of them miss and hit the DB simultaneously. Countermeasures: distributed lock (only one recomputes), TTL jitter, serving the stale value during recomputation.

**"RDB vs AOF?"** — RDB: compact snapshots, fast restart, potential loss of several minutes. AOF: near-exhaustive journal (fsync everysec ≈ at most 1 s of loss), bigger files, slower restart. They combine; a pure cache can disable both.

**"Can Redis replace RabbitMQ?"** — Nuance it: for simple jobs, lists or streams are enough (and streams have consumer groups + acks). For complex routing, dead-letter queues, strong delivery guarantees: a real MQ. Showing you know the boundary is worth more than any buzzword.

## Pitfalls & misconceptions

> ⚠️ **Cache without a TTL** — memory fills up inexorably; with `noeviction` (the default!) writes eventually start failing, with `allkeys-lru` data you thought durable silently disappears. A cache without a TTL is a polite memory leak: put a TTL everywhere, even a long one.

- **Hot key**: one extremely popular key (a celebrity's profile) saturates the single thread or a single cluster node. Countermeasures: a local in-process cache in front of Redis, key duplication (`key:1`, `key:2`… read at random).
- **Big key**: a hash with a million fields → `HGETALL` blocks the event loop for everyone; `DEL` on a big key blocks too → `UNLINK` (asynchronous) and batched traversal (`HSCAN`). And never `KEYS *` in production: `SCAN`.
- **Redis as a primary database without thinking**: between two RDB snapshots, a crash loses minutes of data. If the data is precious: AOF everysec at minimum, replication — and ask yourself whether a real DB wouldn't do better.
- **Caching without measuring**: a cache is judged by its **hit ratio** (`INFO stats`: keyspace_hits/misses). Caching data that's never read again, or huge serialized objects, costs more than it earns.

## Going further

- [Redis — Data types](https://redis.io/docs/latest/develop/data-types/) and [Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/): the two official pages to read in full
- [Redis University](https://university.redis.io/): free courses, RU101 for the data structures
- [Valkey](https://valkey.io/): the open-source fork (Linux Foundation) born from Redis's 2024 license change — a good general-culture point in interviews
- Try it locally: `docker run --rm -p 127.0.0.1:6379:6379 redis`, then `redis-cli MONITOR` while your app runs — watch the commands go by for real
