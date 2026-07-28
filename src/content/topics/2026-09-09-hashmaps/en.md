---
title: "Hashmaps in depth"
date: "2026-09-09"
category: "CS"
level: "Intermédiaire"
summary: "Buckets, collisions, load factor, hash flooding: understand what hides behind the O(1) — the highest-yield data structure in interviews, from theory quizzes to two-sum."
---

## The essentials

The hash table — `dict` in Python, `Map` in JavaScript, `HashMap` in Java, `unordered_map` in C++ — maps **keys** to **values** with insertion, lookup and deletion in **O(1) on average**. It's the most used structure in practice and the highest-yield one in interviews: half of all "optimize this code" exercises are solved by replacing a linear search with a hashmap.

The principle fits in one line: a **hash function** turns the key into an integer, reduced modulo the number of slots in the internal array (the **buckets**), and that index points directly to the data. No scanning of all keys: one computation, one array access.

But that O(1) is **on average**, not guaranteed. Collisions, load factor and resizing make all the difference between theory and reality — and that's exactly where an interview digs.

## How it works

The path of a `map.get("cat")`:

1. `hash("cat")` produces a large integer (fast, deterministic);
2. `index = hash mod capacity` brings it within the bounds of the internal array;
3. read the bucket at that index.

```text
hash("cat") = 0x51f2 ─▶ 0x51f2 mod 8 = 2

 [0] ─▶ ∅
 [1] ─▶ ("dog",4) ─▶ ∅
 [2] ─▶ ("cat",3) ─▶ ("act",7) ─▶ ∅
 [3] ─▶ ∅            ▲
 ...                 └── collision: two keys,
 [7] ─▶ ("zoo",1) ─▶ ∅   same bucket → chaining
```

Two distinct keys can land in the same bucket: that's a **collision**, and it's unavoidable — there are infinitely more possible keys than buckets (pigeonhole principle). Two main resolution families:

| | Chaining | Open addressing |
|---|---|---|
| Collision | list (or tree) inside the bucket | probe another slot (probing) |
| Memory | extra pointers and allocations | compact array, cache-friendly |
| Load factor | can exceed 1 | must stay < 1 |
| Deletion | simple (unlink the node) | tricky (tombstones) |
| Examples | Java `HashMap` | Python `dict`, Rust `HashMap` |

The **load factor** = number of elements / number of buckets. As it rises, collisions pile up and buckets grow longer. Past a threshold (0.75 for Java, ~0.66 for CPython), the table **resizes**: it allocates a larger array (usually ×2) and **rehashes every entry** — because `hash mod capacity` changes with the capacity.

> 💡 **Amortized O(n)** — a resize costs O(n), but it's triggered less and less often (after roughly n insertions). Spread over all insertions, the average cost stays O(1): it's exactly the dynamic array argument (`ArrayList`, `vector`). Saying "amortized O(1)" instead of "O(1)" in an interview is an instant bonus point.

## Key concepts to master

