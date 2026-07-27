---
title: "CI/CD & l'automatisation des déploiements"
date: "2026-08-03"
category: "DevOps"
level: "Fondamental"
summary: "Pipelines, environnements, stratégies de déploiement : savoir expliquer comment le code passe du push à la prod, une question quasi systématique en entretien de stage."
---

## L'essentiel

La **CI (Continuous Integration)** consiste à intégrer le code de toute l'équipe en continu : à chaque push, un serveur récupère le code, le compile et lance les tests automatiquement. L'objectif est le **feedback rapide** — savoir en quelques minutes qu'un commit casse quelque chose, plutôt que de le découvrir la veille de la démo pendant une « phase d'intégration » douloureuse.

Le **CD** recouvre deux pratiques qu'il faut distinguer en entretien. **Continuous Delivery** : chaque commit qui passe le pipeline produit un artefact *déployable* en un clic — le déploiement en prod reste une décision humaine. **Continuous Deployment** : ce clic disparaît, tout commit vert sur la branche principale part en prod automatiquement. La deuxième exige une confiance totale dans les tests ; la première suffit à la plupart des équipes.

Le tout repose sur un principe : **si c'est manuel, ça sera oublié ou raté un vendredi soir**. On automatise pour rendre les déploiements ennuyeux.

## Comment ça marche

Un pipeline typique s'exécute à chaque push ou pull request, en étapes ordonnées qui échouent vite :

1. **Lint & analyse statique** — le moins cher en premier : formatage, ESLint, typecheck. Échec en 30 secondes plutôt qu'en 10 minutes.
2. **Tests** — unitaires d'abord, intégration ensuite. Parallélisables entre plusieurs jobs.
3. **Build** — compilation, bundling, construction de l'image Docker.
4. **Artefact** — le produit du build (image taguée par SHA de commit, binaire, bundle) est publié sur un registry. Règle d'or : **on construit une fois, on déploie ce même artefact partout** — pas de rebuild entre staging et prod.
5. **Déploiement** — automatique vers staging, puis prod (avec ou sans approbation manuelle selon delivery/deployment).

Côté outils, GitHub Actions et GitLab CI partagent les mêmes concepts sous des noms proches. Un **workflow** (Actions) ou une **pipeline** (GitLab) est décrit en YAML versionné avec le code (`.github/workflows/ci.yml`, `.gitlab-ci.yml`). Il contient des **jobs** — unités d'exécution isolées, chacune sur une machine fraîche — regroupés en **stages** (GitLab) ou ordonnés par `needs` (Actions). Les jobs tournent sur des **runners** : machines hébergées par la plateforme ou auto-hébergées (self-hosted, utile pour du GPU ou un réseau privé). Comme chaque job part d'un environnement vierge, le **cache** (node_modules, `~/.cargo`, couches Docker) est ce qui fait la différence entre un pipeline de 3 minutes et un de 15.

Les **environnements** (staging, production) portent leur configuration et leurs **secrets** : stockés chiffrés côté plateforme, injectés en variables d'environnement à l'exécution, masqués dans les logs. Jamais dans le repo, jamais dans l'image Docker.

## Concepts clés à maîtriser

