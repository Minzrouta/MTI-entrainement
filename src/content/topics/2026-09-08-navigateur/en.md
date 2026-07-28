---
title: "The browser under the hood"
date: "2026-09-08"
category: "Web"
level: "Intermédiaire"
summary: "From HTML to pixels: parsing, render tree, reflow, compositing, multi-process and storage — everything a recruiter expects behind \"what happens when the page renders?\"."
---

## The essentials

The browser is not a black box that "displays HTML": it's a small operating system, with a rendering engine (Blink, WebKit, Gecko), a JavaScript engine (V8, JavaScriptCore, SpiderMonkey), a network stack and a **multi-process** architecture. The question "what happens between the server response and the pixels on screen?" is a front-end interview classic: it tests your understanding of rendering, performance and security all at once.

The full chain is called the **critical rendering path**: the minimal set of steps and blocking resources the browser must get through before the first render. Master it and you know *why* a page is slow — and where to act.

Three cost levels to remember right away:

| Change | Steps replayed | Cost |
|---|---|---|
| `width`, `margin`, node insertion | Layout → Paint → Composite | High (**reflow**) |
| `color`, `background`, `visibility` | Paint → Composite | Medium (**repaint**) |
| `transform`, `opacity` | Composite only | Minimal (GPU) |

## How it works

Six steps, always in the same order:

1. **HTML parsing → DOM** — the parser reads the byte stream (parsing is incremental: it starts before the download finishes) and builds the **DOM**, the live object tree representing the document. A plain `<script>` **blocks the parser**: it could call `document.write()`, so the browser must execute it before going on.
2. **CSS parsing → CSSOM** — stylesheets produce the **CSSOM**. CSS is **render-blocking** (no rendering without complete styles, otherwise a flash of unstyled content) and it also blocks *script execution*, since scripts might read computed styles.
3. **Render tree** — DOM + CSSOM merged: only the visible nodes, with their computed styles. `display: none` is excluded; `visibility: hidden` stays in (the element keeps its box).
4. **Layout (reflow)** — computing the exact geometry of every box: position and size, cascading down from the root.
5. **Paint** — rasterization: every element becomes pixels, spread across one or more **layers**.
6. **Composite** — the GPU assembles the layers in the right order. That's why `transform` and `opacity` are nearly free: they only touch this step.

```text
      HTML                       CSS
        │ parsing                  │ parsing
        ▼                          ▼
       DOM          +            CSSOM
        └────────────┬─────────────┘
                     ▼
               Render tree
                     ▼
        Layout    (geometry → reflow)
                     ▼
        Paint     (pixels → repaint)
                     ▼
        Composite (GPU, layers)
```

And what about scripts? Two attributes change everything:

- **`async`** — downloads in parallel with parsing, executes **as soon as it's ready**, possibly mid-parsing, in no guaranteed order. For independent scripts (analytics, ads).
- **`defer`** — downloads in parallel, executes **after parsing finishes**, in document order, right before `DOMContentLoaded`. The sane default for application code (and the behavior of `type="module"`).

> 🎤 **In an interview** — "what happens between the HTML response and the display?": walk through the six-step pipeline (DOM, CSSOM, render tree, layout, paint, composite), point out what blocks what (plain script → parser; CSS → rendering and scripts), and close on the critical rendering path: fewer blocking resources = earlier first render. One minute, structured, unbeatable.

## Key concepts to master

- **Reflow vs repaint** — reflow recomputes geometry and propagates (resizing a parent repositions its children, sometimes the whole tree); repaint redraws pixels without touching geometry. A reflow always triggers a repaint, never the other way around. Reflow is the most expensive operation in rendering.
- **Layout thrashing** — alternating geometry reads (`offsetWidth`, `getBoundingClientRect()`) and style writes forces a **synchronous** reflow on every read:

```js
// ❌ Layout thrashing: N forced reflows
boxes.forEach(box => {
  const w = box.offsetWidth;      // read → the browser MUST
                                  // recompute layout, invalidated
                                  // by the previous iteration's write
  box.style.width = w / 2 + 'px'; // write → invalidates layout
});

// ✅ Fixed: all the reads, THEN all the writes
const widths = boxes.map(b => b.offsetWidth); // 1 still-valid layout
boxes.forEach((box, i) => {
  box.style.width = widths[i] / 2 + 'px';     // 1 single reflow,
});                                           // deferred to next frame
```

