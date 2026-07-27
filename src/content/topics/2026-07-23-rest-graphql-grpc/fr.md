---
title: "REST vs GraphQL vs gRPC"
date: "2026-07-23"
category: "Architecture"
level: "Fondamental"
summary: "Trois façons de concevoir une API, trois familles de trade-offs. Savoir choisir — et surtout justifier — entre REST, GraphQL et gRPC est une question quasi systématique en entretien backend."
---

## L'essentiel

Trois styles dominent la conception d'API. **REST** expose des **ressources** manipulées par les verbes HTTP — le standard de fait du web, universel et cacheable. **GraphQL** est un langage de requête typé : le client décrit exactement les données qu'il veut, le serveur les résout via un endpoint unique. **gRPC** est un framework RPC : on appelle des méthodes distantes définies dans un contrat protobuf, sérialisées en binaire sur HTTP/2.

Aucun n'est « meilleur » : ce sont des trade-offs. La question d'entretien n'est jamais « lequel est le mieux » mais « lequel choisirais-tu ici, et pourquoi ».

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Transport | HTTP, JSON texte | HTTP, `POST /graphql` unique | HTTP/2, protobuf binaire |
| Contrat | OpenAPI (optionnel) | Schéma typé (obligatoire) | `.proto` (obligatoire, codegen) |
| Caching | HTTP natif (CDN, navigateur) | Difficile (tout en POST) | À la charge de l'application |
| Streaming | Non (polling, SSE) | Subscriptions | Natif, 4 modes |
| Cas d'usage | API publique | BFF, mobile, agrégation | Microservices internes |

> 💡 **La ligne décisive** — le caching : REST l'a gratuitement (GET + CDN + navigateur), GraphQL le perd (tout passe en POST sur un endpoint unique). Pour une API publique très lue, c'est souvent l'argument qui clôt le débat.

## Comment ça marche

