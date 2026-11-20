// Shapes produced by scripts/extract-treatments.py. Rich fields are pre-sanitised inline HTML.
export type Theme = 'men' | 'women';
export type Img = { src: string; alt: string } | null;
export type Btn = { text: string; href: string; variant?: 'dark' | 'light' };

/** Colour roles that change with the page's theme (source: Webflow component variants). */
export const accent = (t: Theme) => (t === 'men' ? 'bg-slate' : 'bg-brown');
