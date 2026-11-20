import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

// Generated from the Webflow CSV exports by scripts/import-cms.py.
// `webflowDraft` = the item had unpublished edits in Webflow at export time (it may still be live).
const base = { name: z.string(), slug: z.string(), webflowDraft: z.boolean() };

const articles = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    heroBtnText: z.string(),
    heroBtnLink: z.string(),
    author: z.string(),
    category: z.string(),
    image: z.string(),
    date: z.string().nullable(),
    datePublished: z.string().nullable(),
    summary: z.string(),
    webflowDraft: z.boolean(),
  }),
});

const authors = defineCollection({
  loader: file('src/content/authors.json'),
  schema: z.object({ ...base, profile: z.string(), bio: z.string(), link: z.string() }),
});

const blogCategories = defineCollection({
  loader: file('src/content/blog-categories.json'),
  schema: z.object(base),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({ ...base, testimonial: z.string(), age: z.string(), categories: z.array(z.string()) }),
});

const solutions = defineCollection({
  loader: file('src/content/solutions.json'),
  schema: z.object({ ...base, image: z.string(), paragraph: z.string() }),
});

const newsletters = defineCollection({
  loader: file('src/content/newsletters.json'),
  schema: z.object({ ...base, thumb: z.string(), content: z.string(), description: z.string(), releaseDate: z.string().nullable() }),
});

const researches = defineCollection({
  loader: file('src/content/researches.json'),
  schema: z.object({
    ...base, body: z.string(), summary: z.string(), mainImage: z.string(), thumbnail: z.string(),
    featured: z.boolean(), color: z.string(),
  }),
});

export const collections = { articles, authors, blogCategories, testimonials, solutions, newsletters, researches };
