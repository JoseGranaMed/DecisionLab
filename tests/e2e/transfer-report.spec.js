import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function example(page) {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  return page.url().split('#/project/')[1].split('/')[0];
}

async function selectBackup(page, text) {
  await page.locator('#backup-file').setInputFiles({
    name: 'decisionlab-respaldo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
}

test('respaldo individual: descarga, vista previa, copia independiente y resultados conservados', async ({
  page,
}) => {
  const original = await example(page);
  await page.goto('/app/#/comparisons');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^decisionlab-proyecto-\d{4}-\d\d-\d\d\.json$/);
  const text = await readFile(await download.path(), 'utf8');
  const parsed = JSON.parse(text);
  expect(parsed).toMatchObject({ application: 'DecisionLab', formatVersion: 1 });
  expect(parsed.projects).toHaveLength(1);
  expect(parsed.projects[0].scenarios[0].weights.cost).toBe(4);
  expect(parsed.projects[0]).not.toHaveProperty('results');
  await page.goto('/app/#/settings');
  await selectBackup(page, text);
  await expect(page.getByRole('heading', { name: 'Vista previa · 1 proyecto' })).toBeVisible();
  await expect(page.getByText('1 ID coincide')).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        (
          await (
            await import('/src/data/project-repository.js')
          )
            .createProjectRepository()
            .listProjects()
        ).length,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.getByText('1 proyecto importado. 1 como copia.')).toBeVisible();
  const state = await page.evaluate(async (sourceId) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { evaluateProject } = await import('/src/domain/evaluation.js');
    const { compareScenarios } = await import('/src/domain/scenarios.js');
    const records = await createProjectRepository().listProjects();
    const copy = records.find((item) => item.id !== sourceId).project;
    return {
      count: records.length,
      id: copy.id,
      alternatives: copy.alternatives,
      criteria: copy.criteria,
      evaluations: copy.evaluations,
      scenarios: copy.scenarios,
      base: evaluateProject(copy).value.results.map((item) => item.score),
      alternate: compareScenarios(copy, copy.scenarios[0].id).value.alternate.results.map(
        (item) => item.score,
      ),
    };
  }, original);
  expect(state.count).toBe(2);
  expect(state.id).not.toBe(original);
  expect(state.base).toEqual([67.5, 66.25, 46.25]);
  expect(state.alternate).toEqual([70, 60, 32.5]);
  await page.goto(`/app/#/project/${state.id}/results`);
  await expect(page.locator('.results-ranking-item').first()).toContainText('67,50 / 100');
});

test('respaldo completo: restaura proyecto completo y borrador en almacenamiento limpio', async ({
  page,
  browser,
}) => {
  await example(page);
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Borrador recuperable');
  await page.getByLabel('Pregunta de decisión').fill('¿Qué opción elegir?');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { createProjectRepository } = await import('/src/data/project-repository.js');
        const records = await createProjectRepository().listProjects();
        const draft = records.find((item) => item.project.name === 'Borrador recuperable');
        return draft?.project.question;
      }),
    )
    .toBe('¿Qué opción elegir?');
  await page.goto('/app/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar todos los proyectos' }).click();
  const text = await readFile(await (await downloadPromise).path(), 'utf8');
  const exported = JSON.parse(text).projects;
  expect(exported).toHaveLength(2);
  expect(exported.some((project) => project.name === 'Borrador recuperable')).toBe(true);
  const context = await browser.newContext();
  const fresh = await context.newPage();
  try {
    await fresh.goto('/app/#/settings');
    await selectBackup(fresh, text);
    await expect(fresh.getByRole('heading', { name: 'Vista previa · 2 proyectos' })).toBeVisible();
    await expect(fresh.getByText('0 ID coinciden')).toBeVisible();
    await fresh.getByLabel('Conservar ID libres y copiar los conflictos').check();
    await fresh.getByRole('button', { name: 'Confirmar importación' }).click();
    await expect(fresh.getByText('2 proyectos importados. 0 como copia.')).toBeVisible();
    const restored = await fresh.evaluate(async () => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      const { evaluateProject } = await import('/src/domain/evaluation.js');
      const records = await createProjectRepository().listProjects();
      const complete = records.find((item) => item.project.scenarios.length).project;
      return {
        count: records.length,
        draft: records.find((item) => item.project.name === 'Borrador recuperable')?.project,
        scenario: complete.scenarios[0],
        scores: evaluateProject(complete).value.results.map((item) => item.score),
      };
    });
    expect(restored.count).toBe(2);
    expect(restored.draft).toBeDefined();
    expect(restored.draft.alternatives).toEqual([]);
    expect(restored.scenario.weights.cost).toBe(4);
    expect(restored.scores).toEqual([67.5, 66.25, 46.25]);
  } finally {
    await context.close();
  }
});

