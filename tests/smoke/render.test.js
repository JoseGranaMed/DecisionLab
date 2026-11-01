import assert from 'node:assert/strict';
import test from 'node:test';
import { appShell } from '../../src/shared/components/app-shell.js';
import { renderDashboard } from '../../src/features/dashboard/dashboard.js';
import { renderDemoView } from '../../src/features/demo/demo-views.js';

test('el shell conserva los destinos y elementos de navegación', () => {
  const html = appShell();
  for (const route of ['dashboard', 'comparisons', 'new', 'settings']) {
    assert.ok(html.includes(`href="#/${route}"`));
  }
  assert.ok(html.includes('aria-label="Navegación móvil"'));
});

test('la primera pantalla y la ruta desconocida tienen salida explícita', () => {
  assert.ok(renderDashboard().includes('Tus comparaciones'));
  assert.ok(renderDemoView('not-found').includes('Página no encontrada'));
});
