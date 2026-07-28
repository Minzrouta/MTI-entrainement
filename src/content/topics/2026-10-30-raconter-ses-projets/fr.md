---
title: "Raconter ses projets en entretien"
date: "2026-10-30"
category: "Méthodo"
level: "Fondamental"
summary: "Vos projets sont votre expérience : les raconter comme des histoires de décisions, pas comme des listes de technos, fait la différence en entretien de stage. Dernière fiche du programme — tout ce que vous avez vu devient munition."
---

## L'essentiel

En entretien de stage, vous avez peu d'expérience professionnelle : vos projets **sont** votre expérience. Le recruteur ne cherche pas une liste de technos — il vérifie que vous savez expliquer un contexte, justifier une décision, mesurer un résultat et en tirer des leçons. L'outil : la structure **STAR** adaptée au tech, **Contexte → Problème → Décisions → Résultat → Leçons**.

| Étape | La question à laquelle vous répondez | Exemple rempli (quiz temps réel) |
|---|---|---|
| Contexte | Quoi, pour qui, en quelle équipe, quel délai ? | « Appli de quiz live pour les soirées de l'école — 4 personnes, 3 semaines » |
| Problème | Quelle difficulté concrète, mesurable ? | « Scores en direct pour 200 joueurs ; notre polling HTTP s'écroulait à 80 » |
| Décisions | Quels choix, face à quelles alternatives, et qui a fait quoi ? | « WebSockets plutôt que polling, Redis pub/sub par salle ; j'ai conçu et codé le serveur de jeu » |
| Résultat | Qu'est-ce qui a marché, avec quels chiffres ? | « 250 connexions simultanées tenues en conditions réelles, latence < 200 ms » |
| Leçons | Que referiez-vous autrement ? | « Tests de charge dès la semaine 1 : on a découvert la limite devant les utilisateurs » |

Chaque ligne du tableau tient en une ou deux phrases : l'ensemble fait un récit de 90 secondes, après quoi l'intervieweur creuse là où il veut. C'est exactement ce qu'il attend.

## Comment ça marche

**Choisir 2-3 projets et les connaître à fond.** Trois histoires maîtrisées valent mieux que huit lignes de CV survolées. Pour chacun, préparez : l'architecture (dessinable au tableau), les décisions et leurs alternatives, un ou deux chiffres, ce qui a raté, ce que vous referiez autrement. L'**autocritique est un plus** : « aujourd'hui je découperais ce service » signale de la maturité, pas de la faiblesse.

**Quantifier quand c'est possible.** « Une app rapide » ne dit rien ; « le chargement est passé de 4 s à 800 ms après mise en cache des requêtes » raconte une investigation. Utilisateurs, latence, volume de données, temps gagné : un chiffre honnête, même modeste, bat un superlatif.

**Assumer les choix techniques.** « Pourquoi Postgres ? » mérite une vraie réponse — et « c'est la base qu'on connaissait, nos données étaient relationnelles, c'était le choix sûr en trois semaines » en est une : honnête, contextualisée, défendable. Le mauvais réflexe : inventer a posteriori une justification savante qui s'effondre à la deuxième question.

Le pitch de 90 secondes, écrit et répété avant l'entretien :

```text
« Mon projet le plus formateur : un quiz temps réel
pour les soirées de l'école.            [contexte, 15 s]

Le défi : afficher les scores en direct pour 200
joueurs — notre premier essai en polling HTTP s'est
écroulé à 80 connexions.                [problème, 15 s]

On est passés aux WebSockets, avec Redis en pub/sub
pour diffuser par salle. Moi, j'ai conçu et codé le
serveur de jeu, et mesuré la différence avec un test
de charge.                              [décisions, 30 s]

Résultat : 250 joueurs simultanés en soirée réelle,
moins de 200 ms de latence.             [résultat, 15 s]

Si je recommençais, je ferais les tests de charge dès
la première semaine — on a découvert nos limites
devant les utilisateurs. »              [leçons, 15 s]
```

> 🎤 **En entretien** — « Présente-moi un projet dont tu es fier. » La question tombe dans presque tous les entretiens de stage, souvent en ouverture. Ne jamais répondre par la stack (« c'est du React avec du Node… ») : dérouler le pitch de 90 secondes, puis laisser l'intervieweur creuser. Celui qui pose la question veut une histoire, pas un inventaire.

## Concepts clés à maîtriser

- **STAR tech** : Contexte → Problème → Décisions → Résultat → Leçons. La version RH (Situation, Task, Action, Result) marche aussi ; l'important est l'ordre — le contexte avant les détails, le résultat avant les leçons.
- **Le « toi précisément »** : dans un projet de groupe, l'intervieweur isolera votre contribution. Préparez la réponse au « je » : « j'ai conçu le schéma de base et l'API d'auth ; Marie a fait le front ». S'attribuer le projet entier se détecte en trois questions techniques.
- **L'autocritique calibrée** : un vrai raté + ce qu'il vous a appris + ce que vous feriez maintenant. Ni « rien n'a raté » (personne n'y croit), ni l'autoflagellation (le stagiaire qui se démolit inquiète).
- **La démo qui marche** : URL déployée testée le matin même, et un plan B hors ligne — capture vidéo ou GIF dans le README. Le wifi de la salle de réunion trahit toujours.
- **Le GitHub propre** : le recruteur passe 90 secondes sur un repo. README avec une capture d'écran, une phrase sur le quoi et le pourquoi, instructions de lancement qui marchent (`docker compose up` idéalement — fiche Docker), pas de `node_modules` commité, pas de secrets dans l'historique.
- **Lier chaque projet au poste** : relisez l'offre la veille. Chaque compétence demandée doit se raccrocher à une anecdote d'un de vos projets. Poste backend → la modélisation, l'API, les migrations ; poste front → l'état, les perfs, l'accessibilité.

