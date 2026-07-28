---
title: "HTTP de A à Z"
date: "2026-08-20"
category: "Web"
level: "Fondamental"
summary: "Méthodes, codes de statut, cookies, HTTP/2 et 3 : le protocole que vous utilisez cent fois par jour — et sur lequel un recruteur peut creuser pendant vingt minutes."
---

## L'essentiel

HTTP (HyperText Transfer Protocol) est le protocole **requête/réponse** du web : un client (navigateur, `curl`, appli mobile) envoie une requête, un serveur renvoie une réponse, et la conversation s'arrête là. Il est **stateless** : chaque requête est autonome, le serveur n'a aucune mémoire de la précédente — tout ce qui ressemble à une « session » est reconstruit par-dessus (cookies, tokens).

Une requête tient en trois parties : une **ligne de requête** (méthode + chemin + version, ex. `GET /users/42 HTTP/1.1`), des **headers** (paires clé-valeur : `Host`, `Accept`, `Authorization`…), et un **body** optionnel. La réponse est symétrique : **ligne de statut** (`HTTP/1.1 200 OK`), headers, body.

Les méthodes portent une **sémantique** : `GET` lit (safe, sans effet de bord), `POST` crée ou déclenche, `PUT` remplace intégralement, `PATCH` modifie partiellement, `DELETE` supprime, `HEAD` = GET sans body, `OPTIONS` interroge les capacités (c'est lui derrière le *preflight* CORS). Une méthode est **idempotente** si la rejouer N fois produit le même état qu'une fois : GET, PUT, DELETE le sont ; **POST ne l'est pas** — d'où le danger de re-soumettre un paiement.

Les codes de statut à connaître par cœur, par familles :

| Code | Signification | Le réflexe |
|---|---|---|
| 200 | OK | Succès générique |
| 201 | Created | Création réussie (+ header `Location`) |
| 204 | No Content | Succès sans body (DELETE typique) |
| 301 | Moved Permanently | Redirection définitive, cachée par le navigateur |
| 304 | Not Modified | Cache encore valide, pas de body renvoyé |
| 400 | Bad Request | Requête malformée (syntaxe, JSON invalide) |
| 401 | Unauthorized | **Non authentifié** (mal nommé !) |
| 403 | Forbidden | Authentifié mais **pas les droits** |
| 404 | Not Found | Ressource inexistante |
| 409 | Conflict | Conflit d'état (ex. email déjà pris) |
| 422 | Unprocessable Entity | Syntaxe OK, validation métier KO |
| 429 | Too Many Requests | Rate limiting (+ `Retry-After`) |
| 500 | Internal Server Error | Bug côté serveur |
| 502 | Bad Gateway | Le reverse proxy n'a pas eu de réponse valide du backend |
| 503 | Service Unavailable | Serveur surchargé ou en maintenance |

## Comment ça marche

Un aller-retour complet, tel que `curl -v` le montre :

```text
Client                                    Serveur
  │  GET /users/42 HTTP/1.1                  │
  │  Host: api.example.com                   │
  │  Accept: application/json                │
  │─────────────────────────────────────────▶│
  │                                          │ routing,
  │                                          │ contrôleur, DB
  │  HTTP/1.1 200 OK                         │
  │  Content-Type: application/json          │
  │  Cache-Control: max-age=60               │
  │                                          │
  │  {"id": 42, "name": "Ada"}               │
  │◀─────────────────────────────────────────│
  │        (connexion TCP gardée ouverte     │
  │         → keep-alive, requête suivante)  │
```

Sous le capot, HTTP/1.1 circule sur **TCP**. Ouvrir une connexion TCP coûte un aller-retour (et un handshake TLS en HTTPS), donc depuis HTTP/1.1 la connexion est **persistante par défaut** (keep-alive) : plusieurs requêtes réutilisent le même tuyau. Mais en 1.1, les requêtes sur une connexion sont **séquentielles** : une réponse lente bloque toutes les suivantes — c'est le **head-of-line blocking**. Les navigateurs contournent en ouvrant ~6 connexions par domaine.

**HTTP/2** règle ça avec le **multiplexing** : un seul tube TCP, mais des dizaines de *streams* binaires entrelacés — plus de blocage au niveau HTTP, plus de compression des headers (HPACK). Reste un HOL blocking *au niveau TCP* : un paquet perdu bloque tous les streams le temps de la retransmission. **HTTP/3** supprime ce dernier verrou en remplaçant TCP par **QUIC** (sur UDP) : chaque stream est indépendant face à la perte de paquets, TLS 1.3 est intégré au handshake, et la connexion survit à un changement de réseau (Wi-Fi → 4G).

**HTTPS** = HTTP dans un tunnel TLS. En deux phrases : le client et le serveur négocient version et algorithmes, le serveur prouve son identité avec un **certificat** signé par une autorité de confiance, et un échange de clés (Diffie-Hellman éphémère) établit une clé de session symétrique. Tout le trafic HTTP est ensuite chiffré et authentifié avec cette clé — en TLS 1.3, le handshake tient en un seul aller-retour.

> 🎤 **En entretien** — « HTTP/1.1 vs 2 vs 3 » se résume en une phrase par version : *1.1 = une requête à la fois par connexion ; 2 = multiplexing sur un TCP, mais TCP re-bloque en cas de perte ; 3 = QUIC sur UDP, streams vraiment indépendants.* Dire ça calmement vaut tous les détails.

## Concepts clés à maîtriser

- **Négociation de contenu** : le client annonce ce qu'il accepte (`Accept: application/json`, `Accept-Language: fr`, `Accept-Encoding: gzip, br`), le serveur répond avec ce qu'il a choisi (`Content-Type`, `Content-Encoding`) — ou `406 Not Acceptable`.
- **Cookies** : le serveur envoie `Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax`, le navigateur le renvoie automatiquement sur chaque requête vers ce domaine. `HttpOnly` = invisible pour JavaScript (anti-XSS), `Secure` = HTTPS uniquement, `SameSite` = protection CSRF. C'est LE mécanisme qui fabrique de l'état sur un protocole stateless.
- **Cache** : `Cache-Control: max-age=3600` (fraîcheur), puis revalidation avec `ETag`/`If-None-Match` → réponse `304` sans body. Énorme levier de perf, souvent oublié des candidats.
- **Idempotence & safety** : safe = ne modifie rien (GET, HEAD) ; idempotent = rejouable sans changer le résultat (GET, PUT, DELETE). Les proxies et les clients HTTP s'appuient dessus pour *retenter automatiquement* — retenter un POST, c'est risquer un doublon.
- **`Host` et les reverse proxies** : le header `Host` (obligatoire en 1.1) permet à un seul serveur/IP de servir plusieurs domaines. C'est ce que fait Traefik ou nginx pour router vers le bon backend — et pourquoi un backend mal configuré renvoie 502/503.

À décortiquer soi-même avec `curl` :

```bash
curl -v https://api.github.com/users/octocat
# > GET /users/octocat HTTP/2        ← ligne de requête (curl a négocié h2)
# > Host: api.github.com             ← quel site sur cette IP
# > Accept: */*                      ← négociation de contenu
# <                                  ← (lignes '>' = envoyé, '<' = reçu)
# < HTTP/2 200                       ← ligne de statut
# < content-type: application/json; charset=utf-8
# < etag: W/"a1b2c3"                 ← pour revalider le cache ensuite
# < x-ratelimit-remaining: 59        ← rate limiting annoncé en header
# < {"login":"octocat", ...}         ← le body JSON
```

> 💡 **Réflexe à montrer** — face à un bug d'API, dégainer `curl -v` (ou l'onglet Network) plutôt que relire le code : la moitié des problèmes se lisent dans les headers (mauvais `Content-Type`, cookie absent, redirect inattendu, CORS).

