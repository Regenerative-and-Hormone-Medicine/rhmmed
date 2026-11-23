# UI audit: Web Interface Guidelines (2026-11-23)

Scope: `src/layouts/*.astro`, `src/components/**/*.astro`, `src/pages/**/*.astro` (except `style-guide.astro`), `src/scripts/*`, `src/styles/global.css`.
Rules: Vercel Web Interface Guidelines (`~/.claude/skills/web-design-guidelines/references/command.md`).
No source code was changed. Each finding ends with `[visual: yes/no]`, meaning whether the fix would change how the page looks to a default (mouse, no reduced-motion) visitor.

Already checked and not repeated here: desktop dropdown keyboard support (aria-expanded and Escape), FAQ opens with Enter on pages that have only one accordion type, forms block empty submit, h1 count (/articles and /scheduling match live), image alt coverage.

Counts: **Fix before launch: 19** · **Later: 31**

---

## Fix before launch

### Functional bugs

- `src/components/Accordion.astro:33` + `src/components/treatment/Faq.astro:38`: **accordions don't open on /men, /women and /telehealth.** These pages render both WhyWork (Accordion.astro) and Faq. Accordion.astro's script binds every `[data-accordion]` on the page without setting `data-bound`, then Faq's script binds them all again. Every item ends up with two click handlers: the first opens it, the second sees `data-open` and closes it, so nothing happens. You can see the bundle order in `dist/men.html`. Fix: one shared accordion script with the `data-bound` guard. FaqPage.astro:46 is a third copy of the same script. [visual: no]
- `src/components/Header.astro:121-127`: if the mobile menu is open at <992px and the viewport then crosses to ≥992 (an iPad rotating to landscape), the menu hides via `lg:!hidden` but `body.style.overflow='hidden'` stays, so the page can't scroll. The menu also doesn't close on Escape, and focus isn't returned to the toggle. [visual: no]
- `src/components/sections/Team.astro:22,40-47,53`: the provider bio can't be reached by keyboard at ≥992px. The click handler returns early, and the reveal is CSS `:hover` only, with no `:focus-within`. The button has no `aria-expanded`, and every card has the same `aria-label="Show bio"`, so it needs the provider's name. [visual: no]
- `src/pages/articles/[slug].astro:88-90,148-157`: the share controls are `<a href="#">` used as buttons. "Copy link" gives no feedback and fails silently when `navigator.clipboard` is missing. Use `<button>` for copy (or real share URLs for X/Facebook) and add an sr-only `aria-live` "Link copied" message. [visual: no]

### Accessibility

- `src/components/Accordion.astro:17`, `src/components/treatment/Faq.astro:20`, `src/components/sections/FaqPage.astro:21`: collapsed answers are only clipped (`grid-rows-[0fr]` + `overflow-hidden`), so they stay in the tab order and the accessibility tree. 29 FAQ answers contain links, so Tab lands on invisible links. Toggle `inert` (or `hidden` after the transition) on closed panels, and add `aria-controls` with matching ids. [visual: no]
- `src/layouts/Layout.astro:71`: there is no skip link to `<main>`. Add an sr-only link that becomes visible on focus. [visual: no]
- `src/styles/global.css:138`: the header is fixed at 70px but there is no `scroll-padding-top`, so focused elements (when tabbing backwards) and anchor targets end up under the header. Add `html { scroll-padding-top: 4.375rem }`. Article TOC targets already have `scroll-margin-top`. [visual: no]
- `src/pages/articles/index.astro:47-50,94-98`: the filter chips use `role="radiogroup"`/`role="radio"` without arrow-key handling or roving tabindex, which breaks the ARIA radio contract. Switch to plain buttons with `aria-pressed`, and announce the result change through a polite live region. [visual: no]
- `src/scripts/book3d.ts:181`: once WebGL renders, the fallback `<img>` gets `aria-hidden` and the canvas has no role or label, so the book image loses its alt text. Give the canvas `role="img"` and an `aria-label` copied from the fallback alt. [visual: no]
- `src/components/sections/BookHero.astro:17,74`: during the intro, the header, hero copy and form are hidden with `opacity:0` for up to 4s but remain focusable, so focus can land on invisible controls. Add `inert` while `html.book-intro` is set. [visual: no]
- `src/components/treatment/Compare.astro:22`: the RHM column header is only an SVG logo with no accessible name, so screen readers get one column of values with no header. Add `role="img" aria-label="RHM"` to the SVG. [visual: no]

### Motion

