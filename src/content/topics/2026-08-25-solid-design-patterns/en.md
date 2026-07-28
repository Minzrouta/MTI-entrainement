---
title: "SOLID, design patterns & clean architecture"
date: "2026-08-25"
category: "Architecture"
level: "Intermédiaire"
summary: "The 5 SOLID principles with violations and fixes, the patterns you actually meet in interviews, and knowing when NOT to abstract — the architecture question comes up in almost every internship interview."
---

## The essentials

**SOLID** is an acronym for five object-oriented design principles, popularized by Robert C. Martin. They are not laws: they are heuristics for getting code that is **easy to change** — the real quality criterion for software that lives on.

- **S — Single Responsibility**: a class has only one reason to change. Violation: an `Invoice` class that computes the total AND generates the PDF AND sends the email. Fix: three classes (`Invoice`, `InvoicePdfRenderer`, `InvoiceMailer`) — when the PDF format changes, only one class moves.
- **O — Open/Closed**: open for extension, closed for modification. Violation: a `switch (paymentType)` you extend for every new payment method. Fix: a `PaymentMethod` interface and one class per payment method — you add code, you don't modify it.
- **L — Liskov Substitution**: a subtype must be usable anywhere its parent is, without surprises. Classic violation: `Square extends Rectangle` where `setWidth` also changes the height — code handling a `Rectangle` breaks. Fix: don't inherit, or model differently (two distinct types).
- **I — Interface Segregation**: several small, specific interfaces rather than one big one. Violation: `Machine` with `print()`, `scan()`, `fax()` — the entry-level printer must implement `fax()` by throwing. Fix: separate `Printer`, `Scanner`, `Fax`; each class implements what it can actually do.
- **D — Dependency Inversion**: depend on abstractions, not concrete implementations. Violation: `OrderService` doing a hardcoded `new MySqlOrderRepository()` — impossible to test without MySQL. Fix: `OrderService` receives an `OrderRepository` (interface) through its constructor.

## How it works

The common thread of all five principles: **isolate what changes from what doesn't**, and point dependencies toward the stable part. That's exactly what **hexagonal architecture** (ports & adapters) formalizes: the business domain at the center, with zero technical dependencies; around it, interchangeable adapters that talk to the outside world.

```text
        ┌──────────────────────────────────┐
        │            ADAPTERS              │
        │  HTTP (Express)   CLI    Tests   │
        │        │           │       │     │
        │        ▼           ▼       ▼     │
        │  ┌───── ports (interfaces) ────┐ │
        │  │                             │ │
        │  │       BUSINESS DOMAIN       │ │
        │  │   (rules, entities, use     │ │
        │  │    cases — zero framework)  │ │
        │  │                             │ │
        │  └───── ports (interfaces) ────┘ │
        │        │           │       │     │
        │        ▼           ▼       ▼     │
        │  Postgres      Stripe    SMTP    │
        └──────────────────────────────────┘
    Rule: the arrows point toward the center.
```

The domain defines **ports** (interfaces: `OrderRepository`, `PaymentGateway`); the infrastructure provides **adapters** that implement them (`PostgresOrderRepository`, `StripeGateway`). Switching databases or testing in memory = writing an adapter, without touching the business logic. It's the D principle applied at application scale.

**Dependency injection** is the concrete mechanism: instead of the class building its dependencies, you provide them from the outside (usually via the constructor). A "DI container" (Spring, NestJS) automates the wiring, but the principle stands without any framework.

```typescript
// Port: the domain declares what it needs, nothing more
interface OrderRepository {
  save(order: Order): Promise<void>;
}

// Business use case: no idea Postgres, Stripe or Express exist
class PlaceOrder {
  // the dependency is INJECTED: never `new PostgresRepo()` here
  constructor(private readonly repo: OrderRepository) {}

  async execute(order: Order): Promise<void> {
    if (order.items.length === 0) throw new Error("Empty order");
    await this.repo.save(order); // we talk to the port, not the adapter
  }
}

// Composition root: the ONLY place that knows the concrete types
const placeOrder = new PlaceOrder(new PostgresOrderRepository(pool));

// In tests: a fake in-memory repo, zero database
const testable = new PlaceOrder(new InMemoryOrderRepository());
```

