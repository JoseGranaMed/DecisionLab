import { SCHEMA_VERSION } from './model.js';

const present = (value) => value !== undefined && value !== null && value !== '';
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const issue = (path, code, message) => ({ path, code, message });

function requiredText(value, path, errors, required = true) {
  if (!present(value)) {
    if (required) errors.push(issue(path, 'required', 'Este campo es obligatorio.'));
  } else if (typeof value !== 'string' || !value.trim()) {
    errors.push(issue(path, 'invalid-text', 'Introduce un texto no vacío.'));
  }
}

function optionalText(value, path, errors) {
  if (present(value) && typeof value !== 'string') {
    errors.push(issue(path, 'invalid-text', 'Introduce un texto.'));
  }
}

function numberField(value, path, errors, { required = true, nonnegative = false } = {}) {
  if (!present(value)) {
    if (required) errors.push(issue(path, 'required', 'Este valor es obligatorio.'));
    return false;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(issue(path, 'invalid-number', 'Introduce un número finito.'));
    return false;
  }
  if (nonnegative && value < 0) {
    errors.push(issue(path, 'negative-weight', 'El peso no puede ser negativo.'));
    return false;
  }
  return true;
}

function uniqueIds(items, path, errors) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    const idPath = `${path}[${index}].id`;
    if (!record(item)) {
      errors.push(issue(`${path}[${index}]`, 'invalid-item', 'El elemento debe ser un objeto.'));
      continue;
    }
    requiredText(item.id, idPath, errors);
    if (typeof item.id === 'string' && item.id.trim()) {
      if (seen.has(item.id))
        errors.push(issue(idPath, 'duplicate-id', 'El identificador está duplicado.'));
      seen.add(item.id);
    }
  }
  return seen;
}

function isoDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

/**
 * Validates a JSON-safe project. Draft mode permits missing names, criteria details and answers,
 * but rejects malformed supplied values, duplicate IDs and broken references.
 * @param {import('./model.js').Project} project
 * @param {{ mode?: 'draft' | 'complete' }} options
 * @returns {{ ok: boolean, errors: Array<{path: string, code: string, message: string}> }}
 */
