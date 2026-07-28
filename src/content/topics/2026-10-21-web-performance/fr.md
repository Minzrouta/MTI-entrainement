---
title: "Web performance & caching"
date: "2026-10-21"
category: "Web"
level: "Intermédiaire"
summary: "Core Web Vitals, images, JS budget, fonts et surtout le caching HTTP (Cache-Control, ETag, CDN) : ce qui rend un site rapide — et les questions front les plus concrètes en entretien."
---

## L'essentiel

La performance web n'est pas une affaire de micro-optimisations : c'est ce que l'utilisateur perçoit. Google la mesure avec les **Core Web Vitals**, trois métriques qui comptent aussi pour le SEO :

- **LCP** (Largest Contentful Paint, cible < 2,5 s) : le temps d'affichage du plus gros élément visible — en général l'image ou le titre principal. Se dégrade avec des images lourdes, un serveur lent, des ressources bloquantes.
- **INP** (Interaction to Next Paint, cible < 200 ms) : la réactivité aux interactions — le successeur de FID. Se dégrade quand le main thread est occupé par du JavaScript.
- **CLS** (Cumulative Layout Shift, cible < 0,1) : la stabilité visuelle — le bouton qui se décale au moment où vous cliquez. Causé par des images sans dimensions, des fonts qui changent la mise en page, des bannières injectées.

Et la règle d'or avant tout le reste : **mesurer avant d'optimiser**. Lighthouse pour l'audit, l'onglet Network/Performance des DevTools pour le détail, les données terrain (CrUX) pour la réalité des utilisateurs. Optimiser sans mesurer, c'est déplacer des octets au hasard.

La plus grosse optimisation, et de loin, reste la plus simple : **ne pas refaire le travail** — c'est tout le rôle du caching HTTP.

## Comment ça marche

Le chemin d'une requête, avec ses trois niveaux de cache :

```text
Navigateur              CDN (edge)             Origin
──────────              ──────────             ──────
cache local ──miss──▶  cache edge ──miss──▶  serveur
(mémoire/disque)       (PoP proche             génère la
    │ hit               de l'utilisateur)      réponse
    ▼                       │ hit                 │
réponse en ~0 ms            ▼                     ▼
                       réponse rapide   réponse + headers
                                        de cache (remonte
                                        et se fait stocker)
```

Tout est piloté par les **headers de cache** que renvoie l'origin :

| Directive | Effet |
|---|---|
| `max-age=3600` | Frais pendant 1 h : le navigateur ne redemande rien |
| `no-cache` | Stocker, mais **revalider** à chaque fois (ETag/304) |
| `no-store` | Ne jamais stocker (données sensibles) |
| `public` / `private` | Cachable par les intermédiaires (CDN) / seulement le navigateur |
| `immutable` | Ne jamais revalider pendant max-age (fichiers hashés) |
| `s-maxage=600` | max-age spécifique aux caches partagés (CDN) |
| `stale-while-revalidate=60` | Servir le périmé immédiatement, rafraîchir en fond |

**La revalidation** : quand une ressource est périmée (ou en `no-cache`), le navigateur envoie l'**ETag** reçu précédemment (`If-None-Match: "abc123"`). Si le contenu n'a pas changé, le serveur répond **304 Not Modified** — pas de corps, juste « garde ta copie ». On paie un aller-retour, pas le transfert.

**La stratégie deux vitesses**, celle qu'utilisent tous les sites modernes :

```http
# HTML : toujours revalidé — c'est lui qui pointe vers le reste
GET /index.html
Cache-Control: no-cache
ETag: "v42"
# → 304 si inchangé : un aller-retour léger, jamais de HTML périmé

# Assets buildés : hash du contenu DANS le nom de fichier
GET /assets/app.9f3ab2.js
Cache-Control: public, max-age=31536000, immutable
# → 1 an de cache, zéro requête. Un nouveau déploiement change
#   le hash → nouvelle URL → le HTML frais pointe dessus.
#   L'« invalidation » n'existe plus : on change d'URL.
```

> 💡 **La stratégie deux vitesses** — HTML en `no-cache` + assets hashés en `immutable`, c'est la réponse modèle à « comment gères-tu le cache d'une SPA ? ». L'HTML léger se revalide à chaque visite (304), et comme lui seul référence les assets, ceux-ci peuvent être cachés un an sans aucun risque de servir du périmé. Le vieux problème de l'invalidation disparaît : on n'invalide pas, on change d'URL.

Le **CDN** ajoute l'étage intermédiaire : des serveurs edge répartis dans le monde qui servent les réponses cachées près de l'utilisateur (latence ÷ 5 à 10 sur les assets). `s-maxage` contrôle leur durée de cache, et l'invalidation explicite (purge API) reste possible — mais avec des assets hashés, on n'en a presque jamais besoin.

## Concepts clés à maîtriser

