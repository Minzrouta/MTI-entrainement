---
title: "Structures & traversals: lists, trees, graphs"
date: "2026-09-30"
category: "CS"
level: "Intermédiaire"
summary: "Complexities of the basic structures, the BST and its traversals, BFS/DFS and graph representations: the core of interview algorithm questions — with the reflexes to pick the right structure at the right time."
---

## The essentials

Almost every interview algorithm question starts with a data structure choice. Express recap of the building blocks:

- **Array** — contiguous memory: O(1) access by index and very cache-friendly; but inserting or deleting in the middle shifts everything, O(n).
- **Linked list** — nodes connected by pointers: O(1) insertion/deletion *if you already hold the node*, but O(n) access and search (you follow pointers one by one).
- **Stack (LIFO)** — push/pop at the top in O(1): call stack, undo, DFS, expression parsing.
- **Queue (FIFO)** — enqueue/dequeue in O(1): task queues, buffers, BFS.
- **Hash map** — O(1) *average* search/insertion: the default tool whenever you map keys to values.

| Structure | Access | Search | Insertion | Deletion |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| Linked list | O(n) | O(n) | O(1)* | O(1)* |
| Stack / Queue | — | — | O(1) | O(1) |
| Hash map | — | O(1) avg. | O(1) avg. | O(1) avg. |
| Balanced BST | — | O(log n) | O(log n) | O(log n) |
| Heap | O(1) min/max | — | O(log n) | O(log n) |

\* once you hold the node — finding it is still O(n).

## How it works

### Trees: BST and heap

A tree is a hierarchy without cycles: a root, nodes, leaves. The **BST** (binary search tree) adds an invariant: for every node, the *entire* left subtree is smaller, the *entire* right subtree larger. Search, insert, delete: you eliminate half the tree at each step → O(log n)… **if the tree is balanced**. Insert already-sorted values and it degenerates into a linked list at O(n) — hence self-balancing trees (AVL, red-black) that rebalance through rotations to guarantee O(log n), one sentence that's enough in an interview.

The **heap** (binary heap) relaxes the invariant: each parent is simply ≤ its children (min-heap). The minimum sits at the root in O(1), insertion and extraction in O(log n): it's the standard implementation of the **priority queue** (schedulers, Dijkstra, "top k elements").

### The traversals

```text
              8
            /   \
           3     10
          / \      \
         1   6      14
            / \    /
           4   7  13

In-order   (L,N,R) : 1 3 4 6 7 8 10 13 14  ← sorted!
Pre-order  (N,L,R) : 8 3 1 6 4 7 10 14 13
Post-order (L,R,N) : 1 4 7 6 3 13 14 10 8
BFS (by levels)    : 8 3 10 1 6 14 4 7 13
```

**DFS** (depth-first) dives to the bottom before coming back — it writes naturally as recursion, the call stack serving as the stack. **BFS** (breadth-first) explores level by level and requires an actual queue. The three DFS orders on a binary tree: pre-order (copy/serialize), in-order, post-order (free the children before the parent, compute folder sizes).

> 💡 **The star property** — the in-order traversal of a BST produces the values **in sorted order**. Interviews love it: "validate this BST" (strictly increasing in-order?), "k-th smallest element" (the k-th visited in-order).

## Key concepts to master

- **Graph** — vertices and edges, directed or not, weighted or not. A tree is just a connected acyclic graph.
- **Adjacency list vs matrix** — list (`{vertex: [neighbors]}`): O(V+E) memory, perfect for sparse graphs, i.e. almost every real-world case. V×V matrix: "A→B?" test in O(1) but O(V²) memory — reserved for dense or tiny graphs.
- **BFS = unweighted shortest path** — by exploring level by level, you reach each vertex *for the first time* through a path with the minimum number of edges. That's THE justification to give in an interview.
- **Dijkstra at a glance** — as soon as edges have (positive) weights, BFS is no longer enough: Dijkstra generalizes it by replacing the queue with a priority queue that always pops the vertex with the smallest distance.
- **Cycles** — detecting a cycle: DFS with three states (unvisited / in progress / done) — hitting an "in progress" vertex = cycle. Without cycles, a directed graph admits a **topological sort**: the processing order for dependencies.
- **Real cases everywhere** — `npm install`: dependency graph, topological sort for install order, cycle detection; GPS and network routing: Dijkstra/A*; the DOM: a tree, `querySelector` walks it depth-first; social networks: BFS for degrees of separation; garbage collectors: reachability traversal from the roots.

