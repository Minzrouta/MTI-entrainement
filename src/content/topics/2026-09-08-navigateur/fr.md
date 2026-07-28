---
title: "Le navigateur sous le capot"
date: "2026-09-08"
category: "Web"
level: "Intermédiaire"
summary: "Du HTML aux pixels : parsing, render tree, reflow, compositing, multi-process et stockage — tout ce qu'un recruteur attend derrière « que se passe-t-il quand la page s'affiche ? »."
---

## L'essentiel

Le navigateur n'est pas une boîte noire qui « affiche du HTML » : c'est un petit système d'exploitation, avec un moteur de rendu (Blink, WebKit, Gecko), un moteur JavaScript (V8, JavaScriptCore, SpiderMonkey), une pile réseau et une architecture **multi-process**. La question « que se passe-t-il entre la réponse du serveur et les pixels à l'écran ? » est un grand classique d'entretien front-end : elle teste d'un coup votre compréhension du rendu, de la performance et de la sécurité.

La chaîne complète s'appelle le **critical rendering path** : l'ensemble minimal d'étapes et de ressources bloquantes que le navigateur doit franchir avant le premier rendu. La maîtriser, c'est savoir *pourquoi* une page est lente — et où agir.

Trois niveaux de coût à retenir d'emblée :

| Changement | Étapes rejouées | Coût |
|---|---|---|
| `width`, `margin`, ajout de nœud | Layout → Paint → Composite | Élevé (**reflow**) |
| `color`, `background`, `visibility` | Paint → Composite | Moyen (**repaint**) |
| `transform`, `opacity` | Composite seul | Minime (GPU) |

## Comment ça marche

Six étapes, toujours dans le même ordre :

