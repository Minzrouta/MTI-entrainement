---
title: "Web performance & caching"
date: "2026-10-21"
category: "Web"
level: "Intermédiaire"
summary: "Core Web Vitals, images, JS budget, fonts and above all HTTP caching (Cache-Control, ETag, CDN): what makes a site fast — and the most concrete front-end interview questions."
---

## The essentials

Web performance is not about micro-optimizations: it's what the user perceives. Google measures it with the **Core Web Vitals**, three metrics that also count for SEO:

- **LCP** (Largest Contentful Paint, target < 2.5 s): the render time of the largest visible element — usually the hero image or main heading. Degraded by heavy images, a slow server, blocking resources.
- **INP** (Interaction to Next Paint, target < 200 ms): responsiveness to interactions — the successor of FID. Degraded when the main thread is busy running JavaScript.
- **CLS** (Cumulative Layout Shift, target < 0.1): visual stability — the button that shifts right as you click it. Caused by images without dimensions, fonts that reflow the layout, injected banners.

And the golden rule before anything else: **measure before optimizing**. Lighthouse for the audit, the DevTools Network/Performance tabs for the details, field data (CrUX) for what users actually experience. Optimizing without measuring is shuffling bytes at random.

The biggest optimization, by far, is also the simplest: **don't redo the work** — that is the entire job of HTTP caching.

## How it works

The path of a request, with its three cache levels:

```text
Browser                 CDN (edge)             Origin
───────                 ──────────             ──────
local cache ──miss──▶  edge cache ──miss──▶  server
(memory/disk)          (PoP close to           generates
    │ hit               the user)              response
    ▼                       │ hit                 │
response in ~0 ms           ▼                     ▼
                       fast response    response + cache
                                        headers (goes back
                                        up and gets stored)
```

Everything is driven by the **cache headers** the origin returns:

| Directive | Effect |
|---|---|
| `max-age=3600` | Fresh for 1 h: the browser asks for nothing |
| `no-cache` | Store, but **revalidate** every time (ETag/304) |
| `no-store` | Never store (sensitive data) |
| `public` / `private` | Cacheable by intermediaries (CDN) / browser only |
| `immutable` | Never revalidate during max-age (hashed files) |
| `s-maxage=600` | max-age specific to shared caches (CDN) |
| `stale-while-revalidate=60` | Serve stale immediately, refresh in the background |

**Revalidation**: when a resource is stale (or under `no-cache`), the browser sends the previously received **ETag** (`If-None-Match: "abc123"`). If the content hasn't changed, the server answers **304 Not Modified** — no body, just "keep your copy". You pay a round trip, not a transfer.

**The two-speed strategy**, the one every modern site uses:

```http
# HTML: always revalidated — it's what points to everything else
GET /index.html
Cache-Control: no-cache
ETag: "v42"
# → 304 if unchanged: one light round trip, never stale HTML

# Built assets: content hash IN the file name
GET /assets/app.9f3ab2.js
Cache-Control: public, max-age=31536000, immutable
# → 1 year of cache, zero requests. A new deploy changes
#   the hash → new URL → the fresh HTML points to it.
#   "Invalidation" no longer exists: you change the URL.
```

> 💡 **The two-speed strategy** — HTML on `no-cache` + hashed assets on `immutable` is the model answer to "how do you handle caching for a SPA?". The lightweight HTML revalidates on every visit (304), and since it alone references the assets, those can be cached for a year with zero risk of serving stale content. The old invalidation problem vanishes: you don't invalidate, you change the URL.

The **CDN** adds the middle tier: edge servers spread around the world that serve cached responses close to the user (latency ÷ 5 to 10 on assets). `s-maxage` controls their cache duration, and explicit invalidation (purge API) remains possible — but with hashed assets you almost never need it.

## Key concepts to master

