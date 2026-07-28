---
title: "CSS moderne & accessibilité"
date: "2026-10-14"
category: "Web"
level: "Fondamental"
summary: "Spécificité, flexbox vs grid, unités modernes, et l'accessibilité qui commence par le HTML : les fondamentaux front que les recruteurs vérifient en cinq questions."
---

## L'essentiel

CSS a mûri : là où il fallait des hacks (floats pour la mise en page, JS pour centrer), le langage offre aujourd'hui des outils natifs — flexbox, grid, custom properties, `clamp()`. Ce qui n'a pas changé : la **cascade** et la **spécificité**, le cœur du langage, que la plupart des bugs CSS « mystérieux » révèlent mal compris.

L'accessibilité (a11y) n'est pas une couche cosmétique ajoutée à la fin : elle commence par le **HTML sémantique**. Un `<button>` natif apporte gratuitement le focus clavier, le rôle annoncé aux lecteurs d'écran, l'activation Entrée/Espace ; un `<div onclick>` n'apporte rien de tout ça. En entretien front, ces deux sujets tombent systématiquement — et distinguent celui qui « fait du CSS » de celui qui le comprend.

La spécificité, le vrai calcul : un triplet **(id, classes, éléments)** comparé de gauche à droite — pas une somme magique :

```text
Spécificité = (id, classes/attributs/pseudo-classes,
               éléments/pseudo-éléments)

style="…"        → inline : au-dessus de tout
#nav .link:hover → (1, 2, 0)
.menu .link      → (0, 2, 0)
a.link           → (0, 1, 1)
nav a            → (0, 0, 2)

(1,0,0) bat (0,15,3) : un id bat n'importe quel
nombre de classes. À égalité : la dernière règle
déclarée gagne. !important court-circuite tout.
```

## Comment ça marche

