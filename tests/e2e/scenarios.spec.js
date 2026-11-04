import { expect, test } from '@playwright/test';

const projectId = (page) => page.url().split('#/project/')[1].split('/')[0];
async function example(page) {
  await page.goto('/app/#/example');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const id = projectId(page);
  await page.goto(`/app/#/project/${id}/results`);
  await page.getByRole('heading', { name: 'Clasificación' }).waitFor();
  await page.getByRole('link', { name: 'Comparar escenarios' }).click();
  await page.getByLabel('Nombre del escenario').waitFor();
  return id;
}

test('ejemplo oficial: motor, edición, guardado, recarga, restablecimiento y eliminación', async ({
  page,
}) => {
  const id = await example(page);
  const rows = page.locator('.scenarios-result');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Herramienta A');
  await expect(rows.nth(0)).toContainText('67,50 / 100');
  await expect(rows.nth(0)).toContainText('60,00 / 100');
  await expect(rows.nth(0)).toContainText('1.º → 2.º');
  await expect(rows.nth(1)).toContainText('66,25 / 100');
  await expect(rows.nth(1)).toContainText('70,00 / 100');
  await expect(rows.nth(1)).toContainText('2.º → 1.º');
  await rows.first().getByText('Ver aportes por criterio').click();
  await expect(rows.first().locator('.scenarios-contributions li')).toHaveCount(4);
  await page.getByLabel('Nombre del escenario').fill('Costo y soporte');
  await page.getByLabel('Peso alternativo · Soporte disponible').fill('2');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  const expected = await page.evaluate(async (projectIdValue) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { compareScenarios } = await import('/src/domain/scenarios.js');
    const project = (await createProjectRepository().getProject(projectIdValue)).project;
    return {
      name: project.scenarios[0].name,
      weight: project.scenarios[0].weights.support,
      score: compareScenarios(project, project.scenarios[0].id).value.changes[0].alternateScore,
    };
  }, id);
  expect(expected.name).toBe('Costo y soporte');
  expect(expected.weight).toBe(2);
  await page.reload();
  await expect(page.getByLabel('Nombre del escenario')).toHaveValue('Costo y soporte');
  await expect(page.getByLabel('Peso alternativo · Soporte disponible')).toHaveValue('2');
  await expect(page.locator('.scenarios-result').first()).toContainText(
    expected.score.toFixed(2).replace('.', ','),
  );
  expect(
    await page.evaluate(async (projectIdValue) => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      return (await createProjectRepository().getProject(projectIdValue)).project.workflowStep;
    }, id),
  ).toBe('results');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restablecer pesos' }).click();
  await expect(page.getByLabel('Peso alternativo · Facilidad de uso')).toHaveValue('3');
  await expect(page.locator('.scenarios-result').first()).toContainText('67,50 / 100');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar escenario' }).click();
  await expect(
    page.getByRole('heading', { name: 'Todavía no hay escenario alternativo' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Crear escenario' }).click();
  await expect(page.getByLabel('Peso alternativo · Facilidad de uso')).toHaveValue('3');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect
    .poll(() =>
      page.evaluate(async (projectIdValue) => {
        const { createProjectRepository } = await import('/src/data/project-repository.js');
        const record = await createProjectRepository().getProject(projectIdValue);
        return record.project.scenarios[0]?.name;
      }, id),
    )
    .toBe('Nuevo escenario');
  await page.reload();
  await expect(page.getByLabel('Nombre del escenario')).toHaveValue('Nuevo escenario');
  await page.goto(`/app/#/project/${id}/results`);
  await expect(page.locator('.results-ranking-item').first()).toContainText('67,50 / 100');
});

test('el formulario retiene valores incompletos, protege la última versión válida y advierte al salir', async ({
  page,
}) => {
  const id = await example(page);
  const input = page.getByLabel('Peso alternativo · Costo mensual');
  await input.fill('');
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Introduce un peso; cero es válido.')).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Volver a resultados' }).click();
  await expect(input).toHaveValue('');
  const stored = await page.evaluate(async (projectIdValue) => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    return (await createProjectRepository().getProject(projectIdValue)).project.scenarios[0].weights
      .cost;
  }, id);
  expect(stored).toBe(4);
  await input.fill('0');
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue('0');
});

test('muestra fallo de guardado y permite reintentar', async ({ page }) => {
  await example(page);
  await page.evaluate(() => {
    window.__originalPut = window.IDBObjectStore.prototype.put;
    window.IDBObjectStore.prototype.put = function () {
      throw new window.DOMException('Sin espacio', 'QuotaExceededError');
    };
  });
  await page.getByLabel('Nombre del escenario').fill('Cambio sin guardar');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(
    page.getByText('No se pudo guardar. Tus cambios siguen abiertos en esta pestaña.'),
  ).toBeVisible();
  await page.evaluate(() => {
    window.IDBObjectStore.prototype.put = window.__originalPut;
  });
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
});

test('al eliminar un criterio con todo el peso alternativo, los resultados base siguen accesibles', async ({
  page,
}) => {
  const id = await example(page);
  for (const [criterion, weight] of [
    ['Facilidad de uso', '1'],
    ['Costo mensual', '0'],
    ['Integraciones', '0'],
    ['Soporte disponible', '0'],
  ])
    await page.getByLabel(`Peso alternativo · ${criterion}`).fill(weight);
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await page.goto(`/app/#/project/${id}/criteria`);
  await page.getByRole('heading', { name: '01 · Facilidad de uso' }).waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.wizard-item').first().getByRole('button', { name: 'Eliminar' }).click();
  await page.goto(`/app/#/project/${id}/results`);
  await expect(page.getByRole('heading', { name: 'Clasificación' })).toBeVisible();
  await page.getByRole('link', { name: 'Comparar escenarios' }).click();
  await expect(page.getByText('La suma de pesos debe ser positiva y finita.')).toBeVisible();
  await page.getByLabel('Peso alternativo · Costo mensual').fill('2');
  await expect(page.getByRole('heading', { name: 'Qué cambió en la clasificación' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await page.reload();
  await expect(page.getByLabel('Peso alternativo · Costo mensual')).toHaveValue('2');
});

test('el nombre del escenario se muestra como texto seguro', async ({ page }) => {
  await example(page);
  const name = '<img src=x onerror=alert(1)>';
  await page.getByLabel('Nombre del escenario').fill(name);
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.locator('.scenarios-chart-row').nth(1)).toContainText(name);
  expect(await page.locator('.scenarios-workspace img').count()).toBe(0);
});

test('el menú móvil abre el selector de escenarios con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await example(page);
  const menu = page.getByRole('button', { name: 'Abrir más opciones' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.locator('#mobile-menu').getByRole('link', { name: 'Escenarios' }).click();
  await expect(page.getByRole('heading', { name: 'Escenarios' })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir escenarios' }).click();
  await expect(page).toHaveURL(new RegExp(`project/${id}/scenarios`));
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`escenarios y navegación sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const id = await example(page);
    await page.getByLabel('Peso alternativo · Facilidad de uso').fill('1');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/app/#/scenarios');
    await expect(page.getByRole('link', { name: 'Abrir escenarios' })).toBeVisible();
    await page.getByRole('link', { name: 'Abrir escenarios' }).click();
    await expect(page).toHaveURL(new RegExp(`project/${id}/scenarios`));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('teclado y texto ampliado conservan controles legibles', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await example(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const input = page.getByLabel('Peso alternativo · Facilidad de uso');
  await input.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('2');
  await expect(input).toHaveValue('2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
