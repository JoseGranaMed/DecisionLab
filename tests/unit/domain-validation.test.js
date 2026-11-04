import { describe, expect, it } from 'vitest';
import { createDraftProject, validateProject } from '../../src/domain/index.js';
import { officialExample } from '../fixtures/official-example.js';
import { isValidIsoDate } from '../../src/domain/dates.js';

const codes = (result) => result.errors.map((error) => error.code);

describe('validación del modelo', () => {
  it('conserva un borrador incompleto y bloquea su cálculo', () => {
    const draft = createDraftProject({ id: 'draft-1', timestamp: '2026-10-31T00:00:00.000Z' });
    expect(validateProject(draft, { mode: 'draft' })).toEqual({ ok: true, errors: [] });
    expect(codes(validateProject(draft))).toEqual(
      expect.arrayContaining([
        'required',
        'insufficient-alternatives',
        'insufficient-criteria',
        'zero-weight-sum',
      ]),
    );
  });

  it('detecta identificadores, orden y evaluaciones duplicadas', () => {
    const project = officialExample();
    project.alternatives[1].id = 'a';
    project.alternatives[1].order = 0;
    project.evaluations.push({ alternativeId: 'a', criterionId: 'ease', value: 4 });
    const result = validateProject(project);
    expect(codes(result)).toEqual(
      expect.arrayContaining(['duplicate-id', 'duplicate-order', 'duplicate-evaluation']),
    );
    expect(result.errors.find((error) => error.code === 'duplicate-id').path).toBe(
      'alternatives[1].id',
    );
  });

  it('detecta referencias inválidas y respuestas faltantes con rutas de campo', () => {
    const project = officialExample();
    project.evaluations.pop();
    project.evaluations[0].alternativeId = 'missing';
    const result = validateProject(project);
    expect(codes(result)).toEqual(
      expect.arrayContaining(['invalid-reference', 'missing-evaluation']),
    );
    expect(result.errors.some((error) => error.path === 'evaluations.c.support')).toBe(true);
  });

  it('rechaza rangos, pesos, valores no finitos y respuestas fuera de rango', () => {
    const project = officialExample();
    project.criteria[1].min = 200;
    project.criteria[1].max = 0;
    project.criteria[0].weight = -1;
    project.evaluations[0].value = 2.5;
    project.evaluations[1].value = Infinity;
    const result = validateProject(project);
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        'invalid-range',
        'negative-weight',
        'rating-out-of-range',
        'invalid-number',
      ]),
    );
    project.criteria[1].min = 0;
    project.criteria[1].max = 200;
    project.evaluations[1].value = 201;
    expect(codes(validateProject(project))).toContain('numeric-out-of-range');
  });

  it('rechaza escenarios incompletos, referencias sobrantes y suma cero', () => {
    const project = officialExample();
    project.scenarios[0].weights = { ease: 0, cost: 0, integrations: 0, unknown: 1 };
    const result = validateProject(project);
    expect(codes(result)).toEqual(expect.arrayContaining(['missing-weight', 'invalid-reference']));
    project.scenarios[0].weights = { ease: 0, cost: 0, integrations: 0, support: 0 };
    expect(codes(validateProject(project))).toContain('zero-weight-sum');
    project.scenarios[0].weights = { ease: 1, cost: 1, integrations: 1, support: 1 };
    project.scenarios[0].evaluations = [];
    expect(codes(validateProject(project))).toContain('scenario-extra-field');
  });

  it('acepta el ejemplo oficial completo', () => {
    expect(validateProject(officialExample())).toEqual({ ok: true, errors: [] });
  });

  it('valida año bisiesto, día real, hora y formato ISO completo', () => {
    for (const value of [
      '2024-02-29T23:59:59.999Z',
      '2026-11-04T00:00:00.000Z',
      '2026-11-04T05:00:00-05:00',
    ])
      expect(isValidIsoDate(value)).toBe(true);
    for (const value of [
      '2026-02-29T00:00:00.000Z',
      '2026-02-31T00:00:00.000Z',
      '2026-13-01T00:00:00.000Z',
      '2026-11-04T24:00:00.000Z',
      '2026-11-04',
    ])
      expect(isValidIsoDate(value)).toBe(false);
  });
});
