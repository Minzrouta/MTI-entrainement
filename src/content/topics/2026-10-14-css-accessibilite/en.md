---
title: "Modern CSS & accessibility"
date: "2026-10-14"
category: "Web"
level: "Fondamental"
summary: "Specificity, flexbox vs grid, modern units, and accessibility that starts with HTML: the front-end fundamentals recruiters check in five questions."
---

## The essentials

CSS has matured: where hacks were once required (floats for layout, JS for centering), the language now offers native tools — flexbox, grid, custom properties, `clamp()`. What hasn't changed: the **cascade** and **specificity**, the core of the language, which most "mysterious" CSS bugs reveal to be misunderstood.

Accessibility (a11y) is not a cosmetic layer added at the end: it starts with **semantic HTML**. A native `<button>` gives you keyboard focus, a role announced to screen readers, and Enter/Space activation for free; a `<div onclick>` gives you none of that. In front-end interviews, both topics come up systematically — and they separate whoever "does CSS" from whoever understands it.

Specificity, the real calculation: a triplet **(id, classes, elements)** compared left to right — not some magic sum:

```text
Specificity = (id, classes/attributes/pseudo-classes,
               elements/pseudo-elements)

style="…"        → inline: above everything
#nav .link:hover → (1, 2, 0)
.menu .link      → (0, 2, 0)
a.link           → (0, 1, 1)
nav a            → (0, 0, 2)

(1,0,0) beats (0,15,3): one id beats any number
of classes. On an exact tie: the last declared
rule wins. !important short-circuits it all.
```

## How it works

**The cascade** resolves each conflict in this order: origin and importance (browser styles < author stylesheet < `!important`), layers (`@layer`), **specificity**, and finally order of appearance. `!important` beats everything — that's why it's a confession: you use it when you've lost control of your specificity, and it triggers an arms race (the next conflict will require yet another `!important`). The durable solution: keep specificity low and homogeneous (classes, no ids in selectors), so you can always override simply.

**Flexbox vs Grid**: one dimension versus two.

| | Flexbox | Grid |
|---|---|---|
| Dimension | 1D: a row OR a column | 2D: rows AND columns together |
| Who drives | The content (items distribute themselves) | The container (the grid is defined) |
| Typical cases | navbar, button group, centering | page layout, gallery, dashboard |
| Wrapping | `flex-wrap`, independent rows | consistent 2D alignment |
| The winning duo | Inside components | The page structure |

The two combine: grid for the page skeleton, flexbox inside components. And centering, the favorite trick question: `display: grid; place-items: center;` on the parent — two lines.

**Modern units and tools**:

- `rem` (relative to the root) for text: respects the user's font-size setting — unlike frozen `px`. That's an accessibility issue, not a style one.
- `clamp(min, preferred, max)`: fluid typography without a media query — `font-size: clamp(1rem, 2.5vw, 1.5rem)`.
- `dvh` (dynamic viewport height): fixes the classic `100vh` bug on mobile, where the URL bar hides the bottom of the page.
- **Custom properties** (`--accent: #0057b8`): real live variables inside the cascade, overridable per context (dark theme, component) — something Sass variables, compiled then frozen, cannot do.
- **Container queries** (in passing): `@container` adapts a component to its container's size, not the screen's. The missing link of per-component responsive design: a card reused in a narrow sidebar or a wide area adapts by itself.

**Mobile-first**: base styles target the small screen, then `@media (min-width: …)` queries enrich on the way up. Simpler to reason about — you add instead of undoing — and aligned with real-world traffic.

## Key concepts to master

Accessibility, in order of importance:

1. **Semantic HTML first**: `<button>`, `<a>`, `<nav>`, `<main>`, `<label>` linked to its input. Most of accessibility is free when the right elements are used.
2. **Text alternatives**: descriptive `alt` on informative images; `alt=""` (empty, not missing) on decorative ones, so screen readers skip them instead of reading the file name.
3. **Contrast**: 4.5:1 minimum for normal text (WCAG AA), 3:1 for large text. Checkable in two clicks (DevTools, WebAIM).
4. **Visible focus**: `:focus-visible` shows a clear outline during keyboard navigation without polluting mouse clicks. Removing the outline with no replacement makes the site unusable by keyboard.
5. **Keyboard navigation**: everything clickable must be reachable (Tab) and activatable (Enter/Space). Zero-cost test: drop the mouse for five minutes and traverse your page.
6. **ARIA as a last resort**: for states HTML cannot express (`aria-expanded`, `aria-live`). The first rule of ARIA, written in black and white by the W3C: don't use ARIA when a native element is enough.

An accessible component, in full:

