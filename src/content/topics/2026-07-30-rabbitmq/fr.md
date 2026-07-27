---
title: "RabbitMQ & les files de messages"
date: "2026-07-30"
category: "Backend"
level: "Intermédiaire"
summary: "Découplage, lissage de charge, garanties de livraison : ce qu'un broker de messages change dans une architecture — et les questions ack, DLQ et idempotence qui reviennent en boucle en entretien backend."
---

## L'essentiel

Une **message queue** insère un intermédiaire durable entre un producteur et un consommateur : au lieu d'appeler le service B en synchrone (et d'échouer avec lui), le service A publie un message dans un broker et continue sa vie. Trois bénéfices : **découplage** (A ignore qui consomme, B peut être down sans casser A), **lissage de charge** (un pic de trafic s'empile dans la queue au lieu d'écrouler B), **résilience** (le message persiste jusqu'à son traitement, avec retry natif).

**RabbitMQ** est le broker open source le plus répandu, implémentation de référence du protocole **AMQP 0-9-1**. En entretien, on attend trois choses : le modèle exchange/queue/binding, la mécanique des acks, et la discussion at-least-once / idempotence.

## Comment ça marche

Le modèle AMQP a une subtilité que les débutants ratent : **un producteur ne publie jamais directement dans une queue**. Il publie dans un **exchange**, avec une **routing key** ; l'exchange route le message vers zéro, une ou plusieurs queues selon ses **bindings** (les règles de liaison exchange → queue).

Trois types d'exchange à connaître :

- **direct** — route vers les queues dont le binding correspond exactement à la routing key. Ex. : `payment.failed` → la queue liée avec la clé `payment.failed`.
- **fanout** — diffuse à toutes les queues liées, routing key ignorée. Le pub/sub pur.
- **topic** — pattern matching sur la routing key segmentée par des points : `*` = exactement un mot, `#` = zéro ou plusieurs mots. `logs.*.error` matche `logs.api.error` mais pas `logs.api.db.error`.

(Le quatrième type, headers, est rarement utilisé.)

Côté consommateur : le broker pousse les messages, et le consumer les **acquitte** (`ack`) une fois le traitement terminé. Si le consumer meurt avant l'ack (crash, connexion coupée), le broker **redélivre** le message — flag `redelivered` positionné — à un autre consumer. `nack`/`reject` refusent un message, avec ou sans remise en queue. Le **prefetch** (QoS) borne le nombre de messages non acquittés par consumer : c'est lui qui assure une répartition équitable au lieu de tout déverser sur le premier connecté.

La durabilité se déclare **aux deux niveaux** : queue *durable* et message *persistent* (delivery_mode=2). L'un sans l'autre ne survit pas à un redémarrage du broker. Côté producteur, les **publisher confirms** donnent l'accusé de réception du broker.

**Dead letter queue (DLQ)** : une queue peut déclarer un dead-letter exchange (DLX) ; y sont routés les messages rejetés sans requeue, expirés (TTL) ou en dépassement de longueur maximale. Indispensable en production : un message empoisonné (qui fait crasher le consumer) part en DLQ après N tentatives au lieu de tourner en boucle, et on peut l'inspecter puis le rejouer.

## Concepts clés à maîtriser

- **at-most-once vs at-least-once** : ack automatique (auto-ack) = **at-most-once** — le message est considéré livré dès l'envoi, un crash du consumer le perd. Ack manuel après traitement = **at-least-once** — rien n'est perdu, mais un crash entre le traitement et l'ack provoque une **redélivrance en double**. L'« exactly-once » de bout en bout n'existe pas dans un système distribué sans coopération applicative.
- **Idempotence des consumers** : conséquence directe du at-least-once — le consumer doit tolérer les doublons. Techniques : déduplication par message id (insert avec contrainte unique → le doublon échoue proprement), ou opérations naturellement idempotentes (upsert, `SET status = 'paid'` plutôt que `balance += x`).
- **Patterns** : **work queue** (une queue, N consumers en compétition — chaque message traité une fois, scaling horizontal du traitement), **pub/sub** (exchange fanout ou topic, une queue par service consommateur — chacun reçoit sa copie de l'événement), **RPC sur messaging** (queue de réponse + `correlation_id` — possible, mais réintroduit un couplage synchrone : à utiliser avec parcimonie).
- **RabbitMQ vs Kafka** : Rabbit est une **queue** — broker intelligent qui route finement, message supprimé après ack, parfait pour la distribution de tâches. Kafka est un **log** distribué append-only — les messages restent, chaque consumer avance son **offset**, ce qui permet le replay et plusieurs lectures indépendantes du même flux ; débit massif grâce aux partitions. Tâches, routage riche, latence faible → Rabbit ; event streaming, replay, très haut débit → Kafka.
- **Ordering** : garanti FIFO au sein d'une queue… pour un seul consumer. Avec des consumers en compétition ou des redélivrances, l'ordre de *traitement* n'est plus garanti — à ne jamais promettre en entretien.

## En entretien

**« Pourquoi mettre une queue entre deux services plutôt qu'un appel HTTP ? »** — Découplage temporel (B peut être down, le message attend), lissage des pics (la queue absorbe, B consomme à son rythme), retry natif via la redélivrance, et fan-out vers plusieurs consommateurs sans toucher au producteur. Contreparties à citer spontanément : latence de bout en bout, cohérence éventuelle, et une brique d'infra de plus à opérer et monitorer.

**« Direct, fanout, topic : tu utilises quoi, quand ? »** — Direct pour du routage exact (chaque type de tâche vers sa queue), fanout pour diffuser un événement à tout le monde (invalidation de cache), topic pour du routage par motifs (`order.*` pour tous les événements commande, `#.error` pour toutes les erreurs, quelle que soit la source).

**« Que se passe-t-il si le consumer crashe au milieu du traitement ? »** — Avec ack manuel : le broker détecte la fermeture du canal, remet le message en queue (flag redelivered) et un autre consumer le reprend — rien n'est perdu, mais le traitement a pu être partiellement appliqué, d'où l'exigence d'idempotence. Avec auto-ack : le message est perdu, point.

**« At-least-once : quel problème ça pose et comment tu le gères ? »** — Des doublons. On rend le consumer idempotent : déduplication par identifiant de message stocké avec contrainte unique, ou opérations idempotentes par nature. On ne « règle » pas les doublons côté broker — c'est une responsabilité applicative.

**« RabbitMQ ou Kafka pour ce use case ? »** — La question ouverte classique. Grille de lecture : besoin de rejouer l'historique, très haut débit, plusieurs équipes lisant le même flux d'événements → Kafka. Distribution de tâches, routage fin, TTL, priorités, latence faible sur volumes modérés → RabbitMQ. Bonus : dire que les deux coexistent souvent dans une même stack.

## Pièges & idées reçues

- **Auto-ack en production** : séduisant (plus simple, plus rapide), mais tout crash consumer = messages perdus silencieusement. L'ack manuel après traitement est le réglage par défaut raisonnable.
- **Queue durable ≠ messages persistants** : il faut les deux — queue déclarée durable *et* messages publiés en persistent — sinon un redémarrage du broker efface tout.
- **Queue qui enfle sans limite** : si les consumers sont durablement plus lents que les producteurs, la queue grossit jusqu'à saturer la mémoire puis le disque du broker. Monitorer la profondeur des queues, poser TTL et max-length avec un DLX.
- **Croire à l'exactly-once magique** : aucune option du broker ne l'offre de bout en bout ; la vraie réponse est at-least-once + idempotence applicative.
- **Message empoisonné sans DLQ** : rejeté avec requeue, il revient immédiatement en tête de queue, refait crasher le consumer, revient… boucle infinie qui bloque tout. DLQ + compteur de tentatives obligatoires.
- **Faire du RPC partout par-dessus la queue** : on cumule la latence du broker *et* le couplage du synchrone. Si A a besoin de la réponse de B immédiatement, un appel HTTP/gRPC direct est souvent plus honnête.

## Pour aller plus loin

- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials) : les six tutoriels officiels (work queues, pub/sub, routing, topics, RPC) — le meilleur point d'entrée, code à l'appui
- [AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts) : exchanges, bindings, acks — le modèle en détail
- [Reliability Guide](https://www.rabbitmq.com/docs/reliability) : confirms, acks, durabilité — la page à lire avant la prod
- [Kafka — Introduction](https://kafka.apache.org/intro) : comprendre le modèle log pour bien contraster avec la queue
