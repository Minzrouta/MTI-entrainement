---
title: "Complexité & Big O"
date: "2026-08-21"
category: "CS"
level: "Fondamental"
summary: "La question tombe à chaque exercice de code : « quelle est la complexité ? ». Savoir y répondre — et repérer le O(n²) caché dans un innocent .includes() — change le verdict d'un entretien."
---

## L'essentiel

La notation **Big O** décrit comment le coût d'un algorithme (temps ou mémoire) **grandit avec la taille de l'entrée** `n`. Elle ne mesure pas des secondes : elle prédit le **passage à l'échelle**. Un algorithme rapide sur 100 éléments mais O(n²) explosera sur un million — et c'est exactement ce qu'un recruteur veut vérifier : est-ce que vous voyez venir l'explosion *avant* la prod ?

Big O garde le **terme dominant** et **jette les constantes** : `3n² + 50n + 1000` → O(n²). Pour de petits `n`, les constantes gagnent (un tri par insertion bat un merge sort sur 10 éléments) ; asymptotiquement, la classe de complexité gagne toujours.

L'échelle à connaître, avec un ordre de grandeur concret (≈10⁸ opérations simples/seconde) :

```text
n = 1 000 000 éléments
─────────────────────────────────────────────
O(1)        1 op            instantané
O(log n)    ~20 ops         instantané
O(n)        10⁶ ops         ~10 ms
O(n log n)  2×10⁷ ops       ~0,2 s
O(n²)       10¹² ops        ~3 heures
O(2ⁿ)       10³⁰¹⁰³⁰ ops    jamais
─────────────────────────────────────────────
Passer de O(n²) à O(n log n) n'est pas une
optimisation : c'est la différence entre
« ça tourne » et « ça ne finira pas ».
```

