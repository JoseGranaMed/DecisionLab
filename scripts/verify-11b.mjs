/* global innerWidth, Buffer, URL */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';
import { officialExampleProject } from '../src/shared/demo/official-project.js';
import { createDraftProject } from '../src/domain/model.js';
import { serializeBackup } from '../src/data/backup-format.js';

const output = resolve('docs/evidence-11B');
const root = resolve('dist');
await mkdir(output, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (!pathname.startsWith('/DecisionLab/')) return response.writeHead(404).end();
  const relative = pathname.slice('/DecisionLab/'.length);
  const file = resolve(
    root,
    relative.endsWith('/') || !relative ? join(relative, 'index.html') : relative,
  );
  if (file !== root && !file.startsWith(root + sep)) return response.writeHead(403).end();
  try {
    const bytes = await readFile(file);
    response
      .writeHead(200, {
        'content-type': mime[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream',
      })
      .end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(4189, '127.0.0.1', ready));
const base = 'http://127.0.0.1:4189/DecisionLab/';
const evidence = { base, screens: [], failures: [], pdf: {} };
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      evidence.failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => evidence.failures.push(error.message));
  await page.goto(base);
  await page.getByRole('heading', { name: /Compara opciones/ }).waitFor();
  await page.goto(`${base}app/#/example`);
  await page.getByLabel('Nombre del proyecto').waitFor();
  const normalId = page.url().split('#/project/')[1].split('/')[0];
  await page.goto(`${base}app/#/project/${normalId}/report`);
  await page.getByRole('heading', { name: 'Clasificación · escenario base' }).waitFor();
  await page.pdf({ path: join(output, 'report-example.pdf'), format: 'A4', printBackground: true });

  const max = officialExampleProject();
  max.id = 'verification-5x8';
  max.name =
    'Comparación de herramientas para un equipo con un nombre deliberadamente largo que permite revisar saltos de línea en el informe';
  max.createdAt = '2026-11-04T00:00:00.000Z';
  max.updatedAt = max.createdAt;
  max.alternatives.push(
    {
      id: 'd',
      name: 'Herramienta D con un nombre descriptivo y extenso',
      description: '',
      order: 3,
    },
    {
      id: 'e',
      name: 'Herramienta E con un nombre descriptivo y extenso',
      description: '',
      order: 4,
    },
  );
  for (let n = 5; n <= 8; n++) {
    max.criteria.push({
      id: `criterion-${n}`,
      name: `Criterio ${n} con una descripción extensa para probar el informe impreso`,
      description: '',
      type: 'rating',
      weight: 1,
    });
    max.scenarios[0].weights[`criterion-${n}`] = 1;
  }
  for (const alternativeId of ['a', 'b', 'c', 'd', 'e'])
    for (const criterion of max.criteria)
      if (
        !max.evaluations.some(
          (item) => item.alternativeId === alternativeId && item.criterionId === criterion.id,
        )
      )
        max.evaluations.push({ alternativeId, criterionId: criterion.id, value: 3 });
  await page.goto(`${base}app/#/settings`);
  await page.locator('#backup-file').setInputFiles({
    name: '5x8.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serializeBackup([max])),
  });
  await page.getByRole('heading', { name: 'Vista previa · 1 proyecto' }).waitFor();
  await page.getByLabel('Conservar ID libres y copiar los conflictos').check();
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await page.getByText('1 proyecto importado.').waitFor();
  await page.goto(`${base}app/#/project/${max.id}/report`);
  await page.getByRole('heading', { name: 'Clasificación · escenario base' }).waitFor();
  evidence.pdf.max = {
    alternatives: await page.locator('.report-evaluation').count(),
    criteria: await page.locator('.report-table tbody tr').count(),
  };
  await page.pdf({ path: join(output, 'report-5x8.pdf'), format: 'A4', printBackground: true });

  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [
      ['landing', ''],
      ['transfer', 'app/#/settings'],
      ['report', `app/#/project/${max.id}/report`],
    ]) {
      await page.goto(base + path);
      await page.locator('main h1').first().waitFor();
      const measurement = await page.evaluate(() => ({
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
      }));
      evidence.screens.push({ width, name, ...measurement });
      if ((width === 320 || width === 1440) && ['landing', 'report'].includes(name))
        await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`${base}app/#/settings`);
  const longName = 'decisionlab-respaldo-proyecto-de-prueba-con-un-nombre-muy-largo-2026.json';
  await page.locator('#backup-file').setInputFiles({
    name: longName,
    mimeType: 'application/json',
    buffer: Buffer.from(serializeBackup([max])),
  });
  await page.getByRole('heading', { name: 'Vista previa · 1 proyecto' }).waitFor();
  evidence.longFile = await page.locator('#backup-file-name').innerText();
  await page.screenshot({ path: join(output, 'filename-320.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  evidence.zoomTransfer = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await page.screenshot({ path: join(output, 'transfer-zoom-320.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  const bulk = Array.from({ length: 500 }, (_, index) => ({
    ...createDraftProject({
      id: `verification-bulk-${index}`,
      timestamp: '2026-11-04T00:00:00.000Z',
    }),
    name: `Proyecto de verificación ${index}`,
  }));
  await page.goto(`${base}app/#/settings`);
  await page.locator('#backup-file').setInputFiles({
    name: '500-proyectos.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serializeBackup(bulk)),
  });
  await page.getByRole('heading', { name: 'Vista previa · 500 proyectos' }).waitFor();
  await page.getByLabel('Conservar ID libres y copiar los conflictos').check();
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await page.getByText('500 proyectos importados.').waitFor();
  await page.getByRole('button', { name: 'Exportar todos los proyectos' }).click();
  await page
    .getByRole('heading', { name: '2 archivos para respaldar todos los proyectos' })
    .waitFor();
  evidence.batches = await page.locator('.transfer-batch-list li').allTextContents();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    evidence.screens.push({
      width,
      name: 'batches',
      ...(await page.evaluate(() => ({
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
      }))),
    });
    if (width === 320 || width === 1440) {
      await page.locator('#transfer-batches').scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(output, `batches-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`${base}app/#/dashboard`);
  await page.locator('#menu-button').focus();
  await page.keyboard.press('Enter');
  evidence.menuFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.screenshot({ path: join(output, 'menu-320.png') });
  await writeFile(join(output, 'responsive.json'), JSON.stringify(evidence, null, 2));
  if (
    evidence.failures.length ||
    evidence.screens.some((screen) => screen.scrollWidth > screen.viewport) ||
    evidence.zoomTransfer.scrollWidth > evidence.zoomTransfer.viewport
  )
    throw new Error('Visual verification failed; see responsive.json');
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
