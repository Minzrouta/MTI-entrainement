---
title: "TypeScript : le typage qui change tout"
date: "2026-08-07"
category: "Web"
level: "Fondamental"
summary: "Inférence, narrowing, génériques, unknown vs any : ce que le système de types de TypeScript fait vraiment pour toi — et les questions qui reviennent dans quasiment tous les entretiens front et Node."
---

## L'essentiel

TypeScript est un **sur-ensemble typé de JavaScript** : tout code JS valide est du TS valide, auquel on ajoute des annotations de types vérifiées **à la compilation**. Le compilateur (`tsc`) analyse le code, signale les incohérences, puis produit du JavaScript ordinaire — **les types disparaissent entièrement au runtime**.

```text
app.ts ──tsc──▶ app.js ──node / navigateur──▶ exécution
   │               │
 types vérifiés   types effacés : aucune
 à la compilation  vérification au runtime
```

Pourquoi typer ? Trois bénéfices concrets : les bugs de classe entière (`undefined is not a function`, faute de frappe dans un nom de propriété, mauvais argument passé à une fonction) sont attrapés **avant d'exécuter quoi que ce soit** ; le **refactoring devient sûr** — renomme une propriété et le compilateur liste tous les endroits à corriger ; et l'**autocomplétion devient une documentation vivante** — l'IDE sait exactement ce qu'un objet contient, ce qui vaut mieux qu'un README obsolète.

Sur un projet à plusieurs, c'est surtout un **contrat entre développeurs** : la signature d'une fonction dit ce qu'elle attend et ce qu'elle rend, et le compilateur fait respecter le contrat.

## Comment ça marche

Le système de types de TypeScript est **structurel** (duck typing vérifié statiquement), pas nominal comme en Java ou C#. Deux types sont compatibles si leurs **structures** le sont, peu importe leur nom : un objet `{ name: string, age: number }` est assignable à une `interface Person { name: string }` — il a tout ce qu'il faut, et plus. C'est ce qui rend TS naturel pour typer du JS existant, mais ça surprend les habitués de Java : deux interfaces identiques mais de noms différents sont interchangeables.

Deuxième pilier : l'**inférence**. On n'annote pas tout — `const x = 42` infère `number`, `[1, 2].map(n => n * 2)` infère `number[]`. La bonne pratique : annoter les **frontières** (paramètres de fonctions, valeurs de retour publiques, API) et laisser l'inférence faire le reste à l'intérieur.

Troisième pilier : les **unions et le narrowing**. Un type `string | null` force à gérer le cas `null` avant d'appeler `.toUpperCase()`. Le compilateur **rétrécit** le type au fil du contrôle de flot : après un `if (typeof x === "string")`, `x` est un `string` dans la branche. Les outils du narrowing : `typeof`, `instanceof`, l'opérateur `in`, les comparaisons d'un champ discriminant (`if (event.kind === "click")` sur une **discriminated union**), et les **type guards** personnalisés (`function isUser(x: unknown): x is User`).

Point crucial à énoncer en entretien : le typage est un outil de **compilation uniquement**. À l'exécution, il n'y a que du JavaScript. Une réponse d'API annotée `User` n'est **pas vérifiée** — si le serveur renvoie autre chose, TS ne le verra jamais.

> 💡 **Valider aux frontières avec zod** — on décrit un schéma runtime (`z.object({ name: z.string() })`), `schema.parse(data)` valide réellement les données, et `z.infer<typeof schema>` en dérive le type statique. Une seule source de vérité, vérifiée aux deux niveaux.

## Concepts clés à maîtriser

