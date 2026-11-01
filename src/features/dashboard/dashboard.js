import { validateProject } from '../../domain/validation.js';

export function renderDashboard() {
  return `<div class="page-title"><div><h1>Tus comparaciones</h1><p>Continúa un proyecto o inicia una nueva decisión.</p></div><a class="btn btn--primary" href="#/new">＋ Nueva comparación</a></div>
    <div id="dashboard-content"></div>`;
}

function link(label, href, className) {
  const anchor = document.createElement('a');
  anchor.className = className;
  anchor.href = href;
  anchor.textContent = label;
  return anchor;
}

export function mountDashboard(main, records) {
  const content = main.querySelector('#dashboard-content');
  content.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('section');
    empty.className = 'dashboard-empty';
    const heading = document.createElement('h2');
    heading.textContent = 'Todavía no hay comparaciones';
    const description = document.createElement('p');
    description.textContent =
      'Crea un proyecto para definir tu decisión o prueba el ejemplo completo.';
    const actions = document.createElement('div');
    actions.className = 'dashboard-actions';
    actions.append(
      link('Nueva comparación', '#/new', 'btn btn--primary'),
      link('Abrir ejemplo', '#/example', 'btn btn--outline'),
    );
    empty.append(heading, description, actions);
    content.append(empty);
    return;
  }
  const recent = records[0].project;
  const draftCount = records.filter(
    ({ project }) => !validateProject(project, { mode: 'complete', scenarioMode: 'base' }).ok,
  ).length;
  const grid = document.createElement('div');
  grid.className = 'dashboard-summary';
  const recentCard = document.createElement('article');
  recentCard.className = 'feature-project';
  const badge = document.createElement('span');
  badge.className = `status ${validateProject(recent, { mode: 'complete', scenarioMode: 'base' }).ok ? 'status--done' : 'status--warn'}`;
  badge.textContent = validateProject(recent, { mode: 'complete', scenarioMode: 'base' }).ok
    ? 'Completa'
    : 'Borrador';
  const heading = document.createElement('h2');
  heading.textContent = recent.name.trim() || 'Sin título';
  const question = document.createElement('p');
  question.textContent = recent.question.trim() || 'Añade una pregunta de decisión.';
  recentCard.append(
    badge,
    heading,
    question,
    link('Continuar proyecto →', `#/project/${encodeURIComponent(recent.id)}`, 'btn btn--outline'),
  );
  if (validateProject(recent, { mode: 'complete', scenarioMode: 'base' }).ok)
    recentCard.append(
      link('Ver resultados →', `#/project/${encodeURIComponent(recent.id)}/results`, 'text-link'),
    );
  const example = document.createElement('article');
  example.className = 'try-card';
  const exampleHeading = document.createElement('h2');
  exampleHeading.textContent = 'Ejemplo de comparación';
  const exampleText = document.createElement('p');
  exampleText.textContent = 'Crea una copia editable de los datos aprobados para explorarla.';
  example.append(
    exampleHeading,
    exampleText,
    link('Abrir ejemplo →', '#/example', 'btn btn--outline'),
  );
  grid.append(recentCard, example);
  const summary = document.createElement('p');
  summary.className = 'dashboard-count';
  summary.textContent = `${records.length} ${records.length === 1 ? 'proyecto guardado' : 'proyectos guardados'} · ${draftCount} ${draftCount === 1 ? 'borrador' : 'borradores'}`;
  content.append(grid, summary, link('Ver mis comparaciones →', '#/comparisons', 'text-link'));
}
