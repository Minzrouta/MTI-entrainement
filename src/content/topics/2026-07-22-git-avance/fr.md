---
title: "Git avancé : rebase, cherry-pick & bisect"
date: "2026-07-22"
category: "Outils"
level: "Intermédiaire"
summary: "Comprendre le modèle objet de Git pour ne plus jamais subir un rebase : merge vs rebase, cherry-pick, bisect et le reflog comme filet de sécurité — les questions Git qui trient les candidats en entretien."
---

## L'essentiel

Git ne stocke pas des diffs : c'est une **base de données de snapshots** adressée par contenu. Chaque commit est un instantané complet du projet, identifié par un hash SHA-1 calculé sur son contenu. Toutes les commandes « avancées » — rebase, cherry-pick, bisect — cessent d'être magiques une fois ce modèle compris : elles ne font que **créer de nouveaux commits et déplacer des pointeurs**. Rien n'est modifié en place, et presque rien n'est vraiment perdu.

En entretien, ces sujets font la différence entre le candidat qui « utilise Git » (add/commit/push) et celui qui le comprend. « Merge ou rebase ? » tombe presque à chaque fois ; y répondre avec le modèle objet en tête change tout.

## Comment ça marche

Le modèle objet tient en quatre types, stockés dans `.git/objects` :

- **Blob** — le contenu d'un fichier (pas son nom, pas son chemin).
- **Tree** — un répertoire : une liste de noms pointant vers des blobs et d'autres trees.
- **Commit** — pointe vers un tree (le snapshot complet), vers son ou ses parents, plus auteur, date et message. Le hash couvre tout cela : changer un caractère du message produit un commit différent.
- **Tag annoté** — un objet nommé qui pointe vers un commit (typiquement les releases).

Une **branche n'est qu'un pointeur** : un fichier de 41 octets dans `.git/refs/heads/` contenant un hash de commit. `HEAD` pointe vers la branche courante. Créer une branche est instantané et gratuit — c'est la killer feature de Git, et l'historique complet n'est qu'un graphe orienté acyclique (DAG) de commits.

**Merge vs rebase** : `git merge feature` crée un commit de fusion à deux parents et préserve l'historique tel qu'il s'est réellement passé. `git rebase main` (depuis `feature`) **rejoue** chaque commit par-dessus `main` : de **nouveaux commits** (nouveaux hashes), un historique linéaire mais réécrit — les anciens commits existent toujours dans `.git/objects`, plus rien ne pointe dessus.

```text
avant                        après `git rebase main`

      A──B  feature
     /                       ──C──D──E──A'──B'  feature
──C──D──E  main                      ▲
                                     main
```

| | `git merge` | `git rebase` |
|---|---|---|
| Historique | Réel, non linéaire | Réécrit, linéaire |
| Commits | 1 commit de fusion (2 parents) | Nouveaux commits, nouveaux hashes |
| Lecture & bisect | Plus bruyant | Ligne droite, facile à bisecter |
| Branche partagée | Sûr | Interdit |
| Usage type | Intégrer la PR | Mettre sa branche à jour sur `main` |

> 🎤 **En entretien** — à « merge ou rebase ? », le réflexe qui marque des points : dessiner ce schéma. Deux flèches, cinq commits, et vous montrez que vous comprenez le modèle objet au lieu de réciter une préférence.

Le **rebase interactif** (`git rebase -i HEAD~5`) ouvre la liste des commits dans l'éditeur : `pick` (garder), `reword` (changer le message), `squash`/`fixup` (fusionner avec le précédent), `edit` (s'arrêter pour amender), `drop` (supprimer) — et on peut réordonner les lignes. C'est l'outil standard pour nettoyer une branche avant d'ouvrir la pull request.

Une session type :

```bash
$ git rebase -i HEAD~4      # retravailler les 4 derniers commits

# --- le fichier todo ouvert dans l'éditeur ---
pick   a1b2c3d feat: formulaire de login
reword f4e5d6c fix typo          # s'arrêter pour réécrire ce message
squash 9a8b7c6 wip               # fusionner dans le commit précédent
drop   3c2b1a0 logs de debug     # supprimer ce commit

# sauvegarder et quitter : Git rejoue tout dans l'ordre.
# Ça tourne mal ? `git rebase --abort` remet tout comme avant.
```

> 💡 **Filet de sécurité** — un rebase raté ne détruit rien : `git reflog` donne le hash d'avant l'opération, `git reset --hard HEAD@{n}` restaure. Le dire spontanément montre que l'outil ne vous fait pas peur.

## Concepts clés à maîtriser

