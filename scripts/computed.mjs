import { chromium } from 'playwright';
const url = process.argv[2] || 'https://www.rhmmed.com/';
const b = await chromium.launch();
for (const width of [1440, 390]) {
  const p = await b.newPage({ viewport: { width, height: 900 } });
  await p.goto(url, { waitUntil: 'networkidle' });
  const out = await p.evaluate(() => {
    const props = ['fontFamily','fontSize','lineHeight','fontWeight','letterSpacing','textTransform','color','backgroundColor','borderRadius','border','boxShadow','padding','margin','maxWidth','width','height','gap','transition'];
    const pick = (el) => { const s = getComputedStyle(el); const o = {}; for (const k of props) { const v = s[k]; if (v && v !== 'none' && v !== 'normal' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== 'auto') o[k] = v; } const r = el.getBoundingClientRect(); o.box = `${Math.round(r.width)}x${Math.round(r.height)}`; return o; };
    const seen = new Map();
    for (const el of document.querySelectorAll('body *')) {
      const c = (el.getAttribute('class') || '').split(' ')[0];
      if (!c || c.startsWith('w-') || seen.has(c)) continue;
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      seen.set(c, { tag: el.tagName.toLowerCase(), text: (el.childNodes[0]?.nodeType === 3 ? el.textContent.trim().slice(0, 30) : ''), ...pick(el) });
    }
    return Object.fromEntries(seen);
  });
  console.log(`\n######## ${width}`);
  for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
  await p.close();
}
await b.close();
