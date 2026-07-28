---
title: "Kafka & l'event-driven"
date: "2026-09-22"
category: "Backend"
level: "Avancé"
summary: "Log distribué, partitions, consumer groups, replay : comprendre ce qui distingue Kafka d'une file de messages classique — et savoir dire honnêtement quand c'est overkill."
---

## L'essentiel

Kafka n'est **pas une file de messages** : c'est un **log distribué append-only**. La différence est fondamentale. Dans une queue classique (RabbitMQ), consommer un message le retire de la file : le message est un ordre à exécuter une fois. Dans Kafka, les événements sont **écrits à la suite dans un journal immuable** et les consommateurs se contentent d'avancer un **curseur (offset)** dans ce journal : **lire ne détruit rien**. Dix équipes peuvent lire le même flux, chacune à son rythme, et revenir en arrière.

Ce modèle fait de Kafka la colonne vertébrale des architectures **event-driven** : les services ne s'appellent plus directement, ils publient des faits (« commande n°42 créée ») que d'autres services consomment quand ils veulent. Découplage dans le temps, dans le débit, et dans le nombre de consommateurs.

| | Kafka | RabbitMQ |
|---|---|---|
| Modèle | Log distribué append-only | File + routage (exchanges) |
| Lecture | Non destructive : chaque consumer a son offset | Destructive : message ack = supprimé |
| Rétention | Par durée/taille (jours, ∞) → **replay possible** | Jusqu'à consommation |
| Ordre | Garanti **par partition** uniquement | Par queue (perdu avec plusieurs workers) |
| Débit | Très élevé (écriture séquentielle, batch) | Élevé, mais en deçà à gros volume |
| Routage | Simple : topics + clé de partition | Riche : exchanges, bindings, priorités |
| Idéal pour | Streaming, gros volumes, plusieurs lecteurs, replay | Tâches asynchrones, jobs, routage fin |

## Comment ça marche

Un **topic** est découpé en **partitions**. Chaque partition est un journal ordonné et immuable ; chaque message y reçoit un **offset** croissant. C'est la partition, pas le topic, qui est l'unité d'ordre et de parallélisme.

```text
Topic "orders" — 3 partitions, groupe "billing"

P0 |0|1|2|3|4|5|─▶   ────▶ consumer A ┐
P1 |0|1|2|3|─▶       ────▶ consumer B │ groupe
P2 |0|1|2|3|4|─▶     ────▶ consumer B ┘ "billing"

Autre groupe "analytics" : un consumer C lit
P0+P1+P2 avec ses propres offsets, indépendants.
```

- **Producteurs** : écrivent dans le topic. Avec une **clé** (`key=user-42`), le hash de la clé choisit la partition → tous les événements d'une même clé finissent dans la même partition, donc **dans l'ordre**. Sans clé : round-robin.
- **Consumer groups** : au sein d'un groupe, **chaque partition est assignée à exactement un consumer**. Trois partitions = trois consumers actifs au maximum ; le quatrième reste inactif. Ajouter/retirer un consumer déclenche un **rebalance** (réassignation des partitions).
- **Offsets** : chaque groupe committe sa position par partition. Kafka ne « pousse » rien et n'efface rien à la lecture : les messages expirent selon la **rétention** configurée (ex. 7 jours), qu'ils aient été lus ou non.
- **Replay** : puisque le journal reste là, on peut remettre l'offset à zéro et tout rejouer — pour reconstruire un cache, alimenter un nouveau service, ou rejouer après un bug de traitement. C'est le super-pouvoir que les queues classiques n'ont pas.

```python
from kafka import KafkaProducer, KafkaConsumer

# --- Producteur ---
producer = KafkaProducer(bootstrap_servers="localhost:9092")
# La clé détermine la partition : même user → même partition
# → l'ordre des événements de user-42 est préservé
producer.send("orders", key=b"user-42", value=b'{"total": 99}')
producer.flush()              # forcer l'envoi du batch

# --- Consommateur ---
consumer = KafkaConsumer(
    "orders",
    group_id="billing",           # membres du groupe = partitions partagées
    enable_auto_commit=False,     # commit manuel : on contrôle le moment
    auto_offset_reset="earliest", # 1er démarrage : lire depuis le début
)
for msg in consumer:
    process(msg)                  # traiter AVANT de committer l'offset
    consumer.commit()             # crash avant cette ligne → le message
                                  # sera relivré : at-least-once, donc
                                  # process() doit être idempotent
```

> ⚠️ **L'ordre global n'existe pas** — Kafka garantit l'ordre *à l'intérieur d'une partition*, jamais entre partitions. Deux événements de clés différentes peuvent être consommés dans n'importe quel ordre. Toute la conception tient dans le choix de la clé : les événements qui doivent rester ordonnés entre eux (ceux d'une même commande, d'un même user) doivent partager la même clé. Dire « Kafka garantit l'ordre » sans cette nuance est une erreur classique en entretien.

## Concepts clés à maîtriser

