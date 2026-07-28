---
title: "Approaching an unknown codebase"
date: "2026-10-09"
category: "Méthodo"
level: "Fondamental"
summary: "First day of your internship: 150,000 lines you have never seen. The method to explore, ask the right questions and ship a first PR without breaking anything — a skill recruiters test directly."
---

## The essentials

First day of the internship: repo access, 150,000 lines written by people you don't know, and a ticket. The natural reflex — read everything to "understand before acting" — is exactly the wrong one. Nobody knows the whole codebase, not even the lead who has been there for five years. Effective developers don't understand everything: they know how to **find things fast**, with a rough mental map and precise search techniques.

The skill tested in interviews is therefore not "knowing" but **exploring**: where you enter, how you follow a thread, who you ask and how, how you ship a first risk-free change. It's one of the rare questions where the recruiter directly evaluates what you'll actually do in your first week.

Three principles stand in for a method:

1. **Run it before reading it.** An app running locally is a playground for experiments; code read cold is fiction.
2. **Follow one thread, not the whole ball.** One request, one feature, one bug — end to end. The map builds up thread by thread.
3. **Code lies less than docs.** Stale README, abandoned wiki: the tests and `git log` are the only sources that are always up to date.

## How it works

**Day 1: clone, run, take notes.** Clone, follow the README to the letter, and write down every missing or wrong step: the undocumented environment variable, the implicit Node version, the service that must run alongside. Those notes are gold (see below). Goal for the day: the app runs locally and you know how to run the tests. Nothing else.

**Then: find the entry points.** Every codebase has doors: the `main()`, the routes file, event handlers, cron jobs. From a door, follow **one request end to end** — the move that yields the most understanding per minute:

```text
HTTP POST /orders
      │
      ▼
routes/orders.ts          ← the entry door
      │
      ▼
OrderController.create()  ← validation, auth
      │
      ▼
OrderService.place()      ← business logic lives here
      │
      ▼
OrderRepository ────────▶ PostgreSQL
```

