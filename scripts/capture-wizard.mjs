import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4176, strictPort: true } });
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
    await page.goto('http://127.0.0.1:4176/app/#/new');
    await page.getByLabel('Nombre del proyecto').fill('Elegir herramienta para el equipo');
    await page.getByLabel('Pregunta de decisión').fill('¿Qué herramienta conviene al equipo?');
    await page.locator('[data-wizard-next]').click();
    for (const name of ['Herramienta A', 'Herramienta B']) {
      await page.getByRole('button', { name: 'Añadir alternativa' }).click();
      await page.locator('.wizard-item').last().getByLabel('Nombre').fill(name);
    }
    await page.getByText('Guardado en este navegador.').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10C-alternatives-${name}.png`),
      fullPage: true,
    });
    await page.locator('[data-wizard-next]').click();
    await page.getByRole('button', { name: 'Añadir criterio' }).click();
    await page.locator('.wizard-item').last().getByLabel('Nombre').fill('Facilidad de uso');
    await page.getByRole('button', { name: 'Añadir criterio' }).click();
    const cost = page.locator('.wizard-item').last();
    await cost.getByLabel('Nombre').fill('Costo mensual');
    await cost.getByLabel('Tipo').selectOption('numeric');
    await cost.getByLabel('Unidad').fill('S/');
    await cost.getByLabel('Valor mínimo').fill('0');
    await cost.getByLabel('Valor máximo').fill('200');
    await cost.getByLabel('Sentido favorable').selectOption('lower');
    await page.getByText('Guardado en este navegador.').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10C-criteria-${name}.png`),
      fullPage: true,
    });
    await page.locator('[data-wizard-next]').click();
    await page.locator('.wizard-item').nth(0).getByLabel('Peso').fill('3');
    await page.locator('.wizard-item').nth(1).getByLabel('Peso').fill('2');
    await page.getByText('Guardado en este navegador.').waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10C-weights-${name}.png`),
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
