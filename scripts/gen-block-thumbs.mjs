// Screenshots one rendered example of every page-builder block for the Studio's "Add section" grid
// (studio/static/block-previews/<type>.jpg, served by the Studio at /static/block-previews/…). Same idea as KHOD's Studio.
// Walks the page JSON, maps each page's sections to <main>'s rendered children in order, and keeps the first example per type.
// Pages whose rendered children don't line up one-to-one with their sections are skipped.
// Usage: BASE=http://localhost:4619 node scripts/gen-block-thumbs.mjs   (a running `astro preview` of the current build)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4400';
const OUT = 'studio/static/block-previews';
fs.mkdirSync(OUT, { recursive: true });

const dirs = ['src/data/hubs', 'src/data/treatments', 'src/data/pages'];
const pages = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))));

const done = new Map();
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
for (const p of pages) {
  const want = p.sections.map((s) => s.type).filter((t) => !done.has(t));
  if (!want.length) continue;
  await tab.goto(BASE + p.path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await tab.waitForTimeout(800);
  // Scroll through so lazy images and reveal animations settle.
  await tab.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await tab.waitForTimeout(600);
  // The fixed site header would sit on top of every shot.
  await tab.addStyleTag({ content: 'header[data-header] { visibility: hidden !important; }' });
  const kids = await tab.$$('main > :not(script):not(style):not(template)');
  if (kids.length !== p.sections.length) { console.log(`skip ${p.path}: ${kids.length} elements for ${p.sections.length} sections`); continue; }
  for (let i = 0; i < kids.length; i++) {
    const type = p.sections[i].type;
    if (done.has(type)) continue;
    const box = await kids[i].boundingBox();
    if (!box || box.height < 40) continue; // hidden (e.g. related articles with no cards)
    const clip = { x: 0, y: box.y, width: 1440, height: Math.min(box.height, 1100) };
    await kids[i].scrollIntoViewIfNeeded();
    const b2 = await kids[i].boundingBox();
    await tab.screenshot({ path: `${OUT}/${type}.jpg`, type: 'jpeg', quality: 70, clip: { ...clip, y: b2.y + (await tab.evaluate(() => scrollY)) }, fullPage: true, animations: 'disabled' });
    done.set(type, p.path);
    console.log(`  ✓ ${type}  (${p.path})`);
  }
}
await browser.close();
console.log(`\n${done.size} thumbnails in ${OUT}`);