1. **Parsing HTML → DOM** — le parser lit le flux d'octets (le parsing est incrémental : il commence avant la fin du téléchargement) et construit le **DOM**, l'arbre d'objets vivant qui représente le document. Un `<script>` classique **bloque le parser** : il pourrait faire `document.write()`, le navigateur doit donc l'exécuter avant de continuer.
2. **Parsing CSS → CSSOM** — les feuilles de style produisent le **CSSOM**. Le CSS est **render-blocking** (pas de rendu sans styles complets, sinon flash de contenu non stylé) et il bloque aussi *l'exécution* des scripts, qui pourraient lire des styles calculés.
3. **Render tree** — fusion DOM + CSSOM : uniquement les nœuds visibles, avec leurs styles calculés. `display: none` en est exclu ; `visibility: hidden` y reste (l'élément occupe sa place).
4. **Layout (reflow)** — calcul de la géométrie exacte de chaque boîte : position et taille, en cascade depuis la racine.
5. **Paint** — rasterisation : chaque élément devient des pixels, répartis dans une ou plusieurs **layers**.
6. **Composite** — le GPU assemble les layers dans le bon ordre. C'est pour ça que `transform` et `opacity` sont quasi gratuits : ils ne touchent que cette étape.

```text
      HTML                       CSS
        │ parsing                  │ parsing
        ▼                          ▼
       DOM          +            CSSOM
        └────────────┬─────────────┘
                     ▼
               Render tree
                     ▼
        Layout    (géométrie → reflow)
                     ▼
        Paint     (pixels → repaint)
                     ▼
        Composite (GPU, layers)
```

Et les scripts dans tout ça ? Deux attributs changent la donne :

- **`async`** — téléchargement en parallèle du parsing, exécution **dès que le script est prêt**, éventuellement en plein parsing, dans un ordre non garanti. Pour les scripts indépendants (analytics, pubs).
- **`defer`** — téléchargement en parallèle, exécution **après la fin du parsing**, dans l'ordre du document, juste avant `DOMContentLoaded`. Le bon défaut pour le code applicatif (et le comportement de `type="module"`).

> 🎤 **En entretien** — « que se passe-t-il entre la réponse HTML et l'affichage ? » : déroulez le pipeline en six étapes (DOM, CSSOM, render tree, layout, paint, composite), précisez ce qui bloque quoi (script classique → parser ; CSS → rendu et scripts), et concluez sur le critical rendering path : moins de ressources bloquantes = premier rendu plus tôt. Une minute, structuré, imbattable.

## Concepts clés à maîtriser

- **Reflow vs repaint** — le reflow recalcule la géométrie et se propage (changer la taille d'un parent repositionne ses enfants, parfois tout l'arbre) ; le repaint redessine des pixels sans toucher à la géométrie. Un reflow entraîne toujours un repaint, l'inverse est faux. Le reflow est l'opération la plus chère du rendu.
- **Layout thrashing** — alterner lectures de géométrie (`offsetWidth`, `getBoundingClientRect()`) et écritures de style force un reflow **synchrone** à chaque lecture :

```js
// ❌ Layout thrashing : N reflows forcés
boxes.forEach(box => {
  const w = box.offsetWidth;      // lecture → le navigateur DOIT
                                  // recalculer le layout, invalidé
                                  // par l'écriture du tour précédent
  box.style.width = w / 2 + 'px'; // écriture → invalide le layout
});

// ✅ Corrigé : toutes les lectures, PUIS toutes les écritures
const widths = boxes.map(b => b.offsetWidth); // 1 layout encore valide
boxes.forEach((box, i) => {
  box.style.width = widths[i] / 2 + 'px';     // 1 seul reflow, différé
});                                           // au prochain frame
```

> 💡 **Réflexe à montrer** — grouper lectures puis écritures, et caler les animations sur `requestAnimationFrame` (une exécution par frame, juste avant le rendu). Pour prouver le problème : l'onglet Performance des DevTools marque les reflows forcés d'un triangle d'avertissement violet.

- **Architecture multi-process** — un **browser process** (UI, orchestration, accès disque/réseau), un **renderer process par site** (site isolation), un **GPU process**, des process réseau et utilitaires. Un onglet qui crashe n'emporte pas le navigateur, et deux sites ne partagent jamais le même espace mémoire (la réponse à Spectre).
- **Sandbox** — le renderer exécute du code non fiable (le web) : il n'a **aucun accès direct** au système de fichiers ni au réseau. Chaque opération sensible passe par IPC vers le browser process, qui contrôle. Un exploit dans le moteur de rendu reste enfermé dans le bac à sable.
- **Stockage côté client** :

| | Cookies | localStorage | sessionStorage |
|---|---|---|---|
| Envoyé au serveur | À chaque requête HTTP | Jamais | Jamais |
| Durée de vie | Expiration configurable | Persistant | Fermeture de l'onglet |
| Taille | ~4 Ko | ~5-10 Mo | ~5 Mo |
| Accès JavaScript | Oui, sauf `HttpOnly` | Oui | Oui |
| Portée | Domaine (+ path) | Origine | Origine + onglet |

- **Same-origin policy**, en une phrase : deux URLs partagent une origine si **schéma + hôte + port** sont identiques, et un document ne peut lire les données (DOM, storage, réponses) que de sa propre origine — CORS étant le mécanisme pour assouplir cette règle explicitement, côté serveur.

## En entretien

**« Quelle différence entre reflow et repaint ? »** — Le reflow recalcule la géométrie (positions, tailles) et peut se propager à une grande partie de l'arbre ; le repaint redessine les pixels sans changer la géométrie. Le reflow inclut un repaint, jamais l'inverse. Déclencheurs : `width` ou ajout de nœud → reflow ; `color` → repaint ; `transform`/`opacity` → ni l'un ni l'autre (composite seul).

**« defer vs async ? »** — Les deux téléchargent sans bloquer le parser. `async` exécute dès que le script est prêt, ordre non garanti : scripts indépendants. `defer` exécute après le parsing, dans l'ordre du document, avant `DOMContentLoaded` : code qui touche au DOM. Bonus : `type="module"` est defer par défaut.

**« Pourquoi animer avec transform plutôt que top/left ? »** — `top`/`left` déclenchent layout + paint + composite à chaque frame ; `transform` est appliqué par le GPU à l'étape composite, sans reflow ni repaint. À 60 fps, c'est la différence entre une animation fluide et du jank.

**« Où stocker un token d'authentification ? »** — Pas dans `localStorage` : lisible par n'importe quel script de la page, donc volable à la première faille XSS. Le plus sûr : cookie `HttpOnly` + `Secure` + `SameSite`, invisible pour JavaScript. Montrer qu'on voit le compromis : le cookie part tout seul avec chaque requête → penser CSRF, contré par `SameSite` ou un token dédié.

**« Pourquoi chaque onglet a-t-il son propre process ? »** — Stabilité (un crash reste local à l'onglet), sécurité (sandbox du renderer + site isolation : deux origines ne partagent jamais leur mémoire), performance (vrai parallélisme sur plusieurs cœurs). Coût assumé : plus de RAM.

## Pièges & idées reçues

> ⚠️ **Piège vécu** — lire `offsetWidth` ou `getBoundingClientRect()` dans une boucle qui écrit aussi des styles : chaque lecture force un reflow synchrone et le frame budget de 16 ms explose. Le code « marche », il est juste 50× trop lent — invisible sur votre machine de dev, flagrant sur un mobile milieu de gamme.

- **« display:none et visibility:hidden, c'est pareil »** — non : `display: none` sort l'élément du render tree (reflow quand il revient) ; `visibility: hidden` conserve sa boîte (repaint seul).
- **« async est toujours mieux que defer »** — non : `async` peut s'exécuter en plein parsing (et donc le bloquer à ce moment-là) et casse l'ordre entre scripts dépendants. `defer` est le défaut raisonnable.
- **« Le DOM, c'est le HTML »** — le HTML est le texte source ; le DOM est l'arbre d'objets vivant, réparé par le parser (balises mal fermées) et mutable par JavaScript. Ce que montre l'inspecteur, c'est le DOM, pas le source.
- **« Le CSS bloque le parsing du HTML »** — imprécis : le CSS bloque le **rendu** et l'exécution des **scripts**, pas le parser HTML, qui continue à construire le DOM… tant qu'un script classique ne l'arrête pas.
- Oublier que `sessionStorage` est **par onglet** : deux onglets du même site ne le partagent pas — source classique de bugs de « session perdue » en ouvrant un lien dans un nouvel onglet.

## Pour aller plus loin

- [MDN — Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work)
- [web.dev — Critical rendering path](https://web.dev/articles/critical-rendering-path)
- [Inside look at modern web browser](https://developer.chrome.com/blog/inside-browser-part1) : l'architecture multi-process de Chrome illustrée, en 4 parties
- [MDN — Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- Exercice : ouvrir l'onglet **Performance** des DevTools sur n'importe quel site, enregistrer 5 secondes de scroll, et retrouver layout, paint et composite dans la timeline
