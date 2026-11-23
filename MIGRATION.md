# rhmmed.com → Astro migration

Source: https://www.rhmmed.com (Webflow, site id `6989e64ef88fec894b385af9`), 56 URLs in the sitemap.
Target: Astro 7 + Tailwind 4 (this repo).
Machine-readable status: `migration.json`. Measurement: `node scripts/compare.mjs <route> [--w 1440] [--structure]`.

## Status

| Phase | State |
|---|---|
| 0. Survey | **done** |
| 1. Design system | **done** — `/style-guide`, tokens in CLAUDE.md |
| 2. Homepage | **done** — 98.06% |
| 3. Other templates | **active** — all 56 URLs built; final verification pass running, outliers being fixed |
| 4. Remainder | started — see "Open items" at the bottom |
| 5. Launch prep | **active** — `docs/launch-checklist.md` (sections 1–4 of the site-launch checklist) |

**All 56 sitemap URLs now exist in the rebuild** (plus `/style-guide`). Per-route scores: see "Scores" below.

Baseline (untouched starter vs original homepage): **10.2%** worst width. This only proves the measuring loop works.

## Breakpoints (from the site's own CSS)

Webflow defaults: desktop > 991 · tablet ≤ 991 · mobile landscape ≤ 767 · mobile portrait ≤ 479.
Measured at **1440 / 991 / 767 / 390**. Score = worst width, never the average.

## Fonts

- **Geist** (variable, 100–900): served from Webflow CDN. Open-source (OFL) → self-host. No substitution needed.

## Design tokens already in the source (`:root`)

Brand: blue `#2d62ff`, blue-dark `#080331`, blue-light `#d9e5ff`, pink `#dd23bb`; ink `#050514`, paragraph `#050514b3`,
bg-light `#f0f0f0`, bg-dark `#e3e3e3`. Type: h1 3.375rem/120%/-0.10125rem, h2 3rem/110%, h3 2.25rem/120%, h4 1.75rem/130%,
h5 1.5rem/130%, body-l 1.375rem, body-m 1.25rem, body-r 1rem, btn/label .75rem. Full extraction happens in Phase 1.

## Shared regions

- **Header**: logo, Men ▾ (6), Women ▾ (11), Resources ▾, About ▾, How it works, For Patients ▾ (incl. Charm patient-portal link), "Book VIP Call" → `/scheduling`. Mobile menu.
- **Footer**: logo + blurb, Treatments / Process & Support / Company & Resources columns, Facebook + Instagram, LegitScript seal, Privacy/Terms.
- **Repeated sections** (become components): final CTA with cloud image (`cta-abs_img`), CTA block (`cta-block`), "Real Experiences" testimonials slider (Testimonials CMS, Swiper), "Why" section, compare table, causes grid, FAQ accordion (`align-center`), "Research & Insights" 3 latest articles, process steps, voices, symptoms.

## Templates (56 URLs → 9 templates)

| # | Template | URLs | Notes |
|---|---|---|---|
| T1 | Home | `/` | rotating hero word (GSAP SplitText), crossfade hero image, accordion, Swiper carousel, testimonials |
| T2 | Audience hub | `/men`, `/women` | same section kit, different content/variants |
| T3 | Treatment / condition detail | 6 × `/men/*`, 11 × `/women/*`, `/advance-home-testing` (18) | hardest + highest-volume: ~13 sections from a shared kit; content is hard-coded per page in Webflow (not CMS) |
| T4 | Info pages | `/why-us`, `/how-it-works`, `/telehealth`, `/patient-information`, `/location`, `/faq` | composed from the shared section kit |
| T5 | Article index | `/articles` | Finsweet list filter by category (client-side) |
| T6 | Article detail | 23 × `/articles/*` | **CMS: Articles** (+ Authors, Blog Categories). `signs-you-need-hrt` contains a custom interactive quiz embed |
| T7 | Contact | `/contact` | Formspark form `aQcnERsKm` + Botpoison; Reputation Hub reviews iframe |
| T8 | Book landing | `/cheating-death` | Formspark form `enYsqVsm7` + Botpoison |
| T9 | Legal + embed | `/privacy-policy`, `/terms-of-use`, `/scheduling` | scheduling = Cogitare/GHL booking iframe |

## CMS exports (in ~/Downloads, copied into the repo during Phase 1)

| Collection | Items | Used on public pages? |
|---|---|---|
| Articles | 23 | yes — T5, T6, homepage "Research & Insights" |
| Blog Categories | 10 | yes — article filters/labels |
| Authors | 2 | yes — article detail |
| Testimonials | 10 | yes — "Real Experiences" slider |
| Solutions | 5 | likely — homepage "Personalized physician-led" carousel (to confirm) |
| Newsletters | 22 | **no page in the sitemap renders these** |
| Researches | 5 | **no page in the sitemap renders these** |

## Third-party / cannot come across as-is

