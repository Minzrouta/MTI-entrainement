---
title: "OOP vs programmation fonctionnelle"
date: "2026-10-23"
category: "CS"
level: "Intermédiaire"
summary: "Encapsulation, fonctions pures, immutabilité : dépasser la fausse opposition OOP/FP et montrer en entretien que vous savez choisir le bon style au bon endroit."
---

## L'essentiel

L'**orienté objet** (OOP) et la **programmation fonctionnelle** (FP) sont deux façons d'organiser le code — pas deux camps ennemis. L'OOP regroupe données et comportements dans des objets qui **encapsulent** leur état ; la FP construit le programme en composant des **fonctions pures** qui transforment des données **immuables**.

L'OOP réelle, ce n'est pas « des classes partout et de l'héritage sur cinq niveaux » : c'est l'**encapsulation** (l'état privé ne se modifie que par des méthodes qui garantissent les invariants), le **polymorphisme** (plusieurs types derrière une même interface — on appelle `shape.area()` sans connaître le type concret) et la **composition plutôt que l'héritage**.

La FP réelle, ce n'est pas « des monades et du jargon » : c'est écrire un maximum de **fonctions pures** (même entrée → même sortie, zéro effet de bord), garder les données **immuables** (on retourne une nouvelle valeur au lieu de modifier), repousser les **effets de bord** (I/O, DB, réseau) aux frontières du programme, et utiliser des **fonctions d'ordre supérieur** (`map`, `filter`, `reduce`) plutôt que des boucles à accumulateur.

L'opposition est largement **artificielle** : le JS/TS moderne mélange les deux en permanence — des classes pour les services et l'état, `map`/`filter` et l'immutabilité pour la donnée. React lui-même est passé des classes aux fonctions sans cesser d'encapsuler l'état. Le vrai ennemi commun des deux styles porte un nom : **l'état mutable partagé**.

## Comment ça marche

| | OOP | FP |
|---|---|---|
| État | Encapsulé dans l'objet, mutable mais contrôlé | Immuable : on crée de nouvelles valeurs |
| Réutilisation | Polymorphisme, composition d'objets | Composition de fonctions, higher-order functions |
| Tests | Nécessite d'instancier, parfois de mocker | Fonction pure = entrée/sortie, trivial à tester |
| Effets de bord | Dispersés dans les méthodes (risque) | Repoussés aux frontières (I/O aux bords) |
| Bug typique | État modifié par surprise à distance | Sur-abstraction, pipelines illisibles |

Le même besoin — total des commandes livrées, en centimes — dans les deux styles :

```typescript
// Style impératif : une boucle, un accumulateur, des mutations
function total(orders: Order[]): number {
  let sum = 0;
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === "delivered") {
      sum += orders[i].amount;        // mutation de l'accumulateur
    }
  }
  return sum;
}

// Style FP : un pipeline déclaratif, aucune mutation
const total = (orders: Order[]): number =>
  orders
    .filter(o => o.status === "delivered") // garder les livrées
    .map(o => o.amount)                    // en extraire le montant
    .reduce((sum, a) => sum + a, 0);       // les additionner (0 = départ)
```

Les deux sont correctes. La version FP se lit comme la spécification (« filtre, extrais, somme »), chaque étape se teste isolément, aucun état intermédiaire à suivre mentalement. L'impérative peut être plus rapide sur des volumes énormes (une seule passe) — mais dans 99 % du code applicatif, la lisibilité gagne.

Pourquoi **l'état mutable partagé** est la vraie racine des bugs : quand deux morceaux de code peuvent modifier la même structure, chacun peut casser les hypothèses de l'autre — le fameux « qui a modifié ce tableau ? » à 18h un vendredi. L'OOP répond en **contrôlant** la mutation (état privé, méthodes garantes des invariants) ; la FP répond en la **supprimant** (données immuables). Deux stratégies différentes contre le même ennemi.

En survol : le **pattern matching** et les **types sommes** viennent du monde FP et infusent partout. En TypeScript, une union discriminée `type Result = { ok: true; data: User } | { ok: false; error: string }` force le `switch` à traiter chaque cas — le compilateur signale le cas oublié. C'est la FP qui a gagné cette bataille-là dans le typage moderne.

> 💡 **Composition > héritage** — l'héritage crée un couplage fort et fragile : modifier la classe mère casse silencieusement les filles, et la hiérarchie finit toujours par mentir (le canard en plastique hérite de Canard mais ne vole pas). Composer — un objet *possède* des capacités plutôt qu'il n'en *hérite* — reste flexible : c'est le conseil du Gang of Four… dès 1994, et la raison du passage de React aux hooks et à la composition de composants.

## Concepts clés à maîtriser

