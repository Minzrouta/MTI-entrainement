---
title: "TCP, UDP & the developer's network"
date: "2026-09-15"
category: "DevOps"
level: "Intermédiaire"
summary: "Three-way handshake, ports, NAT, latency: the networking foundation a recruiter expects from a backend dev — and the tools to diagnose \"why is it slow\" in interviews and in production."
---

## The essentials

Everything a developer sends over the network goes through a stack of layers. The 7-layer OSI model is academic; in practice, four are enough:

| Layer | Role | Examples |
|---|---|---|
| Application | The meaning of the data | HTTP, DNS, gRPC, WebSocket |
| Transport | Process to process (ports) | **TCP, UDP, QUIC** |
| Network (IP) | Machine to machine, routing | IPv4, IPv6, ICMP |
| Link | The local physical medium | Ethernet, Wi-Fi |

Each layer encapsulates the one above: your HTTP request rides in a TCP segment, in an IP packet, in an Ethernet frame. IP guarantees **nothing**: packets can be lost, arrive out of order or duplicated. The whole transport question is: what do we do about that reality?

- **TCP** answers: I hide all of it. Connection established, bytes delivered **in order, without loss, without duplicates** — at the price of latency and machinery.
- **UDP** answers: nothing. I just add ports on top of IP. A datagram leaves, it arrives or it doesn't — the application deals with it. That's a choice, not negligence.

## How it works

TCP is **connection-oriented**: before a single useful byte, client and server synchronize through the **three-way handshake**:

```text
Client                          Server
  │──────── SYN (seq=x) ─────────▶│  "I want to talk,
  │                               │   numbering from x"
  │◀──── SYN-ACK (seq=y, ack=x+1)─│  "ok, me from y"
  │──────── ACK (ack=y+1) ───────▶│  "got it, let's go"
  │                               │
  │═══════ HTTP data… ═══════════▶│  = 1 RTT before the
  │                               │    first useful byte
```

This handshake costs **one round trip (RTT)** before any data — and TLS adds more on top. That's why latency, not bandwidth, dominates the response time of small requests.

Once connected, TCP provides:

- **Order and reliability**: every byte is numbered (sequence numbers), the receiver acknowledges (ACK); an unacknowledged segment is **retransmitted** after a timeout or duplicate ACKs.
- **Flow control**: the receiver advertises its receive window size — the sender never sends more than the other side can absorb.
- **Congestion control**: the sender probes the network (slow start, then congestion avoidance) and cuts its rate as soon as it detects losses. That's what keeps the Internet from collapsing — and why a TCP transfer starts "slowly".

UDP, by contrast, sends independent **datagrams**: no connection, no ordering, no retransmission, an 8-byte header. Perfect when retransmission makes no sense: **DNS** (one question, one answer — you just retry yourself), **real-time games and video calls** (a 200 ms-old position should be dropped, not retransmitted), and **QUIC**, which rebuilds reliability + encryption *on top of* UDP.

> 🎤 **In an interview** — "why does HTTP/3 move to UDP?" Because TCP has two problems nobody can fix: the handshake costs RTTs (TCP then TLS), and a single loss blocks the **entire** stream, even multiplexed requests that have nothing to do with it (head-of-line blocking). QUIC, built on UDP, merges transport + TLS 1.3 into a single handshake, manages independent streams (a loss only blocks one stream) and survives network changes (Wi-Fi → 4G). TCP itself couldn't be changed: it's frozen into kernels and middleboxes — UDP was the only way out.

## Key concepts to master

- **Ports and sockets**: the IP address identifies the machine, the **port** (0-65535) identifies the process. A TCP connection is identified by the 4-tuple `(src IP, src port, dst IP, dst port)` — which is why one server on port 443 serves thousands of simultaneous clients. In code: `listen()` creates the listening socket, each `accept()` returns a socket dedicated to one client.
- **NAT**: your machine at `192.168.x.x` is not routable on the Internet. The router **rewrites** outgoing source IP and port to its public IP and remembers the mapping to route replies back. Consequences: several machines share one public IP, and a server behind NAT is unreachable from outside without port forwarding — hence the traversal techniques (STUN/TURN) used by WebRTC.
- **Latency vs bandwidth**: bandwidth is the width of the pipe (MB/s), latency is the time of a round trip (ms). Loading 100 small resources is bound by **latency** (dozens of RTTs), not by throughput. Reflexes: reduce round trips (HTTP/2-3, batching), move data closer (CDN, cache), reuse connections (keep-alive, pools).
- **The everyday tools**: `ss -tlnp` (who listens on which ports — the security reflex), `ping` (ICMP latency), `traceroute` (the path, hop by hop), `dig` (DNS), `tcpdump` to see packets, and `curl -w` to break down an HTTP request:

