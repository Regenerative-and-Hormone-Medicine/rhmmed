// Phase 3 of the Sanity move: Webflow HTML → Portable Text, site-path images → Sanity image assets.
//
//   node scripts/html-to-pt.mjs --check                 round-trip every document locally (no writes anywhere)
//   node scripts/html-to-pt.mjs --dataset pt-staging    upload the images and patch the documents in that dataset
//
// Source is always the published documents of `production`, read through the public API (read-only), or --source <file.ndjson>
// (a `sanity dataset export` data.ndjson). So the script can be re-run at any time: it recomputes every converted field from
// the HTML and `set`s it again (deterministic _keys, so an unchanged source gives identical documents). Images are uploaded
// once: Sanity names an image asset after the SHA-1 of the file, so the same file is the same asset (dedupe by content), and
// files whose asset already exists in the target dataset are not uploaded again.
//
// Writes to `production` are refused. The cutover (MIGRATION.md, "Portable Text cutover") runs this against production only
// with Evgenii's OK, which is a code change to this guard, not a flag.
//
// What it converts:
//   article.body, article.summary, author.bio   HTML → Portable Text (styles normal/h2/h3/h4, bullet/number lists,
//                                               marks strong/em/link) + custom blocks image, quote, htmlEmbed
//   article.image (+ alt from src/data/articles), author.profile, solution.image, every page-builder siteImage
//                                               site path → image asset
// Anything Portable Text can't hold faithfully (scripts / JSON-LD, the quiz form, the table, style tags) is kept as an
// htmlEmbed block with the exact source HTML.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseFragment } from 'parse5';
import sharp from 'sharp';
import { createClient } from '@sanity/client';
import { richHtml, imageInfo } from '../src/lib/portable-text.mjs';

const PROJECT = '9qg5x7wu';
const API = '2025-02-19';
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const CHECK = process.argv.includes('--check');
const DATASET = arg('--dataset');
const VERBOSE = process.argv.includes('--verbose');
if (!CHECK && !DATASET) { console.error('usage: --check | --dataset <name> [--source data.ndjson]'); process.exit(1); }
if (DATASET === 'production') { console.error('refusing to write to production (see MIGRATION.md, Portable Text cutover)'); process.exit(1); }

// ---------- source documents ----------
async function sourceDocs() {
  const file = arg('--source');
  if (file) return fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((d) => !d._id.startsWith('drafts.'));
  const u = new URL(`https://${PROJECT}.api.sanity.io/v${API}/data/query/production`);
  u.searchParams.set('query', '*[_type in ["article","author","solution","page"]]');
  u.searchParams.set('perspective', 'published');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`source query failed: ${res.status}`);
  return (await res.json()).result;
}

// ---------- images ----------
const PUBLIC = path.resolve('public');
const sitePath = (src) => typeof src === 'string' && src.startsWith('/images/');
const fileOf = (src) => path.join(PUBLIC, decodeURI(src));

/** Local prediction of the asset id Sanity will give a file: image-<sha1>-<w>x<h>-<ext>. Upload mode uses the real id. */
const refs = new Map(); // site path → asset _ref
async function predictRef(src) {
  const buf = fs.readFileSync(fileOf(src));
  const m = await sharp(buf).metadata();
  const ext = { jpeg: 'jpg', svg: 'svg', heif: 'avif' }[m.format] ?? m.format;
  return `image-${crypto.createHash('sha1').update(buf).digest('hex')}-${m.width}x${m.height}-${ext}`;
}

