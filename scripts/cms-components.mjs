// CMS-driven cards, CTA and slider (Evgenii, 2026-11-26). Runs after scripts/html-to-pt.mjs on the same dataset.
//
//   node scripts/cms-components.mjs --check                 print what it would write (reads the dataset, writes nothing)
//   node scripts/cms-components.mjs --dataset pt-staging    write it
//
// What it writes (idempotent: every value is recomputed and `set` again):
//   article.audience          men / women / general (AUDIENCE below)
//   article.relatedArticles   references, from the live "Related Articles" list (src/data/articles/*.json)
//   article.cardImage         the special card thumbnail some page sections used (image asset + alt), where one exists
//   articleCta-men/-women/-general   the end-of-article CTA per audience (copy = the article CTA live has today)
//   page insights blocks      `cards` (copied card objects) → `articles` (references, same articles, same order)
//   page solutionsCarousel    `solutions` (references, Webflow's manual order)
//   /women/perimenopause      the "Research now shows" link (was href="#") → PMC8549458 in a new tab
//
// Writes to `production` are refused: the Portable Text cutover (MIGRATION.md) runs it there, by changing this guard.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@sanity/client';

const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const CHECK = process.argv.includes('--check');
const DATASET = arg('--dataset') ?? (CHECK ? 'pt-staging' : undefined);
if (!DATASET) { console.error('usage: --check [--dataset <name>] | --dataset <name>'); process.exit(1); }
if (DATASET === 'production' && !CHECK) { console.error('refusing to write to production (see MIGRATION.md, Portable Text cutover)'); process.exit(1); }

const token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
const client = createClient({ projectId: '9qg5x7wu', dataset: DATASET, apiVersion: '2025-02-19', token, useCdn: false });

// Audience per article: men = written for men (TRT); women = written for women (PCOS, perimenopause, HRT for women,
// estrogen dominance, "…in Women"); general = both / not sex-specific.
export const AUDIENCE = {
  'best-birth-control-for-pcos': 'women', 'estrogen-dominance': 'women', 'insulin-resistance-and-weight-loss': 'women',
  'pcos-belly-fat': 'women', 'pcos-weight-loss': 'women', 'perimenopause-brain-fog': 'women', 'perimenopause-weight-gain': 'women',
  'signs-you-need-hrt': 'women',
  'peptide-therapy-vs-trt': 'men', 'trt-cost': 'men', 'trt-side-effects': 'men',
  'insulin-resistance-test': 'general', 'lupus-rash-vs-rosacea': 'general', 'metabolic-testing': 'general',
  'not-losing-weight-on-ozempic': 'general', 'peptide-therapy-for-weight-loss': 'general', 'peptide-therapy': 'general',
  'peptides-vs-glp-1': 'general', 'pt-141': 'general', 'semaglutide-peptide': 'general', 'thyroid-specialist-near-me': 'general',
  'thyroid-supplements': 'general', 'tirzepatide-peptide': 'general',
};
const SOLUTIONS = ['long-term-hormonal-support-5', 'supporting-body-function-4', 'energy-improvement-3', 'hormone-balance-2', 'personalized-hormone-care-1'];
const PMC = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8549458/';
const BROKEN = '<a href="#">Research now shows</a>';
const FIXED = `<a href="${PMC}" target="_blank" rel="noopener">Research now shows</a>`;

const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const slugOf = (href) => href.split('/').pop();
const ref = (id, i) => ({ _type: 'reference', _key: `k${i}`, _ref: id });

// ---------- images ----------
const assets = new Map();
async function asset(src) {
  if (assets.has(src)) return assets.get(src);
  let id;
  if (CHECK) id = `(upload ${path.basename(src)})`;
  else {
    const buf = fs.readFileSync(path.join('public', decodeURI(src)));
    id = (await client.assets.upload('image', buf, { filename: path.basename(decodeURI(src)) }))._id; // same file = same asset
  }
  assets.set(src, id);
  return id;
}
const img = async (src, alt) => ({ _type: 'image', asset: { _type: 'reference', _ref: await asset(src) }, ...(alt ? { alt } : {}) });

