export const routeNames = Object.freeze({
  dashboard: 'Resumen',
  comparisons: 'Mis comparaciones',
  evaluation: 'Evaluación',
  results: 'Resultados',
  scenarios: 'Escenarios',
  settings: 'Configuración',
  new: 'Nueva comparación',
  example: 'Ejemplo',
  project: 'Proyecto',
});

export function parseRoute(hash) {
  const path = hash.startsWith('#/') ? hash.slice(2) : '';
  if (/^project\/[^/]+(?:\/(?:details|alternatives|criteria|weights))?$/.test(path))
    return 'project';
  return Object.hasOwn(routeNames, path) ? path : path ? 'not-found' : 'dashboard';
}

export function createRouter(browserWindow, onChange) {
  let lastHash = null;
  function renderCurrent() {
    if (browserWindow.location.hash === lastHash) return;
    lastHash = browserWindow.location.hash;
    onChange(parseRoute(browserWindow.location.hash));
  }
  function start() {
    if (!browserWindow.location.hash || browserWindow.location.hash === '#/') {
      browserWindow.history.replaceState(null, '', '#/dashboard');
    }
    browserWindow.addEventListener('hashchange', renderCurrent);
    browserWindow.addEventListener('popstate', renderCurrent);
    renderCurrent();
  }
  return {
    start,
    renderCurrent,
    resetCurrentHash: () => {
      lastHash = browserWindow.location.hash;
    },
  };
}
