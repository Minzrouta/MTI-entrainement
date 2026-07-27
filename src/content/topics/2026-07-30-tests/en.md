---
title: "Testing your code: from unit to E2E"
date: "2026-07-30"
category: "Qualité"
level: "Fondamental"
summary: "Test pyramid, mocks, TDD, coverage: recruiters love asking \"how do you test your code?\" — here's how to answer with precision instead of generalities."
---

## The essentials

Automated tests have one purpose: **catching regressions before users do**, and fast enough that you dare to change the code. Untested code isn't "not tested yet", it's **impossible to refactor with confidence** — every change is a gamble.

The reference mental model is the **test pyramid**: many **unit tests** (fast, isolated, precise), fewer **integration tests** (several components together, with real dependencies), very few **E2E tests** (the whole application driven like a user). The higher you climb, the more realistic the test — and the slower, the more expensive to maintain, and the harder to diagnose when it fails. A broken unit test points at the guilty function; a broken E2E test just says "something is wrong somewhere".

```text
           ╱╲
          ╱E2E╲        few — slow, realistic
         ╱──────╲       (critical journeys)
        ╱ Integra-╲    some — real
       ╱   tion    ╲    dependencies (DB, API)
      ╱─────────────╲
     ╱  Unit tests   ╲ many — fast, isolated,
    ╱─────────────────╲ business logic
```

> 💡 **The right question** — never "unit or E2E?" in the abstract, but "what is the lowest test in the pyramid that would catch this bug?". The lower it sits, the faster the feedback and the sharper the diagnosis.

In an interview, nobody expects an intern to recite Kent Beck — but you should be able to say **what to test at which level and why**.

## How it works

A good unit test follows the **AAA** pattern: **Arrange** (prepare the data and the object under test), **Act** (call the function), **Assert** (check the result).

```js
import { describe, it, expect } from "vitest"; // same API as Jest
import { computeTotal } from "./cart";

describe("computeTotal", () => {
  it("applies a 10% discount above €100", () => {
    // Arrange — prepare the data
    const cart = [{ price: 80 }, { price: 40 }];

    // Act — a single action
    const total = computeTotal(cart);

    // Assert — check observable behavior, not internals
    expect(total).toBe(108); // €120 − 10%
  });
});
```

Three non-negotiable qualities:

- **Isolation**: the test depends neither on the network, nor the database, nor the clock, nor another test. Tests must be able to run in parallel and in any order.
- **Determinism**: same code = same result, every time. The enemies: `Date.now()`, `Math.random()`, timeouts, unspecified iteration order. Inject time and randomness as dependencies.
- **Test behavior, not implementation**: verify *what* the function does (inputs → outputs, observable effects), not *how* it does it. An internal refactoring must not break the tests — otherwise they slow change down instead of protecting it.

To isolate, you replace dependencies with **test doubles** — and precise vocabulary makes a good impression:

| Double | What it does | Used for | Example |
|---|---|---|---|
| **Stub** | returns pre-programmed answers | feeding the test with data | `getUser` always returns Alice |
| **Mock** | expects precise **interactions** | verifying a side effect | the test fails if `sendEmail` isn't called with the right arguments |
| **Spy** | records calls without changing behavior | inspecting after the fact | how many calls, with what arguments |
| **Fake** | a real but simplified implementation | testing without the infra | in-memory repository (`Map` instead of Postgres), more robust than a mock |

**TDD (Test-Driven Development)** reverses the writing order: **red** (write a failing test), **green** (the minimal code that makes it pass), **refactor** (clean up with tests green). What it actually brings: you define the expected behavior *before* coding (which forces you to clarify the API), every line of code exists to make a test pass, and you get a safety net for free. What it isn't: a religion — plenty of excellent developers practice partial TDD (on complex business logic, not on glue code).

## Key concepts to master

