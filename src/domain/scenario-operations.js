import { normalizeWeights } from './normalization.js';
import { validateProject } from './validation.js';

const failure = (path, code, message) => ({ ok: false, errors: [{ path, code, message }] });

function accept(next) {
  const validation = validateProject(next, { mode: 'draft' });
  return validation.ok ? { ok: true, value: next } : validation;
}

function baseWeights(project) {
  const normalized = normalizeWeights(project.criteria);
  return normalized.ok
    ? {
        ok: true,
        value: Object.fromEntries(project.criteria.map(({ id, weight }) => [id, weight])),
      }
    : normalized;
}

export function createScenario(project, { id, name = 'Nuevo escenario' }) {
  if (project.scenarios.length)
    return failure(
      'scenarios',
      'scenario-limit',
      'Este proyecto ya tiene un escenario alternativo.',
    );
  if (typeof id !== 'string' || !id.trim())
    return failure('scenarios.id', 'required', 'El identificador es obligatorio.');
  if (typeof name !== 'string' || !name.trim())
    return failure('scenarios.name', 'required', 'Escribe un nombre para el escenario.');
  const weights = baseWeights(project);
  if (!weights.ok) return weights;
  const next = structuredClone(project);
  next.scenarios.push({ id, name: name.trim(), weights: weights.value });
  return accept(next);
}

/** Name and all weights become one persisted revision, or none of them do. */
export function updateScenario(project, id, { name, weights }) {
  const index = project.scenarios.findIndex((scenario) => scenario.id === id);
  if (index < 0) return failure('scenarios', 'not-found', 'El escenario no existe.');
  if (typeof name !== 'string' || !name.trim())
    return failure('scenarios.name', 'required', 'Escribe un nombre para el escenario.');
  const normalized = normalizeWeights(project.criteria, weights);
  if (!normalized.ok) return normalized;
  const next = structuredClone(project);
  next.scenarios[index] = { id, name: name.trim(), weights: { ...weights } };
  return accept(next);
}

export function resetScenarioWeights(project, id) {
  const scenario = project.scenarios.find((item) => item.id === id);
  if (!scenario) return failure('scenarios', 'not-found', 'El escenario no existe.');
  const weights = baseWeights(project);
  return weights.ok
    ? updateScenario(project, id, { name: scenario.name, weights: weights.value })
    : weights;
}

export function removeScenario(project, id) {
  if (!project.scenarios.some((scenario) => scenario.id === id))
    return failure('scenarios', 'not-found', 'El escenario no existe.');
  const next = structuredClone(project);
  next.scenarios = next.scenarios.filter((scenario) => scenario.id !== id);
  return accept(next);
}
