// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.rhmmed.com',
  // URLs have no trailing slash, as on the live Webflow site (canonicals, sitemap and backlinks all use /men, not /men/).
  // `format: 'file'` writes dist/men.html; vercel.json `cleanUrls` serves it at /men with no redirect.
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    plugins: [tailwindcss()]
  }
});
