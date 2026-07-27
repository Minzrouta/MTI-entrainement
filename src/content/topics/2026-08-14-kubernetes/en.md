---
title: "Kubernetes: orchestration explained"
date: "2026-08-14"
category: "DevOps"
level: "Avancé"
summary: "Control plane, Pods, Deployments, Services, reconciliation loop: understand what K8s really automates — and know how to say in an interview when it's overkill."
---

## The essentials

Kubernetes (K8s) is a **container orchestrator**: it manages the lifecycle of containers spread across a **cluster** of machines. Docker Compose starts a stack on one machine; Kubernetes answers the questions that come next: what happens if a container crashes at 3am? If the machine dies? If you need to go from 3 to 30 replicas during a spike? How do you deploy a new version with zero downtime?

Its core is the **declarative model**: you don't tell K8s *what to do* but *the desired state* ("I want 3 replicas of this image, reachable on this port"), in YAML. **Controllers** continuously compare the actual state to the desired state and correct the gap: that's the **reconciliation loop**. A Pod dies → another is recreated automatically (**self-healing**), with no human intervention. Scaling is a field change (`replicas: 10`), a rolling update is an image tag change.

> 🎤 **In an interview** — knowing when K8s is **overkill** is a sign of maturity: it solves **fleet and scale** problems. One service and one database on a single server? A VPS + Docker Compose (or a PaaS like Coolify) does the job with 10% of the complexity. K8s is justified with multiple services, multiple machines, real scaling/HA needs — or a platform team to operate it.

## How it works

A cluster has two halves:

**The control plane** (the brain):
- **kube-apiserver** — the single entry point: `kubectl`, controllers and kubelets all go through its REST API. It validates and persists objects.
- **etcd** — the distributed key-value store holding **the entire cluster state**. Losing etcd without a backup = losing the cluster.
- **kube-scheduler** — decides **which node** each new Pod lands on (requested resources, affinities, taints/tolerations). It decides; it doesn't execute.
- **controller manager** — runs the reconciliation loops (Deployment, ReplicaSet, Node…) that move actual state toward desired state.

**The worker nodes** (the arms):
- **kubelet** — the agent on each node: it watches the API server, starts the containers of the Pods assigned to it through the container runtime (containerd — not the Docker daemon), and reports their status.
- **kube-proxy** — programs the network rules (iptables/IPVS) so Services route traffic to the right Pods.

```text
        CONTROL PLANE (the brain)
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
        WORKER NODES (the arms)
```

The flow of a `kubectl apply -f deployment.yaml`: the API server validates and writes to etcd → the Deployment controller creates a **ReplicaSet** → the ReplicaSet creates the Pod objects → the scheduler assigns them a node → that node's kubelet starts the containers. Every actor only ever talks to the API server: that decoupling is what makes the system resilient.

The minimal manifest this chain consumes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3                     # desired state, not a command
  selector:
    matchLabels: { app: api }     # which Pods this Deployment manages
  template:                       # template for the Pods to create
    metadata:
      labels: { app: api }        # must match the selector
    spec:
      containers:
        - name: api
          image: registry.io/api:1.4.2  # immutable tag, never latest
          resources:
            requests: { cpu: 100m, memory: 128Mi }  # for the scheduler
            limits: { memory: 256Mi }   # exceeded → OOMKilled
