// One place pages read CMS content from.
// - Normal (static) build: the Astro content collections, filled from Sanity at build time. Output is unchanged.
// - Preview build (SANITY_PREVIEW=1, the editorial preview behind the Studio's Presentation tool): fetched from Sanity on
//   every request, with drafts when the visitor came in through the Studio (draft-mode cookie), and with invisible
//   "stega" markers in strings so a click on any text opens that field in the Studio.
import { getCollection, getEntry } from 'astro:content';
import type { AstroGlobal } from 'astro';
import { SANITY, toEntry } from './sanity-loader';

export const isPreview: boolean = __RHM_PREVIEW__;
export const STUDIO_URL = 'https://rhmmed.sanity.studio';
export const DRAFT_COOKIE = 'rhm-draft';

type Ctx = Pick<AstroGlobal, 'cookies'>;
type Entry = { id: string; data: any; body?: string; edit?: (path: string) => Record<string, string> };

const TYPES = { articles: 'article', authors: 'author', blogCategories: 'blogCategory', solutions: 'solution', articleCtas: 'articleCta' } as const;
type Coll = keyof typeof TYPES;

// Fields that are HTML, URLs, image paths or ids: never stega-encoded (markers would break them). The body and summary
// get a data-sanity attribute on their container instead (Entry.edit).
const NO_STEGA = new Set(['body', 'summary', 'bio', 'paragraph', 'image', 'profile', 'link', 'heroBtnLink', 'current', 'metaTitle', 'audience', 'theme', 'href', 'cardImage']);

export function inDraftMode(ctx: Ctx) {
  const secret = process.env.PREVIEW_COOKIE_SECRET;
  return isPreview && !!secret && ctx.cookies.get(DRAFT_COOKIE)?.value === secret;
}

async function fetchPreview(ctx: Ctx, coll: Coll): Promise<Entry[]> {
  const { createClient } = await import('@sanity/client');
  const { createDataAttribute } = await import('@sanity/visual-editing/create-data-attribute');
  const drafts = inDraftMode(ctx);
  const client = createClient({
    projectId: SANITY.projectId,
    dataset: SANITY.dataset,
    apiVersion: SANITY.apiVersion,
    useCdn: false,
    perspective: drafts ? 'drafts' : 'published',
    token: drafts ? process.env.SANITY_VIEWER_TOKEN : undefined,
    stega: {
      enabled: drafts,
      studioUrl: STUDIO_URL,
      // Any segment, not just the last: inside a Portable Text body (body[3].children[0].text, htmlEmbed .html) nothing
      // gets markers, as with the HTML string before, so embedded scripts and JSON-LD stay intact.
      filter: (p) => (p.sourcePath.some((s) => NO_STEGA.has(String(s))) ? false : p.filterDefault(p)),
    },
  });
  const type = TYPES[coll];
  const docs = await client.fetch<any[]>('*[_type == $type] | order(order asc)', { type });
  return docs.map((d) => {
    const e: Entry = toEntry(type, d, coll === 'articles');
    if (drafts) {
      const attr = createDataAttribute({ projectId: SANITY.projectId, dataset: SANITY.dataset, baseUrl: STUDIO_URL, id: d._id, type });
      e.edit = (path) => ({ 'data-sanity': attr(path).toString() });
    }
    return e;
  });
}

// Page-builder fields that are markup, paths, URLs or layout switches the components compare against: never stega-encoded.
const PAGE_NO_STEGA = /^(src|href|path|headerTheme|variant|cls|tag|kind|pad|extraOverlay|grid|spacers|icon|html|lines|cells|value|stat|num|poster|mp4|webm|tint|frameId|articles|solutions)$|Max$|Class$|Tag$|Style$|Kind$/;

/** One page-builder page (treatment, hub or info page) by path, decoded to the JSON SectionPage renders. */
export async function page(ctx: Ctx, path: string): Promise<{ data: any; edit?: (p: string) => Record<string, string> } | undefined> {
  if (!isPreview) {
    const e = await getEntry('pages', path);
    return e ? { data: e.data } : undefined;
  }
  const { createClient } = await import('@sanity/client');
  const { decodePage } = await import('./page-codec.mjs');
  const drafts = inDraftMode(ctx);
  const client = createClient({
    projectId: SANITY.projectId,
    dataset: SANITY.dataset,
    apiVersion: SANITY.apiVersion,
    useCdn: false,
    perspective: drafts ? 'drafts' : 'published',
    token: drafts ? process.env.SANITY_VIEWER_TOKEN : undefined,
    stega: {
      enabled: drafts,
      studioUrl: STUDIO_URL,
      filter: (p) => {
        const last = String(p.sourcePath.filter((s) => typeof s === 'string').at(-1));
        // Page-level fields (meta title/description, header theme) go into <head> and attributes, not visible text.
        if (p.sourcePath.length === 1) return false;
        // Empty strings stay empty: components test them (`body && <p>…`), and a marker would render an empty element.
        if (!p.value.trim()) return false;
        // HTML strings are rendered with set:html; keep markers out of their tags and attributes.
        if (PAGE_NO_STEGA.test(last) || /<[a-z]/i.test(p.value)) return false;
        return p.filterDefault(p);
      },
    },
  });
  const doc = await client.fetch<any>('*[_type == "page" && path == $path][0]', { path });
  const { resolveImages } = await import('./portable-text.mjs');
  return doc ? { data: decodePage(resolveImages(doc, SANITY)) } : undefined;
}

export async function list(ctx: Ctx, coll: Coll): Promise<Entry[]> {
  if (isPreview) return fetchPreview(ctx, coll);
  return (await getCollection(coll)) as Entry[];
}

export async function one(ctx: Ctx, coll: Coll, id: string): Promise<Entry | undefined> {
  if (isPreview) return (await fetchPreview(ctx, coll)).find((e) => e.id === id);
  return (await getEntry(coll, id)) as Entry | undefined;
}
