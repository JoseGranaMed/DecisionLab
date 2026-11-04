import { describe, expect, it } from 'vitest';
import { prepareReport } from '../../src/features/report/presentation.js';
import { officialExample } from '../fixtures/official-example.js';

describe('datos del informe', () => {
  it('usa las respuestas y el motor vigentes para base y escenario', () => {
    const project = officialExample();
    const report = prepareReport(project, '2026-11-04T12:00:00.000Z');
    expect(report.kind).toBe('ready');
    expect(report.generatedAt).toBe('2026-11-04T12:00:00.000Z');
    expect(report.results.map((item) => item.score)).toEqual([67.5, 66.25, 46.25]);
    expect(report.scenario.changes.map((item) => item.alternateScore)).toEqual([60, 70, 32.5]);
    expect(report.evaluations[0].values.map((item) => item.value)).toEqual([4, 100, 3, 4]);
    project.evaluations.find(
      (item) => item.alternativeId === 'a' && item.criterionId === 'ease',
    ).value = 5;
    expect(prepareReport(project).results[0].score).not.toBe(67.5);
  });

  it('no presenta clasificación de borradores ni escenarios inválidos', () => {
    const project = officialExample();
    project.evaluations.pop();
    expect(prepareReport(project).kind).toBe('missing');
    project.evaluations.push({ alternativeId: 'c', criterionId: 'support', value: 0 });
    project.scenarios[0].weights = { ease: 0, cost: 0, integrations: 0, support: 0 };
    const report = prepareReport(project);
    expect(report.kind).toBe('ready');
    expect(report.scenario).toBeNull();
    expect(report.scenarioIssue).toMatch(/suma/);
  });
});
