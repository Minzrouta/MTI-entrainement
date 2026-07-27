// Vérifie l'intégrité du contenu avant build : fichiers présents, dates cohérentes et uniques.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/content/topics', import.meta.url).pathname;
const errors = [];
const dates = new Map();

const dirs = existsSync(ROOT) ? readdirSync(ROOT).filter((d) => !d.startsWith('.')) : [];
for (const dir of dirs) {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(dir)) {
    errors.push(`${dir}: nom de dossier invalide (attendu YYYY-MM-DD-slug)`);
    continue;
  }
  const date = dir.slice(0, 10);
  if (dates.has(date)) errors.push(`${dir}: date en double avec ${dates.get(date)}`);
  dates.set(date, dir);

  for (const f of ['fr.md', 'en.md', 'quiz.json']) {
    if (!existsSync(join(ROOT, dir, f))) errors.push(`${dir}: ${f} manquant`);
  }
  for (const lang of ['fr', 'en']) {
    const p = join(ROOT, dir, `${lang}.md`);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
    if (!m) errors.push(`${dir}/${lang}.md: frontmatter date manquante`);
    else if (m[1] !== date) errors.push(`${dir}/${lang}.md: date ${m[1]} ≠ dossier ${date}`);
  }
  const qp = join(ROOT, dir, 'quiz.json');
  if (existsSync(qp)) {
    try {
      const q = JSON.parse(readFileSync(qp, 'utf8'));
      if (!Array.isArray(q.flashcards) || !q.flashcards.length) errors.push(`${dir}: flashcards vides`);
      if (!Array.isArray(q.qcm) || !q.qcm.length) errors.push(`${dir}: qcm vide`);
    } catch (e) {
      errors.push(`${dir}/quiz.json: JSON invalide (${e.message})`);
    }
  }
}

if (errors.length) {
  console.error(`validate-content: ${errors.length} erreur(s)\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`validate-content: OK (${dirs.length} sujet(s))`);
