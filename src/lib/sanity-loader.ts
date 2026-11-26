// Astro content loader for the RHM Sanity project. It returns each document in the same shape the old
// file/glob loaders produced from src/content/, so pages and components didn't change.
import type { Loader } from 'astro/loaders';
import fs from 'node:fs';
import { decodePage } from './page-codec.mjs';
import { snapshotPages } from './page-snapshot.mjs';
import { richHtml, imageSrc, resolveImages } from './portable-text.mjs';

// SANITY_DATASET=pt-staging builds from the Portable Text staging dataset (phase 3); the default stays `production`.
export const SANITY = { projectId: '9qg5x7wu', dataset: process.env.SANITY_DATASET || 'production', apiVersion: '2025-02-19' };

// Published documents only (the dataset is public; drafts are never returned without a token anyway).
async function query<T>(groq: string, params: Record<string, string>): Promise<T> {
  const u = new URL(`https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}`);
  u.searchParams.set('query', groq);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v));
  u.searchParams.set('perspective', 'published');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result as T;
}

// "<type>-<webflow id>" → "<webflow id>" (the ids the site has always used, e.g. author "rand-mcclain-do").
const rawId = (type: string, id: string) => id.slice(type.length + 1);

// Map a Sanity document to the entry shape the old file loaders produced. Shared by the build-time loader and the
// request-time preview (src/lib/content.ts), so both render identically.
export function toEntry(type: string, d: any, withBody = false) {
  const { _id, _type, _rev, _createdAt, _updatedAt, _originalId, _system, body, ...fields } = d;
  const data: Record<string, any> = { ...fields, slug: d.slug?.current ?? '' };
  // Phase 3 shapes (Portable Text, image assets) → the HTML strings and URLs the templates have always read. Old shapes
  // (Webflow HTML strings, site paths) pass through unchanged, so `production` builds exactly as before.
  for (const f of ['summary', 'bio']) if (f in data && (type === 'article' || type === 'author')) data[f] = richHtml(data[f], SANITY);
  for (const f of ['image', 'profile']) if (f in data && ['article', 'author', 'solution'].includes(type)) data[f] = imageSrc(data[f], SANITY);
  if (type === 'article') {
    // CMS-driven cards and CTA (2026-11-26). Missing on documents that predate the fields (production before the cutover):
    // the template then falls back to the live-page JSON (src/data/articles), so that build doesn't change.
    data.audience = d.audience ?? '';
    data.related = Array.isArray(d.relatedArticles) ? d.relatedArticles.map((r: any) => rawId('article', r._ref)) : null;
    delete data.relatedArticles;
    data.imageAlt = typeof d.image === 'object' && d.image ? d.image.alt ?? '' : '';
    data.cardImage = d.cardImage ? imageSrc(d.cardImage, SANITY) : '';
    data.cardImageAlt = d.cardImage?.alt ?? '';
    data.author = d.author?._ref ? rawId('author', d.author._ref) : '';
    data.category = (d.categories ?? []).map((c: any) => rawId('blogCategory', c._ref)).join('; ');
    delete data.categories;
    data.date ??= null;
    data.datePublished ??= null;
  }
  if (type === 'newsletter') data.releaseDate ??= null;
  if (type === 'articleCta') {
    data.image = d.image ? { src: imageSrc(d.image, SANITY), alt: d.image.alt ?? '' } : null;
    data.points ??= [];
    data.button ??= null;
  }
  if (!withBody && body !== undefined) data.body = type === 'article' ? richHtml(body, SANITY) : body; // research has `body` as an ordinary field
  const html = type === 'article' ? richHtml(body, SANITY) : body;
  return { id: rawId(type, _id), data, body: withBody ? html ?? '' : undefined };
}

// Page-builder pages (Sanity `page` documents) → the page JSON SectionPage renders, keyed by path ("/men/pcos").
export const PAGES_QUERY = '*[_type == "page"] | order(order asc)';

// Pages moved into the builder whose documents aren't imported into Sanity yet. Until they are, the build takes them from
// the page JSON snapshot, encoded exactly as `npm run import:pages` would send them. Once Sanity has a document for a path,
// Sanity wins. Empty this list after the import. (Home, /contact, /scheduling were imported 2026-11-26.)
const NOT_YET_IMPORTED: string[] = [];

// PAGES_SOURCE=ndjson: read every page from .sanity-import/pages.ndjson (the file `npm run import:pages` sends) instead of
// Sanity, to check that the import renders the same site before running it.
async function pageDocs(logger: { info: (m: string) => void; warn: (m: string) => void }): Promise<any[]> {
  if (process.env.PAGES_SOURCE === 'ndjson') {
    const docs = fs.readFileSync('.sanity-import/pages.ndjson', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    logger.info(`${docs.length} page documents from .sanity-import/pages.ndjson (PAGES_SOURCE=ndjson)`);
    return docs;
  }
  const docs = await query<any[]>(PAGES_QUERY, {});
  const have = new Set(docs.map((d) => d.path));
  const missing = NOT_YET_IMPORTED.filter((p) => !have.has(p));
  if (missing.length) {
    const snap = new Map(snapshotPages().map(({ doc }) => [doc.path, doc]));
    for (const p of missing) docs.push(snap.get(p));
    logger.warn(`not in Sanity yet, built from the page JSON snapshot: ${missing.join(', ')} (run npm run import:pages)`);
  }
  return docs;
}

export function sanityPagesLoader(): Loader {
  return {
    name: 'sanity-page',
    load: async ({ store, generateDigest, logger }) => {
      const docs = await pageDocs(logger);
      if (!docs.length) throw new Error('Sanity returned no "page" documents; refusing to build without the pages.');
      store.clear();
      for (const d of docs) store.set({ id: d.path, data: decodePage(resolveImages(d, SANITY)), digest: generateDigest(d) });
      logger.info(`${docs.length} page documents from Sanity`);
    },
  };
}

// `optional`: a type that may have no documents yet (articleCta before the cutover): an empty collection, not an error.
export function sanityLoader(type: string, opts: { withBody?: boolean; optional?: boolean } = {}): Loader {
  return {
    name: `sanity-${type}`,
    load: async ({ store, parseData, generateDigest, logger }) => {
      const docs = await query<any[]>('*[_type == $type] | order(order asc)', { type });
      if (!docs.length && !opts.optional) throw new Error(`Sanity returned no "${type}" documents; refusing to build an empty collection.`);
      store.clear();
      for (const d of docs) {
        const { id, data, body } = toEntry(type, d, opts.withBody);
        const parsed = await parseData({ id, data });
        store.set({ id, data: parsed, body, digest: generateDigest(d) });
      }
      logger.info(`${docs.length} ${type} documents from Sanity`);
    },
  };
}
