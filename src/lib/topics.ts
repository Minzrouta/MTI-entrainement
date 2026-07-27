import { getCollection, type CollectionEntry } from 'astro:content';

export interface Topic {
  dir: string;
  date: string;
  slug: string;
  category: string;
  level: string;
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
    .map((t) => ({ ...t, category: t.fr!.data.category, level: t.fr!.data.level }) as Topic)
    .sort((a, b) => b.date.localeCompare(a.date));
}
