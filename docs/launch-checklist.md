# rhmmed.com launch checklist — Webflow → Astro

Follows the `site-launch` skill. `[x]` done and checked · `[ ]` open · `[~]` partly done / see note · `[-]` skipped, reason given.
Staging = `npx astro build` served by `npx wrangler pages dev dist` (a Cloudflare Pages emulator, used before the move to Vercel was
decided; re-run the redirect/404/URL tests on a Vercel preview). Last updated 2026-11-23.

**2026-11-23 revert:** Evgenii never asked for SEO/AEO content changes. Everything this checklist added to page content or
the head (schema, noindex, sitemap.xml, robots.txt, llms.txt, AEO proposals) was reverted; the site content is back to the
553dae7 rebuild (Webflow parity). Items below marked *(reverted)* are not in the build. No content changes unless Evgenii asks.

**Going live, DNS changes, pushing and anything on the live Webflow site need Evgenii's OK, asked once with this status.**

## 1. Before the migration

- [x] **URL inventory**: `docs/url-inventory.csv`. All 56 live sitemap URLs with status, title, meta description, H1,
      canonical, robots and schema, plus the new URL/status/schema. All 56 are 200 on live and on staging. (`scripts/seo-crawl.mjs`)
- [-] **GSC clicks/impressions**: no Search Console access found from here. Columns are in the CSV as `n/a`. Needed to rank
      the top 50 URLs for post-live testing; ask Evgenii/Steve for access (the property is verified with the
      `google-site-verification` tag already carried over).
