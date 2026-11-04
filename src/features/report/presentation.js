import { normalizeWeights } from '../../domain/normalization.js';
import { compareScenarios } from '../../domain/scenarios.js';
import { prepareResults } from '../results/presentation.js';

/** Current engine output and current answers, never a stored result snapshot. */
export function prepareReport(project, generatedAt = new Date().toISOString()) {
  const base = prepareResults(project);
  if (base.kind !== 'ready') return base;
  const weights = normalizeWeights(project.criteria);
  const byId = new Map(weights.value.map((item) => [item.criterionId, item]));
  const criteria = project.criteria.map((criterion) => ({
    ...criterion,
    proportion: byId.get(criterion.id).proportion,
  }));
  const answers = new Map(
    project.evaluations.map((item) => [
      JSON.stringify([item.alternativeId, item.criterionId]),
      item.value,
    ]),
  );
  const evaluations = project.alternatives.map((alternative) => ({
    alternative,
    values: criteria.map((criterion) => ({
      criterion,
      value: answers.get(JSON.stringify([alternative.id, criterion.id])),
    })),
  }));
  const selected = project.scenarios[0] ?? null;
  const compared = selected ? compareScenarios(project, selected.id) : null;
  return {
    kind: 'ready',
    project,
    generatedAt,
    criteria,
    evaluations,
    results: base.results,
    scenario: compared?.ok
      ? { name: selected.name, weights: selected.weights, ...compared.value }
      : null,
    scenarioIssue: selected && !compared.ok ? compared.errors[0].message : null,
  };
}
