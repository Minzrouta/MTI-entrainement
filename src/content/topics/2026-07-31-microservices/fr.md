---
title: "Microservices vs monolithe"
date: "2026-07-31"
category: "Architecture"
level: "Intermédiaire"
summary: "Savoir défendre le monolithe ET expliquer quand les microservices se justifient : la question d'architecture préférée des entretiens, où la nuance rapporte plus que le buzzword."
---

## L'essentiel

Un **monolithe** est une application déployée comme une seule unité : un processus, une base de données, un déploiement. Des **microservices** découpent le système en services indépendants, chacun avec son code, sa base et son cycle de déploiement, communiquant par le réseau.

| | Monolithe | Microservices |
|---|---|---|
| Déploiement | une unité, atomique | indépendant, service par service |
| Données | une base, transactions ACID | database-per-service, cohérence à terme |
| Appels | fonctions — gratuits, fiables | réseau — latence, pannes partielles |
| Ops | 1 pipeline, 1 monitoring | N pipelines, tracing distribué, plateforme |
| Équipe | une petite équipe suffit | exige plusieurs équipes autonomes |
| Debugging | une stack trace | une enquête multi-services |

Le point que les entretiens cherchent à vérifier : **le monolithe est souvent le bon choix**, surtout en début de projet. Un appel de fonction est infiniment plus simple qu'un appel réseau — toute la colonne de droite se paie cash. Le mauvais réflexe « startup = microservices » a coulé plus de projets que les monolithes qu'il prétendait éviter.