- **Booking widget** (`/scheduling`): Cogitare/GoHighLevel iframe — will be re-embedded, not rebuilt.
- **Reviews widget** (`/contact`): reputationhub.site iframe — re-embedded.
- **Forms**: Formspark endpoints are portable; re-wired to the same IDs (pending decision).
- **Tracking**: GTM `GTM-MNGP32KD`, GHL external-tracking script (`link.rhmmed.net`) — re-added verbatim.
- **LegitScript seal** — external image + link, re-added.
- **Charm patient portal** — external link only.
- **Webflow interactions (GSAP/IX2)**: reveal-on-scroll, rotating headline, hero crossfade will be re-implemented by hand; exact easing may differ slightly.
- **Images**: currently on Webflow's CDN — they stop working when the Webflow site is cancelled, so they must be downloaded.

## Measurement caveats

Animated regions (rotating hero word, hero crossfade, testimonial/solutions sliders) will never match pixel-for-pixel between two captures; they show up as a residual in every score.

## Decisions (settled 2026-11-19)

- Content → Astro content collections generated from the CSVs.
- Forms → same Formspark endpoints + Botpoison.
- Newsletters / Researches → imported as data, no pages.
- Images → downloaded and self-hosted.

## Content import (done)

`python3 -I scripts/import-cms.py <csv-dir>` → `src/content/` (23 articles as Markdown with HTML bodies; authors, blog-categories,
testimonials, solutions, newsletters, researches as JSON). 88 images downloaded to `public/images/cms/` (58 MB, mostly newsletters).

`tirzepatide-peptide`, `pcos-belly-fat` and `trt-side-effects` were flagged Draft in the export (unpublished Webflow edits).
**Decided 2026-11-19:** all three go live with the exported text.

## Homepage (T1) — verified, awaiting sign-off

| Width | Score |
|---|---|
| 1440 | 98.06% |
| 991 | 98.52% |
| 767 | 99.01% |
| 390 | 98.70% |

Page heights match the original to within 5px at every width. Also checked by hand: desktop hover dropdowns, mobile menu
(item positions match the original), accordion, solutions carousel (autoplay, arrows, pagination fill), header turns white on
scroll, no horizontal overflow at 390/600/1200, no console errors.

**Residual (not defects):** hero background video and rotating headline word are captured at different frames on each side;
the reviews block is a third-party iframe (pinned to 400px in captures because it resizes unpredictably).

**Source quirks deliberately kept:**
- Men ▸ "Sexual Health & Libido" links to `/women/sexual-health`.
- "Research & Insights" cards on the homepage are hand-built in Webflow (static images, fixed 3 articles), not CMS-driven.
  Kept identical; could be switched to "latest 3 articles" if you want.
- Solutions carousel order is Webflow's manual sort, pinned in `src/pages/index.astro` (`SOLUTIONS_ORDER`).

**How measuring works now:** `npx astro build` then `node scripts/compare.mjs <route>` against `astro preview` on :4400.
The Ship Studio dev server on :3435 was started before the content collections existed and does not serve them —
**restart the Ship Studio preview** to see CMS-driven sections there.

### Lessons for the remaining templates
- At ≤767 bare `<h2>/<h3>/<h4>/<h5>` differ from `.text-h*` utilities (see CLAUDE.md). Check which one the source uses.
- Tailwind preflight differs from Webflow's: images/SVG/iframes are `display:block; vertical-align:middle` here, inline in
  Webflow. Where the source relies on an inline gap (iframes, inline SVG icons), set it back explicitly.
- Base `li` on the source has `margin-bottom:1rem` and body-m size.
- `.w-background-video` is always 500px tall in Webflow regardless of aspect-ratio classes.
- Swiper's CSS is unlayered and beats Tailwind utilities on slides — use `!` where they collide.

## T3 — Treatment / condition pages (17) — built, verifying

`/advance-home-testing` turned out to be structurally different (its own sections), so it moves to T4 as a one-off page.

**How it's built:** `python3 -I scripts/extract-treatments.py <saved-html-dir>` parses each live page into
`src/data/treatments/<group>__<slug>.json` — an ordered list of typed sections. Text is copied, never retyped; the
extractor checks every section for visible words it didn't capture (currently **0 misses across all 17 pages**).
`src/pages/[group]/[slug].astro` → `src/layouts/TreatmentPage.astro` renders the sections with `src/components/treatment/*`.
Men/women differences (slate vs brown accents, uppercase men hero, mist cards) are a `theme` derived from the URL.

To change copy on one of these pages: edit its JSON file. (Not a CMS — these were hand-authored per page in Webflow too.)

`/women/menopause` (reference page): 1440 98.08% · 991 97.05% · 767 98.08% · 390 98.86%.

### More source rules learned (apply to remaining templates)
- `.heading-style-h1 p` / `.heading-style-h4 p` / `.body-r p` resize nested rich-text paragraphs — mirrored in global.css.
- Bare `<p>` is 20/1.25 at every width.
- `.symptom-block li` has a divider + 1rem padding/margin; checklist `li` spacing is 1rem with no trailing margin.
- Higher-specificity desktop rules sometimes beat mobile ones on the source (`.is-compare.is-big` keeps 100px padding on mobile) — copy the outcome, not the media query.

