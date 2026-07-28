---
title: "Aborder une codebase inconnue"
date: "2026-10-09"
category: "Méthodo"
level: "Fondamental"
summary: "Premier jour de stage : 150 000 lignes que tu n'as jamais vues. La méthode pour explorer, poser les bonnes questions et livrer une première PR sans rien casser — une compétence que les recruteurs testent directement."
---

## L'essentiel

Premier jour de stage : un accès au repo, 150 000 lignes écrites par des gens que vous ne connaissez pas, et un ticket. Le réflexe naturel — tout lire pour « comprendre avant d'agir » — est exactement le mauvais. Personne ne connaît toute la codebase, pas même le lead qui est là depuis cinq ans. Les développeurs efficaces ne comprennent pas tout : ils savent **trouver vite**, avec une carte mentale grossière et des techniques de recherche précises.

La compétence évaluée en entretien n'est donc pas « connaître » mais **explorer** : par où on entre, comment on suit un fil, à qui et comment on demande, comment on livre un premier changement sans risque. C'est l'une des rares questions où le recruteur évalue directement ce que vous ferez la première semaine.

Trois principes tiennent lieu de méthode :

1. **Faire tourner avant de lire.** Une app qui tourne en local est un terrain d'expérimentation ; du code lu à froid, c'est de la fiction.
2. **Suivre un fil, pas la pelote.** Une requête, une feature, un bug — de bout en bout. La carte se construit fil après fil.
3. **Le code ment moins que la doc.** README obsolète, wiki abandonné : les tests et le `git log` sont les seules sources toujours à jour.

## Comment ça marche

**Jour 1 : cloner, lancer, noter.** Clonez, suivez le README à la lettre, et notez chaque étape manquante ou fausse : la variable d'environnement non documentée, la version de Node implicite, le service qui doit tourner à côté. Ces notes valent de l'or (voir plus bas). Objectif de la journée : l'app tourne en local et vous savez lancer les tests. Rien d'autre.

**Ensuite : chercher les points d'entrée.** Toute codebase a des portes : le `main()`, le fichier de routes, les handlers d'événements, les crons. Depuis une porte, suivez **une requête de bout en bout** — le geste qui rapporte le plus de compréhension par minute :

```text
HTTP POST /orders
      │
      ▼
routes/orders.ts          ← la porte d'entrée
      │
      ▼
OrderController.create()  ← validation, auth
      │
      ▼
OrderService.place()      ← la logique métier vit ici
      │
      ▼
OrderRepository ────────▶ PostgreSQL
```

Un aller-retour comme celui-là vous apprend l'architecture réelle (pas celle du wiki) : les couches, les conventions de nommage, où vit la logique métier.

**Les réflexes selon la situation :**

| Situation | Réflexe |
|---|---|
| « Où est géré X ? » | `rg` sur une chaîne visible (message d'erreur, label UI) |
| « Ce fichier fait quoi ? » | Ses tests d'abord, puis `git log --follow` |
| « Ce comportement est-il voulu ? » | S'il est testé, il est voulu |
| « Qui peut m'aider sur ce module ? » | `git shortlog -sn -- chemin/` |
| « Par où entre cette requête ? » | Fichier de routes / point d'entrée du framework |
| « Mon grep ne trouve rien » | Chercher la chaîne exacte de l'erreur, pas le nom supposé |

Une session d'exploration typique, en partant d'un message d'erreur :

```bash
# Point de départ concret : une chaîne visible dans l'API
rg "insufficient stock" -l
#   → src/services/order.service.ts

# Qui utilise ce service ? (la carte des dépendances)
rg "OrderService" -t ts -l

# L'histoire du fichier : les commits racontent le pourquoi
git log --follow --oneline -15 -- src/services/order.service.ts

# Qui a le contexte ? (à qui poser LA bonne question)
git shortlog -sn -- src/services/order.service.ts

# La spec vivante : les tests décrivent le comportement attendu
rg "insufficient" src --glob "*.test.ts"
```

> 💡 **Le README que tu écris en onboardant** — pendant vos deux premières semaines, vous êtes la seule personne de l'équipe à voir la codebase avec des yeux neufs. Chaque étape de setup manquante, chaque convention implicite que vous notez devient une PR de doc que l'équipe ne pouvait plus écrire elle-même. Souvent la meilleure première contribution : utile, sans risque, et elle prouve que vous transformez votre confusion en valeur.

## Concepts clés à maîtriser

- **Cartographie progressive** : l'objectif n'est jamais « tout comprendre » mais tenir une carte à jour — les 5-6 modules principaux, leurs frontières, qui parle à qui. Le détail se charge à la demande, quand un ticket vous y emmène.
- **Les tests comme documentation** : un test décrit le comportement attendu, avec des exemples exécutables, garantis à jour (sinon la CI est rouge). Lire `order.service.test.ts` avant `order.service.ts` : cas nominaux et cas limites y sont listés.
- **Git comme mémoire de l'équipe** : `git log` sur un fichier raconte pourquoi il existe ; `git blame` sur une ligne étrange remonte au commit (et souvent au ticket) qui l'a introduite ; les fichiers les plus modifiés sont les **fichiers chauds**, ceux qui concentrent l'activité — et les bugs.
- **Poser des questions intelligemment** : timeboxer la recherche (30-45 min), puis demander en montrant le chemin parcouru : « je cherche où X est validé ; j'ai regardé le controller et grep "X", je vois la validation du format mais pas la règle métier — elle vit où ? ». Cette forme prouve l'effort, cadre la réponse, et personne ne la trouve pénible.
- **La première PR : petite et sûre** : une typo dans la doc, une étape de setup manquante, un test sur un cas limite non couvert. Le but n'est pas de briller mais de traverser tout le pipeline (branche, PR, review, CI, merge, déploiement) sur un changement dont la review prend deux minutes.
- **Le debugger comme outil d'exploration** : un breakpoint sur le handler + la call stack = l'architecture réelle en une exécution, là où la lecture statique peut mentir (injection de dépendances, indirections).

> 🎤 **En entretien** — « Comment tu t'y prendrais dans notre codebase ? » est une vraie question, parfois posée devant un vrai écran. Réponse gagnante : dérouler la méthode (lancer l'app, lire les tests du module concerné, suivre une requête, `git log` des fichiers chauds) plutôt que promettre de « tout lire ». Bonus : demander « vous avez une doc d'onboarding ? Sinon, ma première PR sera de la commencer ».

