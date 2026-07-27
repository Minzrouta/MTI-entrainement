---
title: "Redis & le caching"
date: "2026-07-27"
category: "Backend"
level: "Intermédiaire"
summary: "Event loop, TTL, cache-aside, stampede : Redis est partout en production, et le caching est le sujet backend où l'on repère vite, en entretien, ceux qui ont vraiment compris."
---

## L'essentiel

Redis (REmote DIctionary Server) est une base **in-memory** : des structures de données riches servies depuis la RAM, avec des latences sous la milliseconde et plus de 100 000 opérations/s sur un seul cœur. Usage n°1 : le **cache** devant une base plus lente. Mais aussi : session store, rate limiter, pub/sub, files de tâches, leaderboards.

Le point d'architecture à connaître absolument : Redis exécute les commandes sur **un seul thread**, via une **event loop** (I/O multiplexé). Deux conséquences directes : chaque commande est **atomique** (aucun lock à gérer), et une commande lente **bloque tout le serveur**. Depuis Redis 6, des threads gèrent l'I/O réseau, mais l'exécution des commandes reste mono-thread.

## Comment ça marche

Redis n'est pas qu'une `Map<String, String>` géante. Ses **structures de données** :

| Structure | Commandes types | Cas d'usage |
|---|---|---|
| String | `SET`/`GET`, `INCR` atomique | Cache, compteurs, rate limiting |
| Hash | `HSET`/`HGETALL` | Objet léger (`user:42` → champs) |
| List | `LPUSH` + `BRPOP` (pop bloquant) | File de tâches basique |
| Set | `SADD`/`SINTER` | Tags, visiteurs uniques |
| Sorted set | `ZADD`/`ZRANGE` (tri par score) | Leaderboards, sliding window, priorités |
| Stream | `XADD`/`XREADGROUP`/`XACK` | File de messages : acks + consumer groups |

**TTL et éviction** : `SET key val EX 300` ou `EXPIRE`. L'expiration est **paresseuse** (vérifiée à l'accès) plus un cycle **actif** d'échantillonnage. Quand `maxmemory` est atteint, la politique d'éviction tranche : `noeviction` (les écritures échouent — c'est le défaut !), `allkeys-lru` (le grand classique du cache), `volatile-lru` (seulement les clés à TTL), `allkeys-lfu` (par fréquence, souvent meilleur pour un vrai cache).

**Les trois patterns de cache** :

- **Cache-aside** (lazy loading — le standard) : l'app lit le cache ; sur un miss, elle lit la DB puis peuple le cache avec un TTL. Simple, et le cache peut tomber sans casser l'app ; en échange : premier accès lent et fenêtre d'incohérence après une écriture en DB.
- **Write-through** : chaque écriture passe par le cache, qui écrit dans la DB de façon synchrone. Cache toujours frais, écritures plus lentes.
- **Write-behind** (write-back) : on écrit dans le cache, qui flushe vers la DB en asynchrone. Écritures ultra-rapides, mais **perte possible de données** si crash avant le flush.

> 🎤 **En entretien** — ne pas réciter les trois patterns : nommer le défaut de chacun. Cache-aside = fenêtre d'incohérence, write-through = latence à l'écriture, write-behind = perte possible de données. C'est le défaut qui prouve qu'on a compris.

Cache-aside en pratique (Node) :

```js
// Lecture : cache d'abord, DB sur miss, puis on repeuple
async function getUser(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);          // ~1 ms, DB épargnée

  const user = await db.users.findById(id); // miss → DB
  const ttl = 300 + Math.floor(Math.random() * 60); // jitter
  await redis.set(key, JSON.stringify(user), 'EX', ttl);
  return user;
}

// Écriture : DB d'abord, puis invalidation de la clé
async function updateUser(id, data) {
  await db.users.update(id, data);
  await redis.del(`user:${id}`); // le prochain miss repeuplera
}
```

> 💡 **Le jitter coûte une ligne** — mille clés créées au même moment expirent au même moment. `TTL ± aléa` désynchronise les expirations : la parade la moins chère contre le stampede de masse.

**Persistance** — Redis peut survivre à un restart :

- **RDB** : snapshots binaires périodiques (via `fork` et copy-on-write). Compact, redémarrage rapide ; mais tout ce qui suit le dernier snapshot est perdu au crash.
- **AOF** : journal de toutes les écritures, `fsync` configurable (`everysec` : au plus ~1 s de perte). Fichier plus gros, rejoué au démarrage, réécrit périodiquement pour compacter.
- En pratique : les deux combinés — ou **aucun**, si Redis n'est qu'un cache reconstructible.

## Concepts clés à maîtriser

- **L'invalidation, le problème difficile** (« There are only two hard things in computer science… »). Trois approches : **TTL** (staleness bornée, filet de sécurité universel), **invalidation explicite** (supprimer la clé quand la source change — précis, mais il ne faut oublier aucun chemin d'écriture), **clés versionnées** (on change la clé, l'ancienne expire d'elle-même). En pratique : TTL partout, plus invalidation explicite sur les données critiques.
- **Cache stampede** (dogpile) : une clé chaude expire → des centaines de requêtes font miss en même temps → toutes frappent la DB, qui s'écroule. Parades : **lock** (`SET lock:k v NX EX 10` — un seul recalcule, les autres attendent ou servent l'ancienne valeur), **TTL jitter** (TTL ± aléa pour désynchroniser les expirations), recalcul anticipé avant expiration.

