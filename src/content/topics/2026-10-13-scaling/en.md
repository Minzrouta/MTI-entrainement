---
title: "Scaling an app: reverse proxy, load balancing & high availability"
date: "2026-10-13"
category: "Architecture"
level: "Avancé"
summary: "Vertical vs horizontal, stateless, nginx, health checks, failover: how an app absorbs load and survives failures — the architecture topic that sets candidates apart in interviews."
---

## The essentials

Scaling answers two distinct questions people often conflate: **absorbing more traffic** (performance) and **surviving failures** (high availability). Both are solved with the same building blocks: a reverse proxy in front, several instances behind, and a methodical hunt for single points of failure.

Two scaling strategies:

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Principle | A bigger machine (CPU, RAM) | More identical machines |
| Effort | Zero code changes | Stateless required + load balancer |
| Limit | Hardware ceiling, exponential price | Nearly unlimited |
| Availability | SPOF unchanged: one machine | An instance failure is absorbed |
| Deployment | Often a restart | Zero-downtime rolling deploy |

Vertical first: it's the simplest solution and often enough. Horizontal when you need availability (several instances = fault tolerance) or when you approach a single machine's ceiling.

> 💡 **The honesty that scores points** — a decent VPS (8 vCPU, 16 GB) handles thousands of requests/second on a well-written app: Stack Overflow long served the planet from a handful of servers. In an interview, saying "I start with a monolith on one machine, I measure, and I scale when the numbers demand it" beats drawing Kubernetes on the whiteboard for 200 users.

## How it works

The **absolute prerequisite of horizontal scaling: statelessness**. If instance A stores the user's session in memory, the next request routed to B logs them out. All shared state must leave the process: sessions in Redis (or a client-side signed JWT), uploads in object storage (S3), truth in the database. Simple test: any instance must be able to die at any moment without a single user noticing.

The target architecture:

```text
            ┌─────────────┐
Internet ──▶│  LB / nginx │  TLS, gzip, health checks
            └──────┬──────┘
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌──────┐   ┌──────┐   ┌──────┐
    │ app1 │   │ app2 │   │ app3 │   (stateless)
    └───┬──┘   └───┬──┘   └───┬──┘
        └──────────┼──────────┘
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌───────────┐      ┌────────────┐
   │   Redis   │      │ PG primary │──▶ replica
   │ (sessions)│      └────────────┘
   └───────────┘
```

**The reverse proxy** (nginx, Traefik, Caddy, HAProxy) is the single front door, and it does far more than forward:

- **TLS termination**: HTTPS stops at the proxy, instances speak plain HTTP internally — one single place to manage certificates (Let's Encrypt).
- **Compression** (gzip/brotli), static caching, headers (`X-Forwarded-For` to preserve the client's real IP).
- **Routing**: `api.example.com` → backend, `/static` → files. That's exactly Traefik's role in Coolify: one proxy, N apps behind it.

**The load balancer** is a reverse proxy distributing to N instances. Algorithms to know: **round-robin** (each in turn, the default), **least-connections** (towards the least loaded instance — better when request durations vary), IP hash (same client → same instance). And above all, **health checks**: the LB probes each instance and removes from the pool those that stop responding. That's what turns "an instance died" into "nobody noticed".

```nginx
upstream app {
    least_conn;                       # towards the least loaded instance
    server 10.0.0.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:3000 max_fails=3 fail_timeout=30s;
    # 3 consecutive failures → instance leaves the pool for 30 s
}

server {
    listen 443 ssl http2;
    server_name app.example.com;
    ssl_certificate     /etc/letsencrypt/live/app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app/privkey.pem;
    gzip on;                          # compression at the proxy, not in the app

    location / {
        proxy_pass http://app;        # → the upstream defined above
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  # the app knows it's HTTPS
    }
}
```

**Sticky sessions**: the LB pins a client to a given instance (via cookie). It's a crutch for stateful apps, best avoided: load spreads unevenly, and one instance dying disconnects all its clients at once. The real solution is making the app stateless — sticky sessions only buy time on legacy code.

## Key concepts to master

- **SPOF (single point of failure)**: any unique component whose failure takes the system down. Hunt them tier by tier: 1 instance → N instances; 1 DB → primary + replica; 1 LB → 2 LBs with a floating IP (keepalived/VRRP) or DNS failover. High availability is verified component by component, never globally.
- **Database replication**: the primary takes the writes and streams its changes to **replicas** serving the reads (the majority of traffic). Beware of **replication lag**: a read on a replica right after a write can return the old state.
- **Failover**: promoting a replica to primary when the primary dies. Automated (Patroni for PostgreSQL) or manual — always trickier than it looks: if the old primary comes back not knowing it was replaced, you get a **split-brain** (two servers accepting writes).
- **CDN**: static assets (images, JS, CSS) served from points of presence close to users (Cloudflare, CloudFront). Offloads the majority of requests from the origin and crushes worldwide latency. First scaling reflex for a static-heavy site.
- **Serverless** (in passing): the extreme of horizontal scaling — the platform (Lambda, Cloud Run) instantiates the function on demand, from zero to thousands. Trade-offs: cold starts, high cost under sustained load, lock-in. Excellent for spiky workloads, not an end in itself.
- **Measure before scaling**: the real bottleneck is rarely where you think — often an unindexed SQL query long before the CPU. Load testing (k6, wrk), metrics (APM), then scale what saturates. Doubling instances doesn't fix an N+1 query.

> 🎤 **In an interview** — "Your app goes down in production, where do you start?" Structured answer: 1) confirm and communicate; 2) read the stack top to bottom — the LB (5xx rate? how many instances left in the pool?), the instances (CPU, RAM, OOM kill?), the database (saturated connections? slow query?); 3) mitigate first (roll back the last deploy, restart, scale up), understand later (post-mortem). The reflex "the last deployed change is suspect number one" shows real experience.