async function resolveRefs(srcs, client) {
  const existing = new Map();
  if (client) {
    for (const a of await client.fetch('*[_type == "sanity.imageAsset"]{_id, sha1hash}')) existing.set(a.sha1hash, a._id);
  }
  let uploaded = 0, reused = 0;
  for (const src of srcs) {
    if (!fs.existsSync(fileOf(src))) throw new Error(`missing file for ${src}`);
    if (!client) { refs.set(src, await predictRef(src)); continue; }
    const buf = fs.readFileSync(fileOf(src));
    const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
    if (existing.has(sha1)) { refs.set(src, existing.get(sha1)); reused++; continue; }
    const asset = await client.assets.upload('image', buf, { filename: path.basename(decodeURI(src)) });
    existing.set(sha1, asset._id);
    refs.set(src, asset._id);
    uploaded++;
  }
  if (client) console.log(`images: ${srcs.size} files, ${uploaded} uploaded, ${reused} already in ${DATASET}`);
}
const imageValue = (src, extra = {}, type = 'image') => ({ _type: type, asset: { _type: 'reference', _ref: refs.get(src) }, ...extra });

// ---------- HTML → Portable Text ----------
const attrs = (n) => Object.fromEntries((n.attrs ?? []).map((a) => [a.name, a.value]));
const noAttrs = (n) => !(n.attrs ?? []).length;
const raw = (html, n) => html.slice(n.sourceCodeLocation.startOffset, n.sourceCodeLocation.endOffset);
const textOf = (n) => (n.nodeName === '#text' ? n.value : (n.childNodes ?? []).map(textOf).join(''));

/** Inline content → spans + markDefs. Returns false when it holds something a span can't (then the block stays HTML). */
function inline(nodes, marks, ctx) {
  for (const c of nodes) {
    if (c.nodeName === '#text') { ctx.children.push({ _type: 'span', _key: `${ctx.key}s${ctx.children.length}`, text: c.value, marks: [...marks] }); continue; }
    if (c.nodeName === 'strong' && noAttrs(c)) { if (!inline(c.childNodes, [...marks, 'strong'], ctx)) return false; continue; }
    if (c.nodeName === 'em' && noAttrs(c)) { if (!inline(c.childNodes, [...marks, 'em'], ctx)) return false; continue; }
    if (c.nodeName === 'a') {
      const a = attrs(c);
      const extra = Object.keys(a).filter((k) => !['href', 'target', 'rel'].includes(k));
      if (extra.length || !('href' in a) || (a.target && a.target !== '_blank')) return false;
      const _key = `${ctx.key}l${ctx.markDefs.length}`;
      ctx.markDefs.push({ _type: 'link', _key, href: a.href, ...(a.target ? { blank: true } : {}), ...(a.rel ? { rel: a.rel } : {}) });
      if (!inline(c.childNodes, [...marks, _key], ctx)) return false;
      continue;
    }
    return false;
  }
  return true;
}

function textBlock(n, key, extra) {
  const ctx = { key, children: [], markDefs: [] };
  if (!inline(n.childNodes, [], ctx)) return null;
  if (!ctx.children.length) ctx.children.push({ _type: 'span', _key: `${key}s0`, text: '', marks: [] });
  return { _type: 'block', _key: key, style: 'normal', ...extra, markDefs: ctx.markDefs, children: ctx.children };
}

// Webflow rich-text image: <figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" [style="max-width:Npx"] ...>
//   <div><img alt src loading></div>[<figcaption>]</figure>
function figure(n, key) {
  const a = attrs(n);
  if (!/\bw-richtext-figure-type-image\b/.test(a.class ?? '') || a['data-rt-align'] !== 'fullwidth') return null;
  const kids = n.childNodes;
  const div = kids[0];
  if (div?.nodeName !== 'div' || div.childNodes.length !== 1 || div.childNodes[0].nodeName !== 'img') return null;
  const cap = kids[1];
  if (kids.length > 2 || (cap && cap.nodeName !== 'figcaption')) return null;
  const img = attrs(div.childNodes[0]);
  if (!sitePath(img.src)) return null;
  const maxWidth = a['data-rt-max-width'];
  return { ...imageValue(img.src, { alt: img.alt ?? '', ...(maxWidth ? { maxWidth } : {}), ...(cap ? { caption: textOf(cap) } : {}) }), _key: key };
}

