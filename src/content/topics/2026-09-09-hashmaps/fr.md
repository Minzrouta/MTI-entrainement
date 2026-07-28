---
title: "Hashmaps en profondeur"
date: "2026-09-09"
category: "CS"
level: "Intermédiaire"
summary: "Buckets, collisions, load factor, hash flooding : comprendre ce qui se cache derrière le O(1) — la structure la plus rentable en entretien, du quiz théorique au two-sum."
---

## L'essentiel

La table de hachage — `dict` en Python, `Map` en JavaScript, `HashMap` en Java, `unordered_map` en C++ — associe des **clés** à des **valeurs** avec insertion, recherche et suppression en **O(1) en moyenne**. C'est la structure la plus utilisée en pratique et la plus rentable en entretien : la moitié des exercices « optimisez ce code » se résolvent en remplaçant une recherche linéaire par une hashmap.

Le principe tient en une ligne : une **fonction de hachage** transforme la clé en un entier, réduit modulo le nombre de cases du tableau interne (les **buckets**), et cet index donne directement l'emplacement de la donnée. Pas de parcours de toutes les clés : un calcul, un accès tableau.

Mais ce O(1) est **en moyenne**, pas garanti. Collisions, facteur de charge et redimensionnement font tout l'écart entre la théorie et la réalité — et c'est précisément là-dessus qu'un entretien creuse.

## Comment ça marche

Le chemin d'un `map.get("cat")` :

1. `hash("cat")` produit un grand entier (rapide, déterministe) ;
2. `index = hash mod capacité` le ramène dans les bornes du tableau interne ;
3. on lit le bucket à cet index.

```text
hash("cat") = 0x51f2 ─▶ 0x51f2 mod 8 = 2

 [0] ─▶ ∅
 [1] ─▶ ("dog",4) ─▶ ∅
 [2] ─▶ ("cat",3) ─▶ ("act",7) ─▶ ∅
 [3] ─▶ ∅            ▲
 ...                 └── collision : deux clés,
 [7] ─▶ ("zoo",1) ─▶ ∅   même bucket → chaînage
```

Deux clés distinctes peuvent tomber dans le même bucket : c'est une **collision**, inévitable — il y a infiniment plus de clés possibles que de buckets (principe des tiroirs). Deux grandes familles de résolution :

| | Chaining (chaînage) | Open addressing |
|---|---|---|
| Collision | liste (ou arbre) dans le bucket | on sonde une autre case (probing) |
| Mémoire | pointeurs et allocations en plus | tableau compact, cache-friendly |
| Load factor | peut dépasser 1 | doit rester < 1 |
| Suppression | simple (retirer le maillon) | délicate (tombstones) |
| Exemples | Java `HashMap` | `dict` Python, `HashMap` Rust |

Le **load factor** (facteur de charge) = nombre d'éléments / nombre de buckets. Plus il monte, plus les collisions s'accumulent et plus les buckets s'allongent. Au-delà d'un seuil (0.75 pour Java, ~0.66 pour CPython), la table **redimensionne** : elle alloue un tableau plus grand (souvent ×2) et **re-hache toutes les entrées** — car `hash mod capacité` change avec la capacité.

> 💡 **O(n) amorti** — un resize coûte O(n), mais il est déclenché de plus en plus rarement (après environ n insertions). Réparti sur toutes les insertions, le coût moyen reste O(1) : c'est exactement l'argument du tableau dynamique (`ArrayList`, `vector`). Dire « O(1) amorti » plutôt que « O(1) » en entretien, c'est un point bonus immédiat.

## Concepts clés à maîtriser

