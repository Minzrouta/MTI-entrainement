---
title: "Bien concevoir une API"
date: "2026-09-10"
category: "Architecture"
level: "Intermédiaire"
summary: "Nommage, codes de statut, pagination, idempotence, webhooks : les conventions qui distinguent une API agréable d'une API subie — et l'exercice de design le plus posé en entretien."
---

## L'essentiel

Une API est un **contrat** entre votre serveur et des clients que vous ne contrôlez pas. Sa qualité ne se mesure pas à ce qu'elle fait, mais à sa **prévisibilité** : un développeur qui a vu un seul endpoint doit pouvoir deviner les autres. Les conventions REST existent précisément pour ça — les respecter, c'est offrir gratuitement des années d'intuition accumulée par l'écosystème.

Les règles de base tiennent en trois lignes :

- **Les ressources sont des noms au pluriel**, jamais des verbes : `GET /users/42/orders`, pas `GET /getOrdersOfUser?id=42`. Le verbe, c'est la méthode HTTP.
- **Les méthodes HTTP portent la sémantique** : `GET` lit (sans effet de bord), `POST` crée, `PUT` remplace, `PATCH` modifie partiellement, `DELETE` supprime.
- **Les codes de statut disent la vérité** : 2xx succès, 4xx erreur du client, 5xx erreur du serveur. `401` = non authentifié, `403` = authentifié mais interdit, `404` = introuvable, `409` = conflit d'état, `422` = payload valide syntaxiquement mais invalide métier.

> ⚠️ **Le 200 qui ment** — l'anti-pattern le plus répandu : répondre `200 OK` avec `{"success": false, "error": "..."}` dans le corps. Les proxies mettent la réponse en cache, les métriques croient que tout va bien, les clients doivent parser le corps pour savoir si ça a marché, et les retries automatiques ne se déclenchent jamais. Le code de statut EST le canal d'erreur, utilisez-le.

## Comment ça marche

**Erreurs structurées** — Une erreur doit être exploitable par une machine ET lisible par un humain. Le standard, c'est **RFC 9457 (Problem Details)** avec le content-type `application/problem+json` :

```json
{
  "type": "https://api.example.com/errors/insufficient-stock",
  "title": "Insufficient stock",
  "status": 409,
  "detail": "Requested 5 units of item 4521, only 2 left.",
  "instance": "/orders/abc123",
  "available": 2
}
```

`type` identifie la catégorie d'erreur (une URL stable, documentable), `detail` explique ce cas précis, et on peut ajouter des champs métier (`available`). Un client peut brancher sur `type` sans parser un message en anglais.

**Versioning** — Deux écoles : la version dans l'URL (`/v1/users`, visible, simple à router et à cacher) ou dans un header (`Accept: application/vnd.api+json;version=2`, plus « pur » REST mais invisible et pénible à tester dans un navigateur). En pratique, l'URL gagne presque partout (Stripe, GitHub). Le vrai réflexe senior : **ne versionner que sur breaking change**. Ajouter un champ dans une réponse n'est pas cassant — les clients doivent ignorer les champs inconnus. Renommer ou supprimer un champ, changer un type : ça, c'est cassant.

**Pagination** — Ne jamais renvoyer une collection entière. Deux stratégies :

| | Offset (`?page=3&limit=20`) | Cursor (`?after=xyz&limit=20`) |
|---|---|---|
| Implémentation | Triviale (`LIMIT/OFFSET`) | Keyset sur colonne indexée |
| Page profonde | Lente (la DB scanne et jette) | Rapide (index seek direct) |
| Insertions pendant le parcours | Doublons ou trous | Stable |
| Saut à la page N | Oui | Non (parcours séquentiel) |
| Usage type | Back-office, petites tables | Feeds, API publiques, gros volumes |

Le cursor encode « où j'en suis » (souvent le dernier id/timestamp, opaque en base64) : la requête devient `WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20`, servie par l'index quelle que soit la profondeur.

```js
// GET /todos?after=<cursor>&limit=20 — pagination par cursor
app.get("/todos", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100); // borner !
  const after = decodeCursor(req.query.after);   // { createdAt, id } opaque
  const rows = await db.todos.find({
    where: after ? { createdAt: { lt: after.createdAt } } : {},
    orderBy: { createdAt: "desc" },
    take: limit + 1,                             // +1 pour savoir s'il reste une page
  });
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  res.json({
    data: items,
    next_cursor: hasMore ? encodeCursor(items.at(-1)) : null,
  });
});
```

**Filtrage et tri** — en query params, conventions simples : `?status=open&sort=-created_at` (le `-` pour descendant). Documenter les champs filtrables ; tout accepter aveuglément, c'est offrir des full scans à vos utilisateurs.

**Idempotence** — `GET`, `PUT`, `DELETE` sont idempotents par définition (rejouer = même état). `POST` ne l'est pas : un client qui timeout et retry peut créer deux commandes. La solution : le header **`Idempotency-Key`** (popularisé par Stripe). Le client envoie une clé unique par opération ; le serveur stocke `clé → réponse` et rejoue la réponse enregistrée si la clé revient. Le retry devient sûr.

**Rate limiting** — répondre **`429 Too Many Requests`** avec un header **`Retry-After`** (secondes ou date), plus les headers informatifs `RateLimit-Limit` / `RateLimit-Remaining`. Un client bien élevé lit `Retry-After` et applique un backoff exponentiel avec jitter.

