import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4174, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['mobile', 390, 844],
    ['mobile-320', 320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:4174/');
    await page.screenshot({ path: resolve(output, `landing-${name}.png`), fullPage: true });
    await page.goto('http://127.0.0.1:4174/app/#/dashboard');
    await page.screenshot({
      path: resolve(output, `dashboard-${name}.png`),
      fullPage: name === 'desktop',
    });
    if (name !== 'desktop') {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.screenshot({ path: resolve(output, `dashboard-${name}-lower.png`) });
    }
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
