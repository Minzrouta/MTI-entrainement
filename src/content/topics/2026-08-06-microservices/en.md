---
title: "Microservices vs monolith"
date: "2026-08-06"
category: "Architecture"
level: "Intermédiaire"
summary: "Being able to defend the monolith AND explain when microservices earn their keep: the favorite architecture question in interviews, where nuance pays more than buzzwords."
---

## The essentials

A **monolith** is an application deployed as a single unit: one process, one database, one deployment. **Microservices** split the system into independent services, each with its own code, database and deployment cycle, communicating over the network.

| | Monolith | Microservices |
|---|---|---|
| Deployment | one unit, atomic | independent, service by service |
| Data | one database, ACID transactions | database-per-service, eventual consistency |
| Calls | function calls — free, reliable | network — latency, partial failures |
| Ops | 1 pipeline, 1 monitoring setup | N pipelines, distributed tracing, a platform |
| Team | one small team is enough | requires several autonomous teams |
| Debugging | one stack trace | a multi-service investigation |

The point interviews try to verify: **the monolith is often the right choice**, especially early in a project. A function call is infinitely simpler than a network call — the whole right-hand column comes at full price. The knee-jerk "startup = microservices" has sunk more projects than the monoliths it claimed to avoid.

The real alternative to spaghetti is not microservices, it's the **modular monolith**: one deployable, but internal modules with clean boundaries (the `billing` module only touches the `users` module through its public interface). You keep the operational simplicity and prepare a possible future split — and if the boundaries are good, extracting a module into a service becomes a move, not a rewrite.

> 🎤 **In an interview** — being able to defend the monolith is the real maturity signal. "For this project I'd keep a modular monolith: one team, a still-moving domain, no asymmetric scaling need" is worth more than any Kubernetes buzzword.

## How it works

**What microservices actually deliver** — three promises, all as organizational as they are technical:

- **Independent deployment**: the payments team deploys 10 times a day without waiting for anyone's release train. This is THE central promise — if your services must deploy together, you don't have microservices.
- **Targeted scaling**: you replicate the search service under heavy load without duplicating everything else. (Honesty: a monolith also replicates just fine behind a load balancer — the argument mostly holds for very asymmetric needs: GPU, memory, a specific language.)
- **Team ownership**: each team owns its services end to end — code, database, on-call. That's **Conway's law** applied deliberately: architecture mirrors the organization, so choose it. Corollary: splitting a 3-developer team into microservices means drawing boundaries between… nobody.

> 💡 **The decisive test** — a single question judges a microservices architecture: "can you deploy this service alone, without coordinating with anyone?". If the answer is no, you're paying the price of distribution without its central benefit.

**The hidden costs** — everything a function call used to do for free:

- **The network**: latency, timeouts, retries (with idempotency!), partial failures, circuit breakers. A call that could not fail becomes a call that fails at 2am.
- **Data consistency**: each service owns its database (**database-per-service** — otherwise schema coupling ruins the independence). Consequence: no more ACID transactions across services, no cross-domain SQL JOINs. You live with **eventual consistency**, and an order touching stock + payment + shipping becomes a **saga**: a sequence of local transactions where any failure triggers compensating transactions that undo the previous steps. Two sentences in an interview are enough — knowing the problem exists matters more than the details.
- **Observability**: a request crosses 6 services; without **distributed tracing** (a propagated correlation ID, OpenTelemetry) and centralized logs, every bug is a detective case.
- **Ops**: N CI/CD pipelines, N services to monitor, API versioning between services. You need a platform (Kubernetes or equivalent) and a team able to operate it.

**Communication**: **synchronous** (REST, gRPC) — easy to reason about, but temporally coupled: if the downstream service is slow or down, so is the upstream one, and failures cascade. **Asynchronous** (events through a broker: Kafka, RabbitMQ) — the producer publishes "OrderCreated" and waits for no one; decoupling and burst absorption, at the price of eventual consistency and harder debugging. An **API gateway** acts as the single entry point for clients: routing, authentication, rate limiting, aggregation — clients never need to know the internal topology.

## Key concepts to master

