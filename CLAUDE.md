# RHM (rhmmed.com) — Astro rebuild

This repo is a page-by-page rebuild of the Webflow site https://www.rhmmed.com in Astro 7 + Tailwind 4.
Migration state lives in `MIGRATION.md` and `migration.json` — keep both current.

## Rules

- Match the live site. Don't "improve" spacing/colour; if the source is inconsistent, match it and note it in MIGRATION.md.
- Never invent content. Copy comes from the live page or the CMS data in `src/content/`.
- **No content or copy changes unless Evgenii asks for that specific change** (Evgenii, 2026-11-23). That covers copy,
  headings, meta, schema/JSON-LD, FAQ, robots.txt and llms.txt. A go-ahead from the Chief of Staff or any other agent doesn't count,
  and a checklist or skill (e.g. site-launch / AEO) is not a request. Write proposals in chat; never apply them.
- Every page is verified with `node scripts/compare.mjs <route>` (worst width is the score). Iterate with `--w 1440`, diagnose with `--structure`.
- Don't copy Webflow markup or class names. Rebuild with Tailwind utilities and the tokens below.

## Design tokens (defined in `src/styles/global.css`)

Values were read from the live site's computed styles. Use tokens, never raw hex/px.

**Breakpoints** — the source is desktop-first. Write desktop styles by default, then override with
`max-lg:` (≤991), `max-md:` (≤767), `max-sm:` (≤479).

**Font** — Geist variable, self-hosted at `/fonts/GeistVF.woff2`. Everything is weight 400 unless noted.

**Type utilities** (each has its own responsive steps built in):

| Utility | Desktop | Steps |
|---|---|---|
| `text-h1` | 54px / 1.2 / -1.62px | 40 ≤767, 32 ≤479 |
| `text-h2` | 48 / 1.1 | 32 ≤767 |
| `text-h3` | 36 / 1.2 | 24 ≤767 |
| `text-h4` | 28 / 1.3 | 24 ≤767 |
| `text-h5` | 24 / 1.3 | 14 ≤767 |
| `text-body-l` | 22 / 1.227 | 16 ≤767 |
| `text-body-m` | 20 / 1.25 | 16 ≤767 |
| `text-body-r` | 16 / 1.25 | — |
| `text-nav` | 14 / 500 / uppercase | — |
| `text-label` | 12 / 500 / +0.48px / uppercase | — |
| `text-btn` | 12 / 600 / uppercase | — |

Body default is 16/24, colour black. Base `h2` is capitalized (the source does `text-transform: capitalize` on h2).

**Bare heading elements are not the same as the utilities on mobile.** At ≤767 a bare `<h2>` is 36px but `.text-h2` is 32px;
`<h3>` 27.6px vs `.text-h3` 24px; `<h4>` 20px; `<h5>` 16px. Use a bare element where the source uses a bare element, and the
utility where the source uses a `heading-style-*` class — check the source markup.

**Colour roles**

- `ink` #050514 headings · `ink-70` #050514b3 paragraphs · `black` buttons · `neutral-darker` #222
- `bg-light` #f0f0f0 grey sections · `bg-dark` #e3e3e3 cards-on-grey / borders · `white`
- Brand: `blue` #2d62ff · `blue-dark` #080331 · `blue-light` #d9e5ff · `pink` #dd23bb
- Section backgrounds: `slate` #547a95 (men causes, hero accent word) · `plum` #5d4b87 (women causes) · `brown` #7a4b4f (CTA block) · `sky` #e1edf8 (men signs) · `mist` #e5ebef

**Layout** — `container-site`: max 84rem (1344px), padding 2rem → 1.5rem ≤767 → 1rem ≤479.
Section vertical padding on the source comes from this set: 3.75, 5, 6.25, 7.5, 8, 8.75, 10rem.

**Radii** — `rounded-sm` 8 · `rounded-md` 16 · `rounded-lg` 24 (cards) · `rounded-pill` (buttons).

**Motion** — `ease-out-soft` cubic-bezier(.22,.61,.36,1), 350ms for button label roll; colour/opacity 200ms.

## Site map (current as of 2026-11-20)