- `src/components/sections/Carousel.astro:82`: Swiper autoplays every 5s indefinitely (`disableOnInteraction:false`). It doesn't pause on hover or focus and ignores `prefers-reduced-motion`, which fails WCAG 2.2.2. Fix: skip autoplay under reduced motion, add `pauseOnMouseEnter`, and stop on focusin. A visible pause button would be a visual change. [visual: no]
- `src/components/sections/Carousel.astro:71`: the Swiper A11y module isn't loaded. Pagination bullets are non-focusable `<span>`s, slide changes aren't announced and slides have no group labels. Add `A11y` to `modules`. [visual: no]
- `src/components/treatment/Process.astro:88-96`: the custom 5s autoplay loops forever on every treatment page and /how-it-works. It has no pause, ignores reduced motion and keeps advancing while the user is on the step buttons. [visual: no]
- `src/pages/index.astro:112`, `src/components/sections/FinalCta.astro:25`: the `autoplay loop` background videos ignore `prefers-reduced-motion` and have no pause, which fails WCAG 2.2.2. The index hero video also lacks `aria-hidden="true"`. Under reduced motion, pause them and keep the poster. [visual: no]
- `src/styles/global.css`: there is no site-wide `prefers-reduced-motion` handling for CSS motion. Affected: `Button.astro:26` (label roll), `index.astro:146-159` (path-card radius, scale and slide), `Team.astro:39`, `Signs.astro:29`, `BookHero.astro:80-87` (keyframes), `Carousel.astro:64` (bullet-grow), `Process.astro:66` (step-fill), and the accordion transitions in `Accordion.astro`, `Faq.astro` and `FaqPage.astro`. Add a global `@media (prefers-reduced-motion: reduce)` block that removes transforms and animations and keeps short opacity/colour transitions. [visual: no]

### Forms

- `src/pages/contact.astro:19,23,27`: inputs have no `autocomplete` (`name`, `email`, `tel`), and the email field has no `spellcheck="false"`. [visual: no]
- `src/components/sections/BookHero.astro:39`: the same for the book form. Map `autocomplete` per field (`name` / `email` / `tel`) next to `types[]`, and set `spellcheck="false"` on email. [visual: no]
- `src/pages/contact.astro:39`, `src/components/sections/BookHero.astro:58`: the "something went wrong" message isn't announced. Add `role="alert"`. The success messages are fine because focus moves to them. [visual: no]

---

## Later (polish)

### Accessibility and semantics

