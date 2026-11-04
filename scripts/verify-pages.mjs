import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';

const routeBase = '/decisionlab-preview/';
const root = resolve('dist');
const output = resolve('docs/evidence-12');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
await mkdir(output, { recursive: true });

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (!pathname.startsWith(routeBase)) {
    response.writeHead(404).end();
    return;
  }
  const relative = pathname.slice(routeBase.length);
  const file = resolve(
    root,
    !relative || relative.endsWith('/') ? join(relative, 'index.html') : relative,
  );
  if (!file.startsWith(root + sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const base = `http://127.0.0.1:${server.address().port}${routeBase}`;
const evidence = { basePath: routeBase, screens: [], failures: [], example: {} };
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  page.on('pageerror', (error) => evidence.failures.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      evidence.failures.push(`${response.status()} ${response.url()}`);
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.getByRole('heading', { name: /Compara opciones según/ }).waitFor();
    for (const [name, path] of [
      ['landing', ''],
      ['dashboard', 'app/#/dashboard'],
    ]) {
      await page.goto(base + path);
      await page.locator('main h1').first().waitFor();
      const measure = await page.evaluate(() => ({
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      evidence.screens.push({ width, name, ...measure });
      assert.ok(measure.scrollWidth <= measure.viewport, `${name} desborda a ${width}px`);
      if ((width === 320 || width === 1440) && name === 'landing')
        await page.screenshot({ path: join(output, `landing-${width}.png`), fullPage: true });
    }
    if (width === 390) {
      const menu = page.getByRole('button', { name: 'Abrir más opciones' });
      await menu.click();
      await page.locator('#mobile-menu').getByRole('link', { name: 'Resultados' }).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobile-menu').isVisible(), false);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}app/#/example`);
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = page.url().split('#/project/')[1]?.split('/')[0];
  assert.ok(id, 'no se creó el ejemplo');
  evidence.example.id = id;
  await page.goto(`${base}app/#/project/${id}/evaluation`);
  await page.getByRole('heading', { name: 'Evaluación' }).waitFor();
  await page.goto(`${base}app/#/project/${id}/results`);
  await page.getByRole('heading', { name: 'Clasificación' }).waitFor();
  assert.match(await page.locator('.results-ranking-item').first().innerText(), /67,50/);
  await page.getByRole('link', { name: 'Comparar escenarios' }).click();
  await page.getByLabel('Nombre del escenario').waitFor();
  assert.match(await page.locator('.scenarios-result').nth(1).innerText(), /70,00/);
  await page.goto(`${base}app/#/project/${id}/report`);
  await page.getByRole('heading', { name: 'Clasificación · escenario base' }).waitFor();
  await page.goto(`${base}app/#/comparisons`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(backup.application, 'DecisionLab');
  assert.equal(backup.projects.length, 1);
  assert.equal(backup.projects[0].id, id);
  evidence.example = {
    ...evidence.example,
    alternatives: backup.projects[0].alternatives.length,
    criteria: backup.projects[0].criteria.length,
    exported: download.suggestedFilename(),
  };
  await page.reload();
  await page.goto(`${base}app/#/project/${id}/results`);
  await page.getByRole('heading', { name: 'Clasificación' }).waitFor();
  assert.match(await page.locator('.results-ranking-item').first().innerText(), /67,50/);
  assert.deepEqual(evidence.failures, []);
  await writeFile(join(output, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(
    `Verificación Pages correcta: ${evidence.screens.length} pantallas y flujo con exportación.\n`,
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
