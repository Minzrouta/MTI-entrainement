---
title: "Concurrency: threads, race conditions & locks"
date: "2026-09-25"
category: "CS"
level: "Avancé"
summary: "Why `counter++` loses increments, how a mutex fixes it, when deadlock strikes, and the one criterion that settles async vs threads — the most discriminating systems topic in interviews."
---

## The essentials

A **process** is a running program with its own memory space, isolated from others by the OS. A **thread** is an execution flow *inside* a process: all threads of the same process **share the heap** — globals, objects, buffers — but each keeps its own stack and registers. Communicating between threads is free (same memory); between processes it's explicit (pipes, sockets, shared memory).

That sharing cuts both ways: it makes threads cheap to create and coordinate, and it is the source of **every** concurrency bug.

Two notions never to confuse:

- **Concurrency** — *dealing with* several tasks over the same period; they may interleave on a single core. A matter of program structure.
- **Parallelism** — *executing* several tasks at the same instant, on several cores. A matter of hardware.

Node.js is massively concurrent with a single thread (zero JS-side parallelism); a computation split across 8 cores is parallel without being particularly concurrent.

> 🎤 **In an interview** — "what's a race condition?" Model answer in three beats: "A bug where the result depends on the execution order of unsynchronized threads. Canonical example: two threads run `counter++` at the same time; since the increment is actually three instructions (load, add, store), an interleaving can lose a write. You fix it with a mutex around the critical section, or an atomic." You've defined, illustrated and solved it in thirty seconds.

## How it works

### `counter++` unrolled instruction by instruction

`counter++` looks like a single operation. To the CPU it's three: read the value from memory into a register, increment the register, write the result back. The scheduler can suspend a thread **between any** of these instructions:

```text
Thread A                 Thread B              counter
────────                 ────────              ───────
LOAD  rA ← counter(0)                             0
                         LOAD  rB ← counter(0)    0
ADD   rA ← rA+1                                   0
                         ADD   rB ← rB+1          0
STORE counter ← rA                                1
                         STORE counter ← rB       1  ✗
```

Two threads incremented, the counter is only 1: B was working on a stale value and clobbered A's write. Over 2 × 100,000 increments the final result changes from run to run — that non-determinism is what makes these bugs so hard to reproduce.

### Critical section and mutex

The code portion that reads-modifies-writes shared state is a **critical section**. A **mutex** (*mutual exclusion*, a lock) guarantees only one thread at a time executes it: the others block at the entrance until the lock is released.

```python
import threading

counter = 0
lock = threading.Lock()

def worker_unsafe():
    global counter
    for _ in range(100_000):
        counter += 1          # RACE: load + add + store

def worker_safe():
    global counter
    for _ in range(100_000):
        with lock:            # only one thread enters at a time
            counter += 1      # protected critical section
        # `with` releases the lock even if an exception is raised
```

> 💡 **Golden rule** — a lock protects **data**, not code: every access to the shared state (reads included) must go through the same lock. Miss a single access, and the race is back.

### Deadlock: the deadly embrace

Thread A holds lock 1 and waits for lock 2; thread B holds 2 and waits for 1: nobody moves, forever. A deadlock requires **four simultaneous conditions** (the Coffman conditions): mutual exclusion, hold & wait, no preemption of locks, circular wait. Breaking a single one is enough — and the easiest to break in practice is the last: **always acquire locks in the same global order** (by increasing id, for instance). Other weapons: acquisition timeouts (`try_lock`), or never holding two locks at once.

## Key concepts to master