- **`interface` vs `type`** : quasi interchangeables pour décrire un objet. `interface` supporte la **declaration merging** (deux déclarations du même nom fusionnent, utile pour augmenter une lib) et `extends` ; `type` est plus général : unions (`type Status = "ok" | "error"`), tuples, mapped types. Réponse honnête : convention d'équipe, `interface` pour les objets publics, `type` pour le reste.
- **Génériques** : des types paramétrés pour rester précis sans dupliquer. Exemple réel : `function first<T>(arr: T[]): T | undefined { return arr[0]; }` — appelé sur un `string[]`, il rend `string | undefined`, pas `any`. Avec contrainte (`K extends keyof T`) : impossible de demander une clé qui n'existe pas.
- **Utility types** : `Partial<T>` (tout optionnel — payload d'un PATCH), `Pick<T, "id" | "name">` (sous-ensemble), `Omit<T, "password">` (tout sauf — un DTO sans champ sensible), `Record<string, number>` (dictionnaire typé). Les connaître évite de redéclarer des types à la main.
- **`unknown` vs `any`** : `any` **désactive** le compilateur — tout est permis, et il se propage. `unknown` est le contraire : « prouve-le avant d'y toucher » — il force un narrowing avant usage. Pour une entrée externe (JSON, `catch`), `unknown` est le bon choix.
- **Strict mode** : `"strict": true` dans `tsconfig.json` active un lot d'options dont **`strictNullChecks`** — sans elle, `null` et `undefined` sont assignables à tout, et TS perd la moitié de sa valeur. `noImplicitAny` interdit les `any` silencieux. Tout nouveau projet démarre en strict, non négociable.
- **`as` (assertion de type)** : dit au compilateur « fais-moi confiance », sans aucune vérification. Légitime ponctuellement (DOM, résultat de test), dangereux en réflexe (voir Pièges).

Générique et narrowing réunis dans l'exemple canonique :

```ts
// Un générique : Result<T> reste précis quel que soit T
type Result<T> =
  | { ok: true; value: T }       // variante succès
  | { ok: false; error: string } // variante échec

function unwrap<T>(r: Result<T>): T {
  if (r.ok) {
    return r.value; // narrowing : ici r est { ok: true; value: T }
  }
  throw new Error(r.error); // et ici { ok: false; error: string }
}

const n = unwrap({ ok: true, value: 42 }); // n : number, pas any
```

Les trois types « extrêmes » du système, à ne pas confondre :

| | `any` | `unknown` | `never` |
|---|---|---|---|
| Signifie | « Fais ce que tu veux » | « Prouve avant d'utiliser » | « Ne peut pas exister » |
| Assignable à tout le reste | Oui (danger) | Non | Oui (ensemble vide) |
| Tout lui est assignable | Oui | Oui | Non |
| Usage typique | Dette, migration | Entrées externes, `catch` | Exhaustivité d'un `switch` |

> 🎤 **En entretien** — la règle qui tient en une phrase : `unknown` aux frontières, `any` jamais, `never` pour prouver qu'un `switch` couvre tous les cas. La citer telle quelle fait mouche.

## En entretien

**« Qu'est-ce que TypeScript apporte par rapport à JavaScript ? »** — Détection d'erreurs à la compilation (typos, arguments mal typés, `null` non géré), refactoring sûr à l'échelle d'un projet, autocomplétion et navigation fiables dans l'IDE, et un contrat explicite entre modules et entre développeurs. Le tout sans coût runtime : `tsc` émet du JS pur.

**« Différence entre `interface` et `type` ? »** — Pour un objet, presque aucune. `interface` : declaration merging, `extends`, messages d'erreur parfois plus lisibles. `type` : unions, intersections, tuples, mapped types. Citer une convention (interface pour les formes d'objets, type pour les unions) montre qu'on a pratiqué.

**« `any` vs `unknown` ? »** — `any` désactive la vérification et se propage silencieusement ; `unknown` accepte tout en entrée mais interdit tout usage tant qu'on n'a pas rétréci le type (typeof, type guard, schéma zod) — voir le tableau plus haut.

**« Comment TypeScript gère-t-il les données d'une API externe ? »** — Il ne les gère pas : les types disparaissent au runtime, donc annoter `fetch` avec `Promise<User>` est une promesse non tenue. La bonne réponse : valider aux frontières avec zod (ou valibot, io-ts), et dériver le type statique du schéma avec `z.infer` pour n'avoir qu'une source de vérité.

**« Explique les génériques avec un exemple. »** — `function first<T>(arr: T[]): T | undefined` : le type de retour dépend du type d'entrée, sans perte de précision ni duplication. Bonus : une contrainte `K extends keyof T` pour un accès de propriété sûr, ou un `ApiResponse<T>` réutilisé sur toutes les routes.

## Pièges & idées reçues

> ⚠️ **`as` ment au compilateur** — une assertion ne vérifie rien : `data as User` fait juste taire `tsc`, et le double saut `x as unknown as Y` est un signal d'alarme en code review. Chaque `as` est une promesse non vérifiée que le runtime finira par tester à ta place.

- **« TS valide mes données »** — non : la vérification est statique. Un `JSON.parse` rend `any`, une réponse d'API est ce que le serveur a décidé. Sans validation runtime (zod), le typage des frontières est déclaratif, pas garanti.
- **`any` qui se propage** — un seul paramètre `any` et toute la chaîne d'appels perd son typage sans erreur ni warning (sauf `noImplicitAny`). Traquer avec `eslint` (`no-explicit-any`) et typer les points d'entrée.
- **Désactiver `strictNullChecks` « pour aller plus vite »** — c'est renoncer à la protection contre l'erreur la plus fréquente de JS. Migrer un projet existant : activer strict et corriger progressivement, pas l'inverse.
- **`enum`** : génère du code runtime (contrairement au reste de TS) et a des comportements surprenants ; les unions de littéraux (`type Role = "admin" | "user"`) ou `as const` couvrent la plupart des besoins.
- **Confondre erreurs de compilation et erreurs d'exécution** : un `// @ts-ignore` fait taire le compilateur, pas le bug.

## Pour aller plus loin

- [Le Handbook TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html) — la référence officielle, notamment les chapitres [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) et [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — la liste complète, à parcourir une fois
- [Documentation zod](https://zod.dev/) — validation runtime + inférence de types
- Le [TS Playground](https://www.typescriptlang.org/play) pour expérimenter : écrire une discriminated union et observer le narrowing en survolant les variables
