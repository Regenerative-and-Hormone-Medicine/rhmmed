#!/usr/bin/env node
// Visual + structural comparison of the live Webflow site vs the local Astro rebuild.
//
//   node scripts/compare.mjs /                  # all widths, page score = worst width
//   node scripts/compare.mjs / --w 1440         # one width (iterate fast)
//   node scripts/compare.mjs / --structure      # also diff computed-style aggregates
//   node scripts/compare.mjs / --fresh          # re-capture the original (ignore cache)
//   node scripts/compare.mjs / --freeze         # put every Swiper carousel back on slide 1 on both sides (autoplay timing); implies --fresh
//
// Score per width = matching pixels over the overlapping height, multiplied by
// (shorter height / taller height) so a page of the wrong length can't score well.
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://www.rhmmed.com';
const LOCAL = process.env.LOCAL || 'http://localhost:4400'; // astro preview of dist/ — run `npx astro build` first
const WIDTHS = [1440, 991, 767, 390]; // one inside each Webflow range: desktop / tablet / mobile-l / mobile-p
const OUT = path.resolve('.compare');

const args = process.argv.slice(2);
const route = args.find((a) => a.startsWith('/')) || '/';
const flag = (n) => args.includes(n);
const wArg = args.indexOf('--w');
const widths = wArg >= 0 ? [Number(args[wArg + 1])] : WIDTHS;
const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '__');
fs.mkdirSync(path.join(OUT, slug), { recursive: true });

async function settle(page) {
  // Trigger scroll-driven animations / lazy images, then return to top.
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight;
    for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
    .w-webflow-badge,#hl_chat_widget,iframe[src*="googletagmanager"]{display:none!important}
    iframe.lc_reviews_widget{height:400px!important;visibility:hidden!important} /* third-party reviews: resizes unpredictably */` });
  // Neutralise GSAP/IX2 leftovers that keep elements mid-reveal.
  await page.evaluate(() => {
    document.querySelectorAll('[style*="opacity: 0"],[style*="opacity:0"]').forEach((el) => { el.style.opacity = '1'; });
    document.querySelectorAll('[style*="translate"]').forEach((el) => { el.style.transform = 'none'; });
  });
  if (args.includes('--freeze')) {
    await page.evaluate(() => document.querySelectorAll('.swiper').forEach((el) => { try { el.swiper?.slideTo(0, 0); } catch {} }));
  }
  await page.waitForTimeout(800);
}

async function capture(browser, url, width, file) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    if (!res || !res.ok()) throw new Error(`HTTP ${res?.status()} for ${url}`);
    await settle(page);
    await page.screenshot({ path: file, fullPage: true });
    return page;
  } catch (e) { await page.close(); throw e; }
}

async function structure(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const text = {};
    for (const sel of ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'a', 'button']) {
      const seen = {};
      document.querySelectorAll(sel).forEach((el) => {
        if (!vis(el) || !el.textContent.trim()) return;
        const s = getComputedStyle(el);
        const k = `${s.fontSize}/${s.lineHeight}/${s.fontWeight}/${s.letterSpacing}`;
        seen[k] = (seen[k] || 0) + 1;
      });
      text[sel] = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ×${n}`);
    }
    const widths = {};
    document.querySelectorAll('main *, body > div *').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.maxWidth !== 'none' && s.maxWidth.endsWith('px') && vis(el)) widths[s.maxWidth] = (widths[s.maxWidth] || 0) + 1;
    });
    const sections = [...document.querySelectorAll('section, header, footer')].filter(vis).map((el) => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return `${Math.round(r.height)}h pad ${s.paddingTop}/${s.paddingBottom} bg ${s.backgroundColor}`;
    });
    const colors = {};
    document.querySelectorAll('body *').forEach((el) => {
      if (!vis(el)) return; const s = getComputedStyle(el);
      if (el.childNodes[0]?.nodeType === 3 && el.textContent.trim()) colors['fg ' + s.color] = (colors['fg ' + s.color] || 0) + 1;
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors['bg ' + s.backgroundColor] = (colors['bg ' + s.backgroundColor] || 0) + 1;
    });
    return {
      height: document.documentElement.scrollHeight,
      text,
      maxWidths: Object.entries(widths).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).slice(0, 6),
      sections,
      colors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 12),
    };
  });
}

function score(fa, fb, fdiff) {
  const a = PNG.sync.read(fs.readFileSync(fa));
  const b = PNG.sync.read(fs.readFileSync(fb));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) img.data.copy(o.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4); return o; };
  const ca = crop(a), cb = crop(b), diff = new PNG({ width: w, height: h });
  const bad = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.15 });
  fs.writeFileSync(fdiff, PNG.sync.write(diff));
  const match = 1 - bad / (w * h);
  return { score: +(match * (h / Math.max(a.height, b.height)) * 100).toFixed(2), match: +(match * 100).toFixed(2), hOrig: a.height, hLocal: b.height };
}

const browser = await chromium.launch();
const results = [];
for (const width of widths) {
  const dir = path.join(OUT, slug);
  const fo = path.join(dir, `orig-${width}.png`), fl = path.join(dir, `local-${width}.png`);
  try {
    let po = null;
    if (flag('--fresh') || flag('--freeze') || flag('--structure') || !fs.existsSync(fo)) po = await capture(browser, ORIGIN + route, width, fo);
    const pl = await capture(browser, LOCAL + route, width, fl);
    const r = { width, ...score(fo, fl, path.join(dir, `diff-${width}.png`)) };
    if (flag('--structure')) {
      const [so, sl] = [await structure(po), await structure(pl)];
      fs.writeFileSync(path.join(dir, `structure-${width}.json`), JSON.stringify({ orig: so, local: sl }, null, 1));
      r.structure = path.join(dir, `structure-${width}.json`);
    }
    await po?.close(); await pl.close();
    results.push(r);
  } catch (e) {
    results.push({ width, error: String(e.message || e).split('\n')[0] });
  }
}
await browser.close();

for (const r of results) console.log(r.error ? `${r.width}px  ERROR ${r.error}` :
  `${r.width}px  score ${r.score}%  (pixel match ${r.match}%, height orig ${r.hOrig} / local ${r.hLocal})${r.structure ? '  → ' + r.structure : ''}`);
const ok = results.filter((r) => !r.error);
if (ok.length === results.length) console.log(`PAGE ${route}: worst = ${Math.min(...ok.map((r) => r.score))}%`);
else console.log(`PAGE ${route}: INCOMPLETE — ${results.length - ok.length} width(s) failed, no score`);
fs.writeFileSync(path.join(OUT, slug, 'last.json'), JSON.stringify({ route, at: new Date().toISOString(), results }, null, 1));