One round trip like this teaches you the real architecture (not the wiki's): the layers, the naming conventions, where business logic lives.

**Reflexes by situation:**

| Situation | Reflex |
|---|---|
| "Where is X handled?" | `rg` on a visible string (error message, UI label) |
| "What does this file do?" | Its tests first, then `git log --follow` |
| "Is this behavior intended?" | If it's tested, it's intended |
| "Who can help me on this module?" | `git shortlog -sn -- path/` |
| "Where does this request come in?" | Routes file / framework entry point |
| "My grep finds nothing" | Search the exact error string, not the assumed name |

A typical exploration session, starting from an error message:

```bash
# Concrete starting point: a string visible in the API
rg "insufficient stock" -l
#   → src/services/order.service.ts

# Who uses this service? (the dependency map)
rg "OrderService" -t ts -l

# The file's history: commits tell you the why
git log --follow --oneline -15 -- src/services/order.service.ts

# Who has the context? (who to ask THE right question)
git shortlog -sn -- src/services/order.service.ts

# The living spec: tests describe the expected behavior
rg "insufficient" src --glob "*.test.ts"
```

> 💡 **The README you write while onboarding** — during your first two weeks, you are the only person on the team seeing the codebase with fresh eyes. Every missing setup step, every implicit convention you write down becomes a docs PR the team could no longer write themselves. Often the best first contribution: useful, risk-free, and it proves you turn your confusion into value.

## Key concepts to master

- **Progressive mapping**: the goal is never "understand everything" but to keep a map up to date — the 5-6 main modules, their boundaries, who talks to whom. Details load on demand, when a ticket takes you there.
- **Tests as documentation**: a test describes expected behavior, with executable examples, guaranteed current (otherwise CI is red). Read `order.service.test.ts` before `order.service.ts`: nominal and edge cases are listed there.
- **Git as the team's memory**: `git log` on a file tells you why it exists; `git blame` on a strange line leads back to the commit (and often the ticket) that introduced it; the most-modified files are the **hot files**, the ones concentrating activity — and bugs.
- **Asking questions intelligently**: timebox the search (30-45 min), then ask while showing the path already covered: "I'm looking for where X is validated; I checked the controller and grepped for 'X', I see the format validation but not the business rule — where does it live?". This form proves effort, frames the answer, and nobody finds it annoying.
- **The first PR: small and safe**: a docs typo, a missing setup step, a test on an uncovered edge case. The goal isn't to shine but to go through the entire pipeline (branch, PR, review, CI, merge, deploy) on a change whose review takes two minutes.
- **The debugger as an exploration tool**: a breakpoint on the handler + the call stack = the real architecture in a single run, where static reading can lie (dependency injection, indirections).

> 🎤 **In an interview** — "How would you approach our codebase?" is a real interview question, sometimes asked in front of a real screen. Winning answer: walk through the method (run the app, read the tests of the relevant module, follow one request, `git log` the hot files) rather than promising to "read everything". Bonus: ask "do you have onboarding docs? If not, my first PR will start them".

## In an interview

**"We drop you into our 200k-line codebase on Monday: what do you do the first week?"** — Day 1: clone, get it running, run the tests, note everything missing from the README. Days 2-3: follow one request end to end to understand the real layers, spot the hot files with git log. End of week: one tiny first PR (setup docs, missing test) to cross the full pipeline. I'm not trying to understand everything: I build a map, module by module, pulled by tickets.

**"You're stuck on an incomprehensible piece of code, what do you do?"** — Its tests first (the expected behavior), then `git blame` → the commit → the ticket (the why). If that's not enough: timebox, then a question to the author (found via blame/shortlog) showing what I already explored. Staying stuck for two hours in silence costs the team more than asking after 30 minutes with context.

**"What makes a good first PR?"** — Small, safe, useful: fixing the setup README, a test on an edge case, a typo. It validates that I can run the team's whole workflow (branch, commit conventions, review, CI) on a zero-risk change. The big feature comes when the map is reliable.

**"What do tests give you in code you're discovering?"** — Executable documentation: they list expected behaviors and edge cases, and they're current by construction. They also act as a harness: before modifying code I don't fully master, a test capturing current behavior protects me from regressions.

**"The README says X but the code does Y: who do you believe?"** — The code, always: it's what runs in production, the README ages. But the gap is information in itself: I check with git log whether Y is recent, ask whether the change is intended, and fixing the README becomes a PR.

## Pitfalls & misconceptions

> ⚠️ **Early refactoring** — the code that looks "bad" to you in week one often has a reason you can't see yet: business constraint, historical bug, external dependency. That's Chesterton's fence: you only remove a fence after understanding why it's there. Proposing a big refactoring in week 1 is the junior signal par excellence.

- **"I must understand everything before touching anything"** — no: understanding comes from doing. One well-chosen ticket teaches more than three days of passive reading.
- **Staying stuck in silence** to "avoid bothering people": beyond 30-45 minutes of genuine searching, not asking costs the team more than asking.
- **The opposite too**: asking before searching burns your credit. The question must show the path already covered.
- **Trusting docs over code**: wikis and READMEs drift; tests and git log don't lie.
- **The ambitious first PR**: 800 lines in week 1 = endless review, maximum risk, wrong signal. Small, safe, merged.

## Going further

- [Understand Legacy Code](https://understandlegacycode.com/) — Nicolas Carlo's blog, entirely dedicated to the topic
- *Working Effectively with Legacy Code* (Michael Feathers) — the classic: test harnesses, seams, safe changes
- [ripgrep](https://github.com/BurntSushi/ripgrep) — learn `rg` inside out, the number one exploration tool
- [git log](https://git-scm.com/docs/git-log) and [git blame](https://git-scm.com/docs/git-blame) — the options that change everything: `--follow`, `-S` (pickaxe), `-L`
- *The Programmer's Brain* (Felienne Hermans) — how the brain reads code, and why the mental map beats exhaustive reading
