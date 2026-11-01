export function brand({ href, small = false } = {}) {
  const mark =
    '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M6 16h7c5 0 5-8 11-8h2M13 16c5 0 5 8 11 8h2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="6" cy="16" r="2" fill="currentColor"/><circle cx="26" cy="8" r="2" fill="currentColor"/><circle cx="26" cy="24" r="2" fill="currentColor"/></svg></span>';
  const content = `${mark}<span class="brand-name">Decision<span>Lab</span></span>`;
  return href
    ? `<a class="brand${small ? ' brand--small' : ''}" href="${href}" aria-label="DecisionLab, inicio">${content}</a>`
    : `<span class="brand${small ? ' brand--small' : ''}">${content}</span>`;
}