> 💡 **Reflex to show** — batch reads then writes, and drive animations with `requestAnimationFrame` (one execution per frame, right before rendering). To prove the problem: the DevTools Performance panel flags forced reflows with a purple warning triangle.

- **Multi-process architecture** — one **browser process** (UI, orchestration, disk/network access), one **renderer process per site** (site isolation), a **GPU process**, plus network and utility processes. A crashing tab doesn't take the browser down, and two sites never share the same memory space (the answer to Spectre).
- **Sandbox** — the renderer runs untrusted code (the web): it has **no direct access** to the filesystem or the network. Every sensitive operation goes through IPC to the browser process, which checks it. An exploit in the rendering engine stays locked in the sandbox.
- **Client-side storage**:

| | Cookies | localStorage | sessionStorage |
|---|---|---|---|
| Sent to the server | With every HTTP request | Never | Never |
| Lifetime | Configurable expiry | Persistent | Tab close |
| Size | ~4 KB | ~5-10 MB | ~5 MB |
| JavaScript access | Yes, unless `HttpOnly` | Yes | Yes |
| Scope | Domain (+ path) | Origin | Origin + tab |

- **Same-origin policy**, in one sentence: two URLs share an origin if **scheme + host + port** are identical, and a document can only read data (DOM, storage, responses) from its own origin — CORS being the mechanism to relax that rule explicitly, server-side.

## In an interview

**"What's the difference between reflow and repaint?"** — Reflow recomputes geometry (positions, sizes) and can propagate through much of the tree; repaint redraws pixels without changing geometry. Reflow includes a repaint, never the other way around. Triggers: `width` or node insertion → reflow; `color` → repaint; `transform`/`opacity` → neither (composite only).

**"defer vs async?"** — Both download without blocking the parser. `async` executes as soon as the script is ready, order not guaranteed: independent scripts. `defer` executes after parsing, in document order, before `DOMContentLoaded`: code that touches the DOM. Bonus: `type="module"` is defer by default.

**"Why animate with transform rather than top/left?"** — `top`/`left` trigger layout + paint + composite on every frame; `transform` is applied by the GPU at the composite step, with no reflow or repaint. At 60 fps, that's the difference between a smooth animation and jank.

**"Where do you store an authentication token?"** — Not in `localStorage`: readable by any script on the page, so stealable through the first XSS hole. Safest: an `HttpOnly` + `Secure` + `SameSite` cookie, invisible to JavaScript. Show you see the trade-off: the cookie travels automatically with every request → think CSRF, countered by `SameSite` or a dedicated token.

**"Why does each tab get its own process?"** — Stability (a crash stays local to the tab), security (renderer sandbox + site isolation: two origins never share memory), performance (real parallelism across cores). The accepted cost: more RAM.

## Pitfalls & misconceptions

> ⚠️ **Real-world trap** — reading `offsetWidth` or `getBoundingClientRect()` inside a loop that also writes styles: every read forces a synchronous reflow and the 16 ms frame budget explodes. The code "works", it's just 50× too slow — invisible on your dev machine, glaring on a mid-range phone.

- **"display:none and visibility:hidden are the same"** — no: `display: none` removes the element from the render tree (reflow when it comes back); `visibility: hidden` keeps its box (repaint only).
- **"async is always better than defer"** — no: `async` can execute mid-parsing (blocking it at that moment) and breaks ordering between dependent scripts. `defer` is the reasonable default.
- **"The DOM is the HTML"** — HTML is the source text; the DOM is the live object tree, repaired by the parser (unclosed tags) and mutable by JavaScript. What the inspector shows is the DOM, not the source.
- **"CSS blocks HTML parsing"** — imprecise: CSS blocks **rendering** and **script** execution, not the HTML parser, which keeps building the DOM… until a plain script stops it.
- Forgetting that `sessionStorage` is **per tab**: two tabs on the same site don't share it — a classic source of "lost session" bugs when opening a link in a new tab.

## Going further

- [MDN — Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work)
- [web.dev — Critical rendering path](https://web.dev/articles/critical-rendering-path)
- [Inside look at modern web browser](https://developer.chrome.com/blog/inside-browser-part1): Chrome's multi-process architecture illustrated, in 4 parts
- [MDN — Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- Exercise: open the DevTools **Performance** panel on any site, record 5 seconds of scrolling, and find layout, paint and composite in the timeline