- **Sémantiques de livraison** : par défaut c'est **at-least-once** — si le consumer crash entre le traitement et le commit d'offset, le message est relivré. Committer *avant* de traiter donne de l'at-most-once (perte possible). L'**exactly-once** existe (producteur idempotent + transactions) mais son périmètre est surtout Kafka→Kafka (Kafka Streams) ; dès qu'un système externe est impliqué (DB, API), la réponse pragmatique est **at-least-once + consumer idempotent** (clé unique, upsert, dédoublonnage).
- **Choix du nombre de partitions** : c'est le plafond de parallélisme d'un groupe. Trop peu = consumers qui saturent ; beaucoup trop = surcoût de gestion et rebalances lents. Piège : **augmenter le nombre de partitions change le mapping clé→partition** pour les nouveaux messages — l'ordre par clé n'est plus garanti à cheval sur le changement.
- **Consumer lag** : l'écart entre le dernier offset produit et l'offset committé du groupe. C'est LA métrique à surveiller : un lag qui croît = consommateurs qui ne suivent plus.
- **Event sourcing (survol honnête)** : stocker les *événements* comme source de vérité (« CompteCredité +50 ») et reconstruire l'état en les rejouant, plutôt que stocker l'état courant. Souvent couplé à **CQRS** : séparer le modèle d'écriture (commandes → événements) du modèle de lecture (projections optimisées). Kafka en est un support naturel (log durable, replay), mais soyons honnêtes : l'event sourcing complet est un engagement architectural lourd (versionnage des événements, projections à maintenir, courbe d'apprentissage). La plupart des systèmes « event-driven » en production font plus simplement de la **notification d'événements** entre services — c'est déjà très bien.
- **Kafka n'est pas une base de données** ni un bus RPC : pas de requêtes, pas de lecture par clé, pas de réponse synchrone.

> 💡 **La question inverse : quand Kafka est overkill** — un monolithe, un seul consommateur, quelques centaines de messages par minute ? Une table `jobs` en Postgres, RabbitMQ, ou Redis Streams font l'affaire pour une fraction du coût opérationnel. Kafka, c'est un cluster de brokers à opérer, du monitoring, des rebalances à comprendre. Le choisir se justifie par : gros volumes, plusieurs consommateurs indépendants, besoin de replay/rétention, ou streaming temps réel. Savoir dire « ici, Kafka serait overkill » est un excellent signal en entretien.

## En entretien

**« Kafka vs RabbitMQ ? »** — Commencer par le modèle : RabbitMQ est une file (message consommé = supprimé, routage riche, parfait pour distribuer des tâches) ; Kafka est un log append-only (lecture non destructive par offset, rétention, replay, plusieurs groupes de consommateurs indépendants, débit massif). Puis un cas d'usage chacun : jobs asynchrones → RabbitMQ ; pipeline d'événements lu par facturation + analytics + audit → Kafka.

**« Comment Kafka garantit-il l'ordre ? »** — Il ne le garantit **que par partition**. Le producteur hash la clé pour choisir la partition : même clé → même partition → ordre préservé pour cette clé. Pas de clé, ou clés différentes → aucun ordre global. Le choix de la clé est donc une décision de design, pas un détail.

**« Que se passe-t-il si j'ajoute un 4ᵉ consumer à un groupe sur un topic à 3 partitions ? »** — Rien pour lui : une partition ne peut être assignée qu'à un consumer du groupe, donc il reste idle (utile seulement comme standby). Le parallélisme maximal d'un groupe = le nombre de partitions.

**« Exactly-once, c'est possible ? »** — Réponse honnête : Kafka fournit producteur idempotent et transactions, ce qui donne de l'exactly-once dans le périmètre Kafka→Kafka (Streams). Bout en bout avec une DB ou une API externe, on vise at-least-once + **idempotence côté consommateur** (contrainte unique, upsert, table de dédoublonnage). Répondre « oui, il suffit d'un flag » est un drapeau rouge.

**« C'est quoi l'event sourcing ? »** — Stocker la séquence d'événements comme source de vérité et dériver l'état en les rejouant ; souvent associé à CQRS (modèles écriture/lecture séparés). Avantages : audit complet, replay, projections multiples. Coût : complexité réelle (versionnage, projections). Bonus : préciser qu'on peut être event-driven sans faire d'event sourcing.

## Pièges & idées reçues

- **« Kafka est une queue »** — non : lire ne supprime rien, la rétention est temporelle, et plusieurs groupes lisent le même flux indépendamment. La moitié des erreurs de design viennent de cette confusion.
- **Consommer sans idempotence** : l'at-least-once par défaut *va* produire des doublons un jour (crash, rebalance). Si le traitement n'est pas idempotent, c'est un bug latent, pas un détail.
- **Le rebalance n'est pas gratuit** : pendant la réassignation, la consommation s'interrompt. Des consumers qui redémarrent en boucle = un groupe qui ne consomme presque plus.
- **Augmenter les partitions « pour scaler »** sans penser au mapping clé→partition, qui change pour les nouveaux messages.
- **Ignorer le consumer lag** jusqu'au jour où le retard se compte en heures — c'est la métrique de santé n°1 d'un consommateur.

> 🎤 **En entretien** — si on vous demande de « concevoir un système de commandes avec Kafka », posez d'emblée la question de la clé de partitionnement (« order-id, pour garantir l'ordre des événements d'une même commande ») et mentionnez l'idempotence du consumer. Ces deux réflexes montrent que vous avez compris le modèle, pas juste retenu le vocabulaire.

## Pour aller plus loin

- [Kafka — documentation officielle](https://kafka.apache.org/documentation/), en particulier l'introduction « Kafka in a nutshell »
- [Confluent Developer](https://developer.confluent.io/) : cours gratuits, dont « Kafka 101 » (vidéos courtes)
- [Turning the database inside-out — Martin Kleppmann](https://martin.kleppmann.com/2015/03/04/turning-the-database-inside-out.html), et son livre *Designing Data-Intensive Applications* (chapitre 11)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) et [CQRS](https://martinfowler.com/bliki/CQRS.html) — Martin Fowler, qui met lui-même en garde contre l'usage systématique
