import { example } from '../../shared/demo/example.js';

const heading = (title, description) =>
  `<div class="page-title"><div><h1>${title}</h1><p>${description}</p></div></div>`;
const note =
  '<p class="demo-note">Vista ilustrativa. Los resultados interactivos se incorporarán en otra fase.</p>';

function evaluation() {
  return `${heading('Evaluación', 'Herramientas para el equipo · borrador de muestra')}${note}
    <div class="demo-panel"><div class="demo-step">Paso 4 de 6 <strong>Evaluar</strong></div>
      <div class="progress-track" role="img" aria-label="8 de 12 evaluaciones completadas"><span style="width:66.67%"></span></div>
      <h2>8 de 12 respuestas</h2><p>La matriz y los controles de evaluación se incorporarán en una iteración posterior.</p>
      <a class="btn btn--outline" href="#/comparisons">← Mis comparaciones</a></div>`;
}

function results() {
  return `${heading('Resultados del ejemplo', 'Herramientas para el equipo · escenario base')}${note}
    <div class="demo-panel"><span class="demo-overline">Mayor puntuación</span><h2>Herramienta A · 67,50 / 100</h2>
      <p>Supera a B por 1,25 puntos. Este orden depende de los criterios y pesos del ejemplo.</p>
      <div class="ranking-list">${example.alternatives.map((item, index) => `<div class="ranking-row"><span>0${index + 1}</span><b>${item.name}</b><div class="ranking-track"><i style="width:${item.percent}"></i></div><strong>${item.base}</strong></div>`).join('')}</div>
      <a class="btn btn--primary" href="#/scenarios">Comparar escenarios →</a></div>`;
}

function scenarios() {
  return `${heading('Comparar escenarios', 'Solo cambian los pesos; las evaluaciones permanecen iguales.')}${note}
    <div class="demo-panel"><h2>El costo cambia el orden</h2><p>En el escenario alternativo, B queda primera.</p>
      <div class="scenario-sample"><div><small>Base</small><strong>A · 67,50</strong><span>B · 66,25</span></div>
        <div><small>Alternativo</small><strong>B · 70,00</strong><span>A · 60,00</span></div></div>
      <a class="btn btn--outline" href="#/results">← Volver a resultados</a></div>`;
}

function settings() {
  return `${heading('Configuración', 'Preferencias y datos de este navegador')}${note}
    <div class="demo-panel"><h2>Datos locales</h2><p>Los proyectos se guardan en este navegador. Si se borran los datos del sitio, pueden perderse. La importación y exportación se incorporarán más adelante.</p></div>`;
}

function notFound() {
  return `${heading('Página no encontrada', 'La ruta solicitada no existe en DecisionLab.')}
    <div class="demo-panel"><p>Usa el menú para elegir una vista disponible.</p><a class="btn btn--primary" href="#/dashboard">Ir al resumen</a></div>`;
}

const views = { evaluation, results, scenarios, settings };
export function renderDemoView(route) {
  return (views[route] ?? notFound)();
}
