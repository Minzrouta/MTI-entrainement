---
title: "React: Virtual DOM, hooks & reconciliation"
date: "2026-09-02"
category: "Web"
level: "Intermédiaire"
summary: "UI = f(state), diffing, keys, useState/useEffect and their traps: the core of React exactly as you'll be asked about it in a front-end interview — with model answers."
---

## The essentials

React rests on one simple idea: **the UI is a function of state** — `UI = f(state)`. You never manipulate the DOM by hand ("add this `<li>`, change this class"): you describe what the interface *should look like* for a given state, and React makes the real DOM converge to that description. It's the shift from **imperative** (jQuery) to **declarative**.

To get there, every component returns JSX — syntactic sugar for `React.createElement` calls that produce lightweight JavaScript objects: the **Virtual DOM**. On every state change, React recomputes this object tree, **compares it to the previous one** (diffing) and applies to the real DOM only the strictly necessary mutations. Creating and comparing JS objects is nearly free; manipulating the real DOM is slow.

**Hooks** (since React 16.8) are the API that gives function components state (`useState`), side effects (`useEffect`) and memoization (`useMemo`, `useCallback`) — without classes.

## How it works

An update happens in two distinct phases:

1. **Render**: React calls your component functions and gets a new Virtual DOM. This phase must be **pure** (no side effects): React may interrupt it, replay it or throw it away — detecting impurities is why StrictMode double-renders in dev.
2. **Commit**: React compares the old and new trees (**reconciliation**) and applies the minimal list of mutations to the real DOM, synchronously. Then the browser paints, then the `useEffect`s run.

```text
setState() ──▶ RENDER (pure, interruptible)
               components() → new Virtual DOM
                    │
                    ▼  diff old vs new
               (reconciliation) → minimal mutations
                    │
                    ▼
               COMMIT (synchronous) → real DOM updated
                    │
                    ▼
               browser paint → useEffect
```

An exact diff of two trees would cost O(n³); React brings it down to **O(n)** with two heuristics:

- **Different type at the same position** (`<div>` → `<span>`, or `CompA` → `CompB`): React unmounts the whole subtree (local state lost) and rebuilds it.
- **Same type**: React keeps the node, updates only the changed props, then recurses down.

For **lists**, these heuristics aren't enough: without a marker, React compares position by position. **Keys** give each element a stable identity: React detects that an element was moved, inserted or removed, and moves the DOM node instead of rewriting it — preserving its state (input value, focus, animation).

> 🎤 **In an interview** — "explain the Virtual DOM" is THE React question. Answer in three steps: (1) a representation of the UI as JS objects, cheap to recreate; (2) on every state change, React diffs the new tree against the old one; (3) only the differences are applied to the real DOM, the slow part. Close with the nuance that sets you apart: the Virtual DOM isn't "faster than the DOM" — it's a declarative model at an acceptable cost.

## Key concepts to master

| Hook | Role | Classic trap |
|---|---|---|
| `useState` | Local state, triggers the re-render | Mutating the object instead of creating a new one |
| `useEffect` | Side effect after commit | Missing deps (stale values) or no deps array (infinite loop) |
| `useMemo` | Memoize an expensive computation | Sprinkling it everywhere "by reflex": memoization has a cost |
| `useCallback` | Stable function reference | Useless if the child isn't `React.memo` |
| `useRef` | Mutable value without re-render | Reading/writing `.current` during render |
| `useContext` | Read a shared value | Every consumer re-renders on each change |

**Rules of hooks**: called only at the **top level** of the component (never in an `if`, a loop or a nested function), and only from a React component or a custom hook. Technical reason: React matches each `useState`/`useEffect` to its value **by call order**. A conditional hook shifts the list and everything gets mixed up.

`useEffect` synchronizes the component with an external system (fetch, WebSocket, timer, manual DOM). The full anatomy:

```jsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    // runs AFTER the commit, whenever `query` changes
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      });

    // cleanup: executed BEFORE the next run of the
    // effect, and when the component unmounts
    return () => controller.abort(); // cancels the stale request
  }, [query]); // deps: only re-run the effect if query changes

  return (
    <ul>
      {results.map((r) => (
        <li key={r.id}>{r.name}</li> // stable key: the id, not the index
      ))}
    </ul>
  );
}
```