## En entretien

**« Quelle différence entre 401 et 403 ? »** — 401 Unauthorized signifie en réalité **non authentifié** : le serveur ne sait pas qui vous êtes (token absent/expiré), réponse accompagnée de `WWW-Authenticate`. 403 Forbidden : le serveur sait qui vous êtes, mais vous **n'avez pas les droits**. Se réauthentifier corrige un 401, jamais un 403.

**« PUT vs PATCH ? »** — PUT **remplace la ressource entière** (ce qui n'est pas envoyé est effacé) et est idempotent par définition. PATCH applique une **modification partielle** ; il n'est pas idempotent par contrat (même si en pratique il l'est souvent). Bonus : PUT peut créer la ressource à une URL connue du client.

**« Pourquoi POST n'est-il pas idempotent, et quelles conséquences ? »** — Rejouer un POST recrée une ressource ou re-déclenche l'action (double commande, double paiement). Conséquences : les clients/proxies ne le retentent pas automatiquement, le navigateur affiche « re-soumettre le formulaire ? », et les API sérieuses proposent une **clé d'idempotence** (`Idempotency-Key`, comme Stripe) pour rendre le retry sûr.

**« Que change HTTP/2 par rapport à HTTP/1.1 ? »** — Protocole binaire, **multiplexing** de streams sur une seule connexion TCP (fini les 6 connexions par domaine et le HOL blocking HTTP), compression des headers (HPACK), priorisation. Limite restante : un paquet TCP perdu bloque tous les streams — ce que HTTP/3/QUIC résout.

**« Comment un serveur garde-t-il une session sur un protocole stateless ? »** — Un cookie de session (ID opaque → état stocké côté serveur) ou un token auto-porteur type JWT (état signé côté client, envoyé dans `Authorization: Bearer`). Comparer : cookie = envoyé automatiquement (attention CSRF), token = à joindre soi-même (attention au stockage XSS-able).

## Pièges & idées reçues

> ⚠️ **Piège classique** — répondre `200 OK` avec `{"error": "not found"}` dans le body. Les caches, monitorings, retrys et clients générés se basent sur le **code de statut**, pas sur le body : un vrai 404/422 n'est pas un détail cosmétique.

- **« 401 = pas les droits »** — non, c'est 403. Le nom `Unauthorized` de 401 est un accident historique : lisez-le « Unauthenticated ».
- **« HTTPS cache tout »** — le contenu et le chemin sont chiffrés, mais l'**IP de destination** reste visible, et le nom de domaine fuite via le SNI du handshake TLS (sauf ECH, encore peu déployé). HTTPS ≠ anonymat.
- **GET avec un body** : techniquement toléré, mais les proxies et caches l'ignorent ou le rejettent. Une recherche complexe → POST (ou le récent QUERY, encore en draft).
- **Un 301 est mis en cache agressivement** par le navigateur : une redirection permanente erronée peut « coller » très longtemps. Tester avec 302/307, promouvoir en 301 ensuite.
- **CORS n'est pas une sécurité serveur** : c'est le *navigateur* qui bloque la lecture cross-origin. `curl` ou un backend ignorent totalement CORS — ne jamais s'en servir comme contrôle d'accès.

## Pour aller plus loin

- [MDN — HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP) : la référence lisible (méthodes, headers, codes)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) : la spec actuelle, étonnamment claire sur l'idempotence
- [web.dev — HTTP/2 puis HTTP/3](https://web.dev/articles/performance-http2) pour visualiser le multiplexing
- Jouer avec `curl -v`, [httpbin.org](https://httpbin.org) pour fabriquer n'importe quelle réponse, et l'onglet Network des DevTools (colonne Protocol : h2, h3)
