---
title: "CI/CD & l'automatisation des déploiements"
date: "2026-08-06"
category: "DevOps"
level: "Fondamental"
summary: "Pipelines, environnements, stratégies de déploiement : savoir expliquer comment le code passe du push à la prod, une question quasi systématique en entretien de stage."
---

## L'essentiel

La **CI (Continuous Integration)** consiste à intégrer le code de toute l'équipe en continu : à chaque push, un serveur récupère le code, le compile et lance les tests automatiquement. L'objectif est le **feedback rapide** — savoir en quelques minutes qu'un commit casse quelque chose, plutôt que de le découvrir la veille de la démo pendant une « phase d'intégration » douloureuse.

Le **CD** recouvre deux pratiques qu'il faut distinguer en entretien. **Continuous Delivery** : chaque commit qui passe le pipeline produit un artefact *déployable* en un clic — le déploiement en prod reste une décision humaine. **Continuous Deployment** : ce clic disparaît, tout commit vert sur la branche principale part en prod automatiquement. La deuxième exige une confiance totale dans les tests ; la première suffit à la plupart des équipes.

Le tout repose sur un principe : **si c'est manuel, ça sera oublié ou raté un vendredi soir**. On automatise pour rendre les déploiements ennuyeux.

> 🎤 **En entretien** — le recruteur ne veut pas la théorie, il veut VOTRE pipeline : « sur mon projet X, chaque push lance lint + tests ; un merge sur `main` construit l'image et la déploie ». Trois jobs sur un projet perso valent tous les buzzwords.

## Comment ça marche

Un pipeline typique s'exécute à chaque push ou pull request, en étapes ordonnées qui échouent vite :

1. **Lint & analyse statique** — le moins cher en premier : formatage, ESLint, typecheck. Échec en 30 secondes plutôt qu'en 10 minutes.
2. **Tests** — unitaires d'abord, intégration ensuite. Parallélisables entre plusieurs jobs.
3. **Build** — compilation, bundling, construction de l'image Docker.
4. **Artefact** — le produit du build (image taguée par SHA de commit, binaire, bundle) est publié sur un registry. Règle d'or : **on construit une fois, on déploie ce même artefact partout** — pas de rebuild entre staging et prod.
5. **Déploiement** — automatique vers staging, puis prod (avec ou sans approbation manuelle selon delivery/deployment).

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
build ──▶ artefact (image:sha) ──▶ registry
                                      │
                        staging ◀─────┘
                           │  smoke tests
                           ▼
                         prod (approbation ou auto)
```

Côté outils, GitHub Actions et GitLab CI partagent les mêmes concepts sous des noms proches. Un **workflow** (Actions) ou une **pipeline** (GitLab) est décrit en YAML versionné avec le code (`.github/workflows/ci.yml`, `.gitlab-ci.yml`). Il contient des **jobs** — unités d'exécution isolées, chacune sur une machine fraîche — regroupés en **stages** (GitLab) ou ordonnés par `needs` (Actions). Les jobs tournent sur des **runners** : machines hébergées par la plateforme ou auto-hébergées (self-hosted, utile pour du GPU ou un réseau privé). Comme chaque job part d'un environnement vierge, le **cache** (node_modules, `~/.cargo`, couches Docker) est ce qui fait la différence entre un pipeline de 3 minutes et un de 15.

Les mêmes concepts, en vrai, dans un workflow Actions minimal :

```yaml
name: ci
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest          # runner hébergé par GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }  # le cache qui change tout
      - run: npm ci
      - run: npm run lint           # le moins cher d'abord (fail fast)
      - run: npm test

  build:
    needs: test                     # ne tourne que si `test` est vert
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # taguée par SHA : le MÊME artefact ira en staging et en prod
      - run: docker build -t ghcr.io/org/api:${{ github.sha }} .
      - run: docker push ghcr.io/org/api:${{ github.sha }}
        env:
          GH_TOKEN: ${{ secrets.GHCR_TOKEN }}   # chiffré côté plateforme
