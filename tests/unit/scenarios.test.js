import { describe, expect, it } from 'vitest';
import { officialExample } from '../fixtures/official-example.js';
import {
  createScenario,
  updateScenario,
  resetScenarioWeights,
  removeScenario,
} from '../../src/domain/scenario-operations.js';
import { compareScenarios } from '../../src/domain/scenarios.js';
import { evaluateProject, compareScores } from '../../src/domain/evaluation.js';
import { addCriterion, removeCriterion } from '../../src/domain/setup.js';
import { validateProject } from '../../src/domain/validation.js';

const original = () => {
  const project = officialExample();
  project.scenarios = [];
  return project;
};

describe('escenario alternativo', () => {
  it('crea una única copia editable de los pesos base con ID estable, sin cambiar el original', () => {
    const base = original();
    const result = createScenario(base, { id: 'alt-1' });
    expect(result.ok).toBe(true);
    expect(result.value.scenarios[0]).toEqual({
      id: 'alt-1',
      name: 'Nuevo escenario',
      weights: { ease: 3, cost: 2, integrations: 2, support: 1 },
    });
    expect(base.scenarios).toEqual([]);
    expect(base.criteria[0].weight).toBe(3);
    expect(createScenario(result.value, { id: 'alt-2' }).errors[0].code).toBe('scenario-limit');
  });

  it('edita nombre y pesos juntos, acepta cero y rechaza entradas inválidas sin mutar', () => {
    const base = original();
    const created = createScenario(base, { id: 'alt-1' }).value;
    const weights = { ease: 0, cost: 4, integrations: 2, support: 1 };
    const updated = updateScenario(created, 'alt-1', { name: 'Costo prioritario', weights });
    expect(updated.ok).toBe(true);
    expect(updated.value.scenarios[0].weights.ease).toBe(0);
    expect(created.scenarios[0].weights.ease).toBe(3);
    expect(updated.value.criteria).toEqual(base.criteria);
    for (const invalid of [
      { ...weights, ease: undefined },
      { ...weights, ease: -1 },
      { ...weights, ease: Number.NaN },
      { ease: 0, cost: 0, integrations: 0, support: 0 },
      { ease: 1 },
    ]) {
      expect(updateScenario(updated.value, 'alt-1', { name: 'Otro', weights: invalid }).ok).toBe(
        false,
      );
      expect(updated.value.scenarios[0].name).toBe('Costo prioritario');
    }
    expect(updateScenario(updated.value, 'alt-1', { name: ' ', weights }).ok).toBe(false);
  });

  it('calcula el ejemplo oficial y los cambios de puesto desde el motor', () => {
    const project = officialExample();
    const result = compareScenarios(project, 'cost-first');
    expect(result.ok).toBe(true);
    expect(
      result.value.changes.map(
        ({ baseScore, alternateScore, baseRank, alternateRank, rankChange }) => [
          baseScore,
          alternateScore,
          baseRank,
          alternateRank,
          rankChange,
        ],
      ),
    ).toEqual([
      [67.5, 60, 1, 2, -1],
      [66.25, 70, 2, 1, 1],
      [46.25, 32.5, 3, 3, 0],
    ]);
    for (const change of result.value.changes)
      expect(change.contributions.reduce((sum, item) => sum + item.delta, 0)).toBeCloseTo(
        change.scoreDelta,
      );
    expect(project.scenarios[0]).not.toHaveProperty('results');
    expect(compareScores(1, 1).value.actualTie).toBe(true);
    expect(compareScores(1.001, 1.004).value.apparentTie).toBe(true);
  });

  it('conserva empates reales al comparar prioridades', () => {
    const project = officialExample();
    for (const criterion of project.criteria) {
      const source = project.evaluations.find(
        (item) => item.alternativeId === 'a' && item.criterionId === criterion.id,
      );
      project.evaluations.find(
        (item) => item.alternativeId === 'b' && item.criterionId === criterion.id,
      ).value = source.value;
    }
    const compared = compareScenarios(project, 'cost-first');
    expect(compared.ok).toBe(true);
    expect(compared.value.base.results.slice(0, 2).map((item) => item.rank)).toEqual([1, 1]);
    expect(compared.value.alternate.results.slice(0, 2).map((item) => item.rank)).toEqual([1, 1]);
    expect(compared.value.base.results[1].actualTieWithPrevious).toBe(true);
  });

  it('restablece y elimina el escenario sin alterar base ni respuestas', () => {
    const project = officialExample();
    const reset = resetScenarioWeights(project, 'cost-first');
    expect(reset.value.scenarios[0].weights).toEqual({
      ease: 3,
      cost: 2,
      integrations: 2,
      support: 1,
    });
    expect(reset.value.scenarios[0].id).toBe('cost-first');
    expect(reset.value.evaluations).toEqual(project.evaluations);
    const removed = removeScenario(reset.value, 'cost-first');
    expect(removed.value.scenarios).toEqual([]);
    expect(evaluateProject(removed.value).ok).toBe(true);
  });

  it('mantiene referencias al agregar y quitar criterios, incluso con suma alternativa cero', () => {
    let project = officialExample();
    project = addCriterion(project, { id: 'new' }).value;
    expect(project.scenarios[0].weights.new).toBe(0);
    project = removeCriterion(project, 'new').value;
    expect(project.scenarios[0].weights).not.toHaveProperty('new');
    project = updateScenario(project, 'cost-first', {
      name: 'Solo facilidad',
      weights: { ease: 1, cost: 0, integrations: 0, support: 0 },
    }).value;
    project = removeCriterion(project, 'ease').value;
    expect(validateProject(project, { mode: 'draft' }).ok).toBe(true);
    expect(validateProject(project, { mode: 'complete' }).ok).toBe(false);
    expect(evaluateProject(project).ok).toBe(true);
    expect(compareScenarios(project, 'cost-first').ok).toBe(false);
    const fixed = updateScenario(project, 'cost-first', {
      name: 'Costo prioritario',
      weights: { cost: 4, integrations: 2, support: 1 },
    });
    expect(fixed.ok).toBe(true);
    expect(compareScenarios(fixed.value, 'cost-first').ok).toBe(true);
  });
});
