---
title: "Garbage collection & gestion mémoire"
date: "2026-10-16"
category: "CS"
level: "Avancé"
summary: "Stack vs heap, refcounting, mark & sweep, GC générationnel et fuites mémoire malgré le GC : de quoi répondre au « comment marche la mémoire dans ton langage ? » sans trembler."
---

## L'essentiel

Un programme range sa mémoire à deux endroits. La **stack** : les variables locales et les frames d'appel, allouées/libérées automatiquement à l'entrée et à la sortie de chaque fonction — rapide, ordonnée, mais petite et liée à la durée de vie de la fonction. Le **heap** : tout ce qui doit survivre à la fonction qui l'a créé (objets, tableaux, closures) — flexible, mais il faut bien **libérer** un jour, sinon la mémoire fuit.

Tout le problème tient en une question : **quand peut-on libérer un objet du heap ?** Réponse : quand plus personne ne peut y accéder. En C, c'est au développeur de le décider (`free`) — d'où les bugs légendaires : *use-after-free*, double free, fuites. Le **garbage collector** automatise cette décision : il détecte les objets devenus **inaccessibles** et récupère leur mémoire. Java, JavaScript, Python, Go, C# : tous reposent sur un GC. Rust prend une troisième voie, sans GC ni `free` manuel (on y revient).

Ce que le GC garantit : pas de use-after-free, pas de double free. Ce qu'il ne garantit **pas** : l'absence de fuites — un objet encore référencé mais devenu inutile ne sera jamais collecté.

## Comment ça marche

```text
 STACK (par thread)        HEAP (partagé)
 ┌───────────────┐   ┌──────────────────────────┐
 │ frame main()  │   │ Young gen    │  Old gen   │
 │ frame f()     │   │ ┌───┐ ┌───┐  │ ┌───────┐  │
 │   x: 42       │   │ │obj│ │obj│  │ │  obj  │  │
 │   p: ● ───────┼──▶│ └───┘ └───┘  │ └───────┘  │
 └───────────────┘   │ minor GC     │ major GC   │
  libérée au return  │ fréquent     │ rare, cher │
                     └──────────────────────────┘
```

Deux grandes familles d'algorithmes :

- **Reference counting** : chaque objet porte un compteur de références ; à zéro, il est libéré immédiatement. Simple, libération prévisible… mais deux objets qui se référencent mutuellement gardent un compteur ≥ 1 pour toujours : les **cycles** ne sont jamais libérés. CPython l'utilise, complété par un détecteur de cycles ; Swift (ARC) impose des `weak` references pour casser les cycles.
- **Tracing (mark & sweep)** : on part des **racines** (stack, variables globales, registres), on **marque** tout ce qui est atteignable en suivant les références, puis on **balaie** (sweep) tout ce qui n'est pas marqué. Les cycles inaccessibles sont collectés naturellement : un cycle que personne ne pointe n'est jamais marqué.

| | Reference counting | Tracing (mark & sweep) |
|---|---|---|
| Libération | Immédiate (compteur à 0) | Différée (au passage du GC) |
| Cycles | Non collectés (il faut un mécanisme en plus) | Collectés naturellement |
| Coût | Réparti (incr/décr à chaque affectation) | Concentré (pauses de collection) |
| Prévisibilité | Bonne | Pauses variables |
| Exemples | CPython, Swift (ARC) | JVM, V8, Go, .NET |

Le raffinement clé : le **GC générationnel**, fondé sur l'**hypothèse générationnelle** — la plupart des objets meurent jeunes (variables temporaires, objets d'une requête HTTP). On sépare donc le heap en une **young generation**, collectée souvent et très vite (**minor GC** : on ne parcourt que les survivants, peu nombreux), et une **old generation** pour les objets qui survivent à plusieurs collections, parcourue rarement (**major/full GC**, plus coûteux). V8 (Scavenger + Mark-Compact) et la JVM (G1, ZGC) fonctionnent ainsi.

Le prix à payer : les pauses **stop-the-world** — pour marquer un graphe d'objets cohérent, le GC doit suspendre le programme. Les GC modernes rendent la majeure partie du travail concurrente ou incrémentale (ZGC vise des pauses < 1 ms même sur des heaps énormes), mais « GC » implique toujours un compromis débit / latence / mémoire.

**Rust, l'alternative** : l'*ownership* fait vérifier à la compilation que chaque valeur a un unique propriétaire et que sa mémoire est libérée exactement quand il sort du scope. Zéro GC, zéro pause, sécurité mémoire garantie — au prix d'un apprentissage plus rude (le borrow checker).

## Concepts clés à maîtriser