// The doctor quote embed: <div data-rt-embed-type><blockquote class="blockquote"><p><em>TEXT</em></p>
//   <div class="blockquote_profile"><img src loading alt class="profile_img"><p class="body-m fw-500 color-dark">NAME</p></div></blockquote></div>
function quote(n, key) {
  const bq = n.childNodes;
  if (bq.length !== 1 || bq[0].nodeName !== 'blockquote' || attrs(bq[0]).class !== 'blockquote') return null;
  const [p, prof, ...more] = bq[0].childNodes;
  if (more.length || p?.nodeName !== 'p' || !noAttrs(p) || p.childNodes.length !== 1 || p.childNodes[0].nodeName !== 'em') return null;
  const em = p.childNodes[0];
  if (!em.childNodes.every((c) => c.nodeName === '#text')) return null;
  if (prof?.nodeName !== 'div' || attrs(prof).class !== 'blockquote_profile' || prof.childNodes.length !== 2) return null;
  const [img, name] = prof.childNodes;
  const ia = attrs(img);
  if (img.nodeName !== 'img' || ia.class !== 'profile_img' || !sitePath(ia.src)) return null;
  if (name.nodeName !== 'p' || attrs(name).class !== 'body-m fw-500 color-dark' || !name.childNodes.every((c) => c.nodeName === '#text')) return null;
  return { _type: 'quote', _key: key, text: textOf(em), name: textOf(name), photo: imageValue(ia.src, { alt: ia.alt ?? '' }) };
}

const stats = { blocks: 0, embeds: 0, embedKinds: {}, fallbacks: [] };
function htmlToPt(html, where) {
  const out = [];
  const embed = (n, key, why) => {
    const h = n.nodeName === '#text' ? n.value : raw(html, n);
    const kind = why ?? (/<form|data-quiz/.test(h) ? 'quiz' : /<table/.test(h) ? 'table' : /<script type=.application\/ld\+json/.test(h) ? 'json-ld'
      : /<script/.test(h) ? 'script' : /<style/.test(h) ? 'style' : 'other');
    stats.embeds++; stats.embedKinds[kind] = (stats.embedKinds[kind] ?? 0) + 1;
    out.push({ _type: 'htmlEmbed', _key: key, html: h });
  };
  const frag = parseFragment(html, { sourceCodeLocationInfo: true });
  frag.childNodes.forEach((n, i) => {
    const key = `b${i}`;
    const tag = n.nodeName;
    let b = null;
    if (['p', 'h2', 'h3', 'h4'].includes(tag) && noAttrs(n)) b = textBlock(n, key, { style: tag === 'p' ? 'normal' : tag });
    else if ((tag === 'ul' || tag === 'ol') && noAttrs(n) && n.childNodes.every((li) => li.nodeName === 'li' && noAttrs(li))) {
      const items = n.childNodes.map((li, j) => textBlock(li, `${key}i${j}`, { listItem: tag === 'ul' ? 'bullet' : 'number', level: 1 }));
      if (items.every(Boolean) && items.length) { out.push(...items); stats.blocks += items.length; return; }
    } else if (tag === 'figure') b = figure(n, key);
    else if (tag === 'div' && 'data-rt-embed-type' in attrs(n)) b = quote(n, key);
    if (b) { out.push(b); stats.blocks++; return; }
    if (!(tag === 'div' && 'data-rt-embed-type' in attrs(n))) stats.fallbacks.push(`${where}: <${tag}> kept as HTML`);
    embed(n, key);
  });
  return out;
}