> 💡 **Le README fait la moitié du travail** — un recruteur qui ouvre un repo avec capture d'écran, description en deux phrases et un `docker compose up` qui marche a déjà une bonne impression avant l'entretien. C'est le seul document que vous contrôlez à 100 % et qui parle pour vous en votre absence. Une heure de rédaction, rentabilisée à chaque candidature.

## En entretien

**« Qu'est-ce qui a raté dans ce projet ? »** — Jamais « rien ». Un raté précis, sa cause, ce que vous avez changé : « on a perdu une semaine parce qu'on n'avait pas figé le schéma de données ; depuis, je commence par le modèle et les migrations ». Le recruteur ne juge pas l'échec, il juge la lucidité et la boucle d'apprentissage.

**« Qu'as-tu fait, toi, précisément, dans ce projet de groupe ? »** — Réponse au « je », périmètre net, et créditez les autres : « j'ai pris le serveur de jeu et le pub/sub Redis ; le front, c'était Marie et Tom ». Créditer l'équipe renforce votre crédibilité — celui qui a vraiment contribué n'a pas besoin de tout s'attribuer.

**« Pourquoi avoir choisi [techno X] ? »** — Structure : le besoin, les options considérées, le critère qui a tranché. « C'est ce qu'on connaissait » est acceptable si vous l'assumez et savez nommer ce que vous compareriez aujourd'hui. La pire réponse : une justification inventée que la question suivante démonte.

**« Que referais-tu différemment ? »** — La question cadeau : elle teste si vous avez re-réfléchi au projet depuis. Une réponse d'architecture (« je séparerais le serveur de jeu de l'API REST ») ou de méthode (« tests de charge dès le début ») montre la prise de recul. « Rien » signifie que vous n'avez pas progressé depuis.

**« Tu peux me montrer quelque chose ? »** — Oui, toujours : URL déployée, GIF dans le README, ou démo locale préparée. Montrer un truc qui marche en 30 secondes vaut dix minutes de description. Et si la démo plante : plan B vidéo, sans paniquer — la gestion de l'imprévu fait aussi partie de l'évaluation.

## Pièges & idées reçues

- **Réciter la stack** — « React, Node, MongoDB, Docker » n'est pas une histoire. La stack arrive dans les décisions (« pourquoi Mongo ? »), pas en ouverture.
- **Le pitch de dix minutes** — 90 secondes puis silence : laisser l'intervieweur choisir où creuser. Un monologue qui déroule toute l'architecture épuise l'attention et cache vos points forts.
- **La fausse modestie** — « c'est un petit projet, pas grand-chose » sabote votre propre travail avant même de le montrer. Un petit projet bien raconté (problème réel, décision réfléchie, leçon) vaut un gros projet survolé.
- **Embellir** — l'intervieweur tech creuse jusqu'à la couche où vous ne savez plus répondre. Si « j'ai fait le back » devient flou à la troisième question sur les index, la crédibilité de tout le reste s'effondre. Le périmètre honnête est infiniment plus solide.

> ⚠️ **La démo sans plan B** — filmez votre démo (30 s, capture d'écran) avant chaque entretien. Wifi capricieux, service gratuit endormi, dépendance cassée la veille : la démo live échoue pour des raisons qui n'ont rien à voir avec votre travail. Le candidat qui enchaîne calmement sur sa vidéo marque plus de points que celui qui relance nerveusement son terminal.

## Pour aller plus loin

- [Tech Interview Handbook — behavioral round](https://www.techinterviewhandbook.org/behavioral-interview/) : la préparation structurée des questions non techniques
- [Brag documents (Julia Evans)](https://jvns.ca/blog/brag-documents/) : noter ses réalisations au fil de l'eau — le réflexe à prendre dès le stage
- [Make a README](https://www.makeareadme.com/) : la checklist du README qui donne envie de cloner
- [La méthode STAR](https://en.wikipedia.org/wiki/Situation,_task,_action,_result) : la version d'origine, utilisée par les RH

Cette fiche clôt le programme de veille. Les dizaines de fiches accumulées — Docker, bases de données, HTTP, sécurité, LLM en prod, UTF-8… — sont votre vivier d'anecdotes techniques : chaque section « En entretien » est une réponse prête à l'emploi, chaque « Piège vécu » une histoire à raconter. La veille de chaque entretien, relisez les fiches liées au poste et vos deux ou trois projets préparés. Vous avez le matériau ; il ne reste qu'à le raconter. Bonne chance.