- **Delivery vs deployment** : la distinction précise (voir ci-dessus) est une question piège classique. La différence tient en une phrase : qui appuie sur le bouton.
- **Rolling deployment** : on remplace les instances une par une derrière le load balancer. Pas d'interruption, mais deux versions coexistent pendant la bascule — le code et les migrations DB doivent être rétro-compatibles.
- **Blue-green** : deux environnements complets ; on déploie sur l'inactif (green), on teste, on bascule le trafic d'un coup. Rollback = rebasculer. Coût : doubler l'infra.
- **Canary** : la nouvelle version reçoit d'abord 1-5 % du trafic ; on surveille les métriques (erreurs, latence) avant d'élargir. C'est la stratégie qui limite le mieux le rayon d'impact d'un bug.
- **Rollback** : redéployer l'artefact précédent (immutable, donc toujours disponible). Le vrai piège : les **migrations de base de données**, rarement réversibles — d'où la pratique des migrations rétro-compatibles (expand/contract : ajouter la colonne, migrer, supprimer l'ancienne plus tard).
- **Trunk-based development + feature flags** : tout le monde merge sur `main` fréquemment (branches courtes, < 1-2 jours), et le code inachevé part en prod *désactivé* derrière un flag. On sépare ainsi **déploiement** (mettre le code sur les serveurs) et **release** (l'activer pour les utilisateurs) — et un flag se coupe en secondes, plus vite que n'importe quel rollback.

## En entretien

**« Quelle différence entre continuous delivery et continuous deployment ? »** — Delivery : chaque commit vert est déployable, un humain décide quand déployer en prod. Deployment : le déploiement en prod est lui aussi automatique, sans intervention. Bonus : préciser que le deployment intégral exige des tests auxquels on fait vraiment confiance et souvent des feature flags pour découpler release et déploiement.

**« Décris le pipeline que tu mettrais en place pour une API Node »** — Sur chaque push : lint + typecheck, tests unitaires, tests d'intégration contre un Postgres jetable, build de l'image Docker taguée par SHA, push sur le registry. Sur `main` : déploiement auto en staging, smoke tests, puis prod avec approbation. Mentionner le cache npm et le fail-fast (lint avant les tests).

**« Blue-green vs canary, tu choisis quoi ? »** — Blue-green : bascule totale et rollback instantané, mais infra doublée et le bug touche 100 % du trafic dès la bascule. Canary : exposition progressive, le bug ne touche que 1-5 % des utilisateurs, mais il faut de bonnes métriques et de quoi router finement le trafic. Canary si l'observabilité suit, blue-green sinon.

**« Comment gères-tu les secrets dans un pipeline ? »** — Secrets chiffrés de la plateforme (GitHub Environments, GitLab CI/CD variables masquées et protégées), scoping par environnement, injection à l'exécution seulement. Jamais commités, jamais dans les args de build d'une image, jamais affichés — et rotation si un secret a fuité dans un log.

**« Un déploiement casse la prod, tu fais quoi ? »** — D'abord couper le feature flag si le changement en a un. Sinon rollback vers l'artefact précédent — possible parce qu'il est immuable et que les migrations sont rétro-compatibles. Ensuite seulement : reproduire, corriger, et ajouter le test qui aurait attrapé le bug.

## Pièges & idées reçues

- **Tests flaky** : un test qui échoue aléatoirement détruit la confiance dans le pipeline — l'équipe se met à relancer les jobs sans lire les logs, et un vrai bug finit par passer. Le retry automatique masque le symptôme ; la seule vraie réponse est de corriger ou quarantainer le test.
- **Pipeline lent** : au-delà de ~10 minutes, les devs cessent d'attendre le résultat, empilent les commits et contournent le process. Paralléliser les tests, soigner le cache, sortir les jobs lourds du chemin critique.
- **Secrets en clair dans les logs** : un `echo $DATABASE_URL` de debug, un outil verbeux qui affiche sa config, et le secret est archivé dans les logs du job. Le masquage automatique ne couvre pas un secret transformé (base64, URL-encodé). Un secret leaké se **révoque**, il ne se supprime pas des logs.
- **« La CI, c'est juste lancer les tests »** — non : c'est surtout la pratique d'intégrer *fréquemment* sur une branche partagée. Une branche de trois semaines avec un pipeline vert n'est pas de l'intégration continue.
- **Rebuilder l'image entre staging et prod** : deux builds ne sont jamais garantis identiques (dépendances mises à jour entre-temps). On promeut le même artefact d'un environnement à l'autre.

## Pour aller plus loin

- [GitHub Actions — documentation](https://docs.github.com/en/actions) et [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [Martin Fowler — Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), l'article de référence
- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com/) : branches courtes et feature flags, avec les schémas qui vont bien
- Exercice concret : ajouter un workflow GitHub Actions (lint + tests + build Docker) sur un de vos projets — c'est le sujet de conversation idéal en entretien
