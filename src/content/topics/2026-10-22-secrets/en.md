---
title: "Secrets management"
date: "2026-10-22"
category: "Sécurité"
level: "Intermédiaire"
summary: "API keys, DB passwords, tokens: where to put them, where NEVER to put them, and what to do when they leak — the most concrete security question you can get in an interview."
---

## The essentials

A **secret** is any piece of data that grants access: database password, API key (Stripe, AWS, OpenAI…), OAuth token, SSH or TLS private key, JWT signing secret. Rule number one is simple and non-negotiable: **a secret never lives in the code or in the repo**. Not in a constant, not in a committed config file, not "just for testing".

Why so strict? Because **git never forgets**. A secret committed then removed in the next commit stays in the history, retrievable by anyone who clones the repo (`git log -p`, `git reflog`). On GitHub, bots scan public commits **continuously**: an AWS key pushed to a public repo gets exploited within minutes, not days. A committed secret is a **burned** secret: the only correct response is to revoke it and generate a new one (rotation).

So the code must read its secrets **from the outside** at startup: environment variables, an unversioned local file, or a dedicated vault.

## How it works

The secret follows the application through three contexts, with a different mechanism at each step:

```text
 DEV                    CI                    PROD
 .env (gitignored)  Encrypted pipeline    Env vars injected
 read at startup    secrets (GitHub/      by the platform,
 by the app         GitLab), masked       or a vault (Vault,
        │           in the logs          cloud secrets mgr)
        └──────── versioned .env.example ────────┘
                  (the NAMES, never the values)
```

