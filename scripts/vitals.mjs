// Rough mobile web vitals (CLS, LCP) for a list of routes on two hosts. Usage: node scripts/vitals.mjs <base> /a /b ...
// 390px viewport, 4x CPU throttle, Fast-3G-ish network. LCP on localhost is only indicative; CLS is meaningful.
import { chromium, devices } from 'playwright';
const [base, ...routes] = process.argv.slice(2);
const browser = await chromium.launch();
for (const r of routes) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 10, uploadThroughput: 750e3 / 8 });
  await page.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(base + r, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(1500);
  const v = await page.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp }));
  console.log(`${r}\tLCP ${(v.lcp / 1000).toFixed(2)}s\tCLS ${v.cls.toFixed(3)}`);
  await ctx.close();
}
await browser.close();
