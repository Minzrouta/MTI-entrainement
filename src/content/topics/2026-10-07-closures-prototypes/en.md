---
title: "Closures, prototypes & this"
date: "2026-10-07"
category: "Web"
level: "Intermédiaire"
summary: "The three mechanisms that trip candidates up in front-end interviews: the closure (THE most asked JS question), the prototype chain behind the class keyword, and the four rules of this."
---

## The essentials

Three mechanisms at the core of JavaScript concentrate most front-end interview questions — because they reveal whether you understand the language or merely recite it.

A **closure** is a function that **captures the variables of its lexical definition scope** and keeps them alive after the enclosing function has returned. "Lexical" means: determined by where the code sits in the file, not by how the function will be called. Every JS function carries along the environment it was born in.

**Prototypes** are JavaScript's real inheritance mechanism: every object holds an internal `[[Prototype]]` link to another object. Reading a missing property triggers a walk up this **prototype chain** until `null`. The `class` keyword (ES2015) changed nothing in the engine: it is **syntactic sugar** over prototypes.

`this` is **not** "the current object": its value depends on the **call site**, not on where the function was defined — four rules cover every case, plus the arrow-function exception, which has no `this` of its own.

Two travel companions, in passing: **hoisting** (`var` and `function` declarations are moved to the top of their scope) and the **TDZ** (temporal dead zone: `let`/`const` are hoisted too, but touching them before their declaration line throws a `ReferenceError`).

## How it works

**The closure, via the classic trap** — the most asked coding question in JS interviews:

```javascript
// The trap: var has no block scope
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));   // → 3, 3, 3
}
// All 3 callbacks capture THE SAME variable i
// (a closure references the variable, not its value).
// By the time they run, the loop is over: i === 3.

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j));   // → 0, 1, 2
}
// let creates a NEW binding j on each iteration:
// each callback captures its own.

// Real use: private state (module pattern)
function makeCounter() {
  let count = 0;               // invisible from outside
  return () => ++count;        // the closure keeps count alive
}
const next = makeCounter();
next(); // 1
next(); // 2 — the state survives between calls
```

Real uses are everywhere: counters and private state, modules (expose an API, hide the implementation), callbacks that remember their context, memoization, debounce/throttle. React hooks rest entirely on closures — the famous "stale closure" bug in `useEffect` is exactly the `var` trap above.

**The prototype chain** — reading `rex.eat()` triggers an upward lookup:

```text
rex { name: "Rex" }
  │ [[Prototype]]
  ▼
Dog.prototype { bark() }
  │ [[Prototype]]        ← wired by extends
  ▼
Animal.prototype { eat() }   ← found here!
  │ [[Prototype]]
  ▼
Object.prototype { toString(), hasOwnProperty()… }
  │
  ▼
null                     ← end of the chain
```

`class Dog extends Animal` merely wires this diagram: methods go on `Dog.prototype`, and `Dog.prototype.[[Prototype]]` points to `Animal.prototype`. A detail that lands well in interviews: methods are **not copied** into each instance — a thousand dogs share the single `bark` function on `Dog.prototype`.

**The four rules of `this`** — evaluated at the call site, in decreasing order of priority:

| Rule | Call form | `this` is |
|---|---|---|
| 1. `new` | `new User()` | The freshly created object |
| 2. Explicit | `f.call(ctx)` / `f.apply(ctx)` / `f.bind(ctx)` | The `ctx` passed as argument |
| 3. Method | `obj.f()` | The object before the dot |
| 4. Plain call | `f()` | `undefined` in strict mode (`globalThis` otherwise) |

**Arrow functions** short-circuit all of it: they have no `this` of their own and use the one from the **enclosing lexical scope** — the `this` of the place where they are written. Ideal for callbacks (`setTimeout(() => this.tick())` inside a class), disastrous as an object method (`this` will never be the object).

> 🎤 **In an interview** — "what is a closure?" is THE most asked JS question. Answer in three beats: the definition ("a function that captures the variables of its definition scope and keeps them alive after the enclosing function returns"), a concrete example (the `makeCounter` counter), a real use ("that's what enables private state — and the whole React hooks model"). Definition + example + use: unbeatable.

## Key concepts to master

