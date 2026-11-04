const heading = (title, description) =>
  `<div class="page-title"><div><h1>${title}</h1><p>${description}</p></div></div>`;

function evaluation() {
  return `${heading('Evaluación', 'Abre una comparación guardada para registrar sus respuestas.')}
    <div class="demo-panel"><a class="btn btn--primary" href="#/comparisons">Mis comparaciones →</a></div>`;
}

function notFound() {
  return `${heading('Página no encontrada', 'La ruta solicitada no existe en DecisionLab.')}
    <div class="demo-panel"><p>Usa el menú para elegir una vista disponible.</p><a class="btn btn--primary" href="#/dashboard">Ir al resumen</a></div>`;
}

const views = { evaluation };
export function renderDemoView(route) {
  return (views[route] ?? notFound)();
}
