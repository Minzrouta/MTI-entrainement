import type { APIRoute } from 'astro';
import { getTopics } from '../lib/topics';

// Consommé par scripts/discord-daily.sh et, plus tard, le bot Discord.
export const GET: APIRoute = async ({ site }) => {
  const topics = await getTopics();
  const base = (site ?? 'https://mti-training.bantou.me').toString().replace(/\/$/, '');
  return new Response(
    JSON.stringify(
      topics.map((t) => ({
        slug: t.slug,
        date: t.date,
        category: t.category,
        level: t.level,
        title_fr: t.fr.data.title,
        title_en: t.en.data.title,
        summary_fr: t.fr.data.summary,
        summary_en: t.en.data.summary,
        url: `${base}/sujet/${t.slug}`,
      })),
      null,
      2
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