/** Image site paths used inside an HTML string (figures and quote photos). */
const htmlImages = (html) => [...(html ?? '').matchAll(/<img\b[^>]*?\bsrc=(["'])(\/images\/[^"']+)\1/g)].map((m) => m[2]);

// ---------- page-builder images ----------
// A siteImage is an object holding only src (+ alt) (+ _type/_key) whose src is a site path.
const isSiteImage = (v) => v && typeof v === 'object' && !Array.isArray(v) && sitePath(v.src)
  && Object.keys(v).every((k) => ['_type', '_key', 'src', 'alt'].includes(k));
function pageImages(v, acc) {
  if (Array.isArray(v)) v.forEach((x) => pageImages(x, acc));
  else if (isSiteImage(v)) acc.add(v.src);
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => pageImages(x, acc));
  return acc;
}
function convertPageImages(v) {
  if (Array.isArray(v)) return v.map(convertPageImages);
  if (isSiteImage(v)) {
    const { _key, src, alt } = v;
    return { _type: 'siteImage', ...(_key ? { _key } : {}), asset: { _type: 'reference', _ref: refs.get(src) }, ...(alt !== undefined ? { alt } : {}) };
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, convertPageImages(x)]));
  return v;
}

// ---------- round-trip check ----------
// Normalise markup for comparison: image src → the file's SHA-1 (site path: hash of the file; CDN URL: the hash in the asset
// name, resize query dropped), and drop width/height/srcset/sizes on <img> (the renderer adds the intrinsic size and the
// responsive candidates; Webflow had none).
function sha1Of(src) {
  const m = /cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([0-9a-f]+)-/.exec(src.replace(/&amp;/g, '&'));
  if (m) return m[1];
  if (sitePath(src)) return crypto.createHash('sha1').update(fs.readFileSync(fileOf(src))).digest('hex');
  return src;
}
function norm(html) {
  const frag = parseFragment(html ?? '');
  const ser = (n) => {
    if (n.nodeName === '#text') return n.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ /g, '&nbsp;');
    if (n.nodeName === '#comment') return `<!--${n.data}-->`;
    const a = (n.attrs ?? []).filter((x) => !(n.nodeName === 'img' && ['width', 'height', 'srcset', 'sizes'].includes(x.name)))
      .map((x) => [x.name, x.name === 'src' && n.nodeName === 'img' ? sha1Of(x.value) : x.value])
      .sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('');
    const kids = (n.nodeName === 'template' ? n.content : n).childNodes ?? [];
    return ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(n.nodeName) ? `<${n.nodeName}${a}>` : `<${n.nodeName}${a}>${kids.map(ser).join('')}</${n.nodeName}>`;
  };
  return frag.childNodes.map(ser).join('');
}
const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return `@${i}\n  old: ${a.slice(Math.max(0, i - 80), i + 120)}\n  new: ${b.slice(Math.max(0, i - 80), i + 120)}`; };

// ---------- main ----------
const docs = await sourceDocs();
const articles = docs.filter((d) => d._type === 'article');
const authors = docs.filter((d) => d._type === 'author');
const solutions = docs.filter((d) => d._type === 'solution');
const pages = docs.filter((d) => d._type === 'page');
console.log(`source: ${articles.length} articles, ${authors.length} authors, ${solutions.length} solutions, ${pages.length} pages`);

const srcs = new Set();
for (const a of articles) { if (sitePath(a.image)) srcs.add(a.image); for (const f of ['body', 'summary']) htmlImages(a[f]).forEach((s) => srcs.add(s)); }
for (const a of authors) { if (sitePath(a.profile)) srcs.add(a.profile); htmlImages(a.bio).forEach((s) => srcs.add(s)); }
for (const s of solutions) if (sitePath(s.image)) srcs.add(s.image);
for (const p of pages) pageImages(p.sections, srcs);

const token = CHECK ? undefined : JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken;
const client = CHECK ? null : createClient({ projectId: PROJECT, dataset: DATASET, apiVersion: API, token, useCdn: false });
await resolveRefs(srcs, client);

const articleAlt = (slug) => {
  const f = `src/data/articles/articles__${slug}.json`;
  if (!fs.existsSync(f)) return undefined;
  return JSON.parse(fs.readFileSync(f, 'utf8')).sections.find((s) => s.type === 'articleHero')?.imageAlt;
};