- **Modular monolith**: the nuanced answer that lands in interviews. Logical boundaries without network boundaries.
- **Distributed monolith**: the number one anti-pattern — services separated by the network yet so coupled they must deploy together. Every cost of distribution, none of the benefits (see the pitfalls callout).
- **Database-per-service**: a necessary condition for independence. Two services sharing a database are coupled through the schema — one service's `ALTER TABLE` breaks the other.
- **Saga**: the answer to distributed transactions — local transactions plus compensations, either orchestrated (a coordinator) or choreographed (a chain of events).
- **Strangler fig**: the sane migration strategy — extract one capability at a time from the monolith, a proxy gradually routes traffic to the new service, and the monolith gets "strangled" bit by bit. Never a big-bang rewrite.

```text
             ┌───────┐
 Clients ──▶ │ Proxy │  routes more and more
             └───┬───┘  to the extracted services
        ┌────────┴────────┐
        ▼                 ▼
 ┌────────────┐    ┌──────────────┐
 │ Monolith   │    │ Extracted    │
 │ (shrinking)│    │ service #1   │
 └────────────┘    └──────────────┘
  /orders /users      /billing
```

- **When to migrate**: when the limits become concrete — teams blocking each other at deployment time, a module with radically different scaling needs, an organization outgrowing what a single deployable supports. Pain first, split second.

## In an interview

**"Monolith or microservices for a brand-new startup?"** — Monolith, modular if possible. At that stage iteration speed rules and the product pivots; microservices freeze boundaries you don't know yet, and impose costs (network, ops, consistency) with no team to absorb them. Cite Fowler's "MonolithFirst": nearly every successful microservices system started as a monolith that got split later.

**"What is a distributed monolith?"** — Services separated by the network but still coupled: coordinated deployments, shared database, chains of synchronous calls. The worst of both worlds: the latency and partial failures of distribution, without independent deployment. Typical causes: splitting by technical layers instead of business domains, and drawing boundaries too early.

**"How do you handle a transaction spanning several services?"** — Global ACID is gone; the saga pattern splits the operation into local transactions, each with a compensation if a later step fails (cancel the reservation, refund the payment). Add that it's a design exercise: idempotent operations, visible intermediate states ("payment pending").

**"Synchronous or asynchronous communication between services?"** — Synchronous (REST/gRPC) when you need the answer right now; but every synchronous call propagates failures and adds up latencies. Asynchronous (events) for everything that can be: decoupling, resilience to bursts, but eventual consistency. Practical rule: synchronous for client-facing queries, asynchronous between services whenever possible.

**"How do you migrate a monolith to microservices?"** — Strangler fig: first modularize the monolith to reveal the real boundaries, then extract the capability with the best pain-to-risk ratio (often a peripheral domain), route traffic through a proxy or gateway, repeat. Each extraction must justify itself — if none does, keep the monolith and that's perfectly fine.

## Pitfalls & misconceptions

> ⚠️ **The distributed monolith is watching you** — the infallible symptom: "we deploy the three services together on Thursdays". Shared database, fragile APIs, chains of synchronous calls: you pay the latency and partial failures of distribution without its one real benefit, independent deployment.

- **"Microservices are more scalable"** — a replicated monolith behind a load balancer scales very well. Targeted scaling only pays off for genuinely asymmetric needs.
- **Microservices with 3 devs**: service boundaries exist to decouple *teams*. Without multiple teams, you inherit the costs without the benefits.
- **Shared database between services**: schema coupling cancels independent deployment — the shortest road to the distributed monolith.
- **Ignoring the network**: treating an inter-service call like a function call (no timeout, no retry, no idempotency) means discovering the 8 fallacies of distributed computing in production.
- **Splitting too early**: domain boundaries only reveal themselves through use. A bad microservice split costs far more to fix than a bad module split.
- **Migrating by fashion**: "Netflix does it" — Netflix has thousands of engineers. The right question is never "what do the FAANGs do" but "what concrete problem do I have today".

## Going further

- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) and [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
- [microservices.io](https://microservices.io/patterns/index.html): Chris Richardson's pattern catalog, especially [Saga](https://microservices.io/patterns/data/saga.html) and [Database per service](https://microservices.io/patterns/data/database-per-service.html)
- [Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html): the migration strategy
- A useful thought exercise for interviews: take one of your projects and argue *against* splitting it into microservices — the reverse of the usual reflex