test('502 proyectos se descargan manualmente en dos lotes y se recuperan sin pérdidas', async ({
  page,
  browser,
}) => {
  await page.goto('/app/#/settings');
  await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { createDraftProject } = await import('/src/domain/model.js');
    const repository = createProjectRepository();
    await repository.createProject({ name: 'Proyecto 500' });
    await repository.createProject({ name: 'Proyecto 501' });
    const projects = Array.from({ length: 500 }, (_, index) => ({
      ...createDraftProject({ id: `bulk-${index}`, timestamp: '2026-11-04T00:00:00.000Z' }),
      name: `Proyecto ${index}`,
    }));
    await repository.importProjects(projects, { mode: 'copy-conflicts' });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Exportar todos los proyectos' }).click();
  await expect(
    page.getByRole('heading', { name: '2 archivos para respaldar todos los proyectos' }),
  ).toBeVisible();
  await expect(page.locator('.transfer-batch-list li')).toHaveCount(2);
  const backups = [];
  for (const index of [1, 2]) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: `Descargar lote ${index}` }).click();
    const file = await downloading;
    expect(file.suggestedFilename()).toContain(`lote-0${index}-de-02`);
    backups.push(await readFile(await file.path(), 'utf8'));
  }
  const exported = backups.flatMap((text) =>
    JSON.parse(text).projects.map((project) => project.id),
  );
  expect(exported).toHaveLength(502);
  expect(new Set(exported).size).toBe(502);
  const context = await browser.newContext();
  const fresh = await context.newPage();
  try {
    await fresh.goto('/app/#/settings');
    for (const text of backups) {
      await selectBackup(fresh, text);
      await fresh.getByLabel('Conservar ID libres y copiar los conflictos').check();
      await fresh.getByRole('button', { name: 'Confirmar importación' }).click();
      await expect(fresh.locator('#transfer-status')).toContainText('proyectos importados');
    }
    const restored = await fresh.evaluate(async () => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      return (await createProjectRepository().listProjects()).map((record) => record.id);
    });
    expect(restored).toHaveLength(502);
    expect(new Set(restored)).toEqual(new Set(exported));
  } finally {
    await context.close();
  }
});

test('el nombre completo del archivo seleccionado se lee a 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/app/#/settings');
  const name = 'decisionlab-respaldo-proyecto-de-prueba-con-un-nombre-muy-largo-2026.json';
  await page
    .locator('#backup-file')
    .setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#backup-file-name')).toHaveText(name);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
  ).toBe(true);
});

test('una importación que excede los límites del MVP se rechaza antes de confirmar', async ({
  page,
}) => {
  await page.goto('/app/#/settings');
  const text = await page.evaluate(async () => {
    const { createDraftProject } = await import('/src/domain/model.js');
    const { serializeBackup } = await import('/src/data/backup-format.js');
    const project = createDraftProject({
      id: 'large-draft',
      timestamp: '2026-11-04T00:00:00.000Z',
    });
    project.name = 'Borrador grande';
    project.alternatives = Array.from({ length: 6 }, (_, index) => ({
      id: `a-${index}`,
      name: `A ${index}`,
      description: '',
      order: index,
    }));
    project.criteria = Array.from({ length: 9 }, (_, index) => ({
      id: `c-${index}`,
      name: `C ${index}`,
      description: '',
      type: 'rating',
      weight: 1,
    }));
    return serializeBackup([project]);
  });
  await selectBackup(page, text);
  await expect(page.locator('#transfer-error')).toContainText('Borrador grande');
  await expect(page.locator('#transfer-error')).toContainText(
    'máximo es 5 alternativas y 8 criterios',
  );
  await expect(page.locator('#transfer-preview')).toBeHidden();
});

