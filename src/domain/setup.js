import { validateProject } from './validation.js';
import { normalizeWeights } from './normalization.js';

const failure = (path, code, message) => ({ ok: false, errors: [{ path, code, message }] });
const find = (items, id) => items.findIndex((item) => item.id === id);
const copy = (project) => structuredClone(project);

function accept(project) {
  const validation = validateProject(project, { mode: 'draft' });
  return validation.ok ? { ok: true, value: project } : validation;
}

function move(items, id, direction) {
  const index = find(items, id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return null;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

/** Readiness for the evaluation step; existing evaluation answers are not required yet. */
export function validateSetup(project) {
  const draft = validateProject(project, { mode: 'draft' });
  if (!draft.ok) return draft;
  const errors = validateProject(project, { mode: 'complete' }).errors.filter(
    (error) => !error.path.startsWith('evaluations'),
  );
  if (project.alternatives.length > 5)
    errors.push({
      path: 'alternatives',
      code: 'too-many-alternatives',
      message: 'El máximo es cinco alternativas.',
    });
  if (project.criteria.length < 2)
    errors.push({
      path: 'criteria',
      code: 'insufficient-criteria',
      message: 'Se necesitan al menos dos criterios.',
    });
  if (project.criteria.length > 8)
    errors.push({
      path: 'criteria',
      code: 'too-many-criteria',
      message: 'El máximo es ocho criterios.',
    });
  return { ok: errors.length === 0, errors };
}

export function addAlternative(project, { id, name = '', description = '' }) {
  if (project.alternatives.length >= 5)
    return failure('alternatives', 'too-many-alternatives', 'El máximo es cinco alternativas.');
  const next = copy(project);
  next.alternatives.push({ id, name, description, order: next.alternatives.length });
  return accept(next);
}

export function updateAlternative(project, id, fields) {
  const next = copy(project);
  const index = find(next.alternatives, id);
  if (index < 0) return failure('alternatives', 'not-found', 'La alternativa no existe.');
  const allowed = Object.fromEntries(
    Object.entries(fields).filter(([key]) => ['name', 'description'].includes(key)),
  );
  next.alternatives[index] = { ...next.alternatives[index], ...allowed };
  return accept(next);
}

export function removeAlternative(project, id) {
  const next = copy(project);
  if (find(next.alternatives, id) < 0)
    return failure('alternatives', 'not-found', 'La alternativa no existe.');
  next.alternatives = next.alternatives
    .filter((item) => item.id !== id)
    .map((item, order) => ({ ...item, order }));
  next.evaluations = next.evaluations.filter((item) => item.alternativeId !== id);
  return accept(next);
}

export function moveAlternative(project, id, direction) {
  const next = copy(project);
  const moved = move(next.alternatives, id, direction);
  if (!moved)
    return failure(
      'alternatives',
      'invalid-move',
      'No se puede mover la alternativa en esa dirección.',
    );
  next.alternatives = moved.map((item, order) => ({ ...item, order }));
  return accept(next);
}

export function addCriterion(project, { id, type = 'rating' }) {
  if (project.criteria.length >= 8)
    return failure('criteria', 'too-many-criteria', 'El máximo es ocho criterios.');
  const next = copy(project);
  const criterion = { id, name: '', description: '', type, weight: 1 };
  if (type === 'numeric') Object.assign(criterion, { unit: '', direction: 'higher' });
  next.criteria.push(criterion);
  next.scenarios = next.scenarios.map((scenario) => ({
    ...scenario,
    weights: { ...scenario.weights, [id]: 0 },
  }));
  return accept(next);
}

export function updateCriterion(project, id, fields) {
  const next = copy(project);
  const index = find(next.criteria, id);
  if (index < 0) return failure('criteria', 'not-found', 'El criterio no existe.');
  const allowed = Object.fromEntries(
    Object.entries(fields).filter(([key]) =>
      ['name', 'description', 'weight', 'unit', 'min', 'max', 'direction'].includes(key),
    ),
  );
  next.criteria[index] = { ...next.criteria[index], ...allowed };
  return accept(next);
}

/** Type changes explicitly clear answers for this criterion; the UI confirms when answers exist. */
export function setCriterionType(project, id, type) {
  if (!['rating', 'numeric'].includes(type))
    return failure('criteria', 'invalid-type', 'Tipo de criterio desconocido.');
  const next = copy(project);
  const index = find(next.criteria, id);
  if (index < 0) return failure('criteria', 'not-found', 'El criterio no existe.');
  if (next.criteria[index].type === type) return { ok: true, value: next };
  const { unit, min, max, direction, ...base } = next.criteria[index];
  void unit;
  void min;
  void max;
  void direction;
  next.criteria[index] =
    type === 'rating' ? { ...base, type } : { ...base, type, unit: '', direction: 'higher' };
  next.evaluations = next.evaluations.filter((item) => item.criterionId !== id);
  return accept(next);
}

export function removeCriterion(project, id) {
  const next = copy(project);
  if (find(next.criteria, id) < 0)
    return failure('criteria', 'not-found', 'El criterio no existe.');
  next.criteria = next.criteria.filter((item) => item.id !== id);
  next.evaluations = next.evaluations.filter((item) => item.criterionId !== id);
  next.scenarios = next.scenarios.map((scenario) => {
    const weights = { ...scenario.weights };
    delete weights[id];
    return { ...scenario, weights };
  });
  return accept(next);
}

export function moveCriterion(project, id, direction) {
  const next = copy(project);
  const moved = move(next.criteria, id, direction);
  if (!moved)
    return failure('criteria', 'invalid-move', 'No se puede mover el criterio en esa dirección.');
  next.criteria = moved;
  return accept(next);
}

export function weightProportions(project) {
  return normalizeWeights(project.criteria);
}
