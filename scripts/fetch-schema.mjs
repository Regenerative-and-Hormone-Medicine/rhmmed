// Copies the page-level JSON-LD that the live site puts in <head> (Webflow page custom code) into
// src/data/schema/<path>.json, so the rebuild ships the same structured data. Article BlogPosting is NOT copied:
// it comes from a CMS template and is generated in src/pages/articles/[slug].astro instead.
// Usage: node scripts/fetch-schema.mjs
import fs from 'node:fs';

const LIVE = 'https://www.rhmmed.com';
const sm = await (await fetch(`${LIVE}/sitemap.xml`)).text();
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/')
  .filter((p) => !p.startsWith('/articles/'));
fs.mkdirSync('src/data/schema', { recursive: true });
for (const p of paths) {
  const html = await (await fetch(LIVE + p)).text();
  const head = html.split(/<\/head>/i)[0];
  const blocks = [...head.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => JSON.parse(m[1]));
  const file = `src/data/schema/${p === '/' ? 'home' : p.slice(1).replace(/\//g, '__')}.json`;
  if (blocks.length) { fs.writeFileSync(file, JSON.stringify(blocks, null, 2) + '\n'); console.log(p, blocks.map((b) => b['@type'])); }
  else if (fs.existsSync(file)) fs.unlinkSync(file);
}
