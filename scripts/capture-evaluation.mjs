import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4177, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['tablet', 768, 900],
    ['mobile', 390, 844],
    ['mobile-320', 320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:4177/app/#/example');
    await page.getByLabel('Nombre del proyecto').waitFor();
    await page.locator('[data-wizard-step="evaluation"]').click();
    await page.getByRole('heading', { name: 'Evaluación' }).waitFor();
    await page.screenshot({ path: resolve(output, `phase-10D-evaluation-${name}.png`) });
    if (width < 700) {
      await page.locator('.evaluation-alternative').last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(output, `phase-10D-evaluation-${name}-lower.png`) });
    }
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