export function validateProject(project, options = {}) {
  const { mode = 'complete' } = options ?? {};
  const errors = [];
  if (mode !== 'draft' && mode !== 'complete') {
    return {
      ok: false,
      errors: [issue('mode', 'invalid-mode', 'Modo de validación desconocido.')],
    };
  }
  if (!record(project)) {
    return {
      ok: false,
      errors: [issue('project', 'invalid-project', 'El proyecto debe ser un objeto.')],
    };
  }
  const complete = mode === 'complete';
  requiredText(project.id, 'id', errors);
  if (project.schemaVersion !== SCHEMA_VERSION) {
    errors.push(issue('schemaVersion', 'unsupported-schema', 'Versión de esquema no compatible.'));
  }
  requiredText(project.name, 'name', errors, complete);
  requiredText(project.question, 'question', errors, complete);
  optionalText(project.description, 'description', errors);
  if (
    present(project.workflowStep) &&
    !['details', 'alternatives', 'criteria', 'weights'].includes(project.workflowStep)
  ) {
    errors.push(issue('workflowStep', 'invalid-step', 'Paso del asistente desconocido.'));
  }
  for (const field of ['createdAt', 'updatedAt']) {
    if (!isoDate(project[field]))
      errors.push(issue(field, 'invalid-date', 'Introduce una fecha ISO válida.'));
  }
  if (
    isoDate(project.createdAt) &&
    isoDate(project.updatedAt) &&
    Date.parse(project.updatedAt) < Date.parse(project.createdAt)
  ) {
    errors.push(issue('updatedAt', 'date-order', 'La actualización precede a la creación.'));
  }

  const collections = {};
  for (const key of ['alternatives', 'criteria', 'evaluations', 'scenarios']) {
    if (!Array.isArray(project[key])) {
      errors.push(issue(key, 'invalid-collection', 'Se esperaba una lista.'));
      collections[key] = [];
    } else collections[key] = project[key];
  }
  const { alternatives, criteria, evaluations, scenarios } = collections;
  if (complete && alternatives.length < 2)
    errors.push(
      issue('alternatives', 'insufficient-alternatives', 'Se necesitan al menos dos alternativas.'),
    );
  if (complete && criteria.length < 1)
    errors.push(issue('criteria', 'insufficient-criteria', 'Se necesita al menos un criterio.'));
  const alternativeIds = uniqueIds(alternatives, 'alternatives', errors);
  const criterionIds = uniqueIds(criteria, 'criteria', errors);
  uniqueIds(scenarios, 'scenarios', errors);

  const orders = new Set();
  for (const [index, alternative] of alternatives.entries()) {
    if (!record(alternative)) continue;
    const path = `alternatives[${index}]`;
    requiredText(alternative.name, `${path}.name`, errors, complete);
    optionalText(alternative.description, `${path}.description`, errors);
    if (!Number.isInteger(alternative.order) || alternative.order < 0) {
      errors.push(
        issue(`${path}.order`, 'invalid-order', 'El orden debe ser un entero no negativo.'),
      );
    } else {
      if (orders.has(alternative.order))
        errors.push(issue(`${path}.order`, 'duplicate-order', 'El orden está duplicado.'));
      orders.add(alternative.order);
    }
  }

  let baseSum = 0;
  for (const [index, criterion] of criteria.entries()) {
    if (!record(criterion)) continue;
    const path = `criteria[${index}]`;
    requiredText(criterion.name, `${path}.name`, errors, complete);
    optionalText(criterion.description, `${path}.description`, errors);
    if (present(criterion.type) && !['rating', 'numeric'].includes(criterion.type)) {
      errors.push(issue(`${path}.type`, 'invalid-type', 'Tipo de criterio desconocido.'));
    } else if (complete && !present(criterion.type))
      errors.push(issue(`${path}.type`, 'required', 'Selecciona un tipo de criterio.'));
    if (
      numberField(criterion.weight, `${path}.weight`, errors, {
        required: complete,
        nonnegative: true,
      })
    )
      baseSum += criterion.weight;
    if (criterion.type === 'numeric') {
      requiredText(criterion.unit, `${path}.unit`, errors, complete);
      const minValid = numberField(criterion.min, `${path}.min`, errors, { required: complete });
      const maxValid = numberField(criterion.max, `${path}.max`, errors, { required: complete });
      if (
        minValid &&
        maxValid &&
        (criterion.min >= criterion.max || !Number.isFinite(criterion.max - criterion.min))
      ) {
        errors.push(
          issue(
            `${path}.max`,
            'invalid-range',
            'El límite superior debe superar al inferior con un rango finito.',
          ),
        );
      }
      if (present(criterion.direction) && !['higher', 'lower'].includes(criterion.direction)) {
        errors.push(
          issue(
            `${path}.direction`,
            'invalid-direction',
            'Selecciona mayor o menor valor favorable.',
          ),
        );
      } else if (complete && !present(criterion.direction))
        errors.push(issue(`${path}.direction`, 'required', 'Selecciona un sentido favorable.'));
    }
    if (
      criterion.type === 'rating' &&
      ['unit', 'min', 'max', 'direction'].some((field) => present(criterion[field]))
    ) {
      errors.push(
        issue(
          path,
          'rating-metadata',
          'Una valoración de conveniencia no usa rango ni unidad numérica.',
        ),
      );
    }
  }
  if (complete && (!Number.isFinite(baseSum) || baseSum <= 0)) {
    errors.push(
      issue('criteria', 'zero-weight-sum', 'La suma de pesos debe ser positiva y finita.'),
    );
  }

  const evaluationsSeen = new Set();
  const criteriaById = new Map(criteria.filter(record).map((item) => [item.id, item]));
  for (const [index, evaluation] of evaluations.entries()) {
    if (!record(evaluation)) {
      errors.push(
        issue(`evaluations[${index}]`, 'invalid-item', 'La evaluación debe ser un objeto.'),
      );
      continue;
    }
    const path = `evaluations[${index}]`;
    if (!alternativeIds.has(evaluation.alternativeId))
      errors.push(issue(`${path}.alternativeId`, 'invalid-reference', 'La alternativa no existe.'));
    if (!criterionIds.has(evaluation.criterionId))
      errors.push(issue(`${path}.criterionId`, 'invalid-reference', 'El criterio no existe.'));
    const key = JSON.stringify([evaluation.alternativeId, evaluation.criterionId]);
    if (evaluationsSeen.has(key))
      errors.push(issue(path, 'duplicate-evaluation', 'La evaluación está duplicada.'));
    evaluationsSeen.add(key);
    const criterion = criteriaById.get(evaluation.criterionId);
    const valueValid = numberField(evaluation.value, `${path}.value`, errors, {
      required: complete,
    });
    if (
      valueValid &&
      criterion?.type === 'rating' &&
      (!Number.isInteger(evaluation.value) || evaluation.value < 0 || evaluation.value > 5)
    ) {
      errors.push(
        issue(`${path}.value`, 'rating-out-of-range', 'La valoración debe ser un entero de 0 a 5.'),
      );
    }
    if (
      valueValid &&
      criterion?.type === 'numeric' &&
      Number.isFinite(criterion.min) &&
      Number.isFinite(criterion.max) &&
      (evaluation.value < criterion.min || evaluation.value > criterion.max)
    ) {
      errors.push(
        issue(`${path}.value`, 'numeric-out-of-range', 'El valor está fuera del rango definido.'),
      );
    }
  }
  if (complete) {
    for (const [ai, alternative] of alternatives.entries()) {
      for (const [ci, criterion] of criteria.entries()) {
        if (!record(alternative) || !record(criterion)) continue;
        const key = JSON.stringify([alternative.id, criterion.id]);
        if (!evaluationsSeen.has(key))
          errors.push(
            issue(
              `evaluations.${alternative.id}.${criterion.id}`,
              'missing-evaluation',
              `Falta evaluar ${alternative.name || `alternativa ${ai + 1}`} en ${criterion.name || `criterio ${ci + 1}`}.`,
            ),
          );
      }
    }
  }

  for (const [index, scenario] of scenarios.entries()) {
    if (!record(scenario)) continue;
    const path = `scenarios[${index}]`;
    for (const field of Object.keys(scenario)) {
      if (!['id', 'name', 'weights'].includes(field)) {
        errors.push(
          issue(
            `${path}.${field}`,
            'scenario-extra-field',
            'Un escenario solo puede definir nombre y pesos.',
          ),
        );
      }
    }
    requiredText(scenario.name, `${path}.name`, errors, complete);
    if (!record(scenario.weights)) {
      errors.push(
        issue(
          `${path}.weights`,
          'invalid-weights',
          'Los pesos deben ser un objeto por identificador de criterio.',
        ),
      );
      continue;
    }
    let sum = 0;
    for (const [criterionId, weight] of Object.entries(scenario.weights)) {
      if (!criterionIds.has(criterionId))
        errors.push(
          issue(`${path}.weights.${criterionId}`, 'invalid-reference', 'El criterio no existe.'),
        );
      if (numberField(weight, `${path}.weights.${criterionId}`, errors, { nonnegative: true }))
        sum += weight;
    }
    if (complete) {
      for (const criterion of criteria) {
        if (record(criterion) && !Object.hasOwn(scenario.weights, criterion.id))
          errors.push(
            issue(
              `${path}.weights.${criterion.id}`,
              'missing-weight',
              'Falta el peso de este criterio.',
            ),
          );
      }
      if (!Number.isFinite(sum) || sum <= 0)
        errors.push(
          issue(
            `${path}.weights`,
            'zero-weight-sum',
            'La suma de pesos debe ser positiva y finita.',
          ),
        );
    }
  }
  return { ok: errors.length === 0, errors };
}
