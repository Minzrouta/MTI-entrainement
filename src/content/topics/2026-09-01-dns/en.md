---
title: "DNS: from URL to IP"
date: "2026-09-01"
category: "DevOps"
level: "Fondamental"
summary: "Recursive resolution, record types, TTL and the \"propagation\" myth: DNS sits at the heart of \"what happens when you type a URL?\", the cult interview question."
---

## The essentials

**DNS** (*Domain Name System*) is the Internet's directory: it translates memorable names (`www.example.com`) into IP addresses (`93.184.216.34`) that machines use to reach each other. It's a **distributed, hierarchical database**: nobody holds the full list, each level only knows whom to delegate to.

The hierarchy reads right to left: the **root** (`.`) knows the servers of the **TLDs** (`.com`, `.fr`, `.me`); the TLD knows the **authoritative servers** of each domain (`example.com`); and the authoritative server holds the domain's actual records. Between you and this hierarchy, a **recursive resolver** (your router's, your ISP's, or a public one like `1.1.1.1` / `8.8.8.8`) does the detective work and **caches** the answers.

When you type a URL, DNS resolution is the very first step — before TCP, before TLS, before HTTP. And in the vast majority of cases, it goes nowhere: the answer is already in a cache (browser, OS, resolver).

## How it works

The full walkthrough, from browser to authoritative server — each step only happens if the previous one had no cached answer:

```text
Browser → browser cache → OS cache
     │ (miss)
     ▼
Recursive resolver (ISP, 1.1.1.1…) ── cache? ── yes → IP
     │ (miss: it investigates)
     ├─▶ 1. Root "."
     │      ← "here are the .com servers"
     ├─▶ 2. .com TLD
     │      ← "here are example.com's
     │         authoritative servers"
     └─▶ 3. example.com authoritative
            ← "www = 93.184.216.34" (TTL 300)
     │
     ▼
IP returned to the browser, answer cached
everywhere for TTL seconds
```

You can replay this investigation yourself with `dig +trace`, which bypasses the caches and queries the hierarchy from the root:

```bash
dig +trace www.example.com

# .            518400  IN  NS  a.root-servers.net.
#   → step 1: the root lists the TLD servers
# com.         172800  IN  NS  a.gtld-servers.net.
#   → step 2: the .com TLD delegates to the
#     domain's authoritative servers
# example.com. 172800  IN  NS  a.iana-servers.net.
#   → step 3: the authoritative finally answers
# www.example.com. 300 IN  A   93.184.216.34
#   → the final answer: an A record,
#     with its 300-second TTL

# Day to day: dig www.example.com   (via the resolver, caches included)
#             dig @1.1.1.1 example.com MX   (query a specific resolver)
```

Every answer carries a **TTL** (*Time To Live*, in seconds): how long a cache may keep it. It's the key to DNS's most widespread myth:

> 💡 **"Propagation" does not exist** — DNS "pushes" nothing to anyone. When you change a record, caches holding the old value keep serving it **until their TTL expires**, then fetch the new one. What people call "waiting for propagation" is waiting for caches to expire — it's **expiration**, not broadcast. Hence the practice: lower the TTL (300s) *before* a migration, raise it back afterwards.

## Key concepts to master

The record types to know:

| Type | Role | Example |
|---|---|---|
| A | Name → IPv4 address | `app.bantou.me → 51.210.246.139` |
| AAAA | Name → IPv6 address | `example.com → 2606:2800:…` |
| CNAME | Alias to another name | `www → example.com` |
| MX | The domain's mail servers (with priority) | `10 mail.example.com` |
| TXT | Free text: verifications, SPF/DKIM/DMARC | `"v=spf1 include:…"` |
| NS | Delegates the zone to authoritative servers | `ns1.ovh.net` |
| `*` (wildcard) | Catches all undefined subdomains | `*.bantou.me → VPS` |

