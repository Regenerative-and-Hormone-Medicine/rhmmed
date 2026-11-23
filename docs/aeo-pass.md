# AEO pass — rhmmed.com (2026-11-23)

Part of the launch checklist (`docs/launch-checklist.md`, section 3). Technical items are done in code; **copy changes below
are proposals only**. They change client-facing medical-practice copy, so they need Evgenii's OK and then the client's
before anything is applied. Every proposed sentence reuses facts already on the site (no new services, claims or numbers).

## 1. Baseline (asked 2026-11-23, prompt: "Recommend a hormone replacement therapy clinic in Santa Monica, CA")

| Engine | RHM named? | What it said |
|---|---|---|
| Google AI Mode | **Yes, first of 6** | "Regenerative & Hormone Medicine, 4.9 (401), 2701 Ocean Park Blvd Ste 114 … Led by Dr. Rand McClain, DO … men and women … BHRT, TRT, regenerative treatments." Comparison table labels the care model **"Regenerative / Sports Medicine"**, and a Google card says **"Santa Monica, California and Houston, Texas"**. Both come from old Business Profile/legacy text, not the current site. |
| Perplexity | **No** | Named one OB-GYN (Santa Monica Gynecological and Obstetrical Medical Group) from a medifind listing. |
| ChatGPT | not run | Needs a prompt sent from Evgenii's ChatGPT account; skipped rather than send as them. Run it before launch or in the 4-week re-run. |

Takeaways: Google already knows RHM through its Business Profile. Perplexity doesn't find it, and the site's own pages
don't say "Santa Monica / The Woodlands / Aspen + telehealth in all U.S. states" early enough to be quoted. The Google
Business Profile description should be checked: it still points to sports medicine and Houston (client-side, through Steve/Evgenii).

**Re-run the same prompt on all three about 4 weeks after launch** (also "best TRT clinic Santa Monica" and
"perimenopause doctor telehealth California").

## 2. First 40–60 words of the main pages

Treatment pages (`/women/*`, `/men/*`) pass. They say what the page treats and how (160+ biomarkers, personalized plan).
None of them says where, but the CTA and the site shell carry that. No change proposed.

Hubs and info pages fail: they open with "We help women and men understand…" and never say what RHM is or where.
Proposed rewrites of the hero body line (the heading stays as it is):

| Page | Current hero body | Proposed |
|---|---|---|
| `/` | "RHM's licensed medical providers look beyond numbers to uncover the root issues and provide you with personalized treatments." | "Regenerative & Hormone Medicine is a physician-led hormone practice for women and men, in Santa Monica, The Woodlands and Aspen, and by telehealth in all U.S. states. Our licensed medical providers look beyond numbers to uncover the root issues and provide you with personalized treatments." |
| `/why-us` | "We help women and men understand what's affecting how they feel and function, then build personalized treatments for long-term health." | "RHM is a physician-led hormone and regenerative medicine practice led by Dr. Rand McClain, DO. We help women and men understand what's affecting how they feel and function, then build personalized treatments for long-term health." |
| `/telehealth` | same line as /why-us | "RHM offers physician-led hormone care by secure video or phone in all U.S. states, with local lab work and medications shipped to your door. We help women and men understand what's affecting how they feel and function." |
| `/men` | "We help men understand what's affecting their energy, libido, and performance by building personalized treatments for long-term health." | "RHM is a physician-led men's hormone clinic in Santa Monica, The Woodlands and Aspen, with telehealth in all U.S. states. We help men understand what's affecting their energy, libido, and performance by building personalized treatments for long-term health." |
| `/women` | "We help women understand what's affecting their energy, metabolism, and sleep by building personalized treatments for long-term health." | "RHM is a physician-led women's hormone practice in Santa Monica, The Woodlands and Aspen, with telehealth in all U.S. states. We help women understand what's affecting their energy, metabolism, and sleep by building personalized treatments for long-term health." |
| `/how-it-works` | "We guide you through a structured, step-by-step process…" | No change; it already explains the process plainly. |

Note: the longer lines may wrap to an extra row in the hero. That's a visual change the client should see first.

## 3. Headings (H2 → buyer questions)

Most treatment pages already have one question H2 ("What is Menopause?", "What is hormone replacement therapy?").
Proposed, a few per page, H3s untouched:

| Page | Current H2 | Proposed |
|---|---|---|
| `/men` | "Why hormones may be part of the picture" | "Could low testosterone be why I feel off?" |
| `/men`, `/women`, `/why-us`, `/how-it-works`, `/telehealth` | "Why choose Regenerative & Hormone Medicine" | keep (brand query) |
| `/women` | "Could hormones be behind this?" | keep (already a question) |
| `/how-it-works` | "What working with us looks like" | "How does hormone care at RHM work?" |
| `/telehealth` | "Your visit, explained" | "How does a telehealth hormone visit work?" |
| `/location` | "Our locations" | "Where are RHM's clinics?" |
| `/women/menopause`, `/women/perimenopause`, `/men/performance-recovery` | "Why standard care often falls short" | "Why do normal labs miss menopause symptoms?" / "…perimenopause symptoms?" / "Why do normal labs miss low testosterone?" |

**Source error found:** `/men/hormone-therapy` has an H2 "Our Approach to Metabolic Health" on the hormone therapy page.
It's the same on the live site, probably copied from the metabolic page. Proposed: "Our Approach to Hormone Therapy".

## 4. FAQ

- 19 treatment/hub pages already had FAQPage schema on the live site; copied verbatim (`src/data/schema/`).
- 23 articles keep their FAQPage embed.
- **New:** `/faq`, `/why-us`, `/telehealth`, `/patient-information` and `/cheating-death` show a 6-question FAQ with no schema
  on live. FAQPage is now generated from the same visible Q&A (`SectionPage.astro`).
- Mismatch kept for parity: `/men` shows 6 questions, but its live schema lists 5.
- The general FAQ answers (e.g. "Could my symptoms be hormone related?") run 60–80 words, inside the 40–90 range. No cuts proposed.

## 5. robots.txt

`public/robots.txt` allows everyone, with GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-SearchBot,
Google-Extended and Applebot-Extended named explicitly. **At cutover, check Cloudflare's "Block AI bots" / AI Crawl Control
setting on the rhmmed.com zone.** It overrides robots.txt and is on by default for some new zones.

## 6. llms.txt

`public/llms.txt` replaces Webflow's auto-generated dump with a short briefing: what RHM does, how care works, clinicians,
the three locations, and every main page. Facts only from the site.
