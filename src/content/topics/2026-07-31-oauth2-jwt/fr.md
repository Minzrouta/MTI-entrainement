---
title: "OAuth 2.0, OIDC & JWT"
date: "2026-07-31"
category: "Sécurité"
level: "Intermédiaire"
summary: "Qui es-tu, qu'as-tu le droit de faire, et comment le prouver sans état côté serveur : le trio auth le plus demandé en entretien backend — et celui où les candidats mélangent tout."
---

## L'essentiel

**Authentification** : prouver qui on est. **Autorisation** : décider ce qu'on a le droit de faire. Toute la confusion autour du sujet vient de là : **OAuth 2.0 est un framework d'autorisation déléguée** (« cette app peut lire mes repos GitHub sans connaître mon mot de passe »), pas un protocole d'authentification. C'est **OIDC (OpenID Connect)** qui ajoute la couche d'identité par-dessus. Et **JWT (JSON Web Token)** n'est qu'un format de token signé, utilisé (entre autres) par ces protocoles.

Deux grands modèles pour maintenir un utilisateur connecté :

- **Sessions + cookies** : le serveur garde l'état (mémoire, Redis, DB) ; le navigateur ne détient qu'un identifiant de session opaque dans un cookie. Révocation triviale (supprimer la session), mais un état à partager entre instances.
- **Tokens auto-porteurs (JWT)** : l'état est dans le token, signé par le serveur. Tout service qui détient la clé de vérification valide le token **sans appel réseau ni stockage partagé** — idéal en microservices — mais la révocation devient le problème.

## Comment ça marche

Un JWT, ce sont trois parties encodées en **base64url**, séparées par des points : `header.payload.signature`.

- **Header** : l'algorithme de signature — `{"alg":"RS256","typ":"JWT"}`.
- **Payload** : les **claims** — `sub` (sujet), `iss` (émetteur), `aud` (audience), `exp` (expiration), `iat` (émission), plus des claims métier (rôles, email).
- **Signature** : calculée sur header + payload. **HS256** = HMAC avec un **secret partagé** (le même secret signe et vérifie — symétrique). **RS256** = RSA : la clé **privée** signe, la clé **publique** vérifie. En microservices, RS256 s'impose : les services vérifient avec la clé publique (publiée via un endpoint **JWKS**) sans jamais détenir la clé privée.

Point crucial : un JWT est **signé, pas chiffré**. Le payload se décode en un clic (jwt.io). La signature garantit l'intégrité et l'origine, pas la confidentialité.

**Le problème de la révocation** : un JWT reste valide jusqu'à son `exp` — le serveur ne « voit » pas un logout ou un bannissement. La réponse standard : **access token court** (5-15 min) + **refresh token** long, stocké et révocable côté serveur. Un access token volé a une fenêtre d'exploitation courte ; le refresh token, lui, se révoque — et se **rotate** : chaque usage en émet un nouveau, et la réutilisation d'un ancien signale un vol.

