/* global URL, document, innerWidth, Buffer, indexedDB, console */
// Read-only audit harness for the built site. Browser storage is isolated to this run.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';
import { officialExampleProject } from '../../src/shared/demo/official-project.js';
import { createDraftProject } from '../../src/domain/model.js';
import { serializeBackup } from '../../src/data/backup-format.js';

const root = resolve('dist');
const output = resolve('docs/audit-11A');
await mkdir(output, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/DecisionLab') {
    response.writeHead(302, { location: '/DecisionLab/' }).end();
    return;
  }
  if (!pathname.startsWith('/DecisionLab/')) {
    response.writeHead(404).end();
    return;
  }
  const relative = pathname.slice('/DecisionLab/'.length);
  const file = resolve(
    root,
    relative.endsWith('/') || !relative ? join(relative, 'index.html') : relative,
  );
  if (!file.startsWith(root + sep) && file !== root) {
    response.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    const extension = file.slice(file.lastIndexOf('.'));
    response
      .writeHead(200, {
        'content-type': `${mime[extension] ?? 'application/octet-stream'}; charset=utf-8`,
      })
      .end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveReady) => server.listen(4188, '127.0.0.1', resolveReady));

let browser;
const findings = {
  base: 'http://127.0.0.1:4188/DecisionLab/',
  failures: [],
  screens: [],
  routes: {},
};
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(findings.base))
      findings.failures.push(`request: ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.url().startsWith(findings.base) && response.status() >= 400)
      findings.failures.push(`${response.status()}: ${response.url()}`);
  });
  const clean = await browser.newPage();
  await clean.goto(findings.base);
  await clean.getByRole('link', { name: 'Ver cómo se evalúa' }).click();
  await clean.getByRole('heading', { name: 'Evaluación' }).waitFor();
  findings.routes.landingEvaluation = {
    url: clean.url(),
    content: (await clean.locator('#main-content').innerText()).slice(0, 240),
  };
  await clean.goto(findings.base);
  await clean.getByRole('link', { name: /Revisar el resultado/ }).click();
  await clean.getByRole('heading', { name: 'Resultados' }).waitFor();
  findings.routes.landingResult = {
    url: clean.url(),
    content: (await clean.locator('#main-content').innerText()).slice(0, 240),
  };
  await clean.close();
  await page.goto(findings.base);
  await page.getByRole('heading', { name: /Compara opciones/ }).waitFor();
  await page.getByRole('link', { name: /Abrir espacio de trabajo/ }).click();
  await page.getByRole('heading', { name: 'Tus comparaciones' }).waitFor();
  findings.routes.openFromLanding = page.url();
  await page.reload();
  await page.getByRole('heading', { name: 'Tus comparaciones' }).waitFor();
  findings.routes.reloadDashboard = page.url();
  await page.goto(`${findings.base}app/#/example`);
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = page.url().split('#/project/')[1].split('/')[0];
  await page.goto(`${findings.base}app/#/project/${id}/results`);
  await page.getByText('67,50', { exact: false }).first().waitFor();
  await page.reload();
  await page.getByText('67,50', { exact: false }).first().waitFor();
  findings.routes.reloadResults = page.url();

  const routes = [
    ['landing', ''],
    ['dashboard', 'app/#/dashboard'],
    ['comparisons', 'app/#/comparisons'],
    ['details', `app/#/project/${id}/details`],
    ['alternatives', `app/#/project/${id}/alternatives`],
    ['criteria', `app/#/project/${id}/criteria`],
    ['weights', `app/#/project/${id}/weights`],
    ['evaluation', `app/#/project/${id}/evaluation`],
    ['results', `app/#/project/${id}/results`],
    ['scenarios', `app/#/project/${id}/scenarios`],
    ['transfer', 'app/#/settings'],
    ['report', `app/#/project/${id}/report`],
  ];
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    for (const [name, route] of routes) {
      await page.goto(`${findings.base}${route}`);
      await page.locator('main').first().waitFor();
      await page.waitForTimeout(80);
      const measure = await page.evaluate(() => ({
        title: document.title,
        bodyWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        heading: document.querySelector('main h1')?.textContent ?? '',
      }));
      findings.screens.push({ width, name, ...measure });
      if (
        (width === 320 &&
          ['landing', 'alternatives', 'criteria', 'evaluation', 'transfer', 'report'].includes(
            name,
          )) ||
        (width === 1440 && ['dashboard', 'transfer', 'report'].includes(name))
      ) {
        await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true });
      }
    }
  }

  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(`${findings.base}app/#/settings`);
  const filename = 'decisionlab-respaldo-proyecto-de-prueba-con-un-nombre-muy-largo-2026.json';
  await page.locator('#backup-file').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(serializeBackup([officialExampleProject()])),
  });
  await page.getByRole('heading', { name: 'Vista previa · 1 proyecto' }).waitFor();
  findings.filePicker = await page.locator('#backup-file').evaluate((element) => ({
    name: element.files[0]?.name,
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  await page.screenshot({ path: join(output, 'file-selected-320.png'), fullPage: true });

  await page.goto(`${findings.base}app/#/project/${id}/criteria`);
  await page.getByRole('heading', { name: 'Criterios', exact: true }).waitFor();
  findings.actionTargets = await page
    .locator('.wizard-item-actions button')
    .evaluateAll((buttons) =>
      buttons.slice(0, 6).map((button) => {
        const rect = button.getBoundingClientRect();
        return { label: button.textContent, width: rect.width, height: rect.height };
      }),
    );

  await page.goto(`${findings.base}app/#/dashboard`);
  const menuButton = page.locator('#menu-button');
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  findings.menuFocus = await page.evaluate(() => ({
    open: document.querySelector('#menu-button')?.getAttribute('aria-expanded'),
    focusedText: document.activeElement?.textContent?.trim(),
    focusedHtml: document.activeElement?.outerHTML?.slice(0, 250),
  }));
  await page.screenshot({ path: join(output, 'menu-focus-320.png'), fullPage: false });

  const maxProject = officialExampleProject();
  maxProject.id = 'audit-5x8';
  maxProject.name =
    'Comparación de herramientas para un equipo con un nombre deliberadamente largo que permite revisar saltos de línea en el informe';
  maxProject.createdAt = '2026-11-04T00:00:00.000Z';
  maxProject.updatedAt = maxProject.createdAt;
  maxProject.alternatives.push(
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
    maxProject.criteria.push({
      id: `criterion-${n}`,
      name: `Criterio ${n} con una descripción extensa para probar el informe impreso`,
      description: '',
      type: 'rating',
      weight: 1,
    });
    maxProject.scenarios[0].weights[`criterion-${n}`] = 1;
  }
  for (const alternativeId of ['a', 'b', 'c', 'd', 'e'])
    for (const criterion of maxProject.criteria)
      if (
        !maxProject.evaluations.some(
          (item) => item.alternativeId === alternativeId && item.criterionId === criterion.id,
        )
      )
        maxProject.evaluations.push({ alternativeId, criterionId: criterion.id, value: 3 });
  await page.evaluate(
    (project) =>
      new Promise((resolveWrite, rejectWrite) => {
        const request = indexedDB.open('decisionlab', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('projects', 'readwrite');
          transaction.objectStore('projects').add({ id: project.id, revision: 1, project });
          transaction.oncomplete = () => {
            db.close();
            resolveWrite();
          };
          transaction.onerror = () => {
            db.close();
            rejectWrite(transaction.error);
          };
        };
        request.onerror = () => rejectWrite(request.error);
      }),
    maxProject,
  );
  await page.goto(`${findings.base}app/#/project/audit-5x8/report`);
  await page.getByRole('heading', { name: 'Clasificación · escenario base' }).waitFor();
  findings.maxReport = {
    evaluations: await page.locator('.report-evaluation').count(),
    results: await page.locator('.report-result').count(),
    criteria: await page.locator('.report-table tbody tr').count(),
  };
  await page.screenshot({ path: join(output, 'report-max-320.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: join(output, 'report-max-1440.png'), fullPage: true });
  await page.pdf({ path: join(output, 'report-max.pdf'), format: 'A4', printBackground: true });

  await page.goto(`${findings.base}app/#/settings`);
  await page.getByRole('heading', { name: 'Recuperar un respaldo' }).waitFor();
  const bulk = Array.from({ length: 500 }, (_, index) => {
    const draft = createDraftProject({
      id: `audit-bulk-${index}`,
      timestamp: '2026-11-04T00:00:00.000Z',
    });
    draft.name = `Proyecto de auditoría ${index}`;
    return draft;
  });
  const importStarted = Date.now();
  await page.locator('#backup-file').setInputFiles({
    name: 'bulk.json',
    mimeType: 'application/json',
    buffer: Buffer.from(serializeBackup(bulk)),
  });
  await page.getByRole('heading', { name: 'Vista previa · 500 proyectos' }).waitFor();
  const previewMs = Date.now() - importStarted;
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await page.locator('#transfer-status').filter({ hasText: '500 proyectos importados' }).waitFor();
  const importMs = Date.now() - importStarted;
  await page.getByRole('button', { name: 'Exportar todos los proyectos' }).click();
  await page.locator('#transfer-error').filter({ hasText: 'hasta 500 proyectos' }).waitFor();
  findings.bulk = {
    previewMs,
    importMs,
    projectRows: await page.locator('.transfer-project').count(),
    exportAllError: await page.locator('#transfer-error').innerText(),
  };
  await page.screenshot({ path: join(output, 'export-all-502.png'), fullPage: false });

  const shared = await browser.newContext();
  try {
    const first = await shared.newPage();
    await first.goto(`${findings.base}app/#/example`);
    await first.getByLabel('Nombre del proyecto').waitFor();
    const sharedId = first.url().split('#/project/')[1].split('/')[0];
    const second = await shared.newPage();
    await second.goto(`${findings.base}app/#/project/${sharedId}/details`);
    await second.getByLabel('Nombre del proyecto').waitFor();
    await first.getByLabel('Nombre del proyecto').fill('Primera pestaña');
    await first.locator('#save-state').filter({ hasText: 'Guardado en este navegador.' }).waitFor();
    await second.getByLabel('Nombre del proyecto').fill('Segunda pestaña');
    await second.locator('#save-error').filter({ hasText: 'Recarga antes de guardar' }).waitFor();
    await first.reload();
    findings.crossTab = {
      persistedName: await first.getByLabel('Nombre del proyecto').inputValue(),
      secondTabError: await second.locator('#save-error').innerText(),
    };
  } finally {
    await shared.close();
  }
  await writeFile(join(output, 'exploration.json'), JSON.stringify(findings, null, 2));
  console.log(
    JSON.stringify(
      {
        ...findings,
        screens: {
          count: findings.screens.length,
          overflow: findings.screens.filter((item) => item.bodyWidth > item.viewport),
        },
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
