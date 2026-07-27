---
title: "Kubernetes : l'orchestration expliquée"
date: "2026-08-14"
category: "DevOps"
level: "Avancé"
summary: "Control plane, Pods, Deployments, Services, boucle de réconciliation : comprendre ce que K8s automatise vraiment — et savoir dire en entretien quand il est overkill."
---

## L'essentiel

Kubernetes (K8s) est un **orchestrateur de conteneurs** : il gère le cycle de vie de conteneurs répartis sur un **cluster** de machines. Docker Compose démarre une stack sur une machine ; Kubernetes répond aux questions qui arrivent après : que se passe-t-il si un conteneur crashe à 3h du matin ? Si la machine meurt ? S'il faut passer de 3 à 30 réplicas pendant un pic ? Comment déployer une nouvelle version sans coupure ?

Son cœur, c'est le **modèle déclaratif** : on ne dit pas à K8s *quoi faire* mais *l'état désiré* (« je veux 3 réplicas de cette image, joignables sur ce port »), en YAML. Des **controllers** comparent en permanence l'état réel à l'état désiré et corrigent l'écart : c'est la **boucle de réconciliation**. Un Pod meurt → un autre est recréé automatiquement (**self-healing**), sans intervention humaine. Le scaling est une modification d'un champ (`replicas: 10`), le rolling update un changement de tag d'image.

> 🎤 **En entretien** — savoir dire quand K8s est **overkill** est un signe de maturité : il résout des problèmes de **flotte et d'échelle**. Un service et une base sur un seul serveur ? Un VPS + Docker Compose (ou un PaaS type Coolify) fait le travail avec 10 % de la complexité. K8s se justifie avec plusieurs services, plusieurs machines, des besoins de scaling/HA réels — ou une équipe plateforme pour l'opérer.

## Comment ça marche

Un cluster a deux moitiés :

**Le control plane** (le cerveau) :
- **kube-apiserver** — le point d'entrée unique : `kubectl`, les controllers et les kubelets passent tous par son API REST. Il valide et persiste les objets.
- **etcd** — la base clé-valeur distribuée qui stocke **tout l'état du cluster**. Perdre etcd sans backup = perdre le cluster.
- **kube-scheduler** — décide **sur quel node** placer chaque nouveau Pod (ressources demandées, affinités, taints/tolerations). Il décide, il n'exécute pas.
- **controller manager** — fait tourner les boucles de réconciliation (Deployment, ReplicaSet, Node…) qui rapprochent le réel du désiré.

**Les worker nodes** (les bras) :
- **kubelet** — l'agent sur chaque node : il surveille l'API server, lance les conteneurs des Pods qui lui sont assignés via le container runtime (containerd — pas le démon Docker), et remonte leur état.
- **kube-proxy** — programme les règles réseau (iptables/IPVS) pour que les Services routent le trafic vers les bons Pods.

```text
        CONTROL PLANE (le cerveau)
 ┌────────────────────────────────────┐
 │ kube-apiserver ◀───────▶ etcd      │
 │    ▲          ▲                    │
 │ scheduler    controller manager    │
 └─────▲──────────────▲───────────────┘
       │ watch        │ watch
 ┌─────┴───────┐ ┌────┴────────┐
 │ kubelet     │ │ kubelet     │
 │ kube-proxy  │ │ kube-proxy  │
 │ [Pod] [Pod] │ │ [Pod] [Pod] │
 │   node 1    │ │   node 2    │
 └─────────────┘ └─────────────┘
        WORKER NODES (les bras)
```

Le flux d'un `kubectl apply -f deployment.yaml` : l'API server valide et écrit dans etcd → le Deployment controller crée un **ReplicaSet** → le ReplicaSet crée les objets Pod → le scheduler leur assigne un node → le kubelet du node lance les conteneurs. Chaque acteur ne regarde que l'API server : c'est ce découplage qui rend le système résilient.

Le manifest minimal que cette chaîne consomme :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3                     # l'état désiré, pas une commande
  selector:
    matchLabels: { app: api }     # les Pods que ce Deployment gère
  template:                       # modèle des Pods à créer
    metadata:
      labels: { app: api }        # doit matcher le selector
    spec:
      containers:
        - name: api
          image: registry.io/api:1.4.2  # tag immuable, jamais latest
          resources:
            requests: { cpu: 100m, memory: 128Mi }  # pour le scheduler
            limits: { memory: 256Mi }   # dépassé → OOMKilled
