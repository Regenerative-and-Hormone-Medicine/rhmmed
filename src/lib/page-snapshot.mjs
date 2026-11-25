// The page JSON snapshot (src/data/{treatments,hubs,pages}/*.json) encoded as Sanity `page` documents, exactly as
// scripts/pages-to-sanity.mjs imports them. Used by that script, and by the build for pages not imported into Sanity yet
// (src/lib/sanity-loader.ts). Node only; paths are relative to the project root (the cwd of `astro build` and the scripts).
import fs from 'node:fs';
import path from 'node:path';
import { encodePage } from './page-codec.mjs';

export const PAGE_DIRS = ['src/data/treatments', 'src/data/hubs', 'src/data/pages'];

/** [{ file, page, doc }] in import order (directory, then file name); `order` on each doc is that position. */
export function snapshotPages() {
  const files = PAGE_DIRS.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(d, f)));
  return files.map((file, i) => {
    const page = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { file, page, doc: encodePage(page, i) };
  });
}
