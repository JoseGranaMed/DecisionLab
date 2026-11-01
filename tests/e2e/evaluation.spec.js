import { expect, test } from '@playwright/test';

const projectId = (page) => page.url().split('#/project/')[1].split('/')[0];
const visibleLayout = (page, width) =>
  page.locator(width <= 700 ? '.evaluation-mobile' : '.evaluation-desktop');

async function storedProject(page, id) {
  return page.evaluate(async (projectIdValue) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    return (await createProjectRepository().getProject(projectIdValue)).project;
  }, id);
}

test('un borrador incompleto conserva sus datos y señala los pasos pendientes', async ({
  page,
}) => {
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Mi decisión');
  const id = projectId(page);
  await page.goto(`/app/#/project/${id}/evaluation`);
  await expect(
    page.getByRole('heading', { name: 'Completa la configuración antes de evaluar' }),
  ).toBeVisible();
  await expect(page.getByText('Se necesitan al menos dos alternativas.')).toBeVisible();
  await expect(
    page.locator('.evaluation-gate-list a[href$="/alternatives"]').first(),
  ).toBeVisible();
  expect((await storedProject(page, id)).name).toBe('Mi decisión');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Completa la configuración antes de evaluar' }),
  ).toBeVisible();
});

test('el ejemplo oficial muestra doce respuestas reales y reproduce el motor 10A', async ({
  page,
}) => {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = projectId(page);
  await page.goto(`/app/#/project/${id}/evaluation`);
  await expect(page.getByText('12 de 12 evaluaciones completadas')).toBeVisible();
  const desktop = page.locator('.evaluation-desktop');
  await expect(desktop.getByLabel('Herramienta A · Facilidad de uso')).toHaveValue('4');
  await expect(desktop.getByLabel('Herramienta A · Costo mensual')).toHaveValue('100');
  await expect(desktop.getByLabel('Herramienta A · Integraciones')).toHaveValue('3');
  await expect(desktop.getByLabel('Herramienta A · Soporte disponible')).toHaveValue('4');
  expect((await storedProject(page, id)).evaluations).toHaveLength(12);
  const scores = await page.evaluate(async (projectIdValue) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { evaluateProject } = await import('/src/domain/evaluation.js');
    return evaluateProject(
      (await createProjectRepository().getProject(projectIdValue)).project,
    ).value.results.map(({ name, score }) => [name, score]);
  }, id);
  expect(scores).toEqual([
    ['Herramienta A', 67.5],
    ['Herramienta B', 66.25],
    ['Herramienta C', 46.25],
  ]);
});

test('crea, modifica, elimina y recupera respuestas con progreso real', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Elegir portátil');
  await page.getByLabel('Pregunta de decisión').fill('¿Cuál conviene?');
  const id = projectId(page);
  await page.locator('[data-wizard-step="alternatives"]').click();
  for (const name of ['Portátil A', 'Portátil B']) {
    await page.getByRole('button', { name: 'Añadir alternativa' }).click();
    await page.locator('.wizard-item').last().getByLabel('Nombre').fill(name);
  }
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  await page.locator('.wizard-item').last().getByLabel('Nombre').fill('Facilidad');
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const numeric = page.locator('.wizard-item').last();
  await numeric.getByLabel('Nombre').fill('Costo');
  await numeric.getByLabel('Tipo').selectOption('numeric');
  await numeric.getByLabel('Unidad').fill('S/');
  await numeric.getByLabel('Valor mínimo').fill('0');
  await numeric.getByLabel('Valor máximo').fill('200');
  await numeric.getByLabel('Sentido favorable').selectOption('lower');
  await page.locator('[data-wizard-step="evaluation"]').click();
  await expect(page.getByText('0 de 4 evaluaciones completadas')).toBeVisible();
  const mobile = page.locator('.evaluation-mobile');
  await mobile.getByLabel('Portátil A · Facilidad').selectOption('0');
  await mobile.getByLabel('Portátil A · Costo').fill('100,5');
  await mobile.getByLabel('Portátil B · Facilidad').selectOption('5');
  await mobile.getByLabel('Portátil B · Costo').fill('200');
  await expect(page.getByText('4 de 4 evaluaciones completadas')).toBeVisible();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  let saved = await storedProject(page, id);
  expect(saved.evaluations).toHaveLength(4);
  expect(
    saved.evaluations.find(
      ({ alternativeId, criterionId }) =>
        alternativeId === saved.alternatives[0].id && criterionId === saved.criteria[1].id,
    ).value,
  ).toBe(100.5);
  await page.reload();
  await expect(mobile.getByLabel('Portátil A · Facilidad')).toHaveValue('0');
  await expect(mobile.getByLabel('Portátil A · Costo')).toHaveValue('100.5');
  await mobile.getByLabel('Portátil A · Facilidad').selectOption('3');
  await mobile.getByLabel('Portátil B · Costo').fill('');
  await expect(page.getByText('3 de 4 evaluaciones completadas')).toBeVisible();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  saved = await storedProject(page, id);
  expect(saved.evaluations).toHaveLength(3);
  expect(
    saved.evaluations.find(
      ({ alternativeId, criterionId }) =>
        alternativeId === saved.alternatives[0].id && criterionId === saved.criteria[0].id,
    ).value,
  ).toBe(3);
  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
  await page.getByRole('link', { name: 'Siguiente →' }).click();
  await expect(mobile.getByLabel('Portátil B · Costo')).toHaveValue('');
});

