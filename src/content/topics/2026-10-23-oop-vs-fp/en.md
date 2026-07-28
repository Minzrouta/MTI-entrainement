---
title: "OOP vs functional programming"
date: "2026-10-23"
category: "CS"
level: "Intermédiaire"
summary: "Encapsulation, pure functions, immutability: move past the fake OOP/FP rivalry and show in an interview that you can pick the right style for the right layer."
---

## The essentials

**Object-oriented programming** (OOP) and **functional programming** (FP) are two ways of organizing code — not two enemy camps. OOP groups data and behavior into objects that **encapsulate** their state; FP builds the program by composing **pure functions** that transform **immutable** data.

Real OOP is not "classes everywhere and five levels of inheritance": it's **encapsulation** (private state only changes through methods that guarantee invariants), **polymorphism** (several types behind one interface — you call `shape.area()` without knowing the concrete type) and **composition over inheritance**.

Real FP is not "monads and jargon": it's writing as many **pure functions** as possible (same input → same output, zero side effects), keeping data **immutable** (return a new value instead of modifying), pushing **side effects** (I/O, DB, network) to the program's boundaries, and using **higher-order functions** (`map`, `filter`, `reduce`) instead of accumulator loops.

The rivalry is largely **artificial**: modern JS/TS mixes both constantly — classes for services and state, `map`/`filter` and immutability for data. React itself moved from classes to functions without ever ceasing to encapsulate state. The real common enemy of both styles has a name: **shared mutable state**.

## How it works

| | OOP | FP |
|---|---|---|
| State | Encapsulated in the object, mutable but controlled | Immutable: you create new values |
| Reuse | Polymorphism, object composition | Function composition, higher-order functions |
| Tests | Requires instantiating, sometimes mocking | Pure function = input/output, trivial to test |
| Side effects | Scattered across methods (risk) | Pushed to the boundaries (I/O at the edges) |
| Typical bug | State changed by surprise at a distance | Over-abstraction, unreadable pipelines |

The same need — total of delivered orders, in cents — in both styles:

```typescript
// Imperative style: a loop, an accumulator, mutations
function total(orders: Order[]): number {
  let sum = 0;
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === "delivered") {
      sum += orders[i].amount;        // mutating the accumulator
    }
  }
  return sum;
}

// FP style: a declarative pipeline, no mutation
const total = (orders: Order[]): number =>
  orders
    .filter(o => o.status === "delivered") // keep delivered ones
    .map(o => o.amount)                    // extract the amount
    .reduce((sum, a) => sum + a, 0);       // add them up (0 = seed)
```

Both are correct. The FP version reads like the specification ("filter, extract, sum"), each step can be tested in isolation, no intermediate state to track mentally. The imperative one can be faster on huge volumes (a single pass) — but in 99% of application code, readability wins.

Why **shared mutable state** is the real root of bugs: when two pieces of code can modify the same structure, each can break the other's assumptions — the infamous "who changed this array?" at 6pm on a Friday. OOP answers by **controlling** mutation (private state, methods guarding invariants); FP answers by **removing** it (immutable data). Two different strategies against the same enemy.

A quick look ahead: **pattern matching** and **sum types** come from the FP world and are spreading everywhere. In TypeScript, a discriminated union `type Result = { ok: true; data: User } | { ok: false; error: string }` forces the `switch` to handle every case — the compiler flags the forgotten one. That's a battle FP won in modern type systems.