- **Integration tests with real dependencies**: mocking a complex SQL query mostly tests your imagination. **Testcontainers** starts a real Postgres (or Redis, Kafka…) in a throwaway Docker container for the duration of the suite: you test real queries, real constraints, real transactions. Trade-off: a few seconds of startup for incomparable realism.
- **E2E with Playwright or Cypress**: the browser is driven like a user (fill the form, click, check the page). Playwright has become the default: multi-browser, native parallelization, **auto-waiting** (it waits for the element to be actionable instead of requiring `sleep` calls). Reserve E2E for critical journeys: signup, login, checkout — not every form variation.
- **E2E flakiness**: an E2E test sometimes fails with zero code changes — a race between test and rendering, leftover data, network. Antidotes: explicit waits on state (never `sleep(2000)`), per-test data isolation, stable selectors (`data-testid` rather than CSS).
- **Code coverage**: the percentage of lines executed by tests. Useful **as a trend** (coverage collapsing = testing has stopped) and to spot dead zones. Treacherous **as a target**: executing a line is not verifying it — an assertion-free test yields 100% coverage and 0% value. Goodhart's law: when coverage becomes the target, you write tests to cover, not to verify.
- **Tests in CI**: tests only truly exist if they run on every push and block the merge on failure. Unit tests on every commit, integration on every PR, E2E possibly on main or nightly if they're slow.

## In an interview

> 🎤 **In an interview** — "how do you test your code?" calls for an answer structured by level: unit tests on business logic (AAA, test doubles), integration with real dependencies (Testcontainers), E2E on critical journeys (Playwright), all in a CI that blocks the merge. Four sentences, question closed.

**"What makes a good unit test?"** — Fast (milliseconds), isolated (no network, no database, no execution-order dependency), deterministic, structured as Arrange-Act-Assert, and verifying observable behavior — not implementation details. Bonus: a good test fails for exactly one reason, and its name says which.

**"Mock vs stub?"** — The stub *provides* data to the test (pre-programmed answers); the mock *verifies* interactions (the test fails if the expected method wasn't called correctly). In one sentence: stub = state, mock = behavior. Adding fake (a simplified but real implementation) and spy (records without altering) shows you own the vocabulary.

**"Do you practice TDD? What does it bring?"** — Honest answer: red-green-refactor, mostly on non-trivial business logic. Concrete benefits: the API gets designed from the caller's point of view, the code is testable by construction, refactoring is protected. Saying you don't apply it mechanically everywhere (glue code, prototypes) is a plus, not a confession.

**"How do you test code that talks to a database?"** — Two levels: business logic in unit tests with a fake repository; real queries in integration tests against a real Postgres started by Testcontainers. Mocking the SQL driver is the trap: the test passes, the query is wrong.

**"Is 100% coverage a good goal?"** — No: coverage measures what is *executed*, not what is *verified*. Chasing 100% pushes you to test trivial code and write assertion-free tests. Better: high coverage on critical business logic, watched as a trend, and mutation testing if you genuinely want to measure assertion quality.

## Pitfalls & misconceptions

> ⚠️ **Mock overuse** — a test that mocks five dependencies and verifies every internal call no longer tests behavior: it transcribes the implementation. The smallest refactoring breaks ten tests that were all green for the wrong reasons. Prefer fakes, and test slightly larger units.

- **Testing the implementation**: verifying that a private method gets called, asserting on internal state… These tests obstruct the very refactoring they were supposed to enable.
- **`sleep()` in E2E tests**: the number one cause of flakiness. Always wait for a condition (element visible, request finished), never for a duration.
- **"Tests slow development down"** — true the first week, false from the first refactoring or the first regression bug avoided. The real cost is maintaining *bad* tests (implementation-coupled, flaky).
- **The inverted pyramid** (the "ice cream cone"): a suite dominated by slow, fragile E2E tests with few unit tests — 40-minute feedback, unusable failures. A classic symptom of code that can't be unit tested.

## Going further

- [Martin Fowler — The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html): the reference article, examples included
- [Playwright — documentation](https://playwright.dev/docs/intro) and [Testcontainers](https://testcontainers.com/) for realistic integration tests
- [Vitest](https://vitest.dev/guide/) or [pytest](https://docs.pytest.org/) depending on your stack: read at least the fixtures page
- Exercise: take one of your projects, write unit tests for the core business logic then one integration test with Testcontainers — and count how many bugs surface