test('valor inválido permanece visible sin contaminar IndexedDB y advierte al salir', async ({
  page,
}) => {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = projectId(page);
  await page.locator('[data-wizard-step="evaluation"]').click();
  const cost = page.locator('.evaluation-desktop').getByLabel('Herramienta A · Costo mensual');
  await cost.fill('250');
  await expect(cost).toHaveValue('250');
  await expect(
    page.locator('.evaluation-desktop .field-error').filter({ hasText: 'fuera del rango' }),
  ).toBeVisible();
  expect(
    (await storedProject(page, id)).evaluations.find(
      ({ alternativeId, criterionId }) => alternativeId === 'a' && criterionId === 'cost',
    ).value,
  ).toBe(100);
  await expect(page.getByText('11 de 12 evaluaciones completadas')).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page.getByRole('heading', { name: 'Evaluación' })).toBeVisible();
  await cost.fill('100.5');
  await expect(page.getByText('12 de 12 evaluaciones completadas')).toBeVisible();
});

test('los controles de la matriz admiten foco y edición con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  await page.locator('[data-wizard-step="evaluation"]').click();
  const matrix = page.getByRole('region', { name: /Matriz de evaluación/ });
  await matrix.focus();
  await expect(matrix).toBeFocused();
  const rating = page.locator('.evaluation-desktop').getByLabel('Herramienta A · Facilidad de uso');
  await rating.focus();
  await rating.press('End');
  await expect(rating).toHaveValue('5');
  const numeric = page.locator('.evaluation-desktop').getByLabel('Herramienta A · Costo mensual');
  await numeric.focus();
  await numeric.press('ControlOrMeta+A');
  await numeric.press('1');
  await numeric.press('0');
  await numeric.press('0');
  await expect(numeric).toHaveValue('100');
  await expect(page.getByText('12 de 12 evaluaciones completadas')).toBeVisible();
});

test('la evaluación móvil conserva lectura y edición con texto ampliado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  await page.locator('[data-wizard-step="evaluation"]').click();
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const mobile = page.locator('.evaluation-mobile');
  await expect(mobile.getByLabel('Herramienta A · Costo mensual')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await mobile.getByLabel('Herramienta A · Costo mensual').fill('100,5');
  await expect(page.getByText('12 de 12 evaluaciones completadas')).toBeVisible();
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`evaluación usable sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/app/#/example');
    await page.getByLabel('Nombre del proyecto').waitFor();
    await page.locator('[data-wizard-step="evaluation"]').click();
    await expect(page.getByRole('heading', { name: 'Evaluación' })).toBeVisible();
    const layout = visibleLayout(page, width);
    await expect(layout).toBeVisible();
    await expect(layout.getByLabel('Herramienta A · Facilidad de uso')).toHaveValue('4');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width > 700 && width < 1440) {
      expect(
        await page
          .locator('.evaluation-scroll')
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true);
    }
  });
}
