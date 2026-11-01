import { normalizeNumeric, normalizeRating } from './normalization.js';
import { validateProject } from './validation.js';

const issue = (path, code, message) => ({ ok: false, errors: [{ path, code, message }] });
const pairKey = (alternativeId, criterionId) => JSON.stringify([alternativeId, criterionId]);

function pair(project, alternativeId, criterionId) {
  if (!project.alternatives.some(({ id }) => id === alternativeId))
    return issue('alternativeId', 'unknown-alternative', 'La alternativa no existe.');
  const criterion = project.criteria.find(({ id }) => id === criterionId);
  if (!criterion) return issue('criterionId', 'unknown-criterion', 'El criterio no existe.');
  return { ok: true, criterion };
}

function validValue(value, criterion) {
  return criterion.type === 'rating' ? normalizeRating(value) : normalizeNumeric(value, criterion);
}

/** Returns the saved answer, or null when the pair is still pending. */
export function getEvaluation(project, alternativeId, criterionId) {
  return (
    project.evaluations.find(
      (answer) => answer.alternativeId === alternativeId && answer.criterionId === criterionId,
    ) ?? null
  );
}

/** Adds or replaces one answer without changing another pair or the input project. */
export function setEvaluation(project, alternativeId, criterionId, value) {
  const checked = pair(project, alternativeId, criterionId);
  if (!checked.ok) return checked;
  const normalized = validValue(value, checked.criterion);
  if (!normalized.ok) return normalized;
  const next = structuredClone(project);
  next.evaluations = next.evaluations.filter(
    (answer) =>
      pairKey(answer.alternativeId, answer.criterionId) !== pairKey(alternativeId, criterionId),
  );
  next.evaluations.push({ alternativeId, criterionId, value });
  const validation = validateProject(next, { mode: 'draft' });
  return validation.ok ? { ok: true, value: next } : validation;
}

/** An empty answer is represented by absence, never by a stored zero. */
export function removeEvaluation(project, alternativeId, criterionId) {
  const checked = pair(project, alternativeId, criterionId);
  if (!checked.ok) return checked;
  const next = structuredClone(project);
  next.evaluations = next.evaluations.filter(
    (answer) =>
      pairKey(answer.alternativeId, answer.criterionId) !== pairKey(alternativeId, criterionId),
  );
  return { ok: true, value: next };
}

/** Counts only valid answers to current alternative/criterion pairs. */
export function evaluationProgress(project) {
  const valid = new Set();
  for (const answer of project.evaluations) {
    const checked = pair(project, answer.alternativeId, answer.criterionId);
    if (checked.ok && validValue(answer.value, checked.criterion).ok)
      valid.add(pairKey(answer.alternativeId, answer.criterionId));
  }
  const missing = [];
  const byAlternative = project.alternatives.map((alternative) => {
    let completed = 0;
    for (const criterion of project.criteria) {
      if (valid.has(pairKey(alternative.id, criterion.id))) completed++;
      else missing.push({ alternativeId: alternative.id, criterionId: criterion.id });
    }
    return {
      alternativeId: alternative.id,
      completed,
      total: project.criteria.length,
      remaining: project.criteria.length - completed,
    };
  });
  const total = project.alternatives.length * project.criteria.length;
  const completed = total - missing.length;
  return { completed, total, remaining: missing.length, byAlternative, missing };
}
