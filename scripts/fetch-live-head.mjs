// Copies, verbatim from live rhmmed.com, what the rebuild must match in each page head (Evgenii, 2026-11-24:
// live is the source of truth for now): the head JSON-LD blocks and the robots meta. Also live's sitemap.xml and robots.txt.
// node scripts/fetch-live-head.mjs  → src/data/live-head.json, public/sitemap.xml, public/robots.txt
import fs from 'node:fs';

const SITE = 'https://www.rhmmed.com';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.text(); };

const sitemap = await get(`${SITE}/sitemap.xml`);
const robotsTxt = await get(`${SITE}/robots.txt`);
const out = {};
for (const loc of [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])) {
  const html = await get(loc);
  const head = html.split('</head>')[0];
  const path = loc.replace(SITE, '') || '/';
  const jsonld = [...head.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const robots = head.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/)?.[1] ?? null;
  out[path] = { robots, jsonld };
}
fs.writeFileSync('src/data/live-head.json', JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync('public/sitemap.xml', sitemap);
fs.writeFileSync('public/robots.txt', robotsTxt);
console.log(Object.keys(out).length, 'pages;', Object.values(out).filter((v) => v.jsonld.length).length, 'with head JSON-LD');
