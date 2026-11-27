// Accessibility scan: node scripts/a11y-axe.mjs <base-url> <out.json> [axe.min.js path]
// Runs axe-core (WCAG 2.0/2.1/2.2 A + AA, plus best-practice) on every sitemap route + /404-check at 1440 and 390.
// axe-core isn't a repo dependency: pass the path to axe.min.js (npm i axe-core in a temp folder) or set AXE.
import fs from 'node:fs';
import { chromium } from 'playwright';

const [base, out, axePath = process.env.AXE] = process.argv.slice(2);
const axe = fs.readFileSync(axePath, 'utf8');
const sm = await (await fetch('https://www.rhmmed.com/sitemap.xml')).text();
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/');
paths.push('/this-page-does-not-exist');
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

const browser = await chromium.launch();
const results = [];
for (const w of (process.env.WS || '1440,390').split(',').map(Number)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  for (const p of only || paths) {
    const page = await ctx.newPage();
    try {
      await page.goto(base.replace(/\/$/, '') + p, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(800);
      await page.addScriptTag({ content: axe });
      const r = await page.evaluate(async () => {
        const res = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
        });
        return res.violations.map((v) => ({
          id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter((t) => t.startsWith('wcag')),
          nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 200), summary: n.failureSummary?.slice(0, 300) })),
        }));
      });
      results.push({ path: p, width: w, violations: r });
      process.stdout.write(`${w} ${p} ${r.length}\n`);
    } catch (e) {
      results.push({ path: p, width: w, error: String(e).slice(0, 200) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(results, null, 1));