> 💡 **Composition > inheritance** — inheritance creates a strong, brittle coupling: changing the parent class silently breaks the children, and the hierarchy always ends up lying (the rubber duck inherits from Duck but doesn't fly). Composing — an object *has* capabilities rather than *inheriting* them — stays flexible: it's the Gang of Four's advice… from 1994, and the reason React moved to hooks and component composition.

## Key concepts to master

- **Pure function**: same input → same output, and no side effects (no I/O, no external mutation, no hidden `Date.now()` or `Math.random()`). Direct consequence: testable without mocks, memoizable, parallelizable, safe to move around.
- **Immutability**: `const next = [...items, newItem]` rather than `items.push(newItem)` — return a new value instead of modifying in place.
- **Side effects at the boundaries**: the "functional core, imperative shell" pattern — a core of pure logic (computations, decisions) surrounded by a thin shell that talks to the world (DB, HTTP, files). You test the core without mocks, the shell in integration.
- **Higher-order functions**: functions that take or return functions. `map`/`filter`/`reduce` qualify, but so do Express middlewares, React hooks, decorators.
- **Encapsulation & invariants**: OOP's value is not the `class` syntax, it's making invalid states impossible — a `BankAccount` whose balance only changes through `deposit`/`withdraw` methods that enforce the rules.
- **The pragmatic "FP light" style** for teams: immutability by default, pure functions for business logic, `map`/`filter`/`reduce` for transformations, effects at the edges — no dogma, no unreadable `pipe(curry(flip(...)))`. It's the dominant style of modern TS codebases.

```text
        functional core, imperative shell
  ┌──────────────────────────────────────────┐
  │  Imperative shell (side effects)         │
  │   HTTP ─ DB ─ files ─ clock              │
  │   ┌──────────────────────────────────┐   │
  │   │   Pure core (business logic)     │   │
  │   │   computation, validation,       │   │
  │   │   decisions → testable w/o mocks │   │
  │   └──────────────────────────────────┘   │
  └──────────────────────────────────────────┘
```

## In an interview

**"What is a pure function and why is it testable?"** — A function whose output depends only on its arguments, and which produces no observable side effect. Testable because the test is trivial: feed an input, check the output — no mocks, no DB setup, no execution order. Bonus: it's also memoizable and safe to parallelize, precisely because nothing external is involved.

**"Why do we say composition over inheritance?"** — Inheritance tightly couples the child to the parent's implementation: any change to the parent propagates silently, and deep hierarchies become wrong over time. Composition assembles capabilities (`class Car { engine: Engine }`): loose coupling, testable piece by piece, recombinable. Inheritance keeps one legitimate use: genuine, stable, shallow "is-a" relationships.

**"OOP or FP: which do you pick?"** — Both, depending on the layer. Business logic and data transformations: functional style (pure, immutable, `map`/`filter`). Services with a lifecycle, encapsulated state, polymorphism (several providers behind one interface): object style. Modern JS/TS mixes both — the real skill is keeping shared mutable state to a minimum, whatever the style.

**"What's the problem with shared mutable state?"** — Two pieces of code modifying the same structure break each other's assumptions: action-at-a-distance bugs, impossible to reproduce, worse under concurrency (race conditions). OOP controls it through encapsulation, FP removes it through immutability — either answer beats a global variable modified everywhere.

**"Can you explain map/filter/reduce?"** — `map` transforms each element (n → n), `filter` keeps those passing a predicate (n → ≤n), `reduce` folds the list into a single value via an accumulator. Together they replace the accumulator loop with a declarative pipeline where each step is named and testable. Trap worth mentioning: `reduce` without an initial value throws on an empty array.

## Pitfalls & misconceptions

> ⚠️ **"FP = no classes" / "OOP = no functions"** — wrong both ways. A TS class with pure methods and immutable state is perfectly functional in spirit; a module of functions mutating a shared global object is functional in syntax only. Judge the style by how state is handled, not by the keywords.

- **"Immutability is too slow"** — copying has a cost, but in application code it's almost always negligible (and JS engines optimize it). Profile *before* optimizing; at worst, mutate locally inside a function that stays pure from the outside.
- **"More classes = more OOP"** — OOP is judged by the invariants it protects, not by class count. An anemic class (getters/setters with no logic) encapsulates nothing: it's a struct with ceremonies.
- **`const` in JS only freezes the reference** — `const arr = []; arr.push(1)` is legal. Value immutability is a discipline (`readonly`, `Object.freeze`, Immer), not a keyword.
- **Dogmatism in either direction**: rewriting everything into unreadable `pipe`/`curry` chains is as harmful as a six-level inheritance hierarchy. In a team, "FP light" wins: pure by default, pragmatic at the edges.

> 🎤 **In an interview** — never pick a camp. The answer that lands: "both tool the same problem — shared mutable state — one by fencing it in, the other by removing it; I take the style that makes each layer simplest to test". You've just shown perspective, not religion.

## Going further

- [Professor Frisby's Mostly Adequate Guide to Functional Programming](https://mostly-adequate.gitbook.io/mostly-adequate-guide/): FP in JS, free and funny
- [Composition over inheritance (Wikipedia)](https://en.wikipedia.org/wiki/Composition_over_inheritance): the detailed argument, straight from the Gang of Four
- [Functional Core, Imperative Shell — Destroy All Software](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell): the screencast that coined the pattern
- [TypeScript Handbook — Narrowing & discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html): sum types in practice
- Hands-on exercise: take one of your accumulator loops and rewrite it with `filter`/`map`/`reduce` — then compare the testability of both versions
