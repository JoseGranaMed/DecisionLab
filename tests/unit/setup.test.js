import { describe, expect, it } from 'vitest';
import {
  addAlternative,
  updateAlternative,
  removeAlternative,
  moveAlternative,
  addCriterion,
  updateCriterion,
  setCriterionType,
  removeCriterion,
  moveCriterion,
  validateSetup,
  weightProportions,
} from '../../src/domain/setup.js';
import { validateProject } from '../../src/domain/validation.js';
import { officialExample } from '../fixtures/official-example.js';

describe('configuración de comparación', () => {
  it('agrega, edita, reordena y elimina alternativas sin cambiar sus IDs ni dejar respuestas huérfanas', () => {
    const original = officialExample();
    const added = addAlternative(original, { id: 'd', name: 'Herramienta D' });
    expect(added.ok).toBe(true);
    expect(original.alternatives).toHaveLength(3);
    const renamed = updateAlternative(added.value, 'd', { name: 'Opción D' });
    const moved = moveAlternative(renamed.value, 'd', -1);
    expect(moved.value.alternatives.map((item) => [item.id, item.order])).toEqual([
      ['a', 0],
      ['b', 1],
      ['d', 2],
      ['c', 3],
    ]);
    const removed = removeAlternative(moved.value, 'a');
    expect(removed.value.evaluations.some((item) => item.alternativeId === 'a')).toBe(false);
    expect(removed.value.alternatives.map((item) => item.order)).toEqual([0, 1, 2]);
    expect(validateProject(removed.value, { mode: 'draft' }).ok).toBe(true);
    const fifth = addAlternative(added.value, { id: 'e' });
    expect(addAlternative(fifth.value, { id: 'f' }).errors[0].code).toBe('too-many-alternatives');
  });

  it('configura criterios, conserva orden por lista y limpia referencias relacionadas al eliminarlos', () => {
    const original = officialExample();
    const added = addCriterion(original, { id: 'reliability', type: 'numeric' });
    expect(added.value.scenarios[0].weights.reliability).toBe(0);
    const named = updateCriterion(added.value, 'reliability', {
      name: 'Fiabilidad',
      unit: '%',
      min: 0,
      max: 100,
      direction: 'higher',
      weight: 3,
    });
    expect(named.ok).toBe(true);
    const moved = moveCriterion(named.value, 'reliability', -1);
    expect(moved.value.criteria[3].id).toBe('reliability');
    const removed = removeCriterion(moved.value, 'cost');
    expect(removed.value.evaluations.some((item) => item.criterionId === 'cost')).toBe(false);
    expect(Object.hasOwn(removed.value.scenarios[0].weights, 'cost')).toBe(false);
    expect(original.criteria).toHaveLength(4);
    expect(validateProject(removed.value, { mode: 'draft' }).ok).toBe(true);
  });

  it('al cambiar de tipo elimina explícitamente respuestas incompatibles', () => {
    const original = officialExample();
    const changed = setCriterionType(original, 'cost', 'rating');
    expect(changed.ok).toBe(true);
    expect(changed.value.criteria.find((item) => item.id === 'cost')).toMatchObject({
      type: 'rating',
      weight: 2,
    });
    expect(changed.value.evaluations.some((item) => item.criterionId === 'cost')).toBe(false);
    expect(original.evaluations).toHaveLength(12);
  });

  it('reutiliza la validación de rangos y pesos; distingue borrador de configuración lista', () => {
    const project = officialExample();
    project.evaluations = [];
    expect(validateSetup(project).ok).toBe(true);
    expect(weightProportions(project).value.map((item) => item.proportion)).toEqual([
      0.375, 0.25, 0.25, 0.125,
    ]);
    const invalidRange = updateCriterion(project, 'cost', { min: 300 });
    expect(invalidRange.errors.some((error) => error.code === 'invalid-range')).toBe(true);
    const negative = updateCriterion(project, 'ease', { weight: -1 });
    expect(negative.errors.some((error) => error.code === 'negative-weight')).toBe(true);
    project.criteria.forEach((item) => {
      item.weight = 0;
    });
    expect(validateProject(project, { mode: 'draft' }).ok).toBe(true);
    expect(validateSetup(project).errors.some((error) => error.code === 'zero-weight-sum')).toBe(
      true,
    );
  });

  it('aplica los límites del MVP sin impedir guardar listas incompletas', () => {
    const project = officialExample();
    project.alternatives = project.alternatives.slice(0, 1);
    project.evaluations = [];
    project.criteria = project.criteria.slice(0, 1);
    project.scenarios = [];
    expect(validateProject(project, { mode: 'draft' }).ok).toBe(true);
    expect(validateSetup(project).errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['insufficient-alternatives', 'insufficient-criteria']),
    );
    const full = officialExample();
    for (const id of ['x1', 'x2', 'x3', 'x4']) {
      const result = addCriterion(full, { id });
      Object.assign(full, result.value);
    }
    expect(addCriterion(full, { id: 'x5' }).errors[0].code).toBe('too-many-criteria');
  });
});
