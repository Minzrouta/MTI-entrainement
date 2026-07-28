---
title: "SSR, CSR, SSG & hydration"
date: "2026-09-16"
category: "Web"
level: "Intermédiaire"
summary: "Où le HTML est-il produit, quand, et à quel prix ? La question de rendu web revient dans tous les entretiens front — savoir justifier CSR vs SSR vs SSG vs ISR selon le produit fait la différence."
---

## L'essentiel

Toute la question du rendu web tient en une phrase : **où et quand le HTML est-il produit ?** Quatre réponses possibles, quatre stratégies :

| | CSR | SSR | SSG | ISR |
|---|---|---|---|---|
| HTML produit | Navigateur (JS) | Serveur, par requête | Build, une fois | Build + régénération |
| TTFB | Rapide (coquille vide) | Plus lent (calcul) | Excellent (statique) | Excellent (statique) |
| Contenu initial | Vide puis fetch | Complet | Complet | Complet |
| SEO | Fragile | Bon | Bon | Bon |
| Fraîcheur données | Temps réel | Par requête | Figée au build | Périodique |
| Coût serveur | Quasi nul (CDN) | Un rendu/requête | Quasi nul (CDN) | Faible |
| Exemple type | Dashboard, SaaS | E-commerce, feed | Docs, blog, portfolio | Catalogue, presse |

- **CSR (Client-Side Rendering)** : le serveur envoie une page quasi vide + un bundle JS ; le navigateur télécharge, exécute, fetch les données, et construit le DOM. C'est le modèle SPA (React avec Vite, par exemple).
- **SSR (Server-Side Rendering)** : le serveur exécute les composants **à chaque requête** et renvoie du HTML complet. L'utilisateur voit le contenu tout de suite… mais il n'est pas encore interactif (voir hydration).
- **SSG (Static Site Generation)** : le HTML est généré **au build**, une fois pour toutes, puis servi tel quel depuis un CDN. Imbattable en perf et en coût — tant que le contenu ne change pas à chaque requête.
- **ISR (Incremental Static Regeneration)** : du SSG dont les pages se **régénèrent en arrière-plan** après expiration d'un délai (`revalidate`). Le beurre du statique, l'argent de la fraîcheur.

## Comment ça marche

Le point que les candidats ratent le plus : **le HTML rendu côté serveur n'est pas interactif**. Les gestionnaires d'événements (`onClick`…) n'existent que dans le JS. Il faut donc l'**hydration** : le navigateur télécharge le bundle, ré-exécute les composants, fait correspondre le résultat au DOM existant, et attache les événements. Entre le premier affichage et la fin de l'hydration, la page est **visible mais sourde** — cliquer ne fait rien.

```text
SSR + hydration, chronologie :

t0 ── requête ──▶ serveur rend le HTML
t1 ◀── HTML complet ── FCP : l'utilisateur VOIT la page
t2 ◀── bundle JS ──── téléchargement + parsing
t3 ─── hydration ──── React ré-exécute et attache
t4 ─── TTI ────────── la page RÉPOND aux clics

     t1 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ t4
        "uncanny valley" : visible
        mais pas interactive
```

En CSR, la timeline est inversée : rien à voir avant t3, mais dès que ça s'affiche, c'est interactif. Le SSR optimise le *First Contentful Paint*, pas le *Time To Interactive*.

Deux évolutions attaquent ce coût d'hydration :

- **Islands architecture** (Astro) : la page est du HTML statique par défaut, et seuls quelques **îlots** explicitement marqués interactifs (`client:load`, `client:visible`) reçoivent du JS. Le site sur lequel vous lisez cette fiche fonctionne exactement comme ça : le contenu est statique, le quiz est un îlot. Zéro JS pour le texte, un petit bundle pour l'interactif.
- **Streaming SSR & Server Components** (survol) : plutôt que d'attendre que toute la page soit prête, le serveur **streame** le HTML par morceaux (`<Suspense>`), et les React Server Components ne s'hydratent jamais — leur code ne quitte pas le serveur, seul le résultat voyage. Moins de JS envoyé, hydration sélective.

> 🎤 **En entretien** — « pourquoi ton site perso est en SSG ? » La meilleure réponse relie stratégie et produit : « le contenu change quand je le décide (au déploiement), pas à chaque visite. Donc je paie le rendu une fois au build, je sers du HTML pur depuis un CDN : TTFB minimal, SEO parfait, hébergement gratuit, rien à sécuriser côté serveur. Du SSR serait payer à chaque requête pour recalculer un résultat identique. » Vous venez de montrer que vous choisissez une architecture par ses trade-offs, pas par la hype.

## Concepts clés à maîtriser

- **Choisir selon le produit, pas la mode** : contenu identique pour tous et rarement modifié → SSG. Contenu par utilisateur ou changeant à chaque requête + SEO → SSR. App derrière un login, sans enjeu SEO → CSR suffit largement. Catalogue volumineux mis à jour périodiquement → ISR.
- **SEO et crawlers** : Google exécute le JS, mais avec délai et budget de crawl ; les aperçus de liens (Slack, réseaux sociaux) ne l'exécutent pas du tout. Un contenu qui doit être indexé ou partagé doit être **dans le HTML initial**.
- **Hydration mismatch** : si le rendu client ne correspond pas au HTML serveur (date `new Date()`, `Math.random()`, `window.innerWidth`…), le framework avertit et re-rend — flash visuel et perf dégradée. Règle : le premier rendu doit être déterministe, les valeurs client-only arrivent dans un `useEffect`.
- **Le mix par route** : les frameworks modernes (Next.js, Nuxt, SvelteKit) choisissent la stratégie **page par page** — landing en SSG, produit en ISR, panier en SSR ou CSR. « Quel rendu pour ce site ? » est une question par route, pas globale.