- **Racines (GC roots)** : stack, globals, registres — le point de départ du marquage. « Inaccessible » signifie : aucun chemin depuis une racine.
- **Fuites mémoire MALGRÉ le GC** : le GC collecte l'inaccessible, pas l'inutile. Les quatre suspects habituels : **listeners jamais retirés** (le DOM ou l'emitter garde une référence vers votre callback, qui capture tout son scope), **caches sans borne** (une `Map` qui grossit pour toujours — penser `WeakMap` ou une éviction LRU), **closures** qui capturent de gros objets, **globals** qui accumulent.

La fuite la plus classique en JavaScript, et sa correction :

```js
// ❌ FUITE : à chaque création du widget, un listener de plus.
// Le document référence le callback → le callback capture
// `bigData` → rien n'est jamais collecté, même widget détruit.
class Widget {
  constructor() {
    this.bigData = new Array(1e6).fill("…");
    document.addEventListener("click", () => this.render());
  }
}

// ✅ CORRECT : garder la référence du handler et le retirer
// quand le widget meurt. Plus de chemin depuis une racine
// → widget et bigData deviennent collectables.
class Widget {
  constructor() {
    this.bigData = new Array(1e6).fill("…");
    this.onClick = () => this.render();
    document.addEventListener("click", this.onClick);
  }
  destroy() {
    document.removeEventListener("click", this.onClick);
  }
}
```

- **Profiler une fuite** : symptôme = mémoire qui monte en marches d'escalier sans jamais redescendre après GC. Méthode : DevTools → onglet Memory → **heap snapshot** avant/après le scénario suspect, comparer, trier par *retained size*, puis remonter la chaîne des **retainers** (qui référence quoi) jusqu'à la racine coupable. Côté Node : `--inspect` + Chrome DevTools ou `process.memoryUsage()` pour la tendance.

> 💡 **Retained vs shallow size** — la *shallow size* est la taille de l'objet seul ; la *retained size* est tout ce qui serait libéré si cet objet disparaissait. C'est la retained size qui désigne les vrais coupables : un petit listener peut retenir 200 Mo.

## En entretien

**« Stack vs heap ? »** — Stack : frames d'appel et locales, allocation/libération automatique par simple déplacement d'un pointeur, très rapide, durée de vie liée à la fonction. Heap : objets à durée de vie arbitraire, gérés par allocateur + GC (ou manuellement en C). Bonus : chaque thread a sa stack, le heap est partagé — d'où les problèmes de concurrence sur le heap.

**« Comment marche un GC mark & sweep ? »** — Depuis les racines (stack, globals), on marque récursivement tout objet atteignable ; ce qui n'est pas marqué est balayé. Ajouter : la compaction (déplacer les survivants pour défragmenter) et le fait que les cycles inaccessibles sont collectés — contrairement au refcounting.

**« Pourquoi un GC générationnel ? »** — Hypothèse générationnelle : la plupart des objets meurent jeunes. Collecter souvent une petite young gen (minor GC, rapide car on ne copie que les rares survivants) et rarement l'old gen (major GC) donne des pauses courtes la plupart du temps. C'est le design de V8 et de la JVM.

**« Un GC empêche-t-il les fuites mémoire ? »** — Non (voir callout ci-dessous) — c'est la question piège favorite ; répondre « oui » est éliminatoire à ce niveau.

**« Comment Rust s'en sort sans GC ? »** — Ownership : chaque valeur a un propriétaire unique, la libération est insérée à la compilation quand le propriétaire sort du scope ; le borrow checker vérifie statiquement qu'aucune référence ne survit à la valeur. Sécurité mémoire sans runtime.

## Pièges & idées reçues

> 🎤 **En entretien** — « Un GC empêche-t-il les fuites mémoire ? » Non. Le GC ne libère que ce qui est *inaccessible* ; une référence oubliée (listener, cache, global) rend l'objet accessible donc incollectable, même si plus personne ne s'en sert. Une fuite en langage managé = un problème de références, pas d'allocation. Citer le trio listener/cache/closure + le heap snapshot comme méthode de diagnostic : réponse complète.

- **« Le refcounting suffit »** — les cycles (deux objets qui se pointent, liste doublement chaînée, parent ↔ enfant) ne tombent jamais à zéro. Il faut un détecteur de cycles (CPython) ou des weak references (Swift).
- **« Les pauses GC, c'est du passé »** — atténuées, pas disparues : ZGC ou le GC incrémental de V8 réduisent énormément les pauses, mais le travail de collection se paie toujours quelque part (CPU, débit, mémoire supplémentaire).
- **`delete` en JavaScript ne libère pas la mémoire** — il retire une propriété d'un objet. On ne « libère » jamais explicitement en JS : on supprime des références (= null, sortie de scope) et le GC fait le reste.
- **Forcer le GC** (`System.gc()`, `global.gc()`) — au mieux inutile, au pire contre-productif : le runtime planifie mieux que vous. Si vous en avez besoin, c'est le design qui fuit.

## Pour aller plus loin

- [V8 — Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk) : le GC de V8 expliqué par ses auteurs
- [MDN — Gestion de la mémoire en JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Memory_management) : refcounting vs mark & sweep, accessible
- [Chrome DevTools — Record heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots) : le mode d'emploi du diagnostic de fuite
- [The Rust Book — Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) : l'alternative sans GC, chapitre fondateur
- Exercice : ouvrir DevTools sur une SPA, prendre deux heap snapshots autour d'une navigation répétée, et chercher les detached DOM nodes — la fuite front la plus courante
