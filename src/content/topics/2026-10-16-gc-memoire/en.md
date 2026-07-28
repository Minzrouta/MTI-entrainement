---
title: "Garbage collection & memory management"
date: "2026-10-16"
category: "CS"
level: "Avancé"
summary: "Stack vs heap, refcounting, mark & sweep, generational GC and memory leaks despite the GC: enough to answer \"how does memory work in your language?\" without flinching."
---

## The essentials

A program stores its memory in two places. The **stack**: local variables and call frames, allocated/freed automatically on function entry and exit — fast, orderly, but small and tied to the function's lifetime. The **heap**: everything that must outlive the function that created it (objects, arrays, closures) — flexible, but it must eventually be **freed**, or memory leaks.

The whole problem fits in one question: **when can a heap object be freed?** Answer: when nobody can reach it anymore. In C, the developer decides (`free`) — hence the legendary bugs: *use-after-free*, double free, leaks. The **garbage collector** automates that decision: it detects objects that have become **unreachable** and reclaims their memory. Java, JavaScript, Python, Go, C#: all rely on a GC. Rust takes a third path, with neither GC nor manual `free` (more below).

What the GC guarantees: no use-after-free, no double free. What it does **not** guarantee: the absence of leaks — an object still referenced but no longer useful will never be collected.

## How it works

```text
 STACK (per thread)        HEAP (shared)
 ┌───────────────┐   ┌──────────────────────────┐
 │ frame main()  │   │ Young gen    │  Old gen   │
 │ frame f()     │   │ ┌───┐ ┌───┐  │ ┌───────┐  │
 │   x: 42       │   │ │obj│ │obj│  │ │  obj  │  │
 │   p: ● ───────┼──▶│ └───┘ └───┘  │ └───────┘  │
 └───────────────┘   │ minor GC     │ major GC   │
  freed on return    │ frequent     │ rare, $$   │
                     └──────────────────────────┘
```

Two big algorithm families:

- **Reference counting**: each object carries a reference counter; at zero, it is freed immediately. Simple, predictable release… but two objects referencing each other keep a counter ≥ 1 forever: **cycles** are never freed. CPython uses it, complemented by a cycle detector; Swift (ARC) requires `weak` references to break cycles.
- **Tracing (mark & sweep)**: start from the **roots** (stack, global variables, registers), **mark** everything reachable by following references, then **sweep** everything unmarked. Unreachable cycles are collected naturally: a cycle nobody points to never gets marked.

| | Reference counting | Tracing (mark & sweep) |
|---|---|---|
| Release | Immediate (counter hits 0) | Deferred (when the GC runs) |
| Cycles | Not collected (needs an extra mechanism) | Collected naturally |
| Cost | Spread out (incr/decr on every assignment) | Concentrated (collection pauses) |
| Predictability | Good | Variable pauses |
| Examples | CPython, Swift (ARC) | JVM, V8, Go, .NET |

The key refinement: the **generational GC**, based on the **generational hypothesis** — most objects die young (temporaries, objects scoped to one HTTP request). So the heap is split into a **young generation**, collected often and very fast (**minor GC**: only the few survivors are traversed), and an **old generation** for objects that survive several collections, traversed rarely (**major/full GC**, more expensive). V8 (Scavenger + Mark-Compact) and the JVM (G1, ZGC) work this way.

The price: **stop-the-world** pauses — to mark a consistent object graph, the GC must suspend the program. Modern GCs make most of the work concurrent or incremental (ZGC targets sub-millisecond pauses even on huge heaps), but "GC" always implies a throughput / latency / memory trade-off.

**Rust, the alternative**: *ownership* has the compiler verify that every value has a single owner and that its memory is freed exactly when the owner goes out of scope. Zero GC, zero pauses, guaranteed memory safety — at the cost of a steeper learning curve (the borrow checker).

## Key concepts to master

- **GC roots**: stack, globals, registers — the starting point of marking. "Unreachable" means: no path from any root.
- **Memory leaks DESPITE the GC**: the GC collects the unreachable, not the useless. The four usual suspects: **listeners never removed** (the DOM or emitter keeps a reference to your callback, which captures its whole scope), **unbounded caches** (a `Map` that grows forever — think `WeakMap` or LRU eviction), **closures** capturing large objects, **globals** that accumulate.

