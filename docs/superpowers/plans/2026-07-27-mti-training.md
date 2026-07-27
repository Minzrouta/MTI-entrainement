# MTI Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution chosen — content-heavy, tasks sequential). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Site statique de veille quotidienne bilingue + webhook Discord, déployé sur mti-training.bantou.me via Coolify.

**Architecture:** Astro 5 statique, contenu markdown/JSON dans le repo (collections glob), filtre de date côté client, cron VPS pour Discord. Zéro backend.

**Tech Stack:** Astro 5, vanilla JS/CSS, bash + jq (cron), Coolify API (nixpacks static).

## Global Constraints

- Bilingue FR/EN partout (toggle `data-lang` sur `<html>`, localStorage, défaut fr).
- Un sujet = un dossier `src/content/topics/<YYYY-MM-DD>-<slug>/` : `fr.md`, `en.md`, `quiz.json`.
- Sujets futurs masqués côté client uniquement (`data-date` + script inline).
- Pas de dépendance au-delà d'Astro. Pas de framework UI.
- Commits : première ligne seule, pas de co-authored-by.
- Design : sobre/éditorial (skill frontend-design), dark mode auto, pas d'AI slop.

---

### Task 1: Scaffold + push access

**Files:** Create `package.json`, `astro.config.mjs`, `.gitignore`, `src/pages/index.astro` (placeholder).

- [ ] Vérifier `gh auth status` / remote push (bloquant si absent → demander un token, seul vrai blocage possible).
- [ ] `npm create astro@latest -- --template minimal --no-install --no-git` puis `npm install`.
- [ ] Commit spec + plan + scaffold, push → vérifie l'accès en écriture au repo.

### Task 2: Schéma de contenu + collections

**Files:** Create `src/content.config.ts`, un sujet exemple complet (docker), `scripts/validate-content.mjs`.

