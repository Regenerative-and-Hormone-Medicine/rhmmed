// Article cards for the "Research & Insights" / "Related Articles" sections, built from the article documents themselves
// (Evgenii, 2026-11-26: these sections are CMS-driven). A section stores only which articles to show (Sanity references,
// in order); title, summary, first category, date and image come from each article, so editing an article updates every
// card that shows it. Image: the article's card image if it has one, else its main image.
import type { AstroGlobal } from 'astro';
import { list } from './content';

export interface Card { href: string; title: string; summary: string; category: string; date: string; image: { src: string; alt: string } | null }

const fmt = (d: string | null) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');

/** `ids`: article ids, with or without the Sanity "article-" prefix. Unknown ids (deleted article) are skipped. */
export async function articleCards(ctx: Pick<AstroGlobal, 'cookies'>, ids: string[]): Promise<Card[]> {
  const [articles, cats] = await Promise.all([list(ctx, 'articles'), list(ctx, 'blogCategories')]);
  const out: Card[] = [];
  for (const raw of ids) {
    const a = articles.find((x) => x.id === raw.replace(/^article-/, ''))?.data;
    if (!a) continue;
    const first = a.category.split(';').map((c: string) => c.trim()).filter(Boolean)[0];
    out.push({
      href: `/articles/${a.slug}`,
      title: a.title,
      summary: a.metaDescription,
      category: cats.find((c) => c.id === first)?.data.name ?? first ?? '',
      date: fmt(a.date),
      image: a.cardImage ? { src: a.cardImage, alt: a.cardImageAlt || a.imageAlt } : { src: a.image, alt: a.imageAlt },
    });
  }
  return out;
}
