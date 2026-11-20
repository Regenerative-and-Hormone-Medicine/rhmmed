#!/usr/bin/env node
// First places where two pages' text/media elements diverge in position or size, within a container selector.
//   node scripts/diverge.mjs /articles/pt-141 1440 ".blog-single_content" ".blog-rte"
import { chromium } from 'playwright';
const [route, w = '1440', selO = 'main', selL = selO] = process.argv.slice(2);
const LOCAL = process.env.LOCAL || 'http://localhost:4400';
const b = await chromium.launch();
const res = {};
for (const [n, u, sel] of [['o', 'https://www.rhmmed.com' + route, selO], ['l', LOCAL + route, selL]]) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 } });
  await p.goto(u, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  res[n] = await p.evaluate((sel) => {
    const c = document.querySelector(sel);
    const t = c.getBoundingClientRect().top;
    return [...c.querySelectorAll('h1,h2,h3,h4,p,li,img,figure,table,blockquote,iframe')].filter((e) => e.getBoundingClientRect().height)
      .map((e) => { const r = e.getBoundingClientRect(); return [e.tagName, Math.round(r.top - t), Math.round(r.height), Math.round(r.width), (e.textContent || e.getAttribute('src') || '').trim().slice(0, 36)]; });
  }, sel);
  await p.close();
}
await b.close();
// Report where the vertical offset between matching elements changes (spacing differences).
let prev = 0, jumps = 0;
for (let i = 0; i < Math.min(res.o.length, res.l.length) && jumps < 8; i++) {
  const d = res.l[i][1] - res.o[i][1];
  if (Math.abs(d - prev) > 2) { console.log('offset', prev, '->', d, 'at', i, JSON.stringify(res.o[i]), '|', JSON.stringify(res.l[i])); prev = d; jumps++; }
}
let shown = 0;
for (let i = 0; i < Math.max(res.o.length, res.l.length) && shown < 10; i++) {
  const a = res.o[i] || [], c = res.l[i] || [];
  if (a[0] !== c[0] || a[2] !== c[2] || a[3] !== c[3]) { console.log(i, JSON.stringify(a), '|', JSON.stringify(c)); shown++; }
}
console.log('elements', res.o.length, res.l.length);