- **Worst case O(n)**: if all keys land in the same bucket (bad or adversarial hash function), the hashmap degenerates into a linked list. Java 8+ defends itself by turning an overcrowded bucket (≥ 8 entries) into a red-black tree: O(log n) worst case.
- **Hash flooding**: an attacker who knows the hash function can forge thousands of keys that all collide → every insertion becomes O(n) and the server parsing a JSON body or HTTP parameters collapses (denial of service, CVE-2011-4885 among others). Defenses: hashing with a per-process **random seed** (SipHash in Python, Ruby, Rust) and/or treeification (Java).
- **What makes a good key**: it must be **immutable** (or at minimum never mutate while it's in the map), and its equality and hash must be **consistent**: `a.equals(b)` ⟹ `hash(a) == hash(b)`. In Java, overriding `equals` without `hashCode` is the classic bug: two "equal" objects end up in different buckets and `get` finds nothing.
- **JS object vs `Map`**: the object only accepts string/symbol keys (everything else is coerced to a string), inherits from its prototype (`{}["toString"]` exists!) and is vulnerable to `__proto__` pollution if you store user-provided keys in it. `Map`: keys of any type, O(1) `.size`, guaranteed insertion order, better performance under heavy insertion/deletion. Simple rule: object = fixed-shape struct, `Map` = true dynamic dictionary.
- **Iteration order**: never guaranteed by the general contract (Java `HashMap`: arbitrary order, which can change after a resize). Python ≥ 3.7 and JS `Map` preserve insertion order — but never assume a *sorted* order: for that you need a tree (`TreeMap`).

> ⚠️ **A mutated key is a lost key** — insert a mutable object as a key, then modify a field that participates in the hash: the value is still in the map, but in the *wrong bucket*. `get` rehashes the key, looks in the new bucket, finds nothing. That's why Python forbids `list` as keys (unhashable) and only accepts immutable types like the tuple.

## In an interview

**"Why is a hashmap O(1) on average, and not always?"** — The hash gives the bucket index directly: one computation plus one array access, independent of n. "On average" because collisions exist: with a good hash function and a controlled load factor, each bucket holds O(1) elements; with a bad function (or against an adversary), everything lands in the same bucket and you degenerate to O(n).

**"Chaining or open addressing: which one to pick?"** — Chaining: simpler, tolerates a load factor > 1, but extra pointers and memory jumps. Open addressing: everything in one contiguous array, excellent for the CPU cache, but tricky deletion (tombstones) and very sensitive to the load factor. Modern performance-oriented implementations (Python `dict`, Rust `HashMap`) pick open addressing for memory locality.

**"What happens when the table fills up?"** — The load factor crosses its threshold (~0.75): allocate a ×2 array and rehash every entry. Occasional O(n), amortized O(1). Bonus: if the final size is known upfront, pre-sizing (`new HashMap<>(1024)`) avoids all intermediate resizes.

**"Object or Map in JavaScript?"** — Dynamic or non-string keys, need for `.size`, frequent insertions/deletions, user-provided data → `Map`. Fixed shape known upfront (config, DTO) → object. Mention prototype pollution: storing user input in a bare object is a risk, `Map` (or `Object.create(null)`) eliminates it.

**"What's the contract for a HashMap key in Java?"** — `equals` and `hashCode` overridden *together* and consistent (equal ⟹ same hash), stable while the object is in the map — hence preferably an immutable key (`String`, `Integer`, record).

The most classic exercise, two-sum, illustrates the hashmap reflex:

```js
// Naive: O(n²) — test every pair
function twoSumNaive(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i, j];
  return null;
}

// Hashmap: O(n) — a single pass
function twoSum(nums, target) {
  const seen = new Map();              // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];     // the complement we need
    if (seen.has(need))                // seen before? O(1)
      return [seen.get(need), i];
    seen.set(nums[i], i);              // store AFTER the check
  }                                    // (case need === nums[i])
  return null;
}
```

> 🎤 **In an interview** — "implement a frequency counter" (words in a text, characters in a string) is the most common warm-up: a map `element → count`, one pass, `map.set(x, (map.get(x) ?? 0) + 1)`. Be able to write it with your eyes closed in your language, then chain into the variants: top-k (counter + sort or heap), anagrams (compare two counters), deduplication (a `Set`, which is just a hashmap without values).

## Pitfalls & misconceptions

- **"Guaranteed O(1)"** — no: O(1) *on average* and *amortized*. Worst case O(n) (massive collisions), and a single insertion can cost O(n) (resize). For hard real-time, that's a real concern.
- **Assuming an iteration order** — code that works in Python (insertion order) and breaks in Java (arbitrary order, unstable after a resize). Need sorted order → `TreeMap` or a balanced tree, accepting the O(log n).
- **Floating-point keys** — `NaN !== NaN`, binary rounding (`0.1 + 0.2 !== 0.3`): hashing floats is a classic trap. Prefer integers or canonical strings.
- **Storing user input in a bare JS object** — prototype pollution (`__proto__`, `constructor`). Use `Map` or `Object.create(null)`.
- **Over-optimizing the initial capacity from the start** — useful when n is known upfront, but it's a detail: clear solution first, mention the optimization second.

## Going further

- [MDN — `Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), with the object vs `Map` comparison
- [Java `HashMap` (javadoc)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html): load factor 0.75 and treeification documented in black and white
- [CPython — `dictobject.c`](https://github.com/python/cpython/blob/main/Objects/dictobject.c): the header comment explains the open addressing of Python's `dict`
- [SipHash](https://www.aumasson.jp/siphash/): the keyed hash function designed against hash flooding
- Natural next step: balanced trees (`TreeMap`, B-tree) — when sorted order is worth the O(log n) cost