`useMemo`/`useCallback` are useful in two cases: (1) a genuinely expensive computation, (2) reference stability gates something else — a `React.memo` child, another hook's deps. Anywhere else it's noise: measure before optimizing (React DevTools Profiler).

**Where should state live?** Climb the ladder in order:

- **Lifting state up**: two siblings share a piece of state → move it into the common parent, passed down as props. Covers 80% of cases.
- **Context**: a truly global, rarely changing value (theme, logged-in user, language) → avoids *prop drilling*. Careful: every change re-renders all consumers.
- **State managers** (Redux Toolkit, Zustand) or server state (TanStack Query): when global state gets complex or mostly comes from the server. For an internship interview, knowing *where these tools fit* is enough.

> 💡 **Reflex to show** — before adding a `useEffect`, ask whether it's needed at all: a value derived from state is computed during render (in a `useMemo` if needed), not in an effect that calls `setState`. The official docs page "You Might Not Need an Effect" is an excellent filter.

## In an interview

**"Explain the Virtual DOM to me."** — A lightweight representation of the UI as JavaScript objects. On every state change, React rebuilds this tree (cheap), compares it to the previous version (diffing) and applies to the real DOM — the slow part — only the differences. Benefit: a declarative `UI = f(state)` model without paying for a full DOM re-render. Nuance to land: it isn't inherently faster than hand-optimized DOM code, it's a productivity/performance trade-off.

**"How does React decide what to update?"** — Through reconciliation, an O(n) diff based on two heuristics: different type at a given position → subtree unmounted and recreated (local state lost); same type → changed props updated, then recurse down. In lists, keys provide the stable identity that lets React detect moves, insertions and deletions.

**"Why shouldn't you use the index as a key?"** — Because the index identifies the position, not the element. Insert an element at the top: every index shifts, React thinks each element changed content and attaches local and DOM state (input value, focus, checked box) to the wrong element. Correct key: a stable id from the data. The index is only tolerable for a static list — never sorted, filtered or modified.

**"What is useEffect's dependency array for?"** — It tells React when to re-run the effect: on every render if absent, only on mount if `[]`, whenever a listed value changes otherwise. Every reactive value read inside the effect must be listed, or you get a *stale closure* (captured outdated values). The returned cleanup runs before each re-run and on unmount — that's where you cancel fetches, timers and subscriptions.

**"When are useMemo and useCallback useful?"** — `useMemo` memoizes a computation's result, `useCallback` a function's reference. Useful when the computation is expensive or when reference stability gates a `React.memo` child or another hook's deps. Default to not using them: each memoization costs memory and a deps comparison, and the Profiler should justify the optimization.

## Pitfalls & misconceptions

> ⚠️ **key=index, trap #1** — on a sortable, filterable or editable list, `key={index}` mixes up row state: the value typed in row 2's input ends up in row 3 after a deletion, because React attaches state to the key, not the content. This is THE trap interviewers make you explain, often on a code snippet to fix.

- **Mutating state**: `items.push(x); setItems(items)` doesn't re-render — same reference, and React compares with `Object.is`. Always create a new object/array: `setItems([...items, x])`.
- **`useEffect` without a deps array calling `setState`** → the effect re-runs on every render, the `setState` re-renders, infinite loop. Classic symptom: the API hammered with requests.
- **`setState` is not synchronous**: the variable keeps its old value until the next render, and updates are batched. To depend on the previous value: `setCount(c => c + 1)`.
- **"The Virtual DOM makes React faster than the DOM"** — no, it's an extra layer. It makes the declarative model viable by avoiding useless rewrites; finely hand-optimized DOM code will always be faster, but unmaintainable at scale.

## Going further

- [react.dev — Learn React](https://react.dev/learn): the official tutorial, remarkably well done
- [Render and Commit](https://react.dev/learn/render-and-commit) and [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state): reconciliation and keys explained in depth
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect): the best anti-`useEffect` filter
- [React Developer Tools](https://react.dev/learn/react-developer-tools): profile re-renders before optimizing
