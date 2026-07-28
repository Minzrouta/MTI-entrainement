---
title: "Robustesse : timeouts, retries & circuit breakers"
date: "2026-10-20"
category: "Backend"
level: "Avancé"
summary: "Timeouts, retries avec backoff, circuit breakers, graceful degradation : les patterns qui séparent un backend de démo d'un backend de production — et une mine de questions d'entretien système."
---

## L'essentiel

Première des huit *fallacies of distributed computing* (Peter Deutsch, 1994) : « le réseau est fiable ». Il ne l'est pas. Dès que votre service appelle autre chose — une base, une API tierce, un microservice voisin — cet appel peut échouer, traîner, ou pire : réussir sans que vous receviez la réponse. Un backend de production n'est pas un backend où rien n'échoue ; c'est un backend qui **échoue proprement**.

La hiérarchie des défenses, dans l'ordre où on les pose :

1. **Timeout** — ne jamais attendre indéfiniment. Un appel sans timeout est un thread (ou une connexion de pool) potentiellement bloqué pour toujours.
2. **Retry avec backoff + jitter** — réessayer les échecs *transitoires*, en espaçant les tentatives et en les désynchronisant.
3. **Circuit breaker** — arrêter d'appeler un service manifestement à terre, pour le laisser respirer et échouer vite.
4. **Graceful degradation** — quand tout a échoué, servir quelque chose de dégradé (cache périmé, valeur par défaut) plutôt qu'une erreur 500.

L'erreur la plus dangereuse n'est pas d'oublier ces patterns : c'est d'en appliquer un seul naïvement. Un retry sans timeout ni limite est une machine à aggraver les pannes.

## Comment ça marche

**Timeouts et budget de latence** : dans une chaîne A → B → C, les timeouts doivent **décroître** en cascade. Si A accorde 2 s à B, B ne peut pas accorder 3 s à C — sinon B répondra à A après que A a déjà abandonné : travail gaspillé et erreurs incohérentes. On raisonne en **budget** : le SLO de bout en bout se découpe entre les étages, chaque étage gardant une marge.

