// Writes studio/schemaTypes/sections.ts: one Sanity object type per section component (the page builder blocks), with
// fields inferred from every instance in src/data/{treatments,hubs,pages}/*.json. Run it again after adding a section type
// or field to the page JSON; hand-tune titles and descriptions in TITLES / FIELD_TITLES / DESCRIPTIONS below, not in the output.
// node scripts/gen-page-schemas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { MEMBER } from '../src/lib/page-codec.mjs';

// Section `type` → Studio title and the component that renders it.
const TITLES = {
  hero: ['Treatment hero', 'treatment/Hero'], symptom: ['Symptoms intro', 'treatment/Symptom'],
  statement: ['Statement', 'treatment/Statement'], signs: ['Signs / causes cards', 'treatment/Signs'],
  standard: ['Cards section', 'treatment/Standard'], compare: ['Comparison table', 'treatment/Compare'],
  missions: ['Mission text + images', 'treatment/Missions'], voices: ['Patient quotes', 'treatment/Voices'],
  process: ['Process steps', 'treatment/Process'], why: ['Why RHM (stats)', 'treatment/Why'],
  reviews: ['Reviews widget', 'sections/Reviews'], reviewsBare: ['Reviews widget (bare)', 'sections/Reviews'],
  ctaBlock: ['CTA block', 'treatment/CtaBlock'], faq: ['FAQ', 'treatment/Faq'],
  insights: ['Related articles', 'sections/Insights'], hubHero: ['Hub / page hero (image)', 'treatment/HubHero'],
  hormones: ['Hormones chart', 'treatment/Hormones'], whyWork: ['Why people work with us', 'sections/WhyWork'],
  finalCta: ['Final CTA', 'sections/FinalCta'], carousel: ['Carousel', 'sections/Carousel'],
  bookHero: ['Book sign-up hero', 'sections/BookHero'], telehealth: ['Image + text CTA', 'sections/TelehealthCta'],
  bookSteps: ['Book steps', 'sections/BookSteps'], pageHero: ['Page hero (text)', 'sections/PageHero'],
  faqPage: ['FAQ page list', 'sections/FaqPage'], locations: ['Locations', 'sections/Locations'],
  preparation: ['Preparation cards', 'sections/Preparation'], legalHero: ['Legal page title', 'sections/Legal'],
  legal: ['Legal text', 'sections/Legal'], access: ['Access (telehealth)', 'sections/Access'], team: ['Team', 'sections/Team'],
};
const FIELD_TITLES = {
  q: 'Question', a: 'Answer', cta: 'Button', crumb: 'Breadcrumb parent', current: 'Breadcrumb current page',
  men: "Men's theme", told: 'What patients are told', toldLabel: '"Told" label', box: 'Highlighted box', two: 'Two columns',
  cls: 'Style class', oursImage: 'RHM column image', heads: 'Column heads', rows: 'Rows', cells: 'Cells',
  infos: 'Info rows', lines: 'Lines', num: 'Number', html: 'HTML', topPad: 'Top padding', after: 'After the carousel',
  done: 'Success message', fail: 'Error message', consent: 'Consent text', submit: 'Submit button text',
};
const DESCRIPTIONS = {
  heading: null, // set per-field below when it holds HTML
  headerTheme: 'Header text colour before scrolling: light = white text over a dark hero image.',
};
// Fields that only switch the Webflow layout variant; grouped as "Layout" and collapsed.
const LAYOUT = /^(men|slate|big|grey|compact|solid|short|row|lightCards|signsGrid|stacked|headingFull|headingInCard|currentIsH1|topPad|accent|mist|reverse|two)$|Max$|Class$|Tag$|Style$|Kind$|^(variant|cls|tag|kind|pad|extraOverlay|grid|spacers)$/;

const dirs = ['src/data/treatments', 'src/data/hubs', 'src/data/pages'];
const pages = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))));

