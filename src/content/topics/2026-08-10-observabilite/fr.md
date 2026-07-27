---
title: "Observabilité : logs, metrics & traces"
date: "2026-08-10"
category: "DevOps"
level: "Intermédiaire"
summary: "Les trois piliers, Prometheus, OpenTelemetry, SLO : savoir expliquer comment on debugge un système en prod — la question qui sépare ceux qui ont déployé de ceux qui ont juste codé."
---

## L'essentiel

Le **monitoring** répond à des questions **connues d'avance** : « le CPU dépasse-t-il 80 % ? », « le service répond-il ? ». On définit des seuils, on affiche des dashboards, on alerte. L'**observabilité** va plus loin : c'est la capacité à répondre à des questions qu'on **n'avait pas anticipées** — « pourquoi les requêtes des utilisateurs premium sur ce endpoint sont-elles lentes depuis le déploiement de 14h ? » — à partir des données que le système émet (ses *outputs*), sans redéployer du code instrumenté à la main.

La distinction vient du monde des systèmes distribués : avec un monolithe, on SSH sur le serveur et on lit les logs. Avec 15 services derrière un load balancer, une requête traverse 6 services — savoir *que* c'est lent (monitoring) ne dit pas *où ni pourquoi* (observabilité).

En entretien de stage, le sujet fait la différence parce qu'il révèle si le candidat a déjà **exploité** une application, pas seulement écrit du code : celui qui a cherché un bug en prod à 2 requêtes/seconde de logs non structurés comprend immédiatement pourquoi tout ça existe.

## Comment ça marche

L'observabilité repose sur **trois piliers** complémentaires :

**Les logs** — des événements horodatés et discrets : « telle requête a échoué avec telle erreur ». La règle moderne : des **logs structurés en JSON** plutôt que du texte libre — on peut alors filtrer, agréger, chercher par champ :

```jsonc
{
  "timestamp": "2026-08-10T14:03:07Z",
  "level": "error",       // filtrable par champ
  "route": "/checkout",
  "duration_ms": 870,     // agrégeable (p99 par route)
  "user_id": 42,          // le contexte qui manque à un printf
  // le même ID que dans la trace → corrélation entre piliers
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "msg": "payment provider timeout"
}
```

Indispensable : cet **identifiant de corrélation** (request ID, trace ID), propagé de service en service, permet de reconstituer le parcours d'une requête à travers les logs de toute la stack.

**Les metrics** — des valeurs numériques **agrégées** dans le temps : compteurs, jauges, histogrammes. Peu coûteuses à stocker, parfaites pour les dashboards et les alertes. Deux grilles de lecture classiques : **RED** pour les services (Rate : requêtes/s, Errors : taux d'erreur, Duration : latence — en percentiles p50/p95/p99, jamais en moyenne) et **USE** pour les ressources (Utilization, Saturation, Errors). Une metric dit *qu'il y a* un problème, rarement *lequel*.

**Les traces** — le parcours d'une **requête individuelle** à travers les services. Une trace est un arbre de **spans** : chaque span représente une opération (appel HTTP, requête SQL) avec début, durée, attributs et parent. La magie s'appelle **context propagation** : le trace ID et le span ID parent voyagent dans les headers HTTP (standard W3C `traceparent`) d'un service à l'autre, ce qui permet de reconstituer l'arbre complet :

```text
trace 4bf92f… — GET /checkout — 800 ms
├─ gateway          [■■■■■■■■■■■■■■■■■■■■] 800 ms
│  ├─ svc panier    [■■■]                  150 ms
│  └─ svc paiement      [■■■■■■■■■■■■■■■]  620 ms
│     └─ SQL UPDATE      [■■■■■■■■■■■■■■]  600 ms ◀ ici
└─ chaque ligne = un span (début, durée, parent)
```

D'un coup d'œil : sur 800 ms de latence, 600 sont dans une requête SQL du service paiement.

Les trois piliers en un coup d'œil :

| | Logs | Metrics | Traces |
|---|---|---|---|
| Nature | Événements discrets, riches en contexte | Agrégats numériques dans le temps | Parcours d'une requête, en spans |
| Coût | Élevé (facturé au Go ingéré) | Faible | Moyen (échantillonné) |
| Répond à | « Que s'est-il passé exactement ? » | « Ça va mal ? Où, depuis quand ? » | « Où est passé le temps ? » |

La stack type qu'un candidat doit savoir citer : **Prometheus** (metrics, modèle *pull* : il scrappe un endpoint `/metrics`, avec son langage de requête PromQL) + **Grafana** (dashboards) ; **Loki** ou la stack **ELK** (Elasticsearch/Logstash/Kibana) pour les logs ; **Jaeger** ou **Tempo** pour les traces. Et au-dessus de tout : **OpenTelemetry (OTel)**, le standard **vendor-neutral** de la CNCF qui unifie l'instrumentation — SDK par langage, souvent de l'auto-instrumentation, un **Collector** qui reçoit, transforme et exporte vers le backend de son choix. On instrumente une fois, on change de backend sans toucher au code : c'est l'argument clé.

> 🎤 **En entretien** — le déroulé qui marque : metrics pour détecter (le p99 monte), traces pour localiser (quel span porte la latence), logs pour expliquer (quelle erreur), le tout relié par le trace ID. Cette chaîne récitée calmement vaut mieux que dix noms d'outils.

## Concepts clés à maîtriser

- **Corrélation entre piliers** : le vrai pouvoir vient du lien — une alerte metric (p99 en hausse) → les traces lentes de la période → les logs des spans en erreur, reliés par le trace ID. Les trois piliers isolés font trois silos ; corrélés, un outil de diagnostic.
- **Cardinality et coûts** : chaque combinaison de labels d'une metric crée une série temporelle distincte (voir le piège plus bas) ; côté logs, le volume se paie au Go ingéré, d'où l'échantillonnage (sampling) des traces en production.
- **SLI/SLO** : un **SLI** est une mesure de ce que vivent les utilisateurs (ex. « proportion de requêtes servies en moins de 300 ms »), un **SLO** l'objectif qu'on s'engage à tenir dessus (ex. 99,9 % sur 30 jours). Le budget d'erreur qui en découle arbitre entre fiabilité et vélocité de déploiement.

> 💡 **Alerter sur les symptômes, pas les causes** — on réveille quelqu'un pour ce que les utilisateurs subissent (taux d'erreur, latence — les SLI), jamais pour un CPU à 95 % avec des utilisateurs heureux. Un taux d'erreur à 5 % mérite une alerte quelle qu'en soit la cause ; les causes se consultent dans les dashboards *après* l'alerte.

