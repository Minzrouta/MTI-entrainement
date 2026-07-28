---
title: "SSR, CSR, SSG & hydration"
date: "2026-09-16"
category: "Web"
level: "Intermédiaire"
summary: "Where is the HTML produced, when, and at what cost? The web rendering question comes up in every frontend interview — being able to justify CSR vs SSR vs SSG vs ISR per product makes the difference."
---

## The essentials

The whole web rendering question fits in one sentence: **where and when is the HTML produced?** Four possible answers, four strategies:

| | CSR | SSR | SSG | ISR |
|---|---|---|---|---|
| HTML produced | Browser (JS) | Server, per request | Build, once | Build + regeneration |
| TTFB | Fast (empty shell) | Slower (compute) | Excellent (static) | Excellent (static) |
| Initial content | Empty then fetch | Complete | Complete | Complete |
| SEO | Fragile | Good | Good | Good |
| Data freshness | Real time | Per request | Frozen at build | Periodic |
| Server cost | Near zero (CDN) | One render/request | Near zero (CDN) | Low |
| Typical example | Dashboard, SaaS | E-commerce, feed | Docs, blog, portfolio | Catalog, news |

- **CSR (Client-Side Rendering)**: the server sends a near-empty page + a JS bundle; the browser downloads, executes, fetches the data, and builds the DOM. That's the SPA model (React with Vite, for instance).
- **SSR (Server-Side Rendering)**: the server executes the components **on every request** and returns complete HTML. The user sees content immediately… but it's not interactive yet (see hydration).
- **SSG (Static Site Generation)**: the HTML is generated **at build time**, once and for all, then served as-is from a CDN. Unbeatable in performance and cost — as long as the content doesn't change on every request.
- **ISR (Incremental Static Regeneration)**: SSG whose pages **regenerate in the background** after a delay expires (`revalidate`). The best of static, with freshness on top.

## How it works

The point candidates miss most: **server-rendered HTML is not interactive**. Event handlers (`onClick`…) only exist in the JS. Hence **hydration**: the browser downloads the bundle, re-executes the components, matches the result against the existing DOM, and attaches the events. Between first paint and the end of hydration, the page is **visible but deaf** — clicking does nothing.

```text
SSR + hydration, timeline:

t0 ── request ──▶ server renders the HTML
t1 ◀── full HTML ──── FCP: the user SEES the page
t2 ◀── JS bundle ──── download + parsing
t3 ─── hydration ──── React re-executes and attaches
t4 ─── TTI ────────── the page RESPONDS to clicks

     t1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ t4
        "uncanny valley": visible
        but not interactive
```

In CSR, the timeline is inverted: nothing to see before t3, but as soon as it shows, it's interactive. SSR optimizes *First Contentful Paint*, not *Time To Interactive*.

Two evolutions attack this hydration cost:

- **Islands architecture** (Astro): the page is static HTML by default, and only a few **islands** explicitly marked interactive (`client:load`, `client:visible`) receive JS. The site you're reading this card on works exactly like that: the content is static, the quiz is an island. Zero JS for the text, one small bundle for the interactive part.
- **Streaming SSR & Server Components** (overview): rather than waiting for the whole page to be ready, the server **streams** HTML in chunks (`<Suspense>`), and React Server Components never hydrate — their code never leaves the server, only the result travels. Less JS shipped, selective hydration.

> 🎤 **In an interview** — "why is your personal site SSG?" The best answer ties strategy to product: "the content changes when I decide (at deploy time), not on every visit. So I pay for rendering once at build, and serve pure HTML from a CDN: minimal TTFB, perfect SEO, free hosting, nothing to secure server-side. SSR would mean paying on every request to recompute an identical result." You've just shown you pick architectures by their trade-offs, not by hype.

## Key concepts to master

- **Choose by product, not by fashion**: identical content for everyone, rarely modified → SSG. Per-user or per-request content + SEO → SSR. App behind a login, no SEO stakes → CSR is plenty. Large catalog updated periodically → ISR.
- **SEO and crawlers**: Google executes JS, but with delay and a crawl budget; link previews (Slack, social networks) never execute it. Content that must be indexed or shared must be **in the initial HTML**.
- **Hydration mismatch**: if the client render doesn't match the server HTML (`new Date()`, `Math.random()`, `window.innerWidth`…), the framework warns and re-renders — visual flash and degraded perf. Rule: the first render must be deterministic; client-only values arrive in a `useEffect`.
- **The per-route mix**: modern frameworks (Next.js, Nuxt, SvelteKit) pick the strategy **page by page** — landing in SSG, product page in ISR, cart in SSR or CSR. "Which rendering for this site?" is a per-route question, not a global one.

