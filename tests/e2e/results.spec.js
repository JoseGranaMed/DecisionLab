import { expect, test } from '@playwright/test';

const projectId = (page) => page.url().split('#/project/')[1].split('/')[0];

async function openExampleResults(page) {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = projectId(page);
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
  return id;
}

async function currentEngineScores(page, id) {
  return page.evaluate(async (projectIdValue) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { evaluateProject } = await import('/src/domain/evaluation.js');
    const project = (await createProjectRepository().getProject(projectIdValue)).project;
    return evaluateProject(project).value.results.map(({ name, score, rank }) => ({
      name,
      score,
      rank,
    }));
  }, id);
}

test('crea una comparación propia, completa respuestas y abre resultados reales', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Elegir una opción');
  await page.getByLabel('Pregunta de decisión').fill('¿Cuál se ajusta a mis prioridades?');
  const id = projectId(page);
  await page.locator('[data-wizard-step="alternatives"]').click();
  for (const name of ['Opción Norte', 'Opción Sur']) {
    await page.getByRole('button', { name: 'Añadir alternativa' }).click();
    await page.locator('.wizard-item').last().getByLabel('Nombre').fill(name);
  }
  await page.locator('[data-wizard-step="criteria"]').click();
  for (const name of ['Facilidad', 'Rapidez']) {
    await page.getByRole('button', { name: 'Añadir criterio' }).click();
    await page.locator('.wizard-item').last().getByLabel('Nombre').fill(name);
  }
  await page.locator('[data-wizard-step="evaluation"]').click();
  const mobile = page.locator('.evaluation-mobile');
  await mobile.getByLabel('Opción Norte · Facilidad').selectOption('5');
  await mobile.getByLabel('Opción Norte · Rapidez').selectOption('3');
  await mobile.getByLabel('Opción Sur · Facilidad').selectOption('2');
  await mobile.getByLabel('Opción Sur · Rapidez').selectOption('4');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.locator('.results-ranking-item').first()).toContainText('Opción Norte');
  await expect(page.locator('.results-ranking-item').first()).toContainText('80,00 / 100');
  await expect(page.locator('.results-ranking-item').nth(1)).toContainText('60,00 / 100');
  expect((await currentEngineScores(page, id)).map(({ score }) => score)).toEqual([80, 60]);
  await page.reload();
  await expect(page.locator('.results-ranking-item').first()).toContainText('80,00 / 100');
});

test('el ejemplo muestra clasificación, barras y desglose calculados por el motor', async ({
  page,
}) => {
  const id = await openExampleResults(page);
  await expect(page.getByText('Paso 6 de 6')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Herramientas para el equipo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('¿Cuál conviene para coordinar un proyecto académico?'),
  ).toBeVisible();
  const rows = page.locator('.results-ranking-item');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Herramienta A');
  await expect(rows.nth(0)).toContainText('67,50 / 100');
  await expect(rows.nth(1)).toContainText('Herramienta B');
  await expect(rows.nth(1)).toContainText('66,25 / 100');
  await expect(rows.nth(2)).toContainText('Herramienta C');
  await expect(rows.nth(2)).toContainText('46,25 / 100');
  expect((await currentEngineScores(page, id)).map(({ score }) => score)).toEqual([
    67.5, 66.25, 46.25,
  ]);
  const widths = await rows
    .locator('.results-bar')
    .evaluateAll((bars) => bars.map((bar) => Number.parseFloat(bar.style.width)));
  expect(widths).toEqual([67.5, 66.25, 46.25]);
  const firstBreakdown = page.locator('.results-breakdown').first();
  await expect(firstBreakdown).toHaveAttribute('open', '');
  const contributionPoints = await firstBreakdown
    .locator('.results-criterion .results-contribution-data > div:last-child dd')
    .allTextContents();
  expect(contributionPoints).toEqual([
    '30,00 puntos',
    '12,50 puntos',
    '15,00 puntos',
    '10,00 puntos',
  ]);
  await expect(firstBreakdown.getByText('37,50 %')).toBeVisible();
  await page.reload();
  await expect(rows.nth(0)).toContainText('67,50 / 100');
  await page.goto(`/app/#/project/${id}`);
  await expect(page.getByText('Paso 6 de 6')).toBeVisible();
});

