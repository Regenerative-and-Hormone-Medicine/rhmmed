// Astro content loader for the RHM Sanity project. It returns each document in the same shape the old
// file/glob loaders produced from src/content/, so pages and components didn't change.
import type { Loader } from 'astro/loaders';

export const SANITY = { projectId: '9qg5x7wu', dataset: 'production', apiVersion: '2025-02-19' };

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
  if (type === 'article') {
    data.author = d.author?._ref ? rawId('author', d.author._ref) : '';
    data.category = (d.categories ?? []).map((c: any) => rawId('blogCategory', c._ref)).join('; ');
    delete data.categories;
    data.date ??= null;
    data.datePublished ??= null;
  }
  if (type === 'newsletter') data.releaseDate ??= null;
  if (!withBody && body !== undefined) data.body = body; // research has `body` as an ordinary field
  return { id: rawId(type, _id), data, body: withBody ? body ?? '' : undefined };
}

export function sanityLoader(type: string, opts: { withBody?: boolean } = {}): Loader {
  return {
    name: `sanity-${type}`,
    load: async ({ store, parseData, generateDigest, logger }) => {
      const docs = await query<any[]>('*[_type == $type] | order(order asc)', { type });
      if (!docs.length) throw new Error(`Sanity returned no "${type}" documents; refusing to build an empty collection.`);
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
