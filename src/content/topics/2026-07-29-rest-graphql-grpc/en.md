---
title: "REST vs GraphQL vs gRPC"
date: "2026-07-29"
category: "Architecture"
level: "Fondamental"
summary: "Three ways to design an API, three families of trade-offs. Knowing how to choose — and above all justify — between REST, GraphQL and gRPC is an almost guaranteed question in backend interviews."
---

## The essentials

Three styles dominate API design. **REST** exposes **resources** manipulated through HTTP verbs — the de facto standard of the web, universal and cacheable. **GraphQL** is a typed query language: the client describes exactly the data it wants, the server resolves it through a single endpoint. **gRPC** is an RPC framework: you call remote methods defined in a protobuf contract, serialized in binary over HTTP/2.

None is "better": they are trade-offs. The interview question is never "which one is best" but "which would you choose here, and why".

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Transport | HTTP, textual JSON | HTTP, single `POST /graphql` | HTTP/2, binary protobuf |
| Contract | OpenAPI (optional) | Typed schema (mandatory) | `.proto` (mandatory, codegen) |
| Caching | Native HTTP (CDN, browser) | Hard (everything is POST) | Application's responsibility |
| Streaming | No (polling, SSE) | Subscriptions | Native, 4 modes |
| Use case | Public API | BFF, mobile, aggregation | Internal microservices |

> 💡 **The decisive row** — caching: REST gets it for free (GET + CDN + browser), GraphQL loses it (everything goes through POST on a single endpoint). For a heavily read public API, that's often the argument that ends the debate.

## How it works

**REST** (REpresentational State Transfer): resources named by URLs (`/users/42/orders`), manipulated through HTTP verbs — `GET` (read, no side effects), `POST` (create), `PUT` (replace), `PATCH` (partial update), `DELETE`. **Status codes** carry the outcome: 200 OK, 201 Created, 204 No Content, 400 bad request, 401 unauthenticated, 403 unauthorized, 404 not found, 409 Conflict, 422 validation error, 500 server error. **Stateless**: each request carries its full context (auth token included), the server keeps no session in memory — which makes horizontal scaling trivial. HATEOAS, in one sentence: the "pure" REST constraint where each response contains links to the possible next actions — rarely implemented in practice, but worth mentioning.

**GraphQL**: a **strongly typed schema** (types, queries, mutations, subscriptions) exposed on a single endpoint, usually `POST /graphql`. The client sends a query describing precisely the fields it wants, across relations too: no more **over-fetching** and no more **under-fetching** — both illustrated in the example below. Server-side, each field is produced by a **resolver**; naively, a list of N articles with their author triggers 1 + N SQL queries — the famous **N+1 problem**, solved by batching (the DataLoader pattern).

The same "profile + latest orders" screen, in both styles:

```bash
# REST: two round trips, every field of each resource
GET /users/42          # 40 fields received… to display 3
GET /users/42/orders   # second call to fill the screen
```

```graphql
# GraphQL: one round trip, exactly the fields you want
query {
  user(id: 42) {
    name
    avatarUrl
    orders(last: 5) {   # the relation traversed in the same query
      total
      status
    }
  }
}
```

**gRPC**: contract-first — you write a `.proto` file (messages + services), the **protobuf** compiler generates clients and servers in most languages. Compact binary serialization (numbered fields, no repeated key names like JSON), **HTTP/2** transport: call multiplexing over a single connection, header compression. Four call modes: unary (request/response), server streaming, client streaming, bidirectional streaming. Propagated deadlines between services and dedicated status codes complete the contract.

## Key concepts to master

