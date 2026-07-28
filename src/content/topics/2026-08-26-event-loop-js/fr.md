---
title: "JavaScript : event loop & async"
date: "2026-08-26"
category: "Web"
level: "Fondamental"
summary: "Call stack, microtasks, macrotasks, promises et async/await : le « dans quel ordre ça log ? » est LA question JavaScript la plus posée en entretien de stage front comme back."
---

## L'essentiel

JavaScript exécute votre code sur **un seul thread** : une seule instruction à la fois, une seule **call stack**. Et pourtant un serveur Node encaisse des milliers de requêtes simultanées et une page web reste fluide pendant un `fetch`. Le secret n'est pas dans le langage mais dans son environnement d'exécution : l'**event loop**.

Le modèle : les opérations lentes (réseau, timers, disque) sont déléguées aux APIs de l'environnement (navigateur ou Node/libuv), qui travaillent en coulisses. Quand une opération se termine, son **callback** est mis en file d'attente ; l'event loop le dépile et l'exécute **quand la call stack est vide**. On ne bloque jamais en attendant : on s'inscrit pour être rappelé.

Il n'y a pas une file mais deux, et c'est là que se jouent tous les pièges d'entretien :

| | Microtasks | Macrotasks (tasks) |
|---|---|---|
| Sources | `.then/.catch/.finally`, `await`, `queueMicrotask` | `setTimeout`, `setInterval`, I/O, événements UI |
| Quand | **Toutes**, dès que la stack se vide | **Une seule** par tour de boucle |
| Priorité | Toujours avant la macrotask suivante | Après vidage complet des microtasks |
| Risque | Une chaîne infinie affame la boucle | Un callback lent gèle tout |

## Comment ça marche

Un tour d'event loop : exécuter le code synchrone jusqu'à vider la call stack → vider **entièrement** la file des microtasks (y compris celles créées en cours de route) → prendre **une** macrotask → recommencer.

```text
       ┌───────────────┐
       │   Call stack   │◀────────────────────┐
       └───────┬───────┘                      │
               │ stack vide ?                 │
               ▼                              │
   ┌───────────────────────┐                  │
   │ Microtasks (promises)  │── vidées EN     │
   └───────────┬───────────┘   ENTIER d'abord │
               ▼                              │
   ┌───────────────────────┐                  │
   │ Macrotasks (setTimeout,│── UNE seule,    │
   │  I/O, clics…)          │   puis re-boucle┘
   └───────────────────────┘
   Web APIs / libuv travaillent en parallèle
   et poussent les callbacks dans les files.
```

Le grand classique, à savoir dérouler ligne par ligne :

```javascript
console.log("1");                          // synchrone : direct

setTimeout(() => console.log("2"), 0);     // macrotask, même à 0ms

Promise.resolve().then(() => console.log("3")); // microtask

(async () => {
  console.log("4");                        // synchrone ! avant le await
  await null;                              // suspend : la suite = microtask
  console.log("5");
})();

console.log("6");
// Ordre : 1, 4, 6, 3, 5, 2
// → tout le synchrone d'abord (1, 4, 6)
// → puis TOUTES les microtasks (3, puis 5)
// → puis la macrotask du setTimeout (2)
```

`setTimeout(fn, 0)` ne veut donc pas dire « immédiat » : ça veut dire « au plus tôt au prochain tour de boucle, après tout le synchrone et toutes les microtasks » — et si la stack est occupée 3 secondes, le callback attendra 3 secondes. Le délai est un **minimum**, pas une garantie.

> 🎤 **En entretien** — le « dans quel ordre ça log ? » est le grand classique absolu. La méthode qui marche : trois colonnes mentales (synchrone / microtasks / macrotasks), classer chaque ligne, puis lire colonne par colonne. Verbaliser ce classement à voix haute pendant l'exercice, c'est exactement ce que l'intervieweur veut entendre.

## Concepts clés à maîtriser

