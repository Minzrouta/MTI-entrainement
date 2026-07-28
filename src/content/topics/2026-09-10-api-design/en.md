---
title: "Designing a good API"
date: "2026-09-10"
category: "Architecture"
level: "Intermédiaire"
summary: "Naming, status codes, pagination, idempotency, webhooks: the conventions that separate an API people enjoy from one they endure — and the most common design exercise in interviews."
---

## The essentials

An API is a **contract** between your server and clients you don't control. Its quality isn't measured by what it does, but by its **predictability**: a developer who has seen one endpoint should be able to guess the others. REST conventions exist precisely for that — following them gives you, for free, years of intuition accumulated by the ecosystem.

The ground rules fit in three lines:

- **Resources are plural nouns**, never verbs: `GET /users/42/orders`, not `GET /getOrdersOfUser?id=42`. The verb is the HTTP method.
- **HTTP methods carry the semantics**: `GET` reads (no side effects), `POST` creates, `PUT` replaces, `PATCH` partially updates, `DELETE` removes.
- **Status codes tell the truth**: 2xx success, 4xx client error, 5xx server error. `401` = not authenticated, `403` = authenticated but forbidden, `404` = not found, `409` = state conflict, `422` = syntactically valid payload that fails business rules.

> ⚠️ **The lying 200** — the most widespread anti-pattern: replying `200 OK` with `{"success": false, "error": "..."}` in the body. Proxies cache the response, metrics believe everything is fine, clients must parse the body to know whether it worked, and automatic retries never trigger. The status code IS the error channel — use it.

## How it works

**Structured errors** — An error must be machine-actionable AND human-readable. The standard is **RFC 9457 (Problem Details)** with the `application/problem+json` content type:

```json
{
  "type": "https://api.example.com/errors/insufficient-stock",
  "title": "Insufficient stock",
  "status": 409,
  "detail": "Requested 5 units of item 4521, only 2 left.",
  "instance": "/orders/abc123",
  "available": 2
}
```

`type` identifies the error category (a stable, documentable URL), `detail` explains this specific case, and you can add business fields (`available`). A client can branch on `type` without parsing an English sentence.

**Versioning** — Two schools: version in the URL (`/v1/users`, visible, easy to route and cache) or in a header (`Accept: application/vnd.api+json;version=2`, more "pure" REST but invisible and painful to test in a browser). In practice, the URL wins almost everywhere (Stripe, GitHub). The real senior reflex: **only version on breaking changes**. Adding a field to a response is not breaking — clients must ignore unknown fields. Renaming or removing a field, changing a type: that is breaking.

**Pagination** — Never return an entire collection. Two strategies:

| | Offset (`?page=3&limit=20`) | Cursor (`?after=xyz&limit=20`) |
|---|---|---|
| Implementation | Trivial (`LIMIT/OFFSET`) | Keyset on an indexed column |
| Deep pages | Slow (DB scans and discards) | Fast (direct index seek) |
| Inserts while paging | Duplicates or gaps | Stable |
| Jump to page N | Yes | No (sequential traversal) |
| Typical use | Back-office, small tables | Feeds, public APIs, large volumes |

The cursor encodes "where I am" (usually the last id/timestamp, opaque in base64): the query becomes `WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20`, served by the index at any depth.

```js
// GET /todos?after=<cursor>&limit=20 — cursor pagination
app.get("/todos", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100); // cap it!
  const after = decodeCursor(req.query.after);   // opaque { createdAt, id }
  const rows = await db.todos.find({
    where: after ? { createdAt: { lt: after.createdAt } } : {},
    orderBy: { createdAt: "desc" },
    take: limit + 1,                             // +1 to know if a page remains
  });
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  res.json({
    data: items,
    next_cursor: hasMore ? encodeCursor(items.at(-1)) : null,
  });
});
```

**Filtering and sorting** — via query params, simple conventions: `?status=open&sort=-created_at` (the `-` for descending). Document which fields are filterable; blindly accepting everything means gifting full table scans to your users.

**Idempotency** — `GET`, `PUT`, `DELETE` are idempotent by definition (replaying = same state). `POST` is not: a client that times out and retries can create two orders. The fix: the **`Idempotency-Key`** header (popularized by Stripe). The client sends a unique key per operation; the server stores `key → response` and replays the recorded response if the key comes back. Retries become safe.