The canonical parameterized-SSG example, `getStaticPaths`:

```jsx
// pages/blog/[slug].jsx — Next.js (Pages Router)

// At BUILD time: which pages should be generated?
export async function getStaticPaths() {
  const posts = await cms.getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: "blocking", // unknown slug → rendered on the fly then cached
  };
}

// At BUILD time, for each slug: the page's data
export async function getStaticProps({ params }) {
  const post = await cms.getPost(params.slug);
  if (!post) return { notFound: true };
  return {
    props: { post },
    revalidate: 3600, // ISR: regenerated in the background at most hourly
  };
}

// This component runs at build time (and during client-side hydration)
export default function BlogPost({ post }) {
  return <article dangerouslySetInnerHTML={{ __html: post.html }} />;
}
```

> 💡 **The line that changes everything** — without `revalidate`, this page is pure SSG: frozen until the next build. With it, it's ISR: the first visitor after expiry still gets the old version while the new one generates behind the scenes (stale-while-revalidate). Being able to explain that line proves you've understood the static ↔ dynamic spectrum.

## In an interview

**"Explain the difference between CSR, SSR and SSG."** — The question is: where and when the HTML is produced. CSR: in the browser, at runtime — empty shell then JS. SSR: on the server, per request — immediate complete HTML, hydrated afterwards. SSG: at build time, once — static HTML served by CDN. Close with the decision criterion: data freshness and personalization versus cost and TTFB.

**"What is hydration and why is it necessary?"** — SSR HTML is inert: no event listeners. Hydration re-executes the components client-side and reattaches state and events to the existing DOM. Necessary because interactivity lives in JS; costly because you pay for rendering twice — hence the FCP/TTI gap and the alternatives (islands, Server Components).

**"Why does a CSR SPA have poor SEO?"** — The initial HTML is empty; content only appears after JS executes. Google eventually runs it (with delay and budget), but social link previews never do. If indexing matters, the content must be in the HTML: SSR, SSG or pre-rendering.

**"What is ISR and which problem does it solve?"** — SSG doesn't scale with rebuilds: 50,000 products = 50,000 pages to regenerate to fix one price. ISR regenerates each page individually, in the background, after a delay (`revalidate`) or on demand (CMS webhook). You keep static TTFB with controlled freshness.

**"When would you pick pure CSR?"** — An app behind authentication (dashboard, back-office, SaaS): no SEO, recurring users (cached bundle), rich interactivity. SSR would add server complexity for a first paint nobody indexes.

## Pitfalls & misconceptions

> ⚠️ **"SSR = better performance"** — no: SSR improves FCP and SEO, but worsens TTFB (compute per request) and doesn't speed up interactivity (hydration still has to be paid). A heavy SSR page can be *visible* fast and *usable* late — the worst experience: the user clicks into the void.

- **"SEO requires SSR"** — SSG gives equally good SEO (the HTML is complete) for far cheaper. SSR is only mandatory when content changes on every request.
- **Hydration mismatch**: rendering `new Date().toLocaleString()` or `window`-dependent content on first render → warning, re-render, flash. Client-only = `useEffect` (or `client:only` in Astro).
- **"Static = no dynamic data"** — wrong: an SSG page can fetch client-side after load (comments, stock, likes). Static shell + dynamic islands is a major pattern.
- **Putting everything in an island** in Astro "just in case" — you're rebuilding a SPA in spare parts. An island is justified by an actual interaction, otherwise static HTML.
- Forgetting that **these strategies mix per route**: answering "SSR or SSG?" for a whole site is already a framing error — the right answer starts with "which page?".

## Going further

- [Rendering on the Web](https://web.dev/articles/rendering-on-the-web) (web.dev) — the reference map of rendering strategies
- [Islands Architecture](https://docs.astro.build/en/concepts/islands/) — the concept explained by the Astro docs (and [the original pattern](https://jasonformat.com/islands-architecture/) by Jason Miller)
- [Next.js — Rendering](https://nextjs.org/docs/app/building-your-application/rendering): Server Components, streaming, static vs dynamic
- Experiment: `curl -s https://your-site | head -50` — if the content is in the response, it's SSR/SSG; if it's an empty `<div id="root"></div>`, it's CSR. Run this on your own projects before the interview.
