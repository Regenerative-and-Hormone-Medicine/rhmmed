// Structure audit on both sides: h1 count, heading-level skips, <img> without alt, links without an accessible name.
// Usage: node scripts/audit.mjs [route ...]   (default: every route in migration.json; LOCAL env for the local base)
import { chromium } from 'playwright';
import fs from 'node:fs';
const LOCAL = process.env.LOCAL || 'http://localhost:4400';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JSON.parse(fs.readFileSync('migration.json', 'utf8')).scores);
const b = await chromium.launch();
const probe = () => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const hs = [...document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')].filter(vis).map((h) => +h.tagName[1]);
  let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skips++;
  const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
  const noName = [...document.querySelectorAll('a[href],button')].filter((a) => vis(a) && !(a.textContent.trim() || a.getAttribute('aria-label') || a.querySelector('img[alt]:not([alt=""]),svg title'))).length;
  return { h1: document.querySelectorAll('h1').length, skips, noAlt, noName };
};
for (const r of routes) {
  const row = [];
  for (const base of ['https://www.rhmmed.com', LOCAL]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    try { await p.goto(base + r, { waitUntil: 'load', timeout: 45000 }); row.push(await p.evaluate(probe)); } catch (e) { row.push({ err: e.message.slice(0, 40) }); }
    await p.close();
  }
  const [o, l] = row, f = (x) => x.err ? x.err : `h1:${x.h1} skips:${x.skips} noAlt:${x.noAlt} unnamed:${x.noName}`;
  const flag = l.err || l.h1 !== 1 || l.noAlt || l.noName || l.skips > o.skips ? '  <--' : '';
  console.log(`${r.padEnd(46)} live ${f(o).padEnd(38)} local ${f(l)}${flag}`);
}
await b.close();
