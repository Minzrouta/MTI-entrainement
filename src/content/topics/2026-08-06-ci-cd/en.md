---
title: "CI/CD & deployment automation"
date: "2026-08-06"
category: "DevOps"
level: "Fondamental"
summary: "Pipelines, environments, deployment strategies: knowing how code goes from push to production is a near-guaranteed question in internship interviews."
---

## The essentials

**CI (Continuous Integration)** means integrating the whole team's code continuously: on every push, a server checks out the code, builds it and runs the tests automatically. The goal is **fast feedback** — learning within minutes that a commit breaks something, instead of discovering it the day before the demo during a painful "integration phase".

**CD** covers two practices you must distinguish in an interview. **Continuous Delivery**: every commit that passes the pipeline produces an artifact that is *deployable* in one click — deploying to production remains a human decision. **Continuous Deployment**: that click disappears, and every green commit on the main branch ships to production automatically. The second requires total confidence in your tests; the first is enough for most teams.

Everything rests on one principle: **anything manual will be forgotten or botched on a Friday evening**. We automate to make deployments boring.

> 🎤 **In an interview** — the recruiter doesn't want theory, they want YOUR pipeline: "on my project X, every push runs lint + tests; a merge to `main` builds the image and deploys it". Three jobs on a personal project beat any buzzword.

## How it works

A typical pipeline runs on every push or pull request, in ordered steps that fail fast:

1. **Lint & static analysis** — the cheapest checks first: formatting, ESLint, typecheck. Failing in 30 seconds beats failing in 10 minutes.
2. **Tests** — unit first, integration next. Parallelizable across several jobs.
3. **Build** — compilation, bundling, building the Docker image.
4. **Artifact** — the build output (image tagged with the commit SHA, binary, bundle) is published to a registry. Golden rule: **build once, deploy that same artifact everywhere** — no rebuilding between staging and production.
5. **Deployment** — automatic to staging, then to production (with or without manual approval, depending on delivery vs deployment).

```text
push
  │
  ▼
lint ──✖ stop (30 s)
  │
  ▼
tests ──✖ stop
  │
  ▼
build ──▶ artifact (image:sha) ──▶ registry
                                      │
                        staging ◀─────┘
                           │  smoke tests
                           ▼
                         prod (approval or auto)
```

Tool-wise, GitHub Actions and GitLab CI share the same concepts under similar names. A **workflow** (Actions) or **pipeline** (GitLab) is described in YAML versioned with the code (`.github/workflows/ci.yml`, `.gitlab-ci.yml`). It contains **jobs** — isolated execution units, each on a fresh machine — grouped into **stages** (GitLab) or ordered with `needs` (Actions). Jobs run on **runners**: machines hosted by the platform or self-hosted (useful for GPUs or private networks). Since every job starts from a clean environment, **caching** (node_modules, `~/.cargo`, Docker layers) is what separates a 3-minute pipeline from a 15-minute one.

The same concepts, for real, in a minimal Actions workflow:

```yaml
name: ci
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest          # GitHub-hosted runner
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }  # the cache that changes everything
      - run: npm ci
      - run: npm run lint           # cheapest first (fail fast)
      - run: npm test

  build:
    needs: test                     # only runs if `test` is green
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # tagged with the SHA: the SAME artifact goes to staging and prod
      - run: docker build -t ghcr.io/org/api:${{ github.sha }} .
      - run: docker push ghcr.io/org/api:${{ github.sha }}
        env:
          GH_TOKEN: ${{ secrets.GHCR_TOKEN }}   # encrypted platform-side
```

> 💡 **Reflex to show** — the SHA tag is not a detail: it's what makes "build once, deploy everywhere" verifiable. `api:3f2c1d9` is bit-for-bit identical in staging and production; `api:latest` guarantees nothing.

**Environments** (staging, production) carry their own configuration and **secrets**: stored encrypted on the platform side, injected as environment variables at runtime, masked in logs. Never in the repo, never baked into the Docker image.

## Key concepts to master

