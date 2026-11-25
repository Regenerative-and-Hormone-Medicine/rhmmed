// Page JSON (homepage, treatments, hubs, info pages, contact, scheduling) → Sanity `page` documents (NDJSON for `sanity dataset import`).
// node scripts/pages-to-sanity.mjs → .sanity-import/pages.ndjson ; then: cd studio && npm run import:pages
// Ids are stable (page-<path>, the homepage is page-home), so re-running replaces the same documents. Checks that every
// page decodes back to its JSON (with null object fields dropped, as the codec stores them).
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { decodePage, dropNulls } from '../src/lib/page-codec.mjs';
import { snapshotPages } from '../src/lib/page-snapshot.mjs';

const docs = snapshotPages().map(({ file, page, doc }) => {
  if (!isDeepStrictEqual(decodePage(JSON.parse(JSON.stringify(doc))), dropNulls(page))) throw new Error(`${file}: does not round-trip`);
  return doc;
});
const ids = new Set(docs.map((d) => d._id));
if (ids.size !== docs.length) throw new Error('duplicate page ids');
fs.mkdirSync('.sanity-import', { recursive: true });
fs.writeFileSync('.sanity-import/pages.ndjson', docs.map((d) => JSON.stringify(d)).join('\n') + '\n');
console.log(`wrote .sanity-import/pages.ndjson: ${docs.length} pages, ${docs.reduce((n, d) => n + d.sections.length, 0)} sections`);