Le stampede en image :

```text
t=0 : la clé chaude expire
      │
      ▼  500 requêtes simultanées → 500 miss
 ┌───────┐    0 hit     ┌──────┐
 │ Redis │─────────────▶│  DB  │ ×500 → surcharge
 └───────┘              └──────┘
Parade : SET lock:k v NX EX 10
 → 1 seule requête recalcule la valeur,
   les 499 autres attendent ou servent l'ancienne
```
- **Rate limiting** : fenêtre fixe = `INCR` + `EXPIRE` (simple, mais effet de bord aux frontières de fenêtre) ; fenêtre glissante = sorted set des timestamps (`ZADD` + `ZREMRANGEBYSCORE` + `ZCARD`).
- **Atomicité multi-commandes** : `MULTI`/`EXEC` (transaction sans rollback) et surtout les **scripts Lua** (`EVAL`), exécutés atomiquement — c'est comme ça qu'on écrit un rate limiter correct.
- **Redis comme file de messages — et ses limites** : pub/sub = fire-and-forget (un abonné déconnecté perd tout) ; lists = pas d'acquittement (crash après `BRPOP` = message perdu) ; **streams** = acks, consumer groups, relecture. Pour du routage riche, des dead-letter queues et des garanties contractuelles, une vraie MQ (RabbitMQ, Kafka) reste l'outil dédié.

## En entretien

**« Pourquoi Redis est-il si rapide ? »** — Réponse complète attendue : données en RAM (aucune I/O disque sur le chemin des requêtes), event loop mono-thread (zéro lock, zéro context switch), structures de données optimisées en C, protocole minimal (RESP). « Parce que c'est de la RAM » ne suffit pas.

**« Décris le pattern cache-aside. »** — Lecture : cache d'abord ; miss → DB → `SET` avec TTL. Écriture : DB puis invalidation de la clé. Nommer le défaut : entre l'écriture en DB et l'invalidation (ou pendant le TTL), les lecteurs voient l'ancienne valeur.

**« Une clé expire et 500 requêtes arrivent en même temps : que se passe-t-il ? »** — C'est le cache stampede : toutes font miss et frappent la DB simultanément. Parades : lock distribué (un seul recalcule), TTL jitter, servir la valeur périmée pendant le recalcul.

**« RDB vs AOF ? »** — RDB : snapshots compacts, restart rapide, perte potentielle de plusieurs minutes. AOF : journal quasi exhaustif (fsync everysec ≈ 1 s de perte max), fichiers plus gros, restart plus lent. Les deux se combinent ; un pur cache peut désactiver les deux.

**« Peut-on remplacer RabbitMQ par Redis ? »** — Nuancer : pour des jobs simples, lists ou streams suffisent (et les streams ont consumer groups + acks). Pour du routage complexe, des dead-letter queues, des garanties de livraison fortes : une vraie MQ. Montrer qu'on connaît la frontière vaut tous les buzzwords.

## Pièges & idées reçues

> ⚠️ **Cache sans TTL** — la mémoire se remplit inexorablement ; avec `noeviction` (le défaut !) les écritures finissent par échouer, avec `allkeys-lru` des données qu'on croyait durables disparaissent en silence. Un cache sans TTL est une fuite mémoire polie : un TTL partout, même long.

- **Hot key** : une clé ultra-demandée (le profil d'une célébrité) sature le thread unique ou un seul nœud du cluster. Parades : cache local in-process devant Redis, duplication de la clé (`key:1`, `key:2`… lues aléatoirement).
- **Big key** : un hash d'un million de champs → `HGETALL` bloque l'event loop pour tout le monde ; `DEL` d'une grosse clé bloque aussi → `UNLINK` (asynchrone) et parcours par lots (`HSCAN`). Et jamais `KEYS *` en prod : `SCAN`.
- **Redis comme base primaire sans réfléchir** : entre deux snapshots RDB, un crash perd des minutes de données. Si les données sont précieuses : AOF everysec minimum, réplication — et se demander si une vraie DB ne ferait pas mieux.
- **Cacher sans mesurer** : un cache se juge à son **hit ratio** (`INFO stats` : keyspace_hits/misses). Cacher des données jamais relues ou des objets énormes sérialisés coûte plus que ça ne rapporte.

## Pour aller plus loin

- [Redis — Data types](https://redis.io/docs/latest/develop/data-types/) et [Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) : les deux pages officielles à lire en entier
- [Redis University](https://university.redis.io/) : cours gratuits, RU101 pour les structures de données
- [Valkey](https://valkey.io/) : le fork open source (Linux Foundation) né du changement de licence de Redis en 2024 — bon point de culture générale en entretien
- Essayer en local : `docker run --rm -p 127.0.0.1:6379:6379 redis`, puis `redis-cli MONITOR` pendant que votre app tourne — voir passer les commandes en vrai