- `src/components/treatment/Compare.astro:18-37`: the comparison table is built from divs. Add `role="table"`/`row`/`columnheader`/`rowheader`/`cell`. [visual: no]
- Imported SVG icons are rendered without `aria-hidden="true"` (the Header's inline SVGs already have it): `Accordion.astro:14`, `Faq.astro:17`, `FaqPage.astro:18`, `Team.astro:23`, `Carousel.astro:38-39`, `Locations.astro:28`, `index.astro:136,156`, `articles/index.astro:71-72`, `articles/[slug].astro:61,88-90`, `Footer.astro:41-42`, and `Preparation.astro:18` (`set:html` icon). [visual: no]
- `src/components/Header.astro:86-88`: on mobile, an `<a>` is nested inside `<summary>` (interactive inside interactive), so screen readers announce it oddly and the tap target is split. [visual: no]
- `src/components/Header.astro:80`: while the mobile menu is open, the page content isn't `inert` and the menu has no `overscroll-behavior: contain`. [visual: no]
- `Accordion.astro:35`, `Faq.astro:42`, `FaqPage.astro:50`: the click handler sits on the whole card (`[data-acc]`), so clicking or selecting text inside an open answer closes it, and links in answers also toggle the item. Bind to the button only. [visual: no]
- `src/components/sections/Carousel.astro:29,76`: inactive slide text is hidden only with opacity and is still read out. Set `aria-hidden` on inactive slides. The prev/next labels "Previous"/"Next" should be "Previous slide"/"Next slide" (lines 38-39). [visual: no]
- `src/components/treatment/Process.astro:43,86`: step buttons have no `aria-current`, and inactive slides aren't `aria-hidden`. [visual: no]
- `src/pages/articles/[slug].astro:139`: the current TOC link has no `aria-current="true"`. [visual: no]
- `src/pages/404.astro:12`: the page has only an `<h3>` and no `<h1>` (same as live). Use `<h1>` styled to match. [visual: no]
- External links open a new tab without telling screen-reader users: `Locations.astro:27`, `Footer.astro:52`, `Button.astro:16` (when `target="_blank"`). Add sr-only "(opens in new tab)". [visual: no]
- `src/components/ArticleCard.astro:26`, `src/pages/articles/index.astro:74`: dates are plain text. Use `<time datetime>`. [visual: no]
- `src/components/Footer.astro:41-42`: the social icon links are 21px, under the 24px minimum target. Invisible padding would fix it. [visual: no]

### Focus and interactive states

- No `:focus-visible` style is defined anywhere, so the site relies on the browser's default ring. It's hard to see on photo and dark backgrounds: HubHero buttons, `Statement.astro`, `CtaBlock.astro`, white header text over heroes (`Header.astro:22`), and Carousel slides. [visual: on keyboard focus only]
- `src/components/Header.astro:58`: top-level nav links have no hover state; only dropdown items have one. Check against live first. [visual: yes]
- `src/components/treatment/Signs.astro:31`: the cards change colour on hover but aren't interactive, which implies they're clickable. This matches live. [visual: yes]

### Animation

- `src/pages/index.astro:146`: `transition-all` on the path cards. List the properties instead (`border-radius`). [visual: no]
- `src/pages/articles/[slug].astro:165`: `transition: all` on `.toc-link::before`. List `opacity, left`. [visual: no]

### Images and performance

- These `<img>`s have no `width`/`height` (CLS): `ArticleCard.astro:18`, `Access.astro:27`, `Carousel.astro:27`, `Locations.astro:17`, `Team.astro:29`, `TelehealthCta.astro:35`, `CtaBlock.astro:22`, `Hero.astro:50`, `Hormones.astro:19,26`, `HubHero.astro:38`, `Missions.astro:22`, `Process.astro:28`, `Signs.astro:44`, `Standard.astro:34`, `Why.astro:15`, `index.astro:150`, `articles/index.astro:40,59`, `articles/[slug].astro:76,106`. Add intrinsic attributes; the CSS classes keep the rendered size. [visual: no]
- These above-the-fold LCP images have no `fetchpriority="high"`: `Hero.astro:50`, `HubHero.astro:38`, `articles/index.astro:40`, `articles/[slug].astro:76`. [visual: no]
- These below-the-fold images have no `loading="lazy"`: `Hormones.astro:19` (icons), `articles/[slug].astro:106` (author photo). [visual: no]
- `src/layouts/Layout.astro:62`: there is no `preconnect` for third-party origins (googletagmanager.com, connect.facebook.net, us.i.posthog.com, reputationhub.site, go.cogitare.vip, static.legitscript.com). [visual: no]

### Contrast (matches live; only change if allowed)

- These are below 4.5:1: TOC links at 40% ink (`articles/[slug].astro:162`, about 2.6:1), consent text `#0b142880` at 12px (`BookHero.astro:45`), the note `#0b142880` (`BookHero.astro:54`), inactive step numbers `text-black/30` (`Process.astro:46`), and the placeholder `#999` (`contact.astro:49`, about 2.8:1). [visual: yes]

### Typography and copy (check against live before changing)

- `src/pages/contact.astro:36`, `src/components/sections/BookHero.astro:44`: `data-wait="Please wait..."` should be `Please wait…`. [visual: yes]
- `src/pages/contact.astro:31`: the placeholder "Your Messaage" has a typo. Fix it if live has already fixed it; otherwise note it in MIGRATION.md. [visual: yes]
- `src/pages/contact.astro:19-31`: placeholders don't end with `…`. [visual: yes]
- `src/pages/articles/[slug].astro:86`: "Share This Articles" is ungrammatical. Check against live. [visual: yes]
- Headings have no `text-wrap: balance`, so multi-line h1/h2 can leave widows. Skip unless visual drift is acceptable. [visual: yes]

### Theming, touch and navigation state

- `src/layouts/Layout.astro:44`: there is no `<meta name="theme-color">`. [visual: browser UI only]
- `src/styles/global.css:138`: `touch-action: manipulation` and `-webkit-tap-highlight-color` aren't set. [visual: tap highlight only]
- `src/pages/articles/index.astro:94-98`: the category filter isn't reflected in the URL (`?category=`), so filtered views can't be linked or restored on back navigation. [visual: no]
- `src/components/Header.astro:80`: `max-h-[calc(100vh-70px)]` cuts off the bottom of the menu behind the iOS toolbar. `dvh` would fix it; `pb-[100px]` compensates today. [visual: no]
