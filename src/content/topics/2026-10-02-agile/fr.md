---
title: "Agile/Scrum tel qu'on le vit"
date: "2026-10-02"
category: "Méthodo"
level: "Fondamental"
summary: "Sprint, daily, vélocité, rétro : ce que Scrum dit vraiment, ce qui déraille en entreprise, et ce qu'on attend concrètement d'un stagiaire dans une équipe agile."
---

## L'essentiel

Le [manifeste agile](https://agilemanifesto.org/iso/fr/manifesto.html) (2001) tient en quatre valeurs : **les individus et leurs interactions plus que les processus et les outils** ; un logiciel qui fonctionne plus qu'une documentation exhaustive ; la collaboration avec le client plus que la négociation contractuelle ; l'adaptation au changement plus que le suivi d'un plan. La nuance que tout le monde oublie : le manifeste dit « nous reconnaissons la valeur des seconds éléments, mais privilégions les premiers ». Agile ne veut pas dire « pas de process, pas de doc » — ça veut dire livrer souvent, en petits incréments, et ajuster à chaque boucle de feedback.

**Scrum** est le framework agile le plus répandu, et celui que vous croiserez en stage. Trois rôles : le **Product Owner** (PO) porte la vision produit et priorise le backlog — il décide *quoi* faire ; le **Scrum Master** (SM) facilite, lève les obstacles et protège l'équipe — ce n'est **pas un chef de projet** ; l'**équipe de développement** s'auto-organise et décide *comment* faire. Le tout rythmé par des itérations courtes : les sprints.

En entretien de stage, personne n'attend de vous une certification. On attend que vous sachiez décrire un sprint, expliquer à quoi sert chaque cérémonie, et surtout montrer les bons réflexes d'équipier : découper, signaler, demander.

## Comment ça marche

Un sprint dure 1 à 2 semaines et suit toujours la même boucle :

```text
Product backlog (priorisé par le PO)
        │  sprint planning : l'équipe tire
        │  le haut de la pile et s'engage
        ▼
Sprint backlog ──▶ SPRINT (1-2 semaines)
                      │ daily 15 min chaque jour
                      ▼
              Incrément « done »
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   Sprint review             Rétrospective
   (démo du produit          (améliorer le
   aux parties prenantes)    process d'équipe)
         └──────── on repart ──────┘
```

- **Sprint planning** — l'équipe choisit les éléments du backlog qu'elle pense pouvoir livrer, les découpe en tâches, et se fixe un objectif de sprint.
- **Daily** — 15 minutes debout, chaque jour : qu'est-ce que j'ai avancé, sur quoi je pars, qu'est-ce qui me bloque. C'est une synchronisation d'équipe, pas un rapport au chef.
- **Sprint review** — on montre le logiciel qui marche aux parties prenantes, on récolte du feedback. Une démo, pas un PowerPoint.
- **Rétrospective** — l'équipe, entre elle, regarde son propre fonctionnement : ce qui a bien marché, ce qui a frotté, une ou deux actions concrètes pour le sprint suivant. C'est la cérémonie la plus importante — c'est là que l'équipe s'améliore.

Les **story points** estiment la complexité relative d'une user story (souvent en suite de Fibonacci : 1, 2, 3, 5, 8…), pas des heures. La **vélocité** — le total de points livrés par sprint — sert à l'équipe à prévoir ce qu'elle peut embarquer. C'est un outil de prévision interne, rien d'autre : dès qu'on compare les vélocités de deux équipes ou qu'on en fait un objectif, les estimations gonflent et la métrique meurt (loi de Goodhart).

> 💡 **Le daily sert à débloquer, pas à rapporter** — si votre daily ressemble à une file d'élèves récitant leur journée au manager, il est cassé. Le bon signal : quelqu'un dit « je bloque sur X », quelqu'un d'autre répond « je te prends 15 min après ». Le daily crée des conversations, il ne les remplace pas.

## Concepts clés à maîtriser

- **Scrum vs kanban** — deux façons d'organiser le flux :

| | Scrum | Kanban |
|---|---|---|
| Rythme | Sprints à durée fixe | Flux continu |
| Rôles | PO, SM, équipe dev | Aucun imposé |
| Engagement | Périmètre du sprint | Limite de WIP (travaux en cours) |
| Métriques | Vélocité (points / sprint) | Lead time, cycle time |
| Changement de priorité | Attend le sprint suivant | À tout moment |
| Adapté à | Développement produit planifiable | Support, ops, flux entrant imprévisible |

- **Definition of Done (DoD)** — la checklist commune qui définit « fini » : code écrit + testé + relu en code review + mergé + déployé en staging, par exemple. Sans DoD, « c'est fini » veut dire dix choses différentes pour dix personnes — et le sprint « fini » explose en recette.
- **User story** — un besoin exprimé côté utilisateur : « En tant que ⟨rôle⟩, je veux ⟨action⟩ afin de ⟨bénéfice⟩ », complété par des critères d'acceptation testables.
- **Découper une story en tâches** — la compétence numéro un du stagiaire. Une bonne tâche : une journée max, testable seule, livrable indépendamment :

```markdown
Story : « En tant qu'utilisateur, je peux réinitialiser
mon mot de passe par email. »   (5 points)

Tâches (≤ 1 jour chacune, testables séparément) :
- [ ] POST /password-reset : générer un token
      expirable (1 h), stocké hashé          # back
- [ ] Envoi de l'email avec le lien           # back
- [ ] Page « nouveau mot de passe » + form    # front
- [ ] POST /password-reset/confirm :
      valider le token, mettre à jour le mdp  # back
- [ ] Rate limiting sur les deux endpoints    # sécu
- [ ] Test e2e du parcours complet            # QA
```

- **Le kit du stagiaire** — ce qu'on attend vraiment de vous : savoir découper une tâche floue en sous-tâches d'une journée ; dire au daily (ou avant !) quand ça bloque, sans attendre la veille de la démo ; demander de l'aide au bon moment — la règle classique : 30 à 60 minutes de recherche sérieuse, puis on sollicite, avec ce qu'on a déjà essayé.

## En entretien

**« Raconte-moi un sprint type dans ton projet. »** — Déroulez la boucle avec du concret : planning (« on a embarqué 3 stories, ~20 points »), daily, un blocage et comment il a été levé, la démo en review, une action sortie de la rétro. Le concret prouve que vous l'avez vécu, pas juste appris.

**« À quoi sert le daily ? »** — À synchroniser l'équipe et surfacer les blocages tôt. 15 minutes max, pas un rapport au manager. Bonus : dire qu'un blocage annoncé au daily du jour 2 se règle en une heure ; le même découvert au jour 9 fait rater le sprint.

**« C'est quoi la vélocité, et à quoi elle sert ? »** — La somme des points livrés par sprint. Elle sert à l'équipe à prévoir sa capacité. Elle ne mesure pas la productivité, ne se compare pas entre équipes, et ne doit jamais devenir un objectif — sinon les estimations gonflent.

**« Scrum ou kanban pour une équipe de support ? »** — Kanban : le flux entrant est imprévisible, un sprint figé n'a pas de sens. On limite le travail en cours (WIP) et on mesure le temps de traversée. Scrum convient mieux au développement produit planifiable.

**« C'est quoi une definition of done ? »** — La checklist partagée qui rend « fini » objectif : testé, relu, mergé, déployé. Elle évite le faux-fini qui explose en fin de sprint.

> 🎤 **En entretien** — « Raconte-moi un sprint qui s'est mal passé » est une question piège inversée : l'intervieweur teste votre lucidité, pas votre perfection. Structure gagnante : le contexte (« on avait embarqué trop de points »), le signal raté (« un blocage tû jusqu'au jour 8 »), ce que la rétro a changé (« on a ajouté une limite de WIP et un point mi-sprint »). Un candidat qui n'a que des sprints parfaits à raconter n'a jamais fait de Scrum.

## Pièges & idées reçues

> ⚠️ **Le cargo cult agile** — faire toutes les cérémonies sans les valeurs : des dailys sans entraide, des rétros sans action, des sprints qui n'adaptent rien. L'équipe « fait du Scrum » et livre comme avant, avec des réunions en plus. Les cérémonies sont des outils au service du feedback ; vides, elles ne sont que du théâtre.

- **Le daily de 45 minutes** — devenu réunion de statut déguisée, chacun attend son tour en regardant son téléphone. Remède : 15 minutes chrono, les discussions de fond se prennent à deux après.
- **Les sprints mini-waterfalls** — spec la première semaine, code la deuxième, tests « au prochain sprint ». On a découpé le waterfall en tranches de deux semaines, pas fait de l'agile. Un incrément doit être *done* — testé inclus — à la fin du sprint.
- **La vélocité comme flicage** — dès qu'un manager compare les équipes ou exige « +10 % de points », les estimations gonflent en silence. La vélocité est un outil de prévision de l'équipe, pour l'équipe.
- **Le SM chef de projet** — un Scrum Master qui assigne les tâches et demande des comptes n'est pas un SM, c'est un chef de projet renommé. L'équipe s'auto-organise ; le SM déblaye.
- **« Agile = pas de doc, pas de plan »** — le manifeste privilégie, il n'élimine pas. On documente ce qui sert, on planifie à l'échelle d'un sprint et d'une roadmap — on s'interdit juste de croire un plan figé à six mois.

## Pour aller plus loin

- [Le manifeste agile](https://agilemanifesto.org/iso/fr/manifesto.html) et ses [12 principes](https://agilemanifesto.org/iso/fr/principles.html) — 5 minutes, à lire en entier
- [Le guide Scrum officiel](https://scrumguides.org/) — 13 pages, la source à citer en entretien
- Henrik Kniberg, [Scrum and XP from the Trenches](https://www.infoq.com/minibooks/scrum-xp-from-the-trenches-2/) — le Scrum vécu, pas le Scrum théorique
- Henrik Kniberg, [Agile Product Ownership in a Nutshell](https://www.youtube.com/watch?v=502ILHjX9EE) — 15 minutes de vidéo, la meilleure explication du rôle de PO
