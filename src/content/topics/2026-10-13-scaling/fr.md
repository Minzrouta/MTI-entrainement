---
title: "Scaler une app : reverse proxy, load balancing & haute dispo"
date: "2026-10-13"
category: "Architecture"
level: "Avancé"
summary: "Vertical vs horizontal, stateless, nginx, health checks, failover : comment une app encaisse la charge et survit aux pannes — le sujet d'architecture qui distingue les candidats en entretien."
---

## L'essentiel

Scaler, c'est répondre à deux questions distinctes qu'on confond souvent : **encaisser plus de trafic** (performance) et **survivre aux pannes** (haute disponibilité). Les deux se résolvent avec les mêmes briques : un reverse proxy devant, plusieurs instances derrière, et la chasse méthodique aux points uniques de défaillance.

Deux stratégies de scaling :

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Principe | Une machine plus grosse (CPU, RAM) | Plus de machines identiques |
| Effort | Zéro changement de code | Stateless requis + load balancer |
| Limite | Plafond matériel, prix exponentiel | Quasi illimité |
| Dispo | SPOF inchangé : une seule machine | La panne d'une instance est absorbée |
| Déploiement | Souvent un redémarrage | Rolling deploy sans coupure |

Le vertical d'abord : c'est la solution la plus simple et souvent suffisante. L'horizontal quand on a besoin de disponibilité (plusieurs instances = tolérance de panne) ou qu'on approche le plafond d'une machine.

> 💡 **L'honnêteté qui marque des points** — un VPS correct (8 vCPU, 16 Go) encaisse des milliers de requêtes/seconde sur une app bien écrite : Stack Overflow a longtemps servi sa planète depuis une poignée de serveurs. En entretien, dire « je commence par un monolithe sur une machine, je mesure, et je scale quand les chiffres le demandent » vaut mieux que dessiner Kubernetes au tableau pour 200 utilisateurs.

## Comment ça marche

Le **prérequis absolu du scaling horizontal : le stateless**. Si l'instance A stocke la session de l'utilisateur en mémoire, la requête suivante routée vers B le déconnecte. Tout état partagé sort donc du processus : sessions dans Redis (ou JWT signé côté client), uploads dans un object storage (S3), la vérité en base. Test simple : une instance doit pouvoir mourir à tout instant sans qu'aucun utilisateur ne le remarque.

L'architecture cible :

```text
            ┌─────────────┐
Internet ──▶│  LB / nginx │  TLS, gzip, health checks
            └──────┬──────┘
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌──────┐   ┌──────┐   ┌──────┐
    │ app1 │   │ app2 │   │ app3 │   (stateless)
    └───┬──┘   └───┬──┘   └───┬──┘
        └──────────┼──────────┘
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌───────────┐      ┌────────────┐
   │   Redis   │      │ PG primary │──▶ replica
   │ (sessions)│      └────────────┘
   └───────────┘
```

**Le reverse proxy** (nginx, Traefik, Caddy, HAProxy) est la porte d'entrée unique, et il fait bien plus que transmettre :

