---
title: "HTTP from A to Z"
date: "2026-08-20"
category: "Web"
level: "Fondamental"
summary: "Methods, status codes, cookies, HTTP/2 and 3: the protocol you use a hundred times a day — and one an interviewer can dig into for twenty minutes."
---

## The essentials

HTTP (HyperText Transfer Protocol) is the **request/response** protocol of the web: a client (browser, `curl`, mobile app) sends a request, a server returns a response, and the conversation ends there. It is **stateless**: every request stands alone, the server has no memory of the previous one — anything that looks like a "session" is rebuilt on top (cookies, tokens).

A request has three parts: a **request line** (method + path + version, e.g. `GET /users/42 HTTP/1.1`), **headers** (key-value pairs: `Host`, `Accept`, `Authorization`…), and an optional **body**. The response mirrors it: a **status line** (`HTTP/1.1 200 OK`), headers, body.

Methods carry **semantics**: `GET` reads (safe, no side effects), `POST` creates or triggers, `PUT` replaces entirely, `PATCH` modifies partially, `DELETE` removes, `HEAD` = GET without a body, `OPTIONS` asks about capabilities (it's the method behind CORS *preflight*). A method is **idempotent** if replaying it N times produces the same state as once: GET, PUT, DELETE are; **POST is not** — hence the danger of resubmitting a payment.

The status codes to know by heart, by family:

| Code | Meaning | The reflex |
|---|---|---|
| 200 | OK | Generic success |
| 201 | Created | Successful creation (+ `Location` header) |
| 204 | No Content | Success without a body (typical DELETE) |
| 301 | Moved Permanently | Permanent redirect, cached by the browser |
| 304 | Not Modified | Cache still valid, no body returned |
| 400 | Bad Request | Malformed request (syntax, invalid JSON) |
| 401 | Unauthorized | **Not authenticated** (badly named!) |
| 403 | Forbidden | Authenticated but **no permission** |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (e.g. email already taken) |
| 422 | Unprocessable Entity | Syntax OK, business validation failed |
| 429 | Too Many Requests | Rate limiting (+ `Retry-After`) |
| 500 | Internal Server Error | Server-side bug |
| 502 | Bad Gateway | Reverse proxy got no valid answer from the backend |
| 503 | Service Unavailable | Server overloaded or in maintenance |

## How it works

One full round trip, as `curl -v` shows it:

```text
Client                                    Server
  │  GET /users/42 HTTP/1.1                  │
  │  Host: api.example.com                   │
  │  Accept: application/json                │
  │─────────────────────────────────────────▶│
  │                                          │ routing,
  │                                          │ controller, DB
  │  HTTP/1.1 200 OK                         │
  │  Content-Type: application/json          │
  │  Cache-Control: max-age=60               │
  │                                          │
  │  {"id": 42, "name": "Ada"}               │
  │◀─────────────────────────────────────────│
  │        (TCP connection kept open         │
  │         → keep-alive, next request)      │
```

Under the hood, HTTP/1.1 rides on **TCP**. Opening a TCP connection costs a round trip (plus a TLS handshake for HTTPS), so since HTTP/1.1 connections are **persistent by default** (keep-alive): several requests reuse the same pipe. But in 1.1, requests on one connection are **sequential**: one slow response blocks all the following ones — that's **head-of-line blocking**. Browsers work around it by opening ~6 connections per domain.

**HTTP/2** fixes this with **multiplexing**: a single TCP pipe, but dozens of interleaved binary *streams* — no more HTTP-level blocking, plus header compression (HPACK). One HOL blocking remains *at the TCP level*: one lost packet stalls every stream until retransmission. **HTTP/3** removes that last lock by replacing TCP with **QUIC** (over UDP): each stream is independent under packet loss, TLS 1.3 is built into the handshake, and the connection survives a network change (Wi-Fi → 4G).

**HTTPS** = HTTP inside a TLS tunnel. In two sentences: the client and server negotiate version and algorithms, the server proves its identity with a **certificate** signed by a trusted authority, and a key exchange (ephemeral Diffie-Hellman) establishes a symmetric session key. All HTTP traffic is then encrypted and authenticated with that key — in TLS 1.3 the handshake fits in a single round trip.

> 🎤 **In an interview** — "HTTP/1.1 vs 2 vs 3" boils down to one sentence per version: *1.1 = one request at a time per connection; 2 = multiplexing over one TCP, but TCP re-blocks on loss; 3 = QUIC over UDP, truly independent streams.* Saying that calmly is worth all the details.

## Key concepts to master

- **Content negotiation**: the client announces what it accepts (`Accept: application/json`, `Accept-Language: fr`, `Accept-Encoding: gzip, br`), the server answers with what it picked (`Content-Type`, `Content-Encoding`) — or `406 Not Acceptable`.
- **Cookies**: the server sends `Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax`, and the browser automatically sends it back on every request to that domain. `HttpOnly` = invisible to JavaScript (anti-XSS), `Secure` = HTTPS only, `SameSite` = CSRF protection. This is THE mechanism that manufactures state on a stateless protocol.
- **Caching**: `Cache-Control: max-age=3600` (freshness), then revalidation with `ETag`/`If-None-Match` → a `304` response with no body. A huge performance lever candidates often forget.
- **Idempotence & safety**: safe = modifies nothing (GET, HEAD); idempotent = replayable without changing the outcome (GET, PUT, DELETE). Proxies and HTTP clients rely on this to *retry automatically* — retrying a POST risks a duplicate.
- **`Host` and reverse proxies**: the `Host` header (mandatory in 1.1) lets a single server/IP serve several domains. That's what Traefik or nginx use to route to the right backend — and why a misconfigured backend returns 502/503.

Dissect it yourself with `curl`:

```bash
curl -v https://api.github.com/users/octocat
# > GET /users/octocat HTTP/2        ← request line (curl negotiated h2)
# > Host: api.github.com             ← which site on this IP
# > Accept: */*                      ← content negotiation
# <                                  ← ('>' lines = sent, '<' = received)
# < HTTP/2 200                       ← status line
# < content-type: application/json; charset=utf-8
# < etag: W/"a1b2c3"                 ← to revalidate the cache later
# < x-ratelimit-remaining: 59        ← rate limiting announced in a header
# < {"login":"octocat", ...}         ← the JSON body
```

> 💡 **Reflex to show** — facing an API bug, reach for `curl -v` (or the Network tab) before rereading the code: half the problems are readable in the headers (wrong `Content-Type`, missing cookie, unexpected redirect, CORS).

## In an interview

**"What's the difference between 401 and 403?"** — 401 Unauthorized actually means **not authenticated**: the server doesn't know who you are (missing/expired token), and the response carries `WWW-Authenticate`. 403 Forbidden: the server knows who you are but you **lack permission**. Re-authenticating fixes a 401, never a 403.

**"PUT vs PATCH?"** — PUT **replaces the whole resource** (anything not sent is wiped) and is idempotent by definition. PATCH applies a **partial modification**; it is not idempotent by contract (even if in practice it often is). Bonus: PUT can create the resource at a URL the client knows.

**"Why isn't POST idempotent, and what are the consequences?"** — Replaying a POST re-creates a resource or re-triggers the action (double order, double payment). Consequences: clients/proxies don't auto-retry it, the browser asks "resubmit the form?", and serious APIs offer an **idempotency key** (`Idempotency-Key`, like Stripe) to make retries safe.

**"What does HTTP/2 change compared to HTTP/1.1?"** — Binary protocol, **multiplexing** of streams over a single TCP connection (no more 6 connections per domain and HTTP HOL blocking), header compression (HPACK), prioritization. Remaining limit: one lost TCP packet stalls all streams — which HTTP/3/QUIC solves.

**"How does a server keep a session on a stateless protocol?"** — A session cookie (opaque ID → state stored server-side) or a self-contained token like a JWT (signed state on the client, sent in `Authorization: Bearer`). Compare: cookie = sent automatically (watch out for CSRF), token = attached manually (watch out for XSS-able storage).

## Pitfalls & misconceptions

> ⚠️ **Classic trap** — returning `200 OK` with `{"error": "not found"}` in the body. Caches, monitoring, retries and generated clients rely on the **status code**, not the body: a real 404/422 is not a cosmetic detail.

- **"401 = no permission"** — no, that's 403. The `Unauthorized` name of 401 is a historical accident: read it as "Unauthenticated".
- **"HTTPS hides everything"** — content and path are encrypted, but the **destination IP** stays visible, and the domain name leaks through the TLS handshake's SNI (unless ECH, still barely deployed). HTTPS ≠ anonymity.
- **GET with a body**: technically tolerated, but proxies and caches ignore or reject it. A complex search → POST (or the recent QUERY method, still a draft).
- **A 301 is cached aggressively** by the browser: a wrong permanent redirect can "stick" for a very long time. Test with 302/307, promote to 301 afterwards.
- **CORS is not server security**: it's the *browser* that blocks cross-origin reads. `curl` or a backend ignore CORS entirely — never use it as access control.

## Going further

- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP): the readable reference (methods, headers, codes)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110): the current spec, surprisingly clear on idempotence
- [web.dev — HTTP/2 then HTTP/3](https://web.dev/articles/performance-http2) to visualize multiplexing
- Play with `curl -v`, [httpbin.org](https://httpbin.org) to craft any response, and the DevTools Network tab (Protocol column: h2, h3)
