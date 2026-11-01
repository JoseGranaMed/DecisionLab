import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute } from '../../src/app/router.js';

test('la ruta vacía abre el resumen y las rutas conocidas son estables', () => {
  assert.equal(parseRoute(''), 'dashboard');
  assert.equal(parseRoute('#/dashboard'), 'dashboard');
  assert.equal(parseRoute('#/comparisons'), 'comparisons');
  assert.equal(parseRoute('#/project/abc-123'), 'project');
  for (const step of ['details', 'alternatives', 'criteria', 'weights', 'evaluation', 'results'])
    assert.equal(parseRoute(`#/project/abc-123/${step}`), 'project');
  assert.equal(parseRoute('#/new'), 'new');
  assert.equal(parseRoute('#/example'), 'example');
  assert.equal(parseRoute('#/results'), 'results');
  assert.equal(parseRoute('#/scenarios'), 'scenarios');
  assert.equal(parseRoute('#/project/abc-123/scenarios'), 'project-scenarios');
});

test('una ruta inexistente no abre otra vista por accidente', () => {
  assert.equal(parseRoute('#/no-existe'), 'not-found');
  assert.equal(parseRoute('#/results/extra'), 'not-found');
  assert.equal(parseRoute('#/project/abc-123/unknown'), 'not-found');
});
