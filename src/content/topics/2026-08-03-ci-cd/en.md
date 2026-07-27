---
title: "CI/CD & deployment automation"
date: "2026-08-03"
category: "DevOps"
level: "Fondamental"
summary: "Pipelines, environments, deployment strategies: knowing how code goes from push to production is a near-guaranteed question in internship interviews."
---

## The essentials

**CI (Continuous Integration)** means integrating the whole team's code continuously: on every push, a server checks out the code, builds it and runs the tests automatically. The goal is **fast feedback** — learning within minutes that a commit breaks something, instead of discovering it the day before the demo during a painful "integration phase".

**CD** covers two practices you must distinguish in an interview. **Continuous Delivery**: every commit that passes the pipeline produces an artifact that is *deployable* in one click — deploying to production remains a human decision. **Continuous Deployment**: that click disappears, and every green commit on the main branch ships to production automatically. The second requires total confidence in your tests; the first is enough for most teams.

Everything rests on one principle: **anything manual will be forgotten or botched on a Friday evening**. We automate to make deployments boring.

## How it works

A typical pipeline runs on every push or pull request, in ordered steps that fail fast:

1. **Lint & static analysis** — the cheapest checks first: formatting, ESLint, typecheck. Failing in 30 seconds beats failing in 10 minutes.
2. **Tests** — unit first, integration next. Parallelizable across several jobs.
3. **Build** — compilation, bundling, building the Docker image.
4. **Artifact** — the build output (image tagged with the commit SHA, binary, bundle) is published to a registry. Golden rule: **build once, deploy that same artifact everywhere** — no rebuilding between staging and production.
5. **Deployment** — automatic to staging, then to production (with or without manual approval, depending on delivery vs deployment).

Tool-wise, GitHub Actions and GitLab CI share the same concepts under similar names. A **workflow** (Actions) or **pipeline** (GitLab) is described in YAML versioned with the code (`.github/workflows/ci.yml`, `.gitlab-ci.yml`). It contains **jobs** — isolated execution units, each on a fresh machine — grouped into **stages** (GitLab) or ordered with `needs` (Actions). Jobs run on **runners**: machines hosted by the platform or self-hosted (useful for GPUs or private networks). Since every job starts from a clean environment, **caching** (node_modules, `~/.cargo`, Docker layers) is what separates a 3-minute pipeline from a 15-minute one.

**Environments** (staging, production) carry their own configuration and **secrets**: stored encrypted on the platform side, injected as environment variables at runtime, masked in logs. Never in the repo, never baked into the Docker image.

## Key concepts to master

- **Delivery vs deployment**: the precise distinction (above) is a classic trick question. The difference fits in one sentence: who presses the button.
- **Rolling deployment**: instances are replaced one by one behind the load balancer. No downtime, but two versions coexist during the transition — code and DB migrations must be backward-compatible.
- **Blue-green**: two full environments; you deploy to the inactive one (green), test it, then switch all traffic at once. Rollback = switch back. Cost: doubling the infrastructure.
- **Canary**: the new version first receives 1-5% of traffic; you watch the metrics (errors, latency) before widening. It's the strategy that best limits the blast radius of a bug.
- **Rollback**: redeploy the previous artifact (immutable, so always available). The real trap is **database migrations**, which are rarely reversible — hence backward-compatible migrations (expand/contract: add the column, migrate, drop the old one later).
- **Trunk-based development + feature flags**: everyone merges to `main` frequently (short-lived branches, < 1-2 days), and unfinished code ships to production *disabled* behind a flag. This separates **deployment** (putting code on servers) from **release** (turning it on for users) — and a flag switches off in seconds, faster than any rollback.

## In an interview

**"What's the difference between continuous delivery and continuous deployment?"** — Delivery: every green commit is deployable, a human decides when to ship to production. Deployment: the production deploy is automatic too, with no intervention. Bonus: point out that full deployment requires tests you genuinely trust, and usually feature flags to decouple release from deployment.

**"Describe the pipeline you would set up for a Node API"** — On every push: lint + typecheck, unit tests, integration tests against a throwaway Postgres, build the Docker image tagged with the SHA, push to the registry. On `main`: auto-deploy to staging, smoke tests, then production with approval. Mention npm caching and fail-fast ordering (lint before tests).

**"Blue-green vs canary — which do you pick?"** — Blue-green: full switch and instant rollback, but doubled infrastructure and a bug hits 100% of traffic at switch time. Canary: gradual exposure, a bug only touches 1-5% of users, but you need good metrics and fine-grained traffic routing. Canary if your observability is up to it, blue-green otherwise.

**"How do you handle secrets in a pipeline?"** — The platform's encrypted secrets (GitHub Environments, GitLab masked and protected CI/CD variables), scoped per environment, injected only at runtime. Never committed, never in an image's build args, never printed — and rotated if a secret ever leaked into a log.

**"A deployment breaks production — what do you do?"** — First, kill the feature flag if the change has one. Otherwise roll back to the previous artifact — possible because it's immutable and the migrations are backward-compatible. Only then: reproduce, fix, and add the test that would have caught the bug.

## Pitfalls & misconceptions

- **Flaky tests**: a test that fails randomly destroys trust in the pipeline — the team starts re-running jobs without reading logs, and a real bug eventually slips through. Automatic retries mask the symptom; the only real answer is fixing or quarantining the test.
- **Slow pipeline**: past ~10 minutes, developers stop waiting for the result, stack up commits and work around the process. Parallelize tests, invest in caching, move heavy jobs off the critical path.
- **Secrets in plain text in logs**: one debugging `echo $DATABASE_URL`, one verbose tool printing its config, and the secret is archived in the job logs. Automatic masking doesn't cover a transformed secret (base64, URL-encoded). A leaked secret gets **revoked**, not deleted from the logs.
- **"CI is just running the tests"** — no: above all it's the practice of integrating *frequently* into a shared branch. A three-week-old branch with a green pipeline is not continuous integration.
- **Rebuilding the image between staging and production**: two builds are never guaranteed identical (dependencies updated in between). You promote the same artifact from one environment to the next.

## Going further

- [GitHub Actions — documentation](https://docs.github.com/en/actions) and [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [Martin Fowler — Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), the reference article
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/): short-lived branches and feature flags, with helpful diagrams
- Hands-on exercise: add a GitHub Actions workflow (lint + tests + Docker build) to one of your projects — the perfect conversation starter in an interview
