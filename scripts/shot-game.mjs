// Takes the four screenshots in shots.json against the local server
// (run `node serve.ts` first, port 8080). Prints any console/page errors.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/makefun/shot/node_modules/playwright-core');

const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});
const errors = [];
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${shot.name} console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`${shot.name} pageerror: ${err.message}`));
  await page.goto(`http://127.0.0.1:8080/${shot.query}`, { waitUntil: 'load', timeout: 30000 });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 60000 });
  } catch {
    errors.push(`${shot.name}: __shotReady timeout`);
  }
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL(`../screenshots/${shot.name}`, import.meta.url).pathname,
    type: 'jpeg',
    quality: 78,
  });
  await page.close();
  console.log(`shot ${shot.name} saved`);
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'all shots OK, no console errors');
