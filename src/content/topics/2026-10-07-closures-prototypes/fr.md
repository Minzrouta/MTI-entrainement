---
title: "Closures, prototypes & this"
date: "2026-10-07"
category: "Web"
level: "Intermédiaire"
summary: "Les trois mécanismes qui font trébucher en entretien front : la closure (LA question JS la plus posée), la chaîne de prototypes derrière le mot-clé class, et les quatre règles de this."
---

## L'essentiel

Trois mécanismes du cœur de JavaScript concentrent l'essentiel des questions d'entretien front — parce qu'ils révèlent si vous comprenez le langage ou si vous le récitez.

Une **closure** est une fonction qui **capture les variables de son scope lexical de définition** et les garde vivantes après la fin de la fonction englobante. « Lexical » signifie : déterminé par la position du code dans le fichier, pas par la façon dont la fonction sera appelée. Chaque fonction JS emporte avec elle l'environnement où elle est née.

Les **prototypes** sont le vrai mécanisme d'héritage de JavaScript : chaque objet possède un lien interne `[[Prototype]]` vers un autre objet. Lire une propriété absente déclenche une remontée de cette **chaîne de prototypes** jusqu'à `null`. Le mot-clé `class` (ES2015) n'a rien changé au moteur : c'est du **sucre syntaxique** au-dessus des prototypes.

`this` n'est **pas** « l'objet courant » : sa valeur dépend du **site d'appel**, pas du lieu de définition — quatre règles suffisent à couvrir tous les cas, plus l'exception des arrow functions qui n'ont pas de `this` propre.

En survol, deux compagnons de route : le **hoisting** (les déclarations `var` et `function` sont remontées en tête de scope) et la **TDZ** (temporal dead zone : `let`/`const` sont hissées aussi, mais y accéder avant la ligne de déclaration jette une `ReferenceError`).

## Comment ça marche

**La closure, par le piège classique** — la question de code la plus posée en entretien JS :

```javascript
// Le piège : var n'a pas de scope de bloc
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));   // → 3, 3, 3
}
// Les 3 callbacks capturent LA MÊME variable i
// (une closure référence la variable, pas sa valeur).
// Quand ils s'exécutent, la boucle est finie : i === 3.

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j));   // → 0, 1, 2
}
// let crée une NOUVELLE liaison j à chaque itération :
// chaque callback capture la sienne.

// Usage réel : de l'état privé (pattern module)
function makeCounter() {
  let count = 0;               // invisible de l'extérieur
  return () => ++count;        // la closure garde count vivant
}
const next = makeCounter();
next(); // 1
next(); // 2 — l'état survit entre les appels
```

Les usages réels sont partout : compteurs et état privé, modules (exposer une API, cacher l'implémentation), callbacks qui se souviennent de leur contexte, memoization, debounce/throttle. Les hooks React reposent entièrement dessus — le fameux bug de la « stale closure » dans `useEffect`, c'est exactement le piège du `var` ci-dessus.

**La chaîne de prototypes** — lire `rex.eat()` déclenche une recherche ascendante :

```text
rex { name: "Rex" }
  │ [[Prototype]]
  ▼
Dog.prototype { bark() }
  │ [[Prototype]]        ← posé par extends
  ▼
Animal.prototype { eat() }   ← trouvé ici !
  │ [[Prototype]]
  ▼
Object.prototype { toString(), hasOwnProperty()… }
  │
  ▼
null                     ← fin de la chaîne
```

`class Dog extends Animal` ne fait que câbler ce schéma : les méthodes vont sur `Dog.prototype`, et `Dog.prototype.[[Prototype]]` pointe vers `Animal.prototype`. Un détail qui fait mouche en entretien : les méthodes ne sont **pas copiées** dans chaque instance — mille chiens partagent l'unique fonction `bark` de `Dog.prototype`.

**Les quatre règles de `this`** — à évaluer au site d'appel, par ordre de priorité décroissante :

| Règle | Forme d'appel | `this` vaut |
|---|---|---|
| 1. `new` | `new User()` | L'objet fraîchement créé |
| 2. Explicite | `f.call(ctx)` / `f.apply(ctx)` / `f.bind(ctx)` | Le `ctx` passé en argument |
| 3. Méthode | `obj.f()` | L'objet avant le point |
| 4. Appel simple | `f()` | `undefined` en strict mode (`globalThis` sinon) |

Les **arrow functions** court-circuitent tout : elles n'ont pas de `this` propre et utilisent celui du **scope lexical englobant** — le `this` de l'endroit où elles sont écrites. Idéal pour les callbacks (`setTimeout(() => this.tick())` dans une classe), catastrophique comme méthode d'objet (`this` ne sera jamais l'objet).

> 🎤 **En entretien** — « c'est quoi une closure ? » est LA question JS la plus posée. Réponse en trois temps : la définition (« une fonction qui capture les variables de son scope de définition et les garde vivantes après la fin de la fonction englobante »), un exemple concret (le compteur `makeCounter`), un usage réel (« c'est ce qui permet l'état privé — et tout le modèle des hooks React »). Définition + exemple + usage : imparable.

## Concepts clés à maîtriser