**Retry, la version correcte** : exponential backoff (1 s, 2 s, 4 s…) plafonné, avec **jitter** (aléa). Sans jitter, tous les clients qui ont échoué en même temps réessaient en même temps — vagues synchronisées qui re-écrasent le service. Et surtout : on ne retry que ce qui est **idempotent** ou sûr. Rejouer un `POST /payments` qui a en réalité réussi (la réponse s'est perdue) = paiement en double. D'où les **idempotency keys** : le client envoie un identifiant unique avec la requête, le serveur détecte le doublon et renvoie la première réponse (voir la fiche API design du 10 septembre).

```js
// Retry avec exponential backoff + full jitter (AWS-style)
async function withRetry(fn, { retries = 3, baseMs = 500 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(); // fn contient son propre timeout !
    } catch (err) {
      // Ne retry que le transitoire : 503, timeout, reset.
      // Jamais un 400/404 (rejouer ne changera rien),
      // jamais un POST non idempotent.
      if (!isTransient(err) || attempt >= retries) throw err;

      // Backoff exponentiel plafonné : 500, 1000, 2000 ms…
      const cap = Math.min(baseMs * 2 ** attempt, 10_000);
      // Full jitter : tirage uniforme dans [0, cap]
      // → désynchronise les clients, évite les vagues.
      const delay = Math.random() * cap;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

**Circuit breaker** : un compteur d'échecs par dépendance, trois états.

```text
            échecs > seuil
  ┌────────┐ ─────────────────▶ ┌────────┐
  │ CLOSED │                    │  OPEN  │
  │ (appels│ ◀───────────────── │ échec  │
  │ passent)│      succès       │immédiat│
  └────────┘        │           └────────┘
      ▲             │                │ après un délai
      │             │                ▼
      │       ┌───────────┐   laisse passer
      └────── │ HALF-OPEN │◀─ quelques appels
   succès des │  (test)   │   de test
   essais     └───────────┘
                    │ échec → retour OPEN
```

Fermé (closed) : tout passe, on compte les échecs. Trop d'échecs : ouvert (open) — on échoue **immédiatement** sans appeler, le service en face souffle. Après un délai, semi-ouvert (half-open) : quelques appels de test ; succès → fermé, échec → ré-ouvert. Deux bénéfices : le service malade récupère, et vos propres threads ne s'entassent plus à attendre un mort.

| Problème | Pattern |
|---|---|
| Un appel qui ne répond jamais | Timeout |
| Échec transitoire (blip réseau, 503) | Retry + backoff + jitter |
| Dépendance durablement à terre | Circuit breaker |
| Une dépendance lente épuise tous les threads | Bulkhead (pools isolés) |
| L'échec total plutôt que le dégradé | Fallback, cache stale |
| Rejouer un POST non sûr | Idempotency key |
| Tous les clients reviennent en même temps | Jitter, ouverture progressive |

## Concepts clés à maîtriser

- **Bulkhead** : cloisonner les ressources par dépendance (pools de connexions/threads séparés, quotas). Si l'API de recommandations devient lente, elle sature *son* pool de 10 connexions — pas les 200 du service entier. Nom emprunté aux cloisons étanches des navires.
- **Graceful degradation** : prévoir la version dégradée de chaque feature. Le service de reco est mort ? Afficher les meilleures ventes (statique). Le taux de change est indisponible ? Servir la dernière valeur connue avec son âge (**cache stale**, souvent acceptable). Une page à 90 % fonctionnelle vaut infiniment mieux qu'un 500.
- **Health checks** : distinguer **liveness** (« le process tourne-t-il ? » — sinon on le redémarre) et **readiness** (« peut-il servir du trafic ? » — sinon on le sort du load balancer sans le tuer). Piège classique : un health check qui teste aussi les dépendances peut sortir *toutes* les instances du LB quand la base a un blip — la panne locale devient totale.
- **Thundering herd** : mille clients (ou mille entrées de cache expirant ensemble) frappent l'origine au même instant — au redémarrage d'un service, à l'expiration d'un cache populaire. Parades : jitter sur les TTL et les reconnexions, *request coalescing* (une seule requête régénère le cache, les autres attendent), warm-up progressif.

> 💡 **Échouer vite** — un service qui répond « erreur » en 5 ms est un bien meilleur voisin qu'un service qui répond « erreur » en 30 s : il ne retient ni threads, ni connexions, ni l'utilisateur. Le circuit breaker est avant tout une machine à échouer vite.

## En entretien

**« Que se passe-t-il si cette API tierce ne répond pas ? »** — LA question de system design. Dérouler la hiérarchie : timeout (avec budget cohérent dans la chaîne), retry backoff + jitter si transitoire et idempotent, circuit breaker si l'échec persiste, fallback dégradé (cache stale, valeur par défaut) en dernier ressort. Mentionner le monitoring : un breaker qui s'ouvre doit alerter.

**« Pourquoi du jitter dans le backoff ? »** — Sans jitter, tous les clients tombés en même temps réessaient aux mêmes instants : des vagues synchronisées frappent le service au moment où il tente de se relever. Le jitter étale les tentatives uniformément. Bonus : citer le papier AWS « Exponential Backoff and Jitter » et le *full jitter*.

**« Explique les états d'un circuit breaker. »** — Closed : trafic normal, comptage des échecs. Open : échec immédiat sans appel, pendant un délai de repos. Half-open : quelques requêtes de sonde ; succès → closed, échec → open. Ajouter le *pourquoi* : protéger le service aval ET libérer ses propres ressources.

**« Quand un retry est-il dangereux ? »** — Deux cas. 1) Opération non idempotente : la requête a pu réussir sans que la réponse arrive ; rejouer duplique (paiement, envoi d'email) → idempotency keys. 2) Service surchargé : les retries multiplient le trafic exactement quand il faudrait le réduire → retry storm. Réponse complète : limiter les tentatives, backoff + jitter, retry budget, et ne pas empiler les retries à chaque étage.

**« Liveness vs readiness ? »** — Liveness : le process est-il vivant (sinon restart). Readiness : est-il prêt à servir (sinon retiré du LB, sans restart). Les confondre = redémarrages en boucle pendant qu'une dépendance est lente.

## Pièges & idées reçues

> ⚠️ **Le retry storm qui achève le service** — un service ralentit sous charge ; les timeouts clients expirent ; chaque client retry 3 fois → le trafic entrant est multiplié par 3-4 sur un service déjà à genoux ; il s'effondre ; les retries continuent, et empêchent tout redémarrage (chaque instance qui revient est instantanément saturée). C'est une **cascading failure** auto-entretenue — la moitié des grands incidents publics (AWS, Cloudflare) en contiennent une. Parades : budget de retries global (ex. max 10 % du trafic), circuit breakers, backoff + jitter, et *load shedding* (rejeter tôt l'excès plutôt que tout servir mal).

- **Retries empilés** : 3 tentatives au niveau HTTP client × 3 au niveau service × 3 au niveau gateway = jusqu'à 27 appels pour une requête. Décider d'UN étage propriétaire du retry.
- **Timeout unique et généreux** (« 30 s partout ») : trop long pour l'utilisateur, incohérent en cascade. Les timeouts se dimensionnent par appel, sur les percentiles observés (p99 + marge).
- **Le circuit breaker n'est pas un retry** : il ne réessaie rien, il *empêche* d'appeler. Les deux se combinent : retry pour les blips, breaker pour les pannes durables.
- **Tester uniquement le chemin heureux** : la robustesse se teste en injectant les pannes (timeouts simulés, chaos testing) — sinon vos fallbacks sont du code mort qui échouera le jour J.

## Pour aller plus loin

- [AWS Architecture Blog — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) : le papier de référence, avec les simulations
- [Amazon Builders' Library — Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) : le guide appliqué
- [Google SRE Book — Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) : le chapitre qui dissèque retry storms et load shedding
- [Martin Fowler — CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html) et les libs [resilience4j](https://resilience4j.readme.io/) (Java) / [Polly](https://www.pollydocs.org/) (.NET)
- *Release It!* (Michael Nygard) — le livre qui a nommé ces patterns, bourré de récits d'incidents réels
