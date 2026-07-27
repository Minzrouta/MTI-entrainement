import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const topics = defineCollection({
  loader: glob({ pattern: '*/{fr,en}.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string(),
    level: z.string(),
    summary: z.string(),
  }),
});

const quizzes = defineCollection({
  loader: glob({ pattern: '*/quiz.json', base: './src/content/topics' }),
  schema: z.object({
    flashcards: z.array(
      z.object({ q_fr: z.string(), a_fr: z.string(), q_en: z.string(), a_en: z.string() })
    ),
    qcm: z.array(
      z.object({
        q_fr: z.string(),
        q_en: z.string(),
        choices_fr: z.array(z.string()).length(4),
        choices_en: z.array(z.string()).length(4),
        answer: z.number().int().min(0).max(3),
        explain_fr: z.string(),
        explain_en: z.string(),
      })
    ),
  }),
});

export const collections = { topics, quizzes };