```bash
# Break a request's time down, stage by stage
curl -w '
DNS:        %{time_namelookup}s   # name resolution
TCP:        %{time_connect}s      # end of three-way handshake
TLS:        %{time_appconnect}s   # end of TLS handshake
TTFB:       %{time_starttransfer}s # first byte of the response
Total:      %{time_total}s
' -o /dev/null -s https://api.example.com/health

# Reading it: TCP - DNS ≈ 1 RTT; TLS - TCP ≈ encryption cost;
# TTFB - TLS ≈ SERVER-SIDE compute time.
# If Total explodes but TTFB is fine → throughput/size problem,
# if TTFB is bad → slow server or too many RTTs.
```

> 💡 **The diagnostic reflex** — "the API is slow" means nothing until you've separated DNS / connect / TLS / server / transfer. `curl -w` does that separation in one command: it's the best possible answer to "how would you debug this?".

## In an interview

**"Explain the three-way handshake."** — SYN (the client proposes its initial sequence number), SYN-ACK (the server acknowledges and proposes its own), ACK (the client confirms). Both sides have synchronized sequence numbers: the connection is established, at the cost of one RTT. Bonus: mention that TLS adds its own handshake on top, and that QUIC merges the two.

**"TCP vs UDP, which do you pick?"** — TCP whenever exactness is required: HTTP/1-2, databases, mail, transfers. UDP when freshness beats completeness (games, voice, video), when the exchange is tiny (DNS), or when you rebuild your own transport on top (QUIC). The hidden question: "do you know that reliability has a cost?"

| | TCP | UDP |
|---|---|---|
| Connection | Yes (handshake, 1 RTT) | No |
| Order / reliability | Guaranteed (seq + ACK + retransmit) | None |
| Congestion control | Yes | No (up to the application) |
| Header | 20+ bytes | 8 bytes |
| Uses | HTTP/1-2, DB, SSH, mail | DNS, games, VoIP, QUIC/HTTP-3 |

**"What happens when a packet is lost?"** — In TCP: the receiver acknowledges the last contiguous byte received; the sender retransmits on timeout or triple duplicate ACK, and congestion control cuts the rate. In UDP: nothing — the datagram is gone, period; the application decides whether it deserves a resend.

**"Can a machine behind NAT receive an incoming connection?"** — Not spontaneously: NAT only routes replies to outgoing flows it has memorized. You need configured port forwarding, or traversal techniques (STUN to discover your public address, TURN as a relay) — exactly what WebRTC does.

**"Why doesn't more bandwidth speed up my API?"** — Because a small request's time is dominated by round trips: DNS + TCP handshake + TLS + request ≈ 3-4 RTTs before the first byte. At 80 ms RTT, that's an incompressible 300 ms whatever the throughput. Solutions: keep-alive, HTTP/2-3, CDN, closer regions.

## Pitfalls & misconceptions

> ⚠️ **"UDP is unreliable, therefore unusable"** — wrong: "unreliable" means the transport layer doesn't retransmit, not that packets get lost en masse. On a decent network, nearly everything arrives. QUIC — hence HTTP/3, hence a huge share of the web — runs on UDP with reliability rebuilt on top.

- **"TCP guarantees delivery"** — TCP guarantees *order and integrity of what arrives*, and retransmits as long as the connection lives. If the cable is cut, nothing is delivered: the application must handle timeouts and reconnections.
- **Confusing latency and bandwidth**: "we have fiber, why is it slow?" — because 40 sequential requests × 50 ms RTT = 2 s, fiber or not.
- **A failing `ping` ≠ service down**: ping tests ICMP, not your TCP port. Many hosts filter ICMP. Test the actual service: `curl` or `nc -zv host 443`.
- **Forgetting that ports < 1024 require privileges** on Linux — hence apps listening on 3000/8080 behind a reverse proxy that holds 80/443.
- **`ss -tlnp` before any "connection refused" debugging**: if nothing listens on the port, there's no point looking further into the network.

## Going further

- [High Performance Browser Networking](https://hpbn.co/) (Ilya Grigorik) — free online, THE latency/TCP/TLS book for developers
- [RFC 9293 — TCP](https://datatracker.ietf.org/doc/html/rfc9293) and [RFC 9000 — QUIC](https://datatracker.ietf.org/doc/html/rfc9000) to touch the specs
- [Cloudflare Learning — What is QUIC?](https://www.cloudflare.com/learning/network-layer/what-is-quic/) — the why of HTTP/3, very readable
- Hands-on: `traceroute` to a faraway site, `tcpdump -i any port 443 -c 20`, and `curl -w` against your own APIs
