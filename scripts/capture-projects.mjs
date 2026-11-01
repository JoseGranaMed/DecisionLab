import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4175, strictPort: true } });
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
    await page.goto('http://127.0.0.1:4175/');
    await page.screenshot({
      path: resolve(output, `phase-10B-landing-${name}.png`),
      fullPage: true,
    });
    await page.goto('http://127.0.0.1:4175/app/#/new');
    await page.getByLabel('Nombre del proyecto').fill('Elegir portátil para estudiar');
    await page.getByLabel('Pregunta de decisión').fill('¿Qué portátil conviene para mis clases?');
    await page
      .getByLabel('Descripción')
      .fill('Comparar opciones dentro del presupuesto disponible.');
    await page.getByText('Guardado en este navegador.').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10B-editor-${name}.png`),
      fullPage: name === 'desktop',
    });
    await page.goto('http://127.0.0.1:4175/app/#/comparisons');
    await page.locator('.saved-project').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10B-list-${name}.png`),
      fullPage: name === 'desktop',
    });
    await page.goto('http://127.0.0.1:4175/app/#/dashboard');
    await page.getByText('1 proyecto guardado').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10B-dashboard-${name}.png`),
      fullPage: name === 'desktop',
    });
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
