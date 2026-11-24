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

export function sanityLoader(type: string, opts: { withBody?: boolean } = {}): Loader {
  return {
    name: `sanity-${type}`,
    load: async ({ store, parseData, generateDigest, logger }) => {
      const docs = await query<any[]>('*[_type == $type] | order(order asc)', { type });
      if (!docs.length) throw new Error(`Sanity returned no "${type}" documents; refusing to build an empty collection.`);
      store.clear();
      for (const d of docs) {
        const { _id, _type, _rev, _createdAt, _updatedAt, body, ...fields } = d;
        const data: Record<string, unknown> = { ...fields, slug: d.slug?.current ?? '' };
        if (type === 'article') {
          data.author = d.author?._ref ? rawId('author', d.author._ref) : '';
          data.category = (d.categories ?? []).map((c: any) => rawId('blogCategory', c._ref)).join('; ');
          delete data.categories;
          data.date ??= null;
          data.datePublished ??= null;
        }
        if (type === 'newsletter') data.releaseDate ??= null;
        if (!opts.withBody && body !== undefined) data.body = body; // research has `body` as an ordinary field
        const id = rawId(type, _id);
        const parsed = await parseData({ id, data });
        store.set({ id, data: parsed, body: opts.withBody ? body ?? '' : undefined, digest: generateDigest(d) });
      }
      logger.info(`${docs.length} ${type} documents from Sanity`);
    },
  };
}