**Webhooks** — l'API dans l'autre sens : c'est vous qui appelez le client quand un événement survient (paiement validé, build terminé).

```text
Votre API ──POST /hooks (event + signature)──▶ Client
   │                                             │
   │◀────────── 2xx reçu ? sinon retry ──────────┘
   │    backoff expo : 1min, 5min, 30min…
```

Les règles du jeu : **signer le payload en HMAC-SHA256** avec un secret partagé, en incluant un timestamp pour bloquer le rejeu (le client vérifie signature + fraîcheur) ; **réessayer** avec backoff exponentiel tant que le client ne répond pas 2xx ; côté client, **répondre 2xx immédiatement** et traiter en asynchrone — et dédupliquer par `event.id`, car les retries garantissent de l'at-least-once, donc des doublons.

**Documentation** — une spec **OpenAPI** n'est pas un luxe : elle génère la doc interactive (Swagger UI), les clients typés, les mocks et les tests de contrat. Spec-first ou code-first, peu importe — l'important est qu'elle soit la source de vérité.

## Concepts clés à maîtriser

- **Ressource vs action** : quand une opération ne rentre pas dans le CRUD (`annuler une commande`), on modélise une sous-ressource ou une action : `POST /orders/42/cancel`. Pragmatisme > pureté.
- **401 vs 403** : « je ne sais pas qui tu es » vs « je sais qui tu es, et non ». Les confondre en entretien coûte cher.
- **Champs inconnus ignorés** : c'est le contrat implicite qui rend les ajouts non cassants. Un client qui rejette les champs inconnus se casse tout seul.
- **Enveloppe de réponse** : `{ "data": [...], "next_cursor": ... }` plutôt qu'un tableau nu — un tableau nu ne peut plus jamais accueillir de métadonnées sans breaking change.
- **HATEOAS** : savoir dire que ça existe (liens hypermedia dans les réponses) et que presque personne ne l'implémente complètement.

## En entretien

> 🎤 **En entretien** — l'exercice classique : « conçois l'API d'une todo-list ». Déroulez méthodiquement : ressources (`/todos`, `/todos/{id}`), méthodes et codes (`POST /todos` → 201 + `Location`, `DELETE` → 204, `PATCH` pour cocher), pagination cursor sur `GET /todos`, filtre `?done=false`, erreurs en problem+json, et finissez par « et si un autre service veut être notifié, webhook signé HMAC ». En cinq minutes vous avez montré toute la palette.

**« Pourquoi la pagination par cursor plutôt que par offset ? »** — Deux raisons : performance (l'offset force la DB à lire et jeter N lignes, le cursor fait un seek d'index) et stabilité (si des éléments sont insérés pendant le parcours, l'offset produit doublons ou trous, le cursor non). Contrepartie : pas de saut direct à la page 12.

**« Comment gères-tu un POST rejoué à cause d'un timeout ? »** — Header `Idempotency-Key` : le serveur stocke la clé et la réponse associée ; si la clé revient, il renvoie la réponse enregistrée sans réexécuter. Sans ça, un retry réseau peut débiter deux fois.

**« Quand créer une v2 ? »** — Uniquement sur breaking change : suppression/renommage de champ, changement de type ou de sémantique. Un ajout de champ ou d'endpoint est rétrocompatible. Et maintenir la v1 avec une date de fin de vie annoncée.

**« Comment sécuriser un webhook ? »** — Signature HMAC-SHA256 du corps avec un secret partagé, transmise en header, avec un timestamp inclus dans la signature pour empêcher le rejeu. Le récepteur vérifie en comparaison constante, répond 2xx vite, traite en async, déduplique par event id.

**« 401 ou 403 ? »** — 401 sans credentials valides (le client doit s'authentifier), 403 avec credentials valides mais droits insuffisants. Bonus : certains renvoient 404 au lieu de 403 pour ne pas révéler l'existence d'une ressource.

## Pièges & idées reçues

- **Le 200-erreur** (voir callout plus haut) : le code de statut fait partie du contrat, pas le champ `success`.
- **Verbes dans les URLs** (`/createUser`, `/deleteOrder`) : la méthode HTTP porte déjà le verbe ; doubler crée des incohérences.
- **Pagination sans borne** : un `?limit=100000` accepté tel quel, et votre DB tombe. Toujours plafonner côté serveur.
- **Breaking change silencieux** : renommer un champ « parce que c'est plus propre » casse tous les clients. La compatibilité descendante est une contrainte permanente, pas une option.
- **Webhook sans signature** : n'importe qui peut poster un faux événement `payment_succeeded` sur votre endpoint. Signature obligatoire, toujours.

> 💡 **Réflexe à montrer** — face à n'importe quelle question d'API, penser « et le client qui retry ? ». Idempotence, déduplication, `Retry-After` : montrer qu'on conçoit pour un réseau qui échoue, c'est le marqueur senior.

## Pour aller plus loin

- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457) : le standard des erreurs structurées
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) : le guide de référence d'une vraie boîte, très complet
- [Stripe API Reference](https://docs.stripe.com/api) : l'API la plus imitée du monde — regarder pagination, idempotence, erreurs
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) et [webhooks.fyi](https://webhooks.fyi/) pour les patterns de webhooks