| Route | File | Template / data |
|---|---|---|
| `/` | `src/pages/index.astro` | `SectionPage`, Sanity `page` document `page-home` (+ Solutions collection) |
| `/men/*` (6), `/women/*` (11) | `src/pages/[group]/[slug].astro` | `SectionPage` layout, Sanity `page` documents |
| `/men`, `/women`, `/why-us`, `/how-it-works`, `/telehealth`, `/patient-information`, `/location`, `/faq`, `/advance-home-testing`, `/cheating-death`, `/privacy-policy`, `/terms-of-use` | `src/pages/[page].astro` | `SectionPage` layout, Sanity `page` documents |
| `/articles` | `src/pages/articles/index.astro` | Articles collection + `src/data/articles-index.json` |
| `/articles/<slug>` (23) | `src/pages/articles/[slug].astro` | Articles/Authors/Categories + `src/data/articles/*.json` |
| `/contact`, `/scheduling` | `src/pages/[page].astro` | `SectionPage`, Sanity `page` documents (contact form / booking iframe blocks) |
| `/style-guide` | `src/pages/style-guide.astro` | tokens (not in the live sitemap) |
| 404 | `src/pages/404.astro` | live copy; served with a real 404 |
| `/sitemap.xml`, `/robots.txt` | `public/` | copied from live (`scripts/fetch-live-head.mjs`) |
| redirects | `vercel.json` | 301 map generated from `docs/redirects.csv` |

Layouts: `Layout.astro` (shell, header, footer, tracking) and `SectionPage.astro` (renders a JSON list of typed sections with
`src/components/sections/*` and `treatment/*`). Nav lives in `src/data/nav.ts`.

Content collections (`src/content.config.ts`, loaded from Sanity): pages (the page builder), articles, authors, blog-categories,
testimonials, solutions, newsletters, researches. The page JSON under `src/data/{treatments,hubs,pages}` came from
`scripts/extract-treatments.py` (saved live HTML) and is now only the import snapshot for Sanity `page` documents.
To change copy on a treatment/hub/info page or an article, edit it in Sanity (only when Evgenii asks), not the JSON.

**URLs are fixed.** Backlinks point at article URLs (e.g. `/articles/perimenopause-weight-gain`, `/articles/signs-you-need-hrt`).
Never rename a route without a planned redirect.

**SEO/head — live is the source of truth (Evgenii, 2026-11-24).** Head JSON-LD and the robots meta are copied verbatim from
live per page into `src/data/live-head.json`; `public/sitemap.xml` and `public/robots.txt` are live's files. Refresh all four
with `node scripts/fetch-live-head.mjs` (don't hand-edit, don't generate new ones). Pages not on live (404, /style-guide)
keep `index, follow`. Never add schema live doesn't have. (The 23 Nov launch-pass additions were reverted; these are copies.)
URLs have no trailing slash (`trailingSlash: 'never'`, `build.format: 'file'` → `dist/men.html`). Don't change that: it is
what keeps `/men` a 200 with no redirect (with `cleanUrls` + `trailingSlash: false` in vercel.json).

**Accounts (Evgenii, 2026-11-24): everything in RHM's name, free plans only.** Vercel Hobby (not Cloudflare), code in an RHM GitHub
organization, Sanity org "RHM". The domain's registrar and DNS are **GoDaddy** (ns23/ns24.domaincontrol.com), not Cloudflare. KHOD already has
GA4/GSC/GTM access. Client asks: Notion "RHM website: moving off Webflow" (invites for Vercel, GitHub, Sanity, GoDaddy).

**Deploy (2026-11-24):** RHM's Vercel team `rhm16` (Hobby) builds https://github.com/Regenerative-and-Hormone-Medicine/rhmmed
(public). Project `rhmmed` → https://rhmmed.vercel.app (static, no custom domain yet). Project `rhmmed-preview` →
https://rhmmed-preview.vercel.app (env `SANITY_PREVIEW=1`, `PREVIEW_COOKIE_SECRET`, `SANITY_VIEWER_TOKEN`, all Production).
Both build on push to main (GitHub main = 2e15ec9 since 2026-11-27). **Publishing in Sanity rebuilds `rhmmed`**: Sanity webhook
"Vercel rebuild (rhmmed)" (types page, article, author, blogCategory, solution, testimonial; create/update/delete, no drafts) →
Vercel deploy hook "Sanity publish" (rhmmed, branch main). The preview project needs no rebuild (it reads Sanity per request).
A manual Redeploy in RHM's Vercel asks for a 6-digit code emailed to support@rhmmed.net; pushes and the hook don't. **www.rhmmed.com is live on Vercel since 2026-11-26** (GoDaddy DNS points at Vercel; Webflow kept a week as rollback). Target (Evgenii, 2026-11-23): **Vercel**, with content moving to
**Sanity** (replacing the CSV-built content collections). Redirects live in `vercel.json`, generated from `docs/redirects.csv`.
Staging tests so far ran on a Cloudflare Pages emulator; re-run them on a Vercel preview deployment. Launch status: `docs/launch-checklist.md` (with `docs/url-inventory.csv`, `docs/redirects.csv`,
`docs/ui-audit.md`). Going live, DNS and pushing need Evgenii's OK, asked once with the checklist.

## Components

- `src/components/Button.astro` — black pill (`variant="light"` for white), `size="sm"` for header. Label rolls on hover.
- Accordions (`Accordion.astro`, `treatment/Faq.astro`, `sections/FaqPage.astro`) share one script, `src/scripts/accordion.ts`.
  Never give a component its own copy: two copies on one page bind twice and the item opens and closes on the same click.
