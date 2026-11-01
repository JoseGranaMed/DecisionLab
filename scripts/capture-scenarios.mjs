import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4178, strictPort: true } });
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
    await page.goto('http://127.0.0.1:4178/app/#/example');
    await page.getByLabel('Nombre del proyecto').waitFor();
    const id = page.url().split('#/project/')[1].split('/')[0];
    await page.goto(`http://127.0.0.1:4178/app/#/project/${id}/scenarios`);
    await page.getByLabel('Nombre del escenario').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10F-comparison-${name}.png`),
      fullPage: true,
    });
    if (name !== 'desktop') {
      await page
        .getByRole('heading', { name: 'Qué cambió en la clasificación' })
        .evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: resolve(output, `phase-10F-comparison-viewport-${name}.png`) });
    }
    if (name === 'desktop') {
      await page.locator('.scenarios-result').first().getByText('Ver aportes por criterio').click();
      await page.screenshot({
        path: resolve(output, 'phase-10F-editor-desktop.png'),
        fullPage: true,
      });
      await page.locator('.scenarios-result').nth(1).scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(output, 'phase-10F-rank-change-desktop.png') });
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Eliminar escenario' }).click();
      await page.screenshot({ path: resolve(output, 'phase-10F-no-scenario-desktop.png') });
    }
    if (name === 'mobile-320') {
      await page.getByLabel('Peso alternativo · Costo mensual').fill('');
      await page
        .getByLabel('Peso alternativo · Costo mensual')
        .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: resolve(output, 'phase-10F-invalid-mobile-320.png') });
    }
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
