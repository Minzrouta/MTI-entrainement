---
title: "Docker & la conteneurisation"
date: "2026-07-27"
category: "DevOps"
level: "Fondamental"
summary: "Images, conteneurs, volumes, réseaux : comprendre ce que Docker fait vraiment (et ce qu'il n'est pas) — le sujet DevOps le plus fréquent en entretien de stage."
---

## L'essentiel

Docker est un outil de **conteneurisation** : il permet d'empaqueter une application avec toutes ses dépendances (runtime, bibliothèques, config) dans une unité standardisée — le conteneur — qui s'exécute de façon identique sur n'importe quelle machine équipée d'un moteur de conteneurs. C'est la réponse au classique « ça marche sur ma machine ».

Contrairement à une machine virtuelle, un conteneur **ne virtualise pas de matériel et n'embarque pas de noyau** : tous les conteneurs partagent le noyau Linux de l'hôte. Un conteneur n'est qu'un processus ordinaire, isolé par des mécanismes du noyau.

| | Machine virtuelle | Conteneur |
|---|---|---|
| Virtualise | Du matériel (hyperviseur) | Rien : un processus isolé |
| Noyau | Le sien, complet | Celui de l'hôte, partagé |
| Démarrage | Minutes | Millisecondes |
| Empreinte | Go de RAM | Quelques Mo |
| Isolation | Forte (frontière matérielle) | Plus légère (namespaces) |

## Comment ça marche

Trois briques du noyau Linux font tout le travail :

- **Namespaces** — isolent ce que le processus *voit* : PID (arbre de processus), NET (interfaces réseau), MNT (points de montage), UTS (hostname), IPC, USER. Le conteneur croit être seul sur la machine.
- **Cgroups** — limitent ce que le processus *consomme* : CPU, RAM, I/O. C'est ce qui permet de dire `--memory=512m`.
- **Union filesystem** (OverlayFS) — les images sont constituées de **couches en lecture seule** empilées ; le conteneur ajoute une fine couche accessible en écriture au sommet. Deux conteneurs issus de la même image partagent toutes les couches : c'est ce qui rend les images si économes.

Le cycle de vie complet tient dans un schéma :

```text
Dockerfile ──build──▶ Image (couches RO) ──run──▶ Conteneur (+ couche RW)
                        │      ▲
                   push │      │ pull
                        ▼      │
                    Registry (Docker Hub, GHCR, privé…)
```

L'image est **immuable** (versionnée par tag et par digest), le conteneur est **éphémère**. Architecture : le CLI `docker` parle à un démon (`dockerd`) via une API REST ; le démon délègue l'exécution à `containerd` puis `runc` (le standard OCI). C'est pour ça que Kubernetes peut utiliser containerd sans Docker.

> 🎤 **En entretien** — le combo gagnant : expliquer namespaces + cgroups en trente secondes, puis enchaîner naturellement sur « et c'est pour ça qu'un conteneur démarre en millisecondes là où une VM met des minutes ». Vous venez de montrer le *pourquoi* derrière le *quoi*.

## Concepts clés à maîtriser

- **Image vs conteneur** : l'image est le modèle figé (une classe), le conteneur l'instance vivante (un objet). On ne modifie jamais une image en marche, on la reconstruit.
- **Volumes & bind mounts** : la couche d'écriture disparaît avec le conteneur. Toute donnée persistante (base de données, uploads) vit dans un **volume** géré par Docker ou un **bind mount** vers l'hôte.
- **Réseaux** : par défaut, un réseau `bridge` ; les conteneurs d'un même réseau se joignent **par nom** (DNS interne). `-p 8080:80` publie un port du conteneur sur l'hôte.
- **Docker Compose** : décrit une stack multi-conteneurs (app + DB + cache) en YAML déclaratif. `docker compose up -d` et tout démarre dans le bon ordre, sur un réseau commun.
- **Multi-stage builds** : on compile dans une image lourde (SDK), on copie l'artefact dans une image minimale (runtime). Image finale plus petite et sans outils de build = surface d'attaque réduite.
- **Cache de build** : chaque instruction du Dockerfile crée une couche mise en cache, invalidée dès qu'une instruction change. D'où la règle : les instructions qui changent le moins souvent en premier (dépendances avant le code source).