**REST** (REpresentational State Transfer) : des ressources nommées par des URLs (`/users/42/orders`), manipulées par les verbes HTTP — `GET` (lire, sans effet de bord), `POST` (créer), `PUT` (remplacer), `PATCH` (modifier partiellement), `DELETE`. Les **codes de statut** portent le résultat : 200 OK, 201 Created, 204 No Content, 400 requête invalide, 401 non authentifié, 403 non autorisé, 404 introuvable, 409 Conflict, 422 erreur de validation, 500 erreur serveur. **Stateless** : chaque requête porte tout son contexte (token d'auth compris), le serveur ne garde pas de session en mémoire — ce qui rend le scaling horizontal trivial. HATEOAS, en une phrase : la contrainte REST « pure » où chaque réponse contient les liens vers les actions possibles — rarement implémentée en pratique, mais bon à citer.

**GraphQL** : un **schéma fortement typé** (types, queries, mutations, subscriptions) exposé sur un endpoint unique, généralement `POST /graphql`. Le client envoie une requête qui décrit précisément les champs voulus, y compris à travers les relations : fini l'**over-fetching** et l'**under-fetching** — les deux illustrés dans l'exemple ci-dessous. Côté serveur, chaque champ est produit par un **resolver** ; naïvement, une liste de N articles avec leur auteur déclenche 1 + N requêtes SQL — le fameux **problème N+1**, résolu par le batching (pattern DataLoader).

Le même écran « profil + dernières commandes », dans les deux styles :

```bash
# REST : deux allers-retours, toutes les données de chaque ressource
GET /users/42          # 40 champs reçus… pour en afficher 3
GET /users/42/orders   # deuxième appel pour compléter l'écran
```

```graphql
# GraphQL : un seul aller-retour, exactement les champs voulus
query {
  user(id: 42) {
    name
    avatarUrl
    orders(last: 5) {   # la relation traversée dans la même requête
      total
      status
    }
  }
}
```

**gRPC** : contract-first — on écrit un fichier `.proto` (messages + services), le compilateur **protobuf** génère clients et serveurs dans la plupart des langages. Sérialisation binaire compacte (champs numérotés, pas de noms de clés répétés comme en JSON), transport **HTTP/2** : multiplexage des appels sur une seule connexion, compression d'en-têtes. Quatre modes d'appel : unary (requête/réponse), server streaming, client streaming, streaming bidirectionnel. Deadlines propagées entre services et codes de statut dédiés complètent le contrat.

## Concepts clés à maîtriser

- **Quand choisir quoi** : API **publique** → REST (universel, testable au curl, cacheable par CDN et navigateurs). **BFF** (Backend For Frontend) ou client mobile qui agrège plusieurs sources → GraphQL (le client compose ses données en un aller-retour). **Microservices internes** à fort trafic → gRPC (contrats stricts, performance, streaming). Nuance à connaître : gRPC dans un navigateur nécessite grpc-web et un proxy.
- **Versioning** : REST → `/v1/` dans l'URL ou un header, avec la règle de ne jamais casser les clients existants. GraphQL → pas de versions : le schéma évolue de façon additive et les champs obsolètes sont marqués `@deprecated`. Protobuf → chaque champ a un numéro ; on n'en réutilise ni n'en renumérote jamais, on ajoute — backward compatible par construction.
- **Pagination** : **offset** (`?page=3&limit=20`) simple mais instable si la liste bouge entre deux pages, et lente en profondeur ; **cursor-based** (un curseur opaque pointant après le dernier élément vu) stable et performante — le défaut des APIs modernes. En GraphQL, formalisée par la spec Relay Connections (edges/nodes/pageInfo).
- **Idempotence** : une opération est idempotente si la rejouer produit le même état final. GET, PUT, DELETE le sont ; POST non. Crucial dès qu'il y a des retries réseau : pour un paiement, une **idempotency key** (header unique envoyé par le client, dédupliqué côté serveur) évite le double débit — la question piège classique.
- **Codes HTTP fins** : distinguer 401 (« qui es-tu ? ») de 403 (« je sais qui tu es, tu n'as pas le droit »), 400 de 422, et savoir pourquoi renvoyer 200 avec `{"error": ...}` dans le body est un anti-pattern.

## En entretien

> 🎤 **En entretien** — à « lequel choisirais-tu ? », la bonne réponse commence par « ça dépend », suivie de critères concrets : qui consomme (public, mobile, interne), besoin de cache, besoin de streaming. REST par défaut, GraphQL ou gRPC quand un besoin précis le justifie — dans cet ordre.

**« C'est quoi, REST, au juste ? »** — Un style d'architecture (thèse de Roy Fielding, 2000) : ressources identifiées par des URLs, interface uniforme HTTP (verbes + codes de statut), stateless, réponses cacheables. Points bonus : préciser que la plupart des « APIs REST » réelles sont du JSON-over-HTTP sans HATEOAS — et que c'est un compromis parfaitement assumé.

**« PUT vs PATCH vs POST ? »** — POST crée une ressource (non idempotent : deux POST = deux ressources). PUT remplace intégralement la ressource à l'URL donnée (idempotent : le rejouer ne change rien de plus). PATCH applique une modification partielle (pas garanti idempotent). Conséquence pratique : rejouer un PUT sur timeout est sûr, rejouer un POST ne l'est pas sans idempotency key.

**« Quel problème résout GraphQL, et lesquels crée-t-il ? »** — Il résout l'over-fetching et l'under-fetching : le client compose exactement ses données en un aller-retour, précieux sur mobile. Il crée : le N+1 côté resolvers (→ DataLoader), la perte du cache HTTP (tout passe en POST sur un endpoint unique), la nécessité de se protéger des requêtes arbitrairement profondes (depth limit, complexity budget), et une complexité serveur nettement supérieure.

**« Pourquoi gRPC est-il plus performant que REST/JSON ? »** — Sérialisation protobuf binaire, plus compacte et plus rapide à parser que du JSON textuel ; HTTP/2 qui multiplexe les appels sur une connexion persistante ; code client/serveur généré depuis le contrat, donc pas de validation ad hoc. Et le streaming natif, là où REST impose polling ou SSE.

**« Comment gères-tu les retries sur un endpoint de paiement ? »** — L'appel est un POST, donc non idempotent par nature. Le client génère une idempotency key unique par opération ; le serveur stocke le résultat de la première exécution sous cette clé et renvoie la même réponse aux retries. Stripe est l'exemple canonique à citer.

## Pièges & idées reçues

> ⚠️ **L'anti-pattern à bannir** — renvoyer `200 OK` avec `{"error": ...}` dans le body : le monitoring ne voit rien, les retries automatiques ne se déclenchent pas, un cache peut stocker l'erreur. Le code de statut fait partie du contrat.

- **« REST = du JSON sur HTTP »** — REST est un ensemble de contraintes. `POST /getUserById` est du RPC déguisé : des verbes dans les URLs sont un signal d'alarme en code review.
- **« GraphQL remplace REST »** — non : pour une API publique simple ou fortement cacheable, GraphQL ajoute de la complexité sans bénéfice. C'est un outil de composition de données, pas une évolution universelle de REST.
- **« gRPC partout, même en externe »** — attention : illisible au curl sans outillage (grpcurl), support navigateur indirect (grpc-web + proxy), et un contrat binaire se déboggue moins vite qu'un JSON.
- **Statelessness mal compris** : le serveur a évidemment un état (la base de données) ; c'est l'état de *session* qui ne doit pas vivre en mémoire d'une instance — sinon le load balancing et l'autoscaling cassent.
- **Pagination offset en profondeur** : `OFFSET 100000` force la base à parcourir puis jeter 100 000 lignes, et les éléments se décalent si des insertions arrivent entre deux pages. Le cursor règle les deux problèmes.

## Pour aller plus loin

- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) : verbes, codes de statut, caching — la référence
- [graphql.org/learn](https://graphql.org/learn/) : le tutoriel officiel — schéma, queries, resolvers
- [grpc.io — Introduction](https://grpc.io/docs/what-is-grpc/introduction/) et le [guide proto3](https://protobuf.dev/programming-guides/proto3/) pour les règles d'évolution des messages
- La [thèse de Roy Fielding, chap. 5](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) : d'où vient réellement REST
