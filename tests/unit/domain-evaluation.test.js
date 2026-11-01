import { describe, expect, it } from 'vitest';
import { compareScenarios, compareScores, evaluateProject } from '../../src/domain/index.js';
import { officialExample } from '../fixtures/official-example.js';

describe('motor de evaluación', () => {
  it('reproduce el ejemplo aprobado con puntuaciones, orden y contribuciones reales', () => {
    const result = evaluateProject(officialExample());
    expect(result.ok).toBe(true);
    expect(result.value.results.map((item) => [item.name, item.score, item.rank])).toEqual([
      ['Herramienta A', 67.5, 1],
      ['Herramienta B', 66.25, 2],
      ['Herramienta C', 46.25, 3],
    ]);
    expect(result.value.results[0].contributions.map((item) => item.points)).toEqual([
      30, 12.5, 15, 10,
    ]);
    expect(result.value.results[0].score - result.value.results[1].score).toBe(1.25);
  });

  it('calcula el escenario alternativo sin alterar datos y explica cambios', () => {
    const project = officialExample();
    const before = structuredClone(project);
    const result = compareScenarios(project, 'cost-first');
    expect(result.ok).toBe(true);
    expect(
      result.value.alternate.results.map((item) => [item.name, item.score, item.rank]),
    ).toEqual([
      ['Herramienta B', 70, 1],
      ['Herramienta A', 60, 2],
      ['Herramienta C', 32.5, 3],
    ]);
    expect(
      result.value.changes.map((item) => [item.alternativeId, item.scoreDelta, item.rankChange]),
    ).toEqual([
      ['a', -7.5, -1],
      ['b', 3.75, 1],
      ['c', -13.75, 0],
    ]);
    expect(result.value.changes[0].contributions.map((item) => item.delta)).toEqual([
      -20, 12.5, 0, 0,
    ]);
    expect(project).toEqual(before);
    expect(evaluateProject(project).value.results[0].score).toBe(67.5);
  });

  it('distingue empate real de igualdad por presentación a dos decimales', () => {
    expect(compareScores(50, 50).value).toEqual({ actualTie: true, apparentTie: false });
    expect(compareScores(50.004, 50.003).value).toEqual({ actualTie: false, apparentTie: true });
    const project = officialExample();
    project.evaluations.find(
      (item) => item.alternativeId === 'b' && item.criterionId === 'ease',
    ).value = 4;
    project.evaluations.find(
      (item) => item.alternativeId === 'b' && item.criterionId === 'cost',
    ).value = 100;
    project.evaluations.find(
      (item) => item.alternativeId === 'b' && item.criterionId === 'integrations',
    ).value = 3;
    project.evaluations.find(
      (item) => item.alternativeId === 'b' && item.criterionId === 'support',
    ).value = 4;
    const result = evaluateProject(project);
    expect(result.value.results.slice(0, 2).map((item) => item.rank)).toEqual([1, 1]);
    expect(result.value.results[1].actualTieWithPrevious).toBe(true);
  });

  it('mantiene posiciones distintas para resultados que parecen iguales al redondear', () => {
    const project = officialExample();
    project.criteria[1].max = 100000;
    project.criteria.forEach((criterion) => {
      criterion.weight = criterion.id === 'cost' ? 1 : 0;
    });
    for (const answer of project.evaluations) {
      if (answer.criterionId === 'cost')
        answer.value = { a: 49996, b: 49997, c: 100000 }[answer.alternativeId];
    }
    const result = evaluateProject(project);
    expect(result.value.results.slice(0, 2).map((item) => item.rank)).toEqual([1, 2]);
    expect(result.value.results[1].apparentTieWithPrevious).toBe(true);
    expect(result.value.results[0].score).toBeGreaterThan(result.value.results[1].score);
    expect(
      result.value.results[0].contributions
        .filter((item) => item.rawWeight === 0)
        .every((item) => item.points === 0),
    ).toBe(true);
  });

  it('es reproducible, rechaza comparaciones incompletas y escenarios desconocidos', () => {
    const project = officialExample();
    expect(evaluateProject(project)).toEqual(evaluateProject(project));
    expect(evaluateProject(null).errors[0].code).toBe('invalid-project');
    expect(evaluateProject(project, { scenarioId: 'unknown' }).errors[0].code).toBe(
      'unknown-scenario',
    );
    expect(evaluateProject(project, { displayDecimals: -1 }).errors[0].code).toBe(
      'invalid-precision',
    );
    expect(compareScenarios(project).errors[0].code).toBe('required');
    project.evaluations.pop();
    expect(
      evaluateProject(project).errors.some((error) => error.code === 'missing-evaluation'),
    ).toBe(true);
  });
});