- **cherry-pick** : `git cherry-pick <hash>` rejoue un commit précis sur la branche courante (nouveau commit, nouveau hash). Cas d'usage canonique : reporter un hotfix de `main` vers une branche de release. À doser : si la branche source est mergée ensuite, le même changement existe deux fois dans l'historique.
- **bisect** : recherche dichotomique du commit qui a introduit un bug. `git bisect start`, `git bisect bad` (HEAD est cassé), `git bisect good v1.2` (cette version marchait) ; Git checkout le commit du milieu, on teste, on répond `good` ou `bad`, et en log₂(n) étapes le coupable est identifié — 1000 commits ≈ 10 tests. Automatisable : `git bisect run ./test.sh` (exit 0 = good, autre = bad).
- **reflog** : `git reflog` journalise localement tous les déplacements de `HEAD` et des branches (conservés ~90 jours par défaut). Rebase raté, `reset --hard` malheureux, branche supprimée : le reflog retrouve le hash d'avant, et `git reset --hard HEAD@{2}` restaure. Un commit n'est réellement perdu que lorsqu'il n'est plus référencé nulle part *et* que le garbage collector est passé.
- **Stratégies de branches** : **trunk-based development** = branches très courtes (heures, quelques jours) mergées vite sur `main`, feature flags pour le code incomplet — la norme avec le CI/CD moderne. **Git flow** = branches `develop`, `release/*`, `hotfix/*` structurées — pertinent pour du logiciel versionné livré (mobile, embarqué), trop lourd pour du déploiement continu. Savoir expliquer pourquoi trunk-based domine aujourd'hui.
- **Conventions de commits** : Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, suffixe `!` pour un breaking change. Historique lisible, changelog et bump de version automatisables (semantic-release). Message à l'impératif, court en première ligne, le *pourquoi* dans le corps.
- **`--force-with-lease`** : après un rebase, `git push` est rejeté (historique divergent). `--force` écrase la branche distante aveuglément ; `--force-with-lease` échoue si quelqu'un a poussé entre-temps. C'est le seul force push acceptable en équipe.

## En entretien

**« Merge ou rebase ? »** — Les deux intègrent des changements, la différence est l'historique produit. Merge préserve la réalité (commit de fusion, historique non linéaire) ; rebase la réécrit pour obtenir un historique linéaire plus lisible et bisectable. Pratique courante : rebase de sa branche locale sur `main` pour la mettre à jour proprement, puis merge (souvent squash merge) de la PR. Règle d'or à citer spontanément : on ne rebase jamais des commits déjà poussés et partagés.

**« Un bug est apparu quelque part dans les 500 derniers commits. Comment trouver lequel ? »** — `git bisect` : on désigne un commit `bad` et un commit `good`, Git fait une recherche dichotomique — environ 9 tests suffisent pour 500 commits. Bonus : `git bisect run` avec un script de test pour automatiser entièrement la chasse.

**« Tu as fait un `git reset --hard` sur le mauvais commit. C'est perdu ? »** — Non : `git reflog` liste toutes les positions récentes de HEAD ; on repère l'entrée d'avant l'erreur puis `git reset --hard HEAD@{n}`. Ce qui n'est pas récupérable : le travail jamais commité — d'où l'intérêt des commits fréquents et du stash.

**« C'est quoi une branche, concrètement ? »** — Un pointeur mutable vers un commit, un fichier de 41 octets. L'historique est le DAG des commits ; la branche n'est qu'une étiquette qui avance à chaque nouveau commit. C'est pour ça que brancher est instantané, contrairement à SVN qui copiait des répertoires.

**« Quand utiliser cherry-pick ? »** — Pour reporter un correctif isolé vers une branche de release, ou récupérer un commit précis d'une branche abandonnée. Pas pour synchroniser des branches entières : c'est le rôle de merge/rebase, et les commits dupliqués compliquent l'historique.

## Pièges & idées reçues

> ⚠️ **La règle d'or** — on ne rebase jamais une branche **partagée** : les nouveaux hashes laissent les collègues qui avaient basé leur travail sur les anciens commits avec des historiques divergents pénibles à réconcilier. Rebase uniquement sur ses commits locaux non poussés ; dans le doute, merge.

- **`git push --force` par réflexe** : préférer `--force-with-lease` — même effet quand tout va bien, mais échoue si la branche distante a bougé depuis le dernier fetch. Écraser le travail d'un collègue avec `--force`, c'est le faux pas classique.
- **« Le rebase a supprimé mes commits »** — non : les anciens commits ne sont plus référencés mais restent dans `.git/objects` et dans le reflog pendant des semaines.
- **`git pull` n'est pas anodin** : c'est `fetch` + `merge`, source de commits de merge parasites. `git pull --rebase` (ou `pull.rebase=true` en config) garde l'historique local propre.
- **Squash systématique de toute la branche** : pratique pour des PR courtes, mais on perd le découpage en étapes qui facilite le review… et le bisect.

## Pour aller plus loin

- [Pro Git, chap. 10 — Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) : le modèle objet expliqué par le livre de référence (gratuit)
- Les pages officielles [git rebase](https://git-scm.com/docs/git-rebase) et [git bisect](https://git-scm.com/docs/git-bisect)
- [Conventional Commits](https://www.conventionalcommits.org/) : la spec des messages normalisés
- [Learn Git Branching](https://learngitbranching.js.org/) : visualiser rebase et cherry-pick en manipulant le graphe soi-même
