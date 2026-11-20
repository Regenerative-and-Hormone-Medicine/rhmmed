#!/usr/bin/env node
// Side-by-side element boxes inside one section of the original vs the rebuild.
//   node scripts/inspect.mjs /women/menopause 390 6     → section #6 (0-based, <section> order) at 390px
// Lists leaf-ish elements (text or images) with their offset from the section top and their height.
import { chromium } from 'playwright';
const [route, w = '1440', idx = '0'] = process.argv.slice(2);
const sides = [['orig', 'https://www.rhmmed.com' + route], ['local', (process.env.LOCAL || 'http://localhost:4400') + route]];
const b = await chromium.launch();
const out = {};
for (const [name, url] of sides) {
  const p = await b.newPage({ viewport: { width: +w, height: 900 } });
  await p.goto(url, { waitUntil: 'networkidle' });
  out[name] = await p.evaluate((i) => {
    const sec = [...document.querySelectorAll('main section, body section')].filter((s, k, a) => a.indexOf(s) === k)[i];
    if (!sec) return ['(no section)'];
    const top = sec.getBoundingClientRect().top;
    const rows = [];
    sec.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.height || getComputedStyle(el).visibility === 'hidden') return;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own && el.tagName !== 'IMG') return;
      const s = getComputedStyle(el);
      rows.push(`${String(Math.round(r.top - top)).padStart(5)} +${String(Math.round(r.height)).padEnd(4)} w${String(Math.round(r.width)).padEnd(4)} ${el.tagName.toLowerCase()} ${s.fontSize}/${s.lineHeight} ${(el.textContent || el.getAttribute('alt') || '').trim().slice(0, 34)}`);
    });
    return [`section h=${Math.round(sec.getBoundingClientRect().height)}`, ...rows.slice(0, 40)];
  }, +idx);
  await p.close();
}
await b.close();
const n = Math.max(out.orig.length, out.local.length);
for (let i = 0; i < n; i++) console.log((out.orig[i] || '').padEnd(80).slice(0, 80), '|', out.local[i] || '');
