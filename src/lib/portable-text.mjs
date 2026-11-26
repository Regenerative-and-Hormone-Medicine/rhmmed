// Portable Text and Sanity image assets → the HTML/URLs the site has always rendered (phase 3 of the Sanity move,
// branch `sanity-portable-text`). Shared by the build loader (src/lib/sanity-loader.ts), the preview (src/lib/content.ts)
// and the converter's round-trip check (scripts/html-to-pt.mjs), so all three produce the same markup.
//
// Both shapes are accepted during the transition: a field that is still a Webflow HTML string or a site path is passed
// through untouched, so the build keeps working against `production` (old shapes) and `pt-staging` (new shapes).
import { toHTML } from '@portabletext/to-html';

// ---------- images ----------

// Sanity image asset ids encode everything a URL needs: image-<sha1>-<w>x<h>-<ext>.
const REF = /^image-([0-9a-f]+)-(\d+)x(\d+)-([a-z0-9]+)$/;

/** True for an image value that points at a Sanity asset ({ asset: { _ref } }). */
export const isImageAsset = (v) => !!(v && typeof v === 'object' && typeof v.asset?._ref === 'string' && REF.test(v.asset._ref));

/** The CDN URL and intrinsic size of an image value (or of a bare asset ref string). */
export function imageInfo(v, { projectId, dataset }) {
  const ref = typeof v === 'string' ? v : v?.asset?._ref;
  const m = REF.exec(ref ?? '');
  if (!m) return undefined;
  const [, hash, w, h, ext] = m;
  return { src: `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${w}x${h}.${ext}`, width: +w, height: +h };
}

/** A field that is either a site path (old shape) or an image asset (new shape) → the URL string the templates use. */
export function imageSrc(v, cfg) {
  if (typeof v === 'string' || v == null) return v;
  return imageInfo(v, cfg)?.src ?? '';
}

/**
 * Deep-replace every image asset object with the page-JSON image shape the section components read:
 * { asset, alt, ... } → { src, alt, ... } (keeps _type/_key and other fields; no width/height: the components never had them).
 */
export function resolveImages(v, cfg) {
  if (Array.isArray(v)) return v.map((x) => resolveImages(x, cfg));
  if (v && typeof v === 'object') {
    if (isImageAsset(v)) {
      const { asset, crop, hotspot, ...rest } = v;
      const src = imageInfo(v, cfg).src;
      // `src` first, as in the page JSON ({ src, alt }), so the decoded object has the same key order.
      const out = {};
      for (const k of Object.keys(rest)) if (k.startsWith('_')) out[k] = rest[k];
      out.src = src;
      for (const k of Object.keys(rest)) if (!k.startsWith('_')) out[k] = rest[k];
      return out;
    }
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = resolveImages(x, cfg);
    return out;
  }
  return v;
}

// ---------- responsive <img> attributes ----------

