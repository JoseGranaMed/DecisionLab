import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('un conflicto entre pestañas conserva la primera versión y permite descargar la edición pendiente', async ({
  page,
  context,
}) => {
  await page.goto('/app/#/new');
  await page.getByLabel('Nombre del proyecto').waitFor();
  const url = page.url();
  const second = await context.newPage();
  try {
    await second.goto(url);
    await second.getByLabel('Nombre del proyecto').waitFor();
    await page.getByLabel('Nombre del proyecto').fill('Primera pestaña');
    await page.getByRole('button', { name: 'Guardar ahora' }).click();
    await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
    await second.getByLabel('Nombre del proyecto').fill('Segunda pestaña');
    await second.getByRole('button', { name: 'Guardar ahora' }).click();
    await expect(second.locator('#save-error')).toContainText('Tus cambios aquí no se guardaron');
    await expect(second.locator('#save-error')).not.toContainText('Guardar ahora');
    await expect(second.getByRole('button', { name: 'Guardar ahora' })).toBeDisabled();
    await second.setViewportSize({ width: 320, height: 850 });
    await second.screenshot({ path: 'docs/evidence-11B/conflict-320.png', fullPage: true });
    const downloading = second.waitForEvent('download');
    await second.getByRole('button', { name: 'Descargar copia de mis cambios' }).click();
    const copy = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
    expect(copy.projects[0].name).toBe('Segunda pestaña');
    const saved = await page.evaluate(async () => {
      const { createProjectRepository } = await import('/src/data/project-repository.js');
      return (await createProjectRepository().listProjects())[0].project.name;
    });
    expect(saved).toBe('Primera pestaña');
  } finally {
    await second.close();
  }
});

test('crear, editar, recuperar, buscar, duplicar y eliminar un borrador real', async ({ page }) => {
  await page.goto('/app/#/comparisons');
  await expect(page.getByText('Todavía no tienes proyectos.')).toBeVisible();
  await page.locator('.page-title').getByRole('link', { name: 'Nueva comparación' }).click();
  await expect(page.getByRole('heading', { name: 'Datos de la comparación' })).toBeVisible();
  const originalUrl = page.url();
  await page.getByLabel('Nombre del proyecto').fill('Elegir portátil');
  await page.getByLabel('Pregunta de decisión').fill('¿Cuál conviene para estudiar?');
  await page.getByLabel('Descripción').fill('Presupuesto limitado');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Elegir portátil');
  await expect(page.getByLabel('Pregunta de decisión')).toHaveValue(
    '¿Cuál conviene para estudiar?',
  );
  await expect(page.getByLabel('Descripción')).toHaveValue('Presupuesto limitado');
  await page.getByLabel('Nombre del proyecto').fill('Elegir portátil nuevo');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.getByRole('link', { name: 'Mis comparaciones' }).last().click();
  await expect(page.locator('.saved-project')).toHaveCount(1);
  await expect(page.locator('.saved-project')).toContainText('Borrador');
  await page.getByLabel('Buscar por nombre').fill('sin coincidencia');
  await expect(page.getByText('No hay proyectos con ese nombre.')).toBeVisible();
  await page.getByLabel('Buscar por nombre').fill('portátil nuevo');
  await expect(page.locator('.saved-project')).toHaveCount(1);
  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Elegir portátil nuevo (copia)');
  expect(page.url()).not.toBe(originalUrl);
  await page.getByRole('link', { name: 'Mis comparaciones' }).last().click();
  await expect(page.locator('.saved-project')).toHaveCount(2);
  await expect(page.locator('.saved-project h2').first()).toHaveText(
    'Elegir portátil nuevo (copia)',
  );
  await page.getByLabel('Ordenar').selectOption('oldest');
  await expect(page.locator('.saved-project h2').first()).toHaveText('Elegir portátil nuevo');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.saved-project')
    .filter({ hasText: '(copia)' })
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(page.locator('.saved-project')).toHaveCount(1);
  await page.goto(originalUrl);
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Elegir portátil nuevo');
});

test('el ejemplo se copia solo tras la acción y conserva sus datos al recargar', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Abrir un ejemplo' }).click();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Herramientas para el equipo');
  const count = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const records = await createProjectRepository().listProjects();
    return [
      records.length,
      records[0].project.alternatives.length,
      records[0].project.criteria.length,
      records[0].project.evaluations.length,
    ];
  });
  expect(count).toEqual([1, 3, 4, 12]);
  await page.reload();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Herramientas para el equipo');
  await page.goto('/app/#/comparisons');
  await expect(page.locator('.saved-project')).toHaveCount(1);
});

