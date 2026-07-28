---
title: "Robustness: timeouts, retries & circuit breakers"
date: "2026-10-20"
category: "Backend"
level: "Avancé"
summary: "Timeouts, retries with backoff, circuit breakers, graceful degradation: the patterns that separate a demo backend from a production one — and a goldmine of system design interview questions."
---

## The essentials

First of the eight *fallacies of distributed computing* (Peter Deutsch, 1994): "the network is reliable". It isn't. As soon as your service calls anything else — a database, a third-party API, a neighboring microservice — that call can fail, drag on, or worse: succeed without you ever receiving the response. A production backend is not one where nothing fails; it's one that **fails cleanly**.

The hierarchy of defenses, in the order you install them:

1. **Timeout** — never wait forever. A call without a timeout is a thread (or pool connection) potentially blocked for good.
2. **Retry with backoff + jitter** — retry *transient* failures, spacing attempts out and desynchronizing them.
3. **Circuit breaker** — stop calling a service that is clearly down, let it breathe, and fail fast.
4. **Graceful degradation** — when everything has failed, serve something degraded (stale cache, default value) rather than a 500.

The most dangerous mistake is not forgetting these patterns: it's applying just one of them naively. A retry without a timeout or a limit is a machine for making outages worse.

## How it works

**Timeouts and the latency budget**: in a chain A → B → C, timeouts must **decrease** down the cascade. If A gives B 2 s, B cannot give C 3 s — otherwise B will answer A after A has already given up: wasted work and inconsistent errors. Think in terms of a **budget**: the end-to-end SLO is split across the tiers, each tier keeping a margin.

**Retry, the correct version**: exponential backoff (1 s, 2 s, 4 s…) with a cap, plus **jitter** (randomness). Without jitter, all the clients that failed at the same moment retry at the same moment — synchronized waves that crush the service again. Above all: only retry what is **idempotent** or safe. Replaying a `POST /payments` that actually succeeded (the response got lost) = double charge. Hence **idempotency keys**: the client sends a unique identifier with the request, the server detects the duplicate and returns the first response (see the API design topic from September 10).

```js
// Retry with exponential backoff + full jitter (AWS-style)
async function withRetry(fn, { retries = 3, baseMs = 500 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(); // fn carries its own timeout!
    } catch (err) {
      // Only retry the transient: 503, timeout, reset.
      // Never a 400/404 (replaying changes nothing),
      // never a non-idempotent POST.
      if (!isTransient(err) || attempt >= retries) throw err;

      // Capped exponential backoff: 500, 1000, 2000 ms…
      const cap = Math.min(baseMs * 2 ** attempt, 10_000);
      // Full jitter: uniform draw in [0, cap]
      // → desynchronizes clients, avoids waves.
      const delay = Math.random() * cap;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

**Circuit breaker**: a failure counter per dependency, three states.

```text
            failures > threshold
  ┌────────┐ ─────────────────▶ ┌────────┐
  │ CLOSED │                    │  OPEN  │
  │ (calls │ ◀───────────────── │ instant│
  │ pass)  │      success       │ fail   │
  └────────┘        │           └────────┘
      ▲             │                │ after a delay
      │             │                ▼
      │       ┌───────────┐   lets a few
      └────── │ HALF-OPEN │◀─ probe calls
   probes     │  (test)   │   through
   succeed    └───────────┘
                    │ failure → back to OPEN