- **A closure captures variables, not values** — it's a live reference: if the variable changes after the closure is created, the closure sees the new value. The entire `var`-in-a-loop trap fits in that sentence.
- **`prototype` vs `[[Prototype]]`** — two different things: `prototype` is a property of constructor functions (the future `[[Prototype]]` of their instances); `[[Prototype]]` is every object's internal link, readable via `Object.getPrototypeOf(obj)` (the old `__proto__` is deprecated).
- **`class` is sugar** — under the hood: constructor functions and wired prototypes. But useful sugar: clear syntax, calling without `new` forbidden, clean `super`. Saying it this way shows both levels of understanding.
- **A detached method loses its `this`** — `const f = obj.method; f()`: rule 4, plain call, `this === undefined`. The great classic of event handlers. Three remedies: `obj.method.bind(obj)`, an arrow `() => obj.method()`, or a class field `method = () => {…}`.
- **Hoisting & TDZ in two sentences** — `var` is hoisted and initialized to `undefined` (readable too early, without error: a source of silent bugs); `let`/`const` are hoisted but uninitialized: touching them before the declaration throws a `ReferenceError`. The TDZ turns a silent bug into a loud error — that's progress.

> 💡 **The reflex that saves you** — to find `this`, never look at where the function is *defined* (except for arrow functions): look at how it is *called*. Is there a `new`? A `.call/.bind`? An object before the dot? Nothing? The four rules, in that order.

## In an interview

**"What is a closure? Give a real use."** — Exact definition (function + captured variables from its definition scope, which survive), the counter example, uses: private state, modules, callbacks, debounce, React hooks. See the callout above for the structure.

**"What will this `for (var i…)` loop with `setTimeout` print?"** — "3, 3, 3": the three callbacks share the same variable `i`, read after the loop has ended. Fix: `let` (a new binding per iteration) or an IIFE that freezes the value. Explaining the *why* (capture of the variable, not the value) makes the difference.

**"How does inheritance work in JavaScript?"** — By delegation along the prototype chain: a missing property is looked up on `[[Prototype]]`, walking up until `null`. `class`/`extends` are just sugar on top. Bonus: methods are shared via the prototype, not copied per instance.

**"The four rules of `this`?"** — `new` > `call`/`apply`/`bind` > method (`obj.f()`) > plain call (`undefined` in strict mode). And the exception: arrow functions have no `this` of their own, they take the one from the scope where they are written.

**"Why does `const f = obj.method; f()` break, and how do you fix it?"** — Detaching the method falls back to the plain-call rule: `this` is `undefined`. Fixes: `bind`, an arrow wrapper, or an arrow class field. Cite the real case: `addEventListener(this.handleClick)` in class-based React.

## Pitfalls & misconceptions

> ⚠️ **The arrow function is not "the new function syntax"** — it's a function *without* `this`, without `arguments`, not constructible (`new` forbidden). Making it an object method (`obj = { greet: () => this.name }`) is the reverse trap for the candidate who memorized "arrow = good": here `this` will never be `obj`.

- **"A closure copies values"** — no: it references variables. That's precisely why the `var` loop prints 3, 3, 3 and not 0, 1, 2.
- **"`class` brought real classes like Java"** — no: the model stays prototypal, `class` is syntax. `typeof Dog` returns `"function"`.
- **`prototype` confused with `__proto__`** — `Dog.prototype` (a property of the function) will become the instances' `[[Prototype]]`; `rex.__proto__` (deprecated access to the internal link) *is* `Dog.prototype`. Mixing them up betrays recited understanding.
- **Closures and memory** — a closure keeps alive everything it captures: a listener capturing a big object and never removed (`removeEventListener` forgotten) is a classic SPA memory leak.
- **Hoisting misunderstood** — "`var` hoists the declaration *and* the assignment": false, only the declaration moves up; the variable is `undefined` until the assignment line.

## Going further

- [MDN — Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures): the reference, with the loop trap covered in detail
- [MDN — Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain): the complete object model
- [You Don't Know JS (Kyle Simpson)](https://github.com/getify/You-Dont-Know-JS): the *Scope & Closures* and *this & Object Prototypes* books — free, the best deep dive there is
- [javascript.info — Closures](https://javascript.info/closure) and [javascript.info — Prototypes](https://javascript.info/prototypes): pedagogical, with corrected exercises
- Practice: predict the output of `this`/closure snippets before pasting them into the console — the exact format of interview questions