```

## Key concepts to master

- **Pod** — the smallest deployable unit: one or more containers sharing network (same IP) and volumes. Ephemeral by design: you almost never create a bare Pod — you go through a Deployment.
- **Deployment → ReplicaSet → Pods** — the Deployment manages versions and **rolling updates** (new ReplicaSet scaled up progressively, old one scaled down, rollback possible); the ReplicaSet maintains the replica count.
- **Service** — a stable virtual IP + DNS name in front of ephemeral Pods, selected by **labels**.
- **Ingress** — the cluster's HTTP reverse proxy: host/path routing (`api.example.com` → api service), TLS termination, a single entry point for N services. Requires an Ingress controller (nginx, Traefik).

The four ways to expose a service, compared:

| | Scope | Typical use |
|---|---|---|
| **ClusterIP** | Cluster-internal (default) | Service → service traffic |
| **NodePort** | Port (30000+) opened on every node | Testing, on-prem without a load balancer |
| **LoadBalancer** | Public cloud IP, one per service | Direct exposure (expensive) |
| **Ingress** | HTTP host/path routing + TLS | One entry point for N services |

- **ConfigMap & Secret** — config outside the image, injected as environment variables or mounted files (see the Secrets pitfall below).
- **Requests & limits** — `requests` = guaranteed resources, used by the scheduler to place the Pod; `limits` = ceiling (CPU throttled beyond it, RAM exceeded → **OOMKilled**). Without requests, the scheduler places blindly; without limits, one Pod can starve the node.
- **Probes** — **liveness** ("is the process alive?": failure → container restart) and **readiness** ("can it receive traffic?": failure → removed from the Service's endpoints, no restart).

> 💡 **Probe reflex** — liveness must only test the process itself, never an external dependency: a liveness probe that pings the DB restarts the app in a loop whenever the DB hiccups. Readiness is the one allowed to wait for a dependency.

## In an interview

**"What does Kubernetes bring over Docker Compose?"** — Compose starts a stack on one machine and stops there. K8s adds: multi-machine, a reconciliation loop (self-healing: dead Pod or node → automatic recreation), declarative scaling, rolling updates with rollback, built-in service discovery and load balancing. The price: operational complexity of a different order.

**"Explain the declarative model."** — You describe the desired state in YAML manifests, stored in etcd; controllers continuously compare observed state to desired state and act to close the gap. Consequences: idempotence (`kubectl apply` can be replayed), self-repair, and version-controlled YAML in Git becomes the source of truth (the basis of GitOps).

**"What happens when you apply a Deployment?"** — API server → etcd → the Deployment controller creates a ReplicaSet → which creates the Pods → the scheduler picks the nodes → the kubelets start the containers → kube-proxy and Services make it all reachable. Walking calmly through this chain makes a very good impression.

**"ClusterIP, NodePort, LoadBalancer: when to use which?"** — walk through the table above, then land the pattern that impresses: one LoadBalancer IP per service gets expensive, so in practice a single LoadBalancer sits in front of an Ingress routing to N ClusterIP services.

**"Liveness vs readiness probe?"** — Liveness: detects a stuck process, failure = restart. Readiness: detects a Pod that isn't ready (starting up, slow dependency), failure = removed from load balancing, no restart. Classic mistake to cite: putting an external dependency in the liveness probe → a cascade of pointless restarts.

## Pitfalls & misconceptions

> ⚠️ **Secrets are not encrypted** — base64 decodes in one command. Without etcd encryption at rest and strict RBAC, a Secret is just a ConfigMap in disguise. In practice: Vault, External Secrets, or cloud provider secrets.

- **"We need Kubernetes"** — often false: without multiple services, multiple machines or real scaling/HA needs, Compose + systemd or a PaaS is enough (see the callout above).
- **`latest` in production** — combined with `imagePullPolicy`, you no longer know which version runs where, and rollback becomes impossible. Always an immutable tag (commit SHA, version).
- **No requests/limits** — blind scheduling, one greedy Pod starves the others, and Pods without requests are the first evicted under memory pressure.
- **Confusing the probes** (see the reflex above) — liveness only tests the process itself.
- **Treating Pods like servers** — no `kubectl exec` to patch production: Pods are replaceable at any moment. Every change goes through the image or the manifests.

## Going further

- [Kubernetes — Concepts](https://kubernetes.io/docs/concepts/): the official docs, especially [Workloads](https://kubernetes.io/docs/concepts/workloads/) and [Services & networking](https://kubernetes.io/docs/concepts/services-networking/)
- [The official "Kubernetes Basics" tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/) — interactive, ~1h
- Practice locally with [kind](https://kind.sigs.k8s.io/) or [minikube](https://minikube.sigs.k8s.io/docs/): deploy a Deployment + Service + Ingress, kill a Pod with `kubectl delete pod` and watch reconciliation recreate it
- "[Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)" (Kelsey Hightower) to take the engine apart piece by piece
