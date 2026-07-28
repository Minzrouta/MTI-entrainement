---
title: "Gestion des secrets"
date: "2026-10-22"
category: "Sécurité"
level: "Intermédiaire"
summary: "Clés API, mots de passe de DB, tokens : où les mettre, où ne JAMAIS les mettre, et quoi faire quand ça fuite — la question sécurité la plus concrète qu'on puisse vous poser en entretien."
---

## L'essentiel

Un **secret**, c'est toute donnée qui donne un accès : mot de passe de base de données, clé API (Stripe, AWS, OpenAI…), token OAuth, clé privée SSH ou TLS, secret de signature JWT. La règle numéro un est simple et non négociable : **un secret ne vit jamais dans le code ni dans le repo**. Pas dans une constante, pas dans un fichier de config commité, pas « juste pour tester ».

Pourquoi si strict ? Parce que **git n'oublie rien**. Un secret commité puis retiré au commit suivant reste dans l'historique, récupérable par n'importe qui clone le repo (`git log -p`, `git reflog`). Sur GitHub, des bots scannent les commits publics **en continu** : une clé AWS poussée sur un repo public est exploitée en quelques minutes, pas en quelques jours. Un secret commité est un secret **grillé** : la seule réponse correcte est de le révoquer et d'en générer un nouveau (rotation).

Le code doit donc lire ses secrets **depuis l'extérieur** au démarrage : variables d'environnement, fichier local non versionné, ou coffre-fort dédié.

## Comment ça marche

Le secret suit l'application dans trois contextes, avec un mécanisme différent à chaque étape :

```text
 DEV                    CI                    PROD
 .env (gitignoré)  Secrets chiffrés du   Env vars injectées
 lu au démarrage   pipeline (GitHub/     par la plateforme,
 par l'app         GitLab), masqués      ou coffre (Vault,
        │          dans les logs         cloud secrets mgr)
        └──────── .env.example versionné ────────┘
                  (les NOMS, jamais les valeurs)
```

**Variables d'environnement** : le standard de fait (piliers du [12-factor app](https://12factor.net/config)). L'app lit `process.env.DATABASE_URL` ou `os.environ["DATABASE_URL"]` — le même code tourne en dev, CI et prod avec des valeurs différentes. Mais connaissez leurs **limites** : elles sont visibles dans `/proc/<pid>/environ` et via `ps e` pour les processus du même utilisateur, elles sont **héritées par tous les processus enfants** (y compris ce script npm tiers), et elles finissent trop facilement dans les logs d'erreur ou les crash reports.

**Fichiers `.env`** : la version dev-friendly des env vars. Un fichier clé=valeur à la racine, chargé par `dotenv` (ou nativement par Node 20+, Vite, Next.js). Deux règles absolues : `.env` est **gitignoré**, et un **`.env.example`** versionné documente les noms de variables attendus (valeurs bidon) pour qu'un nouveau dev sache quoi remplir.

**Coffres (vaults)** : pour la prod sérieuse. HashiCorp **Vault**, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault : les secrets sont stockés chiffrés, l'accès est authentifié, audité, et la rotation peut être automatique. **sops** (Mozilla) est l'option légère : chiffrer les fichiers de secrets *dans* le repo avec une clé externe (age, KMS). En stage, savoir que ça existe et à quoi ça sert suffit.

| Contexte | Solution adaptée |
|---|---|
| Dev local | `.env` gitignoré + `.env.example` versionné |
| CI/CD | Secrets chiffrés du pipeline (GitHub/GitLab), masqués dans les logs |
| Prod simple (PaaS, VPS) | Env vars injectées par la plateforme (Coolify, Heroku…) |
| Prod sérieuse / multi-services | Vault, AWS/GCP/Azure secrets manager (audit, rotation) |
| Config chiffrée versionnée | sops + age/KMS |
| Prévention | gitleaks en pre-commit et en CI |

**Secrets en CI** : jamais dans le YAML du pipeline. GitHub Actions et GitLab CI ont un store de secrets chiffrés, injectés en env vars au run, et **masqués** dans les logs (`***`). Le masquage est un filet, pas une garantie : un secret encodé en base64 ou coupé en deux passe à travers.

> ⚠️ **Le secret commité puis retiré est toujours dans l'historique** — `git rm` + nouveau commit ne supprime rien : l'ancien blob reste accessible via l'historique, les reflogs, les forks et les clones existants. C'est pour ça que la rotation est obligatoire *même si* vous nettoyez l'historique ensuite.

## Concepts clés à maîtriser

- **Rotation** : changer un secret régulièrement (ou immédiatement après une fuite). Un secret conçu pour être facilement rotaté (lu au démarrage, jamais en dur) rend l'incident bénin ; un secret impossible à changer sans redéployer trois services est une bombe.
- **Moindre privilège** : un token n'a que les droits dont il a besoin. La clé du service de mails ne doit pas pouvoir supprimer des buckets S3. Fuite = dégâts proportionnels aux droits.
- **Scanner avant de commiter** : [gitleaks](https://github.com/gitleaks/gitleaks) détecte les patterns de secrets (clés AWS, tokens GitHub, entropie élevée). Branché en **hook pre-commit**, il bloque le commit fautif *avant* qu'il n'entre dans l'historique — le seul moment où c'est encore réparable gratuitement. En CI, il attrape ce qui a échappé au hook.
- **Séparer par environnement** : le secret de dev n'est pas celui de prod. Une base de dev compromise ne doit rien donner sur la prod.
- **Procédure de fuite** — l'ordre compte : **1)** révoquer/rotater le secret immédiatement (c'est ce qui stoppe l'hémorragie), **2)** vérifier les logs d'accès pour évaluer l'exploitation, **3)** nettoyer l'historique git (`git filter-repo`, ou BFG) et forcer le push, **4)** comprendre comment c'est arrivé et ajouter le garde-fou (gitleaks, review). Nettoyer l'historique **sans** révoquer ne sert à rien : les clones existants ont toujours le secret.

