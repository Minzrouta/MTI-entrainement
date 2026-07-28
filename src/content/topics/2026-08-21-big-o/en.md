---
title: "Complexity & Big O"
date: "2026-08-21"
category: "CS"
level: "Fondamental"
summary: "The question comes after every coding exercise: \"what's the complexity?\". Knowing how to answer — and spotting the O(n²) hidden in an innocent .includes() — changes an interview's verdict."
---

## The essentials

**Big O** notation describes how an algorithm's cost (time or memory) **grows with the input size** `n`. It doesn't measure seconds: it predicts **scaling**. An algorithm that's fast on 100 elements but O(n²) will blow up on a million — and that's exactly what an interviewer wants to check: do you see the explosion coming *before* production?

Big O keeps the **dominant term** and **drops constants**: `3n² + 50n + 1000` → O(n²). For small `n`, constants win (insertion sort beats merge sort on 10 elements); asymptotically, the complexity class always wins.

The scale to know, with a concrete order of magnitude (≈10⁸ simple operations/second):

```text
n = 1,000,000 elements
─────────────────────────────────────────────
O(1)        1 op            instant
O(log n)    ~20 ops         instant
O(n)        10⁶ ops         ~10 ms
O(n log n)  2×10⁷ ops       ~0.2 s
O(n²)       10¹² ops        ~3 hours
O(2ⁿ)       10³⁰¹⁰³⁰ ops    never
─────────────────────────────────────────────
Going from O(n²) to O(n log n) is not an
optimization: it's the difference between
"it runs" and "it will never finish".
```