Les deux réunis dans un Dockerfile Node typique :

```dockerfile
# --- Étape 1 : build, avec tout le SDK ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./     # les dépendances d'abord → couche mise en cache
RUN npm ci
COPY . .                  # le code ensuite : lui seul invalide les couches suivantes
RUN npm run build

# --- Étape 2 : runtime minimal, sans outils de build ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node                 # jamais root en production
CMD ["node", "dist/server.js"]
```

> 💡 **Réflexe à montrer** — si on vous demande « pourquoi copier `package.json` avant le reste ? », la réponse tient en un mot : le cache. Tant que les dépendances ne changent pas, `npm ci` n'est jamais réexécuté.

## En entretien

**« Quelle différence entre un conteneur et une VM ? »** — La VM virtualise du matériel et embarque un OS complet avec son noyau (hyperviseur) ; le conteneur est un processus isolé qui partage le noyau de l'hôte (namespaces + cgroups). VM = isolation forte, démarrage en minutes, Go de RAM. Conteneur = isolation plus légère, démarrage en ms, Mo. Bonus : mentionner que les deux se combinent (les nœuds Kubernetes cloud sont des VM).

**« Que se passe-t-il quand tu fais `docker run nginx` ? »** — Le démon cherche l'image localement, sinon la télécharge (pull) depuis le registry couche par couche ; il crée la couche d'écriture, les namespaces et cgroups du conteneur, le branche au réseau bridge, puis lance le processus défini par `ENTRYPOINT`/`CMD`. PID 1 du conteneur = ce processus ; s'il meurt, le conteneur s'arrête.

**« Comment persister les données d'une base dans un conteneur ? »** — Volume nommé monté sur le répertoire de données (`-v pgdata:/var/lib/postgresql/data`). Jamais dans la couche d'écriture. Citer la sauvegarde : le volume survit au conteneur, se sauvegarde indépendamment.

**« Comment réduire la taille d'une image ? »** — Image de base minimale (alpine, distroless), multi-stage build, `.dockerignore`, fusionner les `RUN` qui installent puis nettoient, ne pas embarquer les dépendances de dev.

**« CMD vs ENTRYPOINT ? »** — `ENTRYPOINT` = l'exécutable fixe ; `CMD` = ses arguments par défaut, écrasables à la ligne de commande. Les deux se combinent : `ENTRYPOINT ["node"]` + `CMD ["server.js"]`.

## Pièges & idées reçues

> ⚠️ **Piège vécu** — Docker publie ses ports **en contournant le pare-feu UFW** : `-p 0.0.0.0:5432:5432` expose votre base à Internet même si UFW la bloque (les règles iptables de Docker passent avant). Binder sur `127.0.0.1:5432:5432` quand c'est local. Vérifier avec `ss -tlnp`, jamais avec `ufw status` seul.

- **« Docker isole autant qu'une VM »** — non : noyau partagé, donc une faille noyau peut toucher l'hôte. Ne jamais lancer un conteneur en `--privileged` sans raison, éviter root dans le conteneur (`USER node`).
- **`latest` n'est pas « la dernière version »** — c'est juste un tag par défaut, mutable. En prod : tag de version explicite, idéalement un digest.
- **Un conteneur = un processus** : pas de SSH ni de superviseur dans le conteneur ; les logs vont sur stdout/stderr (récupérés par `docker logs`).
- Oublier le `.dockerignore` → le contexte de build embarque `node_modules` et `.git`, builds lents et images obèses.

## Pour aller plus loin

- [Docker — Get started](https://docs.docker.com/get-started/) et le [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [OCI — Open Container Initiative](https://opencontainers.org/) : les specs qui standardisent images et runtimes
- Jouer avec `docker run -it --rm alpine sh`, puis regarder `ls /proc/1/ns/` pour toucher les namespaces du doigt
- Étape suivante naturelle : l'orchestration (Kubernetes, sujet à venir)
