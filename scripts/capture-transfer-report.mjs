import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4179, strictPort: true } });
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
    await page.goto('http://127.0.0.1:4179/app/#/example');
    await page.getByLabel('Nombre del proyecto').waitFor();
    const id = page.url().split('#/project/')[1].split('/')[0];
    await page.goto('http://127.0.0.1:4179/app/#/settings');
    await page.getByRole('heading', { name: 'Crear un respaldo' }).waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10G-transfer-${name}.png`),
      fullPage: true,
    });
    const json = await page.evaluate(async () => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      const { serializeBackup } = await import('/src/data/backup-format.js');
      return serializeBackup(
        (await createProjectRepository().listProjects()).map((record) => record.project),
      );
    });
    await page.locator('#backup-file').setInputFiles({
      name: 'respaldo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json),
    });
    await page.getByRole('heading', { name: 'Vista previa · 1 proyecto' }).waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10G-preview-${name}.png`),
      fullPage: true,
    });
    await page.goto(`http://127.0.0.1:4179/app/#/project/${id}/report`);
    await page.getByRole('heading', { name: 'Clasificación · escenario base' }).waitFor();
    await page.screenshot({
      path: resolve(output, `phase-10G-report-${name}.png`),
      fullPage: true,
    });
    if (name === 'desktop') {
      await page.emulateMedia({ media: 'print' });
      await page.screenshot({
        path: resolve(output, 'phase-10G-print-preview.png'),
        fullPage: true,
      });
      await page.pdf({
        path: resolve(output, 'phase-10G-print-example.pdf'),
        format: 'A4',
        printBackground: true,
      });
    }
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
