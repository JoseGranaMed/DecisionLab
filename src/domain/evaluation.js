import { normalizeNumeric, normalizeRating, normalizeWeights } from './normalization.js';
import { validateProject } from './validation.js';

const failure = (path, code, message) => ({ ok: false, errors: [{ path, code, message }] });

/** Exact equality uses unrounded JavaScript Number scores; rounded equality is display metadata only. */
export function compareScores(a, b, decimals = 2) {
  if (
    ![a, b].every((value) => typeof value === 'number' && Number.isFinite(value)) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 10
  ) {
    return failure(
      'scores',
      'invalid-score',
      'Las puntuaciones y la precisión de presentación deben ser válidas.',
    );
  }
  const actualTie = a === b;
  const apparentTie = !actualTie && a.toFixed(decimals) === b.toFixed(decimals);
  return { ok: true, value: { actualTie, apparentTie } };
}

/** Computes scores and contributions from current project data, without modifying it. */
export function evaluateProject(project, options = {}) {
  const { scenarioId = null, displayDecimals = 2 } = options ?? {};
  if (!Number.isInteger(displayDecimals) || displayDecimals < 0 || displayDecimals > 10) {
    return failure(
      'displayDecimals',
      'invalid-precision',
      'La precisión de presentación debe ser un entero de 0 a 10.',
    );
  }
  const validation = validateProject(project, {
    mode: 'complete',
    scenarioMode: scenarioId === null ? 'base' : 'all',
  });
  if (!validation.ok) return validation;
  const scenario =
    scenarioId === null ? null : project.scenarios.find((item) => item.id === scenarioId);
  if (scenarioId !== null && !scenario)
    return failure('scenarioId', 'unknown-scenario', 'El escenario no existe.');
  const normalizedWeights = normalizeWeights(project.criteria, scenario?.weights);
  if (!normalizedWeights.ok) return normalizedWeights;
  const weightById = new Map(normalizedWeights.value.map((weight) => [weight.criterionId, weight]));
  const evaluationByPair = new Map(
    project.evaluations.map((item) => [
      JSON.stringify([item.alternativeId, item.criterionId]),
      item,
    ]),
  );
  const results = project.alternatives.map((alternative) => {
    const contributions = project.criteria.map((criterion) => {
      const answer = evaluationByPair.get(JSON.stringify([alternative.id, criterion.id]));
      const normalized =
        criterion.type === 'rating'
          ? normalizeRating(answer.value)
          : normalizeNumeric(answer.value, criterion);
      const weight = weightById.get(criterion.id);
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        value: answer.value,
        normalizedValue: normalized.value,
        rawWeight: weight.rawWeight,
        proportion: weight.proportion,
        points: normalized.value * weight.proportion,
      };
    });
    // Compensated summation reduces avoidable floating-point loss; no presentation rounding is applied.
    let score = 0;
    let compensation = 0;
    for (const contribution of contributions) {
      const adjusted = contribution.points - compensation;
      const next = score + adjusted;
      compensation = next - score - adjusted;
      score = next;
    }
    return {
      alternativeId: alternative.id,
      name: alternative.name,
      order: alternative.order,
      score,
      contributions,
    };
  });
  results.sort(
    (a, b) =>
      b.score - a.score || a.order - b.order || a.alternativeId.localeCompare(b.alternativeId),
  );
  const ranked = results.map((result, index) => {
    const comparison = index
      ? compareScores(result.score, results[index - 1].score, displayDecimals)
      : null;
    return {
      ...result,
      rank: comparison?.value.actualTie
        ? results.findIndex((item) => item.score === result.score) + 1
        : index + 1,
      actualTieWithPrevious: comparison?.value.actualTie ?? false,
      apparentTieWithPrevious: comparison?.value.apparentTie ?? false,
    };
  });
  return {
    ok: true,
    value: { scenarioId: scenarioId ?? 'base', weights: normalizedWeights.value, results: ranked },
  };
}