Le trio de fichiers qui structure tout ça :

```bash
# .gitignore — le .env n'entre JAMAIS dans le repo
.env
.env.*            # .env.local, .env.production…
!.env.example     # exception : l'exemple, lui, est versionné

# .env.example — versionné : les NOMS, des valeurs bidon
DATABASE_URL=postgres://user:password@localhost:5432/app
STRIPE_SECRET_KEY=sk_test_xxx
JWT_SECRET=change-me

# .env — local, gitignoré : les VRAIES valeurs
DATABASE_URL=postgres://app:S3cr3t!@localhost:5432/app
STRIPE_SECRET_KEY=sk_live_51Mq...
JWT_SECRET=b1946ac92492d2347c6235b4d2611184
```

> 💡 **Réflexe à montrer** — le `.env.example` n'est pas un détail : c'est lui qui rend le `.env` gitignorable sans casser l'onboarding. `cp .env.example .env`, on remplit, l'app démarre. Sans lui, quelqu'un finira par commiter le vrai `.env` « pour que ça marche chez les autres ».

## En entretien

**« Un secret a fuité dans un commit poussé, tu fais quoi ? »** — Dans l'ordre : je **révoque le secret immédiatement** (nouvelle clé côté provider) — c'est l'étape critique, car le secret est déjà considéré comme compromis. Je vérifie les logs d'accès du service concerné pour voir s'il a été exploité. *Ensuite* seulement, je nettoie l'historique (`git filter-repo`) et je préviens l'équipe (force push = re-clone). Enfin, j'ajoute gitleaks en pre-commit pour que ça ne se reproduise pas.

**« Pourquoi ne pas mettre les secrets dans le code, si le repo est privé ? »** — Un repo privé n'est pas un coffre : accès de tous les devs (et ex-devs via leurs clones), intégrations tierces (CI, outils d'analyse), risque de passage en public, laptop volé. Et un secret dans le code est couplé au déploiement : impossible de le rotater sans re-release. Externaliser le secret, c'est aussi pouvoir le changer en 30 secondes.

**« Variables d'environnement : limites ? »** — Visibles dans `/proc/<pid>/environ` et `ps e` (même user), héritées par tous les processus enfants (dépendances, scripts tiers), souvent dumpées dans les logs de crash ou les error reporters. C'est un bon transport, pas un stockage : en prod sérieuse, la source de vérité est un secrets manager qui les injecte.

**« C'est quoi la différence entre .env et .env.example ? »** — `.env` contient les vraies valeurs, il est gitignoré et local à chaque machine/environnement. `.env.example` est versionné et ne contient que les noms de variables avec des valeurs factices : c'est la documentation du contrat de configuration. Nouveau dev : `cp .env.example .env` et remplir.

**« Comment gères-tu les secrets dans une CI GitHub Actions ? »** — Store de secrets chiffrés du repo/org (`Settings → Secrets`), référencés via `${{ secrets.MY_KEY }}`, injectés en env vars au run et masqués dans les logs. Jamais en clair dans le YAML. Bonus : les workflows déclenchés par des forks n'ont pas accès aux secrets — c'est voulu.

## Pièges & idées reçues

- **« Je l'ai supprimé au commit suivant, c'est bon »** — non : l'historique garde tout. Révocation obligatoire, nettoyage d'historique en second.
- **« Le masquage des logs CI protège le secret »** — il masque la chaîne exacte : `echo $KEY | base64` la fait ressortir en clair. Le masquage limite les accidents, il n'arrête pas une exfiltration.
- **« Un .env.production sur le serveur, c'est comme un vault »** — c'est mieux que le repo, mais pas chiffré, pas audité, pas rotaté. Acceptable pour un side project, insuffisant dès qu'il y a des données clients.
- **Le frontend n'a pas de secrets** : tout ce qui part dans le bundle JS (`NEXT_PUBLIC_*`, `VITE_*`) est public par définition. Une « clé API secrète » côté client n'existe pas — l'appel sensible passe par votre backend.
- **Secrets dans les images Docker** : un `COPY .env` ou un `ARG SECRET` reste lisible dans les couches de l'image (`docker history`). Utiliser les secrets de build (`--secret`) ou l'injection au runtime.

> 🎤 **En entretien** — « un secret a fuité, tu fais quoi ? » est LA question type. La réponse attendue tient en un mot d'ordre : **révoquer d'abord, nettoyer ensuite**. Le candidat qui commence par « je réécris l'historique git » a raté l'essentiel : le secret est déjà dans la nature.

## Pour aller plus loin

- [The Twelve-Factor App — Config](https://12factor.net/config) : pourquoi la config vit dans l'environnement
- [gitleaks](https://github.com/gitleaks/gitleaks) : le scanner à brancher en pre-commit dès aujourd'hui
- [GitHub — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) : la procédure officielle (avec `git filter-repo`)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) : la référence complète
- [sops](https://github.com/getsops/sops) et [HashiCorp Vault](https://developer.hashicorp.com/vault) : les deux extrémités du spectre des coffres
