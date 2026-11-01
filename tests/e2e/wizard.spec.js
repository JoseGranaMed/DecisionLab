import { expect, test } from '@playwright/test';

async function storedProject(page, id) {
  return page.evaluate(async (projectId) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    return (await createProjectRepository().getProject(projectId)).project;
  }, id);
}

const currentProjectId = (page) => page.url().split('#/project/')[1].split('/')[0];

test('configura alternativas, criterios y pesos; recupera el paso y los datos tras recargar', async ({
  page,
}) => {
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').fill('Elegir equipo');
  await page.getByLabel('Pregunta de decisión').fill('¿Qué opción conviene?');
  await page.locator('[data-wizard-next]').click();
  await expect(page.getByRole('heading', { name: 'Alternativas' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir alternativa' }).click();
  await page.getByRole('button', { name: 'Añadir alternativa' }).click();
  const alternatives = page.locator('.wizard-item');
  await alternatives.nth(0).getByLabel('Nombre').fill('Opción A');
  await alternatives.nth(1).getByLabel('Nombre').fill('Opción B');
  await alternatives.nth(0).getByLabel('Descripción').fill('Primera opción');
  await alternatives.nth(0).getByRole('button', { name: 'Bajar' }).click();
  await expect(alternatives.first().getByLabel('Nombre')).toHaveValue('Opción B');
  await page.locator('[data-wizard-next]').click();
  await expect(page.getByRole('heading', { name: 'Criterios' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const criteria = page.locator('.wizard-item');
  await criteria.nth(0).getByLabel('Nombre').fill('Facilidad');
  await criteria.nth(1).getByLabel('Nombre').fill('Costo');
  await criteria.nth(1).getByLabel('Tipo').selectOption('numeric');
  await criteria.nth(1).getByLabel('Unidad').fill('S/');
  await criteria.nth(1).getByLabel('Valor mínimo').fill('0');
  await criteria.nth(1).getByLabel('Valor máximo').fill('200');
  await criteria.nth(1).getByLabel('Sentido favorable').selectOption('lower');
  await page.locator('[data-wizard-next]').click();
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
  await page.locator('.wizard-item').nth(0).getByLabel('Peso').fill('3');
  await page.locator('.wizard-item').nth(1).getByLabel('Peso').fill('2');
  await expect(page.locator('[data-proportion]').nth(0)).toHaveText('60 %');
  await expect(page.locator('[data-proportion]').nth(1)).toHaveText('40 %');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const projectId = page.url().split('#/project/')[1].split('/')[0];
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
  await expect(page.locator('.wizard-item').nth(0).getByLabel('Peso')).toHaveValue('3');
  await page.goto(`/app/#/project/${projectId}`);
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page.locator('.wizard-item').nth(1).getByLabel('Valor máximo')).toHaveValue('200');
  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page.locator('.wizard-item').first().getByLabel('Nombre')).toHaveValue('Opción B');
});

test('eliminar elementos del ejemplo limpia evaluaciones y pesos relacionados', async ({
  page,
}) => {
  await page.goto('/app/#/example');
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Herramientas para el equipo');
  await page.locator('[data-wizard-next]').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').first().getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.locator('.wizard-item')).toHaveCount(2);
  await page.locator('[data-wizard-next]').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.wizard-item')
    .filter({ hasText: 'Costo mensual' })
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(page.locator('.wizard-item')).toHaveCount(3);
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const integrity = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const project = (await createProjectRepository().listProjects())[0].project;
    return {
      alternatives: project.alternatives.map((item) => item.id),
      criteria: project.criteria.map((item) => item.id),
      evaluations: project.evaluations.length,
      scenarioHasCost: Object.hasOwn(project.scenarios[0].weights, 'cost'),
    };
  });
  expect(integrity).toEqual({
    alternatives: ['b', 'c'],
    criteria: ['ease', 'integrations', 'support'],
    evaluations: 6,
    scenarioHasCost: false,
  });
});

test('un rango inválido no se guarda y se advierte antes de salir del paso', async ({ page }) => {
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const card = page.locator('.wizard-item').first();
  await card.getByLabel('Tipo').selectOption('numeric');
  await card.getByLabel('Valor mínimo').fill('100');
  await card.getByLabel('Valor máximo').fill('50');
  await expect(card.getByText('El límite superior debe superar al inferior')).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('[data-wizard-next]').click();
  await expect(page.getByRole('heading', { name: 'Criterios' })).toBeVisible();
  await card.getByLabel('Valor máximo').fill('200');
  await page.locator('[data-wizard-next]').click();
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
});

test('un valor inválido permanece visible si se intenta añadir otro criterio', async ({ page }) => {
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const card = page.locator('.wizard-item').first();
  await card.getByLabel('Tipo').selectOption('numeric');
  await card.getByLabel('Valor mínimo').fill('100');
  await card.getByLabel('Valor máximo').fill('50');
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  await expect(page.locator('.wizard-item')).toHaveCount(1);
  await expect(card.getByLabel('Valor máximo')).toHaveValue('50');
  await expect(page.getByText('Corrige los campos señalados antes de continuar.')).toBeVisible();
});

test('el asistente se puede usar con teclado y navegación móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="alternatives"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Alternativas' })).toBeVisible();
  const add = page.getByRole('button', { name: 'Añadir alternativa' });
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.wizard-item')).toHaveCount(1);
  await page.locator('.wizard-item').getByLabel('Nombre').fill('Opción móvil');
  await page.locator('[data-wizard-step="criteria"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Criterios' })).toBeVisible();
  await page.getByRole('link', { name: '← Anterior' }).click();
  await expect(page.locator('.wizard-item').getByLabel('Nombre')).toHaveValue('Opción móvil');
});

