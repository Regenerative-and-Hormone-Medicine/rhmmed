import { defineConfig } from 'sanity';
import { structureTool, type StructureBuilder } from 'sanity/structure';
import { presentationTool, defineLocations, defineDocuments } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

// The editorial preview: the Astro site built with SANITY_PREVIEW=1 (server-rendered, drafts via draft mode).
const PREVIEW_ORIGIN = 'https://rhmmed-preview.vercel.app';

const articlesPage = { title: 'All articles', href: '/articles' };

// Sidebar: pages grouped the way the site is (men's and women's treatments, hubs, info pages), then the CMS collections.
const pageList = (S: StructureBuilder, title: string, filter: string) =>
  S.listItem().title(title).child(
    S.documentList().title(title).schemaType('page').filter(`_type == "page" && ${filter}`).defaultOrdering([{ field: 'path', direction: 'asc' }]),
  );
const structure = (S: StructureBuilder) =>
  S.list().title('RHM').items([
    S.listItem().title('Pages').child(
      S.list().title('Pages').items([
        pageList(S, "Men's treatments", 'string::startsWith(path, "/men/")'),
        pageList(S, "Women's treatments", 'string::startsWith(path, "/women/")'),
        pageList(S, 'Hubs (/men, /women)', 'path in ["/men", "/women"]'),
        pageList(S, 'Info pages', '!string::startsWith(path, "/men") && !string::startsWith(path, "/women")'),
      ]),
    ),
    S.divider(),
    ...S.documentTypeListItems().filter((i) => i.getId() !== 'page'),
  ]);

// RHM content (rhmmed.com). Project 9qg5x7wu lives in KHOD's Sanity org until handover to an RHM-owned account.
export default defineConfig({
  name: 'rhm',
  title: 'RHM',
  projectId: '9qg5x7wu',
  dataset: 'production',
  plugins: [
    presentationTool({
      title: 'Preview',
      previewUrl: { origin: PREVIEW_ORIGIN, preview: '/men', previewMode: { enable: '/api/draft-mode/enable' } },
      allowOrigins: [PREVIEW_ORIGIN],
      resolve: {
        // Which document a previewed URL edits (opens it beside the preview when you navigate there).
        mainDocuments: defineDocuments([
          { route: '/articles/:slug', filter: `_type == "article" && slug.current == $slug` },
          { route: '/:a', filter: `_type == "page" && path == "/" + $a` },
          { route: '/:a/:b', filter: `_type == "page" && path == "/" + $a + "/" + $b` },
        ]),
        // Which pages show each document (the "Used on" list and where a document opens in Preview).
        locations: {
          page: defineLocations({
            select: { path: 'path', title: 'title' },
            resolve: (doc) => ({ locations: doc?.path ? [{ title: doc.title || doc.path, href: doc.path }] : [] }),
          }),
          article: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({ locations: [{ title: doc?.title || 'Article', href: `/articles/${doc?.slug}` }, articlesPage] }),
          }),
          blogCategory: defineLocations({ select: {}, resolve: () => ({ locations: [articlesPage] }) }),
          author: defineLocations({ select: {}, resolve: () => ({ locations: [articlesPage] }) }),
          solution: defineLocations({ select: {}, resolve: () => ({ locations: [{ title: 'Home', href: '/' }] }) }),
        },
      },
    }),
    structureTool({ structure }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
});