- **Images, le poids lourd** (souvent 50 %+ de la page) : formats modernes (**WebP**, **AVIF** : 30-50 % plus légers que JPEG), `loading="lazy"` sur tout ce qui est sous la ligne de flottaison (natif, sans JS), `srcset`/`sizes` pour servir la bonne résolution à chaque écran, et **toujours** `width`/`height` (ou `aspect-ratio`) pour réserver l'espace — c'est ça qui tue le CLS. Attention : jamais de lazy loading sur l'image LCP, au contraire (`fetchpriority="high"`).
- **JS budget** : le JavaScript coûte deux fois — téléchargement, puis parsing/exécution sur le main thread (là où INP se joue). Armes : **code splitting** (un bundle par route, import dynamique pour le lourd), **tree shaking** (éliminer le code non importé — d'où l'importance des imports nommés), `defer` sur les scripts (téléchargement parallèle, exécution après le parsing HTML), et auditer ses dépendances (Bundlephobia : la lib de 200 Ko pour formater une date).
- **Fonts** : une webfont bloque le texte par défaut. `font-display: swap` affiche d'abord la police système (quitte à un léger swap visuel), `<link rel="preload">` charge la font critique tôt, et le **self-host** évite l'aller-retour vers Google Fonts (DNS + connexion tierce). Limiter les variantes (chaque graisse = un fichier).
- **Mesurer** : Lighthouse (labo, reproductible), onglet Performance des DevTools (flame chart du main thread), onglet Network (waterfall, tailles, cache hits), et les données terrain CrUX/RUM — le labo sur votre machine de dev fibrée ne dit rien du mobile 4G de vos utilisateurs.

> 🎤 **En entretien** — « Le site est lent, tu fais quoi ? » Ne partez PAS en liste de recettes. Réponse structurée : 1) mesurer (Lighthouse + Network) pour identifier le goulot, 2) traiter le goulot dominant — image LCP trop lourde ? bundle JS obèse ? pas de cache ? — 3) re-mesurer. Un candidat qui commence par « je regarde le waterfall » vaut dix candidats qui récitent « minifier le CSS ».

## En entretien

**« C'est quoi les Core Web Vitals ? »** — LCP (chargement perçu, < 2,5 s), INP (réactivité aux interactions, < 200 ms), CLS (stabilité visuelle, < 0,1). Donner un levier chacun : LCP → optimiser l'image principale et le TTFB ; INP → réduire le JS sur le main thread ; CLS → dimensions explicites sur images et embeds.

**« Explique Cache-Control: no-cache. »** — Piège classique : ça ne veut PAS dire « ne pas cacher ». Ça signifie « stocke, mais revalide à chaque utilisation » (requête conditionnelle ETag → 304 si inchangé). « Ne jamais stocker », c'est `no-store`.

**« Comment fonctionne un 304 ? »** — Le serveur a envoyé un ETag avec la ressource. À la revalidation, le navigateur envoie `If-None-Match: <etag>` ; si le contenu correspond toujours, le serveur répond 304 sans corps et le navigateur réutilise sa copie. Coût : un aller-retour, pas un transfert.

**« Comment invalides-tu le cache d'un asset ? »** — La vraie réponse : on ne l'invalide pas — on met un hash du contenu dans le nom de fichier (`app.9f3ab2.js`), caché un an en `immutable` ; un déploiement produit un nouveau hash donc une nouvelle URL, référencée par un HTML toujours revalidé. La purge CDN existe, mais c'est le plan B.

**« À quoi sert un CDN ? »** — Rapprocher le contenu de l'utilisateur : des serveurs edge cachent les réponses (selon `s-maxage`/`Cache-Control`) et coupent la latence géographique. Bonus : absorption des pics, TLS terminé à l'edge, et protection de l'origin.

## Pièges & idées reçues

> ⚠️ **Le cache qui sert du périmé** — mettre `max-age=31536000` sur un fichier **non hashé** (`app.js`) : vos utilisateurs garderont l'ancienne version un an, et aucun déploiement ne les touchera. L'`immutable` longue durée est réservé aux URLs qui changent quand le contenu change. À l'inverse, du HTML caché longtemps = des utilisateurs qui pointent vers des assets qui n'existent plus (erreurs après chaque déploiement).

- **« no-cache = pas de cache »** — non : stocker mais revalider. C'est `no-store` qui interdit le stockage. Question piège très fréquente.
- **Lazy-loader l'image LCP** — `loading="lazy"` sur l'image principale retarde exactement ce qu'on mesure : LCP dégradé. Lazy loading = sous la ligne de flottaison uniquement.
- **Optimiser sans mesurer** — minifier un CSS de 10 Ko pendant qu'une image de 4 Mo plombe le LCP. Le waterfall d'abord.
- **Le score Lighthouse comme fin en soi** — c'est une mesure labo sur une machine ; les données terrain (CrUX, RUM) peuvent raconter autre chose. Viser l'expérience réelle, pas le 100 vert.

## Pour aller plus loin

- [web.dev — Core Web Vitals](https://web.dev/articles/vitals) : définitions, seuils et guides d'optimisation par métrique
- [MDN — HTTP caching](https://developer.mozilla.org/fr/docs/Web/HTTP/Caching) : la référence sur Cache-Control, ETag et la revalidation
- [web.dev — Learn Performance](https://web.dev/learn/performance) : le cours complet (images, fonts, JS, ressources critiques)
- [Chrome DevTools — Performance](https://developer.chrome.com/docs/devtools/performance/overview) : analyser le main thread et le waterfall
- Exercice : ouvrir l'onglet Network sur un site connu, observer les `Cache-Control` des assets vs du HTML — la stratégie deux vitesses est partout