// Merge every instance into one shape: { kind, html, values, fields (object), item (array) }.
const blank = () => ({ kinds: new Set(), html: false, values: new Set(), fields: new Map(), item: null, nullItems: false, nestedArray: false });
function add(shape, v) {
  if (v === null) { shape.kinds.add('null'); return; }
  if (Array.isArray(v)) {
    shape.kinds.add('array');
    for (const x of v) {
      if (x === null) shape.nullItems = true;
      if (Array.isArray(x)) shape.nestedArray = true;
      add((shape.item ??= blank()), x);
    }
    return;
  }
  if (typeof v === 'object') {
    shape.kinds.add('object');
    for (const [k, x] of Object.entries(v)) {
      if (!shape.fields.has(k)) shape.fields.set(k, blank());
      add(shape.fields.get(k), x);
    }
    return;
  }
  shape.kinds.add(typeof v);
  if (typeof v === 'string') {
    if (/<[a-z!]/i.test(v)) shape.html = true;
    if (shape.values.size < 20) shape.values.add(v);
  }
}

const sections = new Map();
const pageShape = blank();
for (const p of pages) {
  const { sections: ss, ...rest } = p;
  add(pageShape, rest);
  for (const { type, ...s } of ss) {
    if (!sections.has(type)) sections.set(type, blank());
    add(sections.get(type), s);
  }
}

const q = (s) => JSON.stringify(s);
const isImage = (sh) => sh.kinds.has('object') && [...sh.fields.keys()].sort().join() === 'alt,src';
const isButton = (sh) => sh.kinds.has('object') && [...sh.fields.keys()].every((k) => ['text', 'href', 'variant'].includes(k));
const title = (k) => (FIELD_TITLES[k] ? `, title: ${q(FIELD_TITLES[k])}` : '');

function fieldDef(name, sh, topLevel, indent) {
  const pad = ' '.repeat(indent);
  const fs_ = topLevel && LAYOUT.test(name) ? ", fieldset: 'layout'" : '';
  const base = `name: ${q(name)}${title(name)}${fs_}`;
  if (sh.kinds.has('array')) {
    const it = sh.item;
    let of;
    if (!it) of = `[{ type: 'string' }]`;
    else if (sh.nestedArray) of = `[defineArrayMember({ type: 'object', name: 'row', title: 'Row', fields: [defineField({ name: 'cells', type: 'array', of: [{ type: 'text', rows: 2 }], description: 'HTML per cell.' })], preview: { select: { c: 'cells' }, prepare: ({ c }) => ({ title: strip(c?.[0]) || 'Row' }) } })]`;
    else if (sh.nullItems) of = `[defineArrayMember({ type: 'object', name: 'cell', title: 'Cell', fields: [defineField({ name: 'value', type: 'string' })], preview: { select: { title: 'value' } } })]`;
    else if (it.kinds.has('object')) {
      const m = MEMBER[name];
      if (m === 'button' || m === 'siteImage') of = `[{ type: ${q(m)} }]`;
      else of = `[defineArrayMember({ type: 'object', name: ${q(m)}, fields: [\n${objectFields(it, indent + 4)}\n${pad}  ], preview: itemPreview })]`;
    } else of = it.html ? `[{ type: 'text', rows: 3 }]` : `[{ type: 'string' }]`;
    const opts = topLevel && LAYOUT.test(name) && it && it.values.size && it.values.size <= 8 ? `, options: { list: ${q([...it.values])} }` : '';
    return `${pad}defineField({ ${base}, type: 'array', of: ${of}${opts} }),`;
  }
  if (sh.kinds.has('object')) {
    if (isImage(sh)) return `${pad}defineField({ ${base}, type: 'siteImage' }),`;
    if (isButton(sh)) return `${pad}defineField({ ${base}, type: 'button' }),`;
    return `${pad}defineField({ ${base}, type: 'object', fields: [\n${objectFields(sh, indent + 2)}\n${pad}] }),`;
  }
  if (sh.kinds.has('boolean')) return `${pad}defineField({ ${base}, type: 'boolean' }),`;
  if (sh.kinds.has('number')) return `${pad}defineField({ ${base}, type: 'number' }),`;
  if (sh.html) return `${pad}defineField({ ${base}, type: 'text', rows: ${name === 'heading' || name === 'title' ? 2 : 6}, description: 'HTML, rendered as-is.' }),`;
  const longest = Math.max(0, ...[...sh.values].map((v) => v.length));
  const desc = DESCRIPTIONS[name] ? `, description: ${q(DESCRIPTIONS[name])}` : '';
  if (LAYOUT.test(name) && sh.values.size && sh.values.size <= 8) return `${pad}defineField({ ${base}, type: 'string', options: { list: ${q([...sh.values])} }${desc} }),`;
  return `${pad}defineField({ ${base}, type: ${longest > 90 ? "'text', rows: 3" : "'string'"}${desc} }),`;
}
function objectFields(sh, indent) {
  return [...sh.fields].map(([k, v]) => fieldDef(k, v, false, indent)).join('\n');
}