**Interfaces (produit) :**
- Collection `topics` : entries id `"<dir>/fr"|"<dir>/en"` ; frontmatter `{title, date: 'YYYY-MM-DD', category, level, summary}`.
- Collection `quizzes` : entries id `"<dir>/quiz"` ; schéma `{flashcards: [{q_fr,a_fr,q_en,a_en}], qcm: [{q_fr,q_en,choices_fr[4],choices_en[4],answer: index,explain_fr,explain_en}]}`.
- Helper `src/lib/topics.ts` : `getTopics()` → `[{dir, date, slug, fr, en, quiz}]` trié par date desc ; `slug = dir.slice(11)`.

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const topics = defineCollection({
  loader: glob({ pattern: '*/{fr,en}.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string(), level: z.string(), summary: z.string(),
  }),
});
const quizzes = defineCollection({
  loader: glob({ pattern: '*/quiz.json', base: './src/content/topics' }),
  schema: z.object({
    flashcards: z.array(z.object({ q_fr: z.string(), a_fr: z.string(), q_en: z.string(), a_en: z.string() })),
    qcm: z.array(z.object({
      q_fr: z.string(), q_en: z.string(),
      choices_fr: z.array(z.string()).length(4), choices_en: z.array(z.string()).length(4),
      answer: z.number().int().min(0).max(3), explain_fr: z.string(), explain_en: z.string(),
    })),
  }),
});
export const collections = { topics, quizzes };
```

- [ ] `validate-content.mjs` : chaque dossier a fr.md + en.md + quiz.json, dates fr/en identiques, dates uniques. Branché en `prebuild`.
- [ ] `npm run build` passe avec le sujet exemple. Commit.

### Task 3: Layout + design system

**Files:** Create `src/layouts/Base.astro`, `src/styles/global.css`, `src/components/Header.astro`.

- [ ] Invoquer le skill frontend-design. Typo éditoriale, une couleur d'accent, dark mode `prefers-color-scheme` + `light-dark()`.
- [ ] Header : nav (Accueil / Sujets / Entraînement) + toggle FR/EN.
- [ ] Script inline anti-FOUC dans `<head>` : `document.documentElement.dataset.lang = localStorage.lang ?? 'fr'`.
- [ ] CSS : `html[data-lang="fr"] [data-l="en"] { display:none }` et inverse. Convention : tout texte bilingue = deux éléments jumeaux `data-l="fr"` / `data-l="en"`.
- [ ] Commit.

### Task 4: Pages

**Files:** Create `src/pages/index.astro`, `src/pages/sujets.astro`, `src/pages/sujet/[slug].astro`, `src/pages/entrainement.astro`, `src/pages/topics.json.ts`.

- [ ] `/` : hero « sujet du jour » (choisi côté client parmi les `<article data-date>`, = date max ≤ today) + liste des récents.
- [ ] `/sujets` : tout l'historique, cartes `data-date` (futures masquées par le script global), filtre catégorie (boutons, JS trivial).
- [ ] `/sujet/[slug]` : rendu des deux md (`render()`), blocs `data-l`, méta (date, catégorie, niveau), lien entraînement.
- [ ] `/entrainement` : sections par sujet (masquées si futur) ; flashcards (carte cliquable → révèle réponse) ; QCM (choix → correction immédiate + explication, score en haut). Vanilla JS, un seul fichier inline.
- [ ] `topics.json.ts` : endpoint statique `[{slug, dir, date, category, title_fr, title_en, summary_fr, summary_en, url}]` — consommé par le script Discord et le futur bot.
- [ ] `npm run build` + `npm run preview`, vérif visuelle (curl + screenshot navigateur si utile). Commit.

### Task 5: Discord + cron

**Files:** Create `scripts/discord-daily.sh`, `README.md`.

```bash
#!/usr/bin/env bash
# Poste le sujet du jour sur Discord. Sort silencieusement si pas de webhook.
set -euo pipefail
WEBHOOK_FILE="$HOME/.config/mti-training/webhook"
[ -f "$WEBHOOK_FILE" ] || exit 0
WEBHOOK=$(cat "$WEBHOOK_FILE")
TODAY=$(date +%F)
TOPIC=$(curl -sf https://mti-training.bantou.me/topics.json | jq -c --arg d "$TODAY" '.[] | select(.date == $d)') || exit 0
[ -n "$TOPIC" ] || exit 0
TITLE=$(jq -r .title_fr <<<"$TOPIC"); SUMMARY=$(jq -r .summary_fr <<<"$TOPIC"); URL=$(jq -r .url <<<"$TOPIC")
jq -n --arg t "$TITLE" --arg s "$SUMMARY" --arg u "$URL" \
  '{embeds: [{title: ("📚 Sujet du jour : " + $t), description: $s, url: $u, color: 5793266}]}' \
  | curl -sf -H 'Content-Type: application/json' -d @- "$WEBHOOK"
```

- [ ] Cron user : `0 8 * * * /home/ubuntu/MTI-entrainement/scripts/discord-daily.sh`.
- [ ] README : lancer en local, ajouter un sujet, format quiz.json, config webhook. Commit + push.

### Task 6: Contenu — 15 sujets

**Files:** Create 15 dossiers datés du 2026-07-28 au 2026-08-11 (un/jour) :

| Date | Slug | Catégorie |
|---|---|---|
| 07-28 | docker | DevOps |
| 07-29 | git-avance | Outils |
| 07-30 | rest-graphql-grpc | Architecture |
| 07-31 | rabbitmq | Backend |
| 08-01 | oauth2-jwt | Sécurité |
| 08-02 | sql-vs-nosql | Data |
| 08-03 | redis | Backend |
| 08-04 | ci-cd | DevOps |
| 08-05 | websockets | Web |
| 08-06 | tests | Qualité |
| 08-07 | microservices | Architecture |
| 08-08 | typescript | Web |
| 08-09 | kubernetes | DevOps |
| 08-10 | mcp | IA |
| 08-11 | observabilite | DevOps |

Structure d'un exposé (fr.md et en.md, ~900-1200 mots chacun) :
`## L'essentiel` · `## Comment ça marche` · `## Concepts clés à maîtriser` ·
`## En entretien` (questions typiques + réponses attendues) · `## Pièges & idées reçues` · `## Pour aller plus loin`.
quiz.json : 8 flashcards + 6 QCM par sujet, bilingues.

- [ ] Rédiger par lots de 3-5 sujets, `npm run build` après chaque lot, commit par lot.

### Task 7: Déploiement Coolify

- [ ] `dig +short mti-training.bantou.me` → doit pointer sur 51.210.246.139 (wildcard).
- [ ] API Coolify : lister projects/servers → POST `/api/v1/applications/public` `{project_uuid, server_uuid, environment_name, git_repository, git_branch: "main", build_pack: "nixpacks", is_static: true, publish_directory: "/dist", ports_exposes: "80", domains: "https://mti-training.bantou.me", instant_deploy: true}`.
- [ ] Auto-deploy au push : webhook GitHub via `gh api` si authentifié, sinon documenter le deploy-hook Coolify dans le README.
- [ ] Vérifier https://mti-training.bantou.me : sujet du jour affiché, toggle langue, /topics.json, entraînement OK.
- [ ] Test à blanc du script Discord (`bash scripts/discord-daily.sh` sans webhook → exit 0 silencieux).

### Task 8: Vérification finale

- [ ] Skill superpowers:verification-before-completion : critères du spec un par un, preuve à l'appui (curl, capture, sortie cron).
