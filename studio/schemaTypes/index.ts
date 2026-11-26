import { defineArrayMember, defineField, defineType } from 'sanity';
import {
  BlockquoteIcon, BulbOutlineIcon, CodeIcon, CommentIcon, DocumentTextIcon, EnvelopeIcon, ImageIcon, LinkIcon, SearchIcon, TagIcon, UserIcon,
} from '@sanity/icons';
import { pageSchemaTypes } from './page';
import { button, siteImage } from './sections';

// Phase 1 of the Webflow → Sanity move: the seven Webflow CMS collections, field for field as exported
// (src/content/ in the Astro repo, built from the Webflow CSVs by scripts/import-cms.py).
// Phase 3 (branch sanity-portable-text): article body/summary and author bio are Portable Text (`richText`), and the
// article, author and solution images are Sanity image assets. The site renders both back to the markup it always had
// (src/lib/portable-text.mjs). Newsletters, research and testimonials have no pages and keep the phase 1 shapes.

const html = (name: string, title: string) =>
  defineField({ name, title, type: 'text', rows: 8, description: 'HTML from Webflow, rendered as-is.' });
const imagePath = (name: string, title: string) =>
  defineField({ name, title, type: 'string', description: 'Site path of the image, e.g. /images/cms/….' });

const image = (name: string, title: string, alt: boolean, description?: string) =>
  defineField({
    name, title, type: 'image', description,
    fields: alt ? [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describe the image for screen readers.' })] : [],
  });

// Rich text: what the article template styles (.blog-rte / .summary-rte). Webflow markup Portable Text can't hold
// (JSON-LD scripts, the quiz form, a table) is an "HTML embed" block, rendered verbatim.
const richText = defineType({
  name: 'richText', title: 'Rich text', type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Paragraph', value: 'normal' }, { title: 'Heading 2', value: 'h2' }, { title: 'Heading 3', value: 'h3' },
        { title: 'Heading 4', value: 'h4' }, { title: 'Quote', value: 'blockquote' },
      ],
      lists: [{ title: 'Bullets', value: 'bullet' }, { title: 'Numbered', value: 'number' }],
      marks: {
        decorators: [{ title: 'Bold', value: 'strong' }, { title: 'Italic', value: 'em' }],
        annotations: [
          defineArrayMember({
            name: 'link', title: 'Link', type: 'object', icon: LinkIcon,
            fields: [
              defineField({
                name: 'href', title: 'URL', type: 'string', validation: (r) => r.required(),
                description: 'A site path (/articles/trt-cost), a full URL, or #section / mailto: / tel:.',
              }),
              defineField({ name: 'blank', title: 'Open in a new tab', type: 'boolean' }),
              defineField({ name: 'rel', title: 'rel', type: 'string', description: 'Kept from Webflow (e.g. "noopener noreferrer"). New-tab links without one get rel="noopener".' }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image', title: 'Image', icon: ImageIcon,
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
        defineField({ name: 'caption', type: 'string' }),
        defineField({ name: 'maxWidth', title: 'Max width', type: 'string', description: 'From Webflow, e.g. "1536px". Leave empty for full width.' }),
      ],
    }),
    defineArrayMember({
      name: 'quote', title: 'Doctor quote', type: 'object', icon: BlockquoteIcon,
      fields: [
        defineField({ name: 'text', type: 'text', rows: 4 }),
        defineField({ name: 'name', type: 'string' }),
        defineField({ name: 'photo', type: 'image', fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })] }),
      ],
      preview: { select: { title: 'text', subtitle: 'name', media: 'photo' } },
    }),
    defineArrayMember({
      name: 'htmlEmbed', title: 'HTML embed', type: 'object', icon: CodeIcon,
      fields: [defineField({ name: 'html', title: 'HTML', type: 'text', rows: 10, description: 'Rendered as-is (JSON-LD, quiz, table). Edit with care.' })],
      preview: {
        select: { html: 'html' },
        prepare: ({ html }: { html?: string }) => ({
          title: /ld\+json/.test(html ?? '') ? 'JSON-LD (structured data)' : /<form|data-quiz/.test(html ?? '') ? 'Quiz' : /<table/.test(html ?? '') ? 'Table' : 'HTML embed',
          subtitle: (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80),
        }),
      },
    }),
  ],
});
const rich = (name: string, title: string) => defineField({ name, title, type: 'richText' });

// Fields every Webflow collection had.
const common = [
  defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
  defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
  defineField({ name: 'webflowDraft', title: 'Had unpublished Webflow edits at export', type: 'boolean', initialValue: false }),
  defineField({ name: 'order', title: 'Sort order (Webflow export order)', type: 'number' }),
];

export const schemaTypes = [
  ...pageSchemaTypes, siteImage, button, richText,
  defineType({
    name: 'article',
    title: 'Article',
    type: 'document',
    icon: DocumentTextIcon,
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
      image('image', 'Main image', true),
      defineField({ name: 'date', type: 'date' }),
      defineField({ name: 'datePublished', title: 'Date published', type: 'date' }),
      rich('summary', 'Summary (key takeaways)'),
      rich('body', 'Body'),
      defineField({ name: 'webflowDraft', title: 'Had unpublished Webflow edits at export', type: 'boolean', initialValue: false }),
      defineField({ name: 'order', title: 'Sort order (Webflow export order)', type: 'number' }),
    ],
    orderings: [{ title: 'Date, newest', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
    preview: { select: { title: 'title', subtitle: 'slug.current' } },
  }),
  defineType({
    name: 'author', title: 'Author', type: 'document', icon: UserIcon,
    fields: [...common, image('profile', 'Profile image', false, 'Shown at 40px next to the name (decorative, no alt text, as on the live site).'), rich('bio', 'Bio'), defineField({ name: 'link', type: 'string' })],
  }),
  defineType({ name: 'blogCategory', title: 'Blog category', type: 'document', icon: TagIcon, fields: common }),
  defineType({
    name: 'testimonial', title: 'Testimonial', type: 'document', icon: CommentIcon,
    fields: [
      ...common, html('testimonial', 'Testimonial'), defineField({ name: 'age', type: 'string' }),
      defineField({ name: 'categories', type: 'array', of: [defineArrayMember({ type: 'string' })], options: { layout: 'tags' } }),
    ],
  }),
  defineType({
    name: 'solution', title: 'Solution', type: 'document', icon: BulbOutlineIcon,
    fields: [...common, image('image', 'Image', false, 'Homepage carousel background (decorative, no alt text, as on the live site).'), html('paragraph', 'Paragraph')],
  }),
  defineType({
    name: 'newsletter', title: 'Newsletter', type: 'document', icon: EnvelopeIcon,
    fields: [
      ...common, imagePath('thumb', 'Thumbnail'), html('content', 'Content'),
      defineField({ name: 'description', type: 'text', rows: 3 }), defineField({ name: 'releaseDate', type: 'date' }),
    ],
  }),
  defineType({
    name: 'research', title: 'Research', type: 'document', icon: SearchIcon,
    fields: [
      ...common, html('body', 'Body'), defineField({ name: 'summary', type: 'text', rows: 3 }),
      imagePath('mainImage', 'Main image'), imagePath('thumbnail', 'Thumbnail'),
      defineField({ name: 'featured', type: 'boolean' }), defineField({ name: 'color', type: 'string' }),
    ],
  }),
];
