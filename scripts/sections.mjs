// Section heights on both sides after scrolling the whole page (so scroll-in animations and lazy images have settled).
// Usage: node scripts/sections.mjs <route> <width>   (LOCAL env overrides the local base URL)
import { chromium } from 'playwright';
const [route, w] = process.argv.slice(2);
const LOCAL = process.env.LOCAL || 'http://localhost:4400';
const b = await chromium.launch();
const res = {};
for (const [name, base] of [['orig', 'https://www.rhmmed.com'], ['local', LOCAL]]) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 } });
  await p.goto(base + route); await p.waitForTimeout(1500);
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 400) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(50); }
  await p.waitForTimeout(1500);
  res[name] = await p.evaluate(() => [...document.querySelectorAll('section')].filter(s => !s.querySelector('section') && !s.closest('footer'))
    .map(s => Math.round(s.getBoundingClientRect().height)));
  await p.close();
}
await b.close();
const n = Math.max(res.orig.length, res.local.length);
for (let i = 0; i < n; i++) console.log(String(i).padStart(2), String(res.orig[i] ?? '-').padStart(6), String(res.local[i] ?? '-').padStart(6), res.orig[i] !== res.local[i] ? '  <-- ' + ((res.local[i] ?? 0) - (res.orig[i] ?? 0)) : '');