- **TLS termination** : le HTTPS s'arrête au proxy, les instances parlent HTTP en interne — un seul endroit où gérer les certificats (Let's Encrypt).
- **Compression** (gzip/brotli), cache du statique, en-têtes (`X-Forwarded-For` pour conserver l'IP réelle du client).
- **Routing** : `api.exemple.com` → backend, `/static` → fichiers. C'est exactement le rôle de Traefik dans Coolify : un proxy, N apps derrière.

**Le load balancer** est un reverse proxy qui distribue vers N instances. Algorithmes à connaître : **round-robin** (chacun son tour, le défaut), **least-connections** (vers l'instance la moins chargée — meilleur quand les requêtes ont des durées inégales), hash d'IP (même client → même instance). Et surtout les **health checks** : le LB sonde chaque instance et sort du pool celles qui ne répondent plus. C'est lui qui transforme « une instance est morte » en « personne ne l'a remarqué ».

```nginx
upstream app {
    least_conn;                       # vers l'instance la moins chargée
    server 10.0.0.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:3000 max_fails=3 fail_timeout=30s;
    # 3 échecs consécutifs → l'instance sort du pool pendant 30 s
}

server {
    listen 443 ssl http2;
    server_name app.exemple.com;
    ssl_certificate     /etc/letsencrypt/live/app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app/privkey.pem;
    gzip on;                          # compression au proxy, pas dans l'app

    location / {
        proxy_pass http://app;        # → l'upstream défini plus haut
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  # l'app sait qu'on est en HTTPS
    }
}
```

**Sticky sessions** : le LB colle un client à une instance donnée (via cookie). C'est une béquille pour apps stateful, à éviter : la charge se répartit mal, et la mort d'une instance déconnecte d'un coup tous ses clients. La vraie solution est de rendre l'app stateless — les sticky sessions ne servent qu'à gagner du temps sur du legacy.

## Concepts clés à maîtriser

- **SPOF (single point of failure)** : tout composant unique dont la panne emporte le système. On les traque étage par étage : 1 instance → N instances ; 1 DB → primary + replica ; 1 LB → 2 LB avec IP flottante (keepalived/VRRP) ou failover DNS. La haute dispo se vérifie composant par composant, jamais globalement.
- **Réplication de la base** : le primary encaisse les écritures et streame ses changements vers des **replicas** qui servent les lectures (la majorité du trafic). Attention au **replication lag** : une lecture sur replica juste après une écriture peut renvoyer l'ancien état.
- **Failover** : promotion d'un replica en primary quand le primary meurt. Automatisé (Patroni pour PostgreSQL) ou manuel — toujours plus délicat qu'il n'y paraît : si l'ancien primary revient sans savoir qu'il a été remplacé, on obtient un **split-brain** (deux serveurs qui acceptent des écritures).
- **CDN** : le statique (images, JS, CSS) servi depuis des points de présence proches des utilisateurs (Cloudflare, CloudFront). Décharge l'origine de la majorité des requêtes et écrase la latence mondiale. Premier réflexe de scaling pour un site à fort contenu statique.
- **Serverless** (en survol) : l'extrême du scaling horizontal — la plateforme (Lambda, Cloud Run) instancie la fonction à la demande, de zéro à des milliers. Contreparties : cold starts, coût élevé en charge soutenue, lock-in. Excellent pour des charges en pics, pas une fin en soi.
- **Mesurer avant de scaler** : le goulot réel est rarement où on croit — souvent une requête SQL sans index bien avant le CPU. Load testing (k6, wrk), métriques (APM), puis on scale ce qui sature. Doubler les instances ne répare pas une requête N+1.

> 🎤 **En entretien** — « Ton app tombe en prod, par où tu commences ? » Réponse structurée : 1) constater et communiquer ; 2) lire la stack du haut vers le bas — le LB (taux de 5xx ? combien d'instances encore dans le pool ?), les instances (CPU, RAM, OOM kill ?), la base (connexions saturées ? requête lente ?) ; 3) mitiger d'abord (rollback du dernier déploiement, redémarrage, scale up), comprendre ensuite (post-mortem). Le réflexe « le dernier changement déployé est le suspect n°1 » montre de l'expérience réelle.

## En entretien

**« Vertical ou horizontal : comment tu choisis ? »** — Vertical d'abord : zéro complexité, on grossit la machine, et ça suffit très longtemps. Horizontal quand on veut de la haute dispo (N instances = tolérance de panne) ou qu'on approche le plafond d'une machine. Le point clé à placer : l'horizontal exige le stateless — c'est un travail sur l'app avant d'être un travail d'infra.

**« Pourquoi le stateless est-il indispensable au scaling horizontal ? »** — Parce que le LB route chaque requête vers n'importe quelle instance : un état gardé en mémoire locale (session, cache, fichier uploadé) devient invisible pour les autres. On externalise tout : sessions dans Redis ou JWT, fichiers dans un object storage, vérité en base. Le test : « puis-je tuer n'importe quelle instance à tout instant sans impact utilisateur ? »

**« Reverse proxy et load balancer, c'est pareil ? »** — Un load balancer est un reverse proxy avec plusieurs backends. Le reverse proxy est la porte d'entrée : TLS termination, compression, routing, cache. Il devient load balancer dès qu'il distribue sur un pool avec un algorithme et des health checks. nginx, Traefik et HAProxy jouent les deux rôles.

**« Round-robin ou least-connections ? »** — Round-robin distribue équitablement en nombre de requêtes : parfait si elles se valent. Least-connections vise l'instance la moins occupée : meilleur quand les durées varient (un gros export ne bloque pas la file derrière lui). Dans les deux cas, les health checks sont non négociables : distribuer vers une instance morte, c'est distribuer des erreurs.

**« Comment tu rends une base de données hautement disponible ? »** — Réplication primary → replicas : les lectures se répartissent sur les replicas, et le failover promeut un replica si le primary tombe. À mentionner pour marquer des points : le replication lag (lecture obsolète juste après une écriture) et la difficulté du failover automatique (split-brain). La DB est le composant le plus dur à scaler — d'où la règle « stateless partout, l'état concentré dans la base ».

## Pièges & idées reçues

> ⚠️ **Sur-architecturer, le piège n°1** — monter Kubernetes, trois microservices et une queue pour une app à 50 utilisateurs, c'est payer aujourd'hui (complexité, ops, temps de dev) pour un problème hypothétique. La progression saine : monolithe propre → VPS costaud → LB + 2-3 instances → et seulement là, la suite. Chaque étage se franchit quand les mesures le demandent, pas par anticipation.

- **« Le load balancer suffit pour la haute dispo »** — non : si la base est unique, le SPOF a juste changé d'étage. Et un seul LB devant dix instances reste un SPOF. La HA se vérifie maillon par maillon.
- **Sticky sessions comme « solution » au state** : un pansement qui casse la répartition de charge et transforme chaque panne d'instance en déconnexions massives.
- **Oublier le replication lag** : lire sur un replica juste après avoir écrit sur le primary peut renvoyer l'ancien état. Les lectures critiques (« read your own writes ») vont sur le primary.
- **Scaler sans mesurer** : doubler les instances ne sert à rien si le goulot est une requête sans index ou un pool de connexions saturé. Mesurer, puis scaler ce qui sature.
- **Confondre scaling et performance** : optimiser une app lente (cache, index, requêtes) est presque toujours moins cher que multiplier les machines qui exécutent du code lent.

## Pour aller plus loin

- [nginx — Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html) — la référence, lisible en quinze minutes
- [The Twelve-Factor App](https://12factor.net/) — les facteurs VI (processes) et VIII (concurrency) formalisent le stateless
- [Traefik documentation](https://doc.traefik.io/traefik/) — le reverse proxy « cloud-native » : routing par labels, Let's Encrypt automatique
- *Designing Data-Intensive Applications* (Martin Kleppmann) — le chapitre 5 sur la réplication : la bible de l'architecture distribuée
- [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) — clair et illustré
