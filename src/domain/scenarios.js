import { evaluateProject } from './evaluation.js';

/** Positive rankChange means a climb toward first place. */
export function compareScenarios(project, scenarioId) {
  if (typeof scenarioId !== 'string' || !scenarioId.trim()) {
    return {
      ok: false,
      errors: [
        { path: 'scenarioId', code: 'required', message: 'Selecciona un escenario alternativo.' },
      ],
    };
  }
  const base = evaluateProject(project);
  if (!base.ok) return base;
  const alternate = evaluateProject(project, { scenarioId });
  if (!alternate.ok) return alternate;
  const alternateById = new Map(alternate.value.results.map((item) => [item.alternativeId, item]));
  const changes = base.value.results.map((baseItem) => {
    const alternateItem = alternateById.get(baseItem.alternativeId);
    const alternateContributions = new Map(
      alternateItem.contributions.map((item) => [item.criterionId, item]),
    );
    return {
      alternativeId: baseItem.alternativeId,
      name: baseItem.name,
      baseScore: baseItem.score,
      alternateScore: alternateItem.score,
      scoreDelta: alternateItem.score - baseItem.score,
      baseRank: baseItem.rank,
      alternateRank: alternateItem.rank,
      rankChange: baseItem.rank - alternateItem.rank,
      contributions: baseItem.contributions.map((item) => ({
        criterionId: item.criterionId,
        basePoints: item.points,
        alternatePoints: alternateContributions.get(item.criterionId).points,
        delta: alternateContributions.get(item.criterionId).points - item.points,
      })),
    };
  });
  return { ok: true, value: { base: base.value, alternate: alternate.value, changes } };
}
