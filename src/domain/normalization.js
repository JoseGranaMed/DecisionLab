const failure = (path, code, message) => ({ ok: false, errors: [{ path, code, message }] });

/** Convenience rating: the MVP accepts integer steps from 0 through 5. */
export function normalizeRating(value) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 5
  ) {
    return failure('value', 'rating-out-of-range', 'La valoración debe ser un entero de 0 a 5.');
  }
  return { ok: true, value: (value / 5) * 100 };
}

/** Normalizes an in-range numeric value without clamping it. */
export function normalizeNumeric(value, criterion = {}) {
  const { min, max, direction } = criterion ?? {};
  if (
    typeof min !== 'number' ||
    !Number.isFinite(min) ||
    typeof max !== 'number' ||
    !Number.isFinite(max) ||
    min >= max ||
    !Number.isFinite(max - min)
  ) {
    return failure(
      'criterion.max',
      'invalid-range',
      'El rango numérico debe ser creciente y finito.',
    );
  }
  if (!['higher', 'lower'].includes(direction)) {
    return failure(
      'criterion.direction',
      'invalid-direction',
      'Selecciona mayor o menor valor favorable.',
    );
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return failure('value', 'invalid-number', 'Introduce un número finito.');
  }
  if (value < min || value > max) {
    return failure('value', 'numeric-out-of-range', 'El valor está fuera del rango definido.');
  }
  const ratio = direction === 'higher' ? (value - min) / (max - min) : (max - value) / (max - min);
  return { ok: true, value: ratio * 100 };
}

/** Returns criterion proportions in input order; override must contain exactly the same IDs. */
export function normalizeWeights(criteria, override) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return failure('criteria', 'insufficient-criteria', 'Se necesita al menos un criterio.');
  }
  if (
    override !== undefined &&
    (override === null || typeof override !== 'object' || Array.isArray(override))
  ) {
    return failure('weights', 'invalid-weights', 'Los pesos deben ser un objeto por criterio.');
  }
  const errors = [];
  const ids = new Set();
  const weights = [];
  let sum = 0;
  for (const [index, criterion] of criteria.entries()) {
    const id = criterion?.id;
    const path = override ? `weights.${id}` : `criteria[${index}].weight`;
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) {
      errors.push({
        path: `criteria[${index}].id`,
        code: 'invalid-id',
        message: 'El identificador falta o está duplicado.',
      });
      continue;
    }
    ids.add(id);
    if (override && !Object.hasOwn(override, id)) {
      errors.push({
        path: `weights.${id}`,
        code: 'missing-weight',
        message: 'Falta el peso del criterio.',
      });
      continue;
    }
    const weight = override ? override[id] : criterion.weight;
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      errors.push({ path, code: 'invalid-number', message: 'El peso debe ser un número finito.' });
    } else if (weight < 0) {
      errors.push({ path, code: 'negative-weight', message: 'El peso no puede ser negativo.' });
    } else {
      sum += weight;
      weights.push({ criterionId: id, rawWeight: weight });
    }
  }
  if (override) {
    for (const id of Object.keys(override)) {
      if (!ids.has(id))
        errors.push({
          path: `weights.${id}`,
          code: 'invalid-reference',
          message: 'El criterio no existe.',
        });
    }
  }
  if (!Number.isFinite(sum) || sum <= 0)
    errors.push({
      path: 'weights',
      code: 'zero-weight-sum',
      message: 'La suma de pesos debe ser positiva y finita.',
    });
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: weights.map(({ criterionId, rawWeight }) => ({
      criterionId,
      rawWeight,
      proportion: rawWeight / sum,
    })),
  };
}
