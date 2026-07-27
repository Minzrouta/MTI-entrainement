---
title: "RabbitMQ & message queues"
date: "2026-07-30"
category: "Backend"
level: "Intermédiaire"
summary: "Decoupling, load smoothing, delivery guarantees: what a message broker changes in an architecture — and the ack, DLQ and idempotence questions that come up over and over in backend interviews."
---

## The essentials

A **message queue** inserts a durable intermediary between a producer and a consumer: instead of calling service B synchronously (and failing along with it), service A publishes a message to a broker and moves on. Three benefits: **decoupling** (A doesn't know who consumes, B can be down without breaking A), **load smoothing** (a traffic spike piles up in the queue instead of crushing B), **resilience** (the message persists until processed, with native retry).

**RabbitMQ** is the most widespread open source broker, the reference implementation of the **AMQP 0-9-1** protocol. In an interview, three things are expected: the exchange/queue/binding model, the ack mechanics, and the at-least-once / idempotence discussion.

## How it works

The AMQP model has a subtlety beginners miss: **a producer never publishes directly to a queue**. It publishes to an **exchange**, with a **routing key**; the exchange routes the message to zero, one or several queues according to its **bindings** (the exchange → queue link rules).

Three exchange types to know:

- **direct** — routes to the queues whose binding matches the routing key exactly. E.g.: `payment.failed` → the queue bound with key `payment.failed`.
- **fanout** — broadcasts to every bound queue, routing key ignored. Pure pub/sub.
- **topic** — pattern matching on the dot-separated routing key: `*` = exactly one word, `#` = zero or more words. `logs.*.error` matches `logs.api.error` but not `logs.api.db.error`.

(The fourth type, headers, is rarely used.)

On the consumer side: the broker pushes messages, and the consumer **acknowledges** (`ack`) each one once processing is done. If the consumer dies before the ack (crash, dropped connection), the broker **redelivers** the message — `redelivered` flag set — to another consumer. `nack`/`reject` refuse a message, with or without requeueing. **Prefetch** (QoS) caps the number of unacknowledged messages per consumer: it's what ensures fair dispatch instead of dumping everything on the first connected consumer.

Durability is declared **at both levels**: *durable* queue and *persistent* message (delivery_mode=2). One without the other does not survive a broker restart. On the producer side, **publisher confirms** provide the broker's acknowledgment of receipt.

**Dead letter queue (DLQ)**: a queue can declare a dead-letter exchange (DLX); messages rejected without requeue, expired (TTL) or overflowing the max length are routed there. Essential in production: a poison message (one that crashes the consumer) goes to the DLQ after N attempts instead of looping forever, and you can inspect it then replay it.

## Key concepts to master

- **at-most-once vs at-least-once**: automatic ack (auto-ack) = **at-most-once** — the message is considered delivered as soon as it's sent, a consumer crash loses it. Manual ack after processing = **at-least-once** — nothing is lost, but a crash between processing and ack causes a **duplicate redelivery**. End-to-end "exactly-once" does not exist in a distributed system without application-level cooperation.
- **Consumer idempotence**: the direct consequence of at-least-once — the consumer must tolerate duplicates. Techniques: deduplication by message id (insert with a unique constraint → the duplicate fails cleanly), or naturally idempotent operations (upsert, `SET status = 'paid'` rather than `balance += x`).
- **Patterns**: **work queue** (one queue, N competing consumers — each message processed once, horizontal scaling of processing), **pub/sub** (fanout or topic exchange, one queue per consuming service — each gets its own copy of the event), **RPC over messaging** (reply queue + `correlation_id` — possible, but it reintroduces synchronous coupling: use sparingly).
- **RabbitMQ vs Kafka**: Rabbit is a **queue** — a smart broker with fine-grained routing, messages deleted after ack, perfect for task distribution. Kafka is a distributed append-only **log** — messages stay, each consumer advances its **offset**, which enables replay and multiple independent reads of the same stream; massive throughput thanks to partitions. Tasks, rich routing, low latency → Rabbit; event streaming, replay, very high throughput → Kafka.
- **Ordering**: FIFO guaranteed within a queue… for a single consumer. With competing consumers or redeliveries, *processing* order is no longer guaranteed — never promise it in an interview.

## In an interview

**"Why put a queue between two services rather than an HTTP call?"** — Temporal decoupling (B can be down, the message waits), spike smoothing (the queue absorbs, B consumes at its own pace), native retry through redelivery, and fan-out to several consumers without touching the producer. Trade-offs to mention unprompted: end-to-end latency, eventual consistency, and one more piece of infrastructure to operate and monitor.

**"Direct, fanout, topic: which do you use, when?"** — Direct for exact routing (each task type to its queue), fanout to broadcast an event to everyone (cache invalidation), topic for pattern routing (`order.*` for all order events, `#.error` for all errors, whatever the source).

**"What happens if the consumer crashes mid-processing?"** — With manual ack: the broker detects the channel closing, requeues the message (redelivered flag) and another consumer picks it up — nothing is lost, but processing may have been partially applied, hence the idempotence requirement. With auto-ack: the message is lost, full stop.

**"At-least-once: what problem does it cause and how do you handle it?"** — Duplicates. You make the consumer idempotent: deduplication by message id stored with a unique constraint, or naturally idempotent operations. You don't "fix" duplicates on the broker side — it's an application responsibility.

**"RabbitMQ or Kafka for this use case?"** — The classic open-ended question. Decision grid: need to replay history, very high throughput, several teams reading the same event stream → Kafka. Task distribution, fine-grained routing, TTL, priorities, low latency on moderate volumes → RabbitMQ. Bonus: mention that both often coexist in the same stack.

## Pitfalls & misconceptions

- **Auto-ack in production**: tempting (simpler, faster), but any consumer crash = messages silently lost. Manual ack after processing is the sane default.
- **Durable queue ≠ persistent messages**: you need both — queue declared durable *and* messages published as persistent — otherwise a broker restart wipes everything.
- **Unbounded queue growth**: if consumers are durably slower than producers, the queue grows until it saturates the broker's memory then disk. Monitor queue depth, set TTL and max-length with a DLX.
- **Believing in magic exactly-once**: no broker option provides it end to end; the real answer is at-least-once + application-level idempotence.
- **Poison message without a DLQ**: rejected with requeue, it comes right back to the head of the queue, crashes the consumer again, comes back… an infinite loop that blocks everything. DLQ + retry counter are mandatory.
- **Doing RPC everywhere over the queue**: you stack the broker's latency *on top of* synchronous coupling. If A needs B's answer right now, a direct HTTP/gRPC call is often more honest.

## Going further

- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials): the six official tutorials (work queues, pub/sub, routing, topics, RPC) — the best entry point, with code
- [AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts): exchanges, bindings, acks — the model in detail
- [Reliability Guide](https://www.rabbitmq.com/docs/reliability): confirms, acks, durability — the page to read before production
- [Kafka — Introduction](https://kafka.apache.org/intro): understand the log model to contrast it with the queue