```html
<!-- A real <button>: focus, role, keyboard — all native -->
<button class="menu-btn" aria-expanded="false" aria-controls="menu">
  Menu
</button>
<ul id="menu" hidden>…</ul>

<style>
  .menu-btn {
    font-size: 1rem;              /* rem: follows the user's setting */
    padding: 0.5em 1em;           /* em: follows the text size */
    cursor: pointer;
  }
  .menu-btn:focus-visible {       /* visible on keyboard, not on click */
    outline: 3px solid var(--accent, #0057b8);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {      /* respects the system setting */
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
```

The only ARIA needed here: `aria-expanded` (the open/closed state, which HTML cannot express) and `aria-controls` (the link to the menu). The JS toggles `aria-expanded` and `hidden` — that's all.

> ⚠️ **The clickable div** — `<div onClick={...}>` is the original sin of modern front-end: no focus (invisible to Tab), no role (mute for screen readers), no keyboard activation (Enter/Space ignored), no `:disabled` state. Making it accessible requires `tabindex="0"`, `role="button"`, a `keydown` handler… that is, reimplementing, badly, what `<button>` gives you in one tag. If it's clickable: `<button>` for an action, `<a>` for navigation.

> 💡 **prefers-reduced-motion** — some users (vestibular disorders, motion sensitivity) disable animations in their OS. That setting reaches CSS through `@media (prefers-reduced-motion: reduce)`: honoring it costs five lines, ignoring it makes the site physically unpleasant. Mentioning it in an interview signals an above-average a11y culture.

## In an interview

**"What is CSS specificity?"** — The mechanism that settles two rules targeting the same element: a triplet (id, classes/pseudo-classes/attributes, elements) compared position by position, left to right. One id beats any number of classes; on an exact tie, the last declared rule wins; inline style tops everything, and `!important` short-circuits the mechanism. Good practice: keep it low and homogeneous (classes) to stay in control of overrides.

**"Flexbox or Grid: how do you choose?"** — One dimension → flexbox: navbar, row of buttons, items distributing along an axis. Two dimensions → grid: page layout, gallery, rows and columns defined together. They combine: grid for the structure, flexbox inside components. Bonus: `place-items: center` on a grid parent centers an element in two lines.

**"Why a `<button>` rather than a clickable `<div>`?"** — The native element gives you for free: keyboard focus, a role announced to screen readers, Enter/Space activation, the `:disabled` state, form behavior. The div requires reimplementing everything (tabindex, role, keydown) and the result is always incomplete. The rule: ARIA and JS don't fix bad HTML.

**"How do you make a site responsive?"** — Mobile-first: base styles for small screens, `min-width` media queries to enrich. Fluid layouts with grid/flexbox (`minmax()`, `auto-fit`), fluid type with `clamp()`, images at `max-width: 100%`. And for components reused in contexts of different widths: container queries.

**"What is ARIA, and when do you use it?"** — Attributes describing roles and states to assistive technologies when native HTML isn't enough: `aria-expanded` for a dropdown menu, `aria-live` for dynamically updated content. First rule of ARIA: prefer the native element. And bad ARIA is worse than no ARIA: it promises screen readers behaviors the JS doesn't deliver.

## Pitfalls & misconceptions

- **`!important` to "fix" a conflict**: it hides the conflict and triggers the arms race — the next one will require one more `!important`. The real fix: understand which rule wins and why, then lower the specificity.
- **"Accessibility is for the end of the project"**: retrofitting a11y onto bad HTML costs ten times the price of starting with the right elements. And the audience is wide: permanent, temporary (broken arm) and situational (bright sunlight, baby in one arm) impairments.
- **`outline: none` with no replacement**: the classic "it's ugly" move that makes the site unusable by keyboard. `:focus-visible` solves the aesthetics cleanly: outline on keyboard, nothing on click.
- **ARIA everywhere**: `role="button"` on a `<button>`, redundant `aria-label`s… Over-ARIA degrades the screen reader experience. The W3C docs say it literally: *no ARIA is better than bad ARIA*.
- **`px` for text sizes**: ignores the setting of a user who enlarged their system font. `rem` for text, always.
- **Testing only with a mouse on your own screen**: five minutes on the keyboard + one contrast check catch half of the accessibility problems before review.

## Going further

- [MDN — Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity) and [Introducing the CSS Cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade)
- [CSS-Tricks — A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) and [A Complete Guide to CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [web.dev — Learn CSS](https://web.dev/learn/css) and [Learn Accessibility](https://web.dev/learn/accessibility) — Google's two free courses
- [The A11Y Project](https://www.a11yproject.com/) — a pragmatic accessibility checklist
- [WebAIM — Contrast Checker](https://webaim.org/resources/contrastchecker/) — check a contrast ratio in two seconds
- [W3C — Using ARIA: the first rule of ARIA](https://www.w3.org/TR/using-aria/#firstrule)
