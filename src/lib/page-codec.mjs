// Page JSON (src/data/{treatments,hubs,pages}/*.json, the shape SectionPage renders) <-> Sanity `page` documents.
// Shared by scripts/pages-to-sanity.mjs (encode, import), src/lib/sanity-loader.ts (build) and src/lib/content.ts (preview), so a page
// read back from Sanity is exactly the JSON it came from.
//
// Sanity needs: `_type` + `_key` on objects inside arrays, no arrays directly inside arrays, no nulls inside arrays.
// So: a section's `type` becomes its `_type`; array objects get `_type` = the member name below; a row of the compare table
// (string[]) becomes { _type: 'row', cells }; a nullable string in an array becomes { _type: 'cell', value }.
// Nulls in object fields are dropped (Studio flags a stored null as "Invalid property value"). Dropping them was checked
// byte-identical on all built files (2026-11-25): components treat a missing field like null. Nulls inside arrays stay (cells).

/** Array field name → the Sanity member type its objects get. `button` and `siteImage` are shared named types. */
export const MEMBER = {
  buttons: 'button', bottomButtons: 'button', images: 'siteImage', cards: 'card', steps: 'step', items: 'item',
  quotes: 'quote', stats: 'stat', blocks: 'textBlock', slides: 'slide', fields: 'formField', checks: 'check', infos: 'info',
};

export function encodeValue(v, field) {
  if (Array.isArray(v)) {
    return v.map((x, i) => {
      const _key = `k${i}`;
      if (Array.isArray(x)) return { _type: 'row', _key, cells: x.map((c) => encodeValue(c, 'cells')) };
      if (x && typeof x === 'object') {
        const m = MEMBER[field];
        if (!m) throw new Error(`no member type for array field "${field}"`);
        return { _type: m, _key, ...encodeObject(x) };
      }
      if (x === null || v.some((y) => y === null)) return { _type: 'cell', _key, value: x };
      return x;
    });
  }
  if (v && typeof v === 'object') return encodeObject(v);
  return v;
}

function encodeObject(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== null) out[k] = encodeValue(v, k);
  return out;
}

export const pageId = (path) => `page-${path.slice(1).replace(/\//g, '-')}`;

export function encodePage(page, order) {
  const { sections, ...rest } = page;
  return {
    _id: pageId(page.path),
    _type: 'page',
    ...encodeObject(rest),
    order,
    sections: sections.map(({ type, ...s }, i) => ({ _type: type, _key: `s${i}`, ...encodeObject(s) })),
  };
}

export function decodeValue(v) {
  if (Array.isArray(v)) return v.map(decodeValue);
  if (v && typeof v === 'object') {
    if (v._type === 'row') return (v.cells ?? []).map(decodeValue);
    if (v._type === 'cell') return v.value ?? null;
    const out = {};
    for (const [k, x] of Object.entries(v)) if (!k.startsWith('_') && x !== null) out[k] = decodeValue(x);
    return out;
  }
  return v;
}

const DOC_KEYS = new Set(['order']);
export function decodePage(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('_') || DOC_KEYS.has(k) || k === 'sections' || v === null) continue;
    out[k] = decodeValue(v);
  }
  out.sections = (doc.sections ?? []).map((s) => ({ type: s._type, ...decodeValue(s) }));
  return out;
}

/** The page JSON as it reads back from Sanity: object fields that are null removed (nulls inside arrays kept). */
export function dropNulls(v) {
  if (Array.isArray(v)) return v.map(dropNulls);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) if (x !== null) out[k] = dropNulls(x);
    return out;
  }
  return v;
}