## Progress log (2026-11-19, afternoon)

- Extractor generalised (`scripts/extract-treatments.py <html-dir> [out-subdir files...]`): treatments → `src/data/treatments`,
  hubs → `src/data/hubs`, info pages → `src/data/pages`. One renderer: `src/layouts/SectionPage.astro`.
  Routes: `src/pages/[group]/[slug].astro` (treatments), `src/pages/[page].astro` (hubs + info pages).
- Per-element widths (`mw-N` → N px), Why-section spacer variants, card orientation, hero heading style are all extracted
  rather than hardcoded, because they vary page to page.
- `src/components/Rich.astro` renders Webflow rich text as `<div>` when it contains paragraphs (they can't nest in `<p>`).
- Source rich text drops first/last child margins (`.w-richtext > :first-child`), mirrored as `.rich > :first-child`.
- Measuring: `scripts/batch-compare.sh <routes...>`, `scripts/inspect.mjs <route> <width> <section-index>` (element boxes
  side by side). A second static build can be served for parallel work: `npx astro build --outDir dist-wip` +
  `python3 -m http.server 4401 --directory dist-wip`, then `LOCAL=http://localhost:4401 node scripts/compare.mjs ...`.

Scores after the latest fixes (1440 unless noted): menopause 99.17, HRT 98.03, hormone-therapy 98.04 (767: 97.31),
erectile-dysfunction 97.92, peptide-therapy (men) 98.02, /women hub 94.7, /men hub 93.2. Full four-width pass running.

## How every page is built (current)

| Pages | Route file | Data |
|---|---|---|
| `/` | `src/pages/index.astro` | hand-built + Solutions CMS |
| 17 treatment pages `/men/*`, `/women/*` | `src/pages/[group]/[slug].astro` | `src/data/treatments/*.json` |
| `/men`, `/women`, info pages, legal, `/faq`, `/location`, `/advance-home-testing`, `/cheating-death` | `src/pages/[page].astro` | `src/data/hubs/*.json`, `src/data/pages/*.json` |
| `/articles` | `src/pages/articles/index.astro` | Articles CMS + `src/data/articles-index.json` (hero copy, live order, image alts) |
| 23 `/articles/*` | `src/pages/articles/[slug].astro` | Articles/Authors/Categories CMS + `src/data/articles/*.json` (alt text, CTA, related list) |
| `/contact`, `/scheduling` | dedicated `.astro` pages | — |

All JSON under `src/data/` is produced by `scripts/extract-treatments.py` from the saved live HTML; re-run it if the live
site changes before cutover. All CMS content comes from `scripts/import-cms.py`.

## Open items (the remainder)

1. **`/cheating-death` 3D book** — ported (2026-11-19, on request): `src/scripts/book3d.ts` is the live page's three.js code
   (three@0.169.0 from npm, ~480 KB, loaded on that page only), same intro (copy/form/header hidden until the book pops in,
   4s safety timeout, skipped for reduced motion), drag-to-spin, mouse tilt, scroll turn. Cover served locally. Static image
   remains the fallback when WebGL is unavailable.
2. **`/men` hub hero** renders slightly lighter than the source (same image file, same overlay, same geometry — cause not found).
3. **Copy-link share button on articles**: the live button copies `https://www.rhmmed.com/blog/<slug>`, which 404s. The rebuild
   copies the real article URL. **Approved by the user 2026-11-19.**
4. **Kept source quirks**: Men menu "Sexual Health & Libido" → `/women/sexual-health`; "metabolism" link on
   `/men/erectile-dysfunction-clinic` points to `#`; "Inflamation" category spelling; "Your Messaage" placeholder on /contact;
   "Patient inforomation" label on /patient-information.
5. **Third-party embeds** (re-embedded, not rebuilt): reviews widget (Reputation Hub), booking calendar (`/scheduling`),
   tracking scripts (production only). Their contents can't be verified by the visual comparison.
6. **Webflow "draft" articles** (`tirzepatide-peptide`, `pcos-belly-fat`, `trt-side-effects`): all go live (user, 2026-11-19).
10. **Non-breaking spaces (fixed 2026-11-19):** the extractor collapsed `&nbsp;`, which the source uses to control heading
    wraps (29 pages). It now collapses ASCII whitespace only; all JSON re-extracted. Book-form placeholders now come from the
    page's custom code that swaps them on load (`you@example.com`, `(555) 555-5555`).
7. **Ship Studio preview** (localhost:3435) — restarted by the user; now serves the content collections (23 article cards).
8. **Requested change (2026-11-19):** every article/resource card is fully clickable — the title `<a>` has a `::before`
   stretched over the card (`relative` card root). Applies to `ArticleCard` (homepage, Research & Insights, Related Articles)
   and the `/articles` index cards. The live site only links the title text.
9. **Hub hero overlays** were the cause of the "/men hero lighter" issue (item 2): page custom code adds `.hero-img-wrap::after`
   (34% ink tint, or a gradient on /why-us). Now extracted per page — /men, /women, /why-us, /telehealth, /patient-information
   all 99.7%+ at 1440. Item 2 is resolved.


11. **Fixes from the 2026-11-19 evening pass** (each measured against live):
    - Saved source HTML refreshed (`scratchpad/html-new`); text unchanged, all JSON re-extracted.
    - Women's treatment heroes: card label restored (the extractor dropped it when its text matched the breadcrumb).
    - Header variant now read per page from the source (`white-text` only on /men, /women, /telehealth); /why-us was wrongly light.
    - White hero button variant (`button-white`) on /why-us and /telehealth.
    - Webflow `.w-form` 15px bottom margin on the book and contact forms; empty PageHero button row removed (/how-it-works);
      Access image keeps its 662px cap at ≤767; legal pages: CTA "top-padding" variant + last `li` margin 0;
      location addresses keep their `<br>`; signs cards have no gap between title and body (as source);
      Voices heading keeps its max width beside the intro (no width:100%, as source) — fixed /women/pcos, /women/peptide-therapy at 991;
      empty "told" label not rendered (/advance-home-testing); article body container no longer sets 20px (quiz inherits 16/24),
      source `label` rule (margin .25rem, weight 500) applied inside articles.
    - Autoplaying carousels: `compare.mjs --freeze` puts every Swiper back on slide 1 on both sides so scores are
      deterministic (`FLAGS=--freeze scripts/batch-compare.sh ...`). Confirmed the earlier sub-97 carousel pages were timing only.
    - Missions block, compact ("smaller") variant: photos stay 80%/90% of the row at ≤767 and fill only at ≤479
      (was wrongly full at ≤767) — /why-us 767 95.7 → 99.3.
    - Voices heading: only `mw-120/200/504` set `width:100%` in the source, so `mw-504` headings share the row equally and
      `mw-562` ones keep their max width (extracted as `headingFull`).
12. **Interaction & structure checks (2026-11-19)** — `node scripts/interactions.mjs` (17 checks, all pass) and
    `node scripts/audit.mjs` (both sides, all 56 routes):
    - Desktop dropdowns were mouse-only (text triggers, hidden panel). Triggers are now focusable (button, or the existing
      link), the panel opens on keyboard focus, `aria-expanded` stays in sync, Escape closes and returns focus. Visuals unchanged.
    - Mobile menu, FAQ accordion (Enter), article filter (keyboard), contact + book forms (empty submit blocked; valid submit posts
      the expected payload and shows the success state — Formspark intercepted, nothing sent) all pass, no JS errors.
    - Audit: one `h1` per page, heading order and alt coverage same as live, no unnamed links. `/articles` and `/scheduling`
      have no `h1` — same as live, kept (say if you want one added).

## Scores (all 56 routes, 2026-11-19 evening)

**Superseded:** the 2026-11-20 `--freeze` pass in `migration.json` has all 56/56 routes at ≥97% worst width (lowest:
`/advance-home-testing` 97.46, `/` 97.47). The table below is the older evening run, kept for history. Lowest first:

| Route | 1440 | 991 | 767 | 390 | Worst |
|---|---|---|---|---|---|
| `/cheating-death` | 94.32 | 93.34 | 93.12 | 90.83 | **90.83** |
| `/how-it-works` | 99.65 | 98.25 | 93.16 | 91.53 | **91.53** |
| `/telehealth` | 99.69 | 99.61 | 92.8 | 97.59 | **92.8** |
| `/location` | 95.98 | 96.2 | 94.45 | 93.35 | **93.35** |
| `/women/pcos` | 99.79 | 93.66 | 97.86 | 99.06 | **93.66** |
| `/advance-home-testing` | 97.63 | 95.14 | 94.6 | 94.23 | **94.23** |
| `/men/hormone-therapy` | 99.8 | 99.66 | 97.34 | 94.27 | **94.27** |
| `/privacy-policy` | 96.22 | 95.41 | 94.47 | 98.06 | **94.47** |
| `/articles/signs-you-need-hrt` | 97.03 | 96.25 | 95.57 | 94.59 | **94.59** |
| `/women/peptide-therapy` | 99.86 | 95.11 | 98.35 | 99.08 | **95.11** |
| `/why-us` | 99.82 | 99.26 | 95.61 | 98.41 | **95.61** |
| `/men/erectile-dysfunction-clinic` | 99.86 | 99.66 | 99.2 | 95.91 | **95.91** |
| `/contact` | 97.83 | 97.22 | 97.02 | 96.45 | **96.45** |
| `/women/weight-loss-resistance` | 98.74 | 97.91 | 96.93 | 99.02 | **96.93** |
| `/women/postmenopause` | 99.8 | 97.53 | 97.79 | 97.43 | **97.43** |
| `/men/metabolic-health` | 99.85 | 99.79 | 99.38 | 97.46 | **97.46** |
| `/men/longevity-clinic` | 99.74 | 99.67 | 99.22 | 97.54 | **97.54** |
| `/women/hormone-replacement-therapy` | 99.75 | 97.55 | 97.81 | 98.66 | **97.55** |
| `/women/sexual-health` | 99.8 | 99.75 | 97.57 | 97.69 | **97.57** |
| `/women` | 99.77 | 99.3 | 98.29 | 97.63 | **97.63** |
| `/men/peptide-therapy` | 99.63 | 98.1 | 99.26 | 97.66 | **97.66** |
| `/women/endometriosis` | 99.87 | 99.75 | 97.68 | 99.58 | **97.68** |
| `/terms-of-use` | 98.03 | 97.94 | 98.55 | 99.17 | **97.94** |
| `/articles/not-losing-weight-on-ozempic` | 99.63 | 99.83 | 99.13 | 98.02 | **98.02** |
| `/articles/estrogen-dominance` | 99.59 | 99.51 | 99.43 | 98.09 | **98.09** |
| `/women/menopause` | 98.57 | 99.71 | 98.1 | 98.88 | **98.1** |
| `/women/perimenopause` | 99.72 | 99.54 | 98.1 | 98.1 | **98.1** |
| `/women/inflammation` | 99.9 | 99.8 | 98.12 | 99.1 | **98.12** |
| `/articles/semaglutide-peptide` | 99.52 | 99.25 | 99.71 | 98.16 | **98.16** |
| `/women/thyroid` | 99.66 | 99.61 | 98.19 | 98.52 | **98.19** |
| `/men/performance-recovery` | 99.83 | 99.8 | 99.54 | 98.22 | **98.22** |
| `/` | 98.28 | 98.49 | 99.13 | 99.0 | **98.28** |
| `/articles/peptide-therapy-for-weight-loss` | 99.53 | 99.21 | 99.74 | 98.46 | **98.46** |
| `/articles/trt-side-effects` | 99.31 | 99.24 | 99.64 | 98.56 | **98.56** |
| `/articles/tirzepatide-peptide` | 99.52 | 99.37 | 99.39 | 98.58 | **98.58** |
| `/articles/pcos-weight-loss` | 99.67 | 99.35 | 99.21 | 98.64 | **98.64** |
| `/articles/pt-141` | 99.43 | 99.47 | 99.56 | 98.66 | **98.66** |
| `/articles/best-birth-control-for-pcos` | 99.55 | 99.9 | 99.94 | 98.67 | **98.67** |
| `/articles/peptide-therapy` | 99.4 | 99.33 | 99.3 | 98.75 | **98.75** |
| `/men` | 99.74 | 99.79 | 98.89 | 98.76 | **98.76** |
| `/articles/thyroid-supplements` | 99.73 | 99.44 | 99.67 | 98.79 | **98.79** |
| `/articles/insulin-resistance-test` | 99.65 | 99.55 | 99.53 | 98.81 | **98.81** |
| `/articles` | 99.46 | 99.77 | 99.29 | 98.9 | **98.9** |
| `/articles/trt-cost` | 99.74 | 99.29 | 99.5 | 99.05 | **99.05** |
| `/articles/peptide-therapy-vs-trt` | 99.75 | 99.59 | 99.59 | 99.22 | **99.22** |
| `/articles/perimenopause-weight-gain` | 99.67 | 99.51 | 99.28 | 99.23 | **99.23** |
| `/articles/peptides-vs-glp-1` | 99.64 | 99.3 | 99.63 | 99.27 | **99.27** |
| `/patient-information` | 99.76 | 99.76 | 99.83 | 99.35 | **99.35** |
| `/articles/pcos-belly-fat` | 99.62 | 99.46 | 99.73 | 99.36 | **99.36** |
| `/articles/thyroid-specialist-near-me` | 99.69 | 99.36 | 99.59 | 99.84 | **99.36** |
| `/articles/perimenopause-brain-fog` | 99.77 | 99.4 | 99.62 | 99.54 | **99.4** |
| `/articles/insulin-resistance-and-weight-loss` | 99.6 | 99.47 | 99.75 | 99.44 | **99.44** |
| `/articles/metabolic-testing` | 99.69 | 99.57 | 99.9 | 99.67 | **99.57** |
| `/articles/lupus-rash-vs-rosacea` | 99.9 | 99.84 | 99.88 | 99.68 | **99.68** |
| `/faq` | 99.95 | 99.92 | 99.95 | 99.91 | **99.91** |
| `/scheduling` | 99.92 | 99.94 | 99.92 | 99.99 | **99.92** |


## Scores (all 56 routes, 2026-11-19 late) — 52/56 at ≥97%

The 4 below are capture-timing artefacts (autoplaying carousel / scroll-driven image heights), not layout faults: section heights match live.

| Route | 1440 | 991 | 767 | 390 | Worst |
|---|---|---|---|---|---|
| `/` | 98.26 | 98.5 | 99.03 | 99.06 | **98.26** |
| `/advance-home-testing` | 97.78 | 98.06 | 97.46 | 98.01 | **97.46** |
| `/articles` | 99.46 | 99.77 | 99.29 | 98.9 | **98.9** |
| `/articles/best-birth-control-for-pcos` | 99.55 | 99.9 | 99.94 | 98.67 | **98.67** |
| `/articles/estrogen-dominance` | 99.59 | 99.51 | 99.43 | 98.09 | **98.09** |
| `/articles/insulin-resistance-and-weight-loss` | 99.6 | 99.47 | 99.75 | 99.44 | **99.44** |
| `/articles/insulin-resistance-test` | 99.65 | 99.55 | 99.53 | 98.81 | **98.81** |
| `/articles/lupus-rash-vs-rosacea` | 99.9 | 99.84 | 99.88 | 99.68 | **99.68** |
| `/articles/metabolic-testing` | 99.69 | 99.57 | 99.9 | 99.67 | **99.57** |
| `/articles/not-losing-weight-on-ozempic` | 99.63 | 99.83 | 99.13 | 98.02 | **98.02** |
| `/articles/pcos-belly-fat` | 99.62 | 99.46 | 99.73 | 99.36 | **99.36** |
| `/articles/pcos-weight-loss` | 99.67 | 99.35 | 99.21 | 98.64 | **98.64** |
| `/articles/peptide-therapy` | 99.4 | 99.33 | 99.3 | 98.75 | **98.75** |
| `/articles/peptide-therapy-for-weight-loss` | 99.53 | 99.21 | 99.74 | 98.46 | **98.46** |
| `/articles/peptide-therapy-vs-trt` | 99.75 | 99.59 | 99.59 | 99.22 | **99.22** |
| `/articles/peptides-vs-glp-1` | 99.64 | 99.3 | 99.63 | 99.27 | **99.27** |
| `/articles/perimenopause-brain-fog` | 99.77 | 99.4 | 99.62 | 99.54 | **99.4** |
| `/articles/perimenopause-weight-gain` | 99.67 | 99.51 | 99.28 | 99.23 | **99.23** |
| `/articles/pt-141` | 99.43 | 99.47 | 99.56 | 98.66 | **98.66** |
| `/articles/semaglutide-peptide` | 99.52 | 99.25 | 99.71 | 98.16 | **98.16** |
| `/articles/signs-you-need-hrt` | 99.42 | 99.23 | 99.28 | 98.54 | **98.54** |
| `/articles/thyroid-specialist-near-me` | 99.69 | 99.36 | 99.59 | 99.84 | **99.36** |
| `/articles/thyroid-supplements` | 99.73 | 99.44 | 99.67 | 98.79 | **98.79** |
| `/articles/tirzepatide-peptide` | 99.52 | 99.37 | 99.39 | 98.58 | **98.58** |
| `/articles/trt-cost` | 99.74 | 99.29 | 99.5 | 99.05 | **99.05** |
| `/articles/trt-side-effects` | 99.31 | 99.24 | 99.64 | 98.56 | **98.56** |
| `/cheating-death` | 99.56 | 99.29 | 99.32 | 99.32 | **99.29** |
| `/contact` | 99.33 | 98.72 | 98.82 | 99.2 | **98.72** |
| `/faq` | 99.95 | 99.92 | 99.95 | 99.91 | **99.91** |
| `/how-it-works` | 96.23 | 94.2 | 94.81 | 94.48 | **94.2** |
| `/location` | 99.93 | 99.94 | 99.98 | 98.6 | **98.6** |
| `/men` | 99.74 | 99.79 | 98.89 | 98.76 | **98.76** |
| `/men/erectile-dysfunction-clinic` | 99.88 | 99.69 | 99.76 | 99.27 | **99.27** |
| `/men/hormone-therapy` | 99.81 | 99.68 | 99.78 | 96.97 | **96.97** |
| `/men/longevity-clinic` | 99.76 | 99.67 | 99.74 | 98.5 | **98.5** |
| `/men/metabolic-health` | 99.85 | 99.79 | 99.72 | 97.87 | **97.87** |
| `/men/peptide-therapy` | 99.63 | 98.1 | 99.68 | 98.45 | **98.1** |
| `/men/performance-recovery` | 99.88 | 99.88 | 99.79 | 98.56 | **98.56** |
| `/patient-information` | 99.8 | 99.83 | 99.93 | 99.53 | **99.53** |
| `/privacy-policy` | 99.88 | 99.88 | 98.71 | 99.22 | **98.71** |
| `/scheduling` | 99.92 | 99.94 | 99.92 | 99.99 | **99.92** |
| `/telehealth` | 99.73 | 99.64 | 99.42 | 97.72 | **97.72** |
| `/terms-of-use` | 99.52 | 99.38 | 98.98 | 99.4 | **98.98** |
| `/why-us` | 99.88 | 99.37 | 95.73 | 98.69 | **95.73** |
| `/women` | 99.88 | 99.46 | 98.29 | 97.67 | **97.67** |
| `/women/endometriosis` | 99.87 | 99.75 | 97.68 | 97.11 | **97.11** |
| `/women/hormone-replacement-therapy` | 99.76 | 97.57 | 97.81 | 97.75 | **97.57** |
| `/women/inflammation` | 98.67 | 99.8 | 98.12 | 99.1 | **98.12** |
| `/women/menopause` | 98.57 | 98.17 | 98.1 | 98.88 | **98.1** |
| `/women/pcos` | 98.57 | 99.85 | 97.86 | 99.06 | **97.86** |
| `/women/peptide-therapy` | 99.86 | 99.77 | 98.35 | 98.22 | **98.22** |
| `/women/perimenopause` | 98.6 | 98.03 | 98.1 | 99.0 | **98.03** |
| `/women/postmenopause` | 99.8 | 98.03 | 97.79 | 97.43 | **97.43** |
| `/women/sexual-health` | 98.52 | 99.77 | 97.58 | 97.71 | **97.58** |
| `/women/thyroid` | 98.61 | 98.2 | 98.19 | 98.52 | **98.19** |
| `/women/weight-loss-resistance` | 99.74 | 98.31 | 96.93 | 99.02 | **96.93** |


## Scores (all 56 routes, 2026-11-20, `--freeze`) — 56/56 at ≥97%

| Route | 1440 | 991 | 767 | 390 | Worst |
|---|---|---|---|---|---|
| `/` | 98.69 | 98.65 | 99.55 | 97.47 | **97.47** |
| `/advance-home-testing` | 97.78 | 98.06 | 97.46 | 98.01 | **97.46** |
| `/articles` | 99.46 | 99.77 | 99.29 | 98.9 | **98.9** |
| `/articles/best-birth-control-for-pcos` | 99.55 | 99.9 | 99.94 | 98.67 | **98.67** |
| `/articles/estrogen-dominance` | 99.59 | 99.51 | 99.43 | 98.09 | **98.09** |
| `/articles/insulin-resistance-and-weight-loss` | 99.6 | 99.47 | 99.75 | 99.44 | **99.44** |
| `/articles/insulin-resistance-test` | 99.65 | 99.55 | 99.53 | 98.81 | **98.81** |
| `/articles/lupus-rash-vs-rosacea` | 99.9 | 99.84 | 99.88 | 99.68 | **99.68** |
| `/articles/metabolic-testing` | 99.69 | 99.57 | 99.9 | 99.67 | **99.57** |
| `/articles/not-losing-weight-on-ozempic` | 99.63 | 99.83 | 99.13 | 98.02 | **98.02** |
| `/articles/pcos-belly-fat` | 99.62 | 99.46 | 99.73 | 99.36 | **99.36** |
| `/articles/pcos-weight-loss` | 99.67 | 99.35 | 99.21 | 98.64 | **98.64** |
| `/articles/peptide-therapy` | 99.4 | 99.33 | 99.3 | 98.75 | **98.75** |
| `/articles/peptide-therapy-for-weight-loss` | 99.53 | 99.21 | 99.74 | 98.46 | **98.46** |
| `/articles/peptide-therapy-vs-trt` | 99.75 | 99.59 | 99.59 | 99.22 | **99.22** |
| `/articles/peptides-vs-glp-1` | 99.64 | 99.3 | 99.63 | 99.27 | **99.27** |
| `/articles/perimenopause-brain-fog` | 99.77 | 99.4 | 99.62 | 99.54 | **99.4** |
| `/articles/perimenopause-weight-gain` | 99.67 | 99.51 | 99.28 | 99.23 | **99.23** |
| `/articles/pt-141` | 99.43 | 99.47 | 99.56 | 98.66 | **98.66** |
| `/articles/semaglutide-peptide` | 99.52 | 99.25 | 99.71 | 98.16 | **98.16** |
| `/articles/signs-you-need-hrt` | 99.42 | 99.23 | 99.28 | 98.54 | **98.54** |
| `/articles/thyroid-specialist-near-me` | 99.69 | 99.36 | 99.59 | 99.84 | **99.36** |
| `/articles/thyroid-supplements` | 99.73 | 99.44 | 99.67 | 98.79 | **98.79** |
| `/articles/tirzepatide-peptide` | 99.52 | 99.37 | 99.39 | 98.58 | **98.58** |
| `/articles/trt-cost` | 99.74 | 99.29 | 99.5 | 99.05 | **99.05** |
| `/articles/trt-side-effects` | 99.31 | 99.24 | 99.64 | 98.56 | **98.56** |
| `/cheating-death` | 99.46 | 99.2 | 99.31 | 99.24 | **99.2** |
| `/contact` | 99.33 | 98.72 | 98.82 | 99.2 | **98.72** |
| `/faq` | 99.95 | 99.92 | 99.94 | 99.91 | **99.91** |
| `/how-it-works` | 99.77 | 98.26 | 99.85 | 99.23 | **98.26** |
| `/location` | 99.93 | 99.94 | 99.98 | 98.6 | **98.6** |
| `/men` | 99.74 | 99.79 | 98.89 | 98.76 | **98.76** |
| `/men/erectile-dysfunction-clinic` | 99.88 | 99.66 | 97.62 | 99.27 | **97.62** |
| `/men/hormone-therapy` | 99.81 | 98.93 | 99.78 | 98.54 | **98.54** |
| `/men/longevity-clinic` | 99.76 | 98.89 | 99.71 | 98.5 | **98.5** |
| `/men/metabolic-health` | 99.85 | 99.77 | 97.9 | 98.39 | **97.9** |
| `/men/peptide-therapy` | 99.63 | 99.64 | 99.68 | 98.45 | **98.45** |
| `/men/performance-recovery` | 99.88 | 99.86 | 99.79 | 98.56 | **98.56** |
| `/patient-information` | 99.8 | 99.83 | 99.93 | 99.53 | **99.53** |
| `/privacy-policy` | 99.88 | 99.88 | 98.71 | 99.22 | **98.71** |
| `/scheduling` | 99.92 | 99.94 | 99.92 | 99.99 | **99.92** |
| `/telehealth` | 99.73 | 99.64 | 99.42 | 97.72 | **97.72** |
| `/terms-of-use` | 99.52 | 99.38 | 98.98 | 99.4 | **98.98** |
| `/why-us` | 99.88 | 99.37 | 99.3 | 98.69 | **98.69** |
| `/women` | 99.88 | 99.46 | 98.29 | 97.67 | **97.67** |
| `/women/endometriosis` | 99.87 | 99.78 | 99.79 | 97.64 | **97.64** |
| `/women/hormone-replacement-therapy` | 99.76 | 99.65 | 99.88 | 98.66 | **98.66** |
| `/women/inflammation` | 99.9 | 99.82 | 99.8 | 99.1 | **99.1** |
| `/women/menopause` | 99.7 | 98.17 | 99.79 | 98.88 | **98.17** |
| `/women/pcos` | 99.79 | 98.23 | 99.79 | 99.06 | **98.23** |
| `/women/peptide-therapy` | 99.86 | 99.77 | 99.79 | 99.08 | **99.08** |
| `/women/perimenopause` | 99.76 | 99.5 | 99.74 | 99.0 | **99.0** |
| `/women/postmenopause` | 99.8 | 98.0 | 97.79 | 97.59 | **97.59** |
| `/women/sexual-health` | 99.82 | 99.81 | 98.1 | 97.71 | **97.71** |
| `/women/thyroid` | 98.61 | 98.2 | 99.75 | 98.52 | **98.2** |
| `/women/weight-loss-resistance` | 98.74 | 99.66 | 98.49 | 98.48 | **98.48** |

## Launch prep (2026-11-23)

Full status: `docs/launch-checklist.md`. What changed in the code:
- URL format: `trailingSlash: 'never'` + `build.format: 'file'`. `/men` serves directly (tested on a Cloudflare Pages emulator; Vercel `cleanUrls` behaves the same); `/men/` and
  `/men.html` 308 to `/men`. 11 routes re-scored identical afterwards.
- SEO: homepage canonical fixed (file output); 404 page (live copy). **Reverted the same day** (Evgenii never asked for them):
  Organization JSON-LD, copied head schema (19 pages), generated BlogPosting and FAQPage, `noindex` on the legal pages,
  `sitemap.xml`, `robots.txt`, `llms.txt`, and the AEO copy proposals doc. The head is back to 553dae7. Note for Evgenii: live
  itself has FAQPage/BlogPosting head schema and `noindex` on /privacy-policy and /terms-of-use, so the rebuild lacks those
  (as it did at 553dae7) until he asks for them.
- Redirects: `docs/redirects.csv` → `vercel.json` (live `/blog` rule, `/blog/:slug`, 20 pre-Webflow URLs).
- Bug fixed: FAQ accordions on /men, /women, /telehealth didn't open on click (two scripts on one page). Now one shared module.
- Accessibility, no visual change: inert closed panels, skip link, scroll padding, form autocomplete, alert role on form
  errors, reduced-motion handling, compare-table label.
- /articles mobile CLS 0.885 → 0 (intrinsic sizes on card images; live is 0.918).

**Known gap (pre-existing):** /articles/lupus-rash-vs-rosacea has no "Related Articles" block; live has one.

**Source quirks found and kept:** `/men/hormone-therapy` has an H2 "Our Approach to Metabolic Health"; `/men` FAQ schema lists 5
questions but the page shows 6; 10 pages have no meta description; 3 titles over 60 chars, 5 descriptions over 155.