- **Pire cas O(n)** : si toutes les clés atterrissent dans le même bucket (fonction de hachage mauvaise ou adversariale), la hashmap dégénère en liste chaînée. Java 8+ se défend en transformant un bucket trop peuplé (≥ 8 entrées) en arbre rouge-noir : O(log n) au pire.
- **Hash flooding** : un attaquant qui connaît la fonction de hachage peut forger des milliers de clés qui collisionnent toutes → chaque insertion devient O(n) et le serveur qui parse un JSON ou des paramètres HTTP s'effondre (déni de service, CVE-2011-4885 entre autres). Défenses : hachage avec **graine aléatoire** par processus (SipHash dans Python, Ruby, Rust) et/ou treeification (Java).
- **Ce qui fait une bonne clé** : elle doit être **immuable** (ou au minimum ne jamais muter tant qu'elle est dans la map), et son égalité et son hash doivent être **cohérents** : `a.equals(b)` ⟹ `hash(a) == hash(b)`. En Java, redéfinir `equals` sans `hashCode` est le bug classique : deux objets « égaux » finissent dans des buckets différents et `get` ne retrouve rien.
- **Objet JS vs `Map`** : l'objet n'accepte que des clés string/symbol (tout le reste est converti en chaîne), hérite de son prototype (`{}["toString"]` existe !) et est vulnérable à la pollution `__proto__` si on y range des clés venant de l'utilisateur. `Map` : clés de tout type, `.size` en O(1), ordre d'insertion garanti, meilleures performances en insertions/suppressions intensives. Règle simple : objet = struct à forme fixe, `Map` = vrai dictionnaire dynamique.
- **Ordre d'itération** : jamais garanti par le contrat général (Java `HashMap` : ordre arbitraire, qui peut changer après un resize). Python ≥ 3.7 et `Map` JS préservent l'ordre d'insertion — mais ne jamais supposer un ordre *trié* : pour ça, il faut un arbre (`TreeMap`).

> ⚠️ **La clé mutée est une clé perdue** — insérez un objet mutable comme clé, puis modifiez un champ qui participe au hash : la valeur est toujours dans la map, mais dans le *mauvais bucket*. `get` re-hache la clé, cherche dans le nouveau bucket, ne trouve rien. C'est pour ça que Python interdit les `list` comme clés (unhashable) et n'accepte que des types immuables comme le tuple.

## En entretien

**« Pourquoi une hashmap est-elle en O(1) en moyenne, et pas toujours ? »** — Le hash donne directement l'index du bucket : un calcul plus un accès tableau, indépendant de n. « En moyenne » parce que les collisions existent : avec une bonne fonction de hachage et un load factor contrôlé, chaque bucket contient O(1) éléments ; avec une mauvaise fonction (ou face à un adversaire), tout tombe dans le même bucket et on dégénère en O(n).

**« Chaining ou open addressing : lequel choisir ? »** — Chaining : plus simple, tolère un load factor > 1, mais pointeurs et sauts mémoire. Open addressing : tout dans un tableau contigu, excellent pour le cache CPU, mais suppression délicate (tombstones) et très sensible au load factor. Les implémentations modernes orientées performance (`dict` Python, `HashMap` Rust) choisissent l'open addressing pour la localité mémoire.

**« Que se passe-t-il quand la table se remplit ? »** — Le load factor dépasse son seuil (~0.75) : allocation d'un tableau ×2 et re-hachage de toutes les entrées. O(n) ponctuel, O(1) amorti. Bonus : si on connaît la taille finale à l'avance, pré-dimensionner (`new HashMap<>(1024)`) évite tous les resizes intermédiaires.

**« Object ou Map en JavaScript ? »** — Clés dynamiques ou non-string, besoin de `.size`, insertions/suppressions fréquentes, données venant de l'utilisateur → `Map`. Forme fixe connue à l'avance (config, DTO) → objet. Mentionner la pollution de prototype : ranger de l'input utilisateur dans un objet nu est un risque, `Map` (ou `Object.create(null)`) l'élimine.

**« Quel contrat pour une clé de HashMap en Java ? »** — `equals` et `hashCode` redéfinis *ensemble* et cohérents (égaux ⟹ même hash), stables tant que l'objet est dans la map — donc clé immuable de préférence (`String`, `Integer`, record).

L'exercice le plus classique, two-sum, illustre le réflexe hashmap :

```js
// Naïf : O(n²) — on teste toutes les paires
function twoSumNaive(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i, j];
  return null;
}

// Hashmap : O(n) — un seul passage
function twoSum(nums, target) {
  const seen = new Map();              // valeur → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];     // le complément cherché
    if (seen.has(need))                // déjà vu ? O(1)
      return [seen.get(need), i];
    seen.set(nums[i], i);              // mémoriser APRÈS le test
  }                                    // (cas need === nums[i])
  return null;
}
```

> 🎤 **En entretien** — « implémente un compteur de fréquences » (mots d'un texte, caractères d'une chaîne) est l'échauffement le plus fréquent : une map `élément → compte`, un seul passage, `map.set(x, (map.get(x) ?? 0) + 1)`. Sachez l'écrire les yeux fermés dans votre langage, puis enchaînez sur les variantes : top-k (compteur + tri ou heap), anagrammes (comparer deux compteurs), déduplication (un `Set`, qui n'est qu'une hashmap sans valeurs).

## Pièges & idées reçues

- **« O(1) garanti »** — non : O(1) *en moyenne* et *amorti*. Pire cas O(n) (collisions massives), et une insertion isolée peut coûter O(n) (resize). Pour du temps réel strict, c'est un vrai sujet.
- **Supposer un ordre d'itération** — code qui marche en Python (ordre d'insertion) et casse en Java (ordre arbitraire, instable après resize). Besoin d'un ordre trié → `TreeMap` ou arbre équilibré, en acceptant le O(log n).
- **Clés flottantes** — `NaN !== NaN`, arrondis binaires (`0.1 + 0.2 !== 0.3`) : hacher des flottants est un piège classique. Préférer des entiers ou des chaînes canoniques.
- **Ranger de l'input utilisateur dans un objet JS nu** — pollution de prototype (`__proto__`, `constructor`). `Map` ou `Object.create(null)`.
- **Sur-optimiser la capacité initiale d'entrée de jeu** — utile quand n est connu à l'avance, mais c'est un détail : d'abord la solution claire, ensuite mentionner l'optimisation.

## Pour aller plus loin

- [MDN — `Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), avec le comparatif objet vs `Map`
- [Java `HashMap` (javadoc)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html) : load factor 0.75 et treeification documentés noir sur blanc
- [CPython — `dictobject.c`](https://github.com/python/cpython/blob/main/Objects/dictobject.c) : le commentaire d'en-tête explique l'open addressing du `dict` Python
- [SipHash](https://www.aumasson.jp/siphash/) : la fonction de hachage à clé conçue contre le hash flooding
- Étape suivante naturelle : les arbres équilibrés (`TreeMap`, B-tree) — quand l'ordre trié vaut le coût O(log n)
