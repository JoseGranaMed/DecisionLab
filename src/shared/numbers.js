const ambiguousNumber = (text) => /^[+-]?[1-9]\d{0,2}[.,]\d{3}$/.test(text);

/** Accept one decimal separator, but reject thousands separators and ambiguous forms. */
export function parseInputNumber(raw) {
  const text = raw.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return Number.NaN;
  if (ambiguousNumber(text)) return Number.NaN;
  return Number(text.replace(',', '.'));
}

export { ambiguousNumber };
