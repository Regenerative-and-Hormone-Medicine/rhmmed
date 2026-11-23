// Intrinsic size of an image in /public, read at build time, so <img> tags can carry width/height and the browser
// reserves the space before a lazy image loads (CLS). CSS classes still decide the rendered size.
import sharp from 'sharp';
import path from 'node:path';

const cache = new Map<string, { width?: number; height?: number }>();
export async function imgSize(src: string) {
  if (!src?.startsWith('/')) return {};
  if (!cache.has(src)) {
    try {
      const m = await sharp(path.join(process.cwd(), 'public', decodeURI(src))).metadata();
      cache.set(src, { width: m.width, height: m.height });
    } catch { cache.set(src, {}); }
  }
  return cache.get(src)!;
}
