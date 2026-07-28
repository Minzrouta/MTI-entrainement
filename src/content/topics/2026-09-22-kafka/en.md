---
title: "Kafka & event-driven architecture"
date: "2026-09-22"
category: "Backend"
level: "Avancé"
summary: "Distributed log, partitions, consumer groups, replay: understand what sets Kafka apart from a classic message queue — and know how to say honestly when it's overkill."
---

## The essentials

Kafka is **not a message queue**: it's a **distributed append-only log**. The difference is fundamental. In a classic queue (RabbitMQ), consuming a message removes it from the queue: the message is an order to execute once. In Kafka, events are **appended to an immutable journal** and consumers merely advance a **cursor (offset)** through that journal: **reading destroys nothing**. Ten teams can read the same stream, each at its own pace, and rewind.

This model makes Kafka the backbone of **event-driven** architectures: services no longer call each other directly, they publish facts ("order #42 created") that other services consume whenever they want. Decoupling in time, in throughput, and in the number of consumers.

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Distributed append-only log | Queue + routing (exchanges) |
| Reading | Non-destructive: each consumer has its offset | Destructive: acked message = deleted |
| Retention | By time/size (days, ∞) → **replay possible** | Until consumed |
| Ordering | Guaranteed **per partition** only | Per queue (lost with multiple workers) |
| Throughput | Very high (sequential writes, batching) | High, but below at large volume |
| Routing | Simple: topics + partition key | Rich: exchanges, bindings, priorities |
| Best for | Streaming, large volumes, multiple readers, replay | Async tasks, jobs, fine-grained routing |

## How it works

A **topic** is split into **partitions**. Each partition is an ordered, immutable log; each message in it gets an increasing **offset**. The partition, not the topic, is the unit of ordering and parallelism.

```text
Topic "orders" — 3 partitions, group "billing"

P0 |0|1|2|3|4|5|─▶   ────▶ consumer A ┐
P1 |0|1|2|3|─▶       ────▶ consumer B │ group
P2 |0|1|2|3|4|─▶     ────▶ consumer B ┘ "billing"

Another group "analytics": a consumer C reads
P0+P1+P2 with its own, independent offsets.
```

- **Producers** write to the topic. With a **key** (`key=user-42`), the key's hash picks the partition → all events for the same key end up in the same partition, hence **in order**. Without a key: round-robin.
- **Consumer groups**: within a group, **each partition is assigned to exactly one consumer**. Three partitions = at most three active consumers; the fourth sits idle. Adding/removing a consumer triggers a **rebalance** (partition reassignment).
- **Offsets**: each group commits its position per partition. Kafka doesn't "push" anything and deletes nothing on read: messages expire according to the configured **retention** (e.g. 7 days), read or not.
- **Replay**: since the journal stays put, you can reset the offset to zero and replay everything — to rebuild a cache, feed a new service, or reprocess after a bug. That's the superpower classic queues don't have.

```python
from kafka import KafkaProducer, KafkaConsumer

# --- Producer ---
producer = KafkaProducer(bootstrap_servers="localhost:9092")
# The key determines the partition: same user → same partition
# → the order of user-42's events is preserved
producer.send("orders", key=b"user-42", value=b'{"total": 99}')
producer.flush()              # force the batch out

# --- Consumer ---
consumer = KafkaConsumer(
    "orders",
    group_id="billing",           # group members share the partitions
    enable_auto_commit=False,     # manual commit: we control the timing
    auto_offset_reset="earliest", # first start: read from the beginning
)
for msg in consumer:
    process(msg)                  # process BEFORE committing the offset
    consumer.commit()             # crash before this line → the message
                                  # is redelivered: at-least-once, so
                                  # process() must be idempotent
```

> ⚠️ **Global ordering does not exist** — Kafka guarantees order *within a partition*, never across partitions. Two events with different keys can be consumed in any order. The whole design lives in the choice of key: events that must stay ordered relative to each other (those of one order, one user) must share the same key. Saying "Kafka guarantees ordering" without this nuance is a classic interview mistake.

## Key concepts to master