// ---------- source data (the live pages, as extracted) ----------
const articleJson = Object.fromEntries(fs.readdirSync('src/data/articles').map((f) => [f.replace(/^articles__|\.json$/g, ''), json(path.join('src/data/articles', f))]));
const section = (slug, t) => articleJson[slug]?.sections.find((s) => s.type === t);
// Card thumbnails: the "card-…" images the static page sections used instead of the article's main image.
const cardImages = new Map();
// Read from the page JSON as it was before the cards became `articles` (main at db3df57).
{
  const { execSync } = await import('node:child_process');
  for (const f of execSync('git ls-tree -r --name-only db3df57 src/data/treatments src/data/hubs src/data/pages').toString().trim().split('\n')) {
    const raw = execSync(`git show db3df57:${f}`).toString();
    for (const m of raw.matchAll(/"href":\s*"\/articles\/([^"]+)",[^{]*?"image":\s*\{\s*"src":\s*"([^"]*\/[0-9a-f]+_card-[^"]+)"(?:,\s*"alt":\s*"([^"]*)")?/g)) {
      if (!cardImages.has(m[1])) cardImages.set(m[1], { src: m[2], alt: m[3] ?? '' });
    }
  }
}

// ---------- write ----------
const docs = await client.fetch('*[_type in ["article","page","solution"] && !(_id in path("drafts.**"))]{_id,_type,"slug":slug.current,path,sections}');
const articles = docs.filter((d) => d._type === 'article');
const tx = client.transaction();
const log = [];

for (const a of articles) {
  const audience = AUDIENCE[a.slug];
  if (!audience) throw new Error(`no audience for article ${a.slug}: add it to AUDIENCE`);
  const rel = section(a.slug, 'insights');
  const related = (rel?.cards ?? []).map((c, i) => ref(`article-${slugOf(c.href)}`, i));
  const set = { audience, relatedArticles: related };
  const card = cardImages.get(a.slug);
  if (card) set.cardImage = await img(card.src, card.alt);
  tx.patch(a._id, (p) => p.set(set));
  log.push(`${a.slug}: ${audience}; related ${related.map((r) => r._ref.slice(8)).join(', ') || '(none: hidden)'}${card ? `; card image ${path.basename(card.src)}` : ''}`);
}

// CTA copy and women's photo = the CTA every article has on live today; men's photo = the men's peptide therapy page CTA.
const live = section('estrogen-dominance', 'ctaBlock');
const ctaBase = { _type: 'articleCta', heading: live.heading, points: live.points, button: { _type: 'button', text: live.buttons[0].text, href: live.buttons[0].href } };
const MEN_PHOTO = '/images/site/6abe1f8d37948f4c2daf48ca_physican-led.avif';
tx.createOrReplace({ _id: 'articleCta-men', ...ctaBase, audience: 'men', theme: 'slate', image: await img(MEN_PHOTO, '') });
for (const audience of ['women', 'general']) {
  tx.createOrReplace({ _id: `articleCta-${audience}`, ...ctaBase, audience, theme: 'brown', image: await img(live.image.src, live.image.alt) });
}
log.push('articleCta-men (blue), articleCta-women (maroon), articleCta-general (maroon)');

for (const p of docs.filter((d) => d._type === 'page')) {
  const patch = { set: {}, unset: [] };
  for (const s of p.sections ?? []) {
    const at = `sections[_key=="${s._key}"]`;
    if (s._type === 'insights' && s.cards) {
      patch.set[`${at}.articles`] = s.cards.map((c, i) => ref(`article-${slugOf(c.href)}`, i));
      patch.unset.push(`${at}.cards`);
      log.push(`${p.path}: insights → ${s.cards.map((c) => slugOf(c.href)).join(', ')}`);
    }
    if (s._type === 'solutionsCarousel') {
      patch.set[`${at}.solutions`] = SOLUTIONS.map((id, i) => ref(`solution-${id}`, i));
      log.push(`${p.path}: carousel → ${SOLUTIONS.join(', ')}`);
    }
    // The link sits in a text block inside the section (e.g. sections[s6].blocks[k0].html): search the whole section.
    const walk = (v, at) => {
      if (typeof v === 'string' && v.includes(BROKEN)) {
        patch.set[at] = v.replace(BROKEN, FIXED);
        log.push(`${p.path}: ${at} "Research now shows" → ${PMC}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, x && x._key ? `${at}[_key=="${x._key}"]` : `${at}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) walk(x, `${at}.${k}`);
    };
    walk(s, at);
  }
  if (Object.keys(patch.set).length || patch.unset.length) tx.patch(p._id, (x) => x.set(patch.set).unset(patch.unset));
}

console.log(log.join('\n'));
if (CHECK) console.log(`\n--check: nothing written (${DATASET})`);
else { const r = await tx.commit({ visibility: 'sync' }); console.log(`\nwrote ${r.results.length} documents to ${DATASET}`); }
