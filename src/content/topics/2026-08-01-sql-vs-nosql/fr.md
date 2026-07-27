---
title: "SQL vs NoSQL"
date: "2026-08-01"
category: "Data"
level: "Fondamental"
summary: "ACID, CAP, sharding, index, N+1 : le débat SQL vs NoSQL est un classique absolu de l'entretien — et l'occasion rêvée de montrer qu'on raisonne en trade-offs plutôt qu'en slogans."
---

## L'essentiel

Le modèle **relationnel** structure les données en **tables** au **schéma** explicite (colonnes typées, contraintes), requêtées en SQL déclaratif, recomposées par **jointures**, protégées par des transactions **ACID**. Il domine depuis 40 ans parce qu'il est d'une polyvalence redoutable.

« **NoSQL** » n'est pas une technologie mais une étiquette : des familles très différentes, nées dans les années 2000 chez Google et Amazon pour des besoins que le relationnel de l'époque servait mal — scaling horizontal massif, schéma flexible, modèles spécifiques (graphe, clé-valeur).

La question d'entretien n'est jamais « lequel est le meilleur » mais « lequel pour quel problème ». Réponse courte défendable : **Postgres par défaut**, du NoSQL quand un pattern d'accès précis le justifie — et savoir dire lequel.

## Comment ça marche

**Le relationnel repose sur la normalisation** : chaque fait stocké une seule fois (une adresse se modifie à un endroit, pas douze), au prix de jointures pour recomposer les données. Les transactions garantissent **ACID** :

- **Atomicity** — tout ou rien : un virement débite ET crédite, jamais l'un sans l'autre.
- **Consistency** — les contraintes (clés étrangères, unicité, checks) restent vraies après chaque transaction.
- **Isolation** — les transactions concurrentes ne voient pas les états intermédiaires des autres (niveaux : read committed, repeatable read, serializable — plus c'est strict, plus c'est cher).
- **Durability** — après commit, la donnée survit à un crash (write-ahead log).

**Les quatre familles NoSQL** :

- **Document** (MongoDB) : des JSON imbriqués ; ce qui est lu ensemble est stocké ensemble (dénormalisation par design). Schéma flexible, agrégats naturels.
- **Clé-valeur** (Redis, DynamoDB) : GET/PUT par clé, latence minimale, pas de requêtes riches — le modèle le plus simple et le plus rapide.
- **Colonnes larges** (Cassandra) : conçu pour des écritures massives distribuées sur des dizaines de nœuds ; on modélise les tables à partir des requêtes, pas l'inverse.
- **Graphe** (Neo4j) : nœuds et relations de première classe ; les traversées (« amis d'amis d'amis ») restent efficaces là où le SQL empilerait des self-joins.