// A Sanity CDN image URL (what imageSrc / resolveImages produce): .../<sha1>-<w>x<h>.<ext>
const CDN = /^https:\/\/cdn\.sanity\.io\/images\/[^/?#]+\/[^/?#]+\/[0-9a-f]+-(\d+)x(\d+)\.([a-z0-9]+)$/;
const WIDTHS = [320, 480, 640, 800, 1080, 1280, 1600, 1920, 2400];

/**
 * Attributes for an <img>, spread where `src={...}` used to be: `<img {...imgAttrs(src, { sizes })} alt=... />`.
 * - Site path (old shape) or any non-Sanity URL → `{ src }` only, so the production build stays byte-identical.
 * - Sanity image URL → a resized src plus srcset (`?w=…&fit=max&auto=format`: WebP/AVIF where the browser takes it, never
 *   upscaled), `sizes`, and the intrinsic width/height from the asset name (reserves the space: no layout shift).
 *   `max` caps the largest candidate; `dims: false` when the template sets its own width/height.
 * - SVG and GIF are left alone (`{ src }`): resizing would rasterise / drop the animation.
 */
export function imgAttrs(src, { sizes = '100vw', max = 2400, widths = WIDTHS, dims = true } = {}) {
  const m = CDN.exec(src ?? '');
  if (!m || m[3] === 'svg' || m[3] === 'gif') return { src };
  const w = +m[1], h = +m[2];
  const cap = Math.min(w, max);
  const ws = [...widths.filter((x) => x < cap), cap];
  const url = (x) => `${src}?w=${x}&fit=max&auto=format`;
  return { src: url(cap), srcset: ws.map((x) => `${url(x)} ${x}w`).join(', '), sizes, ...(dims ? { width: w, height: h } : {}) };
}

// ---------- Portable Text → HTML ----------

// Webflow wrote text with only & and < escaped and a non-breaking space as &nbsp;. Do the same so the output matches.
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ /g, '&nbsp;');
const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Inline content. Marks are opened in the order they are stored (outermost first: the converter records the source
// nesting) and a mark stays open across spans only while it is part of the shared prefix. That reproduces the source
// markup exactly (`<em>a</em><a><em>b</em></a>` stays as it was), where @portabletext/to-html's mark tree would regroup
// it (`<em>a<a>b</a></em>`). Editor-made content renders as valid HTML either way.
function openTag(mark, markDefs) {
  if (mark === 'strong') return ['<strong>', '</strong>'];
  if (mark === 'em') return ['<em>', '</em>'];
  const def = markDefs.find((d) => d._key === mark);
  if (def?._type === 'link') {
    // rel first, as Webflow wrote it; links without rel get rel="noopener" from the article template when they open a new tab.
    const rel = def.rel ? ` rel="${escAttr(def.rel)}"` : '';
    return [`<a${rel} href="${escAttr(def.href)}"${def.blank ? ' target="_blank"' : ''}>`, '</a>'];
  }
  return ['', '']; // unknown decorator / annotation: text only
}
function inlineHtml(block) {
  const defs = block.markDefs ?? [];
  const stack = []; // [mark, closeTag]
  let out = '';
  for (const c of block.children ?? []) {
    if (c._type !== 'span') continue;
    const marks = c.marks ?? [];
    let k = 0;
    while (k < stack.length && k < marks.length && stack[k][0] === marks[k]) k++;
    while (stack.length > k) out += stack.pop()[1];
    for (const m of marks.slice(k)) { const [o, cl] = openTag(m, defs); out += o; stack.push([m, cl]); }
    out += escText(c.text ?? '');
  }
  while (stack.length) out += stack.pop()[1];
  return out;
}

// The article body column is at most 50rem (800px); below 992px it is the container width (side padding 2rem/1.5rem/1rem).
const FIGURE_SIZES = '(max-width: 991px) calc(100vw - 3rem), 800px';

const BLOCK_TAG = { normal: 'p', h2: 'h2', h3: 'h3', h4: 'h4', blockquote: 'blockquote' };

function components(cfg) {
  return {
    escapeHTML: escText,
    hardBreak: false,
    block: ({ value }) => { const t = BLOCK_TAG[value.style] ?? 'p'; return `<${t}>${inlineHtml(value)}</${t}>`; },
    list: {
      bullet: ({ children }) => `<ul>${children}</ul>`,
      number: ({ children }) => `<ol>${children}</ol>`,
    },
    listItem: ({ value }) => `<li>${inlineHtml(value)}</li>`,
    types: {
      // Webflow's rich-text figure markup (the .blog-rte styles target it), plus intrinsic width/height against layout shift.
      image: ({ value }) => {
        const i = imageInfo(value, cfg);
        if (!i) return '';
        const r = imgAttrs(i.src, { sizes: FIGURE_SIZES, max: 1600 });
        const resp = r.srcset ? ` srcset="${escAttr(r.srcset)}" sizes="${r.sizes}"` : '';
        const mw = value.maxWidth ? ` style="max-width:${escAttr(value.maxWidth)}"` : '';
        const dmw = value.maxWidth ? ` data-rt-max-width="${escAttr(value.maxWidth)}"` : '';
        const cap = value.caption ? `<figcaption>${escText(value.caption)}</figcaption>` : '';
        return `<figure class="w-richtext-figure-type-image w-richtext-align-fullwidth"${mw} data-rt-type="image" data-rt-align="fullwidth"${dmw}><div><img alt="${escAttr(value.alt)}" src="${escAttr(r.src)}"${resp} loading="lazy" width="${i.width}" height="${i.height}"></div>${cap}</figure>`;
      },
      // The doctor quote with a profile photo (was a Webflow HTML embed; same markup, now editable fields).
      quote: ({ value }) => {
        const p = imageInfo(value.photo, cfg);
        const pr = p && imgAttrs(p.src, { sizes: '80px', widths: [80, 160], max: 240 });
        const photo = p ? `<img src="${escAttr(pr.src)}"${pr.srcset ? ` srcset="${escAttr(pr.srcset)}" sizes="${pr.sizes}"` : ''} loading="lazy" alt="${escAttr(value.photo.alt)}" class="profile_img" width="${p.width}" height="${p.height}">` : '';
        return `<div data-rt-embed-type='true'><blockquote class="blockquote"><p><em>${escText(value.text)}</em></p><div class="blockquote_profile">${photo}<p class="body-m fw-500 color-dark">${escText(value.name)}</p></div></blockquote></div>`;
      },
      // Raw HTML kept verbatim: scripts / JSON-LD, the quiz, the table, style tags.
      htmlEmbed: ({ value }) => value.html ?? '',
    },
  };
}

/** A rich-text field in either shape → HTML. Strings (Webflow HTML, old shape) pass through unchanged. */
export function richHtml(v, cfg) {
  if (v == null || typeof v === 'string') return v;
  if (!Array.isArray(v)) return '';
  return toHTML(v, { components: components(cfg), onMissingComponent: false });
}
