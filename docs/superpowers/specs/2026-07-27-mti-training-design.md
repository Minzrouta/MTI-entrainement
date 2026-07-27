# MTI Training — Veille quotidienne pour la majeure MTI (EPITA)

**Date** : 2026-07-27 · **Statut** : validé par Baptiste

## Objectif

Un site + un canal Discord qui publient chaque jour un sujet de veille technique
(Docker, RabbitMQ, MCP, …) avec un exposé complet et tout ce qu'il faut savoir
pour un entretien de stage. Public : la classe MTI. Contenu rédigé en avance
par Claude Code (pas d'API payante), stocké en markdown dans ce repo.

## Décisions actées

| Question | Décision |
|---|---|
| Discord | Webhook simple (cron VPS 8h) maintenant, bot interactif en phase 2 |
| Entraînement | Flashcards Q/R **et** QCM avec score |
| Langue | Bilingue FR/EN, toggle global mémorisé (localStorage) |
| Volume initial | ~15 sujets (2 semaines d'avance) |
| Stack | Astro statique, zéro backend, zéro DB |
| Déploiement | Coolify depuis GitHub → mti-training.bantou.me, auto-deploy au push |

## Architecture

- **Astro** en sortie 100 % statique. Une seule dépendance de framework.
- **Contenu** : `src/content/topics/<YYYY-MM-DD>-<slug>/` contenant :
  - `fr.md` / `en.md` — exposé complet + section « À savoir en entretien »
    (frontmatter : title, date, category, level, summary)
  - `quiz.json` — flashcards (`[{q_fr, a_fr, q_en, a_en}]`) et QCM
    (`[{q_fr, q_en, choices_fr[], choices_en[], answer, explain_fr, explain_en}]`)
- **Pages** :
  - `/` — sujet du jour + derniers sujets
  - `/sujets` — historique complet, filtre par catégorie
  - `/sujet/<slug>` — exposé
  - `/entrainement` — flashcards à révéler + QCM noté, filtrables par sujet
- **Révélation quotidienne** : filtre par date côté client. Les sujets futurs
  sont dans le build mais masqués tant que `date > today`. Assumé : lisible en
  fouillant le source — c'est de la révision, pas un secret.
- **Toggle FR/EN** : les deux langues sont dans le HTML, CSS/JS affiche l'une
  ou l'autre, choix en localStorage.
- **Discord** : `scripts/discord-daily.sh` lit le `topics.json` du site publié
  et poste titre + résumé + lien via webhook. Cron utilisateur sur le VPS à 8h.
  URL du webhook dans `~/.config/mti-training/webhook` (non commité) — le cron
  sort silencieusement si le fichier n'existe pas.
- **Déploiement** : app Coolify (static build), domaine mti-training.bantou.me,
  webhook GitHub pour auto-deploy au push.
- **Réapprovisionnement** : session Claude Code → rédaction de N sujets →
  commit + push → redéploiement auto.

## Design front

Sobre, éditorial, lisible — skill frontend-design. Pas de dashboard AI slop.
Typographie soignée, une couleur d'accent, dark mode via prefers-color-scheme.

## Hors périmètre (phase 2)

Bot Discord interactif (/sujet, /quiz), comptes utilisateurs, stats de score,
recherche full-text.

## Critères de succès

- Le site est en ligne sur https://mti-training.bantou.me avec ≥15 sujets.
- Le sujet du jour change à minuit sans intervention.
- Le cron Discord poste à 8h quand le webhook est configuré, ne casse rien sinon.
- Un push sur main redéploie automatiquement.
