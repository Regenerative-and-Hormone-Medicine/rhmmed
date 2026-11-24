import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool, defineLocations } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

// The editorial preview: the Astro site built with SANITY_PREVIEW=1 (server-rendered, drafts via draft mode).
const PREVIEW_ORIGIN = 'https://rhmmed-preview.vercel.app';

const articlesPage = { title: 'All articles', href: '/articles' };

// RHM content (rhmmed.com). Project 9qg5x7wu lives in KHOD's Sanity org until handover to an RHM-owned account.
export default defineConfig({
  name: 'rhm',
  title: 'RHM',
  projectId: '9qg5x7wu',
  dataset: 'production',
  plugins: [
    presentationTool({
      title: 'Preview',
      previewUrl: { origin: PREVIEW_ORIGIN, preview: '/articles', previewMode: { enable: '/api/draft-mode/enable' } },
      allowOrigins: [PREVIEW_ORIGIN],
      // Which pages show each document (the "Used on" list and where a document opens in Preview).
      resolve: {
        locations: {
          article: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({ locations: [{ title: doc?.title || 'Article', href: `/articles/${doc?.slug}` }, articlesPage] }),
          }),
          blogCategory: defineLocations({ resolve: () => ({ locations: [articlesPage] }) }),
          author: defineLocations({ resolve: () => ({ locations: [articlesPage] }) }),
          solution: defineLocations({ resolve: () => ({ locations: [{ title: 'Home', href: '/' }] }) }),
        },
      },
    }),
    structureTool(),
    visionTool(),
  ],
  schema: { types: schemaTypes },
});
