---
title: "Junior system design: the URL shortener"
date: "2026-10-06"
category: "Architecture"
level: "Intermédiaire"
summary: "The system design exercise most often given to juniors: apply the method (requirements, orders of magnitude, diagram, iteration) to the bit.ly case — and understand what the interviewer really evaluates."
---

## The essentials

A junior system design interview doesn't evaluate your knowledge of exotic architectures: it evaluates your **way of reasoning**. The interviewer wants to watch you clarify a fuzzy problem, put numbers on it, propose something simple that works, then improve it where it strains. A candidate who draws Kafka and twelve microservices in thirty seconds fails; a candidate who starts with "how many URLs per day?" scores points before drawing anything at all.

> 🎤 **In an interview** — the 4-step method, to run out loud: **1. Clarify the requirements** (functional and non-functional: volume, latency, availability). **2. Estimate orders of magnitude** (requests/s, storage — a back-of-the-envelope calculation is enough). **3. Draw the simple diagram** that meets the need. **4. Iterate** on the bottlenecks, in the order they would appear. Announce the plan up front: the interviewer sees you have a process, not just reflexes.

The **URL shortener** (bit.ly, tinyurl) is the textbook case: a scope you can grasp in one sentence, yet rich enough to touch API design, ID generation, storage, caching, HTTP redirections and scaling.

**Step 1 — requirements.** Functional: create a short link from a long URL; redirect the short link to the original; (bonus) count clicks. Non-functional: reads massively dominate writes (~100:1 ratio), the redirect must be fast (< 100 ms), the service must be available — a dead link is a useless link.

**Step 2 — orders of magnitude.** Assumption: 100M new URLs per year ≈ **3 writes/s**, hence ~**300 reads/s** with the 100:1 ratio. Storage: 100M × ~500 bytes ≈ **50 GB per year**. Conclusion to state out loud: *this fits on a single well-indexed Postgres* — "scaling" will be read-side comfort, not a matter of survival.

## How it works

**The API** — two endpoints are enough:

- `POST /shorten` with `{ "url": "https://…" }` → `201` and `{ "code": "aZ3k9x1" }` (validate the URL, reject dangerous schemes).
- `GET /:code` → `301` or `302` to the long URL, `404` if the code doesn't exist.

**Code generation** — the heart of the exercise. Two approaches to compare:

- **Counter + base62**: an auto-incremented id, encoded over the `[0-9a-zA-Z]` alphabet. Simple, no collision possible, short codes. Drawback: codes are predictable (you can enumerate other people's URLs) — fixed by scrambling the id with a permutation or a secret offset.
- **Hashing the URL** (MD5/SHA truncated to 7 characters): no central counter, the same URL yields the same code. Drawback: truncation creates **collisions** (birthday paradox) — you must check the database and retry with a salt.

```python
ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz" \
           "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(n: int) -> str:
    """Encode an auto-incremented id as a short code."""
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)       # remainder = alphabet index
        out.append(ALPHABET[r])
    return "".join(reversed(out))  # 125 → "21", 10**9 → "15ftgG"

# 62^7 ≈ 3.5 × 10^12 codes with 7 characters:
# at 100M/year, the space lasts ~35,000 years. Plenty.
```

**Storage** — the model is a key-value table: `code (PK) → url, created_at, user_id?`. No joins, no complex transactions: any store fits. Postgres is more than enough at this scale; a key-value store (DynamoDB) only becomes relevant at "billions" scale. Saying it that way shows you size for the need, not for the résumé.

**The architecture** — simple version first, then iterated:

```text
           ┌───────────────┐
 client ──▶│ load balancer │
           └───────┬───────┘
                   ▼
       ┌──────────────────────┐
       │ app servers          │
       │ (stateless, scale    │
       │  horizontally)       │
       └────┬────────────┬────┘
    1. hit? │            │ 2. miss
            ▼            ▼
     ┌────────────┐  ┌───────────────┐
     │ Redis      │◀─│ DB code → URL │
     │ (hot URLs) │  │ + replicas    │
     └────────────┘  └───────────────┘
```

The app servers are **stateless**: all state lives in the database and the cache, so you can add servers behind the load balancer without coordinating anything. For reads: database **replicas** and the cache absorb the 300 req/s effortlessly.

## Key concepts to master

- **301 vs 302 — the real trap of the exercise**:

| | 301 Moved Permanently | 302 Found (temporary) |
|---|---|---|
| Browser cache | Aggressive, often permanent | Not cached by default |
| Subsequent clicks | Go straight to the target | Come back through the service |
| Analytics | Lost after the 1st click | Counted on every click |
| Server load | Minimal | Every click hits the service |
| Pick it if | Zero need for stats | Tracking is a requirement (bit.ly's real case) |

- **Caching hot URLs** — link popularity follows a Zipf distribution: a small fraction of codes concentrates most of the traffic. A Redis in **cache-aside** mode (read the cache, on miss read the DB and fill it, with a TTL) absorbs the majority of reads. Since URLs are immutable, invalidation — caching's hard problem — nearly disappears.
- **Rate limiting** — essential on `POST /shorten`: without it, a spammer generates millions of links (phishing, code-space pollution). A token bucket per IP or API key, and a `429 Too Many Requests`.
- **404 and validation** — an unknown code returns 404; an input URL gets validated (http/https schemes only — otherwise you just created an open redirect to `javascript:`).
- **What the interviewer really evaluates** — in order: you clarify before drawing; you put numbers down; every box in the diagram has a justification ("a cache *because* reads dominate"); you know your design's limits. Reasoning beats buzzwords every single time.

> 💡 **Starting simple is a skill** — "one Postgres and two servers are enough at this scale" is a better interview answer than any unjustified distributed architecture. You're showing you know *when* complexity becomes necessary — exactly what separates a future good engineer.

## In an interview

**"Design a URL shortener for me."** — Run the method: requirements (2 endpoints, reads >> writes), numbers (3 writes/s, 300 reads/s, 50 GB/year), simple diagram (LB → stateless app → Postgres + Redis), iterations (cache, replicas, rate limiting). Announce the plan before starting.

**"301 or 302 for the redirect?"** — 301 is semantically "correct" and saves traffic, but the browser caches it: all subsequent clicks bypass your service, so **no more analytics**. If tracking matters — it's bit.ly's business model — pick 302 (or a deliberate 301 if you want no stats at all). Showing the trade-off is worth more than the "right" answer.

**"How do you generate the short code?"** — Counter + base62: simple and collision-free, but predictable (fixable with a secret permutation). Truncated hash: no central counter but collisions to handle (check + retry). At this scale, counter + base62 wins; 7 characters = 62⁷ ≈ 3.5 × 10¹² codes.

**"What happens if your database goes down?"** — Reads partially survive thanks to the cache (hot URLs still answer); writes fail — acceptable briefly. Then: a replica is promoted to primary, and saying it that simply is enough at junior level.

**"How do you prevent abuse?"** — Rate limiting on creation (token bucket per IP/API key), strict URL validation, possibly a blocklist of phishing domains and an expiry policy for free links.

## Pitfalls & misconceptions

> ⚠️ **The 301 that kills analytics** — this is THE planted trap of the exercise. Answering "301 because the redirect is permanent" without mentioning the browser cache misses the point: after the first click, the browser will never come back through your service. When the follow-up "and how do you count clicks?" arrives, it's too late.

- **Buzzword soup** — Kafka, microservices, sharding and CQRS for 3 writes/s: the interviewer reads it as keyword-dropping, not engineering. Every box must answer to a number.
- **"A hash is unique"** — truncated to 7 characters, no: the birthday paradox makes collisions likely long before the space runs out. Always plan detection and retry.
- **Optimizing writes in a read-heavy system** — the 100:1 ratio dictates the entire design (cache, replicas). Sharding writes here solves a problem that doesn't exist.
- **Forgetting product security** — accepting any URL turns you into a phishing relay with a nicely reputed domain. Validation, rate limiting, expiry.
- **Drawing before questioning** — jumping to the whiteboard without asking about volume is mistake number one. The first two minutes of questions are the ones that earn the most points.

## Going further

- [System Design Primer — Design Pastebin/Bit.ly](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md): the detailed solution from the reference repo
- [ByteByteGo — System Design Interview](https://bytebytego.com/): Alex Xu's newsletter and diagrams, including the URL shortener chapter of his book
- [MDN — HTTP redirections](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections): 301, 302, 307, 308 and their exact semantics
- Practice: redo the exercise on a neighboring case (pastebin, a like system) while timing the 4 steps — 35 minutes, real conditions