The most classic JavaScript leak, and its fix:

```js
// ❌ LEAK: every widget creation adds one more listener.
// The document references the callback → the callback
// captures `bigData` → nothing is ever collected, even
// after the widget is "destroyed".
class Widget {
  constructor() {
    this.bigData = new Array(1e6).fill("…");
    document.addEventListener("click", () => this.render());
  }
}

// ✅ CORRECT: keep a reference to the handler and remove it
// when the widget dies. No more path from a root
// → widget and bigData become collectable.
class Widget {
  constructor() {
    this.bigData = new Array(1e6).fill("…");
    this.onClick = () => this.render();
    document.addEventListener("click", this.onClick);
  }
  destroy() {
    document.removeEventListener("click", this.onClick);
  }
}
```

- **Profiling a leak**: symptom = memory climbing in a staircase pattern, never coming back down after GC. Method: DevTools → Memory tab → **heap snapshot** before/after the suspect scenario, compare, sort by *retained size*, then walk the **retainers** chain (who references what) up to the guilty root. On Node: `--inspect` + Chrome DevTools, or `process.memoryUsage()` for the trend.

> 💡 **Retained vs shallow size** — *shallow size* is the object's own size; *retained size* is everything that would be freed if that object disappeared. Retained size is what points to the real culprits: a tiny listener can retain 200 MB.

## In an interview

**"Stack vs heap?"** — Stack: call frames and locals, automatic allocation/release by just moving a pointer, very fast, lifetime tied to the function. Heap: objects with arbitrary lifetimes, managed by an allocator + GC (or manually in C). Bonus: each thread has its own stack, the heap is shared — hence concurrency problems live on the heap.

**"How does a mark & sweep GC work?"** — From the roots (stack, globals), recursively mark every reachable object; whatever isn't marked gets swept. Add: compaction (moving survivors to defragment) and the fact that unreachable cycles are collected — unlike with refcounting.

**"Why a generational GC?"** — Generational hypothesis: most objects die young. Collecting a small young gen often (minor GC, fast because only the few survivors are copied) and the old gen rarely (major GC) yields short pauses most of the time. That's the design of V8 and the JVM.

**"Does a GC prevent memory leaks?"** — No (see callout below) — it's the favorite trap question; answering "yes" is disqualifying at this level.

**"How does Rust manage without a GC?"** — Ownership: every value has a single owner, the release is inserted at compile time when the owner goes out of scope; the borrow checker statically verifies that no reference outlives the value. Memory safety with no runtime.

## Pitfalls & misconceptions

> 🎤 **In an interview** — "Does a GC prevent memory leaks?" No. The GC only frees what is *unreachable*; a forgotten reference (listener, cache, global) keeps the object reachable and thus uncollectable, even if nobody uses it anymore. A leak in a managed language = a references problem, not an allocation problem. Cite the listener/cache/closure trio + the heap snapshot as the diagnostic method: complete answer.

- **"Refcounting is enough"** — cycles (two objects pointing at each other, doubly linked lists, parent ↔ child) never drop to zero. You need a cycle detector (CPython) or weak references (Swift).
- **"GC pauses are a thing of the past"** — mitigated, not gone: ZGC or V8's incremental GC massively reduce pauses, but the collection work is always paid somewhere (CPU, throughput, extra memory).
- **`delete` in JavaScript does not free memory** — it removes a property from an object. You never explicitly "free" in JS: you drop references (= null, out of scope) and the GC does the rest.
- **Forcing the GC** (`System.gc()`, `global.gc()`) — useless at best, counterproductive at worst: the runtime schedules better than you. If you need it, your design is what's leaking.

## Going further

- [V8 — Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk): V8's GC explained by its authors
- [MDN — JavaScript memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management): refcounting vs mark & sweep, approachable
- [Chrome DevTools — Record heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots): the how-to for leak diagnosis
- [The Rust Book — Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html): the GC-free alternative, the founding chapter
- Exercise: open DevTools on a SPA, take two heap snapshots around a repeated navigation, and look for detached DOM nodes — the most common front-end leak
