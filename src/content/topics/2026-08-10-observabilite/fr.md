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

**Les logs** — des événements horodatés et discrets : « telle requête a échoué avec telle erreur ». La règle moderne : des **logs structurés en JSON** (`{"level":"error","route":"/checkout","user_id":42,"duration_ms":870}`) plutôt que du texte libre — on peut alors filtrer, agréger, chercher par champ. Indispensable : un **identifiant de corrélation** (request ID, trace ID) propagé de service en service, pour reconstituer le parcours d'une requête à travers les logs de toute la stack.

**Les metrics** — des valeurs numériques **agrégées** dans le temps : compteurs, jauges, histogrammes. Peu coûteuses à stocker, parfaites pour les dashboards et les alertes. Deux grilles de lecture classiques : **RED** pour les services (Rate : requêtes/s, Errors : taux d'erreur, Duration : latence — en percentiles p50/p95/p99, jamais en moyenne) et **USE** pour les ressources (Utilization, Saturation, Errors). Une metric dit *qu'il y a* un problème, rarement *lequel*.

**Les traces** — le parcours d'une **requête individuelle** à travers les services. Une trace est un arbre de **spans** : chaque span représente une opération (appel HTTP, requête SQL) avec début, durée, attributs et parent. La magie s'appelle **context propagation** : le trace ID et le span ID parent voyagent dans les headers HTTP (standard W3C `traceparent`) d'un service à l'autre, ce qui permet de reconstituer l'arbre complet — et de voir d'un coup d'œil que sur 800 ms de latence, 600 sont dans une requête SQL du service C.

La stack type qu'un candidat doit savoir citer : **Prometheus** (metrics, modèle *pull* : il scrappe un endpoint `/metrics`, avec son langage de requête PromQL) + **Grafana** (dashboards) ; **Loki** ou la stack **ELK** (Elasticsearch/Logstash/Kibana) pour les logs ; **Jaeger** ou **Tempo** pour les traces. Et au-dessus de tout : **OpenTelemetry (OTel)**, le standard **vendor-neutral** de la CNCF qui unifie l'instrumentation — SDK par langage, souvent de l'auto-instrumentation, un **Collector** qui reçoit, transforme et exporte vers le backend de son choix. On instrumente une fois, on change de backend sans toucher au code : c'est l'argument clé.

## Concepts clés à maîtriser

- **Corrélation entre piliers** : le vrai pouvoir vient du lien — une alerte metric (p99 en hausse) → les traces lentes de la période → les logs des spans en erreur, reliés par le trace ID. Les trois piliers isolés font trois silos ; corrélés, un outil de diagnostic.
- **Cardinality et coûts** : chaque combinaison de labels d'une metric crée une série temporelle distincte. Un label `user_id` sur un compteur = potentiellement des millions de séries = explosion mémoire de Prometheus (cardinality explosion). Règle : labels à valeurs **bornées** (status code, endpoint, région) ; les identifiants uniques vont dans les logs et les traces, pas dans les metrics. Même logique côté coûts : les logs verbeux se paient au Go ingéré, d'où l'échantillonnage (sampling) des traces en production.
- **SLI/SLO** : un **SLI** est une mesure de ce que vivent les utilisateurs (ex. « proportion de requêtes servies en moins de 300 ms »), un **SLO** l'objectif qu'on s'engage à tenir dessus (ex. 99,9 % sur 30 jours). Le budget d'erreur qui en découle arbitre entre fiabilité et vélocité de déploiement.
- **Alerter sur les symptômes, pas les causes** : on alerte sur ce que les utilisateurs subissent (taux d'erreur, latence — les SLI), pas sur les causes possibles (CPU haut, mémoire à 90 %). Un CPU à 95 % avec des utilisateurs heureux ne mérite pas de réveiller quelqu'un ; un taux d'erreur à 5 % si, quelle qu'en soit la cause. Les causes se consultent dans les dashboards *après* l'alerte symptôme.

## En entretien

**« Quelle différence entre monitoring et observabilité ? »** — Le monitoring vérifie des conditions connues d'avance (seuils, dashboards prédéfinis) ; l'observabilité permet d'interroger le système sur des problèmes non anticipés, grâce à des données riches (logs structurés, traces, metrics) émises par le système. Formule qui marque : le monitoring dit *que* ça casse, l'observabilité permet de comprendre *pourquoi*.

**« Explique les trois piliers. »** — Logs : événements discrets, riches en contexte, chers en volume. Metrics : agrégats numériques, pas chers, parfaits pour alerter, pauvres en contexte. Traces : le parcours d'une requête à travers les services, découpé en spans. Conclure sur la corrélation via trace ID : c'est elle qui transforme trois outils en un système.

**« Comment debuggerais-tu une API soudainement lente en prod ? »** — Dashboard RED : la latence p99 monte — sur quel endpoint, depuis quand, corrélé à un déploiement ? Traces des requêtes lentes : quel span porte la latence (SQL ? appel externe ? le service lui-même ?). Logs corrélés par trace ID pour le détail. Réponse structurée metrics → traces → logs = candidat qui a compris le système.

**« C'est quoi OpenTelemetry et pourquoi c'est devenu le standard ? »** — Un projet CNCF qui standardise la génération et l'export des trois signaux : API/SDK par langage, context propagation, Collector. Vendor-neutral : on instrumente une fois et on exporte vers Jaeger, Prometheus, Datadog ou autre — pas de lock-in par l'instrumentation. C'est devenu le socle commun de tout l'écosystème.

**« Pourquoi regarder le p99 plutôt que la latence moyenne ? »** — La moyenne cache la distribution : 99 requêtes à 50 ms + 1 à 5 s = moyenne correcte, expérience désastreuse pour 1 % des utilisateurs — souvent les plus actifs (plus de requêtes = plus de chances de toucher la queue de distribution). Les percentiles décrivent ce que vivent réellement les utilisateurs.

## Pièges & idées reçues

- **Logger sans contexte** : un `console.log("error")` sans request ID, sans user ID, sans champ structuré est illisible à 100 req/s. Log structuré + corrélation, sinon c'est du bruit.
- **L'alert fatigue** : des alertes qui crient en permanence (seuils trop fins, alertes sur les causes) finissent ignorées — et le jour où c'est grave, personne ne regarde. Chaque alerte doit être **actionnable** ; une alerte qu'on acquitte sans agir doit être supprimée ou revue.
- **Les dashboards que personne ne regarde** : accumuler 40 dashboards n'est pas de l'observabilité. Quelques vues orientées symptômes (RED par service) consultées pendant les incidents valent mieux qu'un mur d'écrans décoratif.
- **La cardinality explosion** : mettre `user_id` ou un UUID en label Prometheus fait exploser la mémoire. Identifiants uniques → logs et traces.
- **« On ajoutera l'observabilité plus tard »** : instrumenter après l'incident, c'est trop tard. L'auto-instrumentation OTel rend le coût initial faible — l'excuse ne tient plus.
- **Tout tracer à 100 % en prod** : le volume coûte cher pour une valeur marginale ; on échantillonne (head/tail sampling) en gardant systématiquement les traces en erreur et les plus lentes.

## Pour aller plus loin

- [Documentation OpenTelemetry](https://opentelemetry.io/docs/) — commencer par [Concepts](https://opentelemetry.io/docs/concepts/), puis instrumenter une petite app avec l'auto-instrumentation
- [Prometheus — Overview](https://prometheus.io/docs/introduction/overview/) et les [bonnes pratiques sur les labels](https://prometheus.io/docs/practices/naming/) (la page qui évite la cardinality explosion)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) : le chapitre fondateur sur symptômes vs causes et les golden signals
- [Grafana — Get started](https://grafana.com/docs/grafana/latest/getting-started/) : monter un Prometheus + Grafana en local avec Docker Compose et brancher une app instrumentée — l'exercice pratique idéal avant un entretien