- **Atomics** — indivisible hardware instructions (`fetch_add`, compare-and-swap): for a simple counter, `std::atomic<int>` or `AtomicInteger` is lighter than a mutex — no blocking, no deadlock possible.
- **Message passing** — instead of sharing memory, tasks send each other messages (Go channels, Erlang/Akka actors): "*don't communicate by sharing memory; share memory by communicating*". No shared state → no race on that state.
- **JavaScript event loop** — a single thread runs the JS: two callbacks never run at the same time, so no race on variables. Concurrency comes from the interleaving *between* callbacks — logical races remain possible (two HTTP responses arriving out of order).
- **Python's GIL** — a global lock means only one thread executes Python bytecode at a time: Python threads are fine for I/O (the GIL is released while waiting) but useless for pure computation, hence `multiprocessing`.
- **Async vs threads — THE criterion**: where does the time go?

| Workload | Examples | Right tool |
|---|---|---|
| **I/O-bound** (waiting) | API calls, DB, files, network | async/await + event loop, or threads (GIL included) |
| **CPU-bound** (computing) | encoding, crypto, ML, heavy parsing | multiprocessing / native threads, ≈ 1 per core |
| Mixed | web server + heavy computation | event loop + worker pool |

Async speeds up no computation: it lets you wait on thousands of I/O operations without dedicating a thread per wait. CPU parallelism, on the other hand, requires actually using multiple cores.

## In an interview

**"What's the difference between a process and a thread?"** — A process has its own memory space, isolated by the OS; a thread lives inside a process and shares its heap with the other threads (separate stacks). Threads: cheap creation and communication, but mandatory synchronization. Processes: strong isolation, explicit communication (IPC), contained crashes.

**"Why isn't `counter++` thread-safe?"** — Because it's three instructions (load, add, store) and the scheduler can interleave another thread between them: two threads read the same value, one clobbers the other's write. Fix: a mutex around the operation, or an atomic increment.

**"What's a deadlock, and how do you avoid it?"** — A circular wait on locks: A holds L1 and waits for L2, B holds L2 and waits for L1. Four Coffman conditions; breaking one is enough. Most common remedy: impose a global lock-acquisition order. Otherwise: timeouts, or one lock at a time.

**"Async/await or threads: how do you choose?"** — By the nature of the workload. I/O-bound → async (thousands of waiting connections on a single thread); CPU-bound → processes or native threads to keep the cores busy. In Python the GIL makes the criterion even sharper: threads for I/O, multiprocessing for CPU.

**"Are concurrency and parallelism the same thing?"** — No: concurrency structures a program into tasks that make progress over the same period (possible on one core); parallelism physically executes them at the same time (several cores). You can have either without the other.

## Pitfalls & misconceptions

> ⚠️ **The bug that vanishes in debug** — a race depends on timing: adding a `print`, setting a breakpoint or building in debug mode changes the scheduling… and the bug evaporates (a "heisenbug"). If a bug disappears when observed, suspect concurrency. The real tools: ThreadSanitizer (C/C++), `go test -race`, jstack/async-profiler on the JVM.

- **"More threads = faster"** — false beyond the core count for CPU-bound work: context switching can even *slow you down*. And for massive I/O, one event loop beats 10,000 threads.
- **"A read doesn't need a lock"** — a read concurrent with an unprotected write is already a data race: stale or torn value, undefined behavior in C/C++.
- **`sleep()` as synchronization** — waiting 100 ms "to leave enough time" doesn't remove the race, it just makes it rarer. Use `join`, events, barriers.
- **Check-then-act** — `if not exists: create()` without a lock is a classic race (TOCTOU), even when each operation is individually atomic.

## Going further

- [Rob Pike — Concurrency is not Parallelism](https://go.dev/blog/waza-talk): the distinction, in 30 minutes
- [OSTEP — the Concurrency chapters](https://pages.cs.wisc.edu/~remzi/OSTEP/): threads, locks, semaphores — free and crystal clear
- [The Little Book of Semaphores](https://greenteapress.com/wp/semaphores/): dozens of solved synchronization puzzles
- [MDN — The event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop): JavaScript's execution model
- Reproduce the race yourself: two Python threads doing `counter += 1` × 100,000, and look at the result
