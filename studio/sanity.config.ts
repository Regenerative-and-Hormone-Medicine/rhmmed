import { defineConfig } from 'sanity';
import { structureTool, type StructureBuilder } from 'sanity/structure';
import { presentationTool, defineLocations, defineDocuments } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { BookIcon, DocumentsIcon, HeartIcon, HomeIcon, InfoOutlineIcon, OlistIcon, PresentationIcon, UserIcon } from '@sanity/icons';
import { schemaTypes } from './schemaTypes';

// The editorial preview: the Astro site built with SANITY_PREVIEW=1 (server-rendered, drafts via draft mode).
const PREVIEW_ORIGIN = 'https://rhmmed-preview.vercel.app';

const articlesPage = { title: 'All articles', href: '/articles' };

// Sidebar = the site's navigation (src/data/nav.ts): one group per menu dropdown, pages in menu order, then the pages that are
// only linked from the footer or elsewhere. Testimonials, newsletters and research aren't shown (Evgenii, 2026-11-26): the site
// doesn't use them (reviews are the embedded Google reviews widget). Their documents stay in the dataset.
// Keep these lists in step with nav.ts when the menu changes.
type Item = [label: string, path: string];
const pid = (path: string) => (path === '/' ? 'page-home' : `page-${path.slice(1).replace(/\//g, '-')}`);
const pageItem = (S: StructureBuilder, [label, path]: Item, icon?: any) =>
  S.listItem().id(pid(path)).title(label).icon(icon).child(S.document().schemaType('page').documentId(pid(path)).title(label));
const navGroup = (S: StructureBuilder, title: string, icon: any, items: Item[]) =>
  S.listItem().id(title.toLowerCase().replace(/\W+/g, '-')).title(title).icon(icon).child(S.list().title(title).items(items.map((i) => pageItem(S, i))));
const MEN: Item[] = [['Men (hub page)', '/men'], ['Performance and Recovery', '/men/performance-recovery'], ['Metabolic Health', '/men/metabolic-health'],
  ['Hormone Therapy', '/men/hormone-therapy'], ['Longevity', '/men/longevity-clinic'], ['Peptide Therapy', '/men/peptide-therapy']];
const WOMEN: Item[] = [['Women (hub page)', '/women'], ['Perimenopause', '/women/perimenopause'], ['Menopause', '/women/menopause'],
  ['Postmenopause', '/women/postmenopause'], ['Weight Loss Resistance', '/women/weight-loss-resistance'], ['Thyroid', '/women/thyroid'],
  ['Hormone Replacement Therapy', '/women/hormone-replacement-therapy'], ['Sexual Health & Libido', '/women/sexual-health'],
  ['Peptide Therapy', '/women/peptide-therapy'], ['PCOS', '/women/pcos'], ['Endometriosis', '/women/endometriosis'], ['Inflammation', '/women/inflammation']];
const ABOUT: Item[] = [['Why us?', '/why-us'], ['Locations', '/location']];
const PATIENTS: Item[] = [['Patient information', '/patient-information'], ['Contact Page', '/contact'], ['Telehealth', '/telehealth']];
const OTHER: Item[] = [['FAQs', '/faq'], ['Scheduling', '/scheduling'], ['Advance Home Testing', '/advance-home-testing'],
  ['Cheating Death', '/cheating-death'], ['Privacy Policy', '/privacy-policy'], ['Terms of Use', '/terms-of-use']];
const structure = (S: StructureBuilder) =>
  S.list().title('RHM').items([
    pageItem(S, ['Home', '/'], HomeIcon),
    S.divider(),
    navGroup(S, 'Men', UserIcon, MEN),
    navGroup(S, 'Women', UserIcon, WOMEN),
    S.listItem().id('resources').title('Resources').icon(BookIcon).child(S.list().title('Resources').items([
      S.documentTypeListItem('article').title('Articles'),
      S.documentTypeListItem('blogCategory').title('Categories'),
      S.documentTypeListItem('author').title('Authors'),
    ])),
    navGroup(S, 'About', InfoOutlineIcon, ABOUT),
    pageItem(S, ['How it Works', '/how-it-works'], OlistIcon),
    navGroup(S, 'For Patients', HeartIcon, PATIENTS),
    S.divider(),
    navGroup(S, 'Other pages (footer & links)', DocumentsIcon, OTHER),
    S.documentTypeListItem('solution').title('Homepage carousel (Solutions)').icon(PresentationIcon),
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
          { route: '/', filter: `_type == "page" && path == "/"` },
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