- [x] **URL map + 301 plan**: `docs/redirects.csv` → `vercel.json`. Every live URL keeps its path (no redirect needed).
      Added: the live `/blog → /articles`; `/blog/:slug → /articles/:slug` (the live share button copies `/blog/<slug>`
      links, which 404 today); 20 pre-Webflow URLs found in the Wayback Machine that 404 on live now (/about, /meet-the-team/*,
      /testosterone-therapy, /telemedicine, /santa-monica-office, /rsm-at-the-fix…) each sent to the closest page, never all
      to the homepage. 5 with no relevant page (/orthovisc, /sports-injury, /hiv-muscle-wasting, /Accessibility, /article66) stay 404.
      All one hop, tested on staging.
- [x] **Definition of done**: all 56 URLs at the same paths, ≥97% visual match at 1440/991/767/390 (`migration.json`), same
      copy and CMS content, both forms posting to the same Formspark endpoints with Botpoison, the same tracking (GTM, GA4,
      PostHog, Meta pixel, GHL), the booking and reviews embeds working, SEO parity or better (below), no 4xx in the crawl.

## 2. Technical SEO

- [x] One H1 per page. Same as live; `/articles` and `/scheduling` have none on live either (kept, see MIGRATION.md).
- [~] Titles/descriptions are on every indexable page and identical to live. **Copied as-is: 3 titles over 60 chars**
      (`/men/longevity-clinic` 61, `/cheating-death` 64, `/articles/trt-side-effects` 68) **and 5 descriptions over 155**
      (`/men/metabolic-health`, `/men/hormone-therapy`, `/articles/insulin-resistance-and-weight-loss`,
      `/articles/semaglutide-peptide`, `/articles/tirzepatide-peptide`). **10 pages have no meta description on live**
      (/why-us, /location, /how-it-works, /faq, /telehealth, /patient-information, /contact, /privacy-policy, /terms-of-use,
      /scheduling). Client copy; writing them is a content change that needs approval.
- [x] Self-referencing canonicals on every page (`https://www.rhmmed.com/<path>`, no trailing slash, as live). Fixed: the
      homepage canonical was `/index` with the new file output.
- [x] Robots meta copied from live per page (2026-11-24, Evgenii): `noindex, follow` on /privacy-policy and /terms-of-use.
- [x] `sitemap.xml` and `robots.txt`: live's files, byte-identical (2026-11-24, Evgenii).
- [x] Structured data: live's head JSON-LD copied verbatim per page (42 pages; 2026-11-24, Evgenii). Article FAQ embeds come
      with the CMS bodies. Diff vs live: 0 JSON-LD differences on 56 URLs.
- [~] OG/Twitter: title and description on every page; og:image on 47 pages (live has 24). Several hero images are **AVIF**,
      which LinkedIn/Facebook/Slack don't render. Convert the og:image to JPG at cutover (post-live check in section 6).
      Favicon and apple-touch icon are in place.
- [~] Images: alt coverage same as live. 85 `<img>` have no alt attribute at all and 554 of 612 have no width/height
      (`docs/ui-audit.md`). Article cards now carry intrinsic sizes.
- [x] Performance (mobile, 4× CPU throttle, local server): CLS 0.000 on /, /men, /women/menopause, /articles/pt-141, /contact.
      **/articles: 0.885 → 0.000** (live: 0.918) after adding image sizes to the cards. Local LCP 0.5–0.6s is only indicative;
      re-measure on the real host (PageSpeed Insights) on staging/after go-live.
- [x] Internal links: every internal link points at a live sitemap URL (0 links to non-sitemap paths, 0 relying on redirects).
- [x] Content parity: titles, descriptions, canonicals and H1s are identical to live on all 56 URLs (crawl diff). No FAQ
      entries or schema lost (schema diff: nothing missing vs live). Copy parity was checked during the build (extractor misses: 0).

## 3. AEO pass

- [-] *(reverted)* Not requested by Evgenii. No AEO copy, heading, FAQ, schema, robots or llms.txt changes. The baseline
      notes (Google names RHM first; its text still says "Regenerative / Sports Medicine" and "Houston") stand as information only.

## 4. Before going live

- [x] Clean-up: no lorem/TODO/placeholder text in `src/`. `/style-guide` kept as the design-token reference (not linked). Stray build folders (`dist-wip*`) exist only in the original folder, not in git.
- [x] Real 404 page (`src/pages/404.astro`, same copy as live's). Tested: unknown URLs return 404.
- [~] Internal audit: `docs/ui-audit.md` (19 fix-before-launch, 31 later). **Fixed and verified today:** FAQ accordions on
      /men, /women, /telehealth didn't open on click (two scripts toggling each click) — one shared script now; collapsed
      answers are `inert` with `aria-controls`; skip link; `scroll-padding-top` under the fixed header; form `autocomplete`
      and `role="alert"` on errors; RHM column label in the compare table; reduced-motion CSS and paused background videos for
      reduced-motion users. **Fixed 2026-11-25** (no visual change, pixel-diff 0 vs the previous build on 7 routes at 1440/390):
      mobile menu closes on Escape (focus to toggle) and releases the scroll lock when the viewport crosses 992px; team bios
      open by keyboard on desktop (button named "Show bio" + provider, `aria-expanded`/`aria-controls`); copy link is a real
      `<button>` (clipboard fallback), X/Facebook are real share links; filter chips are an ARIA radio group with roving
      tabindex and arrow/Home/End keys; carousel has Swiper A11y, stops on hover/focus and doesn't autoplay under reduced
      motion; 3D book canvas is `role="img"` with the fallback alt; /cheating-death header/copy/form are `inert` during the
      intro. Behaviour deviations: MIGRATION.md "QA pass". Proposal (copy, needs Evgenii): an sr-only "Link copied" message.
- [x] Interaction checks: `node scripts/interactions.mjs`, 17/17 pass on the fixed build (dropdowns, keyboard, mobile menu,
      accordion, filter, both forms; Formspark intercepted, nothing sent). Accordions click-tested on /men, /women,
      /telehealth, /why-us, /faq, /women/menopause, /.
- [~] Visual regression after today's changes: 11 routes re-scored identical to the previous run; pages touched by the fixes
      re-checked (see MIGRATION.md). Homepage 1440 varies with the hero video frame (known residual).
- [~] Forms (2026-11-26): payload, endpoint, Botpoison and success state identical to live on /contact and /cheating-death
      (intercepted, nothing sent). Real delivery not tested. A real submit emails the client's inbox. Do one test submission per form
      on the production URL on launch day, with the client warned, or route a test through Steve.
- [x] Analytics fixed 2026-11-26: the inline tags (GTM, GA config, Meta pixel, PostHog) were printed as text and never ran on the
      Vercel build; now real scripts. GA4: 1 page_view per load on live and new (no double counting). Previously: the same tags as live (GTM-MNGP32KD, GA4 G-D9VW2K0DPP, PostHog, Meta pixel 928258004184901, GHL),
      production builds only. Note: GA4 loads directly *and* GTM is present, the same as live; check GTM doesn't also fire GA4
      (double counting). No consent banner on live; none added. Search Console verification tag carried over.
- [~] Platform: **Vercel** (Hobby, RHM's team `rhm16`): projects `rhmmed` (https://rhmmed.vercel.app; redirects and 404 checked)
      and `rhmmed-preview` exist and build from GitHub main (2026-11-24). `vercel.json` has the redirects, `cleanUrls` and
      `trailingSlash: false`. Page builder + a11y work pushed to main 2026-11-25 (255cd29); tracking fix + home/contact/scheduling blocks pushed 2026-11-26 (7da3c14); `SANITY_VIEWER_TOKEN` set on
      rhmmed-preview and the Studio Preview tab loads it. Domains added to `rhmmed` 2026-11-26: `www.rhmmed.com` (Production) and `rhmmed.com` (308 → www); both "Invalid
      Configuration" until DNS moves. **Launch-day change at GoDaddy** (DNS is GoDaddy; today it points at Webflow, TTL 3600):
      `A @` 198.202.211.1 → **216.198.79.1**; `CNAME www` cdn.webflow.com → **ed818380e631dd17.vercel-dns-017.com**. Touch nothing
      else: MX/autodiscover/SPF/MS verify/DMARC are Outlook email; `_webflow` TXT is harmless. SSL issues itself once DNS resolves.
      Rollback = put the two old values back. Keep Webflow hosting a week after, then cancel.
- [~] **Sanity**: phase 2 page builder done 2026-11-25: the 29 treatment/hub/info pages are `page` documents built from 31 section
      blocks (one per component); the build reads them from Sanity, byte-identical. Homepage, /contact, /scheduling imported
      2026-11-26 (32 page documents, 36 block types, thumbnails for all; Studio redeployed). Phase 1 done 2026-11-24: the 7 Webflow CMS collections (77 documents) are in project `9qg5x7wu`. Studio hosted
      at https://rhmmed.sanity.studio. Publish webhook → Vercel deploy hook live 2026-11-25 (tested: a
      save triggered a `rhmmed` build). Project transferred to RHM's org (ogokh587b) 2026-11-26; webhook still enabled, 32 pages read fine.
      Open: Portable Text/images (after go-live).
- [x] QA re-run 2026-11-25 on the page-builder build (57 routes × 5 widths + clip check at 320/360/375): no sideways scroll, no
      broken links, no failed requests; known results listed in MIGRATION.md "QA pass".
- [x] 301s tested on staging: all 29 rules in `docs/redirects.csv` (24 redirects land on a 200 in one hop, 5 stay 404) + all 56 live URLs return 200 (no trailing-slash or `.html` hops
      except the intended 308 from `/men/` → `/men`).
- [ ] Client review and sign-off (through Evgenii).
- [ ] **Ask Evgenii once to go live**, with this checklist.

## 5–7. Go live, post-live, after launch

- [x] **Live on Vercel 2026-11-26.** Evgenii changed the two GoDaddy records (A @ 216.198.79.1, CNAME www → Vercel). Vercel shows
      "Valid Configuration" for both domains; Let's Encrypt certs issued (www.rhmmed.com and rhmmed.com, valid to 2027-02-24).
- [x] Post-live check 2026-11-26 (against Vercel's IPs, before every resolver had the new records): `server: Vercel`; all 56
      sitemap URLs 200; `https://rhmmed.com/*` 308 → www; 24 redirects 301 in one hop, the 4 planned 404s stay 404 (same as Webflow);
      real 404 page; robots.txt = live's; GTM-MNGP32KD, G-D9VW2K0DPP, Meta pixel and PostHog in the HTML. MX/SPF/MS verify unchanged.
- [ ] Real form submission test (emails the client: only with Evgenii's OK).
- [x] Search Console: sitemap.xml resubmitted 2026-11-26 (read the same day, Success, 56 pages).
- [ ] Search Console: watch Coverage and 404s for 2 weeks. GA4 realtime shows traffic.
- [ ] Cancel Webflow hosting about a week after launch (rollback until then = put the two old DNS values back).
- [ ] 30-day review.