test('archivos inválidos y cancelación no escriben proyectos', async ({ page }) => {
  await example(page);
  await page.goto('/app/#/settings');
  const valid = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { serializeBackup } = await import('/src/data/backup-format.js');
    return serializeBackup(
      (await createProjectRepository().listProjects()).map((record) => record.project),
    );
  });
  for (const [text, expected] of [
    ['{', 'JSON válido'],
    [JSON.stringify({ ...JSON.parse(valid), formatVersion: 99 }), 'versión del formato'],
    [
      JSON.stringify({
        ...JSON.parse(valid),
        projects: [{ ...JSON.parse(valid).projects[0], schemaVersion: 99 }],
      }),
      'versión de esquema',
    ],
    [
      JSON.stringify({
        ...JSON.parse(valid),
        projects: [{ ...JSON.parse(valid).projects[0], extra: true }],
      }),
      'campo no admitido',
    ],
    [
      JSON.stringify({
        ...JSON.parse(valid),
        projects: [
          {
            ...JSON.parse(valid).projects[0],
            evaluations: [{ alternativeId: 'ghost', criterionId: 'ease', value: 3 }],
          },
        ],
      }),
      'datos inconsistentes',
    ],
  ]) {
    await selectBackup(page, text);
    await expect(page.locator('#transfer-error')).toContainText(expected);
    await expect(page.locator('#transfer-preview')).toBeHidden();
  }
  const malicious = JSON.parse(valid);
  malicious.projects[0].name = '<img src=x onerror=alert(1)>';
  await selectBackup(page, JSON.stringify(malicious));
  await expect(page.locator('.transfer-preview-list')).toContainText(
    '<img src=x onerror=alert(1)>',
  );
  expect(await page.locator('.transfer-preview-list img').count()).toBe(0);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('Importación cancelada.')).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        (
          await (
            await import('/src/data/project-repository.js')
          )
            .createProjectRepository()
            .listProjects()
        ).length,
    ),
  ).toBe(1);
});