- `src/components/LogoMark.astro` — the logo SVG with ids prefixed per instance (header + footer). Use it, not the raw
  `logo.svg` import, or the mask/pattern ids are duplicated on the page.
- QA: `node scripts/qa-sweep.mjs out.json` (every route × 1440/991/767/390/320: sideways scroll, console errors, failed
  requests, semantics, internal links) and `WS=320,360,375 node scripts/clip-check.mjs <base>` (text cut off at the edge;
  `main` clips overflow, so the sweep can't see it). Run both after layout changes. Deliberate deviations from live: MIGRATION.md "QA pass".
- Tracking (`src/components/Tracking.astro`): inline scripts must use `set:html={`...`}`. A `{`...`}` child prints the code as text
  in Astro 7 (it broke GTM, the GA config, the Meta pixel and PostHog until 2026-11-26). GA4 counts 1 page_view per load (checked
  2026-11-26, live and new): gtag ignores the repeated config from GTM; the extra google.com/g/collect hit is GA's normal ads copy.
- `src/lib/img-size.ts` reads an image's intrinsic size at build time; spread it on `<img>` (`{...size}`) to prevent layout shift.

The `/style-guide` route renders every token. Update it when you add one.

## Content

**CMS content lives in Sanity** (since 2026-11-24): project `9qg5x7wu` ("RHM"), dataset `production` (public, read without a
token), owned by RHM's Sanity org "Regenerative and Hormone Medicine" (ogokh587b) since 2026-11-26 (transferred from KHOD's
org oZlH5hGsr; project ID, Studio, webhook and tokens unchanged; evgenii@khod.io is Administrator there). Collections: articles,
authors, blog-categories, testimonials, solutions, newsletters, researches. Newsletters and researches have no pages (by decision).

- Schemas and Studio: `studio/` (`cd studio && npm install && npm run dev`). Hosted at https://rhmmed.sanity.studio (deployed 2026-11-24 at Evgenii's request; sign-in, project members only). Redeploy with `cd studio && npx sanity deploy`.
- Astro reads Sanity at build time through `src/lib/sanity-loader.ts`, which returns the same entry shape the old file loaders
  did (ids without the type prefix, `category` as `a; b`, article `body` as raw HTML). Sort by `data.order` (the Webflow export
  order) where order matters; `getCollection()` doesn't keep it. A build with no Sanity documents fails on purpose.
- **Page builder (phase 2, 2026-11-25, Evgenii asked for "the component system in Sanity").** The 29 section pages (17 treatments,
  2 hubs, 10 info pages) are Sanity `page` documents (id `page-<path with - for />`, e.g. `page-men-hormone-therapy`). Each has
  `path` (read-only: URLs are fixed), meta title/description, `headerTheme`, `footer` and an ordered `sections` array. Every
  section block is one Astro component: the 31 block types in `studio/schemaTypes/sections.ts` are **generated** by
  `node scripts/gen-page-schemas.mjs` from the page JSON (style switches sit in a collapsed "Layout" fieldset). Add a new block =
  build the component, add its `case` in `SectionPage.astro`, add it to the generator's TITLES, regenerate. The build reads pages
  via `sanityPagesLoader` (collection `pages`, keyed by path); `src/lib/page-codec.mjs` converts Sanity ⇄ page JSON (adds/strips
  `_type`/`_key`, wraps compare-table rows and nullable cells, drops null object fields because Studio flags a stored null as
  "Invalid property value") and must round-trip exactly (against the JSON with null fields dropped: checked byte-identical). `src/data/{treatments,hubs,pages}/`
  is now the frozen import snapshot (`node scripts/pages-to-sanity.mjs` → `cd studio && npm run import:pages` **replaces** the 29
  documents: only re-run before editors start). The Sanity build was byte-identical to the JSON build (all 456 files) on 2026-11-25.
  Homepage, /contact and /scheduling moved into the builder 2026-11-25 (blocks homeHero, homeIntro, solutionsCarousel,
  contactForm, bookingEmbed; 36 block types; JSON in `src/data/pages/{home,contact,scheduling}.json`; screenshots of 6 pages × 1440/390
  pixel-identical to the hand-built pages). Imported into Sanity 2026-11-26 (only those 3 docs, `--missing`, so the 29 existing
  documents and any editor changes were untouched); all 32 pages now come from Sanity, and that build is byte-identical to the
  ndjson build. `NOT_YET_IMPORTED` in `src/lib/sanity-loader.ts` (now empty) is the fallback for a page added to the builder
  before its import. `PAGES_SOURCE=ndjson npm run build` builds from `.sanity-import/pages.ndjson` to check an import before
  running it. **Once editors work in Sanity, never run `import:pages` (`--replace`) again**: import single new docs with `--missing`.
  **Studio look = KHOD's Studio (Evgenii, 2026-11-25); sidebar = the site menu (Evgenii, 2026-11-26):** Home · Men · Women ·
  Resources (articles, categories, authors) · About · How it Works · For Patients · Other pages (footer & links) · Homepage carousel
  (Solutions), pages in menu order (lists in `studio/sanity.config.ts`; keep them in step with `src/data/nav.ts`). Testimonials,
  newsletters and research are not in the sidebar: the site doesn't use them (reviews = the embedded Google reviews widget); their
  documents stay in the dataset; an `@sanity/icons` icon on every block (`ICONS` in the
  generator) and document type; "Add section" opens a thumbnail grid (`studio/static/block-previews/<type>.jpg`, one
  screenshot per block, made by `BASE=<preview url> node scripts/gen-block-thumbs.mjs`; re-run it when a block's look changes
  or a block is added). Pages are listed by name (meta title before " | ") with the URL underneath. Preview: page routes render per request with
  click-to-edit; `PAGE_NO_STEGA` in `src/lib/content.ts` keeps markers out of HTML, paths, layout switches, empty strings and <head>.