**Rate limiting** — reply **`429 Too Many Requests`** with a **`Retry-After`** header (seconds or a date), plus the informative `RateLimit-Limit` / `RateLimit-Remaining` headers. A well-behaved client reads `Retry-After` and applies exponential backoff with jitter.

**Webhooks** — the API in reverse: you call the client when an event happens (payment confirmed, build finished).

```text
Your API ──POST /hooks (event + signature)──▶ Client
   │                                            │
   │◀───────── got 2xx? otherwise retry ────────┘
   │    expo backoff: 1min, 5min, 30min…
```

The rules of the game: **sign the payload with HMAC-SHA256** using a shared secret, including a timestamp to block replay (the client checks signature + freshness); **retry** with exponential backoff until the client answers 2xx; on the client side, **respond 2xx immediately** and process asynchronously — and deduplicate by `event.id`, because retries guarantee at-least-once delivery, hence duplicates.

**Documentation** — an **OpenAPI** spec is not a luxury: it generates interactive docs (Swagger UI), typed clients, mocks and contract tests. Spec-first or code-first, doesn't matter — what matters is that it is the source of truth.

## Key concepts to master

- **Resource vs action**: when an operation doesn't fit CRUD (`cancel an order`), model a sub-resource or an action: `POST /orders/42/cancel`. Pragmatism > purity.
- **401 vs 403**: "I don't know who you are" vs "I know who you are, and no". Mixing them up in an interview is expensive.
- **Unknown fields are ignored**: this implicit contract is what makes additions non-breaking. A client that rejects unknown fields breaks itself.
- **Response envelope**: `{ "data": [...], "next_cursor": ... }` rather than a bare array — a bare array can never gain metadata without a breaking change.
- **HATEOAS**: know it exists (hypermedia links in responses) and that almost nobody implements it fully.

## In an interview

> 🎤 **In an interview** — the classic exercise: "design the API for a todo-list". Walk through it methodically: resources (`/todos`, `/todos/{id}`), methods and codes (`POST /todos` → 201 + `Location`, `DELETE` → 204, `PATCH` to tick), cursor pagination on `GET /todos`, a `?done=false` filter, errors in problem+json, and finish with "and if another service wants notifications, HMAC-signed webhook". In five minutes you've shown the whole palette.

**"Why cursor pagination rather than offset?"** — Two reasons: performance (offset forces the DB to read and discard N rows, a cursor does an index seek) and stability (if items are inserted while paging, offset produces duplicates or gaps, a cursor doesn't). Trade-off: no direct jump to page 12.

**"How do you handle a POST replayed because of a timeout?"** — `Idempotency-Key` header: the server stores the key and the associated response; if the key comes back, it returns the recorded response without re-executing. Without it, a network retry can charge twice.

**"When do you create a v2?"** — Only on breaking changes: field removal/rename, type or semantics change. Adding a field or endpoint is backward compatible. And keep v1 alive with an announced end-of-life date.

**"How do you secure a webhook?"** — HMAC-SHA256 signature of the body with a shared secret, sent in a header, with a timestamp included in the signature to prevent replay. The receiver verifies in constant time, answers 2xx quickly, processes async, deduplicates by event id.

**"401 or 403?"** — 401 without valid credentials (the client must authenticate), 403 with valid credentials but insufficient rights. Bonus: some return 404 instead of 403 to avoid revealing a resource exists.

## Pitfalls & misconceptions

- **The 200-error** (see callout above): the status code is part of the contract, not a `success` field.
- **Verbs in URLs** (`/createUser`, `/deleteOrder`): the HTTP method already carries the verb; doubling it breeds inconsistencies.
- **Unbounded pagination**: accept `?limit=100000` as-is and your DB goes down. Always cap server-side.
- **Silent breaking change**: renaming a field "because it's cleaner" breaks every client. Backward compatibility is a permanent constraint, not an option.
- **Unsigned webhooks**: anyone can post a fake `payment_succeeded` event to your endpoint. Signature required, always.

> 💡 **Reflex to show** — facing any API question, think "and the client that retries?". Idempotency, deduplication, `Retry-After`: showing you design for a network that fails is the senior marker.

## Going further

- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457): the structured-error standard
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/): a real company's reference guide, very complete
- [Stripe API Reference](https://docs.stripe.com/api): the most imitated API in the world — study pagination, idempotency, errors
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) and [webhooks.fyi](https://webhooks.fyi/) for webhook patterns
