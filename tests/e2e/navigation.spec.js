import { expect, test } from '@playwright/test';

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`landing y espacio de trabajo sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Compara opciones según/ })).toBeVisible();
    await expect(page.getByText('67,50').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.goto('/app/#/dashboard');
    await expect(page.getByRole('heading', { name: 'Tus comparaciones' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('las rutas, la recarga y el historial conservan la vista', async ({ page }) => {
  await page.goto('/app/#/dashboard');
  await page.getByRole('link', { name: 'Mis comparaciones' }).click();
  await expect(page.getByRole('heading', { name: 'Mis comparaciones' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis comparaciones' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Tus comparaciones' })).toBeVisible();
  await page.goto('/app/#/ruta-inexistente');
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
});

test('el menú móvil responde a teclado y Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/#/dashboard');
  const menu = page.getByRole('button', { name: 'Abrir más opciones' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Escenarios' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Escenarios' })).toBeHidden();
});

test('landing y aplicación cargan estilos y recursos sin errores de JavaScript', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Compara opciones según/ })).toBeVisible();
  expect(
    await page.locator('body').evaluate((element) => window.getComputedStyle(element).fontFamily),
  ).toContain('Inter');
  await page.goto('/app/#/dashboard');
  await expect(page.getByRole('heading', { name: 'Tus comparaciones' })).toBeVisible();
  expect(
    await page
      .locator('.app-shell')
      .evaluate((element) => window.getComputedStyle(element).display),
  ).toBe('grid');
  expect(errors).toEqual([]);
});