## In an interview

**"Vertical or horizontal: how do you choose?"** — Vertical first: zero complexity, you grow the machine, and it lasts a very long time. Horizontal when you want high availability (N instances = fault tolerance) or you approach a single machine's ceiling. The key point to land: horizontal requires statelessness — it's work on the app before it's infrastructure work.

**"Why is statelessness essential for horizontal scaling?"** — Because the LB routes each request to any instance: state kept in local memory (session, cache, uploaded file) becomes invisible to the others. Externalize everything: sessions in Redis or JWT, files in object storage, truth in the database. The test: "can I kill any instance at any moment with zero user impact?"

**"Are a reverse proxy and a load balancer the same thing?"** — A load balancer is a reverse proxy with several backends. The reverse proxy is the front door: TLS termination, compression, routing, caching. It becomes a load balancer the moment it distributes over a pool with an algorithm and health checks. nginx, Traefik and HAProxy play both roles.

**"Round-robin or least-connections?"** — Round-robin distributes evenly in request count: perfect if requests are similar. Least-connections targets the least busy instance: better when durations vary (a big export doesn't block the queue behind it). In both cases, health checks are non-negotiable: distributing to a dead instance means distributing errors.

**"How do you make a database highly available?"** — Primary → replica replication: reads spread over the replicas, and failover promotes a replica if the primary dies. To score points, mention replication lag (stale read right after a write) and the difficulty of automated failover (split-brain). The database is the hardest component to scale — hence the rule "stateless everywhere, state concentrated in the database".

## Pitfalls & misconceptions

> ⚠️ **Over-architecting, trap number one** — setting up Kubernetes, three microservices and a queue for an app with 50 users means paying today (complexity, ops, dev time) for a hypothetical problem. The healthy progression: clean monolith → beefy VPS → LB + 2-3 instances → and only then, the rest. You climb each tier when the measurements demand it, not in anticipation.

- **"The load balancer is enough for high availability"** — no: if the database is unique, the SPOF just moved down a tier. And a single LB in front of ten instances is still a SPOF. HA is verified link by link.
- **Sticky sessions as a "solution" to state**: a band-aid that breaks load distribution and turns every instance failure into mass disconnections.
- **Forgetting replication lag**: reading from a replica right after writing to the primary can return the old state. Critical reads ("read your own writes") go to the primary.
- **Scaling without measuring**: doubling instances is useless if the bottleneck is an unindexed query or a saturated connection pool. Measure, then scale what saturates.
- **Confusing scaling and performance**: optimizing a slow app (cache, indexes, queries) is almost always cheaper than multiplying machines that run slow code.

## Going further

- [nginx — Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html) — the reference, readable in fifteen minutes
- [The Twelve-Factor App](https://12factor.net/) — factors VI (processes) and VIII (concurrency) formalize statelessness
- [Traefik documentation](https://doc.traefik.io/traefik/) — the "cloud-native" reverse proxy: label-based routing, automatic Let's Encrypt
- *Designing Data-Intensive Applications* (Martin Kleppmann) — chapter 5 on replication: the bible of distributed architecture
- [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) — clear and illustrated