```

Closed: everything passes, failures are counted. Too many failures: open — fail **immediately** without calling, the downstream service gets a breather. After a delay, half-open: a few probe calls; success → closed, failure → open again. Two benefits: the sick service recovers, and your own threads stop piling up waiting on a corpse.

| Problem | Pattern |
|---|---|
| A call that never answers | Timeout |
| Transient failure (network blip, 503) | Retry + backoff + jitter |
| Dependency down for good | Circuit breaker |
| One slow dependency exhausts all threads | Bulkhead (isolated pools) |
| Total failure instead of degraded | Fallback, stale cache |
| Replaying an unsafe POST | Idempotency key |
| All clients coming back at once | Jitter, gradual ramp-up |

## Key concepts to master

- **Bulkhead**: partition resources per dependency (separate connection/thread pools, quotas). If the recommendations API gets slow, it saturates *its* pool of 10 connections — not the service's 200. Named after a ship's watertight compartments.
- **Graceful degradation**: plan the degraded version of every feature. Reco service dead? Show best-sellers (static). Exchange rate unavailable? Serve the last known value with its age (**stale cache**, often acceptable). A page that's 90% functional beats a 500 every time.
- **Health checks**: distinguish **liveness** ("is the process running?" — if not, restart it) from **readiness** ("can it serve traffic?" — if not, pull it from the load balancer without killing it). Classic trap: a health check that also tests dependencies can pull *all* instances from the LB when the database blips — a local failure becomes a total one.
- **Thundering herd**: a thousand clients (or a thousand cache entries expiring together) hit the origin at the same instant — on a service restart, on a popular cache expiry. Countermeasures: jitter on TTLs and reconnections, *request coalescing* (one request regenerates the cache, the others wait), progressive warm-up.

> 💡 **Fail fast** — a service that answers "error" in 5 ms is a far better neighbor than one that answers "error" in 30 s: it holds no threads, no connections, and doesn't hold the user hostage. A circuit breaker is above all a fail-fast machine.

## In an interview

**"What happens if this third-party API doesn't respond?"** — THE system design question. Walk the hierarchy: timeout (with a coherent budget down the chain), retry with backoff + jitter if transient and idempotent, circuit breaker if the failure persists, degraded fallback (stale cache, default value) as a last resort. Mention monitoring: a breaker opening must alert.

**"Why jitter in the backoff?"** — Without jitter, all the clients that failed together retry at the same instants: synchronized waves hit the service exactly as it tries to get back up. Jitter spreads attempts uniformly. Bonus: cite the AWS "Exponential Backoff and Jitter" post and *full jitter*.

**"Explain the circuit breaker states."** — Closed: normal traffic, failures counted. Open: instant failure without calling, for a cool-down period. Half-open: a few probe requests; success → closed, failure → open. Add the *why*: protect the downstream service AND free your own resources.

**"When is a retry dangerous?"** — Two cases. 1) Non-idempotent operation: the request may have succeeded without the response arriving; replaying duplicates (payment, email send) → idempotency keys. 2) Overloaded service: retries multiply traffic exactly when it should shrink → retry storm. Complete answer: cap attempts, backoff + jitter, a retry budget, and don't stack retries at every tier.

**"Liveness vs readiness?"** — Liveness: is the process alive (if not, restart). Readiness: is it ready to serve (if not, removed from the LB, no restart). Confusing them = restart loops while a dependency is merely slow.

## Pitfalls & misconceptions

> ⚠️ **The retry storm that finishes the service off** — a service slows down under load; client timeouts expire; each client retries 3 times → incoming traffic is multiplied by 3-4 on a service already on its knees; it collapses; the retries keep coming and prevent any restart (every instance that comes back is instantly saturated). It's a self-sustaining **cascading failure** — half the big public incidents (AWS, Cloudflare) contain one. Countermeasures: a global retry budget (e.g. max 10% of traffic), circuit breakers, backoff + jitter, and *load shedding* (reject the excess early rather than serving everything badly).

- **Stacked retries**: 3 attempts at the HTTP client × 3 at the service × 3 at the gateway = up to 27 calls for one request. Pick ONE tier that owns the retry.
- **A single generous timeout** ("30 s everywhere"): too long for the user, incoherent in cascade. Timeouts are sized per call, from observed percentiles (p99 + margin).
- **A circuit breaker is not a retry**: it retries nothing, it *prevents* calling. The two combine: retry for blips, breaker for lasting outages.
- **Testing only the happy path**: robustness is tested by injecting failures (simulated timeouts, chaos testing) — otherwise your fallbacks are dead code that will fail on the day it matters.

## Going further

- [AWS Architecture Blog — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/): the reference post, with simulations
- [Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/): the applied guide
- [Google SRE Book — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/): the chapter dissecting retry storms and load shedding
- [Martin Fowler — CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html) and the [resilience4j](https://resilience4j.readme.io/) (Java) / [Polly](https://www.pollydocs.org/) (.NET) libraries
- *Release It!* (Michael Nygard) — the book that named these patterns, packed with real incident stories