## En entretien

**« Quelle différence entre monitoring et observabilité ? »** — Le monitoring vérifie des conditions connues d'avance (seuils, dashboards prédéfinis) ; l'observabilité permet d'interroger le système sur des problèmes non anticipés, grâce à des données riches (logs structurés, traces, metrics) émises par le système. Formule qui marque : le monitoring dit *que* ça casse, l'observabilité permet de comprendre *pourquoi*.

**« Explique les trois piliers. »** — dérouler le tableau plus haut, puis conclure sur la corrélation via trace ID : c'est elle qui transforme trois outils en un système.

**« Comment debuggerais-tu une API soudainement lente en prod ? »** — Dashboard RED : la latence p99 monte — sur quel endpoint, depuis quand, corrélé à un déploiement ? Traces des requêtes lentes : quel span porte la latence (SQL ? appel externe ? le service lui-même ?). Logs corrélés par trace ID pour le détail (le déroulé du callout plus haut).

**« C'est quoi OpenTelemetry et pourquoi c'est devenu le standard ? »** — Un projet CNCF qui standardise la génération et l'export des trois signaux : API/SDK par langage, context propagation, Collector. Vendor-neutral : on instrumente une fois et on exporte vers Jaeger, Prometheus, Datadog ou autre — pas de lock-in par l'instrumentation. C'est devenu le socle commun de tout l'écosystème.

**« Pourquoi regarder le p99 plutôt que la latence moyenne ? »** — La moyenne cache la distribution : 99 requêtes à 50 ms + 1 à 5 s = moyenne correcte, expérience désastreuse pour 1 % des utilisateurs — souvent les plus actifs (plus de requêtes = plus de chances de toucher la queue de distribution). Les percentiles décrivent ce que vivent réellement les utilisateurs.

## Pièges & idées reçues

> ⚠️ **Cardinality explosion** — chaque combinaison de valeurs de labels crée une série temporelle : un label `user_id` sur un compteur Prometheus = des millions de séries = mémoire qui explose. Labels à valeurs **bornées** (status code, endpoint, région) ; les identifiants uniques vont dans les logs et les traces.

- **Logger sans contexte** : un `console.log("error")` sans request ID, sans user ID, sans champ structuré est illisible à 100 req/s. Log structuré + corrélation, sinon c'est du bruit.
- **L'alert fatigue** : des alertes qui crient en permanence (seuils trop fins, alertes sur les causes) finissent ignorées — et le jour où c'est grave, personne ne regarde. Chaque alerte doit être **actionnable** ; une alerte qu'on acquitte sans agir doit être supprimée ou revue.
- **Les dashboards que personne ne regarde** : accumuler 40 dashboards n'est pas de l'observabilité. Quelques vues orientées symptômes (RED par service) consultées pendant les incidents valent mieux qu'un mur d'écrans décoratif.
- **« On ajoutera l'observabilité plus tard »** : instrumenter après l'incident, c'est trop tard. L'auto-instrumentation OTel rend le coût initial faible — l'excuse ne tient plus.
- **Tout tracer à 100 % en prod** : le volume coûte cher pour une valeur marginale ; on échantillonne (head/tail sampling) en gardant systématiquement les traces en erreur et les plus lentes.

## Pour aller plus loin

- [Documentation OpenTelemetry](https://opentelemetry.io/docs/) — commencer par [Concepts](https://opentelemetry.io/docs/concepts/), puis instrumenter une petite app avec l'auto-instrumentation
- [Prometheus — Overview](https://prometheus.io/docs/introduction/overview/) et les [bonnes pratiques sur les labels](https://prometheus.io/docs/practices/naming/) (la page qui évite la cardinality explosion)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) : le chapitre fondateur sur symptômes vs causes et les golden signals
- [Grafana — Get started](https://grafana.com/docs/grafana/latest/getting-started/) : monter un Prometheus + Grafana en local avec Docker Compose et brancher une app instrumentée — l'exercice pratique idéal avant un entretien
