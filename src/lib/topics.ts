import { getCollection, type CollectionEntry } from 'astro:content';

export interface Topic {
  dir: string;
  date: string;
  slug: string;
  category: string;
  level: string;
  /** Fiche d'actualité du lundi : pas de numéro « Jour N », badge Actu. */
  isActu: boolean;
  fr: CollectionEntry<'topics'>;
  en: CollectionEntry<'topics'>;
  quiz: CollectionEntry<'quizzes'>;
}

/** Tous les sujets, triés du plus récent au plus ancien. */
export async function getTopics(): Promise<Topic[]> {
  const mds = await getCollection('topics');
  const quizzes = await getCollection('quizzes');
  const byDir = new Map<string, Partial<Topic>>();
  for (const e of mds) {
    const [dir, lang] = e.id.split('/');
    const t = byDir.get(dir) ?? { dir, date: dir.slice(0, 10), slug: dir.slice(11) };
    (t as Record<string, unknown>)[lang] = e;
    byDir.set(dir, t);
  }
  for (const q of quizzes) {
    const t = byDir.get(q.id.split('/')[0]);
    if (t) t.quiz = q;
  }
  return [...byDir.values()]
    .map(
      (t) =>
        ({
          ...t,
          category: t.fr!.data.category,
          level: t.fr!.data.level,
          isActu: t.slug!.startsWith('actu'),
        }) as Topic
    )
    // Plus récent d'abord ; à date égale (lundi de lancement), l'actu passe devant.
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.isActu) - Number(a.isActu));
}

/** Numéro « Jour N » d'une fiche générale (les actus n'en ont pas). */
export function dayNumbers(topics: Topic[]): Map<string, number> {
  const generals = topics.filter((t) => !t.isActu);
  return new Map(generals.map((t, i) => [t.dir, generals.length - i]));
}