- **When to choose what**: **public** API → REST (universal, curl-testable, cacheable by CDNs and browsers). **BFF** (Backend For Frontend) or a mobile client aggregating several sources → GraphQL (the client composes its data in one round trip). High-traffic **internal microservices** → gRPC (strict contracts, performance, streaming). Nuance to know: gRPC in a browser requires grpc-web and a proxy.
- **Versioning**: REST → `/v1/` in the URL or a header, with the rule of never breaking existing clients. GraphQL → no versions: the schema evolves additively and obsolete fields are marked `@deprecated`. Protobuf → each field has a number; you never reuse or renumber them, you only add — backward compatible by construction.
- **Pagination**: **offset** (`?page=3&limit=20`) is simple but unstable if the list changes between pages, and slow at depth; **cursor-based** (an opaque cursor pointing after the last seen item) is stable and fast — the default of modern APIs. In GraphQL, formalized by the Relay Connections spec (edges/nodes/pageInfo).
- **Idempotence**: an operation is idempotent if replaying it produces the same final state. GET, PUT, DELETE are; POST is not. Crucial as soon as network retries exist: for a payment, an **idempotency key** (a unique header sent by the client, deduplicated server-side) prevents double charging — the classic trick question.
- **Fine-grained HTTP codes**: distinguish 401 ("who are you?") from 403 ("I know who you are, you're not allowed"), 400 from 422, and know why returning 200 with `{"error": ...}` in the body is an anti-pattern.

## In an interview

> 🎤 **In an interview** — to "which would you choose?", the right answer starts with "it depends", followed by concrete criteria: who consumes (public, mobile, internal), caching needs, streaming needs. REST by default, GraphQL or gRPC when a specific need justifies it — in that order.

**"What is REST, exactly?"** — An architectural style (Roy Fielding's dissertation, 2000): resources identified by URLs, the uniform HTTP interface (verbs + status codes), stateless, cacheable responses. Bonus points: note that most real-world "REST APIs" are JSON-over-HTTP without HATEOAS — and that this is a perfectly deliberate compromise.

**"PUT vs PATCH vs POST?"** — POST creates a resource (not idempotent: two POSTs = two resources). PUT fully replaces the resource at the given URL (idempotent: replaying it changes nothing more). PATCH applies a partial update (not guaranteed idempotent). Practical consequence: replaying a PUT on timeout is safe, replaying a POST is not without an idempotency key.

**"What problem does GraphQL solve, and which does it create?"** — It solves over-fetching and under-fetching: the client composes exactly its data in one round trip, precious on mobile. It creates: N+1 in resolvers (→ DataLoader), the loss of HTTP caching (everything goes through POST on a single endpoint), the need to guard against arbitrarily deep queries (depth limit, complexity budget), and significantly higher server complexity.

**"Why is gRPC faster than REST/JSON?"** — Binary protobuf serialization, more compact and faster to parse than textual JSON; HTTP/2 multiplexing calls over a persistent connection; client/server code generated from the contract, so no ad hoc validation. Plus native streaming, where REST forces polling or SSE.

**"How do you handle retries on a payment endpoint?"** — The call is a POST, so not idempotent by nature. The client generates a unique idempotency key per operation; the server stores the result of the first execution under that key and returns the same response to retries. Stripe is the canonical example to cite.

## Pitfalls & misconceptions

> ⚠️ **The anti-pattern to ban** — returning `200 OK` with `{"error": ...}` in the body: monitoring sees nothing, automatic retries never trigger, a cache may store the error. The status code is part of the contract.

- **"REST = JSON over HTTP"** — REST is a set of constraints. `POST /getUserById` is RPC in disguise: verbs in URLs are a red flag in code review.
- **"GraphQL replaces REST"** — no: for a simple or heavily cacheable public API, GraphQL adds complexity with no benefit. It's a data composition tool, not a universal evolution of REST.
- **"gRPC everywhere, even externally"** — careful: unreadable with curl without tooling (grpcurl), indirect browser support (grpc-web + proxy), and a binary contract is slower to debug than JSON.
- **Statelessness misunderstood**: the server obviously has state (the database); it's *session* state that must not live in an instance's memory — otherwise load balancing and autoscaling break.
- **Offset pagination at depth**: `OFFSET 100000` forces the database to scan then discard 100,000 rows, and items shift if insertions happen between two pages. Cursors solve both problems.

## Going further

- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP): verbs, status codes, caching — the reference
- [graphql.org/learn](https://graphql.org/learn/): the official tutorial — schema, queries, resolvers
- [grpc.io — Introduction](https://grpc.io/docs/what-is-grpc/introduction/) and the [proto3 guide](https://protobuf.dev/programming-guides/proto3/) for message evolution rules
- [Roy Fielding's dissertation, ch. 5](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm): where REST actually comes from
