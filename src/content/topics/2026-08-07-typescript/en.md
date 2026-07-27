---
title: "TypeScript: typing that changes everything"
date: "2026-08-07"
category: "Web"
level: "Fondamental"
summary: "Inference, narrowing, generics, unknown vs any: what TypeScript's type system really does for you — and the questions that come up in almost every front-end and Node interview."
---

## The essentials

TypeScript is a **typed superset of JavaScript**: any valid JS code is valid TS, extended with type annotations checked **at compile time**. The compiler (`tsc`) analyzes the code, reports inconsistencies, then emits plain JavaScript — **types are entirely erased at runtime**.

```text
app.ts ──tsc──▶ app.js ──node / browser──▶ execution
   │               │
 types checked    types erased: no
 at compile time  runtime checking
```

Why type at all? Three concrete benefits: whole classes of bugs (`undefined is not a function`, a typo in a property name, the wrong argument passed to a function) are caught **before anything runs**; **refactoring becomes safe** — rename a property and the compiler lists every place to fix; and **autocompletion becomes living documentation** — the IDE knows exactly what an object contains, which beats a stale README.

On a team project, it's above all a **contract between developers**: a function's signature says what it expects and what it returns, and the compiler enforces the contract.

## How it works

TypeScript's type system is **structural** (statically checked duck typing), not nominal like Java or C#. Two types are compatible if their **structures** are, regardless of their names: an object `{ name: string, age: number }` is assignable to an `interface Person { name: string }` — it has everything required, and more. That's what makes TS a natural fit for typing existing JS, but it surprises people coming from Java: two identical interfaces with different names are interchangeable.

Second pillar: **inference**. You don't annotate everything — `const x = 42` infers `number`, `[1, 2].map(n => n * 2)` infers `number[]`. Best practice: annotate the **boundaries** (function parameters, public return values, APIs) and let inference handle the inside.

Third pillar: **unions and narrowing**. A `string | null` type forces you to handle the `null` case before calling `.toUpperCase()`. The compiler **narrows** the type through control flow: after an `if (typeof x === "string")`, `x` is a `string` inside the branch. The narrowing toolbox: `typeof`, `instanceof`, the `in` operator, comparisons on a discriminant field (`if (event.kind === "click")` on a **discriminated union**), and custom **type guards** (`function isUser(x: unknown): x is User`).

A crucial point to state in an interview: typing is a **compile-time-only** tool. At runtime, there's nothing but JavaScript. An API response annotated as `User` is **not checked** — if the server returns something else, TS will never see it.

> 💡 **Validate at the boundaries with zod** — you describe a runtime schema (`z.object({ name: z.string() })`), `schema.parse(data)` actually validates the data, and `z.infer<typeof schema>` derives the static type from it. One source of truth, checked at both levels.

## Key concepts to master

- **`interface` vs `type`**: nearly interchangeable for describing an object. `interface` supports **declaration merging** (two declarations with the same name merge, useful to augment a library) and `extends`; `type` is more general: unions (`type Status = "ok" | "error"`), tuples, mapped types. Honest answer: team convention — `interface` for public object shapes, `type` for the rest.
- **Generics**: parameterized types that stay precise without duplication. Real example: `function first<T>(arr: T[]): T | undefined { return arr[0]; }` — called on a `string[]`, it returns `string | undefined`, not `any`. With a constraint (`K extends keyof T`): impossible to ask for a key that doesn't exist.
- **Utility types**: `Partial<T>` (everything optional — a PATCH payload), `Pick<T, "id" | "name">` (a subset), `Omit<T, "password">` (everything except — a DTO without a sensitive field), `Record<string, number>` (a typed dictionary). Knowing them avoids redeclaring types by hand.
- **`unknown` vs `any`**: `any` **switches off** the compiler — everything is allowed, and it spreads. `unknown` is the opposite: "prove it before touching it" — it forces narrowing before use. For external input (JSON, `catch`), `unknown` is the right choice.
- **Strict mode**: `"strict": true` in `tsconfig.json` enables a bundle of options including **`strictNullChecks`** — without it, `null` and `undefined` are assignable to everything, and TS loses half its value. `noImplicitAny` forbids silent `any`s. Every new project starts in strict mode, non-negotiable.
- **`as` (type assertion)**: tells the compiler "trust me", with zero checking. Legitimate occasionally (DOM, test fixtures), dangerous as a reflex (see Pitfalls).