test('cancelar y aceptar el cambio de tipo conserva o elimina la configuración numérica en IndexedDB', async ({
  page,
}) => {
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const card = page.locator('.wizard-item').first();
  await card.getByLabel('Nombre').fill('Costo');
  await card.getByLabel('Tipo').selectOption('numeric');
  await card.getByLabel('Unidad').fill('S/');
  await card.getByLabel('Valor mínimo').fill('0');
  await card.getByLabel('Valor máximo').fill('200');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const id = currentProjectId(page);
  const before = (await storedProject(page, id)).criteria[0];
  expect(before).toMatchObject({ type: 'numeric', unit: 'S/', min: 0, max: 200 });

  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await card.getByLabel('Tipo').selectOption('rating');
  expect(message).toContain('unidad');
  await expect(card.getByLabel('Tipo')).toHaveValue('numeric');
  await expect(card.getByLabel('Unidad')).toHaveValue('S/');
  expect((await storedProject(page, id)).criteria[0]).toEqual(before);
  await page.reload();
  await expect(page.locator('.wizard-item').first().getByLabel('Tipo')).toHaveValue('numeric');
  await expect(page.locator('.wizard-item').first().getByLabel('Valor máximo')).toHaveValue('200');
  expect((await storedProject(page, id)).criteria[0]).toEqual(before);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').first().getByLabel('Tipo').selectOption('rating');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const after = (await storedProject(page, id)).criteria[0];
  expect(after.type).toBe('rating');
  expect(after).not.toHaveProperty('unit');
  expect(after).not.toHaveProperty('min');
  expect(after).not.toHaveProperty('max');
  expect(after).not.toHaveProperty('direction');
  await page.reload();
  await expect(page.locator('.wizard-item').first().getByLabel('Tipo')).toHaveValue('rating');
});

test('el cambio de tipo confirma y limpia evaluaciones asociadas', async ({ page }) => {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = currentProjectId(page);
  await page.locator('[data-wizard-step="criteria"]').click();
  const before = await storedProject(page, id);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .locator('.wizard-item')
    .filter({ hasText: 'Costo mensual' })
    .getByLabel('Tipo')
    .selectOption('rating');
  await expect(
    page.locator('.wizard-item').filter({ hasText: 'Costo mensual' }).getByLabel('Tipo'),
  ).toHaveValue('numeric');
  expect((await storedProject(page, id)).evaluations).toEqual(before.evaluations);
  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });
  await page
    .locator('.wizard-item')
    .filter({ hasText: 'Costo mensual' })
    .getByLabel('Tipo')
    .selectOption('rating');
  expect(message).toContain('3 evaluaciones');
  expect(message).toContain('unidad');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const project = await storedProject(page, id);
  expect(project.evaluations).toHaveLength(9);
  expect(project.evaluations.some(({ criterionId }) => criterionId === 'cost')).toBe(false);
  expect(project.criteria.find(({ id: criterionId }) => criterionId === 'cost').type).toBe(
    'rating',
  );
});