Exemples canoniques : O(1) = accès `tab[i]`, lookup de hash map. O(log n) = recherche dichotomique (on divise l'espace par 2 à chaque étape). O(n) = parcours de tableau, `Math.max(...arr)`. O(n log n) = les bons tris (merge sort, et le `Array.prototype.sort` des moteurs modernes). O(n²) = double boucle sur la même collection (comparer toutes les paires). O(2ⁿ) = explorer tous les sous-ensembles, Fibonacci récursif naïf.

## Comment ça marche

**Temps vs espace.** La complexité en temps compte les opérations ; la complexité **en espace** compte la mémoire *supplémentaire* allouée. Un merge sort est O(n log n) en temps mais O(n) en espace (tableaux temporaires) ; un tri en place comme heapsort est O(1) en espace. Piège fréquent : **la récursion consomme de la pile** — une descente récursive de profondeur n est O(n) en espace même sans allouer de tableau.

**Meilleur, pire, moyen cas.** Un même algorithme a plusieurs visages : quicksort est O(n log n) en moyenne mais **O(n²) au pire** (pivot systématiquement mauvais, ex. tableau déjà trié avec un pivot naïf) ; la recherche linéaire est O(1) au mieux (premier élément), O(n) au pire. Par défaut, Big O désigne le **pire cas** — sauf mention explicite, c'est lui qu'on annonce en entretien. Les hash maps sont l'exception qu'on cite en moyenne : O(1) moyen, O(n) au pire (toutes les clés en collision).

**Complexité amortie.** Un `push` sur un tableau dynamique (ArrayList, `vector`, tableau JS) est O(1)… sauf quand la capacité est pleine : il faut réallouer et tout recopier, O(n). Mais comme on **double** la capacité à chaque fois, ce coût se produit de plus en plus rarement : étalé sur N appels, le coût total reste proportionnel à N. On dit que le push est **O(1) amorti** — cher parfois, bon marché en moyenne garantie sur la séquence.

Les complexités des structures qu'on manipule tous les jours :

| Structure | Accès index | Recherche | Insertion | Suppression |
|---|---|---|---|---|
| Tableau dynamique | O(1) | O(n) | O(1) amorti en fin, O(n) ailleurs | O(n) (décalage) |
| Liste chaînée | O(n) | O(n) | O(1) (nœud connu) | O(1) (nœud connu) |
| Hash map / Set | — | O(1) moyen, O(n) pire | O(1) moyen | O(1) moyen |
| Arbre équilibré (AVL, red-black) | — | O(log n) | O(log n) | O(log n) |
| Heap (priority queue) | O(1) le min/max | O(n) | O(log n) | O(log n) (racine) |

> 💡 **La question cachée derrière le tableau** — « pourquoi une hash map est-elle O(1) ? » : la fonction de hachage transforme la clé en index de bucket, accès direct. Le O(n) au pire arrive quand trop de clés atterrissent dans le même bucket (collisions) — les bonnes implémentations redimensionnent pour l'éviter.

## Concepts clés à maîtriser

Le piège n°1 en entretien : la **boucle imbriquée cachée**. `includes`, `indexOf`, `find`, le spread `[...arr]`, `concat`, `slice`… sont tous des parcours O(n). En glisser un dans une boucle fabrique du O(n²) qui ne se voit pas :

```javascript
// ❌ O(n × m) : includes() est un scan linéaire caché
//    → 10 000 × 10 000 = 10⁸ opérations, ça rame déjà
function communs(a, b) {
  return a.filter(x => b.includes(x));
}

// ✅ O(n + m) : on paie une construction de Set en O(m),
//    puis chaque test d'appartenance est O(1)
function communsRapide(a, b) {
  const setB = new Set(b);          // O(m), une seule fois
  return a.filter(x => setB.has(x)); // n tests en O(1)
}
```

Le refactoring type — « je troque de la mémoire (le Set, O(m) en espace) contre du temps » — est exactement la phrase attendue. Autres classiques du même piège :

- **Concaténation de strings dans une boucle** : en Java/C#/Python, `s += mot` recopie la chaîne à chaque tour → O(n²). Utiliser un `StringBuilder` / `"".join(liste)`.
- **`delete`/`splice` dans une boucle** sur un tableau : chaque suppression décale le reste, O(n) par suppression.
- **Requête dans une boucle** : le célèbre problème **N+1** des ORM est la version base de données du O(n²) caché — une requête par élément au lieu d'un `WHERE id IN (...)`.
- **Deux boucles successives ≠ imbriquées** : `for` puis `for` = O(n + n) = O(n). Seule l'imbrication multiplie.

Et pour raisonner vite : une boucle simple sur n → O(n) ; deux boucles imbriquées sur la même entrée → O(n²) ; on divise le problème par 2 à chaque étape → O(log n) ; on fait un travail O(n) à chaque niveau d'une division par 2 → O(n log n) ; on essaie toutes les combinaisons → exponentiel.

> 🎤 **En entretien** — après CHAQUE exercice de code, la question tombe : « quelle est la complexité de ta solution ? ». Prenez les devants : annoncez-la vous-même en finissant (« c'est O(n) en temps, O(n) en espace à cause du Set »). Puis le bonus qui marque : « on pourrait descendre à O(1) en espace si le tableau était trié, avec deux pointeurs ». Anticiper la question, c'est elle qu'on vous posait vraiment.

## En entretien

**« Quelle est la complexité de la recherche dichotomique, et pourquoi ? »** — O(log n) : chaque comparaison élimine la moitié de l'espace de recherche restant ; il faut log₂(n) divisions pour tomber à un élément (20 étapes pour un million). Condition indispensable : le tableau est **trié** — sinon on paie un tri O(n log n) avant.

**« Pourquoi dit-on qu'on ne peut pas trier plus vite que O(n log n) ? »** — C'est la borne inférieure des tris **par comparaison** : n! permutations possibles, chaque comparaison ne fait qu'un bit d'information, il faut log₂(n!) ≈ n log n comparaisons. Les tris non comparatifs (counting sort, radix sort) descendent à O(n + k) quand les clés s'y prêtent — le mentionner montre qu'on connaît la limite ET son contournement.

**« Complexité amortie : c'est quoi, un exemple ? »** — Le coût moyen garanti sur une séquence d'opérations, même si certaines sont chères. Exemple : `push` d'un tableau dynamique, O(1) amorti malgré des réallocations O(n) occasionnelles, parce que le doublement de capacité rend ces réallocations exponentiellement rares.

**« Ton code est O(n²), comment l'améliorer ? »** — La méthode : identifier l'opération répétée coûteuse (souvent une recherche O(n) dans la boucle), la remplacer par une structure à lookup O(1) (hash map/Set) ou pré-trier pour utiliser dichotomie/deux pointeurs. Le trade-off à énoncer : on échange de l'espace mémoire contre du temps.

**« Quicksort est O(n²) au pire — pourquoi l'utilise-t-on quand même ? »** — Parce que le pire cas est rarissime avec un pivot aléatoire ou médian, que ses constantes sont excellentes (cache-friendly, en place), et que O(n log n) moyen + bonnes constantes bat souvent un merge sort théoriquement plus sûr. Les libs réelles mitigent (introsort bascule sur heapsort si la récursion dégénère).

## Pièges & idées reçues

> ⚠️ **Big O n'est pas un chronomètre** — O(n) avec une constante énorme (I/O, allocations) peut perdre contre un O(n²) compact sur des petites entrées. Big O prédit la *croissance*, pas la vitesse absolue : sur n = 20, l'algorithme « naïf » est souvent le bon choix (et le plus lisible).

- **Oublier l'espace** : annoncer « O(n) » sans préciser temps ou espace. Une solution avec hash map est O(n) temps ET O(n) espace ; la version deux pointeurs sur tableau trié est O(1) espace. Toujours donner les deux.
- **La récursion « gratuite »** : chaque appel empile un frame. Fibonacci récursif naïf est O(2ⁿ) en temps ET O(n) en espace de pile ; la mémoïsation le ramène à O(n).
- **`sort()` n'est pas gratuit** : glisser un tri « pour simplifier » met un plancher O(n log n) à toute la solution. Le dire explicitement (« je trie d'abord, donc O(n log n) global »).
- **Confondre O, Θ, Ω** : Big O est une borne supérieure. Dire « la recherche linéaire est O(n²) » est *techniquement* vrai mais inutile. En entretien, on emploie O comme « l'ordre de grandeur serré du pire cas » — c'est l'usage courant, savoir que Θ existe est un bonus.
- **Ignorer n vs m** : avec deux entrées de tailles différentes, écrire O(n × m), pas O(n²) — précision qui compte pour un `filter` + `includes` sur deux tableaux distincts.

## Pour aller plus loin

- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) : le poster des complexités par structure et par tri
- [CLRS — Introduction to Algorithms](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) chap. 3 : la définition formelle propre
- [NeetCode](https://neetcode.io/) : s'entraîner à annoncer la complexité après chaque problème résolu
- Mesurer soi-même : `console.time()` sur `communs` vs `communsRapide` avec 10 000 éléments — voir un O(n²) mourir en vrai vaut tous les cours
