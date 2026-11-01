import { describe, expect, it } from 'vitest';
import { createDraftProject } from '../../src/domain/model.js';
import { evaluateProject } from '../../src/domain/evaluation.js';
import {
  evaluationProgress,
  getEvaluation,
  removeEvaluation,
  setEvaluation,
} from '../../src/domain/answers.js';
import { officialExample } from '../fixtures/official-example.js';
import { parseEvaluationNumber } from '../../src/features/evaluation/evaluation.js';

describe('respuestas de evaluación', () => {
  it('interpreta coma o punto decimal sin aceptar separadores ambiguos', () => {
    expect(parseEvaluationNumber('100,5')).toBe(100.5);
    expect(parseEvaluationNumber('100.5')).toBe(100.5);
    expect(parseEvaluationNumber('0.125')).toBe(0.125);
    expect(parseEvaluationNumber('0')).toBe(0);
    expect(Number.isNaN(parseEvaluationNumber('1.000,5'))).toBe(true);
    expect(Number.isNaN(parseEvaluationNumber('1,000.5'))).toBe(true);
    expect(Number.isNaN(parseEvaluationNumber('1.000'))).toBe(true);
  });
  it('agrega, reemplaza y elimina por IDs sin duplicados ni mutar el proyecto original', () => {
    const original = officialExample();
    const before = structuredClone(original);
    const changed = setEvaluation(original, 'a', 'ease', 0);
    expect(changed.ok).toBe(true);
    expect(getEvaluation(changed.value, 'a', 'ease').value).toBe(0);
    expect(changed.value.evaluations).toHaveLength(12);
    const replaced = setEvaluation(changed.value, 'a', 'ease', 5);
    expect(replaced.value.evaluations).toHaveLength(12);
    expect(getEvaluation(replaced.value, 'a', 'ease').value).toBe(5);
    const removed = removeEvaluation(replaced.value, 'a', 'ease');
    expect(getEvaluation(removed.value, 'a', 'ease')).toBeNull();
    expect(removed.value.evaluations).toHaveLength(11);
    expect(original).toEqual(before);
  });

  it('rechaza IDs inexistentes y valoraciones fuera de la escala entera 0–5', () => {
    const project = officialExample();
    expect(setEvaluation(project, 'missing', 'ease', 3).errors[0].code).toBe('unknown-alternative');
    expect(setEvaluation(project, 'a', 'missing', 3).errors[0].code).toBe('unknown-criterion');
    expect(removeEvaluation(project, 'missing', 'ease').ok).toBe(false);
    for (const value of [-1, 6, 2.5, Number.NaN])
      expect(setEvaluation(project, 'a', 'ease', value).errors[0].code).toBe('rating-out-of-range');
    expect(setEvaluation(project, 'a', 'ease', 0).ok).toBe(true);
    expect(setEvaluation(project, 'a', 'ease', 5).ok).toBe(true);
  });

  it('acepta límites inclusivos y decimales numéricos, y rechaza valores inválidos', () => {
    const project = officialExample();
    for (const value of [0, 100.5, 200]) {
      const result = setEvaluation(project, 'a', 'cost', value);
      expect(result.ok).toBe(true);
      expect(getEvaluation(result.value, 'a', 'cost').value).toBe(value);
    }
    for (const value of [-0.1, 200.1])
      expect(setEvaluation(project, 'a', 'cost', value).errors[0].code).toBe(
        'numeric-out-of-range',
      );
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, '100'])
      expect(setEvaluation(project, 'a', 'cost', value).errors[0].code).toBe('invalid-number');
  });

  it('cuenta cero como respuesta, detecta pendientes y no cuenta datos inválidos', () => {
    const project = officialExample();
    project.evaluations = [];
    expect(evaluationProgress(project)).toMatchObject({ completed: 0, total: 12, remaining: 12 });
    const first = setEvaluation(project, 'a', 'ease', 0).value;
    expect(evaluationProgress(first)).toMatchObject({ completed: 1, total: 12, remaining: 11 });
    expect(evaluationProgress(first).byAlternative[0]).toMatchObject({
      completed: 1,
      remaining: 3,
    });
    first.evaluations.push({ alternativeId: 'b', criterionId: 'ease', value: 9 });
    expect(evaluationProgress(first).completed).toBe(1);
    expect(evaluationProgress(first).missing).toContainEqual({
      alternativeId: 'b',
      criterionId: 'ease',
    });
  });

  it('soporta cinco alternativas, ocho criterios y cuarenta respuestas compatibles con el motor', () => {
    const project = createDraftProject({ id: 'maximum', timestamp: '2026-10-31T00:00:00.000Z' });
    project.name = 'Máximo';
    project.question = '¿Qué opción?';
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
    for (const alternative of project.alternatives)
      for (const criterion of project.criteria)
        project.evaluations.push({
          alternativeId: alternative.id,
          criterionId: criterion.id,
          value: 0,
        });
    expect(evaluationProgress(project)).toMatchObject({ completed: 40, total: 40, remaining: 0 });
    expect(evaluateProject(project).value.results).toHaveLength(5);
    expect(evaluateProject(project).value.results.every(({ score }) => score === 0)).toBe(true);
  });
});
