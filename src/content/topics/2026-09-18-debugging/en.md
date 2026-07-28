---
title: "Systematic debugging"
date: "2026-09-18"
category: "Qualité"
level: "Fondamental"
summary: "Reproduce, reduce, form a hypothesis, test one variable at a time: the scientific method applied to bugs — and how to tell the story of your hardest bug in an interview without rambling."
---

## The essentials

Debugging is not about talent or luck: it's the **scientific method** applied to code. The beginner changes random lines until "it works"; the methodical developer **reproduces** the bug reliably, **reduces** the case to a minimum, forms **one falsifiable hypothesis**, then runs **an experiment changing only one variable at a time**. The difference between the two shows within five minutes of pair programming — and interviewers know it: "tell me about your hardest bug" is one of the most common behavioral questions in internship interviews.

Step zero, before any method: **actually read the error message**. All of it. A depressing share of bugs is literally explained in the message you scrolled past without reading.

| Symptom | First reflex |
|---|---|
| Exception + stack trace | Read the message **in full**, find the first frame in *your* code |
| "It worked yesterday" | Regression → `git log` of recent commits, then `git bisect` |
| Works locally, breaks in prod | Diff the environments: versions, env vars, config, data |
| Intermittent bug | Suspect concurrency / timing / non-deterministic data; log it, don't just "retry" |
| "Impossible" behavior | Check you're running the code you think you are (stale build, cache, wrong server, wrong branch) |

## How it works

The whole loop fits in one box:

```text
┌──────────────────────────────────────────────┐
│ 1. reproduce  (reliably, on demand)          │
│ 2. reduce     (minimal case, by bisection)   │
│ 3. hypothesis (a single, falsifiable one)    │
│ 4. experiment (ONE variable at a time)       │
│      ├─ confirmed → fix + test               │
│      └─ refuted   → back to 3                │
└──────────────────────────────────────────────┘
```

- **Reproduce first.** A bug you can't reproduce is a bug you can't verify as fixed. Write down the exact steps, the data, the environment.
- **Then reduce.** Delete half the code, half the input data: bug still there? Keep going in that half. It's a **bisection**, like binary search — you go from "3,000 suspicious lines" to 10 in a few iterations.
- **One variable at a time.** If you change two things and the bug disappears, you don't know which one was the cause — and you may have introduced a second bug masking the first. Every experiment must be able to *refute* the hypothesis.
- **Fix, then lock it in**: a regression test that fails without the fix and passes with it. Otherwise the bug will come back, and nobody will notice before production.

For regressions ("it used to work"), bisection has a dedicated tool: **`git bisect`**, a binary search through history. 1,000 suspect commits = ~10 steps, not 1,000.

```bash
# The feature worked in v2.3.0, broken on main: a regression.
git bisect start
git bisect bad                 # HEAD is broken
git bisect good v2.3.0         # this tag worked
# → git checks out a commit halfway; we test:
npm test
git bisect good                # or "bad" depending on the result
# ... ~log2(N) iterations, then:
# "abc1234 is the first bad commit"

# Automated version: exit code 0 = good, anything else = bad
git bisect run npm test
git bisect reset               # go back to where you were
```

> 💡 **The bug is in YOUR code** — statistically, the compiler, the framework and the library with 40 million weekly downloads are not broken. "I found a bug in React" is possible, but it's the hypothesis to test *last*, after eliminating all of your own code. This reflex of humility saves hours — and it sounds very good in an interview.

## Key concepts to master

