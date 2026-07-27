# MTI Training

Veille quotidienne pour la majeure MTI (EPITA) : une fiche par jour sur un sujet
d'informatique (Docker, RabbitMQ, MCP, …) avec exposé complet, questions
d'entretien, flashcards et QCM — bilingue FR/EN.

**Prod** : https://mti-training.bantou.me (Coolify, redéploiement auto au push sur `main`).

## Développement

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # valide le contenu puis construit dist/
```

## Ajouter une fiche

Créer `src/content/topics/YYYY-MM-DD-slug/` avec **trois fichiers** :

- `fr.md` / `en.md` — frontmatter `title`, `date` (= la date du dossier),
  `category`, `level`, `summary`, puis l'exposé en markdown. Sections types :
  L'essentiel · Comment ça marche · Concepts clés · En entretien · Pièges · Pour aller plus loin.
  Chaque fiche inclut (voir l'exemplaire `2026-07-27-docker/`) :
  - 1 **tableau comparatif** markdown là où c'est pertinent
  - 1 **exemple de code commenté** (bloc avec langage → coloration Shiki)
  - 1 **schéma ASCII** dans un bloc ` ```text ` (≤ 60 colonnes — passe aussi sur Discord)
  - 2-3 **callouts** en blockquote : `> 💡 **…** —`, `> ⚠️ **…** —`, `> 🎤 **En entretien** —`
    (rendus en encadrés sur le site, en citations sur Discord)
- `quiz.json` :

```json
{
  "flashcards": [{ "q_fr": "…", "a_fr": "…", "q_en": "…", "a_en": "…" }],
  "qcm": [{
    "q_fr": "…", "q_en": "…",
    "choices_fr": ["a", "b", "c", "d"], "choices_en": ["a", "b", "c", "d"],
    "answer": 0, "explain_fr": "…", "explain_en": "…"
  }]
}
```

Une fiche datée dans le futur est masquée jusqu'à sa date (filtre côté client).
`npm run build` vérifie la cohérence (fichiers présents, dates uniques et alignées).

Les fiches sont rédigées en avance via Claude Code, par lots : rédaction →
`npm run build` → commit → push (→ redéploiement auto).

## Webhook Discord

Le cron du VPS (`crontab -l`, 8h) lance `scripts/discord-daily.sh`, qui poste la
fiche du jour si `~/.config/mti-training/webhook` contient l'URL d'un webhook
Discord. Sans ce fichier, le script ne fait rien. Phase 2 prévue : bot interactif.

## Déploiement

App Coolify `mti-training` (uuid `xq8pqpea6l4ugd6r5sbhb5o9`), projet « Projets MTI »,
build nixpacks statique (`dist/` servi par nginx).

- **Auto-deploy au push** : ajouter sur GitHub (Settings → Webhooks) l'URL
  `https://coolify.bantou.me/webhooks/source/github/events/manual`, content type
  `application/json`, secret = celui affiché dans Coolify → mti-training → Webhooks.
- **Depuis le VPS** : `scripts/deploy.sh` (utilise le token Coolify local).