**La cascade** résout chaque conflit dans cet ordre : origine et importance (styles navigateur < feuille auteur < `!important`), couches (`@layer`), **spécificité**, et enfin ordre d'apparition. `!important` gagne contre tout — c'est pour ça que c'est un aveu : on l'utilise quand on a perdu le contrôle de sa spécificité, et il déclenche la surenchère (le prochain conflit exigera un autre `!important`). La solution durable : rester bas et homogène en spécificité (des classes, pas d'id dans les sélecteurs), pour pouvoir toujours surcharger simplement.

**Flexbox vs Grid** : une dimension contre deux.

| | Flexbox | Grid |
|---|---|---|
| Dimension | 1D : une ligne OU une colonne | 2D : lignes ET colonnes ensemble |
| Qui pilote | Le contenu (les items se répartissent) | Le conteneur (la grille est définie) |
| Cas typiques | navbar, groupe de boutons, centrage | layout de page, galerie, dashboard |
| Retour à la ligne | `flex-wrap`, rangées indépendantes | alignement 2D cohérent |
| Le duo gagnant | L'intérieur des composants | La structure de la page |

Les deux se combinent : grid pour le squelette de la page, flexbox à l'intérieur des composants. Et le centrage, question piège favorite : `display: grid; place-items: center;` sur le parent — deux lignes.

**Unités et outils modernes** :

- `rem` (relative à la racine) pour le texte : respecte le réglage de taille de l'utilisateur — contrairement au `px` figé. C'est un enjeu d'accessibilité, pas de style.
- `clamp(min, préféré, max)` : la typo fluide sans media query — `font-size: clamp(1rem, 2.5vw, 1.5rem)`.
- `dvh` (dynamic viewport height) : corrige le bug classique du `100vh` sur mobile, où la barre d'URL masque le bas de page.
- **Custom properties** (`--accent: #0057b8`) : de vraies variables vivantes dans la cascade, surchargeables par contexte (thème sombre, composant) — ce que les variables Sass, compilées puis figées, ne savent pas faire.
- **Container queries** (en survol) : `@container` adapte un composant à la taille de son conteneur, pas de l'écran. Le chaînon manquant du responsive par composant : une card réutilisée dans une sidebar étroite ou une zone large s'adapte seule.

**Mobile-first** : les styles de base ciblent le petit écran, puis les `@media (min-width: …)` enrichissent en montant. Plus simple à raisonner — on ajoute au lieu d'annuler — et aligné sur la réalité du trafic.

## Concepts clés à maîtriser

L'accessibilité, dans l'ordre d'importance :

1. **HTML sémantique d'abord** : `<button>`, `<a>`, `<nav>`, `<main>`, `<label>` relié à son input. L'essentiel de l'accessibilité est gratuit quand les bons éléments sont utilisés.
2. **Alternatives textuelles** : `alt` descriptif sur les images informatives ; `alt=""` (vide, pas absent) sur les décoratives, pour que les lecteurs d'écran les sautent au lieu de lire le nom du fichier.
3. **Contraste** : 4.5:1 minimum pour le texte normal (WCAG AA), 3:1 pour le grand texte. Vérifiable en deux clics (DevTools, WebAIM).
4. **Focus visible** : `:focus-visible` affiche un contour net à la navigation clavier sans polluer le clic souris. Supprimer l'outline sans remplacement rend le site inutilisable au clavier.
5. **Navigation clavier** : tout ce qui se clique doit être atteignable (Tab) et activable (Entrée/Espace). Test à coût zéro : lâcher la souris cinq minutes et traverser sa page.
6. **ARIA en dernier recours** : pour les états que le HTML ne sait pas exprimer (`aria-expanded`, `aria-live`). La première règle d'ARIA, écrite noir sur blanc par le W3C : ne pas utiliser ARIA quand un élément natif suffit.

Un composant accessible, au complet :

```html
<!-- Un vrai <button> : focus, rôle, clavier — tout est natif -->
<button class="menu-btn" aria-expanded="false" aria-controls="menu">
  Menu
</button>
<ul id="menu" hidden>…</ul>

<style>
  .menu-btn {
    font-size: 1rem;              /* rem : suit le réglage utilisateur */
    padding: 0.5em 1em;           /* em : suit la taille du texte */
    cursor: pointer;
  }
  .menu-btn:focus-visible {       /* visible au clavier, pas au clic */
    outline: 3px solid var(--accent, #0057b8);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {      /* respecte le réglage système */
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
```

Le seul ARIA nécessaire ici : `aria-expanded` (l'état ouvert/fermé, que le HTML ne sait pas exprimer) et `aria-controls` (le lien vers le menu). Le JS bascule `aria-expanded` et `hidden` — c'est tout.

> ⚠️ **Le div cliquable** — `<div onClick={...}>` est le péché originel du front moderne : pas de focus (invisible au Tab), pas de rôle (muet pour les lecteurs d'écran), pas d'activation clavier (Entrée/Espace ignorés), pas d'état `:disabled`. Le rendre accessible exige `tabindex="0"`, `role="button"`, un handler `keydown`… soit réimplémenter, mal, ce que `<button>` donne en une balise. Si ça se clique : `<button>` pour une action, `<a>` pour une navigation.

> 💡 **prefers-reduced-motion** — certains utilisateurs (troubles vestibulaires, sensibilité au mouvement) désactivent les animations dans leur OS. Le réglage arrive en CSS via `@media (prefers-reduced-motion: reduce)` : le respecter coûte cinq lignes, l'ignorer rend le site physiquement pénible. Le mentionner en entretien signale une culture a11y au-dessus de la moyenne.

## En entretien

**« C'est quoi la spécificité CSS ? »** — Le mécanisme qui départage deux règles ciblant le même élément : un triplet (id, classes/pseudo-classes/attributs, éléments) comparé position par position, de gauche à droite. Un id bat n'importe quel nombre de classes ; à égalité exacte, la dernière règle déclarée gagne ; le style inline surclasse le tout, et `!important` court-circuite le mécanisme. Bonne pratique : rester bas et homogène (des classes) pour garder la main sur les surcharges.

**« Flexbox ou Grid : comment tu choisis ? »** — Une dimension → flexbox : navbar, ligne de boutons, les items se répartissent le long d'un axe. Deux dimensions → grid : layout de page, galerie, lignes et colonnes définies ensemble. Ils se combinent : grid pour la structure, flexbox dans les composants. Bonus : `place-items: center` sur un parent grid centre un élément en deux lignes.

**« Pourquoi un `<button>` plutôt qu'un `<div>` cliquable ? »** — Le natif apporte gratuitement : focus clavier, rôle annoncé aux lecteurs d'écran, activation Entrée/Espace, état `:disabled`, comportement dans les formulaires. Le div exige de tout réimplémenter (tabindex, role, keydown) et le résultat est toujours incomplet. La règle : ARIA et JS ne réparent pas un mauvais HTML.

**« Comment tu rends un site responsive ? »** — Mobile-first : styles de base pour petit écran, media queries `min-width` pour enrichir. Layouts fluides avec grid/flexbox (`minmax()`, `auto-fit`), typo fluide avec `clamp()`, images en `max-width: 100%`. Et pour les composants réutilisés dans des contextes de largeurs différentes : container queries.

**« C'est quoi ARIA, et quand l'utiliser ? »** — Des attributs qui décrivent rôles et états aux technologies d'assistance quand le HTML natif ne suffit pas : `aria-expanded` pour un menu déroulant, `aria-live` pour du contenu mis à jour dynamiquement. Première règle d'ARIA : préférer l'élément natif. Et un mauvais ARIA est pire que pas d'ARIA : il promet aux lecteurs d'écran des comportements que le JS n'assure pas.

## Pièges & idées reçues

- **`!important` pour « régler » un conflit** : il le masque et déclenche la surenchère — le prochain conflit exigera un `!important` de plus. Le vrai fix : comprendre quelle règle gagne et pourquoi, puis baisser la spécificité.
- **« L'accessibilité, c'est pour la fin du projet »** : rattraper l'a11y sur du mauvais HTML coûte dix fois le prix de partir des bons éléments. Et le public concerné est large : handicaps permanents, temporaires (bras cassé) et situationnels (plein soleil, bébé dans un bras).
- **`outline: none` sans remplacement** : le classique du « c'est moche » qui rend le site inutilisable au clavier. `:focus-visible` règle l'esthétique proprement : contour au clavier, rien au clic.
- **ARIA partout** : `role="button"` sur un `<button>`, `aria-label` redondants… Le sur-ARIA dégrade l'expérience au lecteur d'écran. La doc du W3C le dit littéralement : *no ARIA is better than bad ARIA*.
- **`px` pour les tailles de texte** : ignore le réglage de l'utilisateur qui a agrandi sa police système. `rem` pour le texte, toujours.
- **Tester uniquement à la souris sur son écran** : cinq minutes au clavier + un test de contraste attrapent la moitié des problèmes d'accessibilité avant la review.

## Pour aller plus loin

- [MDN — Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity) et [Introducing the CSS Cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade)
- [CSS-Tricks — A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) et [A Complete Guide to CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [web.dev — Learn CSS](https://web.dev/learn/css) et [Learn Accessibility](https://web.dev/learn/accessibility) — les deux parcours gratuits de Google
- [The A11Y Project](https://www.a11yproject.com/) — checklist d'accessibilité pragmatique
- [WebAIM — Contrast Checker](https://webaim.org/resources/contrastchecker/) — vérifier un contraste en deux secondes
- [W3C — Using ARIA : the first rule of ARIA](https://www.w3.org/TR/using-aria/#firstrule)
