// SEO crawl: node scripts/seo-crawl.mjs <base-url> <out.json> [--paths-from https://www.rhmmed.com/sitemap.xml]
// Reads every URL in the live sitemap, fetches it from <base-url> (live or a local build server) and records
// status, final URL, title, meta description, H1s, canonical, robots, OG tags, JSON-LD types, and internal links.
import fs from 'node:fs';

const [base, out] = process.argv.slice(2);
const sitemapUrl = 'https://www.rhmmed.com/sitemap.xml';
const LIVE = 'https://www.rhmmed.com';

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? decode(m[2] ?? m[3]) : null; };
const meta = (html, key, val) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) if ((attr(m[0], key) || '').toLowerCase() === val) return attr(m[0], 'content');
  return null;
};

const sm = await (await fetch(sitemapUrl)).text();
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/');

const rows = [];
async function crawl(p) {
  const url = base.replace(/\/$/, '') + (p === '/' ? '/' : p);
  const r = await fetch(url, { redirect: 'manual' });
  let status = r.status, location = r.headers.get('location');
  let html = '';
  if (status >= 300 && status < 400 && location) {
    const r2 = await fetch(new URL(location, url));
    html = await r2.text();
  } else html = await r.text();
  const head = html.split(/<\/head>/i)[0];
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const canon = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => (attr(t, 'rel') || '').toLowerCase() === 'canonical');
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
  const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => {
    try { const j = JSON.parse(m[1]); const arr = Array.isArray(j) ? j : j['@graph'] || [j]; return arr.map((x) => x['@type']).flat(); } catch { return ['INVALID']; }
  });
  const links = [...new Set([...html.matchAll(/<a\b[^>]*href\s*=\s*"([^"#]+)/gi)].map((m) => decode(m[1]))
    .filter((h) => h.startsWith('/') || h.startsWith(LIVE) || h.startsWith('https://rhmmed.com'))
    .map((h) => (new URL(h, LIVE).pathname.replace(/\/$/, '') || '/')))];
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  rows.push({
    path: p, status, location,
    title: title ? decode(title).trim() : null,
    description: meta(head, 'name', 'description'),
    h1: h1s, canonical: canon ? attr(canon, 'href') : null,
    robots: meta(head, 'name', 'robots'),
    ogTitle: meta(head, 'property', 'og:title'), ogDescription: meta(head, 'property', 'og:description'),
    ogImage: meta(head, 'property', 'og:image'), twitterCard: meta(head, 'name', 'twitter:card'),
    jsonld: ld, links,
    imgCount: imgs.length, imgNoAlt: imgs.filter((t) => attr(t, 'alt') === null).length,
    imgNoSize: imgs.filter((t) => !attr(t, 'width') || !attr(t, 'height')).length,
  });
}
const queue = [...paths];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await crawl(queue.shift()); }));
rows.sort((a, b) => paths.indexOf(a.path) - paths.indexOf(b.path));
fs.writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`${rows.length} urls → ${out}`);
