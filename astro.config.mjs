// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// SANITY_PREVIEW=1 builds the editorial preview (rhmmed-preview.vercel.app, shown in the Studio's Presentation tool):
// server-rendered on Vercel so drafts show on every request. Without it the build is the plain static site.
const PREVIEW = process.env.SANITY_PREVIEW === '1';
const previewConfig = PREVIEW
  ? {
      output: /** @type {const} */ ('server'),
      adapter: (await import('@astrojs/vercel')).default(),
      integrations: [
        {
          name: 'rhm-draft-mode',
          hooks: {
            /** @param {{ injectRoute: (r: { pattern: string; entrypoint: string; prerender?: boolean }) => void }} o */
            'astro:config:setup': ({ injectRoute }) => {
              injectRoute({ pattern: '/api/draft-mode/enable', entrypoint: './src/preview/enable.ts', prerender: false });
              injectRoute({ pattern: '/api/draft-mode/disable', entrypoint: './src/preview/disable.ts', prerender: false });
            },
          },
        },
      ],
    }
  : {};

// https://astro.build/config
export default defineConfig({
  site: 'https://www.rhmmed.com',
  // URLs have no trailing slash, as on the live Webflow site (canonicals, sitemap and backlinks all use /men, not /men/).
  // `format: 'file'` writes dist/men.html; vercel.json `cleanUrls` serves it at /men with no redirect.
  trailingSlash: 'never',
  build: { format: 'file' },
  ...previewConfig,
  vite: {
    plugins: [tailwindcss()],
    define: { __RHM_PREVIEW__: JSON.stringify(PREVIEW) },
    // The Visual Editing script exists only in the preview build; the static build gets an empty component.
    resolve: { alias: { 'rhm:visual-editing': fileURLToPath(new URL(PREVIEW ? './src/components/VisualEditing.astro' : './src/components/Empty.astro', import.meta.url)) } },
  },
});