- **Delivery semantics**: the default is **at-least-once** — if the consumer crashes between processing and committing the offset, the message is redelivered. Committing *before* processing gives at-most-once (possible loss). **Exactly-once** exists (idempotent producer + transactions) but its scope is mostly Kafka→Kafka (Kafka Streams); as soon as an external system is involved (DB, API), the pragmatic answer is **at-least-once + an idempotent consumer** (unique key, upsert, deduplication).
- **Choosing the partition count**: it's the parallelism ceiling of a group. Too few = saturated consumers; way too many = management overhead and slow rebalances. Trap: **increasing the partition count changes the key→partition mapping** for new messages — per-key ordering is no longer guaranteed across the change.
- **Consumer lag**: the gap between the latest produced offset and the group's committed offset. THE metric to watch: a growing lag = consumers falling behind.
- **Event sourcing (an honest overview)**: store the *events* as the source of truth ("AccountCredited +50") and rebuild state by replaying them, instead of storing current state. Often paired with **CQRS**: separating the write model (commands → events) from the read model (optimized projections). Kafka is a natural fit (durable log, replay), but let's be honest: full event sourcing is a heavy architectural commitment (event versioning, projections to maintain, learning curve). Most "event-driven" systems in production more simply do **event notification** between services — and that's already plenty.
- **Kafka is not a database** nor an RPC bus: no queries, no lookup by key, no synchronous response.

> 💡 **The reverse question: when Kafka is overkill** — a monolith, a single consumer, a few hundred messages per minute? A `jobs` table in Postgres, RabbitMQ, or Redis Streams do the job at a fraction of the operational cost. Kafka means a broker cluster to operate, monitoring, rebalances to understand. Choosing it is justified by: large volumes, several independent consumers, replay/retention needs, or real-time streaming. Being able to say "here, Kafka would be overkill" is an excellent interview signal.

## In an interview

**"Kafka vs RabbitMQ?"** — Start with the model: RabbitMQ is a queue (consumed message = deleted, rich routing, perfect for distributing tasks); Kafka is an append-only log (non-destructive reads by offset, retention, replay, several independent consumer groups, massive throughput). Then one use case each: async jobs → RabbitMQ; an event pipeline read by billing + analytics + audit → Kafka.

**"How does Kafka guarantee ordering?"** — It only guarantees it **per partition**. The producer hashes the key to pick the partition: same key → same partition → order preserved for that key. No key, or different keys → no global order. Choosing the key is a design decision, not a detail.

**"What happens if I add a 4th consumer to a group on a 3-partition topic?"** — Nothing, for it: a partition can only be assigned to one consumer in the group, so it sits idle (useful only as standby). A group's maximum parallelism = the partition count.

**"Is exactly-once possible?"** — Honest answer: Kafka provides an idempotent producer and transactions, which gives exactly-once within the Kafka→Kafka scope (Streams). End to end with a DB or external API, you aim for at-least-once + **consumer-side idempotence** (unique constraint, upsert, dedup table). Answering "yes, just set a flag" is a red flag.

**"What is event sourcing?"** — Storing the sequence of events as the source of truth and deriving state by replaying them; often paired with CQRS (separate write/read models). Benefits: full audit trail, replay, multiple projections. Cost: real complexity (versioning, projections). Bonus: point out you can be event-driven without doing event sourcing.

## Pitfalls & misconceptions

- **"Kafka is a queue"** — no: reading deletes nothing, retention is time-based, and several groups read the same stream independently. Half of all design mistakes stem from this confusion.
- **Consuming without idempotence**: the default at-least-once *will* produce duplicates one day (crash, rebalance). If processing isn't idempotent, that's a latent bug, not a detail.
- **Rebalances aren't free**: during reassignment, consumption pauses. Consumers stuck in a restart loop = a group that barely consumes.
- **Adding partitions "to scale"** without thinking about the key→partition mapping, which changes for new messages.
- **Ignoring consumer lag** until the backlog is measured in hours — it's a consumer's number one health metric.

> 🎤 **In an interview** — if asked to "design an order system with Kafka", immediately raise the partition key question ("order-id, to guarantee ordering of one order's events") and mention consumer idempotence. Those two reflexes show you understood the model, not just memorized the vocabulary.

## Going further

- [Kafka — official documentation](https://kafka.apache.org/documentation/), especially the "Kafka in a nutshell" introduction
- [Confluent Developer](https://developer.confluent.io/): free courses, including "Kafka 101" (short videos)
- [Turning the database inside-out — Martin Kleppmann](https://martin.kleppmann.com/2015/03/04/turning-the-database-inside-out.html), and his book *Designing Data-Intensive Applications* (chapter 11)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) and [CQRS](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler, who himself warns against using them everywhere