let out = `// GENERATED by scripts/gen-page-schemas.mjs from the page JSON. Edit the generator, not this file.
// The page builder: one block per section component in src/components (named in each block's description).
// Text marked HTML is rendered as-is (Webflow markup, phase 1); images are site paths (/images/site/...).
import { defineArrayMember, defineField, defineType } from 'sanity';

const strip = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
const itemPreview = {
  select: { a: 'title', b: 'q', c: 'name', d: 'label', e: 'text', f: 'heading', g: 'value', h: 'big', i: 'html', j: 'quote' },
  prepare: (v: Record<string, string>) => ({ title: strip(v.a || v.b || v.c || v.d || v.e || v.f || v.g || v.h || v.i || v.j) || 'Item' }),
};
const layout = [{ name: 'layout', title: 'Layout (Webflow variant)', options: { collapsible: true, collapsed: true } }];

export const siteImage = defineType({
  name: 'siteImage', title: 'Image', type: 'object',
  fields: [
    defineField({ name: 'src', title: 'Image path', type: 'string', description: 'Site path, e.g. /images/site/….' }),
    defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
  ],
  preview: { select: { title: 'alt', subtitle: 'src' } },
});

export const button = defineType({
  name: 'button', title: 'Button', type: 'object',
  fields: [
    defineField({ name: 'text', type: 'string' }),
    defineField({ name: 'href', title: 'Link', type: 'string', description: 'A site path (/scheduling) or a full URL.' }),
    defineField({ name: 'variant', type: 'string', options: { list: ['dark', 'light'] } }),
  ],
  preview: { select: { title: 'text', subtitle: 'href' } },
});

export const sectionTypes = [\n`;

for (const [type, sh] of sections) {
  const [t, comp] = TITLES[type] ?? [type, '?'];
  const hasLayout = [...sh.fields.keys()].some((k) => LAYOUT.test(k));
  const fields = [...sh.fields].map(([k, v]) => fieldDef(k, v, true, 6)).join('\n');
  out += `  defineType({
    name: ${q(type)}, title: ${q(t)}, type: 'object', description: ${q(`src/components/${comp}.astro`)},${hasLayout ? '\n    fieldsets: layout,' : ''}
    fields: [
${fields || "      defineField({ name: 'note', type: 'string', readOnly: true, description: 'No fields: the block renders the live reviews widget.' }),"}
    ],
    preview: { select: { h: 'heading', l: 'label', x: 'html' }, prepare: ({ h, l, x }) => ({ title: strip(h || l || x).slice(0, 80) || ${q(t)}, subtitle: ${q(t)} }) },
  }),\n`;
}
out += `];\n`;
fs.writeFileSync('studio/schemaTypes/sections.ts', out);
console.log(`wrote studio/schemaTypes/sections.ts: ${sections.size} section types`);