## En entretien

**« On te lâche lundi dans notre codebase de 200k lignes : tu fais quoi la première semaine ? »** — Jour 1 : cloner, faire tourner, lancer les tests, noter tout ce qui manque au README. Jours 2-3 : suivre une requête de bout en bout pour comprendre les couches réelles, repérer les fichiers chauds avec git log. Fin de semaine : une première PR minuscule (doc de setup, test manquant) pour traverser le pipeline complet. Je ne cherche pas à tout comprendre : je construis une carte, module par module, tirée par les tickets.

**« Tu es bloqué sur un bout de code incompréhensible, tu fais quoi ? »** — Ses tests d'abord (le comportement attendu), puis `git blame` → le commit → le ticket (le pourquoi). Si ça ne suffit pas : timebox, puis question à l'auteur (retrouvé via blame/shortlog) en montrant ce que j'ai déjà exploré. Rester bloqué deux heures en silence coûte plus cher à l'équipe que demander au bout de 30 minutes avec le contexte.

**« C'est quoi une bonne première PR ? »** — Petite, sûre, utile : correction du README de setup, test sur un cas limite, typo. Elle valide que je sais dérouler tout le workflow de l'équipe (branche, conventions de commit, review, CI) sur un changement à risque nul. La grosse feature viendra quand la carte sera fiable.

**« À quoi te servent les tests dans du code que tu découvres ? »** — De documentation exécutable : ils listent comportements attendus et cas limites, et ils sont à jour par construction. Ils servent aussi de harnais : avant de modifier du code que je maîtrise mal, un test qui capture le comportement actuel me protège des régressions.

**« Le README dit X mais le code fait Y : tu crois qui ? »** — Le code, toujours : c'est lui qui tourne en prod, le README date. Mais l'écart est une info en soi : je vérifie avec git log si Y est récent, je demande si le changement est voulu, et la correction du README devient une PR.

## Pièges & idées reçues

> ⚠️ **Le refactoring précoce** — le code qui vous semble « nul » la première semaine a souvent une raison d'être que vous ne voyez pas encore : contrainte métier, bug historique, dépendance externe. C'est la barrière de Chesterton : on ne retire une barrière qu'après avoir compris pourquoi elle est là. Proposer un grand refactoring en semaine 1 est le signal junior par excellence.

- **« Je dois tout comprendre avant de toucher quoi que ce soit »** — non : la compréhension vient en faisant. Un ticket bien choisi apprend plus que trois jours de lecture passive.
- **Rester bloqué en silence** pour « ne pas déranger » : au-delà de 30-45 minutes de recherche réelle, ne pas demander coûte plus cher à l'équipe que demander.
- **L'inverse aussi** : demander avant d'avoir cherché grille votre crédit. La question doit montrer le chemin déjà parcouru.
- **Faire confiance à la doc plutôt qu'au code** : wiki et README dérivent ; tests et git log ne mentent pas.
- **La première PR ambitieuse** : 800 lignes en semaine 1 = review interminable, risque maximal, mauvais signal. Petit, sûr, mergé.

## Pour aller plus loin

- [Understand Legacy Code](https://understandlegacycode.com/) — le blog de Nicolas Carlo, entièrement dédié au sujet
- *Working Effectively with Legacy Code* (Michael Feathers) — le classique : harnais de tests, seams, modifications sûres
- [ripgrep](https://github.com/BurntSushi/ripgrep) — apprendre `rg` à fond, l'outil n°1 de l'exploration
- [git log](https://git-scm.com/docs/git-log) et [git blame](https://git-scm.com/docs/git-blame) — les options qui changent tout : `--follow`, `-S` (pickaxe), `-L`
- *The Programmer's Brain* (Felienne Hermans) — comment le cerveau lit du code, et pourquoi la carte mentale bat la lecture exhaustive
