---
title: "JavaScript: event loop & async"
date: "2026-08-26"
category: "Web"
level: "Fondamental"
summary: "Call stack, microtasks, macrotasks, promises and async/await: the \"in what order does it log?\" question is THE most asked JavaScript question in front-end and back-end internship interviews alike."
---

## The essentials

JavaScript runs your code on **a single thread**: one instruction at a time, one **call stack**. Yet a Node server handles thousands of simultaneous requests and a web page stays smooth during a `fetch`. The secret is not in the language but in its runtime environment: the **event loop**.

The model: slow operations (network, timers, disk) are delegated to the environment's APIs (browser or Node/libuv), which work behind the scenes. When an operation completes, its **callback** is queued; the event loop dequeues and runs it **when the call stack is empty**. You never block while waiting: you register to be called back.

There isn't one queue but two, and that's where every interview trap lives:

| | Microtasks | Macrotasks (tasks) |
|---|---|---|
| Sources | `.then/.catch/.finally`, `await`, `queueMicrotask` | `setTimeout`, `setInterval`, I/O, UI events |
| When | **All of them**, as soon as the stack empties | **One** per loop iteration |
| Priority | Always before the next macrotask | After the microtask queue is fully drained |
| Risk | An endless chain starves the loop | A slow callback freezes everything |

## How it works

One event loop turn: run synchronous code until the call stack is empty → drain the microtask queue **entirely** (including microtasks created along the way) → take **one** macrotask → repeat.

```text
       ┌───────────────┐
       │   Call stack   │◀────────────────────┐
       └───────┬───────┘                      │
               │ stack empty?                 │
               ▼                              │
   ┌───────────────────────┐                  │
   │ Microtasks (promises)  │── drained IN    │
   └───────────┬───────────┘   FULL first     │
               ▼                              │
   ┌───────────────────────┐                  │
   │ Macrotasks (setTimeout,│── ONE only,     │
   │  I/O, clicks…)         │   then loop back┘
   └───────────────────────┘
   Web APIs / libuv work in parallel and
   push callbacks into the queues.
```

The great classic, to be able to walk through line by line:

```javascript
console.log("1");                          // synchronous: runs now

setTimeout(() => console.log("2"), 0);     // macrotask, even at 0ms

Promise.resolve().then(() => console.log("3")); // microtask

(async () => {
  console.log("4");                        // synchronous! before the await
  await null;                              // suspends: the rest = microtask
  console.log("5");
})();

console.log("6");
// Order: 1, 4, 6, 3, 5, 2
// → all synchronous code first (1, 4, 6)
// → then ALL the microtasks (3, then 5)
// → then the setTimeout macrotask (2)
```

So `setTimeout(fn, 0)` does not mean "immediately": it means "at the earliest on the next loop turn, after all synchronous code and all microtasks" — and if the stack is busy for 3 seconds, the callback waits 3 seconds. The delay is a **minimum**, not a guarantee.

> 🎤 **In an interview** — the "in what order does it log?" exercise is the absolute classic. The method that works: three mental columns (synchronous / microtasks / macrotasks), sort each line into one, then read column by column. Verbalizing that sorting out loud during the exercise is exactly what the interviewer wants to hear.

## Key concepts to master

- **Promise**: an object representing a future value, with three states — `pending`, then **exactly once** `fulfilled` or `rejected` (it is then *settled*, permanently). `.then` returns a **new** promise, hence the flat chaining that replaced *callback hell*.
- **Combinators**: `Promise.all` (everything in parallel, rejects on the **first** failure), `Promise.allSettled` (waits for everything, returns results AND failures), `Promise.race` (first settled wins — handy for a timeout).
- **`async/await`**: syntactic sugar over promises. An `async` function always returns a promise; `await` **suspends the function** (not the thread!) and yields to the event loop — the rest of the function becomes a microtask.
- **Error handling**: `try/catch` around `await`, or `.catch()` on the chain. A never-caught rejection = `unhandledRejection` (possible crash in Node). Trap: `try { myAsyncFn() }` without `await` catches **nothing** — the promise rejects after the `try` has exited.
- **The Node.js case**: same model (libuv event loop, phases timers → I/O → check), same golden rule — **never block the event loop**. A 50 MB `JSON.parse` or a compute loop freezes *all* the server's requests, not just one. For CPU-bound work: **`worker_threads`** (real threads with their own event loop) or split the work into chunks.

> 💡 **Parallel vs sequential** — `await a(); await b();` runs in sequence (2× the time). `await Promise.all([a(), b()])` starts both at once. Spotting serial `await`s on independent operations is one of the easiest remarks to make in a code review… and in an interview.

## In an interview

**"JavaScript is single-threaded: how does it handle 1000 simultaneous requests?"** — The JS thread only runs short code; slow operations (network, disk) are delegated to the environment (Web APIs, libuv), which is asynchronous/multithreaded. Callbacks come back through the queues, dequeued when the stack is empty. Concurrency comes from interleaved waiting, not from parallel JS code.

**"Why doesn't `setTimeout(fn, 0)` run `fn` immediately?"** — Because `fn` becomes a macrotask: it waits for the current synchronous code to finish AND the microtask queue to fully drain. 0 ms = minimum delay before queueing, never an appointment.

**"Microtask vs macrotask?"** — Two distinct queues. Microtasks (promise callbacks, `await`): the queue is fully drained as soon as the stack frees up, before any macrotask. Macrotasks (`setTimeout`, I/O, events): one per loop turn. Direct consequence: a `.then` always runs before a `setTimeout(0)` armed at the same moment.

**"Difference between `Promise.all` and `Promise.allSettled`?"** — `all` rejects on the first failure (fail-fast): right when everything is required. `allSettled` waits for all promises and returns `{status, value|reason}` for each: right for independent operations where you want the full report.

**"What does 'blocking the event loop' mean in Node, and what about CPU-bound work?"** — Any long synchronous task (big parse, crypto, compute loop) monopolizes the single thread: no request is served in the meantime. Solutions: `worker_threads` to offload the computation, splitting into chunks (`setImmediate`), or delegating to a dedicated service.

## Pitfalls & misconceptions

> ⚠️ **`await` in a loop** — `for (const u of urls) { await fetch(u); }` downloads one at a time. If the requests are independent: `await Promise.all(urls.map(u => fetch(u)))`. It's the most common async performance trap in student projects — and interviewers know it.

- **"async/await makes the code multithreaded"** — no: still one thread. `await` suspends *the function*, never the thread; meanwhile, the event loop runs something else.
- **`forEach` + `async` doesn't wait**: `array.forEach(async x => …)` waits for nothing at all (`forEach` ignores returned promises). Use `for…of` + `await`, or `Promise.all(array.map(…))`.
- **A promise starts at creation**, not at `.then`: `const p = fetch(url)` already fires the request. `.then` merely subscribes to the result.
- **Forgetting that `await` yields**: between `await` and the next line, program state may have changed (another request handled, a shared variable modified). A source of subtle concurrency bugs, even single-threaded.
- **`process.nextTick` (Node)** runs even before promise microtasks — know the name, avoid it in practice.

## Going further

- [MDN — The event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) and [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Jake Archibald — In the Loop (JSConf)](https://www.youtube.com/watch?v=cCOL7MC4Pl0): THE reference talk, visual and memorable
- [Node.js — Don't block the event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop): the official server-side guide
- Practice: write snippets mixing `setTimeout`, `.then` and `async/await`, predict the order on paper, check in the console — ten minutes a day until you never get it wrong