- **Promise** : un objet représentant une valeur future, avec trois états — `pending`, puis **une seule fois** `fulfilled` ou `rejected` (elle est alors *settled*, définitivement). `.then` retourne une **nouvelle** promise, d'où le chaînage plat qui a remplacé le *callback hell*.
- **Combinateurs** : `Promise.all` (tout en parallèle, rejette dès le **premier** échec), `Promise.allSettled` (attend tout, donne les résultats ET les échecs), `Promise.race` (le premier *settled* gagne — pratique pour un timeout).
- **`async/await`** : du sucre syntaxique sur les promises. Une fonction `async` retourne toujours une promise ; `await` **suspend la fonction** (pas le thread !) et rend la main à l'event loop — la suite de la fonction devient une microtask.
- **Gestion d'erreurs** : `try/catch` autour d'`await`, ou `.catch()` sur la chaîne. Une rejection jamais capturée = `unhandledRejection` (crash possible en Node). Piège : `try { maFonctionAsync() }` sans `await` ne capture **rien** — la promise rejette après la sortie du `try`.
- **Le cas Node.js** : même modèle (event loop libuv, phases timers → I/O → check), même règle d'or — **ne jamais bloquer l'event loop**. Un `JSON.parse` de 50 Mo ou une boucle de calcul gèle *toutes* les requêtes du serveur, pas une seule. Pour le CPU-bound : **`worker_threads`** (vrais threads avec leur propre event loop) ou découper le travail.

> 💡 **Parallèle vs séquentiel** — `await a(); await b();` exécute en séquence (2× le temps). `await Promise.all([a(), b()])` lance les deux en même temps. Repérer des `await` en série sur des opérations indépendantes est une des remarques les plus faciles à placer en revue de code… et en entretien.

## En entretien

**« JavaScript est single-threaded : comment gère-t-il 1000 requêtes simultanées ? »** — Le thread JS n'exécute que du code court ; les opérations lentes (réseau, disque) sont déléguées à l'environnement (Web APIs, libuv) qui, lui, est asynchrone/multithreadé. Les callbacks reviennent par les files, dépilées quand la stack est vide. La concurrence vient de l'attente entrelacée, pas du parallélisme du code JS.

**« Pourquoi `setTimeout(fn, 0)` n'exécute-t-il pas `fn` immédiatement ? »** — Parce que `fn` devient une macrotask : elle attend la fin du code synchrone en cours ET le vidage complet des microtasks. 0 ms = délai minimum avant mise en file, jamais un rendez-vous.

**« Microtask vs macrotask ? »** — Deux files distinctes. Microtasks (callbacks de promises, `await`) : la file est vidée entièrement dès que la stack se libère, avant toute macrotask. Macrotasks (`setTimeout`, I/O, événements) : une seule par tour de boucle. Conséquence directe : un `.then` passe toujours avant un `setTimeout(0)` armé au même moment.

**« Différence entre `Promise.all` et `Promise.allSettled` ? »** — `all` rejette dès le premier échec (fail-fast) : bien quand tout est indispensable. `allSettled` attend toutes les promises et retourne `{status, value|reason}` pour chacune : bien pour des opérations indépendantes dont on veut le bilan complet.

**« C'est quoi "bloquer l'event loop" en Node, et que faire pour du CPU-bound ? »** — Toute tâche synchrone longue (gros parse, crypto, boucle de calcul) monopolise l'unique thread : plus aucune requête n'est servie pendant ce temps. Solutions : `worker_threads` pour déporter le calcul, découper en morceaux (`setImmediate`), ou déléguer à un service dédié.

## Pièges & idées reçues

> ⚠️ **`await` dans une boucle** — `for (const u of urls) { await fetch(u); }` télécharge un par un. Si les requêtes sont indépendantes : `await Promise.all(urls.map(u => fetch(u)))`. C'est le piège de performance async le plus courant en projet étudiant — et les intervieweurs le savent.

- **« async/await rend le code multithread »** — non : c'est toujours un seul thread. `await` suspend *la fonction*, jamais le thread ; entre-temps, l'event loop exécute autre chose.
- **`forEach` + `async` ne s'attend pas** : `array.forEach(async x => …)` n'attend rien du tout (`forEach` ignore les promises retournées). Utiliser `for…of` + `await`, ou `Promise.all(array.map(…))`.
- **Une promise démarre à sa création**, pas au `.then` : `const p = fetch(url)` lance déjà la requête. Le `.then` ne fait que s'abonner au résultat.
- **Oublier qu'`await` rend la main** : entre `await` et la ligne suivante, l'état du programme a pu changer (autre requête traitée, variable partagée modifiée). Source de bugs de concurrence subtils, même en single-thread.
- **`process.nextTick` (Node)** passe même avant les microtasks promises — à connaître de nom, à éviter en pratique.

## Pour aller plus loin

- [MDN — The event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) et [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Jake Archibald — In the Loop (JSConf)](https://www.youtube.com/watch?v=cCOL7MC4Pl0) : LA conférence de référence, visuelle et mémorable
- [Node.js — Don't block the event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop) : le guide officiel côté serveur
- S'entraîner : écrire des snippets mêlant `setTimeout`, `.then` et `async/await`, prédire l'ordre sur papier, vérifier dans la console — dix minutes par jour jusqu'à ne plus se tromper