**OAuth 2.0** définit quatre rôles : **resource owner** (l'utilisateur), **client** (l'application), **authorization server** (émet les tokens), **resource server** (l'API protégée). Les flows à connaître :

- **Authorization code + PKCE** — le flow de référence. Le client redirige vers l'authorization server ; l'utilisateur s'authentifie et consent ; le serveur renvoie un `code` éphémère que le client échange contre les tokens. **PKCE** : le client génère un `code_verifier` aléatoire, envoie son hash SHA-256 (`code_challenge`) au départ, puis prouve la possession du verifier à l'échange — un code intercepté est inexploitable. Recommandé pour **tous** les clients (SPA, mobile, backend), obligatoire dans OAuth 2.1.
- **Client credentials** — machine-to-machine, aucun utilisateur : le client s'authentifie directement (batch, service interne).
- **Implicit** (token renvoyé dans le fragment d'URL) et **ROPC** (mot de passe saisi dans le client) : **dépréciés**, supprimés d'OAuth 2.1. À citer comme tels, pas à utiliser.

**OIDC** standardise l'identité au-dessus d'OAuth : le scope `openid`, un **`id_token`** (un JWT) portant qui est l'utilisateur (claims standardisés : `sub`, `email`, `name`…), et un endpoint `/userinfo`. « Login with Google », c'est OIDC. Retenir la répartition : **access token → appeler l'API ; id_token → savoir qui est connecté**. Ne jamais utiliser l'un pour l'autre.

## Concepts clés à maîtriser

- **Valider un JWT côté serveur** : vérifier la signature avec l'algorithme **attendu** (imposé par le serveur, jamais lu aveuglément dans le header), puis `exp`, `iss` et `aud`. Toujours via une lib éprouvée (jose, jsonwebtoken, PyJWT) — jamais de crypto maison.
- **Stockage côté front** : `localStorage` est lisible par tout JavaScript de la page → une faille **XSS** exfiltre le token. Un cookie `httpOnly` + `Secure` + `SameSite` est invisible pour JS, mais envoyé automatiquement → surface **CSRF** (atténuée par `SameSite=Lax/Strict` et un token anti-CSRF). Pattern robuste : access token **en mémoire** (variable JS, perdu au refresh, renouvelé silencieusement), refresh token en **cookie httpOnly**.
- **Scopes** : le périmètre demandé par le client (`repo:read`) — de l'autorisation, pas de l'identité. Le resource server doit les vérifier.
- **Expiration et horloges** : `exp` se vérifie côté serveur avec une petite tolérance (clock skew) ; côté client, on rafraîchit avant l'expiration.
- **JWKS et rotation de clés** : l'authorization server publie ses clés publiques avec un identifiant `kid` ; on fait tourner les clés sans redéployer les services.

## En entretien

**« Différence entre authentification et autorisation ? »** — Authentification = vérifier l'identité (login, MFA). Autorisation = vérifier les droits (ce user peut-il supprimer cette ressource ?). Le bonus qui fait mouche : OAuth 2.0 fait de l'autorisation ; l'authentification, c'est le rôle d'OIDC.

**« Explique la structure d'un JWT. »** — Trois segments base64url : header (alg), payload (claims : sub, iss, aud, exp…), signature sur les deux premiers. Signé, pas chiffré : n'importe qui le lit, personne ne le modifie sans casser la signature. HS256 secret partagé vs RS256 clé privée/publique.

**« Comment déconnecter un utilisateur si son JWT est encore valide ? »** — On ne peut pas invalider le token lui-même sans réintroduire de l'état. Réponse attendue : access token court + révocation du refresh token ; si l'invalidation immédiate est exigée, denylist des `jti` (dans Redis) jusqu'à `exp` — en assumant qu'on a re-perdu le « stateless ».

**« Pourquoi PKCE ? »** — Historiquement pour les clients publics (mobile/SPA) incapables de garder un `client_secret` : le hash du `code_verifier` lie le code au client qui l'a demandé, donc un code volé ne s'échange pas. Aujourd'hui recommandé partout, même avec un secret.

**« Où stockes-tu le token côté front ? »** — Réponse structurée : localStorage = vulnérable XSS ; cookie httpOnly = protégé XSS mais penser CSRF (SameSite, token anti-CSRF) ; le compromis access-en-mémoire + refresh-en-cookie-httpOnly. Montrer qu'on connaît les deux attaques vaut plus que la réponse elle-même.

## Pièges & idées reçues

- **`alg: none` et confusion d'algorithme** : de vieilles libs acceptaient un token déclarant `"alg":"none"` (signature vide !) ou vérifiaient un token RS256 en HS256 avec la clé publique comme secret HMAC. Parade : imposer côté serveur la liste des algorithmes acceptés.
- **Secret HS256 faible** : la signature se brute-force **hors ligne** (hashcat) — un secret type « secret123 » tombe en quelques secondes, et l'attaquant forge ensuite des tokens admin. Secret long et aléatoire (256 bits), ou RS256.
- **Données sensibles dans le payload** : base64 ≠ chiffrement. Pas de mot de passe, pas de données personnelles inutiles dans un JWT.
- **« JWT = moderne, sessions = obsolète »** : pour une app web monolithe, une session server-side est plus simple ET révocable. Le JWT se justifie par le multi-services, pas par la mode.
- **Oublier `aud`/`iss`** : un token émis pour le service A accepté par le service B — le claim d'audience existe précisément pour ça.

## Pour aller plus loin

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) et [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700) : l'état de l'art officiel (2025)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) et [OAuth 2.1 (draft)](https://oauth.net/2.1/), qui consolide les bonnes pratiques
- [jwt.io](https://jwt.io/) pour décoder des tokens, et la [cheat sheet OWASP JWT](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) côté implémentation
