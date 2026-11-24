// QA sweep: every page at 5 widths -> horizontal overflow, console/page errors, failed requests; plus semantics + internal links.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.LOCAL || 'http://localhost:4400'; // usage: node scripts/qa-sweep.mjs out.json
const routes = Object.keys(JSON.parse(fs.readFileSync('migration.json','utf8')).scores);
routes.push('/404-test-page');
const b = await chromium.launch();
const links = new Set(); const out = [];
for (const r of routes) {
  for (const w of [1440, 991, 767, 390, 320]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    const errs = []; const bad = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0,120)));
    p.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text().slice(0,120)); });
    p.on('response', res => { const u=res.url(); if (res.status()>=400 && u.startsWith(BASE) && !u.includes('404-test')) bad.push(res.status()+' '+u.replace(BASE,'')); });
    try { await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 }); } catch(e) { errs.push('goto '+e.message.slice(0,60)); }
    await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=600) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,40)); } window.scrollTo(0,0); });
    const info = await p.evaluate((w) => {
      const sw = document.documentElement.scrollWidth;
      const wide = sw > w + 1 ? [...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); return r.right > w+1 && r.width>0 && getComputedStyle(e).position!=='fixed'; }).slice(0,4).map(e => e.tagName.toLowerCase()+'.'+String(e.className).slice(0,50)+' r='+Math.round(e.getBoundingClientRect().right)) : [];
      const res = { sw, wide };
      if (w === 1440) {
        const ids = [...document.querySelectorAll('[id]')].map(e=>e.id); const dup = ids.filter((x,i)=>ids.indexOf(x)!==i);
        const vis = e => !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
        res.sem = {
          lang: document.documentElement.lang, title: document.title.length,
          main: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length,
          skip: !!document.querySelector('a[href="#main"],a[href^="#"][class*=skip]'),
          dupIds: [...new Set(dup)].slice(0,5),
          imgNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
          imgNoDims: [...document.querySelectorAll('img')].filter(i=>!i.getAttribute('width')&&!i.closest('header')).length,
          emptyLinks: [...document.querySelectorAll('a')].filter(a=>vis(a)&&!(a.textContent.trim()||a.getAttribute('aria-label')||a.querySelector('img[alt]:not([alt=""])'))).map(a=>a.getAttribute('href')).slice(0,4),
          noHref: [...document.querySelectorAll('a:not([href])')].length,
          divClick: [...document.querySelectorAll('[onclick]:not(a):not(button)')].length,
          inputsNoLabel: [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]),select,textarea')].filter(i=>!(i.labels?.length||i.getAttribute('aria-label')||i.getAttribute('aria-labelledby'))).map(i=>i.name||i.id).slice(0,5),
          iframeNoTitle: [...document.querySelectorAll('iframe:not([title])')].length,
          blankNoRel: [...document.querySelectorAll('a[target=_blank]')].filter(a=>!/noopener|noreferrer/.test(a.rel)).length,
          headingSkips: (()=>{ const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h=>+h.tagName[1]); let s=[]; for(let i=1;i<hs.length;i++) if(hs[i]>hs[i-1]+1) s.push(hs[i-1]+'>'+hs[i]); return s.slice(0,4); })(),
          links: [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
        };
      }
      return res;
    }, w);
    if (info.sem) { info.sem.links.forEach(h => { if (h.startsWith('/') && !h.startsWith('//')) links.add(h.split('#')[0].split('?')[0]); }); delete info.sem.links; }
    out.push({ r, w, overflow: info.sw > w+1 ? info.sw : 0, wide: info.wide, errs: [...new Set(errs)], bad: [...new Set(bad)], sem: info.sem });
    await p.close();
  }
}
const broken = [];
for (const l of links) { if (!l) continue; const res = await fetch(BASE + l, { redirect: 'manual' }); if (res.status >= 400) broken.push(res.status + ' ' + l); }
fs.writeFileSync(process.argv[2], JSON.stringify({ out, broken, linkCount: links.size }, null, 1));
await b.close();