Canonical BFS, with an actual queue:

```python
from collections import deque

def bfs(graph, start):
    """Distances (in edges) from start — unweighted graph."""
    dist = {start: 0}               # visited ⇔ present in dist
    queue = deque([start])          # a QUEUE: that's what BFS is
    while queue:
        node = queue.popleft()      # FIFO: oldest first
        for neighbor in graph[node]:
            if neighbor not in dist:      # never seen?
                dist[neighbor] = dist[node] + 1
                queue.append(neighbor)    # next level
    return dist   # dist[x] = shortest path start → x
```

> 🎤 **In an interview** — "BFS or DFS, when?" BFS when *distance* matters: unweighted shortest path, level-by-level exploration, target probably close — memory cost proportional to the width. DFS when you must explore *everything* or analyze structure: cycle detection, topological sort, backtracking, islands in a grid — memory proportional to the depth, and three lines of recursion. If both work (counting connected components), pick the simplest to write: DFS.

## In an interview

**"Array or linked list: when do you pick which?"** — Array by default: O(1) access, cache-friendly. Linked list only when you insert/delete *while already holding the position* (LRU cache, chained queue) and never need index access. In practice, dynamic arrays win almost every time thanks to the CPU cache.

**"Check that a binary tree is a BST."** — The trap: comparing each node to its parent alone isn't enough — a node in the left subtree can violate a distant ancestor. Correct: propagate (min, max) bounds while descending, or check the in-order traversal is strictly increasing.

**"How do you detect a cycle in a dependency graph?"** — Three-state DFS: white (never seen), gray (being visited), black (done). An edge to a gray vertex = cycle. Alternative: Kahn's topological sort — if it doesn't exhaust all vertices, there's a cycle. That's what a bundler does when facing circular imports.

**"Why does BFS give the shortest path?"** — Because it explores by levels: all vertices at distance k are visited before those at distance k+1, so the first visit of a vertex uses a path with the minimum number of edges. As soon as edges are weighted, this breaks: Dijkstra takes over.

**"What's a priority queue, and one concrete use?"** — A queue where you always extract the minimum-priority (or maximum) element, implemented with a heap: O(log n) extraction, O(1) minimum. Uses: Dijkstra, task schedulers, "top k", merging k sorted lists.

## Pitfalls & misconceptions

> ⚠️ **The forgotten `visited`** — on a graph (unlike a tree), forgetting to mark visited vertices turns BFS/DFS into an infinite loop at the first cycle — and into exponential blowup even without one (diamond-shaped paths revisited). Mark *when enqueuing/pushing*, not when visiting, otherwise the same vertex enters the queue twice.

- **"A BST is balanced by nature"** — no: inserting 1, 2, 3, … degenerates it into an O(n) list. Production structures (std::map, TreeMap) are self-balancing, a naive BST is not.
- **Validating a BST by only checking the parent** — the interview classic: the invariant covers the *whole* subtree, not just the direct child.
- **BFS with a stack** — swap the queue for a stack and you get DFS: the storage structure *is* the algorithm.
- **Recursive DFS on a deep graph** — 10⁵ nodes in a line = stack overflow; go iterative with an explicit stack.
- **"Hash map is O(1), so always better"** — no ordering, no "nearest neighbor", no sorted iteration: a BST or a heap does what a hash map can't.
- **Dijkstra with negative weights** — silently wrong results; you need Bellman-Ford in that case.

## Going further

- [VisuAlgo](https://visualgo.net/): BST, heap, graph traversals animated step by step — the best tool to "see" the algorithms
- [Red Blob Games — Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html): BFS → Dijkstra → A*, interactive and progressive
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/): every complexity on one page
- [NeetCode Roadmap](https://neetcode.io/roadmap): the trees → graphs progression with the classic interview problems
- Practice: implement BFS and DFS on a small graph as a Python dict, then add cycle detection — 30 lines that cover half of all algorithm questions
