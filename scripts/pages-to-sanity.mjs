// Page JSON (treatments, hubs, info pages) → Sanity `page` documents (NDJSON for `sanity dataset import`).
// node scripts/pages-to-sanity.mjs → .sanity-import/pages.ndjson ; then: cd studio && npm run import:pages
// Ids are stable (page-<path>), so re-running replaces the same documents. Checks that every page decodes back to its JSON.
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { encodePage, decodePage } from '../src/lib/page-codec.mjs';

const dirs = ['src/data/treatments', 'src/data/hubs', 'src/data/pages'];
const files = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(d, f)));
const docs = files.map((f, i) => {
  const page = JSON.parse(fs.readFileSync(f, 'utf8'));
  const doc = encodePage(page, i);
  if (!isDeepStrictEqual(decodePage(JSON.parse(JSON.stringify(doc))), page)) throw new Error(`${f}: does not round-trip`);
  return doc;
});
fs.mkdirSync('.sanity-import', { recursive: true });
fs.writeFileSync('.sanity-import/pages.ndjson', docs.map((d) => JSON.stringify(d)).join('\n') + '\n');
console.log(`wrote .sanity-import/pages.ndjson: ${docs.length} pages, ${docs.reduce((n, d) => n + d.sections.length, 0)} sections`);