**Le théorème CAP, sans le massacrer** : dans un système **distribué**, quand une **partition réseau** survient (P — ce n'est pas un choix, ça arrive), il faut trancher entre **Consistency** (refuser de répondre plutôt que risquer une réponse fausse) et **Availability** (répondre, quitte à diverger puis réconcilier). Le « choisis 2 parmi 3 » est trompeur : le dilemme n'existe que **pendant** une partition ; le reste du temps, le vrai trade-off est latence contre cohérence (extension **PACELC**). Et CAP ne concerne pas une base sur un seul nœud.

**Cohérence éventuelle** : les répliques convergent « à terme » ; entre-temps, une lecture peut renvoyer une valeur périmée (le like qui disparaît puis revient). Beaucoup de systèmes offrent des garanties intermédiaires (read-your-writes, cohérence par session) ou réglables par requête (Cassandra : `QUORUM` vs `ONE`).

**Scaling** : **vertical** (machine plus grosse — simple, efficace longtemps, mais plafonne et coûte cher au sommet) vs **horizontal** (plus de machines). Deux outils : la **réplication** (leader-follower : les lectures se distribuent sur les replicas — attention au **replica lag**) et le **sharding** (partitionner les données par une **shard key** ; une mauvaise clé crée un hot shard, et les requêtes cross-shard coûtent cher). Le relationnel se réplique très bien ; c'est le sharding transactionnel qui est difficile (Citus, Vitess existent pour ça).

## Concepts clés à maîtriser

- **Index B-tree** : arbre équilibré, recherche en O(log n), sert l'égalité, les ranges (`WHERE created_at > …`) et le tri. C'est le défaut de tous les SGBD relationnels. Chaque index accélère des lectures et **ralentit toutes les écritures** (il faut le maintenir).
- **Quand un index ne sert à rien** : colonne à faible sélectivité (un booléen — le planner préfère un scan), fonction appliquée à la colonne (`WHERE lower(email) = …` sans index d'expression), `LIKE '%foo'` (wildcard en tête), colonnes hors du préfixe d'un index composite. Réflexe : `EXPLAIN ANALYZE`.
- **Postgres + JSONB** : colonne JSON binaire, indexable (GIN), requêtable — la flexibilité documentaire **dans** un moteur ACID. La réponse pragmatique à 80 % des « il nous faut MongoDB » : colonnes relationnelles pour le structuré, JSONB pour le variable.
- **ORM et N+1** : charger une liste (1 requête) puis accéder à une relation en lazy loading dans une boucle (N requêtes). Symptôme : page lente, log rempli de requêtes identiques. Fix : eager loading (`JOIN FETCH`, `include`, `select_related`/`prefetch_related`).
- **Dénormalisation** : dupliquer sciemment pour lire vite ; se paie à l'écriture (tenir les copies à jour). Le documentaire le fait par design ; le relationnel peut le faire ponctuellement (colonne calculée, vue matérialisée).

## En entretien

**« SQL ou NoSQL pour ce projet ? »** — Dérouler une méthode, pas un slogan : quels patterns d'accès ? besoin de transactions multi-entités ? volume et croissance réels ? relations riches ? Conclure : relationnel par défaut ; clé-valeur pour du cache/session, document pour des agrégats autonomes à schéma mouvant, colonnes larges pour de l'ingestion massive, graphe pour des traversées profondes.

**« Explique ACID avec un exemple. »** — Le virement bancaire : débit + crédit atomiques ; contrainte de solde respectée ; deux virements concurrents isolés ; après commit, un crash ne perd rien. Bonus : citer les niveaux d'isolation et le fait que read committed (défaut Postgres) autorise certaines anomalies.

**« C'est quoi le théorème CAP ? »** — L'énoncé correct : pendant une partition réseau, choix entre cohérence et disponibilité ; en dehors, le trade-off est latence vs cohérence (PACELC). Bonus : beaucoup de bases sont réglables (Cassandra par niveau de cohérence par requête, MongoDB via write/read concern).

**« Pourquoi ne pas mettre un index sur toutes les colonnes ? »** — Chaque index a un coût en écriture et en stockage, et l'optimiseur n'utilise que ceux qui filtrent vraiment. On indexe d'après les requêtes réelles (WHERE, JOIN, ORDER BY), on vérifie avec EXPLAIN, on supprime les index inutilisés.

**« C'est quoi le problème N+1 ? »** — 1 requête pour la liste, puis 1 par élément à cause du lazy loading de l'ORM. Le détecter (logs SQL, APM), le corriger (eager loading), et retenir la leçon : l'ORM cache le SQL mais ne dispense pas de le comprendre.

## Pièges & idées reçues

- **« NoSQL = pas de schéma »** — le schéma existe toujours ; il est juste implicite et éparpillé dans le code (schema-on-read). Le documentaire déplace la rigueur, il ne la supprime pas.
- **« SQL ne scale pas »** — read replicas, partitionnement, Vitess/Citus ; un Postgres bien indexé encaisse des dizaines de milliers de requêtes/s sur une seule machine. La plupart des projets n'atteindront jamais sa limite.
- **« MongoDB n'a pas de transactions »** — obsolète : transactions multi-documents depuis la 4.0 (avec un coût). Et les écritures sur un seul document ont toujours été atomiques.
- **Choisir la shard key à la légère** — la changer après coup signifie re-partitionner les données à chaud. C'est LA décision de design d'un système shardé.
- **Invoquer CAP pour tout** — une base mono-nœud n'est pas concernée ; et « AP » ne veut pas dire « perd des données », mais « répond pendant la partition, converge après ».

## Pour aller plus loin

- [Documentation Postgres — Indexes](https://www.postgresql.org/docs/current/indexes.html) et [JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Use The Index, Luke](https://use-the-index-luke.com/) — le meilleur tutoriel qui existe sur les index SQL
- [MongoDB — Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/) : apprendre à penser en agrégats
- Martin Kleppmann, *Designing Data-Intensive Applications* — LA référence du domaine ; et [jepsen.io](https://jepsen.io/analyses) pour ce que valent vraiment les garanties des bases distribuées