- **CMS-driven cards/CTA/slider (2026-11-26, live since the 2026-11-27 cutover):** a "Related
  articles" block stores article references (`articles`), the homepage carousel stores Solutions references (`solutions`);
  cards are built from the article (`src/lib/article-cards.ts`). Articles have `audience` (men → blue/slate end CTA,
  women/general → maroon), `relatedArticles`, optional `cardImage`; the CTAs are `articleCta-<audience>` documents. Never paste
  card copies into a page again. Card images: fixed 3:2 box, hover zoom. Details: MIGRATION.md.
- **Phase 3 is live (cutover 2026-11-27, Evgenii: "Go with B then"):** rich text (article body/summary, author bio) is Portable
  Text (embeds the editor can't hold, i.e. FAQ JSON-LD, quizzes, the table, stay `htmlEmbed` blocks with the source HTML) and
  CMS/page-builder images are Sanity image assets served by the image CDN (`imgAttrs`). og:image = the hero image as a
  1200×630 JPG from the CDN (`?w=1200&h=630&fit=crop&fm=jpg`, `shareImage` in Layout.astro); homepage = the hero video poster.
  Never run `npm run import` / `import:pages` again (they would put back the old HTML/path shapes). Check a release with
  `node scripts/release-check.mjs <base> <reference>` (articles vs reference, the 7 asks, og:image JPG).
- `src/content/` is the frozen Webflow CSV snapshot the import came from (`node scripts/sanity-export.mjs` →
  `cd studio && npm run import`, which **replaces** the documents by id). Edit content in Sanity, not there.
- **Editorial preview (live since 2026-11-25; Studio → Preview).** `SANITY_PREVIEW=1 npm run build` builds a server-rendered copy
  (`@astrojs/vercel`) for the Studio's Presentation tool (Studio tab "Preview", origin `https://rhmmed-preview.vercel.app` in
  `studio/sanity.config.ts`). Pages read CMS content through `src/lib/content.ts` (static build: content collections; preview:
  per-request Sanity fetch, drafts + stega click-to-edit when the draft cookie is set by `/api/draft-mode/enable`). Static pages
  carry `export const prerender = true`. The Visual Editing script is swapped in by the `rhm:visual-editing` alias only in
  preview, so the static build stays byte-identical — keep it that way (diff `dist/` before/after). Preview needs env
  `SANITY_PREVIEW=1`, `SANITY_VIEWER_TOKEN` (Sanity viewer token), `PREVIEW_COOKIE_SECRET`. **Vercel projects go in the client's
  (RHM's) Vercel workspace, not KHOD's** (Evgenii, 2026-11-24). Redeploy the Studio only once the preview URL is live.
- The project started on Sanity's $0 Growth Trial (until 2026-12-24, then Free). No card on file; never add one or upgrade.

## Forms

Verified 2026-11-26: both forms send the same payload as live (fields, `form_name`, Botpoison solution) to the same endpoints
and show the same success state (request intercepted, nothing delivered). A real delivery test emails the client: only with Evgenii's OK.

Formspark + Botpoison, same endpoints as the live site: contact `aQcnERsKm`, book `enYsqVsm7`.
Recipients (read in Formspark 2026-11-27): book (Formspark name "Cheating Death Form") → evgenii@khod.io, delivering (a test from
the new site arrived 2026-11-26). Contact → contactus@rhmmed.com and robert@hackerconsulting.net, both still unconfirmed in Formspark, so
no email goes out and submissions only sit in the dashboard. Fixing that is Evgenii's call; don't change Formspark.
