// Release check for the Portable Text + CMS components cutover (2026-11-27).
//   node scripts/release-check.mjs <base> [<reference base>]
// <base> may carry a ?_vercel_share=… token (visited once to set the cookie). Compares every article on <base> with the
// reference (default https://www.rhmmed.com, i.e. live before the cutover): body text, body link targets, images that load.
// Then checks Evgenii's 7 asks (2026-11-26) and og:image (200 + image/jpeg) on <base>.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [baseArg, refArg = 'https://www.rhmmed.com'] = process.argv.slice(2);
const u = new URL(baseArg);
const share = u.searchParams.get('_vercel_share');
const BASE = u.origin;
const REF = refArg.replace(/\/$/, '');
const slugs = fs.readdirSync('src/data/articles').map((f) => f.replace(/^articles__|\.json$/g, ''));
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
if (share) await page.goto(`${BASE}/?_vercel_share=${share}`, { waitUntil: 'networkidle' });

async function article(origin, slug) {
  await page.goto(`${origin}/articles/${slug}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager'));
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
  });
  await page.waitForLoadState('networkidle');
  return page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const body = [...document.querySelectorAll('.blog-rte, .summary-rte')];
    const imgs = [...document.querySelectorAll('main img')];
    return {
      title: norm(document.querySelector('h1')?.textContent ?? ''),
      text: norm(body.map((b) => b.innerText).join(' ')),
      links: body.flatMap((b) => [...b.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))),
      bodyImgs: body.reduce((n, b) => n + b.querySelectorAll('img').length, 0),
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      og: document.querySelector('meta[property="og:image"]')?.content ?? null,
    };
  });
}

const ogs = new Set();
for (const slug of process.env.SKIP_ARTICLES ? [] : slugs) {
  const [a, b] = [await article(BASE, slug), await article(REF, slug)];
  const diffs = [];
  if (a.title !== b.title) diffs.push('title');
  if (a.text !== b.text) {
    let i = 0; while (i < a.text.length && a.text[i] === b.text[i]) i++;
    diffs.push(`text @${i}: "${a.text.slice(i, i + 60)}" vs "${b.text.slice(i, i + 60)}"`);
  }
  // The perimenopause source fix (one of the 7 asks) is the only link change allowed.
  const la = a.links.join('\n'), lb = b.links.join('\n');
  if (la !== lb) diffs.push(`links ${a.links.filter((x) => !b.links.includes(x)).join(' ')} | ref ${b.links.filter((x) => !a.links.includes(x)).join(' ')}`);
  if (a.bodyImgs !== b.bodyImgs) diffs.push(`body images ${a.bodyImgs} vs ${b.bodyImgs}`);
  if (a.broken.length) diffs.push(`broken images ${a.broken.join(' ')}`);
  if (a.og) ogs.add(a.og);
  ok(`article /articles/${slug} same as reference`, diffs.length === 0, diffs.join('; '));
}

// ---- the 7 asks ----
const homeData = () => {
  const sec = [...document.querySelectorAll('section')].find((s) => /Research & Insights/i.test(s.querySelector('h2')?.textContent ?? ''));
  const slider = [...document.querySelectorAll('section')].find((s) => /Personalized physician-led/i.test(s.textContent));
  return {
    cards: sec ? [...sec.querySelectorAll('a[href^="/articles/"]')].map((a) => a.getAttribute('href')) : [],
    slides: slider ? [...slider.querySelectorAll('h3, h4, h5')].map((h) => h.textContent.trim()) : [],
    og: document.querySelector('meta[property="og:image"]')?.content ?? null,
  };
};
await page.goto(`${REF}/`, { waitUntil: 'networkidle' });
const refSlides = (await page.evaluate(homeData)).slides;
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const home = await page.evaluate(homeData);
ok('1 homepage slider = Solutions, same slides and order as reference', home.slides.length === 5 && home.slides.join('|') === refSlides.join('|'), home.slides.join(' / '));
ok('2 homepage Research & Insights cards from Sanity', home.cards.length >= 3, home.cards.join(' '));
if (home.og) ogs.add(home.og);
ok('homepage has og:image', !!home.og, home.og ?? 'none');

// 3. equal card image heights + hover zoom, on a page with a card row
await page.goto(`${BASE}/women/perimenopause`, { waitUntil: 'networkidle' });
const cards = await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find((s) => /Research & Insights/i.test(s.querySelector('h2')?.textContent ?? ''));
  const imgs = sec ? [...sec.querySelectorAll('img')] : [];
  return { h: imgs.map((i) => Math.round(i.getBoundingClientRect().height)), zoom: imgs.every((i) => /group-hover:scale-105/.test(i.className)) };
});
ok('3 card images equal height + hover zoom', cards.h.length > 1 && new Set(cards.h).size === 1 && cards.zoom, `heights ${cards.h.join(',')}`);
// 4. perimenopause source
const peri = await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => /Research now shows/i.test(a.textContent))?.getAttribute('href'));
ok('4 perimenopause "Research now shows" → PMC8549458', peri === 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8549458/', peri ?? 'missing');
// 5. CTA by audience
const ctaBg = async (slug) => {
  await page.goto(`${BASE}/articles/${slug}`, { waitUntil: 'networkidle' });
  return page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((x) => /Start with clarity/i.test(x.textContent));
    // the coloured block (slate or brown) around the CTA heading
    for (let el = h; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (c === 'rgb(84, 122, 149)' || c === 'rgb(122, 75, 79)') return c; }
    return null;
  });
};
const men = await ctaBg('trt-cost'), women = await ctaBg('estrogen-dominance'), gen = await ctaBg('peptide-therapy');
ok('5 article CTA: men blue, women + general maroon', men === 'rgb(84, 122, 149)' && women === 'rgb(122, 75, 79)' && gen === 'rgb(122, 75, 79)', `men ${men}, women ${women}, general ${gen}`);
// 6. article link hover (desktop)
await page.goto(`${BASE}/articles/estrogen-dominance`, { waitUntil: 'networkidle' });
const link = page.locator('.blog-rte a:not([class])').first();
await link.scrollIntoViewIfNeeded();
await link.hover(); await page.waitForTimeout(400);
const hov = await link.evaluate((a) => getComputedStyle(a).color);
ok('6 article link hover turns brand blue at 1440', hov === 'rgb(45, 98, 255)', hov);
const related = await page.evaluate(() => !![...document.querySelectorAll('h2')].find((x) => /Related Articles/i.test(x.textContent)));
ok('  related articles section from Sanity', related);
// 7. /articles hero centred
await page.goto(`${BASE}/articles`, { waitUntil: 'networkidle' });
const hero = await page.evaluate(() => {
  const s = document.querySelector('section');
  const [t, p] = s.querySelector('.container-site').children;
  const a = t.firstElementChild.getBoundingClientRect(), b = p.getBoundingClientRect(), c = t.lastElementChild.getBoundingClientRect();
  return { top: Math.round(a.top - b.top), bottom: Math.round(b.bottom - c.bottom) };
});
ok('7 /articles hero text centred at 1440', Math.abs(hero.top - hero.bottom) <= 2, `gap above ${hero.top}, below ${hero.bottom}`);

// ---- og:image ----
for (const og of ogs) {
  const r = await fetch(og);
  ok(`og:image ${og.replace(/^https:\/\/[^/]+/, '').slice(0, 70)}…`, r.status === 200 && r.headers.get('content-type') === 'image/jpeg', `${r.status} ${r.headers.get('content-type')}`);
}
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