```

> 💡 **Réflexe à montrer** — le tag par SHA n'est pas un détail : c'est lui qui rend le « build once, deploy everywhere » vérifiable. `api:3f2c1d9` est identique bit à bit en staging et en prod ; `api:latest` ne garantit rien.

Les **environnements** (staging, production) portent leur configuration et leurs **secrets** : stockés chiffrés côté plateforme, injectés en variables d'environnement à l'exécution, masqués dans les logs. Jamais dans le repo, jamais dans l'image Docker.

## Concepts clés à maîtriser

- **Delivery vs deployment** : la distinction précise (voir ci-dessus) est une question piège classique. La différence tient en une phrase : qui appuie sur le bouton.
- **Stratégies de déploiement** : trois façons de mettre la nouvelle version face au trafic — les compromis tiennent dans un tableau :

| | Rolling | Blue-green | Canary |
|---|---|---|---|
| Principe | instances remplacées une à une | 2 environnements, bascule totale | 1-5 % du trafic d'abord |
| Rollback | redéployer l'artefact précédent | rebasculer (instantané) | couper le canary |
| Coût infra | aucun surcoût | infra doublée | faible |
| Bug en prod | s'étend au fil de la bascule | 100 % du trafic d'un coup | 1-5 % des utilisateurs |
| Prérequis | rétro-compatibilité (2 versions coexistent) | — | métriques solides + routage fin |
- **Rollback** : redéployer l'artefact précédent (immutable, donc toujours disponible). Le vrai piège : les **migrations de base de données**, rarement réversibles — d'où la pratique des migrations rétro-compatibles (expand/contract : ajouter la colonne, migrer, supprimer l'ancienne plus tard).
- **Trunk-based development + feature flags** : tout le monde merge sur `main` fréquemment (branches courtes, < 1-2 jours), et le code inachevé part en prod *désactivé* derrière un flag. On sépare ainsi **déploiement** (mettre le code sur les serveurs) et **release** (l'activer pour les utilisateurs) — et un flag se coupe en secondes, plus vite que n'importe quel rollback.

## En entretien

**« Quelle différence entre continuous delivery et continuous deployment ? »** — Delivery : chaque commit vert est déployable, un humain décide quand déployer en prod. Deployment : le déploiement en prod est lui aussi automatique, sans intervention. Bonus : préciser que le deployment intégral exige des tests auxquels on fait vraiment confiance et souvent des feature flags pour découpler release et déploiement.

**« Décris le pipeline que tu mettrais en place pour une API Node »** — Sur chaque push : lint + typecheck, tests unitaires, tests d'intégration contre un Postgres jetable, build de l'image Docker taguée par SHA, push sur le registry. Sur `main` : déploiement auto en staging, smoke tests, puis prod avec approbation. Mentionner le cache npm et le fail-fast (lint avant les tests).

**« Blue-green vs canary, tu choisis quoi ? »** — Blue-green : bascule totale et rollback instantané, mais infra doublée et le bug touche 100 % du trafic dès la bascule. Canary : exposition progressive, le bug ne touche que 1-5 % des utilisateurs, mais il faut de bonnes métriques et de quoi router finement le trafic. Canary si l'observabilité suit, blue-green sinon.

**« Comment gères-tu les secrets dans un pipeline ? »** — Secrets chiffrés de la plateforme (GitHub Environments, GitLab CI/CD variables masquées et protégées), scoping par environnement, injection à l'exécution seulement. Jamais commités, jamais dans les args de build d'une image, jamais affichés — et rotation si un secret a fuité dans un log.

**« Un déploiement casse la prod, tu fais quoi ? »** — D'abord couper le feature flag si le changement en a un. Sinon rollback vers l'artefact précédent — possible parce qu'il est immuable et que les migrations sont rétro-compatibles. Ensuite seulement : reproduire, corriger, et ajouter le test qui aurait attrapé le bug.

## Pièges & idées reçues

> ⚠️ **Secrets dans les logs** — un `echo $DATABASE_URL` de debug, un outil verbeux qui affiche sa config, et le secret est archivé pour toujours dans les logs du job. Le masquage automatique ne couvre pas un secret transformé (base64, URL-encodé). Un secret leaké se **révoque**, il ne se supprime pas des logs.

- **Tests flaky** : un test qui échoue aléatoirement détruit la confiance dans le pipeline — l'équipe se met à relancer les jobs sans lire les logs, et un vrai bug finit par passer. Le retry automatique masque le symptôme ; la seule vraie réponse est de corriger ou quarantainer le test.
- **Pipeline lent** : au-delà de ~10 minutes, les devs cessent d'attendre le résultat, empilent les commits et contournent le process. Paralléliser les tests, soigner le cache, sortir les jobs lourds du chemin critique.
- **« La CI, c'est juste lancer les tests »** — non : c'est surtout la pratique d'intégrer *fréquemment* sur une branche partagée. Une branche de trois semaines avec un pipeline vert n'est pas de l'intégration continue.
- **Rebuilder l'image entre staging et prod** : deux builds ne sont jamais garantis identiques (dépendances mises à jour entre-temps). On promeut le même artefact d'un environnement à l'autre.

## Pour aller plus loin

- [GitHub Actions — documentation](https://docs.github.com/en/actions) et [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [Martin Fowler — Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), l'article de référence
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/) : branches courtes et feature flags, avec les schémas qui vont bien
- Exercice concret : ajouter un workflow GitHub Actions (lint + tests + build Docker) sur un de vos projets — c'est le sujet de conversation idéal en entretien
