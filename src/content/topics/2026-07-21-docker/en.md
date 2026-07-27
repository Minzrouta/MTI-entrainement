---
title: "Docker & containerization"
date: "2026-07-21"
category: "DevOps"
level: "Fondamental"
summary: "Images, containers, volumes, networks: understand what Docker actually does (and what it isn't) — the most common DevOps topic in internship interviews."
---

## The essentials

Docker is a **containerization** tool: it packages an application together with all its dependencies (runtime, libraries, config) into a standardized unit — the container — that runs identically on any machine with a container engine. It's the answer to the classic "works on my machine".

Unlike a virtual machine, a container **does not virtualize hardware and does not ship a kernel**: all containers share the host's Linux kernel. A container is just a regular process, isolated by kernel mechanisms.

| | Virtual machine | Container |
|---|---|---|
| Virtualizes | Hardware (hypervisor) | Nothing: an isolated process |
| Kernel | Its own, complete | The host's, shared |
| Startup | Minutes | Milliseconds |
| Footprint | GBs of RAM | A few MB |
| Isolation | Strong (hardware boundary) | Lighter (namespaces) |

## How it works

Three Linux kernel building blocks do all the work:

- **Namespaces** — isolate what the process *sees*: PID (process tree), NET (network interfaces), MNT (mount points), UTS (hostname), IPC, USER. The container believes it's alone on the machine.
- **Cgroups** — limit what the process *consumes*: CPU, RAM, I/O. This is what makes `--memory=512m` possible.
- **Union filesystem** (OverlayFS) — images are made of stacked **read-only layers**; the container adds a thin writable layer on top. Two containers from the same image share every layer: that's why images are so cheap to run.

The whole lifecycle fits in one diagram:

```text
Dockerfile ──build──▶ Image (RO layers) ──run──▶ Container (+ RW layer)
                        │      ▲
                   push │      │ pull
                        ▼      │
                    Registry (Docker Hub, GHCR, private…)
```

The image is **immutable** (versioned by tag and digest), the container is **ephemeral**. Architecture: the `docker` CLI talks to a daemon (`dockerd`) over a REST API; the daemon delegates execution to `containerd` then `runc` (the OCI standard). That's why Kubernetes can use containerd without Docker.

> 🎤 **In an interview** — the winning combo: explain namespaces + cgroups in thirty seconds, then naturally follow with "and that's why a container starts in milliseconds where a VM takes minutes". You've just shown the *why* behind the *what*.

## Key concepts to master

- **Image vs container**: the image is the frozen template (a class), the container the live instance (an object). You never patch a running image — you rebuild it.
- **Volumes & bind mounts**: the writable layer dies with the container. Any persistent data (database, uploads) lives in a Docker-managed **volume** or a **bind mount** to the host.
- **Networks**: a `bridge` network by default; containers on the same network reach each other **by name** (internal DNS). `-p 8080:80` publishes a container port on the host.
- **Docker Compose**: describes a multi-container stack (app + DB + cache) in declarative YAML. `docker compose up -d` and everything starts in the right order, on a shared network.
- **Multi-stage builds**: compile in a heavy image (SDK), copy the artifact into a minimal runtime image. Smaller final image with no build tools = reduced attack surface.
- **Build cache**: each Dockerfile instruction creates a cached layer, invalidated as soon as an instruction changes. Hence the rule: least-changing instructions first (dependencies before source code).

Both combined in a typical Node Dockerfile:

```dockerfile
# --- Stage 1: build, with the full SDK ---
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./     # dependencies first → cached layer
RUN npm ci
COPY . .                  # code last: only it invalidates the following layers
RUN npm run build

# --- Stage 2: minimal runtime, no build tools ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node                 # never root in production
CMD ["node", "dist/server.js"]
```

> 💡 **Reflex to show** — if asked "why copy `package.json` before the rest?", the answer is one word: cache. As long as dependencies don't change, `npm ci` never runs again.

## In an interview

**"What's the difference between a container and a VM?"** — A VM virtualizes hardware and ships a full OS with its own kernel (hypervisor); a container is an isolated process sharing the host kernel (namespaces + cgroups). VM = strong isolation, minutes to boot, GBs of RAM. Container = lighter isolation, ms to start, MBs. Bonus: mention they combine (cloud Kubernetes nodes are VMs).

**"What happens when you run `docker run nginx`?"** — The daemon looks for the image locally, otherwise pulls it from the registry layer by layer; it creates the container's writable layer, namespaces and cgroups, attaches it to the bridge network, then starts the process defined by `ENTRYPOINT`/`CMD`. The container's PID 1 is that process; if it dies, the container stops.

**"How do you persist a database's data in a container?"** — Named volume mounted on the data directory (`-v pgdata:/var/lib/postgresql/data`). Never in the writable layer. Mention backup: the volume outlives the container and is backed up independently.

**"How do you shrink an image?"** — Minimal base image (alpine, distroless), multi-stage build, `.dockerignore`, merge `RUN` steps that install then clean up, don't ship dev dependencies.

**"CMD vs ENTRYPOINT?"** — `ENTRYPOINT` = the fixed executable; `CMD` = its default arguments, overridable on the command line. They combine: `ENTRYPOINT ["node"]` + `CMD ["server.js"]`.

## Pitfalls & misconceptions

> ⚠️ **Real-world trap** — Docker publishes ports **bypassing the UFW firewall**: `-p 0.0.0.0:5432:5432` exposes your database to the Internet even if UFW blocks it (Docker's iptables rules come first). Bind to `127.0.0.1:5432:5432` for local-only services. Check with `ss -tlnp`, never with `ufw status` alone.

- **"Docker isolates as much as a VM"** — no: shared kernel, so a kernel vulnerability can reach the host. Never run `--privileged` without a reason, avoid root inside the container (`USER node`).
- **`latest` is not "the latest version"** — it's just a mutable default tag. In production: explicit version tag, ideally a digest.
- **One container = one process**: no SSH or supervisor inside the container; logs go to stdout/stderr (collected by `docker logs`).
- Forgetting `.dockerignore` → the build context ships `node_modules` and `.git`: slow builds and bloated images.

## Going further

- [Docker — Get started](https://docs.docker.com/get-started/) and the [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [OCI — Open Container Initiative](https://opencontainers.org/): the specs standardizing images and runtimes
- Play with `docker run -it --rm alpine sh`, then look at `ls /proc/1/ns/` to see namespaces first-hand
- Natural next step: orchestration (Kubernetes, upcoming topic)
