import { describe, expect, it } from 'vitest';
import { createDraftProject } from '../../src/domain/model.js';
import {
  formatDifference,
  formatImportance,
  formatInput,
  formatScore,
  prepareResults,
} from '../../src/features/results/presentation.js';
import { officialExample } from '../fixtures/official-example.js';

describe('presentación de resultados', () => {
  it('transforma el ejemplo calculado y conserva los aportes del motor', () => {
    const project = officialExample();
    const before = structuredClone(project);
    const view = prepareResults(project);
    expect(view.kind).toBe('ready');
    expect(
      view.results.map(({ name, rank, formattedScore }) => [name, rank, formattedScore]),
    ).toEqual([
      ['Herramienta A', 1, '67,50'],
      ['Herramienta B', 2, '66,25'],
      ['Herramienta C', 3, '46,25'],
    ]);
    expect(view.results[0].contributions.map(({ formattedPoints }) => formattedPoints)).toEqual([
      '30,00',
      '12,50',
      '15,00',
      '10,00',
    ]);
    expect(view.results[0].contributions[0]).toMatchObject({
      value: 4,
      normalizedValue: 80,
      rawWeight: 3,
      proportion: 0.375,
      points: 30,
      formattedImportance: '37,50',
    });
    expect(view.comparison.difference).toBe(1.25);
    expect(view.comparison.criteria.map(({ delta }) => delta).reduce((a, b) => a + b, 0)).toBe(
      1.25,
    );
    expect(project).toEqual(before);
  });

  it('distingue empate real de igualdad aparente por redondeo', () => {
    const tied = officialExample();
    for (const answer of tied.evaluations.filter(({ alternativeId }) => alternativeId === 'b')) {
      answer.value = tied.evaluations.find(
        (source) => source.alternativeId === 'a' && source.criterionId === answer.criterionId,
      ).value;
    }
    const actual = prepareResults(tied);
    expect(actual.leaders.map(({ name }) => name)).toEqual(['Herramienta A', 'Herramienta B']);
    expect(actual.results[1].rank).toBe(1);
    expect(actual.results[1].actualTieWithPrevious).toBe(true);
    tied.evaluations.find(
      ({ alternativeId, criterionId }) => alternativeId === 'b' && criterionId === 'cost',
    ).value = 100.01;
    const apparent = prepareResults(tied);
    expect(apparent.results[0].formattedScore).toBe(apparent.results[1].formattedScore);
    expect(apparent.results[1].rank).toBe(2);
    expect(apparent.results[1].apparentTieWithPrevious).toBe(true);
    expect(apparent.leaders).toHaveLength(1);
    expect(apparent.comparison.difference).toBeGreaterThan(0);
  });

  it('muestra cero y peso cero sin ocultar la respuesta', () => {
    const project = officialExample();
    project.criteria.find(({ id }) => id === 'support').weight = 0;
    project.evaluations.find(
      ({ alternativeId, criterionId }) => alternativeId === 'a' && criterionId === 'support',
    ).value = 0;
    const view = prepareResults(project);
    const support = view.results.find(({ alternativeId }) => alternativeId === 'a')
      .contributions[3];
    expect(support.value).toBe(0);
    expect(support.rawWeight).toBe(0);
    expect(support.points).toBe(0);
    expect(support.formattedImportance).toBe('0,00');
  });

  it('no produce clasificación definitiva si faltan respuestas o configuración', () => {
    const project = officialExample();
    project.evaluations.pop();
    expect(prepareResults(project)).toMatchObject({
      kind: 'missing',
      progress: { remaining: 1 },
    });
    project.name = '';
    expect(prepareResults(project).kind).toBe('setup');
  });

  it('usa dos decimales para mostrar y preserva diferencias pequeñas', () => {
    expect(formatScore(1.5)).toBe('1,50');
    expect(formatInput(100.5)).toBe('100,5');
    expect(formatImportance(0.375)).toBe('37,50');
    expect(formatDifference(0.009)).toBe('< 0,01');
  });

  it('presenta cinco alternativas, ocho criterios y puntuaciones cero', () => {
    const project = createDraftProject({ id: 'maximum', timestamp: '2026-10-31T00:00:00.000Z' });
    project.name = 'Comparación máxima';
    project.question = '¿Cuál conviene?';
    project.alternatives = Array.from({ length: 5 }, (_, index) => ({
      id: `a${index}`,
      name: `Alternativa ${index + 1}`,
      description: '',
      order: index,
    }));
    project.criteria = Array.from({ length: 8 }, (_, index) => ({
      id: `c${index}`,
      name: `Criterio ${index + 1}`,
      description: '',
      type: 'rating',
      weight: 1,
    }));
    project.evaluations = project.alternatives.flatMap((alternative) =>
      project.criteria.map((criterion) => ({
        alternativeId: alternative.id,
        criterionId: criterion.id,
        value: 0,
      })),
    );
    const view = prepareResults(project);
    expect(view.kind).toBe('ready');
    expect(view.results).toHaveLength(5);
    expect(view.leaders).toHaveLength(5);
    expect(
      view.results.every(
        ({ score, rank, contributions }) => score === 0 && rank === 1 && contributions.length === 8,
      ),
    ).toBe(true);
  });
});
