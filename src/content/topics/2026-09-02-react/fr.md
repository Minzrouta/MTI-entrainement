---
title: "React : Virtual DOM, hooks & reconciliation"
date: "2026-09-02"
category: "Web"
level: "Intermédiaire"
summary: "UI = f(state), diffing, keys, useState/useEffect et leurs pièges : le cœur de React tel qu'on vous le demandera en entretien front — avec les réponses modèles."
---

## L'essentiel

React repose sur une idée simple : **l'UI est une fonction de l'état** — `UI = f(state)`. Vous ne manipulez jamais le DOM à la main (« ajoute ce `<li>`, change cette classe ») : vous décrivez à quoi l'interface *doit ressembler* pour un état donné, et React fait converger le DOM réel vers cette description. C'est le passage de l'**impératif** (jQuery) au **déclaratif**.

Pour y arriver, chaque composant retourne du JSX — du sucre syntaxique pour des appels `React.createElement` qui produisent des objets JavaScript légers : le **Virtual DOM**. À chaque changement d'état, React recalcule cet arbre d'objets, le **compare au précédent** (diffing) et n'applique au DOM réel que les mutations strictement nécessaires. Créer et comparer des objets JS est quasi gratuit ; manipuler le DOM réel est lent.

Les **hooks** (depuis React 16.8) sont l'API qui donne aux composants fonction un état (`useState`), des effets de bord (`useEffect`) et de la mémoïsation (`useMemo`, `useCallback`) — sans classes.

## Comment ça marche

Une mise à jour se déroule en deux phases distinctes :

1. **Render** : React appelle vos fonctions composants et obtient un nouveau Virtual DOM. Cette phase doit être **pure** (aucun effet de bord) : React peut l'interrompre, la rejouer ou la jeter — c'est pour détecter les impuretés que le StrictMode double les renders en dev.
2. **Commit** : React compare l'ancien et le nouvel arbre (**reconciliation**) et applique la liste minimale de mutations au DOM réel, de façon synchrone. Puis le navigateur paint, puis les `useEffect` s'exécutent.

```text
setState() ──▶ RENDER (pur, interruptible)
               composants() → nouveau Virtual DOM
                    │
                    ▼  diff ancien vs nouveau
               (reconciliation) → mutations minimales
                    │
                    ▼
               COMMIT (synchrone) → DOM réel à jour
                    │
                    ▼
               paint navigateur → useEffect
```

Le diff exact de deux arbres coûterait O(n³) ; React le ramène à **O(n)** avec deux heuristiques :

- **Type différent au même endroit** (`<div>` → `<span>`, ou `CompA` → `CompB`) : React démonte tout le sous-arbre (état local perdu) et le reconstruit.
- **Même type** : React garde le nœud, ne met à jour que les props qui changent, puis descend récursivement.

Pour les **listes**, ces heuristiques ne suffisent pas : sans repère, React compare position par position. Les **keys** donnent une identité stable à chaque élément : React détecte qu'un élément a été déplacé, inséré ou supprimé, et déplace le nœud DOM au lieu de le réécrire — en conservant son état (valeur d'input, focus, animation).

> 🎤 **En entretien** — « explique le Virtual DOM » est LA question React. Réponse en trois temps : (1) une représentation de l'UI en objets JS, peu coûteuse à recréer ; (2) à chaque changement d'état, React diffe le nouvel arbre contre l'ancien ; (3) seules les différences sont appliquées au DOM réel, la partie lente. Concluez par la nuance qui fait la différence : le Virtual DOM n'est pas « plus rapide que le DOM », c'est un modèle déclaratif à coût acceptable.

## Concepts clés à maîtriser

| Hook | Rôle | Piège classique |
|---|---|---|
| `useState` | État local, déclenche le re-render | Muter l'objet au lieu d'en créer un nouveau |
| `useEffect` | Effet de bord après le commit | Deps manquantes (valeurs périmées) ou absentes (boucle infinie) |
| `useMemo` | Mémoïser un calcul coûteux | Le mettre partout « par réflexe » : la mémoïsation a un coût |
| `useCallback` | Référence de fonction stable | Inutile si l'enfant n'est pas `React.memo` |
| `useRef` | Valeur mutable sans re-render | Lire/écrire `.current` pendant le render |
| `useContext` | Lire une valeur partagée | Tous les consommateurs re-rendent à chaque changement |

**Règles des hooks** : appelés uniquement au **niveau supérieur** du composant (jamais dans un `if`, une boucle ou une fonction imbriquée), et uniquement depuis un composant React ou un hook custom. Raison technique : React associe chaque `useState`/`useEffect` à sa valeur **par ordre d'appel**. Un hook conditionnel décale la liste et tout se mélange.

`useEffect` synchronise le composant avec un système extérieur (fetch, WebSocket, timer, DOM manuel). L'anatomie complète :

```jsx
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    // s'exécute APRÈS le commit, quand `query` change
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      });

    // cleanup : exécuté AVANT la prochaine exécution
    // de l'effet, et au démontage du composant
    return () => controller.abort(); // annule la requête obsolète
  }, [query]); // deps : ne relance l'effet que si query change

  return (
    <ul>
      {results.map((r) => (
        <li key={r.id}>{r.name}</li> // key stable : l'id, pas l'index
      ))}
    </ul>
  );
}
```