L'exemple canonique de SSG paramétré, `getStaticPaths` :

```jsx
// pages/blog/[slug].jsx — Next.js (Pages Router)

// Au BUILD : quelles pages générer ?
export async function getStaticPaths() {
  const posts = await cms.getAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: "blocking", // slug inconnu → rendu à la volée puis mis en cache
  };
}

// Au BUILD, pour chaque slug : les données de la page
export async function getStaticProps({ params }) {
  const post = await cms.getPost(params.slug);
  if (!post) return { notFound: true };
  return {
    props: { post },
    revalidate: 3600, // ISR : régénérée en arrière-plan au plus toutes les heures
  };
}

// Ce composant s'exécute au build (et à l'hydration côté client)
export default function BlogPost({ post }) {
  return <article dangerouslySetInnerHTML={{ __html: post.html }} />;
}
```

> 💡 **La ligne qui change tout** — sans `revalidate`, cette page est du SSG pur : figée jusqu'au prochain build. Avec, c'est de l'ISR : le premier visiteur après expiration reçoit encore l'ancienne version pendant que la nouvelle se génère derrière (stale-while-revalidate). Savoir expliquer cette ligne, c'est prouver qu'on a compris le spectre statique ↔ dynamique.

## En entretien

**« Explique la différence entre CSR, SSR et SSG. »** — La question est : où et quand le HTML est produit. CSR : dans le navigateur, à l'exécution — coquille vide puis JS. SSR : sur le serveur, à chaque requête — HTML complet immédiat, hydraté ensuite. SSG : au build, une fois — HTML statique servi par CDN. Conclure par le critère de choix : fraîcheur des données et personnalisation contre coût et TTFB.

**« Qu'est-ce que l'hydration et pourquoi est-elle nécessaire ? »** — Le HTML issu du SSR est inerte : aucun event listener. L'hydration ré-exécute les composants côté client, rattache l'état et les événements au DOM existant. Nécessaire parce que l'interactivité vit dans le JS ; coûteuse parce qu'on paie le rendu deux fois — d'où l'écart FCP/TTI et les alternatives (islands, Server Components).

**« Pourquoi une SPA CSR a-t-elle un mauvais SEO ? »** — Le HTML initial est vide ; le contenu n'apparaît qu'après exécution du JS. Google finit par l'exécuter (avec délai et budget), mais les aperçus sociaux jamais. Si l'indexation compte, il faut le contenu dans le HTML : SSR, SSG ou pré-rendering.

**« C'est quoi l'ISR et quel problème ça résout ? »** — Le SSG ne passe pas à l'échelle du rebuild : 50 000 produits = 50 000 pages à régénérer pour corriger un prix. L'ISR régénère chaque page individuellement, en arrière-plan, après un délai (`revalidate`) ou sur demande (webhook du CMS). On garde le TTFB du statique avec une fraîcheur contrôlée.

**« Quand choisirais-tu du CSR pur ? »** — App derrière une authentification (dashboard, back-office, SaaS) : pas de SEO, utilisateurs récurrents (bundle en cache), interactivité riche. Le SSR y ajouterait de la complexité serveur pour un premier affichage que personne n'indexe.

## Pièges & idées reçues

> ⚠️ **« SSR = meilleure performance »** — non : le SSR améliore le FCP et le SEO, mais dégrade le TTFB (calcul à chaque requête) et n'accélère pas l'interactivité (l'hydration reste à payer). Une page SSR lourde peut être *visible* vite et *utilisable* tard — la pire expérience : l'utilisateur clique dans le vide.

- **« Le SEO exige du SSR »** — le SSG donne un SEO tout aussi bon (le HTML est complet) pour bien moins cher. Le SSR ne s'impose que si le contenu change à chaque requête.
- **Hydration mismatch** : rendre `new Date().toLocaleString()` ou du contenu dépendant de `window` au premier rendu → avertissement, re-rendu, flash. Client-only = `useEffect` (ou `client:only` en Astro).
- **« Statique = pas de données dynamiques »** — faux : une page SSG peut fetch côté client après chargement (commentaires, stock, likes). Coquille statique + îlots dynamiques est un pattern majeur.
- **Tout mettre dans un îlot** en Astro « au cas où » — on recrée une SPA en pièces détachées. Un îlot se justifie par une interaction réelle, sinon HTML statique.
- Oublier que **ces stratégies se mélangent par route** : répondre « SSR ou SSG ? » pour un site entier est déjà une erreur de cadrage — la bonne réponse commence par « quelle page ? ».

## Pour aller plus loin

- [Rendering on the Web](https://web.dev/articles/rendering-on-the-web) (web.dev) — la cartographie de référence des stratégies de rendu
- [Islands Architecture](https://docs.astro.build/en/concepts/islands/) — le concept expliqué par la doc Astro (et [le pattern original](https://jasonformat.com/islands-architecture/) par Jason Miller)
- [Next.js — Rendering](https://nextjs.org/docs/app/building-your-application/rendering) : Server Components, streaming, statique vs dynamique
- Expérimenter : `curl -s https://votre-site | head -50` — si le contenu est dans la réponse, c'est du SSR/SSG ; si c'est un `<div id="root"></div>` vide, c'est du CSR. Test à faire sur vos propres projets avant l'entretien.
