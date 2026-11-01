const paths = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  arrow: '<path d="M5 19 19 5M8 5h11v11"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  chart: '<path d="M4 19V5M4 19h16M8 15l4-5 3 2 5-6"/>',
};

export function icon(name) {
  const path = paths[name];
  if (!path) throw new Error(`Icono desconocido: ${name}`);
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}