`useMemo`/`useCallback` sont utiles dans deux cas : (1) un calcul réellement coûteux, (2) la stabilité de référence conditionne autre chose — un enfant `React.memo`, les deps d'un autre hook. Ailleurs, c'est du bruit : mesurer avant d'optimiser (React DevTools Profiler).

**Où placer l'état ?** L'échelle à monter dans l'ordre :

- **Lifting state up** : deux frères partagent un état → on le remonte dans le parent commun, passé en props. Couvre 80 % des cas.
- **Context** : une valeur vraiment globale et peu changeante (thème, utilisateur connecté, langue) → évite le *prop drilling*. Attention : chaque changement re-rend tous les consommateurs.
- **State managers** (Redux Toolkit, Zustand) ou état serveur (TanStack Query) : quand l'état global devient complexe ou vient majoritairement du serveur. En entretien de stage, savoir *situer* ces outils suffit.

> 💡 **Réflexe à montrer** — avant d'ajouter un `useEffect`, demandez-vous s'il est nécessaire : une valeur dérivée de l'état se calcule pendant le render (au besoin dans un `useMemo`), pas dans un effet qui fait un `setState`. La page « You Might Not Need an Effect » de la doc officielle est un excellent filtre.

## En entretien

**« Explique-moi le Virtual DOM. »** — Une représentation légère de l'UI en objets JavaScript. À chaque changement d'état, React reconstruit cet arbre (peu coûteux), le compare à la version précédente (diffing) et n'applique au DOM réel — la partie lente — que les différences. Bénéfice : un modèle déclaratif `UI = f(state)` sans payer un re-render complet du DOM. Nuance à placer : ce n'est pas intrinsèquement plus rapide que du DOM manuel optimisé, c'est un compromis productivité/performance.

**« Comment React décide-t-il quoi mettre à jour ? »** — Par la reconciliation, un diff en O(n) basé sur deux heuristiques : type différent à une position donnée → sous-arbre démonté et recréé (état local perdu) ; même type → mise à jour des props modifiées puis descente récursive. Dans les listes, les keys donnent l'identité stable qui permet de détecter déplacements, insertions et suppressions.

**« Pourquoi ne pas utiliser l'index comme key ? »** — Parce que l'index identifie la position, pas l'élément. Insérez un élément en tête : tous les index se décalent, React croit que chaque élément a changé de contenu et associe l'état local et DOM (valeur d'input, focus, case cochée) au mauvais élément. Key correcte : un id stable issu des données. L'index n'est tolérable que pour une liste statique, jamais triée, filtrée ni modifiée.

**« À quoi sert le tableau de dépendances de useEffect ? »** — Il dit à React quand relancer l'effet : à chaque render si absent, au montage seulement si `[]`, quand une valeur listée change sinon. Toute valeur réactive lue dans l'effet doit y figurer, sous peine de *stale closure* (valeurs périmées capturées). Le cleanup retourné s'exécute avant chaque relance et au démontage — c'est là qu'on annule fetchs, timers et subscriptions.

**« Quand useMemo et useCallback sont-ils utiles ? »** — `useMemo` mémorise le résultat d'un calcul, `useCallback` la référence d'une fonction. Utiles si le calcul est coûteux ou si la stabilité de référence conditionne un enfant `React.memo` ou les deps d'un autre hook. Par défaut, ne pas en mettre : chaque mémoïsation coûte de la mémoire et une comparaison de deps, et c'est au Profiler de justifier l'optimisation.

## Pièges & idées reçues

> ⚠️ **key=index, le piège n°1** — sur une liste triable, filtrable ou éditable, `key={index}` mélange l'état des lignes : la valeur tapée dans l'input de la ligne 2 se retrouve dans la ligne 3 après une suppression, parce que React accroche l'état à la key, pas au contenu. C'est LE piège que les recruteurs font expliquer, souvent sur un bout de code à corriger.

- **Muter le state** : `items.push(x); setItems(items)` ne re-rend pas — même référence, et React compare avec `Object.is`. Toujours créer un nouvel objet/tableau : `setItems([...items, x])`.
- **`useEffect` sans deps qui fait un `setState`** → l'effet se relance à chaque render, le `setState` re-rend, boucle infinie. Symptôme classique : l'API appelée en rafale.
- **`setState` n'est pas synchrone** : la variable garde l'ancienne valeur jusqu'au prochain render, et les mises à jour sont batchées. Pour dépendre de la valeur précédente : `setCount(c => c + 1)`.
- **« Le Virtual DOM rend React plus rapide que le DOM »** — non, c'est une couche en plus. Il rend le déclaratif viable en évitant les réécritures inutiles ; du DOM manuel finement optimisé sera toujours plus rapide, mais inmaintenable à l'échelle.

## Pour aller plus loin

- [react.dev — Learn React](https://react.dev/learn) : le tutoriel officiel, remarquablement bien fait
- [Render and Commit](https://react.dev/learn/render-and-commit) et [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) : reconciliation et keys expliquées en profondeur
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) : le meilleur filtre anti-`useEffect`
- [React Developer Tools](https://react.dev/learn/react-developer-tools) : profiler les re-renders avant d'optimiser