test('una falla en el segundo registro revierte el lote completo', async ({ page }) => {
  await page.goto('/app/#/settings');
  const text = await page.evaluate(async () => {
    const { officialExampleProject } = await import('/src/shared/demo/official-project.js');
    const { createDraftProject } = await import('/src/domain/model.js');
    const { serializeBackup } = await import('/src/data/backup-format.js');
    return serializeBackup([
      officialExampleProject(),
      createDraftProject({ id: 'draft', timestamp: '2026-11-04T00:00:00.000Z' }),
    ]);
  });
  await selectBackup(page, text);
  await page.evaluate(() => {
    window.__originalAdd = window.IDBObjectStore.prototype.add;
    let calls = 0;
    window.IDBObjectStore.prototype.add = function (...args) {
      calls++;
      if (calls === 2) throw new window.DOMException('Fallo simulado', 'QuotaExceededError');
      return window.__originalAdd.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.locator('#transfer-error')).toBeVisible();
  const count = await page.evaluate(
    async () =>
      (
        await (
          await import('/src/data/project-repository.js')
        )
          .createProjectRepository()
          .listProjects()
      ).length,
  );
  expect(count).toBe(0);
  await page.evaluate(() => {
    window.IDBObjectStore.prototype.add = window.__originalAdd;
  });
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.getByText('2 proyectos importados.')).toBeVisible();
});

test('informe completo usa el motor, imprime sin navegación y se actualiza al editar', async ({
  page,
}) => {
  const id = await example(page);
  await page.goto(`/app/#/project/${id}/results`);
  await page.getByRole('link', { name: 'Ver informe imprimible' }).click();
  const report = page.locator('.report-workspace');
  await expect(report).toContainText('Herramientas para el equipo');
  await expect(report).toContainText('67,50 / 100');
  await expect(report).toContainText('66,25 / 100');
  await expect(report).toContainText('46,25 / 100');
  await expect(report).toContainText('70,00');
  await expect(report).toContainText('30,00 puntos');
  await expect(report.locator('.report-scenario-result')).toHaveCount(3);
  expect(await report.locator('h1, h2, h3, h4').allTextContents()).toEqual(
    expect.arrayContaining([
      'Herramientas para el equipo',
      'Configuración',
      'Evaluaciones utilizadas',
      'Clasificación · escenario base',
    ]),
  );
  await expect(report.locator('table thead th[scope="col"]')).toHaveCount(4);
  await expect(report.locator('table tbody th[scope="row"]')).toHaveCount(4);
  await page.evaluate(() => {
    window.__printed = 0;
    window.print = () => {
      window.__printed++;
    };
  });
  await page.getByRole('button', { name: 'Imprimir / Guardar como PDF' }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  await page.emulateMedia({ media: 'print' });
  expect(
    await page
      .locator('.sidebar')
      .evaluate((element) => globalThis.getComputedStyle(element).display),
  ).toBe('none');
  expect(
    await page
      .locator('.report-actions')
      .evaluate((element) => globalThis.getComputedStyle(element).display),
  ).toBe('none');
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`/app/#/project/${id}/evaluation`);
  await page
    .locator('.evaluation-desktop')
    .getByLabel('Herramienta A · Facilidad de uso')
    .selectOption('5');
  await page.goto(`/app/#/project/${id}/report`);
  await expect(page.locator('.report-result').first()).not.toContainText('67,50 / 100');
});

test('un proyecto incompleto muestra pendientes y no inventa puntuaciones', async ({ page }) => {
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = page.url().split('#/project/')[1].split('/')[0];
  await page.goto(`/app/#/project/${id}/report`);
  await expect(page.getByRole('heading', { name: 'Informe pendiente' })).toBeVisible();
  await expect(page.locator('.report-result')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Revisar' }).first()).toBeVisible();
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`transferencia, vista previa e informe sin desbordamiento a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    const id = await example(page);
    await page.goto('/app/#/settings');
    const text = await page.evaluate(async () => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      const { serializeBackup } = await import('/src/data/backup-format.js');
      return serializeBackup(
        (await createProjectRepository().listProjects()).map((record) => record.project),
      );
    });
    await selectBackup(page, text);
    await expect(page.locator('#transfer-preview')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
    ).toBe(true);
    await page.goto(`/app/#/project/${id}/report`);
    await expect(page.locator('.report-result')).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= globalThis.innerWidth),
    ).toBe(true);
  });
}

test('transferencia e informe conservan lectura con texto al 200 %', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const id = await example(page);
  await page.goto('/app/#/settings');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const transferLayout = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('*')]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .slice(0, 20)
      .map((element) => [
        element.tagName,
        element.className,
        element.scrollWidth,
        element.clientWidth,
        globalThis.getComputedStyle(element).overflowX,
      ]),
  }));
  expect(transferLayout.scroll, JSON.stringify(transferLayout)).toBeLessThanOrEqual(
    transferLayout.width,
  );
  await page.goto(`/app/#/project/${id}/report`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const reportLayout = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('*')]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .slice(0, 20)
      .map((element) => [
        element.tagName,
        element.className,
        element.scrollWidth,
        element.clientWidth,
        globalThis.getComputedStyle(element).overflowX,
      ]),
  }));
  expect(reportLayout.scroll, JSON.stringify(reportLayout)).toBeLessThanOrEqual(reportLayout.width);
});
