import { defineCollection } from 'astro:content';
import { sanityLoader, sanityPagesLoader } from './lib/sanity-loader';
import { z } from 'astro/zod';

// Content lives in Sanity (project 9qg5x7wu, dataset production; schemas in studio/). It was imported from the Webflow
// CSV exports (src/content/, scripts/import-cms.py → scripts/sanity-export.mjs). src/content/ is now a frozen snapshot.
// `webflowDraft` = the item had unpublished edits in Webflow at export time (it may still be live).
// `order` = position in the Webflow export (the CMS order); sort by it, getCollection() doesn't keep it.
const base = { name: z.string(), slug: z.string(), webflowDraft: z.boolean(), order: z.number() };

const articles = defineCollection({
  loader: sanityLoader('article', { withBody: true }),
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
    // 2026-11-26: who the article is for (picks the end CTA), the related-articles list (article ids, null = field not set),
    // hero alt text, and an optional card thumbnail for the "Research & Insights" cards.
    audience: z.enum(['men', 'women', 'general', '']),
    related: z.array(z.string()).nullable(),
    imageAlt: z.string(),
    cardImage: z.string(),
    cardImageAlt: z.string(),
  }),
});

// The end-of-article CTA, one document per audience (men / women / general). Empty until the cutover adds them.
const articleCtas = defineCollection({
  loader: sanityLoader('articleCta', { optional: true }),
  schema: z.object({
    audience: z.enum(['men', 'women', 'general']),
    theme: z.enum(['slate', 'brown']),
    heading: z.string(),
    points: z.array(z.string()),
    button: z.object({ text: z.string(), href: z.string() }).nullable(),
    image: z.object({ src: z.string(), alt: z.string() }).nullable(),
  }),
});

const authors = defineCollection({
  loader: sanityLoader('author'),
  schema: z.object({ ...base, profile: z.string(), bio: z.string(), link: z.string() }),
});

const blogCategories = defineCollection({
  loader: sanityLoader('blogCategory'),
  schema: z.object(base),
});

const testimonials = defineCollection({
  loader: sanityLoader('testimonial'),
  schema: z.object({ ...base, testimonial: z.string(), age: z.string(), categories: z.array(z.string()) }),
});

const solutions = defineCollection({
  loader: sanityLoader('solution'),
  schema: z.object({ ...base, image: z.string(), paragraph: z.string() }),
});

const newsletters = defineCollection({
  loader: sanityLoader('newsletter'),
  schema: z.object({ ...base, thumb: z.string(), content: z.string(), description: z.string(), releaseDate: z.string().nullable() }),
});

const researches = defineCollection({
  loader: sanityLoader('research'),
  schema: z.object({
    ...base, body: z.string(), summary: z.string(), mainImage: z.string(), thumbnail: z.string(),
    featured: z.boolean(), color: z.string(),
  }),
});

// Page-builder pages (treatments, hubs, info pages): Sanity `page` documents decoded to the page JSON SectionPage renders
// (src/lib/page-codec.mjs). Imported from src/data/{treatments,hubs,pages}/*.json, which are now a frozen snapshot.
const pages = defineCollection({ loader: sanityPagesLoader() });

export const collections = { pages, articles, articleCtas, authors, blogCategories, testimonials, solutions, newsletters, researches };