> 💡 **The connection to make** — DI (injection, the mechanism) implements the D of SOLID (inversion, the principle). Naming both and telling them apart is exactly the level expected from an internship candidate.

## Key concepts to master

The GoF patterns you **actually** meet (nobody cares about all 23 by heart):

| Pattern | Intent | Concrete example |
|---|---|---|
| Factory | Centralize object creation | `createLogger(env)` → console in dev, JSON in prod |
| Strategy | Make an algorithm interchangeable | Shipping cost: standard / express / pickup |
| Observer | Notify subscribers of an event | `addEventListener`, signals, Node event emitters |
| Adapter | Reconcile two interfaces | Wrapping Stripe behind your `PaymentGateway` port |
| Singleton | One global instance | DB connection pool — handle with suspicion |
| Dependency injection | Provide dependencies from outside | NestJS/Spring constructors, example above |

Why be wary of the **singleton**: it's global state in disguise. It couples every piece of code that calls it, makes tests interdependent (state leaks from one test to the next) and hides dependencies (nothing in the signature says the class uses it). The legitimate need (a single pool instance) is better solved by creating the object once at startup and **injecting** it — single instance, no global access.

And the essential counterweight: **YAGNI** (*You Aren't Gonna Need It*). An abstraction is paid for upfront (indirection, files, mental load) against a hypothetical benefit. The good heuristic: abstract at the **second or third real occurrence**, not the first hunch — a premature abstraction that turns out wrong costs more than temporary duplication, because you have to unwind it everywhere.

> ⚠️ **Over-engineering** — an interface with a single implementation "just in case", a factory for one product, five layers for a CRUD: that's cargo-cult SOLID. In an interview, saying "I only abstract at the second real implementation" scores more points than reciting the 23 GoF patterns. Senior interviewers have all been paged at 3am by an unreadable "clean" architecture.

## In an interview

**"Explain SOLID with an example."** — Walk through the acronym in one sentence each, then go deep on ONE principle with violation + fix. Most compelling: S (the do-everything class → split by reason to change) or D (the hardcoded `new` → injection through an interface, then segue into testability).

**"What is dependency injection, and why?"** — Providing dependencies from the outside (constructor) instead of building them inside. Three benefits: testability (inject a fake), decoupling (depend on an interface), flexibility (swap implementations without touching the class). Bonus: the DI container is just automation, the principle exists without it.

**"What design pattern have you used recently?"** — Prepare a true story. Strategy is the easiest to tell: "three ways of computing X, a switch that kept growing, I replaced it with an interface and three implementations — adding a mode = adding a class". Concrete beats catalog.

**"Why is the singleton called an anti-pattern?"** — Hidden global state: tight coupling, interdependent tests, dependencies invisible in signatures. The alternative: create a single instance at startup and inject it — same guarantee, none of the drawbacks.

**"What is hexagonal architecture?"** — Business domain at the center with no technical dependency; it defines ports (interfaces); infrastructure provides adapters (DB, HTTP, APIs). Dependencies point toward the center. Concrete benefit: test the business logic without a DB, swap infrastructure without touching the rules.

## Pitfalls & misconceptions

- **"More patterns = better"** — no: a pattern is a named solution to a recurring problem. Without the problem, the pattern is noise. The simplest code that works wins.
- **"SOLID means interfaces everywhere"** — no: an interface is justified when several implementations exist (or will very soon), or when you need substitution in tests. A single-implementation interface is free indirection.
- **"Inheritance is OOP so it's good"** — inheritance is the strongest coupling there is; composition is almost always preferable (*composition over inheritance*). Liskov is precisely the principle you violate by inheriting too eagerly.
- **Confusing the pattern with the library** — `addEventListener` IS the observer pattern; React hooks resemble strategy/observer. Naming the patterns inside tools you already use impresses more than theoretical UML.
- **Applying hexagonal to a 500-line CRUD** — clean architecture has an entry cost; on a small project, a simple layered split (routes / services / repositories) is more than enough.

## Going further

- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns): the best illustrated catalog, free
- [The Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html): the founding article
- [Hexagonal Architecture — Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/): ports & adapters at the source
- Concrete exercise: take one of your projects, find a growing `switch` or a hardcoded `new` inside a service, and refactor it into strategy or injection — that's the story to tell in the interview
