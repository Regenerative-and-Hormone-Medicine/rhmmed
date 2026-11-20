// Interaction smoke test (things a screenshot can't see). Formspark is intercepted: nothing is submitted.
// Usage: node scripts/interactions.mjs   (LOCAL env for the base URL)
import { chromium } from 'playwright';
const LOCAL = process.env.LOCAL || 'http://localhost:4400';
const b = await chromium.launch();
const ok = (name, cond, extra = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
const page = async (w = 1440) => { const p = await b.newPage({ viewport: { width: w, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs; return p; };

// 1. Desktop dropdowns by keyboard
let p = await page();
await p.goto(LOCAL + '/');
let reached = null;
for (let i = 0; i < 25; i++) {
  await p.keyboard.press('Tab');
  const a = await p.evaluate(() => { const e = document.activeElement; return e?.closest('.dd') && e.tagName === 'A' && e.closest('.dd > div:last-child') ? e.textContent.trim() : null; });
  if (a) { reached = a; break; }
}
ok('Tab reaches a dropdown menu link', !!reached, reached || '');
await p.waitForTimeout(50);
ok('Trigger reports aria-expanded=true while open', await p.evaluate(() => document.activeElement.closest('.dd').querySelector('[aria-expanded]')?.getAttribute('aria-expanded') === 'true'));
await p.keyboard.press('Escape');
await p.waitForTimeout(50);
ok('Escape closes the menu and focuses the trigger', await p.evaluate(() => { const dd = document.activeElement.closest('.dd'); return dd && getComputedStyle(dd.querySelector('.dd-panel')).visibility === 'hidden' && document.activeElement.getAttribute('aria-expanded') === 'false'; }));
// every desktop trigger is focusable
ok('All desktop dropdown triggers are focusable', await p.evaluate(() => [...document.querySelectorAll('.dd')].every((d) => d.querySelector('[aria-haspopup]')?.tabIndex >= 0)));
// hover
await p.mouse.move(5, 600); await p.hover('.dd >> nth=0'); await p.waitForTimeout(50);
ok('Hover opens dropdown', await p.evaluate(() => getComputedStyle(document.querySelector('.dd > div:last-child')).visibility === 'visible'));
ok('No JS errors (home)', !p.errs.length, p.errs.join('; '));
await p.close();

// 2. Mobile menu
p = await page(390);
await p.goto(LOCAL + '/');
await p.click('[data-menu-toggle]');
ok('Mobile menu opens', await p.evaluate(() => document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') === 'true' && !!document.querySelector('#mobile-menu')?.getClientRects().length));
await p.click('[data-menu-toggle]');
ok('Mobile menu closes', await p.evaluate(() => document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') === 'false'));
await p.close();

// 3. FAQ accordion by keyboard
p = await page();
await p.goto(LOCAL + '/faq');
const btn = p.locator('[data-acc] button').first();
await btn.focus(); await p.keyboard.press('Enter');
ok('Accordion opens with Enter', (await btn.getAttribute('aria-expanded')) === 'true');
await p.keyboard.press('Enter');
ok('Accordion closes with Enter', (await btn.getAttribute('aria-expanded')) === 'false');
await p.close();

// 4. Article filter by keyboard
p = await page();
await p.goto(LOCAL + '/articles');
await p.locator('.chip[data-cat]:not([data-cat=""])').first().focus(); await p.keyboard.press('Enter');
const shown = await p.evaluate(() => [...document.querySelectorAll('.card[data-cats]')].filter((c) => !c.hidden).length);
ok('Filter chip works from keyboard', shown > 0 && shown < 23, `${shown} shown`);
await p.close();

// 5. Forms (Formspark intercepted)
for (const [route, formSel, fill] of [
  ['/contact', '#contact-form', null],
  ['/cheating-death', '#book-form', null],
]) {
  p = await page();
  let posted = null;
  await p.route('**/submit-form.com/**', (r) => { posted = r.request().postData(); r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await p.route('**/botpoison**', (r) => r.continue());
  await p.goto(LOCAL + route); await p.waitForTimeout(route === '/cheating-death' ? 4500 : 500);
  await p.locator(formSel + ' [type=submit]').click();
  ok(`${route}: empty submit is blocked`, posted === null && await p.evaluate((s) => !document.querySelector(s).checkValidity(), formSel));
  const inputs = await p.locator(formSel + ' input:not([type=hidden]):not([tabindex="-1"]), ' + formSel + ' textarea').all();
  for (const i of inputs) {
    const t = await i.getAttribute('type'), n = (await i.getAttribute('name')) || '';
    await i.fill(t === 'email' || /mail/i.test(n) ? 'test@example.com' : t === 'tel' || /phone/i.test(n) ? '(310) 555-0123' : 'Test Person');
  }
  await p.locator(formSel + ' [type=submit]').click();
  await p.waitForTimeout(6000);
  const doneVisible = await p.evaluate(() => [...document.querySelectorAll('#contact-success,#book-done')].some((e) => !e.hidden));
  ok(`${route}: valid submit posts and shows success`, !!posted && doneVisible, posted ? 'payload ' + posted.slice(0, 90) : 'nothing posted');
  ok(`${route}: no JS errors`, !p.errs.length, p.errs.join('; '));
  await p.close();
}
await b.close();
