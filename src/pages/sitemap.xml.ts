// sitemap.xml at the same URL as the live site (Search Console already has it). Built from the same sources as the
// routes, so a new page or article appears automatically. Only canonical, indexable 200 URLs: noindex pages are left out.
import { getCollection } from 'astro:content';
import { NOINDEX } from '../data/seo';

const SITE = 'https://www.rhmmed.com';

export async function GET() {
  const pages = import.meta.glob<{ default: { path: string } }>(
    ['../data/hubs/*.json', '../data/pages/*.json', '../data/treatments/*.json'],
    { eager: true },
  );
  const articles = await getCollection('articles');
  const paths = [
    '/',
    ...Object.values(pages).map((m) => m.default.path),
    '/articles',
    ...articles.map((a) => `/articles/${a.data.slug}`),
    '/contact',
    '/scheduling',
  ].filter((p) => !NOINDEX.has(p));
  const lastmod = new Map(articles.map((a) => [`/articles/${a.data.slug}`, a.data.datePublished || a.data.date]));
  const urls = [...new Set(paths)].map((p) => {
    const lm = lastmod.get(p);
    return `  <url>\n    <loc>${p === '/' ? SITE : SITE + p}</loc>${lm ? `\n    <lastmod>${lm}</lastmod>` : ''}\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