- **Une closure capture des variables, pas des valeurs** — c'est une référence vivante : si la variable change après la création de la closure, la closure voit la nouvelle valeur. Tout le piège du `var` dans la boucle tient dans cette phrase.
- **`prototype` vs `[[Prototype]]`** — deux choses différentes : `prototype` est une propriété des fonctions constructrices (le futur `[[Prototype]]` de leurs instances) ; `[[Prototype]]` est le lien interne de chaque objet, lisible via `Object.getPrototypeOf(obj)` (le vieux `__proto__` est déprécié).
- **`class` est du sucre** — sous le capot : des fonctions constructrices et des prototypes câblés. Mais un sucre utile : syntaxe claire, appel sans `new` interdit, `super` propre. Le dire ainsi montre les deux niveaux de lecture.
- **La méthode détachée perd son `this`** — `const f = obj.method; f()` : règle 4, appel simple, `this === undefined`. Le grand classique des handlers d'événements. Trois remèdes : `obj.method.bind(obj)`, une arrow `() => obj.method()`, ou un champ de classe `method = () => {…}`.
- **Hoisting & TDZ en deux phrases** — `var` est hissée et initialisée à `undefined` (lisible trop tôt, sans erreur : source de bugs silencieux) ; `let`/`const` sont hissées mais non initialisées : y toucher avant la déclaration jette une `ReferenceError`. La TDZ transforme un bug silencieux en erreur franche — c'est un progrès.

> 💡 **Le réflexe qui sauve** — pour trouver `this`, ne regardez jamais où la fonction est *définie* (sauf arrow function) : regardez comment elle est *appelée*. Y a-t-il un `new` ? Un `.call/.bind` ? Un objet avant le point ? Rien ? Les quatre règles, dans cet ordre.

## En entretien

**« C'est quoi une closure ? Donne un usage réel. »** — Définition exacte (fonction + variables capturées de son scope de définition, qui survivent), exemple du compteur, usages : état privé, modules, callbacks, debounce, hooks React. Voir le callout ci-dessus pour la structure.

**« Que va afficher cette boucle `for (var i…)` avec `setTimeout` ? »** — « 3, 3, 3 » : les trois callbacks partagent la même variable `i`, lue après la fin de la boucle. Correctif : `let` (nouvelle liaison par itération) ou une IIFE qui fige la valeur. Expliquer le *pourquoi* (capture de variable, pas de valeur) fait la différence.

**« Comment marche l'héritage en JavaScript ? »** — Par délégation le long de la chaîne de prototypes : une propriété absente est cherchée sur `[[Prototype]]`, puis remontée jusqu'à `null`. `class`/`extends` ne sont que du sucre au-dessus. Bonus : les méthodes sont partagées via le prototype, pas copiées par instance.

**« Les quatre règles de `this` ? »** — `new` > `call`/`apply`/`bind` > méthode (`obj.f()`) > appel simple (`undefined` en strict). Et l'exception : les arrow functions n'ont pas de `this` propre, elles prennent celui du scope où elles sont écrites.

**« Pourquoi `const f = obj.method; f()` casse, et comment corriger ? »** — Détacher la méthode fait retomber sur la règle de l'appel simple : `this` vaut `undefined`. Corrections : `bind`, wrapper arrow, ou champ de classe en arrow. Citer le cas réel : `addEventListener(this.handleClick)` en React classe.

## Pièges & idées reçues

> ⚠️ **L'arrow function n'est pas « la nouvelle syntaxe de fonction »** — c'est une fonction *sans* `this`, sans `arguments`, non constructible (`new` interdit). En faire une méthode d'objet (`obj = { greet: () => this.name }`) est le piège inverse du candidat qui a retenu « arrow = bien » : ici `this` ne sera jamais `obj`.

- **« Une closure copie les valeurs »** — non : elle référence les variables. C'est précisément pour ça que la boucle `var` affiche 3, 3, 3 et non 0, 1, 2.
- **« `class` a apporté de vraies classes comme en Java »** — non : le modèle reste prototypal, `class` est une syntaxe. Un `typeof Dog` renvoie `"function"`.
- **`prototype` confondu avec `__proto__`** — `Dog.prototype` (propriété de la fonction) deviendra le `[[Prototype]]` des instances ; `rex.__proto__` (accès déprécié au lien interne) *est* `Dog.prototype`. Les confondre trahit une compréhension récitée.
- **Les closures et la mémoire** — une closure garde vivant tout ce qu'elle capture : un listener qui capture un gros objet et n'est jamais retiré (`removeEventListener` oublié) est une fuite mémoire classique en SPA.
- **Hoisting mal compris** — « `var` remonte la déclaration *et* l'assignation » : faux, seule la déclaration remonte ; la variable vaut `undefined` jusqu'à la ligne d'assignation.

## Pour aller plus loin

- [MDN — Closures](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Closures) : la référence, avec le piège de la boucle détaillé
- [MDN — Héritage et chaîne de prototypes](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain) : le modèle objet complet
- [You Don't Know JS (Kyle Simpson)](https://github.com/getify/You-Dont-Know-JS) : les tomes *Scope & Closures* et *this & Object Prototypes* — gratuits, la meilleure plongée qui existe
- [javascript.info — Closures](https://javascript.info/closure) et [javascript.info — Prototypes](https://javascript.info/prototypes) : pédagogiques, avec exercices corrigés
- S'entraîner : prédire la sortie de snippets `this`/closures avant de les coller dans la console — le format exact des questions d'entretien