test('el repositorio protege revisiones, copias y referencias en IndexedDB', async ({ page }) => {
  await page.goto('/app/#/dashboard');
  const result = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const repository = createProjectRepository({
      databaseName: `decisionlab-test-${window.crypto.randomUUID()}`,
    });
    const created = await repository.createProject({ name: 'Borrador', question: '¿Qué elegir?' });
    const recovered = await repository.getProject(created.id);
    const changed = structuredClone(recovered.project);
    changed.name = 'Borrador editado';
    const updated = await repository.updateProject(changed, recovered.revision);
    let conflict;
    try {
      await repository.updateProject(changed, recovered.revision);
    } catch (error) {
      conflict = error.code;
    }
    const broken = structuredClone(updated.project);
    broken.evaluations = [{ alternativeId: 'ghost', criterionId: 'missing', value: 3 }];
    let invalid;
    try {
      await repository.updateProject(broken, updated.revision);
    } catch (error) {
      invalid = error.code;
    }
    const copy = await repository.duplicateProject(created.id);
    const copyIndependent =
      copy.id !== created.id &&
      copy.project.createdAt !== undefined &&
      copy.project.name.includes('(copia)');
    const beforeDelete = (await repository.listProjects()).length;
    const deleted = await repository.deleteProject(created.id, updated.revision);
    const missing = await repository.getProject(created.id);
    return {
      recovered: recovered.project.name,
      updated: updated.project.name,
      conflict,
      invalid,
      copyIndependent,
      beforeDelete,
      deleted,
      missing,
    };
  });
  expect(result).toEqual({
    recovered: 'Borrador',
    updated: 'Borrador editado',
    conflict: 'conflict',
    invalid: 'invalid-project',
    copyIndependent: true,
    beforeDelete: 2,
    deleted: true,
    missing: null,
  });
});

test('duplicar el ejemplo conserva referencias y deja el original independiente', async ({
  page,
}) => {
  await page.goto('/app/#/dashboard');
  const result = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const { officialExampleProject } = await import('/src/shared/demo/official-project.js');
    const repository = createProjectRepository({
      databaseName: `decisionlab-test-${window.crypto.randomUUID()}`,
    });
    const original = await repository.createProject({ template: officialExampleProject() });
    const copy = await repository.duplicateProject(original.id);
    copy.project.name = 'Copia modificada';
    copy.project.evaluations[0].value = 1;
    await repository.updateProject(copy.project, copy.revision);
    const recovered = await repository.getProject(original.id);
    return {
      unique: copy.id !== original.id,
      valid: copy.project.evaluations.every(
        (answer) =>
          copy.project.alternatives.some((item) => item.id === answer.alternativeId) &&
          copy.project.criteria.some((item) => item.id === answer.criterionId),
      ),
      originalName: recovered.project.name,
      originalAnswer: recovered.project.evaluations[0].value,
    };
  });
  expect(result).toEqual({
    unique: true,
    valid: true,
    originalName: 'Herramientas para el equipo',
    originalAnswer: 4,
  });
});

