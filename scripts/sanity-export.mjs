// Webflow CMS data (src/content/, from the Webflow CSVs) → Sanity documents (NDJSON for `sanity dataset import`).
// node scripts/sanity-export.mjs  → .sanity-import/rhm.ndjson ; then: cd studio && npm run import
// IDs are stable (<type>-<webflow id>), so re-running replaces the same documents. Content is copied verbatim.
import fs from 'node:fs';
import path from 'node:path';

const C = 'src/content';
const docs = [];
const ref = (id) => ({ _type: 'reference', _ref: id });
const slug = (s) => ({ _type: 'slug', current: s });
const key = (i) => `k${i}`;
const id = (type, raw) => `${type}-${raw}`.replace(/[^a-zA-Z0-9_-]/g, '_');

const types = { authors: 'author', 'blog-categories': 'blogCategory', testimonials: 'testimonial', solutions: 'solution', newsletters: 'newsletter', researches: 'research' };
for (const [file, type] of Object.entries(types)) {
  const items = JSON.parse(fs.readFileSync(path.join(C, `${file}.json`), 'utf8'));
  items.forEach((it, i) => {
    const { id: raw, slug: s, ...rest } = it;
    const doc = { _id: id(type, raw), _type: type, ...rest, slug: slug(s), order: i };
    if (type === 'testimonial') doc.categories = rest.categories; // plain strings, kept as is
    docs.push(doc);
  });
}

// Articles: Markdown files whose frontmatter values are JSON literals and whose body is Webflow HTML.
const files = fs.readdirSync(path.join(C, 'articles')).filter((f) => f.endsWith('.md')).sort();
files.forEach((f, i) => {
  const src = fs.readFileSync(path.join(C, 'articles', f), 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${f}`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const k = line.match(/^(\w+): (.*)$/);
    if (!k) throw new Error(`${f}: unparsed frontmatter line: ${line.slice(0, 60)}`);
    fm[k[1]] = JSON.parse(k[2]);
  }
  const { slug: s, author, category, ...rest } = fm;
  const cats = category.split(';').map((c) => c.trim()).filter(Boolean);
  docs.push({
    _id: id('article', path.basename(f, '.md')),
    _type: 'article',
    ...rest,
    slug: slug(s),
    ...(author ? { author: ref(id('author', author)) } : {}),
    categories: cats.map((c, j) => ({ ...ref(id('blogCategory', c)), _key: key(j) })),
    body: m[2].replace(/^\n+/, "").replace(/\n+$/, ""), // same as the old glob loader
    order: i,
  });
});

// Every reference must resolve.
const ids = new Set(docs.map((d) => d._id));
for (const d of docs) for (const r of [d.author, ...(d.categories ?? [])].filter((x) => x?._ref)) {
  if (!ids.has(r._ref)) throw new Error(`${d._id}: missing reference ${r._ref}`);
}
fs.mkdirSync('.sanity-import', { recursive: true });
fs.writeFileSync('.sanity-import/rhm.ndjson', docs.map((d) => JSON.stringify(d)).join('\n') + '\n');
const count = docs.reduce((a, d) => ((a[d._type] = (a[d._type] ?? 0) + 1), a), {});
console.log('wrote .sanity-import/rhm.ndjson', count);
