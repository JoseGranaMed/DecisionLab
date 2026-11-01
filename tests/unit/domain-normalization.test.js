import { describe, expect, it } from 'vitest';
import { normalizeNumeric, normalizeRating, normalizeWeights } from '../../src/domain/index.js';

describe('normalización', () => {
  it('convierte los extremos y el punto medio de una valoración entera', () => {
    expect(normalizeRating(0).value).toBe(0);
    expect(normalizeRating(3).value).toBe(60);
    expect(normalizeRating(5).value).toBe(100);
    expect(normalizeRating(2.5).errors[0].code).toBe('rating-out-of-range');
    expect(normalizeRating(Infinity).ok).toBe(false);
  });

  it('normaliza valores numéricos ascendentes y descendentes en los límites exactos', () => {
    const range = { min: 0, max: 200 };
    expect(normalizeNumeric(0, { ...range, direction: 'higher' }).value).toBe(0);
    expect(normalizeNumeric(200, { ...range, direction: 'higher' }).value).toBe(100);
    expect(normalizeNumeric(50, { ...range, direction: 'higher' }).value).toBe(25);
    expect(normalizeNumeric(0, { ...range, direction: 'lower' }).value).toBe(100);
    expect(normalizeNumeric(200, { ...range, direction: 'lower' }).value).toBe(0);
    expect(normalizeNumeric(50, { ...range, direction: 'lower' }).value).toBe(75);
    expect(normalizeNumeric(2.5, { min: -10, max: 10, direction: 'higher' }).value).toBe(62.5);
  });

  it('rechaza rangos incorrectos, valores externos y no finitos sin recortarlos', () => {
    expect(normalizeNumeric(201, { min: 0, max: 200, direction: 'lower' }).errors[0].code).toBe(
      'numeric-out-of-range',
    );
    expect(normalizeNumeric(-1, { min: 0, max: 200, direction: 'lower' }).ok).toBe(false);
    expect(normalizeNumeric(5, { min: 10, max: 10, direction: 'higher' }).errors[0].code).toBe(
      'invalid-range',
    );
    expect(normalizeNumeric(NaN, { min: 0, max: 200, direction: 'higher' }).errors[0].code).toBe(
      'invalid-number',
    );
    expect(normalizeNumeric(5, null).errors[0].code).toBe('invalid-range');
  });

  it('acepta pesos arbitrarios y cero, pero rechaza suma cero y pesos inválidos', () => {
    const criteria = [
      { id: 'ease', weight: 3 },
      { id: 'cost', weight: 2 },
      { id: 'support', weight: 0 },
    ];
    expect(normalizeWeights(criteria).value.map((item) => item.proportion)).toEqual([0.6, 0.4, 0]);
    expect(
      normalizeWeights(criteria, { ease: 1, cost: 3, support: 0 }).value.map(
        (item) => item.proportion,
      ),
    ).toEqual([0.25, 0.75, 0]);
    expect(normalizeWeights(criteria, { ease: 0, cost: 0, support: 0 }).errors[0].code).toBe(
      'zero-weight-sum',
    );
    expect(
      normalizeWeights([{ id: 'x', weight: -1 }]).errors.some(
        (error) => error.code === 'negative-weight',
      ),
    ).toBe(true);
    expect(
      normalizeWeights([{ id: 'x', weight: '3' }]).errors.some(
        (error) => error.code === 'invalid-number',
      ),
    ).toBe(true);
    expect(
      normalizeWeights(criteria, { ease: 1, cost: 1, unknown: 1 }).errors.some(
        (error) => error.code === 'invalid-reference',
      ),
    ).toBe(true);
  });
});
