import { defineArrayMember, defineField, defineType } from 'sanity';
import { pageSchemaTypes } from './page';
import { button, siteImage } from './sections';

// Phase 1 of the Webflow → Sanity move: the seven Webflow CMS collections, field for field as exported
// (src/content/ in the Astro repo, built from the Webflow CSVs by scripts/import-cms.py).
// Rich text is kept as the Webflow HTML (bodies carry embeds: quizzes, FAQ JSON-LD) and images as site paths
// (/images/cms/...), so the site renders exactly as before. Portable Text and Sanity image assets are phase 2.

const html = (name: string, title: string) =>
  defineField({ name, title, type: 'text', rows: 8, description: 'HTML from Webflow, rendered as-is.' });
const imagePath = (name: string, title: string) =>
  defineField({ name, title, type: 'string', description: 'Site path of the image, e.g. /images/cms/….' });

// Fields every Webflow collection had.
const common = [
  defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
  defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
  defineField({ name: 'webflowDraft', title: 'Had unpublished Webflow edits at export', type: 'boolean', initialValue: false }),
  defineField({ name: 'order', title: 'Sort order (Webflow export order)', type: 'number' }),
];

export const schemaTypes = [
  ...pageSchemaTypes, siteImage, button,
  defineType({
    name: 'article',
    title: 'Article',
    type: 'document',
    fields: [
      defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
      defineField({
        name: 'slug', type: 'slug', options: { source: 'title' },
        description: 'URL: /articles/<slug>. Backlinks point at these; never change a published one without a redirect.',
        validation: (r) => r.required(),
      }),
      defineField({ name: 'metaTitle', type: 'string' }),
      defineField({ name: 'metaDescription', type: 'text', rows: 3 }),
      defineField({ name: 'heroBtnText', title: 'Hero button text', type: 'string' }),
      defineField({ name: 'heroBtnLink', title: 'Hero button link', type: 'string' }),
      defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
      defineField({ name: 'categories', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'blogCategory' }] })] }),
      imagePath('image', 'Main image'),
      defineField({ name: 'date', type: 'date' }),
      defineField({ name: 'datePublished', title: 'Date published', type: 'date' }),
      html('summary', 'Summary (key takeaways)'),
      html('body', 'Body'),
      defineField({ name: 'webflowDraft', title: 'Had unpublished Webflow edits at export', type: 'boolean', initialValue: false }),
      defineField({ name: 'order', title: 'Sort order (Webflow export order)', type: 'number' }),
    ],
    orderings: [{ title: 'Date, newest', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
    preview: { select: { title: 'title', subtitle: 'slug.current' } },
  }),
  defineType({
    name: 'author', title: 'Author', type: 'document',
    fields: [...common, imagePath('profile', 'Profile image'), html('bio', 'Bio'), defineField({ name: 'link', type: 'string' })],
  }),
  defineType({ name: 'blogCategory', title: 'Blog category', type: 'document', fields: common }),
  defineType({
    name: 'testimonial', title: 'Testimonial', type: 'document',
    fields: [
      ...common, html('testimonial', 'Testimonial'), defineField({ name: 'age', type: 'string' }),
      defineField({ name: 'categories', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    ],
  }),
  defineType({
    name: 'solution', title: 'Solution', type: 'document',
    fields: [...common, imagePath('image', 'Image'), html('paragraph', 'Paragraph')],
  }),
  defineType({
    name: 'newsletter', title: 'Newsletter', type: 'document',
    fields: [
      ...common, imagePath('thumb', 'Thumbnail'), html('content', 'Content'),
      defineField({ name: 'description', type: 'text', rows: 3 }), defineField({ name: 'releaseDate', type: 'date' }),
    ],
  }),
  defineType({
    name: 'research', title: 'Research', type: 'document',
    fields: [
      ...common, html('body', 'Body'), defineField({ name: 'summary', type: 'text', rows: 3 }),
      imagePath('mainImage', 'Main image'), imagePath('thumbnail', 'Thumbnail'),
      defineField({ name: 'featured', type: 'boolean' }), defineField({ name: 'color', type: 'string' }),
    ],
  }),
];
