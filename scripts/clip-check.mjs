// Text cut off at the viewport edge (overflow is clipped, so it can't scroll into view). Usage: [WS=320,360] node scripts/clip-check.mjs <base>
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2];
const routes = Object.keys(JSON.parse(fs.readFileSync('migration.json','utf8')).scores);
const b = await chromium.launch();
for (const w of (process.env.WS||'320,390,767,991').split(',').map(Number)) for (const r of routes) { const p = await b.newPage({ viewport: { width: w, height: 800 } });
await p.goto(base + r, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(300);
const bad = await p.evaluate((w) => [...document.querySelectorAll('main *')].filter(e => { if (e.closest('.swiper, [class*=swiper], [class*=marquee], [class*=logos]')) return false; const rc=e.getBoundingClientRect(); if (!rc.width || rc.right <= w+0.5) return false; const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()); return hasText || e.tagName==='IMG'; }).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,40)+' r='+Math.round(e.getBoundingClientRect().right)+' "'+e.textContent.trim().slice(0,30)+'"'), w);
if (bad.length) console.log(w, r, bad.join(' | ')); await p.close(); }
await b.close(); console.log('clip check done');