test('un sentido favorable personalizado también exige confirmación', async ({ page }) => {
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  const card = page.locator('.wizard-item').first();
  await card.getByLabel('Tipo').selectOption('numeric');
  await card.getByLabel('Sentido favorable').selectOption('lower');
  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await card.getByLabel('Tipo').selectOption('rating');
  expect(message).toContain('sentido favorable');
  await expect(card.getByLabel('Tipo')).toHaveValue('numeric');
  await expect(card.getByLabel('Sentido favorable')).toHaveValue('lower');
});

test('no confirma cambios de tipo sin datos relevantes que perder', async ({ page }) => {
  await page.goto('/app/#/new');
  await page.locator('[data-wizard-step="criteria"]').click();
  await page.getByRole('button', { name: 'Añadir criterio' }).click();
  let dialogs = 0;
  page.on('dialog', async (dialog) => {
    dialogs += 1;
    await dialog.dismiss();
  });
  await page.locator('.wizard-item').first().getByLabel('Tipo').selectOption('numeric');
  await page.locator('.wizard-item').first().getByLabel('Tipo').selectOption('rating');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  expect(dialogs).toBe(0);
  expect((await storedProject(page, currentProjectId(page))).criteria[0].type).toBe('rating');
});

test('peso vacío, suma cero, proporciones y peso negativo muestran estados coherentes y persisten', async ({
  page,
}) => {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = currentProjectId(page);
  await page.locator('[data-wizard-step="weights"]').click();
  await expect(page.locator('[data-proportion]').first()).toHaveText('37.5 %');
  const weights = page.locator('.wizard-item');
  await weights.first().getByLabel('Peso').fill('');
  await expect(page.locator('#wizard-summary')).toContainText('Completa el peso');
  await expect(page.locator('[data-proportion]').first()).toHaveText('—');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  expect((await storedProject(page, id)).criteria[0].weight).toBeUndefined();
  await page.reload();
  await expect(page.locator('.wizard-item').first().getByLabel('Peso')).toHaveValue('');
  await expect(page.locator('#wizard-summary')).toContainText('Completa el peso');

  await page.locator('.wizard-item').first().getByLabel('Peso').fill('3');
  await expect(page.locator('[data-proportion]').first()).toHaveText('37.5 %');
  for (const card of await page.locator('.wizard-item').all())
    await card.getByLabel('Peso').fill('0');
  await expect(page.locator('#wizard-summary')).toContainText('Asigna un peso positivo');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  expect((await storedProject(page, id)).criteria.map(({ weight }) => weight)).toEqual([
    0, 0, 0, 0,
  ]);
  await page.reload();
  await expect(page.locator('#wizard-summary')).toContainText('Asigna un peso positivo');

  await page.locator('.wizard-item').first().getByLabel('Peso').fill('-1');
  await expect(page.locator('.wizard-item').first().locator('.field-error')).toContainText(
    'negativo',
  );
  await expect(page.locator('#wizard-summary')).toContainText('negativo');
  await expect(page.locator('.wizard-item').first().getByLabel('Peso')).toHaveValue('-1');
  expect((await storedProject(page, id)).criteria[0].weight).toBe(0);
  await page.locator('.wizard-item').first().getByLabel('Peso').fill('3');
  await expect(page.locator('[data-proportion]').first()).toHaveText('100 %');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.locator('.wizard-item').first().getByLabel('Peso').focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('e');
  await expect(page.locator('.wizard-item').first().locator('.field-error')).toContainText(
    'número finito',
  );
  await expect(page.locator('#wizard-summary')).toContainText('número finito');
  expect((await storedProject(page, id)).criteria[0].weight).toBe(3);
});

for (const width of [320, 390, 768, 1440]) {
  test(`mensajes de criterios y pesos legibles sin desbordamiento a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/app/#/example');
    await page.getByLabel('Nombre del proyecto').waitFor();
    await page.locator('[data-wizard-step="criteria"]').click();
    await expect(page.getByRole('heading', { name: 'Criterios' })).toBeVisible();
    await page.locator('[data-wizard-step="weights"]').click();
    await page.locator('.wizard-item').first().getByLabel('Peso').fill('');
    await expect(page.locator('#wizard-summary')).toContainText('Completa el peso');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`pasos del asistente sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/app/#/new');
    await page.locator('[data-wizard-step="alternatives"]').click();
    await page.getByRole('button', { name: 'Añadir alternativa' }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('[data-wizard-step="criteria"]').click();
    await page.getByRole('button', { name: 'Añadir criterio' }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('[data-wizard-step="weights"]').click();
    await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