La vraie alternative au plat de spaghetti n'est pas le microservice, c'est le **monolithe modulaire** : un seul déployable, mais des modules internes aux frontières nettes (le module `billing` n'accède au module `users` que par son interface publique). On garde la simplicité opérationnelle, on prépare un éventuel découpage futur — et si les frontières sont bonnes, extraire un module en service devient un déménagement, pas une réécriture.

> 🎤 **En entretien** — savoir défendre le monolithe est le vrai signal de maturité. « Pour ce projet, je garderais un monolithe modulaire : une seule équipe, un domaine encore mouvant, aucun besoin de scaling asymétrique » vaut plus que n'importe quel buzzword Kubernetes.

## Comment ça marche

**Ce que les microservices apportent vraiment** — trois promesses, toutes organisationnelles autant que techniques :

- **Déploiement indépendant** : l'équipe paiement déploie 10 fois par jour sans attendre le train de release des autres. C'est LA promesse centrale — si vos services doivent se déployer ensemble, vous n'avez pas des microservices.
- **Scaling ciblé** : on réplique le service de recherche sous forte charge sans dupliquer tout le reste. (Honnêteté : un monolithe se réplique aussi très bien derrière un load balancer — l'argument vaut surtout pour des besoins très asymétriques : GPU, mémoire, langage spécifique.)
- **Ownership d'équipe** : chaque équipe possède ses services de bout en bout — code, base, astreinte. C'est la **loi de Conway** appliquée volontairement : l'architecture reflète l'organisation, autant la choisir. Corollaire : découper en microservices une équipe de 3 devs, c'est créer des frontières entre… personne.

> 💡 **Le test décisif** — une seule question juge une architecture microservices : « peux-tu déployer ce service seul, sans coordonner personne ? ». Si la réponse est non, vous payez le prix du distribué sans son bénéfice central.

**Les coûts cachés** — tout ce qu'un appel de fonction faisait gratuitement :

- **Le réseau** : latence, timeouts, retries (avec idempotence !), pannes partielles, circuit breakers. Un appel qui ne pouvait pas échouer devient un appel qui échoue à 2h du matin.
- **La cohérence des données** : chaque service a sa base (**database-per-service** — sinon le couplage par le schéma ruine l'indépendance). Conséquence : plus de transaction ACID entre services ni de JOIN SQL cross-domaines. On vit avec la **cohérence à terme** (eventual consistency), et une commande qui touche stock + paiement + livraison devient une **saga** : une séquence de transactions locales, où chaque échec déclenche des transactions de compensation qui défont les étapes précédentes. En deux phrases en entretien, ça suffit — savoir que le problème existe compte plus que les détails.
- **L'observabilité** : une requête traverse 6 services ; sans **tracing distribué** (correlation ID propagé, OpenTelemetry) et logs centralisés, chaque bug est une enquête.
- **L'ops** : N pipelines CI/CD, N services à monitorer, la gestion des versions d'API entre services. Il faut une plateforme (Kubernetes ou équivalent) et une équipe capable de l'opérer.

**Communication** : **synchrone** (REST, gRPC) — simple à raisonner, mais couplage temporel : si le service aval est lent ou down, l'amont l'est aussi, et les pannes se propagent en cascade. **Asynchrone** (événements via un broker : Kafka, RabbitMQ) — le producteur publie « OrderCreated » et n'attend personne ; découplage et absorption des pics, au prix de la cohérence à terme et d'un debugging plus difficile. Une **API gateway** sert de point d'entrée unique aux clients : routing, authentification, rate limiting, agrégation — les clients n'ont pas à connaître la topologie interne.

## Concepts clés à maîtriser

- **Monolithe modulaire** : la réponse nuancée qui fait mouche en entretien. Frontières logiques sans frontières réseau.
- **Distributed monolith** : l'anti-pattern n°1 — des services séparés par le réseau mais couplés au point de devoir se déployer ensemble. Tous les coûts du distribué, aucun bénéfice (voir l'encadré des pièges).
- **Database-per-service** : condition nécessaire de l'indépendance. Deux services qui partagent une base sont couplés par le schéma — un `ALTER TABLE` de l'un casse l'autre.
- **Saga** : la réponse aux transactions distribuées — transactions locales + compensations, orchestrées (un coordinateur) ou chorégraphiées (chaîne d'événements).
- **Strangler fig** : la stratégie de migration raisonnable — on extrait du monolithe une capacité à la fois, un proxy route progressivement le trafic vers le nouveau service, le monolithe « s'étrangle » petit à petit. Jamais de big bang rewrite.

```text
             ┌───────┐
 Clients ──▶ │ Proxy │  route de plus en plus
             └───┬───┘  vers les services extraits
        ┌────────┴────────┐
        ▼                 ▼
 ┌────────────┐    ┌──────────────┐
 │ Monolithe  │    │ Service      │
 │ (rétrécit) │    │ extrait n° 1 │
 └────────────┘    └──────────────┘
  /orders /users      /billing
```

- **Quand migrer** : quand les limites deviennent concrètes — des équipes qui se bloquent mutuellement au déploiement, un module aux besoins de scaling radicalement différents, une organisation qui dépasse ce qu'un déployable unique supporte. La douleur d'abord, le découpage ensuite.

## En entretien

**« Monolithe ou microservices pour une startup qui démarre ? »** — Monolithe, modulaire de préférence. À ce stade, la vitesse d'itération prime et le produit pivote ; les microservices figent des frontières qu'on ne connaît pas encore, et imposent des coûts (réseau, ops, cohérence) sans équipe pour les absorber. Citer le « MonolithFirst » de Fowler : les microservices réussis sont presque tous des monolithes découpés après coup.

**« C'est quoi un distributed monolith ? »** — Des services séparés par le réseau mais toujours couplés : déploiements coordonnés, base partagée, chaînes d'appels synchrones. Le pire des deux mondes : la latence et les pannes partielles du distribué, sans le déploiement indépendant. Causes typiques : découpage par couches techniques plutôt que par domaines métier, et frontières tracées trop tôt.

**« Comment gérer une transaction qui traverse plusieurs services ? »** — On ne peut plus avoir d'ACID global ; le pattern saga découpe l'opération en transactions locales, chacune avec une compensation en cas d'échec en aval (annuler la réservation, rembourser le paiement). Ajouter que ça se conçoit : opérations idempotentes, états intermédiaires visibles (« paiement en attente »).

**« Communication synchrone ou asynchrone entre services ? »** — Synchrone (REST/gRPC) quand on a besoin de la réponse immédiatement ; mais chaque appel synchrone propage les pannes et additionne les latences. Asynchrone (événements) pour tout ce qui peut l'être : découplage, résilience aux pics, mais cohérence à terme. Règle pratique : synchrone pour les queries client, asynchrone entre services quand c'est possible.

**« Comment migrer un monolithe vers des microservices ? »** — Strangler fig : d'abord modulariser le monolithe pour révéler les vraies frontières, puis extraire la capacité qui a le meilleur ratio douleur/risque (souvent un domaine périphérique), router le trafic via un proxy ou une gateway, répéter. Chaque extraction doit se justifier seule — si aucune ne se justifie, on garde le monolithe et c'est très bien.

## Pièges & idées reçues

> ⚠️ **Le distributed monolith vous guette** — le symptôme infaillible : « on déploie les trois services ensemble le jeudi ». Base partagée, API fragiles, chaînes d'appels synchrones : vous payez la latence et les pannes partielles du distribué sans son seul vrai bénéfice, le déploiement indépendant.

- **« Les microservices, c'est plus scalable »** — un monolithe répliqué derrière un load balancer scale très bien. Le scaling ciblé ne se justifie que pour des besoins vraiment asymétriques.
- **Microservices à 3 devs** : les frontières de services servent à découpler des *équipes*. Sans équipes multiples, on hérite des coûts sans les bénéfices.
- **Base partagée entre services** : le couplage par le schéma annule le déploiement indépendant — c'est le chemin le plus court vers le distributed monolith.
- **Ignorer le réseau** : traiter un appel inter-service comme un appel de fonction (pas de timeout, pas de retry, pas d'idempotence), c'est découvrir les 8 fallacies of distributed computing en production.
- **Découper trop tôt** : les frontières de domaines n'apparaissent qu'avec l'usage. Un mauvais découpage en microservices se corrige beaucoup plus cher qu'un mauvais découpage en modules.
- **Migrer par mode** : « Netflix le fait » — Netflix a des milliers d'ingénieurs. La bonne question n'est jamais « comment font les GAFAM » mais « quel problème concret ai-je aujourd'hui ».

## Pour aller plus loin

- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) et [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
- [microservices.io](https://microservices.io/patterns/index.html) : le catalogue de patterns de Chris Richardson, notamment [Saga](https://microservices.io/patterns/data/saga.html) et [Database per service](https://microservices.io/patterns/data/database-per-service.html)
- [Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html) : la stratégie de migration
- Exercice de pensée utile en entretien : prendre un de vos projets et argumenter *contre* son découpage en microservices — l'exercice inverse du réflexe habituel