Generics and narrowing combined in the canonical example:

```ts
// A generic: Result<T> stays precise whatever T is
type Result<T> =
  | { ok: true; value: T }       // success variant
  | { ok: false; error: string } // failure variant

function unwrap<T>(r: Result<T>): T {
  if (r.ok) {
    return r.value; // narrowing: here r is { ok: true; value: T }
  }
  throw new Error(r.error); // and here { ok: false; error: string }
}

const n = unwrap({ ok: true, value: 42 }); // n: number, not any
```

The type system's three "extreme" types, not to be confused:

| | `any` | `unknown` | `never` |
|---|---|---|---|
| Means | "Do whatever you want" | "Prove it before using it" | "Cannot exist" |
| Assignable to everything | Yes (danger) | No | Yes (empty set) |
| Everything assignable to it | Yes | Yes | No |
| Typical use | Debt, migration | External input, `catch` | `switch` exhaustiveness |

> 🎤 **In an interview** — the rule that fits in one sentence: `unknown` at the boundaries, `any` never, `never` to prove a `switch` covers every case. Quoting it as-is lands well.

## In an interview

**"What does TypeScript bring over JavaScript?"** — Compile-time error detection (typos, mistyped arguments, unhandled `null`), safe project-wide refactoring, reliable autocompletion and navigation in the IDE, and an explicit contract between modules and between developers. All with no runtime cost: `tsc` emits plain JS.

**"Difference between `interface` and `type`?"** — For an object, almost none. `interface`: declaration merging, `extends`, sometimes more readable error messages. `type`: unions, intersections, tuples, mapped types. Citing a convention (interface for object shapes, type for unions) shows you've actually practiced.

**"`any` vs `unknown`?"** — `any` disables checking and spreads silently; `unknown` accepts anything as input but forbids any use until you've narrowed the type (typeof, type guard, zod schema) — see the table above.

**"How does TypeScript handle data from an external API?"** — It doesn't: types are erased at runtime, so annotating `fetch` with `Promise<User>` is an unkept promise. The right answer: validate at the boundaries with zod (or valibot, io-ts), and derive the static type from the schema with `z.infer` so there's only one source of truth.

**"Explain generics with an example."** — `function first<T>(arr: T[]): T | undefined`: the return type depends on the input type, with no loss of precision and no duplication. Bonus: a `K extends keyof T` constraint for safe property access, or an `ApiResponse<T>` reused across all routes.

## Pitfalls & misconceptions

> ⚠️ **`as` lies to the compiler** — an assertion checks nothing: `data as User` merely silences `tsc`, and the double hop `x as unknown as Y` is a red flag in code review. Every `as` is an unverified promise the runtime will eventually test for you.

- **"TS validates my data"** — no: checking is static. `JSON.parse` returns `any`, an API response is whatever the server decided. Without runtime validation (zod), boundary typing is declarative, not guaranteed.
- **`any` that spreads** — a single `any` parameter and the whole call chain loses its typing with no error or warning (except `noImplicitAny`). Track it with `eslint` (`no-explicit-any`) and type the entry points.
- **Disabling `strictNullChecks` "to go faster"** — that's giving up protection against JS's most common error. Migrating an existing project: enable strict and fix incrementally, not the other way around.
- **`enum`**: generates runtime code (unlike the rest of TS) and has surprising behaviors; literal unions (`type Role = "admin" | "user"`) or `as const` cover most needs.
- **Confusing compile errors with runtime errors**: a `// @ts-ignore` silences the compiler, not the bug.

## Going further

- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — the official reference, especially the [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) and [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) chapters
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — the full list, worth reading once
- [zod documentation](https://zod.dev/) — runtime validation + type inference
- The [TS Playground](https://www.typescriptlang.org/play) to experiment: write a discriminated union and watch narrowing happen as you hover over variables