- **CNAME, the classic subtlety**: it aliases an entire name to another name (two-step resolution), and a name carrying a CNAME can carry no other record — which is why the apex (`example.com` with no subdomain) cannot be a CNAME (it already carries NS…), hence ALIAS/ANAME workarounds at some providers.
- **DNS and deployments**: the typical workflow — create the A record (or a wildcard `*.domain.tld` → server, and every new app is then just reverse-proxy config), wait for caches to expire, and only then can Let's Encrypt validation (HTTP-01) succeed, since it requires the name to resolve to your server. Wildcard DNS is exactly what enables the "one subdomain per app" pattern without touching the zone on every deployment.
- **`dig`, the daily tool**: `dig domain` (resolution via your resolver), `dig @8.8.8.8 domain` (query a specific server — handy for comparing caches), `dig domain MX` (a specific type), `dig +trace` (replay the hierarchy), `dig -x IP` (reverse resolution).
- **DoH / DoT** in one sentence: DNS-over-HTTPS and DNS-over-TLS encrypt queries between you and the resolver — historical DNS travels in cleartext on port 53, readable by any intermediary.

> ⚠️ **Real-world trap** — after a DNS change, your machine may "see" the new IP while your neighbor's doesn't (different caches, unexpired TTLs). Diagnose with `dig @1.1.1.1` vs `dig @8.8.8.8` vs your local resolver: three potentially different answers, none of them "wrong" — their caches expired at different times.

## In an interview

**"What happens when you type a URL in the browser?"** — Walk through in order: 1) DNS resolution (browser/OS caches → recursive resolver → if needed root → TLD → authoritative); 2) TCP connection to the IP (handshake); 3) TLS handshake if HTTPS; 4) HTTP request, server response; 5) parsing and rendering. Expected depth on DNS: name the hierarchy and the caches. This is THE question for assessing your big-picture understanding.

**"What's the difference between a recursive resolver and an authoritative server?"** — The recursive one is a *detective working for the client*: it walks the hierarchy and caches. The authoritative one *holds the truth* for a zone: it answers without asking anyone. `8.8.8.8` is recursive; your registrar's NS servers are authoritative for your domain.

**"A vs CNAME?"** — A: name → IP, direct. CNAME: name → another name, resolved next (one more indirection). CNAME is handy when the target changes IP (the CNAME follows automatically); impossible at the domain apex.

**"Why isn't my DNS change visible everywhere?"** — Because there is no propagation: each cache serves the old value until its TTL expires. Bonus answer: "that's why you lower the TTL before a migration" — you've just shown you've actually migrated something.

**"What are TXT records for?"** — Free-text metadata: proving domain ownership (Google verifications, Let's Encrypt DNS-01) and fighting email spoofing via SPF, DKIM, DMARC.

## Pitfalls & misconceptions

> 🎤 **In an interview** — "what happens when you type a URL?" is asked in a majority of interviews, from internship to senior. It doesn't test memorization: it tests whether you know *where to stop and where to dig*. Winning strategy: walk through the 5 major steps in one minute, then offer "I can detail whichever step you want" — and actually be able to go deep on DNS and TLS.

- **"DNS is a server"** — no: a distributed, hierarchical database. No server knows everything; each knows how to delegate. The 13 "root servers" (a through m) are themselves hundreds of anycast instances.
- **"Propagation takes 24-48h"** — no: it depends on the TTL of the records involved. A 300s TTL = visible everywhere in ~5 minutes once caches expire. The "48h" figure comes from NS server changes at the registrar, whose TTLs are long.
- **Confusing registrar and DNS host** — the registrar leases the name; the DNS host runs the zone's authoritative servers. Often the same company, never the same role.
- **Forgetting the OS and browser caches** — flushing the resolver cache isn't always enough: Chrome and the OS have their own (`chrome://net-internals/#dns`, `resolvectl flush-caches`).
- **`/etc/hosts` short-circuits everything** — read before any DNS query: perfect for testing a site before the DNS switch, and a source of mysterious "bugs" when you forget an entry in it.

## Going further

- [Cloudflare — What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/): the best introductory article series
- [How DNS works](https://howdns.works/): the comic that explains recursive resolution — memorable in ten minutes
- [RFC 1034](https://datatracker.ietf.org/doc/html/rfc1034): DNS concepts at the source (a skim is enough)
- Hands-on: `dig +trace` on your own domain, change a TTL, time the actual cache expiration with `dig @1.1.1.1` vs `dig @8.8.8.8`