- **Delivery vs deployment**: the precise distinction (above) is a classic trick question. The difference fits in one sentence: who presses the button.
- **Deployment strategies**: three ways to put the new version in front of traffic — the trade-offs fit in one table:

| | Rolling | Blue-green | Canary |
|---|---|---|---|
| Principle | instances replaced one by one | 2 environments, full switch | 1-5% of traffic first |
| Rollback | redeploy the previous artifact | switch back (instant) | kill the canary |
| Infra cost | none | doubled infrastructure | low |
| Bug in prod | spreads as the rollout progresses | 100% of traffic at once | 1-5% of users |
| Prerequisite | backward compatibility (2 versions coexist) | — | solid metrics + fine-grained routing |
- **Rollback**: redeploy the previous artifact (immutable, so always available). The real trap is **database migrations**, which are rarely reversible — hence backward-compatible migrations (expand/contract: add the column, migrate, drop the old one later).
- **Trunk-based development + feature flags**: everyone merges to `main` frequently (short-lived branches, < 1-2 days), and unfinished code ships to production *disabled* behind a flag. This separates **deployment** (putting code on servers) from **release** (turning it on for users) — and a flag switches off in seconds, faster than any rollback.

## In an interview

**"What's the difference between continuous delivery and continuous deployment?"** — Delivery: every green commit is deployable, a human decides when to ship to production. Deployment: the production deploy is automatic too, with no intervention. Bonus: point out that full deployment requires tests you genuinely trust, and usually feature flags to decouple release from deployment.

**"Describe the pipeline you would set up for a Node API"** — On every push: lint + typecheck, unit tests, integration tests against a throwaway Postgres, build the Docker image tagged with the SHA, push to the registry. On `main`: auto-deploy to staging, smoke tests, then production with approval. Mention npm caching and fail-fast ordering (lint before tests).

**"Blue-green vs canary — which do you pick?"** — Blue-green: full switch and instant rollback, but doubled infrastructure and a bug hits 100% of traffic at switch time. Canary: gradual exposure, a bug only touches 1-5% of users, but you need good metrics and fine-grained traffic routing. Canary if your observability is up to it, blue-green otherwise.

**"How do you handle secrets in a pipeline?"** — The platform's encrypted secrets (GitHub Environments, GitLab masked and protected CI/CD variables), scoped per environment, injected only at runtime. Never committed, never in an image's build args, never printed — and rotated if a secret ever leaked into a log.

**"A deployment breaks production — what do you do?"** — First, kill the feature flag if the change has one. Otherwise roll back to the previous artifact — possible because it's immutable and the migrations are backward-compatible. Only then: reproduce, fix, and add the test that would have caught the bug.

## Pitfalls & misconceptions

> ⚠️ **Secrets in logs** — one debugging `echo $DATABASE_URL`, one verbose tool printing its config, and the secret is archived forever in the job logs. Automatic masking doesn't cover a transformed secret (base64, URL-encoded). A leaked secret gets **revoked**, not deleted from the logs.

- **Flaky tests**: a test that fails randomly destroys trust in the pipeline — the team starts re-running jobs without reading logs, and a real bug eventually slips through. Automatic retries mask the symptom; the only real answer is fixing or quarantining the test.
- **Slow pipeline**: past ~10 minutes, developers stop waiting for the result, stack up commits and work around the process. Parallelize tests, invest in caching, move heavy jobs off the critical path.
- **"CI is just running the tests"** — no: above all it's the practice of integrating *frequently* into a shared branch. A three-week-old branch with a green pipeline is not continuous integration.
- **Rebuilding the image between staging and production**: two builds are never guaranteed identical (dependencies updated in between). You promote the same artifact from one environment to the next.

## Going further

- [GitHub Actions — documentation](https://docs.github.com/en/actions) and [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [Martin Fowler — Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), the reference article
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/): short-lived branches and feature flags, with helpful diagrams
- Hands-on exercise: add a GitHub Actions workflow (lint + tests + Docker build) to one of your projects — the perfect conversation starter in an interview