```

## Concepts clés à maîtriser

- **Pod** — la plus petite unité déployable : un ou plusieurs conteneurs qui partagent réseau (même IP) et volumes. Éphémère par conception : on ne crée quasi jamais un Pod nu, on passe par un Deployment.
- **Deployment → ReplicaSet → Pods** — le Deployment gère les versions et les **rolling updates** (montée progressive du nouveau ReplicaSet, descente de l'ancien, rollback possible) ; le ReplicaSet maintient le nombre de réplicas.
- **Service** — une IP virtuelle stable + un nom DNS devant des Pods éphémères, sélectionnés par **labels**.
- **Ingress** — le reverse proxy HTTP du cluster : routage par host/path (`api.exemple.com` → service api), terminaison TLS, un seul point d'entrée pour N services. Nécessite un Ingress controller (nginx, Traefik).

Les quatre façons d'exposer un service, comparées :

| | Portée | Usage typique |
|---|---|---|
| **ClusterIP** | Interne au cluster (défaut) | Trafic service → service |
| **NodePort** | Port (30000+) ouvert sur chaque node | Test, on-prem sans load balancer |
| **LoadBalancer** | IP publique cloud, une par service | Exposition directe (coûteuse) |
| **Ingress** | Routage HTTP host/path + TLS | Un point d'entrée pour N services |

- **ConfigMap & Secret** — la config hors de l'image, injectée en variables d'environnement ou en fichiers montés (voir le piège Secrets plus bas).
- **Requests & limits** — `requests` = ressources garanties, utilisées par le scheduler pour placer le Pod ; `limits` = plafond (CPU throttlé au-delà, RAM dépassée → **OOMKilled**). Sans requests, le scheduler place à l'aveugle ; sans limits, un Pod peut affamer le node.
- **Probes** — **liveness** (« le process est-il vivant ? » : échec → restart du conteneur) et **readiness** (« peut-il recevoir du trafic ? » : échec → retiré des endpoints du Service, sans restart).

> 💡 **Réflexe probes** — la liveness ne doit tester que le process lui-même, jamais une dépendance externe : une liveness qui ping la DB fait redémarrer l'app en boucle dès que la DB tousse. C'est la readiness qui peut attendre une dépendance.

## En entretien

**« Qu'apporte Kubernetes par rapport à Docker Compose ? »** — Compose démarre une stack sur une machine et s'arrête là. K8s ajoute : multi-machines, boucle de réconciliation (self-healing : Pod ou node mort → recréation automatique), scaling déclaratif, rolling updates avec rollback, service discovery et load balancing intégrés. Le prix : une complexité opérationnelle d'un autre ordre.

**« Explique le modèle déclaratif. »** — On décrit l'état désiré dans des manifests YAML, stockés dans etcd ; des controllers comparent en boucle l'état observé à l'état désiré et agissent pour combler l'écart. Conséquence : idempotence (`kubectl apply` rejouable), auto-réparation, et le YAML versionné dans Git devient la source de vérité (base du GitOps).

**« Que se passe-t-il quand tu appliques un Deployment ? »** — API server → etcd → Deployment controller crée un ReplicaSet → qui crée les Pods → le scheduler choisit les nodes → les kubelets lancent les conteneurs → kube-proxy et les Services rendent le tout joignable. Dérouler cette chaîne calmement fait très bonne impression.

**« ClusterIP, NodePort, LoadBalancer : quand utiliser quoi ? »** — dérouler le tableau plus haut, puis donner le pattern qui fait mouche : une IP LoadBalancer par service coûte cher, donc en pratique un seul LoadBalancer devant un Ingress qui route vers N services ClusterIP.

**« Liveness vs readiness probe ? »** — Liveness : détecte un process bloqué, échec = restart. Readiness : détecte un Pod pas prêt (démarrage, dépendance lente), échec = retiré du load balancing, pas de restart. Erreur classique à citer : mettre une dépendance externe dans la liveness → cascade de restarts inutiles.

## Pièges & idées reçues

> ⚠️ **Les Secrets ne sont pas chiffrés** — base64 se décode en une commande. Sans encryption at rest d'etcd et RBAC strict, un Secret n'est qu'un ConfigMap déguisé. En pratique : Vault, External Secrets ou les secrets du cloud provider.

- **« Il nous faut du Kubernetes »** — souvent faux : sans multi-services, multi-machines ni besoins de scaling/HA réels, Compose + systemd ou un PaaS suffisent (voir le callout plus haut).
- **`latest` en prod** — combiné à `imagePullPolicy`, on ne sait plus quelle version tourne où, et un rollback devient impossible. Toujours un tag immuable (SHA du commit, version).
- **Pas de requests/limits** — scheduling à l'aveugle, un Pod gourmand affame les autres, et les Pods sans requests sont les premiers évincés sous pression mémoire.
- **Confondre les probes** (voir le réflexe plus haut) — la liveness ne teste que le process lui-même.
- **Traiter les Pods comme des serveurs** — pas de `kubectl exec` pour patcher en prod : les Pods sont remplaçables à tout instant. Toute modification passe par l'image ou les manifests.

## Pour aller plus loin

- [Kubernetes — Concepts](https://kubernetes.io/docs/concepts/) : la doc officielle, en particulier [Workloads](https://kubernetes.io/docs/concepts/workloads/) et [Services & networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Le tutoriel officiel « Kubernetes Basics »](https://kubernetes.io/docs/tutorials/kubernetes-basics/) — interactif, ~1h
- Pratiquer en local avec [kind](https://kind.sigs.k8s.io/) ou [minikube](https://minikube.sigs.k8s.io/docs/) : déployer un Deployment + Service + Ingress, tuer un Pod avec `kubectl delete pod` et regarder la réconciliation le recréer
- « [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) » (Kelsey Hightower) pour démonter le moteur pièce par pièce