- **Reading a stack trace**: identify the message (the *what*), then walk down to the **first frame that belongs to your code** (the *where*). The framework frames around it are context, not suspects. Careful: some stacks list the deepest call at the top (Python: at the bottom).
- **Debugger vs printf**: a debugger lets you **set a breakpoint** (including conditional ones: `i == 4217`), **inspect all state** without redeploying, **step over/into** line by line and set **watches** on expressions. `printf`/`console.log` keeps two advantages: it captures a **timeline** (precious for async code) and it works in prod — logs are production's debugger. Both are legitimate tools; knowing *when* to use which is the real senior signal.
- **Heisenbugs**: a bug that disappears under a debugger or as soon as you add a `print` is almost always a **timing** problem — race condition, deadlock avoided by the slowdown, uninitialized memory. The debugger *changes the experiment*: it freezes threads, alters scheduling. Reflex: lightweight timestamped logging, thread sanitizer, re-read the critical sections.
- **Rubber duck debugging**: explain the problem out loud, line by line, to a rubber duck (or a silent colleague). It works because verbalizing forces you to **check every implicit assumption** — and one of them is usually the false one. Half the questions asked of a senior get solved while being phrased.
- **Asking a good question**: a **minimal reproducible example** (the shortest code that shows the bug), what you **expected**, what **happens**, what you **already tried**, versions and environment. Building that minimal case solves the problem half the time; the other half, you get an answer in minutes instead of days.

> ⚠️ **Shotgun debugging** — changing random lines until the symptom disappears. Even when "it works", you've learned nothing, you've probably masked the root cause, and the bug will come back in another shape. A fix you can't explain the *why* of is not a fix.

## In an interview

**"Tell me about the hardest bug you've solved."** — Structure it: ① context in one sentence, ② observable symptom, ③ approach (successive hypotheses, tools used, dead ends you own up to), ④ root cause, ⑤ fix + what you put in place so it can't come back. The interviewer is evaluating your **method**, not the bug's difficulty — a simple bug told with a crisp approach beats an epic bug told as a jumble.

**"A bug shows up in prod but not locally, where do you start?"** — With the **differences**: versions (runtime, dependencies), environment variables, config, real data vs test data, load/concurrency. Then the **prod logs** around the incident. The bug necessarily lives in one of the deltas.

**"What is `git bisect`?"** — A binary search through Git history to find the commit that introduced a regression: you give a `good` commit and a `bad` commit, Git checks out the midpoint, you test, answer `good`/`bad`, and it converges in O(log n). Bonus: `git bisect run <cmd>` automates the whole thing if a test reproduces the bug.

**"Debugger or console.log?"** — Both, depending on context: debugger to explore complex state at a point in time (conditional breakpoints, watch, step); logs for async timelines, intermittent bugs and production. Answering "only one of the two" is a red flag.

**"A bug disappears when you add a print, what does that suggest?"** — A **race condition** (or a timing issue): the print slows the thread down and changes scheduling. It's a clue, not a solution — the bug is still there, waiting for production.

## Pitfalls & misconceptions

- **Fixing the symptom, not the cause**: catching the exception and moving on, adding an `if null` without understanding why it's null. The bug moves, it doesn't disappear.
- **"Impossible, this code hasn't changed"** — but the environment, the data, a dependency or the clock has. Unchanged code in a changing world can break.
- **Googling the generic exception name** (`NullPointerException`) instead of *your* full message with its context. The precise message is your best query.
- **Grinding alone for hours**: past 30-45 minutes without progress, rubber duck, break, or a well-formed question to a human. Tenacity is method, not isolation.
- **Skipping the regression test** after the fix: the same bug will return at the next refactor, having cost you twice.

> 🎤 **In an interview** — prepare two bug stories *in advance* (one technical, one "detective work") following the structure symptom → approach → cause → fix → prevention. This question is near-certain, and improvisation shows. Mentioning an owned dead end ("I first suspected X, the experiment refuted it") makes the story credible and shows the method.

## Going further

- [A debugging manifesto — Julia Evans](https://jvns.ca/blog/2022/12/08/a-debugging-manifesto/) and her zine [The Pocket Guide to Debugging](https://wizardzines.com/zines/debugging-guide/)
- [git bisect — official documentation](https://git-scm.com/docs/git-bisect), including the `bisect run` section
- [How to ask — Stack Overflow](https://stackoverflow.com/help/how-to-ask) and [Minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example): the checklist of a good question
- *Debugging: The 9 Indispensable Rules* — David J. Agans: short, old, still right