- **Fonction pure** : même entrée → même sortie, et aucun effet de bord (pas d'I/O, pas de mutation externe, pas de `Date.now()` ni de `Math.random()` cachés). Conséquence directe : testable sans mock, mémoïsable, parallélisable, déplaçable sans risque.
- **Immutabilité** : `const next = [...items, newItem]` plutôt que `items.push(newItem)` — on retourne une nouvelle valeur au lieu de modifier en place.
- **Effets de bord aux frontières** : le pattern « functional core, imperative shell » — un cœur de logique pure (calculs, décisions) entouré d'une coquille fine qui parle au monde (DB, HTTP, fichiers). On teste le cœur sans mock, la coquille en intégration.
- **Fonctions d'ordre supérieur** : fonctions qui prennent ou retournent des fonctions. `map`/`filter`/`reduce` en sont, mais aussi les middlewares Express, les hooks React, les décorateurs.
- **Encapsulation & invariants** : la valeur de l'OOP n'est pas la syntaxe `class`, c'est de rendre les états invalides impossibles — un `BankAccount` dont le solde ne se modifie que par `deposit`/`withdraw` qui vérifient les règles.
- **Le style « FP light »** pragmatique en équipe : immutabilité par défaut, fonctions pures pour la logique métier, `map`/`filter`/`reduce` pour les transformations, effets aux bords — sans dogme, sans `pipe(curry(flip(...)))` illisible. C'est le style dominant des codebases TS modernes.

```text
        functional core, imperative shell
  ┌──────────────────────────────────────────┐
  │  Shell impérative (effets de bord)       │
  │   HTTP ─ DB ─ fichiers ─ horloge         │
  │   ┌──────────────────────────────────┐   │
  │   │   Cœur pur (logique métier)      │   │
  │   │   calculs, validation, décisions │   │
  │   │   → testable sans aucun mock     │   │
  │   └──────────────────────────────────┘   │
  └──────────────────────────────────────────┘
```

## En entretien

**« C'est quoi une fonction pure et pourquoi c'est testable ? »** — Une fonction dont la sortie ne dépend que de ses arguments, et qui ne produit aucun effet de bord observable. Testable parce que le test est trivial : on donne une entrée, on vérifie la sortie — pas de mock, pas de setup de DB, pas d'ordre d'exécution. Bonus : elle est aussi mémoïsable et sûre à paralléliser, précisément parce que rien d'extérieur n'entre en jeu.

**« Pourquoi dit-on composition plutôt qu'héritage ? »** — L'héritage couple fortement la fille à l'implémentation de la mère : tout changement de la mère se propage silencieusement, et les hiérarchies profondes deviennent fausses avec le temps. La composition assemble des capacités (`class Car { engine: Engine }`) : couplage faible, testable pièce par pièce, recombinable. L'héritage garde un usage légitime : de vraies relations « est-un » stables, peu profondes.

**« OOP ou FP : tu choisis quoi ? »** — Les deux, selon la couche. Logique métier et transformations de données : style fonctionnel (pur, immuable, `map`/`filter`). Services avec cycle de vie, état encapsulé, polymorphisme (plusieurs providers derrière une interface) : style objet. Le JS/TS moderne mélange les deux — la vraie compétence est de garder l'état mutable partagé au minimum, quel que soit le style.

**« Quel est le problème de l'état mutable partagé ? »** — Deux morceaux de code qui modifient la même structure cassent mutuellement leurs hypothèses : bugs d'action à distance, impossibles à reproduire, pires en concurrence (race conditions). L'OOP le contrôle par l'encapsulation, la FP le supprime par l'immutabilité — les deux réponses valent mieux qu'une variable globale modifiée partout.

**« map/filter/reduce : tu peux me les expliquer ? »** — `map` transforme chaque élément (n → n), `filter` garde ceux qui passent un prédicat (n → ≤n), `reduce` replie la liste en une seule valeur via un accumulateur. Ensemble ils remplacent la boucle à accumulateur par un pipeline déclaratif où chaque étape est nommée et testable. Piège à mentionner : `reduce` sans valeur initiale sur un tableau vide lance une exception.

## Pièges & idées reçues

> ⚠️ **« FP = pas de classes » / « OOP = pas de fonctions »** — faux dans les deux sens. Une classe TS avec des méthodes pures et un état immuable est parfaitement fonctionnelle dans l'esprit ; un module de fonctions qui mutent un objet global partagé n'a de fonctionnel que la syntaxe. Le style se juge à la gestion de l'état, pas aux mots-clés.

- **« L'immutabilité est trop lente »** — copier a un coût, mais dans le code applicatif il est presque toujours négligeable (et les moteurs JS optimisent). On profile *avant* d'optimiser ; au pire, on mute localement dans une fonction qui reste pure vue de l'extérieur.
- **« Plus il y a de classes, plus c'est de l'OOP »** — l'OOP se juge aux invariants protégés, pas au nombre de classes. Une classe anémique (getters/setters sans logique) n'encapsule rien : c'est un struct avec des cérémonies.
- **`const` en JS n'immobilise que la référence** — `const arr = []; arr.push(1)` est légal. L'immutabilité de la valeur est une discipline (`readonly`, `Object.freeze`, Immer), pas un mot-clé.
- **Le dogmatisme dans les deux sens** : tout réécrire en `pipe`/`curry` illisible est aussi nuisible qu'une hiérarchie d'héritage de six niveaux. En équipe, le style « FP light » gagne : pur par défaut, pragmatique aux bords.

> 🎤 **En entretien** — ne choisissez jamais un camp. La réponse qui marque : « les deux outillent le même problème — l'état mutable partagé — l'un en l'encadrant, l'autre en le supprimant ; je prends le style qui rend chaque couche la plus simple à tester ». Vous venez de montrer du recul, pas une religion.

## Pour aller plus loin

- [Professor Frisby's Mostly Adequate Guide to Functional Programming](https://mostly-adequate.gitbook.io/mostly-adequate-guide/) : la FP en JS, gratuite et drôle
- [Composition over inheritance (Wikipedia)](https://en.wikipedia.org/wiki/Composition_over_inheritance) : l'argument détaillé, issu du Gang of Four
- [Functional Core, Imperative Shell — Destroy All Software](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell) : le screencast fondateur du pattern
- [TypeScript Handbook — Narrowing & discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) : les types sommes en pratique
- Exercice concret : prendre une de vos boucles à accumulateur et la réécrire en `filter`/`map`/`reduce` — puis comparer la testabilité des deux versions