test('actualiza resultados después de editar respuesta, peso, rango y nombre', async ({ page }) => {
  const id = await openExampleResults(page);
  await page.locator('[data-wizard-step="evaluation"]').click();
  await page
    .locator('.evaluation-desktop')
    .getByLabel('Herramienta A · Facilidad de uso')
    .selectOption('5');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.locator('.results-ranking-item').first()).toContainText('75,00 / 100');
  await page.locator('[data-wizard-step="weights"]').click();
  await page.locator('.wizard-item').first().getByLabel('Peso').fill('1');
  await page.locator('[data-wizard-step="results"]').click();
  let scores = await currentEngineScores(page, id);
  await expect(page.locator('.results-ranking-item').first()).toContainText(
    `${scores[0].score.toFixed(2).replace('.', ',')} / 100`,
  );
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.locator('.wizard-item').nth(1).getByLabel('Valor máximo').fill('400');
  await page.locator('[data-wizard-step="results"]').click();
  scores = await currentEngineScores(page, id);
  await expect(page.locator('.results-ranking-item').first()).toContainText(
    `${scores[0].score.toFixed(2).replace('.', ',')} / 100`,
  );
  await page.locator('[data-wizard-step="details"]').click();
  await page.getByLabel('Nombre del proyecto').fill('Nueva decisión');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.getByRole('heading', { name: 'Nueva decisión' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nueva decisión' })).toBeVisible();
});

test('respuestas pendientes y configuración incompleta nunca muestran una clasificación antigua', async ({
  page,
}) => {
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Borrador');
  const incompleteId = projectId(page);
  await page.goto(`/app/#/project/${incompleteId}/results`);
  await expect(page.getByRole('heading', { name: 'Resultados pendientes' })).toBeVisible();
  await expect(page.getByText('Se necesitan al menos dos alternativas.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toHaveCount(0);

  await openExampleResults(page);
  await page.locator('[data-wizard-step="evaluation"]').click();
  await page
    .locator('.evaluation-desktop')
    .getByLabel('Herramienta C · Soporte disponible')
    .selectOption('');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.getByText('Falta 1 evaluación para calcular los resultados')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Completar evaluación →' }).click();
  await page
    .locator('.evaluation-desktop')
    .getByLabel('Herramienta C · Soporte disponible')
    .selectOption('0');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
});

test('elimina referencias y recalcula o muestra configuración pendiente', async ({ page }) => {
  await openExampleResults(page);
  await page.locator('[data-wizard-step="alternatives"]').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').nth(1).getByRole('button', { name: 'Eliminar' }).click();
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.locator('.results-ranking-item')).toHaveCount(2);
  await page.locator('[data-wizard-step="criteria"]').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').last().getByRole('button', { name: 'Eliminar' }).click();
  await page.locator('[data-wizard-step="results"]').click();
  await expect(
    page.locator('.results-breakdown').first().locator('.results-criterion'),
  ).toHaveCount(3);
  await page.locator('[data-wizard-step="alternatives"]').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').last().getByRole('button', { name: 'Eliminar' }).click();
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.getByRole('heading', { name: 'Resultados pendientes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toHaveCount(0);
});

test('identifica empates reales y aparentes sin clasificar por cifras redondeadas', async ({
  page,
}) => {
  await openExampleResults(page);
  await page.locator('[data-wizard-step="evaluation"]').click();
  const desktop = page.locator('.evaluation-desktop');
  await desktop.getByLabel('Herramienta B · Facilidad de uso').selectOption('4');
  await desktop.getByLabel('Herramienta B · Costo mensual').fill('100');
  await desktop.getByLabel('Herramienta B · Integraciones').selectOption('3');
  await desktop.getByLabel('Herramienta B · Soporte disponible').selectOption('4');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(
    page.getByRole('heading', {
      name: 'Herramienta A y Herramienta B comparten la primera posición',
    }),
  ).toBeVisible();
  await expect(page.locator('.results-rank').nth(0)).toHaveText('1.');
  await expect(page.locator('.results-rank').nth(1)).toHaveText('1.');
  await page.locator('[data-wizard-step="evaluation"]').click();
  await desktop.getByLabel('Herramienta B · Costo mensual').fill('100.01');
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.locator('.results-rank').nth(1)).toHaveText('2.');
  await expect(page.locator('.results-ranking-item').nth(0)).toContainText('67,50 / 100');
  await expect(page.locator('.results-ranking-item').nth(1)).toContainText('67,50 / 100');
  await expect(page.getByText('los valores completos son distintos')).toBeVisible();
});

test('la ruta global selecciona proyectos guardados y no crea el ejemplo', async ({ page }) => {
  await page.goto('/app/#/results');
  await expect(page.getByText('Todavía no hay comparaciones guardadas.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.results-index-item')).toHaveCount(0);
  const id = await openExampleResults(page);
  await page.goto('/app/#/results');
  await expect(page.locator('.results-index-item')).toHaveCount(1);
  await page.getByRole('link', { name: 'Ver resultados →' }).click();
  expect(page.url()).toContain(`#/project/${id}/results`);
});

test('nombres introducidos se muestran como texto y admiten saltos en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openExampleResults(page);
  await page.locator('[data-wizard-step="alternatives"]').click();
  const name = `Opción ${'MuyLarga'.repeat(18)} <img src=x onerror="window.__injected=1">`;
  await page.locator('.wizard-item').first().getByLabel('Nombre').fill(name);
  await page.locator('[data-wizard-step="results"]').click();
  await expect(page.locator('.results-ranking-item').first().locator('.results-name')).toHaveText(
    name,
  );
  expect(await page.locator('.results-workspace img').count()).toBe(0);
  expect(await page.evaluate(() => window.__injected)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`resultados legibles sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await openExampleResults(page);
    await expect(page.locator('.results-ranking-item')).toHaveCount(3);
    await expect(page.locator('.results-breakdown').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width <= 390) {
      await page.locator('.results-breakdown').nth(1).locator('summary').click();
      await expect(
        page.locator('.results-breakdown').nth(1).locator('.results-criterion'),
      ).toHaveCount(4);
    }
  });
}

test('el desglose móvil admite teclado y texto ampliado al 200 %', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openExampleResults(page);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const second = page.locator('.results-breakdown').nth(1);
  await second.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
