---
title: "WebSockets & real-time"
date: "2026-08-04"
category: "Web"
level: "Intermédiaire"
summary: "Polling, SSE, WebSocket: picking the right real-time technique and knowing how to scale it across instances — the topic that separates candidates on chat and notification questions."
---

## The essentials

HTTP is a **request/response** protocol: the client asks, the server answers, the transaction is over. The server cannot take the initiative to send a message — a problem as soon as you want real-time: chat, notifications, stock tickers, collaborative cursors.

**WebSocket** addresses that limit: a persistent, **full-duplex** TCP connection (both sides send whenever they want), established through an HTTP handshake and then freed from the request/response model. One connection, a few bytes of overhead per message, minimal latency.

But the reflex "real-time = WebSocket" is a classic interview mistake: for a **unidirectional** server → client stream (notifications, job progress), **Server-Sent Events** do the job over plain HTTP, with built-in automatic reconnection. Comparing the options honestly is worth more than reciting the RFC.

## How it works

**The handshake**: the client sends an HTTP GET request with `Connection: Upgrade`, `Upgrade: websocket` and a `Sec-WebSocket-Key` header (random nonce). The server answers `101 Switching Protocols` with `Sec-WebSocket-Accept` (SHA-1 hash of the nonce concatenated with a fixed GUID — proof it speaks WebSocket, not cryptography). From then on, the TCP connection stays open and both sides exchange **frames**.

```text
Client                             Server
  │ GET /chat HTTP/1.1               │
  │ Connection: Upgrade              │
  │ Upgrade: websocket               │
  │ Sec-WebSocket-Key: <nonce>       │
  │─────────────────────────────────▶│
  │                                  │
  │ HTTP/1.1 101 Switching Protocols │
  │ Sec-WebSocket-Accept: <hash>     │
  │◀─────────────────────────────────│
  │                                  │
  │◀════ full-duplex frames ════════▶│
  │      (text, binary, ping/pong)   │
```

**Frames**: each message is split into frames carrying an opcode (text, binary, ping, pong, close). Client → server frames are **masked** (XOR with a random key) to prevent cache-poisoning attacks on naive proxies. The **ping/pong** control frames serve as a heartbeat.

**Heartbeat & reconnection**: a TCP connection can be dead without anyone knowing — a proxy, NAT or firewall silently drops idle connections (often after 30-60 s). Hence the heartbeat: the server sends a periodic ping; no pong back = dead connection, clean it up. Client-side, reconnection uses **exponential backoff + jitter** (otherwise, when the server restarts, every client comes back at once and knocks it over — thundering herd), followed by a **state resync**: messages missed during the outage don't come back on their own.

Everything the client needs fits in a few lines of native WebSocket:

```js
function connect(attempt = 0) {
  const ws = new WebSocket("wss://api.example.com/chat");

  ws.onopen = () => {
    attempt = 0;                                      // reset the backoff
    ws.send(JSON.stringify({ type: "auth", token })); // auth as first message
  };

  ws.onmessage = (e) => render(JSON.parse(e.data));

  ws.onclose = () => {
    // exponential backoff + jitter: avoids the thundering herd
    const delay = Math.min(30_000, 1000 * 2 ** attempt)
                + Math.random() * 1000;
    setTimeout(() => connect(attempt + 1), delay);
  };
}
connect();
```

**Horizontal scaling**: THE trap question. A WebSocket is **stateful**: the connection lives on one specific instance. With 3 instances behind a load balancer, Alice is connected to instance A and Bob to instance B — if Alice sends a message to a room, instance A cannot push it to Bob directly. Two building blocks: **sticky sessions** at the load balancer (so the handshake and the connection stay on the same instance), and a **pub/sub** (typically Redis) to broadcast across instances: A publishes the message on a channel, every subscribed instance receives it and relays it to its own connected clients.

> 🎤 **In an interview** — "and across several instances?" systematically follows your nice handshake explanation. Having both building blocks ready — sticky sessions + Redis pub/sub — and knowing *why* each one is needed makes all the difference.

## Key concepts to master

Four real-time techniques, compared honestly:

| | Short polling | Long polling | SSE | WebSocket |
|---|---|---|---|---|
| Direction | client → server | server → client (simulated) | server → client | bidirectional |
| Transport | repeated HTTP | HTTP held open | HTTP streaming (`text/event-stream`) | TCP after upgrade |
| Latency | interval/2 on average | near zero | near zero | minimal |
| Reconnection | n/a | after every message | automatic (`EventSource`, `Last-Event-ID`) | manual (backoff) |
| Data | anything HTTP | anything HTTP | text only | text + binary |
| Best for | infrequent data | legacy compatibility | notifications, dashboards, LLM streams | chat, games, collaborative editing |

> 💡 **SSE is underrated** — free reconnection and resumption, standard HTTP that gets through everything, and the old HTTP/1.1 limit of 6 connections per domain is lifted by HTTP/2 multiplexing. Before reaching for a WebSocket, one question: does the client actually need to send?

- **socket.io vs native WebSocket**: socket.io is a library **on top of** the transport (WebSocket when possible, long polling as fallback) adding automatic reconnection, **rooms**, namespaces, acknowledgements and a ready-made Redis adapter for multi-instance setups. Cost: a proprietary protocol (a raw WebSocket client cannot connect to it) and a dependency on both sides. In 2026 the fallback matters less than it used to; rooms and the adapter are what justify socket.io.
- **Security**: `wss://` (TLS) mandatory — like https. The browser's WebSocket API **does not allow custom headers**: handshake auth goes through the session cookie, a token in the query string (beware of server logs) or a first authentication message. Above all: **no CORS on WebSockets** — the server must check the `Origin` header itself, otherwise any website can open a cookie-authenticated connection (cross-site WebSocket hijacking).

## In an interview

**"Why not just do polling?"** — Short polling wastes empty requests and imposes an average latency of half the interval. It remains defensible for infrequent data (every 30 s) — it's simple, stateless, cacheable. Once frequency rises or latency matters, SSE or WebSocket.

**"Describe the WebSocket handshake"** — HTTP GET with `Upgrade: websocket`, `Connection: Upgrade` and `Sec-WebSocket-Key`; response `101 Switching Protocols` with `Sec-WebSocket-Accept` derived from the key. The TCP connection is then reused for full-duplex frames. Bonus: starting as HTTP gets through proxies and shares port 443.

**"How do you scale a chat across several instances?"** — Sticky sessions at the load balancer so each connection lives on a stable instance, and Redis pub/sub between instances: the one receiving a message publishes it on a channel, the others relay it to their clients in the relevant room. Mention socket.io's Redis adapter, which implements exactly this.

**"SSE or WebSocket for notifications?"** — SSE: the flow is unidirectional, the EventSource API handles reconnection and resumption natively, and it travels over standard HTTP (no special proxy/LB configuration). A WebSocket would add complexity (heartbeat, manual reconnection) with no benefit since the client doesn't send.

**"How do you authenticate a WebSocket connection?"** — At the handshake: session cookie (but check `Origin` against an allowlist, otherwise cross-site hijacking) or a short-lived token passed in the query string or exchanged in the first message. After that, identity is attached to the connection — no need to re-authenticate every message, but you must handle token expiry on long-lived connections.

## Pitfalls & misconceptions

> ⚠️ **No CORS on WebSockets** — the browser applies no origin policy to the handshake. A server that authenticates via cookies without checking the `Origin` header lets any website open an authenticated connection: that's cross-site WebSocket hijacking. Allowlist origins server-side, always.

- **"Real-time = WebSocket"** — for pure server → client, SSE is simpler to operate and often enough. WebSocket earns its place when the client sends too.
- **Forgetting the heartbeat**: proxies and NAT silently drop idle connections; without ping/pong, the server keeps zombie connections and the client believes it's still connected.
- **Naive reconnection**: reconnecting immediately in a loop turns every server restart into a self-inflicted DDoS. Exponential backoff with jitter, plus resyncing the missed state.
- **"socket.io is WebSockets"** — it's a protocol on top: a socket.io client cannot talk to a native WebSocket server, and vice versa.
- **Ignoring backpressure**: a slow client with a fast-pushing server = a buffer ballooning in memory. Watch `bufferedAmount` on the client, close or throttle saturated connections on the server.

## Going further

- [MDN — WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455): at least the handshake section
- [socket.io — documentation](https://socket.io/docs/v4/), especially the [Redis adapter](https://socket.io/docs/v4/redis-adapter/) page
- Exercise: a mini-chat in Node (`ws` on the server, native WebSocket on the client), then run it on two instances with Redis pub/sub — the hands-on experience that makes the topic concrete in an interview