- **Images, the heavyweight** (often 50%+ of the page): modern formats (**WebP**, **AVIF**: 30-50% lighter than JPEG), `loading="lazy"` on everything below the fold (native, no JS), `srcset`/`sizes` to serve the right resolution to each screen, and **always** `width`/`height` (or `aspect-ratio`) to reserve the space — that's what kills CLS. Careful: never lazy-load the LCP image; do the opposite (`fetchpriority="high"`).
- **JS budget**: JavaScript costs twice — download, then parsing/execution on the main thread (where INP is decided). Weapons: **code splitting** (one bundle per route, dynamic import for heavy parts), **tree shaking** (dropping unimported code — hence the importance of named imports), `defer` on scripts (parallel download, execution after HTML parsing), and auditing dependencies (Bundlephobia: the 200 KB lib to format a date).
- **Fonts**: a webfont blocks text by default. `font-display: swap` shows the system font first (at the cost of a slight visual swap), `<link rel="preload">` loads the critical font early, and **self-hosting** avoids the round trip to Google Fonts (DNS + third-party connection). Limit variants (every weight = one file).
- **Measuring**: Lighthouse (lab, reproducible), the DevTools Performance tab (main-thread flame chart), the Network tab (waterfall, sizes, cache hits), and CrUX/RUM field data — the lab on your fiber-connected dev machine says nothing about your users' 4G phones.

> 🎤 **In an interview** — "The site is slow, what do you do?" Do NOT launch into a recipe list. Structured answer: 1) measure (Lighthouse + Network) to identify the bottleneck, 2) fix the dominant bottleneck — oversized LCP image? bloated JS bundle? no caching? — 3) re-measure. A candidate who starts with "I look at the waterfall" is worth ten candidates reciting "minify the CSS".

## In an interview

**"What are the Core Web Vitals?"** — LCP (perceived loading, < 2.5 s), INP (interaction responsiveness, < 200 ms), CLS (visual stability, < 0.1). Give one lever each: LCP → optimize the hero image and TTFB; INP → reduce JS on the main thread; CLS → explicit dimensions on images and embeds.

**"Explain Cache-Control: no-cache."** — Classic trap: it does NOT mean "don't cache". It means "store, but revalidate on every use" (conditional request with ETag → 304 if unchanged). "Never store" is `no-store`.

**"How does a 304 work?"** — The server sent an ETag with the resource. On revalidation, the browser sends `If-None-Match: <etag>`; if the content still matches, the server answers 304 with no body and the browser reuses its copy. Cost: a round trip, not a transfer.

**"How do you invalidate a cached asset?"** — The real answer: you don't — you put a content hash in the file name (`app.9f3ab2.js`), cached for a year with `immutable`; a deploy produces a new hash and thus a new URL, referenced by an always-revalidated HTML. CDN purging exists, but it's plan B.

**"What is a CDN for?"** — Bringing content closer to the user: edge servers cache responses (per `s-maxage`/`Cache-Control`) and cut geographic latency. Bonus: absorbing spikes, TLS terminated at the edge, and shielding the origin.

## Pitfalls & misconceptions

> ⚠️ **The cache that serves stale content** — putting `max-age=31536000` on a **non-hashed** file (`app.js`): your users will keep the old version for a year, and no deploy will reach them. Long-lived `immutable` is reserved for URLs that change when the content changes. Conversely, HTML cached for long = users pointing at assets that no longer exist (errors after every deploy).

- **"no-cache = no caching"** — no: store but revalidate. It's `no-store` that forbids storage. A very common trick question.
- **Lazy-loading the LCP image** — `loading="lazy"` on the hero image delays exactly what is being measured: degraded LCP. Lazy loading = below the fold only.
- **Optimizing without measuring** — minifying a 10 KB CSS file while a 4 MB image sinks the LCP. Waterfall first.
- **The Lighthouse score as an end in itself** — it's a lab measurement on one machine; field data (CrUX, RUM) can tell a different story. Aim for the real experience, not the green 100.

## Going further

- [web.dev — Core Web Vitals](https://web.dev/articles/vitals): definitions, thresholds and per-metric optimization guides
- [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching): the reference on Cache-Control, ETag and revalidation
- [web.dev — Learn Performance](https://web.dev/learn/performance): the full course (images, fonts, JS, critical resources)
- [Chrome DevTools — Performance](https://developer.chrome.com/docs/devtools/performance/overview): analyzing the main thread and the waterfall
- Exercise: open the Network tab on a well-known site and compare the `Cache-Control` of assets vs HTML — the two-speed strategy is everywhere