test('rechaza versiones de datos incompatibles sin sobrescribirlas', async ({ page }) => {
  await page.goto('/app/#/dashboard');
  const codes = await page.evaluate(async () => {
    const { createProjectRepository } = await import('/src/data/project-repository.js');
    const name = `decisionlab-test-${window.crypto.randomUUID()}`;
    const repository = createProjectRepository({ databaseName: name });
    const created = await repository.createProject({ name: 'Conservar' });
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = database.transaction('projects', 'readwrite');
      tx.objectStore('projects').put({
        ...created,
        project: { ...created.project, schemaVersion: 2 },
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    database.close();
    let schema;
    try {
      await repository.getProject(created.id);
    } catch (error) {
      schema = error.code;
    }
    const newer = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    newer.close();
    let databaseVersion;
    try {
      await repository.listProjects();
    } catch (error) {
      databaseVersion = error.code;
    }
    return { schema, databaseVersion };
  });
  expect(codes).toEqual({ schema: 'schema-incompatible', databaseVersion: 'version-incompatible' });
});

test('muestra proyecto inexistente y permite volver a la lista', async ({ page }) => {
  await page.goto('/app/#/project/no-existe');
  await expect(page.getByRole('heading', { name: 'Proyecto no encontrado' })).toBeVisible();
  await page.getByRole('link', { name: 'Mis comparaciones' }).last().click();
  await expect(page.getByRole('heading', { name: 'Mis comparaciones' })).toBeVisible();
});

test('dashboard y validación de datos generales usan proyectos reales', async ({ page }) => {
  await page.goto('/app/#/dashboard');
  await expect(page.getByRole('heading', { name: 'Todavía no hay comparaciones' })).toBeVisible();
  await page.getByRole('link', { name: 'Nueva comparación' }).last().click();
  await expect(page.getByLabel('Nombre del proyecto')).toBeVisible();
  await page.getByLabel('Nombre del proyecto').focus();
  await page.getByLabel('Pregunta de decisión').focus();
  await expect(page.getByText('Añade un nombre para identificar el proyecto.')).toBeVisible();
  await page.getByLabel('Nombre del proyecto').fill('Proyecto real');
  await page.getByLabel('Pregunta de decisión').fill('¿Qué elegir?');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.goto('/app/#/dashboard');
  await expect(page.getByText('1 proyecto guardado · 1 borrador')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proyecto real' })).toBeVisible();
});

test('las acciones principales de proyectos funcionan con teclado', async ({ page }) => {
  await page.goto('/app/#/comparisons');
  const create = page.locator('.page-title').getByRole('link', { name: 'Nueva comparación' });
  await create.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nombre del proyecto')).toBeVisible();
  await page.getByLabel('Nombre del proyecto').focus();
  await page.keyboard.type('Proyecto con teclado');
  await page.getByRole('button', { name: 'Guardar ahora' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.getByRole('link', { name: 'Mis comparaciones' }).last().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.saved-project')).toHaveCount(1);
  await page.getByRole('button', { name: 'Duplicar' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Proyecto con teclado (copia)');
});

test('los textos de usuario se muestran como texto y no como HTML', async ({ page }) => {
  await page.goto('/app/#/new');
  const supplied = '<img src=x onerror=alert(1)>';
  await page.getByLabel('Nombre del proyecto').fill(supplied);
  await page.getByLabel('Pregunta de decisión').fill('¿Es seguro?');
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.goto('/app/#/comparisons');
  await expect(page.locator('.saved-project h2')).toHaveText(supplied);
  await expect(page.locator('.saved-project img')).toHaveCount(0);
});

test('un error al guardar conserva la edición y deja reintentar', async ({ page }) => {
  await page.goto('/app/#/new');
  await expect(page.getByLabel('Nombre del proyecto')).toBeVisible();
  await page.evaluate(() => {
    const original = window.IDBObjectStore.prototype.put;
    let failed = false;
    window.IDBObjectStore.prototype.put = function (...args) {
      if (!failed) {
        failed = true;
        throw new window.DOMException('Sin espacio', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.getByLabel('Nombre del proyecto').fill('Conservar edición');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(
    page.getByText('No se pudo guardar. Tus cambios siguen abiertos en esta pestaña.'),
  ).toBeVisible();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Conservar edición');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('Conservar edición');
});

test('advierte antes de salir de una edición que no pudo guardarse', async ({ page }) => {
  await page.goto('/app/#/new');
  await expect(page.getByLabel('Nombre del proyecto')).toBeVisible();
  await page.evaluate(() => {
    window.__originalPut = window.IDBObjectStore.prototype.put;
    window.IDBObjectStore.prototype.put = function () {
      throw new window.DOMException('Sin espacio', 'QuotaExceededError');
    };
  });
  await page.getByLabel('Nombre del proyecto').fill('No perder');
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(
    page.getByText('No se pudo guardar. Tus cambios siguen abiertos en esta pestaña.'),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Mis comparaciones' }).last().click();
  await expect(page.getByLabel('Nombre del proyecto')).toHaveValue('No perder');
  await page.evaluate(() => {
    window.IDBObjectStore.prototype.put = window.__originalPut;
  });
  await page.getByRole('button', { name: 'Guardar ahora' }).click();
  await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`lista y editor sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/app/#/new');
    await expect(page.getByLabel('Nombre del proyecto')).toBeVisible();
    await page.getByLabel('Nombre del proyecto').fill(`Proyecto ${width}`);
    await page.getByLabel('Pregunta de decisión').fill('¿Qué opción elegir?');
    await expect(page.getByText('Guardado en este navegador.')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.goto('/app/#/comparisons');
    await expect(page.locator('.saved-project')).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('muestra error visible si IndexedDB no está disponible', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  await page.goto('/app/#/comparisons');
  await expect(
    page.getByRole('heading', { name: 'No se pudieron cargar tus proyectos' }),
  ).toBeVisible();
  await expect(page.getByText('IndexedDB no está disponible')).toBeVisible();
});
