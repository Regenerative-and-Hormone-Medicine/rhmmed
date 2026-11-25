import { defineArrayMember, defineField, defineType } from 'sanity';
import { DocumentIcon } from '@sanity/icons';
import { sectionTypes } from './sections';

// "Add section" menu: a grid of thumbnails (one screenshot per block, studio/static/block-previews/<type>.jpg, made by
// scripts/gen-block-thumbs.mjs) with the list view as the alternative. Same setup as KHOD's Studio.
const THUMBS = new Set<string>(sectionTypes.map((t) => t.name));

// Phase 2: the static pages (treatments /men/* /women/*, hubs /men /women, info pages) as a page builder. Each page is an
// ordered list of sections; each section type is one Astro component (studio/schemaTypes/sections.ts, generated).
// Imported from src/data/*.json by scripts/pages-to-sanity.mjs. The homepage, /contact, /scheduling and articles are not
// page-builder pages (yet).
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: [
    { name: 'content', title: 'Sections', default: true },
    { name: 'seo', title: 'SEO & settings' },
  ],
  fields: [
    defineField({
      name: 'path', group: 'seo', type: 'string', readOnly: true,
      description: 'URL of the page. Fixed: backlinks and Google point at it; a change needs a planned redirect.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'title', title: 'Meta title', group: 'seo', type: 'string' }),
    defineField({ name: 'description', title: 'Meta description', group: 'seo', type: 'text', rows: 3 }),
    defineField({
      name: 'headerTheme', group: 'seo', type: 'string', options: { list: ['dark', 'light'], layout: 'radio' },
      description: 'Header text colour before scrolling: light = white text over a dark hero image.',
    }),
    defineField({
      name: 'footer', group: 'seo', type: 'object', description: 'Leave empty for the standard footer.',
      fields: [
        defineField({ name: 'minimal', title: 'Minimal footer (no link columns)', type: 'boolean' }),
        defineField({ name: 'blurb', type: 'text', rows: 3, description: 'HTML, rendered as-is.' }),
      ],
    }),
    defineField({
      name: 'sections', group: 'content', type: 'array',
      of: sectionTypes.map((t) => defineArrayMember({ type: t.name })),
      options: {
        insertMenu: {
          filter: true,
          showIcons: true,
          views: [
            { name: 'grid', previewImageUrl: (type: string) => (THUMBS.has(type) ? `/static/block-previews/${type}.jpg` : undefined) },
            { name: 'list' },
          ],
        },
      },
    }),
    defineField({ name: 'order', title: 'Sort order', group: 'seo', type: 'number', hidden: true }),
  ],
  // Listed by page name (the meta title up to its first " | " / " - "), with the URL underneath.
  preview: {
    select: { title: 'title', path: 'path' },
    prepare: ({ title, path }) => ({ title: (title || '').split(/ [|–-] /)[0] || path || 'Untitled page', subtitle: path }),
  },
});

export const pageSchemaTypes = [...sectionTypes, page];