const patches = [];
const cfg = { projectId: PROJECT, dataset: DATASET ?? 'production' };
let same = 0, exact = 0, total = 0;
const diffs = [];
const check = (where, oldHtml, pt) => {
  total++;
  const newHtml = richHtml(pt, cfg);
  const dropDims = (h) => h.replace(/ width="\d+" height="\d+"/g, '').replace(/ srcset="[^"]*" sizes="[^"]*"/g, '');
  if (norm(oldHtml) === norm(newHtml)) same++; else diffs.push(`${where} ${firstDiff(norm(oldHtml), norm(newHtml))}`);
  // Byte-exact apart from image src and the added width/height.
  const unsrc = (h) => h.replace(/(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/g, (_, p, q, s) => `${p}${q}${sha1Of(s)}${q}`);
  if (unsrc(oldHtml) === unsrc(dropDims(newHtml))) exact++;
  else if (VERBOSE) console.log(`not byte-exact: ${where} ${firstDiff(unsrc(oldHtml), unsrc(dropDims(newHtml)))}`);
};

for (const a of articles) {
  const set = {};
  for (const f of ['body', 'summary']) {
    if (typeof a[f] !== 'string') continue;
    set[f] = htmlToPt(a[f], `${a.slug.current}.${f}`);
    check(`${a.slug.current}.${f}`, a[f], set[f]);
  }
  if (sitePath(a.image)) { const alt = articleAlt(a.slug.current); set.image = imageValue(a.image, alt !== undefined ? { alt } : {}); }
  patches.push([a._id, set]);
}
for (const a of authors) {
  const set = {};
  if (typeof a.bio === 'string') { set.bio = htmlToPt(a.bio, `author ${a._id}.bio`); check(`author ${a._id}.bio`, a.bio, set.bio); }
  if (sitePath(a.profile)) set.profile = imageValue(a.profile);
  patches.push([a._id, set]);
}
for (const s of solutions) if (sitePath(s.image)) patches.push([s._id, { image: imageValue(s.image) }]);
let pageImgs = 0;
for (const p of pages) {
  const n = pageImages(p.sections, new Set()).size;
  if (!n) continue;
  pageImgs += n;
  patches.push([p._id, { sections: convertPageImages(p.sections) }]);
}

console.log(`rich text: ${total} fields, ${same} identical markup after round trip (${exact} byte-exact apart from image src/size)`);
console.log(`blocks: ${stats.blocks} Portable Text blocks, ${stats.embeds} htmlEmbed blocks`, stats.embedKinds);
for (const f of stats.fallbacks) console.log('  fallback:', f);
for (const d of diffs) console.log('DIFF', d);
console.log(`images: ${srcs.size} distinct files (${pageImgs} distinct per-page uses in ${patches.filter(([id]) => id.startsWith('page-')).length} pages)`);

if (CHECK) {
  if (process.argv.includes('--dump')) fs.writeFileSync(arg('--dump'), patches.map(([id, set]) => JSON.stringify({ id, set })).join('\n') + '\n');
  process.exit(diffs.length ? 2 : 0);
}

// Patch in transactions of 10; `set` only the converted fields, everything else in the document stays as it is.
const have = new Set(await client.fetch('*[_id in $ids]._id', { ids: patches.map(([id]) => id) }));
const missing = patches.filter(([id]) => !have.has(id)).map(([id]) => id);
if (missing.length) throw new Error(`not in ${DATASET}: ${missing.join(', ')} (import production into it first)`);
for (let i = 0; i < patches.length; i += 10) {
  const tx = client.transaction();
  for (const [id, set] of patches.slice(i, i + 10)) if (Object.keys(set).length) tx.patch(id, (p) => p.set(set));
  await tx.commit({ visibility: 'sync' });
}
console.log(`patched ${patches.length} documents in ${DATASET}`);