**Environment variables**: the de facto standard (a pillar of the [12-factor app](https://12factor.net/config)). The app reads `process.env.DATABASE_URL` or `os.environ["DATABASE_URL"]` — the same code runs in dev, CI and prod with different values. But know their **limits**: they're visible in `/proc/<pid>/environ` and via `ps e` for same-user processes, they're **inherited by every child process** (including that third-party npm script), and they end up in error logs and crash reports far too easily.

**`.env` files**: the dev-friendly flavor of env vars. A key=value file at the project root, loaded by `dotenv` (or natively by Node 20+, Vite, Next.js). Two absolute rules: `.env` is **gitignored**, and a versioned **`.env.example`** documents the expected variable names (with dummy values) so a new dev knows what to fill in.

**Vaults**: for serious production. HashiCorp **Vault**, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault: secrets are stored encrypted, access is authenticated and audited, and rotation can be automated. **sops** (Mozilla) is the lightweight option: encrypt secret files *inside* the repo with an external key (age, KMS). For an internship, knowing these exist and what they're for is enough.

| Context | Right solution |
|---|---|
| Local dev | Gitignored `.env` + versioned `.env.example` |
| CI/CD | Encrypted pipeline secrets (GitHub/GitLab), masked in logs |
| Simple prod (PaaS, VPS) | Env vars injected by the platform (Coolify, Heroku…) |
| Serious prod / multi-service | Vault, AWS/GCP/Azure secrets manager (audit, rotation) |
| Encrypted versioned config | sops + age/KMS |
| Prevention | gitleaks in pre-commit and CI |

**Secrets in CI**: never in the pipeline YAML. GitHub Actions and GitLab CI have an encrypted secrets store, injected as env vars at run time and **masked** in the logs (`***`). Masking is a safety net, not a guarantee: a secret encoded in base64 or split in two slips right through.

> ⚠️ **A committed-then-removed secret is still in the history** — `git rm` + a new commit deletes nothing: the old blob stays reachable through the history, reflogs, forks and existing clones. That's why rotation is mandatory *even if* you clean the history afterwards.

## Key concepts to master

- **Rotation**: change a secret regularly (or immediately after a leak). A secret designed to be easy to rotate (read at startup, never hardcoded) makes an incident harmless; a secret you can't change without redeploying three services is a bomb.
- **Least privilege**: a token gets only the rights it needs. The email service's key must not be able to delete S3 buckets. Leak = damage proportional to the rights granted.
- **Scan before committing**: [gitleaks](https://github.com/gitleaks/gitleaks) detects secret patterns (AWS keys, GitHub tokens, high entropy). Wired as a **pre-commit hook**, it blocks the offending commit *before* it enters the history — the only moment when the fix is still free. In CI, it catches whatever escaped the hook.
- **Separate per environment**: the dev secret is not the prod secret. A compromised dev database must reveal nothing about prod.
- **Leak procedure** — order matters: **1)** revoke/rotate the secret immediately (that's what stops the bleeding), **2)** check access logs to assess exploitation, **3)** clean the git history (`git filter-repo`, or BFG) and force-push, **4)** understand how it happened and add the guardrail (gitleaks, review). Cleaning the history **without** revoking is pointless: existing clones still have the secret.

The trio of files that structures all of this:

```bash
# .gitignore — the .env NEVER enters the repo
.env
.env.*            # .env.local, .env.production…
!.env.example     # exception: the example IS versioned

# .env.example — versioned: the NAMES, dummy values
DATABASE_URL=postgres://user:password@localhost:5432/app
STRIPE_SECRET_KEY=sk_test_xxx
JWT_SECRET=change-me

# .env — local, gitignored: the REAL values
DATABASE_URL=postgres://app:S3cr3t!@localhost:5432/app
STRIPE_SECRET_KEY=sk_live_51Mq...
JWT_SECRET=b1946ac92492d2347c6235b4d2611184
```

> 💡 **Reflex to show** — the `.env.example` is not a detail: it's what makes the `.env` gitignorable without breaking onboarding. `cp .env.example .env`, fill it in, the app starts. Without it, someone will eventually commit the real `.env` "so it works for everyone".

## In an interview

**"A secret leaked in a pushed commit, what do you do?"** — In order: I **revoke the secret immediately** (new key on the provider's side) — that's the critical step, because the secret is already considered compromised. I check the affected service's access logs to see whether it was exploited. Only *then* do I clean the history (`git filter-repo`) and warn the team (force push = re-clone). Finally, I add gitleaks as a pre-commit hook so it doesn't happen again.

**"Why not put secrets in the code if the repo is private?"** — A private repo is not a vault: every dev has access (and ex-devs via their clones), third-party integrations too (CI, analysis tools), plus the risk of going public or a stolen laptop. And a secret in the code is coupled to the deployment: impossible to rotate without a re-release. Externalizing the secret also means being able to change it in 30 seconds.

**"Environment variables: limitations?"** — Visible in `/proc/<pid>/environ` and `ps e` (same user), inherited by every child process (dependencies, third-party scripts), often dumped in crash logs or error reporters. They're a good transport, not a storage: in serious production, the source of truth is a secrets manager that injects them.

**"What's the difference between .env and .env.example?"** — `.env` holds the real values, is gitignored and local to each machine/environment. `.env.example` is versioned and contains only variable names with fake values: it documents the configuration contract. New dev: `cp .env.example .env` and fill it in.

**"How do you handle secrets in GitHub Actions CI?"** — The repo/org encrypted secrets store (`Settings → Secrets`), referenced via `${{ secrets.MY_KEY }}`, injected as env vars at run time and masked in the logs. Never in plain text in the YAML. Bonus: workflows triggered from forks don't get secrets — by design.

## Pitfalls & misconceptions

- **"I deleted it in the next commit, we're fine"** — no: the history keeps everything. Revocation is mandatory; history cleanup comes second.
- **"CI log masking protects the secret"** — it masks the exact string: `echo $KEY | base64` prints it back in the clear. Masking limits accidents, it doesn't stop exfiltration.
- **"A .env.production on the server is basically a vault"** — better than the repo, but not encrypted, not audited, not rotated. Acceptable for a side project, insufficient as soon as customer data is involved.
- **The frontend has no secrets**: anything that ships in the JS bundle (`NEXT_PUBLIC_*`, `VITE_*`) is public by definition. A "secret API key" on the client side doesn't exist — the sensitive call goes through your backend.
- **Secrets in Docker images**: a `COPY .env` or an `ARG SECRET` stays readable in the image layers (`docker history`). Use build secrets (`--secret`) or runtime injection.

> 🎤 **In an interview** — "a secret leaked, what do you do?" is THE classic question. The expected answer fits in one motto: **revoke first, clean up second**. The candidate who starts with "I rewrite the git history" has missed the point: the secret is already out in the wild.

## Going further

- [The Twelve-Factor App — Config](https://12factor.net/config): why config lives in the environment
- [gitleaks](https://github.com/gitleaks/gitleaks): the scanner to wire into pre-commit today
- [GitHub — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository): the official procedure (with `git filter-repo`)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): the complete reference
- [sops](https://github.com/getsops/sops) and [HashiCorp Vault](https://developer.hashicorp.com/vault): the two ends of the vault spectrum