Canonical examples: O(1) = `arr[i]` access, hash map lookup. O(log n) = binary search (halve the space at every step). O(n) = array traversal, `Math.max(...arr)`. O(n log n) = the good sorts (merge sort, and modern engines' `Array.prototype.sort`). O(n²) = double loop over the same collection (compare all pairs). O(2ⁿ) = exploring all subsets, naive recursive Fibonacci.

## How it works

**Time vs space.** Time complexity counts operations; **space** complexity counts the *extra* memory allocated. Merge sort is O(n log n) in time but O(n) in space (temporary arrays); an in-place sort like heapsort is O(1) in space. Frequent trap: **recursion consumes stack** — a recursive descent of depth n is O(n) in space even without allocating a single array.

**Best, worst, average case.** The same algorithm has several faces: quicksort is O(n log n) on average but **O(n²) worst case** (systematically bad pivot, e.g. an already-sorted array with a naive pivot); linear search is O(1) at best (first element), O(n) at worst. By default, Big O refers to the **worst case** — unless stated otherwise, that's what you announce in an interview. Hash maps are the exception quoted on average: O(1) average, O(n) worst (all keys colliding).

**Amortized complexity.** A `push` on a dynamic array (ArrayList, `vector`, JS array) is O(1)… except when capacity is full: reallocate and copy everything, O(n). But since capacity **doubles** each time, that cost happens increasingly rarely: spread over N calls, total cost stays proportional to N. We say push is **amortized O(1)** — occasionally expensive, guaranteed cheap on average over the sequence.

The complexities of the structures we handle every day:

| Structure | Index access | Search | Insertion | Deletion |
|---|---|---|---|---|
| Dynamic array | O(1) | O(n) | Amortized O(1) at end, O(n) elsewhere | O(n) (shifting) |
| Linked list | O(n) | O(n) | O(1) (known node) | O(1) (known node) |
| Hash map / Set | — | O(1) avg, O(n) worst | O(1) avg | O(1) avg |
| Balanced tree (AVL, red-black) | — | O(log n) | O(log n) | O(log n) |
| Heap (priority queue) | O(1) min/max | O(n) | O(log n) | O(log n) (root) |

> 💡 **The hidden question behind the table** — "why is a hash map O(1)?": the hash function turns the key into a bucket index, direct access. The O(n) worst case happens when too many keys land in the same bucket (collisions) — good implementations resize to avoid it.

## Key concepts to master

Interview trap number one: the **hidden nested loop**. `includes`, `indexOf`, `find`, the spread `[...arr]`, `concat`, `slice`… are all O(n) traversals. Slipping one inside a loop manufactures invisible O(n²):

```javascript
// ❌ O(n × m): includes() is a hidden linear scan
//    → 10,000 × 10,000 = 10⁸ operations, already sluggish
function common(a, b) {
  return a.filter(x => b.includes(x));
}

// ✅ O(n + m): we pay a Set construction in O(m),
//    then every membership test is O(1)
function commonFast(a, b) {
  const setB = new Set(b);          // O(m), once
  return a.filter(x => setB.has(x)); // n tests in O(1)
}
```

The typical refactor — "I trade memory (the Set, O(m) space) for time" — is exactly the expected sentence. Other classics of the same trap:

- **String concatenation in a loop**: in Java/C#/Python, `s += word` copies the string each iteration → O(n²). Use a `StringBuilder` / `"".join(list)`.
- **`delete`/`splice` in a loop** over an array: each removal shifts the rest, O(n) per removal.
- **A query inside a loop**: the famous ORM **N+1** problem is the database version of hidden O(n²) — one query per element instead of a single `WHERE id IN (...)`.
- **Two successive loops ≠ nested**: `for` then `for` = O(n + n) = O(n). Only nesting multiplies.

And to reason fast: one simple loop over n → O(n); two nested loops over the same input → O(n²); halving the problem at each step → O(log n); doing O(n) work at each level of a halving → O(n log n); trying every combination → exponential.

> 🎤 **In an interview** — after EVERY coding exercise, the question drops: "what's the complexity of your solution?". Get ahead of it: announce it yourself as you finish ("it's O(n) time, O(n) space because of the Set"). Then the bonus that scores: "we could get to O(1) space if the array were sorted, with two pointers". Anticipating the question is what they were really testing.

## In an interview

**"What's the complexity of binary search, and why?"** — O(log n): each comparison eliminates half of the remaining search space; you need log₂(n) halvings to reach one element (20 steps for a million). Non-negotiable precondition: the array is **sorted** — otherwise you pay an O(n log n) sort first.

**"Why do people say you can't sort faster than O(n log n)?"** — It's the lower bound for **comparison-based** sorts: n! possible permutations, each comparison yields one bit of information, so you need log₂(n!) ≈ n log n comparisons. Non-comparison sorts (counting sort, radix sort) get to O(n + k) when the keys allow it — mentioning that shows you know both the limit AND its workaround.

**"Amortized complexity: what is it, give an example?"** — The guaranteed average cost over a sequence of operations, even if some are expensive. Example: a dynamic array `push`, amortized O(1) despite occasional O(n) reallocations, because capacity doubling makes those reallocations exponentially rare.

**"Your code is O(n²), how would you improve it?"** — The method: identify the expensive repeated operation (often an O(n) search inside the loop), replace it with an O(1)-lookup structure (hash map/Set) or pre-sort to use binary search/two pointers. The trade-off to state: you exchange memory space for time.

**"Quicksort is O(n²) worst case — why is it still used?"** — Because the worst case is vanishingly rare with a random or median pivot, its constants are excellent (cache-friendly, in place), and average O(n log n) + good constants often beats a theoretically safer merge sort. Real libraries mitigate it (introsort switches to heapsort if recursion degenerates).

## Pitfalls & misconceptions

> ⚠️ **Big O is not a stopwatch** — O(n) with a huge constant (I/O, allocations) can lose to a compact O(n²) on small inputs. Big O predicts *growth*, not absolute speed: at n = 20, the "naive" algorithm is often the right choice (and the most readable).

- **Forgetting space**: announcing "O(n)" without saying time or space. A hash-map solution is O(n) time AND O(n) space; the two-pointer version on a sorted array is O(1) space. Always give both.
- **"Free" recursion**: every call pushes a stack frame. Naive recursive Fibonacci is O(2ⁿ) time AND O(n) stack space; memoization brings it down to O(n).
- **`sort()` isn't free**: slipping in a sort "to simplify" puts an O(n log n) floor under the whole solution. Say it explicitly ("I sort first, so O(n log n) overall").
- **Confusing O, Θ, Ω**: Big O is an upper bound. Saying "linear search is O(n²)" is *technically* true but useless. In interviews, O is used as "the tight order of magnitude of the worst case" — that's common usage; knowing Θ exists is a bonus.
- **Ignoring n vs m**: with two inputs of different sizes, write O(n × m), not O(n²) — a precision that matters for a `filter` + `includes` over two distinct arrays.

## Going further

- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/): the poster of complexities per structure and per sort
- [CLRS — Introduction to Algorithms](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) ch. 3: the clean formal definition
- [NeetCode](https://neetcode.io/): practice announcing the complexity after every solved problem
- Measure it yourself: `console.time()` on `common` vs `commonFast` with 10,000 elements — watching an O(n²) die for real is worth every lecture
