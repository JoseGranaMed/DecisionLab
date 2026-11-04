import { wizardPath } from '../wizard/wizard.js';
import { formatDifference, formatInput, prepareResults } from './presentation.js';

const node = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};
const link = (label, href, className = 'btn btn--outline') => {
  const anchor = node('a', className, label);
  anchor.href = href;
  return anchor;
};
const dateText = (value) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value));

function stepForError(error) {
  if (['name', 'question', 'description'].includes(error.path)) return 'details';
  if (error.path.startsWith('alternatives')) return 'alternatives';
  if (
    error.code === 'zero-weight-sum' ||
    error.path.includes('.weight') ||
    error.path === 'weights' ||
    error.path.startsWith('scenarios')
  )
    return 'weights';
  if (error.path.startsWith('evaluations')) return 'evaluation';
  return 'criteria';
}

export function renderResultsPage() {
  return '<section id="results-workspace" class="results-workspace"></section>';
}

function renderTitle(workspace, project) {
  const title = node('header', 'results-title');
  title.append(
    node('p', 'results-kicker', 'Resultados · Escenario base'),
    node('h1', '', project.name.trim() || 'Comparación sin nombre'),
    node('p', 'results-question', project.question.trim() || 'Pregunta de decisión pendiente'),
    node('small', 'results-date', `Actualizado el ${dateText(project.updatedAt)}`),
  );
  workspace.append(title);
}

function renderIncomplete(workspace, prepared, id) {
  const section = node('section', 'results-incomplete');
  section.append(node('h2', '', 'Resultados pendientes'));
  if (prepared.kind === 'missing') {
    const count = prepared.progress.remaining;
    section.append(
      node(
        'p',
        '',
        `${count === 1 ? 'Falta' : 'Faltan'} ${count} ${count === 1 ? 'evaluación' : 'evaluaciones'} para calcular los resultados. Las respuestas existentes se conservan.`,
      ),
      link('Completar evaluación →', wizardPath(id, 'evaluation'), 'btn btn--primary'),
    );
  } else {
    section.append(
      node(
        'p',
        '',
        'Completa la configuración para calcular una clasificación con los datos vigentes.',
      ),
    );
    const list = node('ul', 'results-errors');
    const seen = new Set();
    for (const error of prepared.errors) {
      const key = `${error.path}:${error.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const item = node('li');
      item.append(
        node('span', '', error.message),
        link('Revisar →', wizardPath(id, stepForError(error)), 'text-link'),
      );
      list.append(item);
    }
    section.append(list);
  }
  workspace.append(section);
}

function renderSummary(workspace, prepared) {
  const section = node('section', 'results-summary');
  section.setAttribute('aria-labelledby', 'results-summary-heading');
  section.append(node('p', 'results-kicker', 'Mayor puntuación'));
  const names = prepared.leaders.map(({ name }) => name);
  const heading = node(
    'h2',
    '',
    names.length === 1
      ? `${names[0]} obtiene la mayor puntuación`
      : `${names.join(' y ')} comparten la primera posición`,
  );
  heading.id = 'results-summary-heading';
  const score = node('p', 'results-summary-score', `${prepared.leaders[0].formattedScore} / 100`);
  const explanation = node(
    'p',
    'results-summary-context',
    'Este orden depende de las evaluaciones, los criterios y los pesos actuales. No establece una opción objetivamente mejor.',
  );
  section.append(heading, score, explanation);
  workspace.append(section);
}

function renderRanking(workspace, prepared) {
  const section = node('section', 'results-ranking');
  const heading = node('h2', '', 'Clasificación');
  heading.id = 'results-ranking-heading';
  section.setAttribute('aria-labelledby', heading.id);
  section.append(
    heading,
    node('p', 'results-section-intro', 'Puntuaciones de 0 a 100, ordenadas antes de redondear.'),
  );
  const list = node('ol', 'results-ranking-list');
  for (const result of prepared.results) {
    const item = node('li', 'results-ranking-item');
    const line = node('div', 'results-ranking-line');
    line.append(
      node('span', 'results-rank', `${result.rank}.`),
      node('strong', 'results-name', result.name),
      node('strong', 'results-score', `${result.formattedScore} / 100`),
    );
    const track = node('div', 'results-bar-track');
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `${result.name}: ${result.formattedScore} de 100 puntos`);
    const bar = node('span', 'results-bar');
    bar.style.width = `${Math.max(0, Math.min(100, result.score))}%`;
    track.append(bar);
    item.append(line, track);
    if (result.rank > 1)
      item.append(
        node(
          'p',
          'results-difference',
          `${formatDifference(result.difference)} ${result.difference < 0.01 ? 'punto' : 'puntos'} por debajo de la primera posición.`,
        ),
      );
    if (result.apparentTieWithPrevious)
      item.append(
        node(
          'p',
          'results-precision-note',
          'Esta puntuación se ve igual que la anterior al mostrar dos decimales, pero los valores completos son distintos.',
        ),
      );
    list.append(item);
  }
  section.append(list);
  workspace.append(section);
}

function definition(label, value) {
  const pair = node('div');
  pair.append(node('dt', '', label), node('dd', '', value));
  return pair;
}

function renderContribution(contribution) {
  const criterion = contribution.criterion;
  const row = node('section', 'results-criterion');
  row.append(node('h4', '', contribution.criterionName));
  if (criterion.type === 'numeric')
    row.append(
      node(
        'p',
        'results-criterion-context',
        `Unidad: ${criterion.unit} · ${criterion.direction === 'lower' ? 'menor valor es mejor' : 'mayor valor es mejor'} · rango ${formatInput(criterion.min)}–${formatInput(criterion.max)}`,
      ),
    );
  const data = node('dl', 'results-contribution-data');
  data.append(
    definition(
      criterion.type === 'rating' ? 'Valoración' : 'Valor introducido',
      criterion.type === 'rating'
        ? `${formatInput(contribution.value)} de 5`
        : formatInput(contribution.value),
    ),
    definition('Normalizado', `${contribution.formattedNormalized} / 100`),
    definition('Peso', formatInput(contribution.rawWeight)),
    definition('Importancia', `${contribution.formattedImportance} %`),
    definition('Aporte', `${contribution.formattedPoints} puntos`),
  );
  row.append(data);
  return row;
}

function renderBreakdown(workspace, prepared) {
  const section = node('section', 'results-breakdowns');
  const heading = node('h2', '', 'Cómo se obtuvo cada puntuación');
  heading.id = 'results-breakdowns-heading';
  section.setAttribute('aria-labelledby', heading.id);
  section.append(
    heading,
    node(
      'p',
      'results-section-intro',
      'La importancia es la proporción del peso. El aporte son los puntos que cada criterio suma. La puntuación usa los aportes completos; aquí se muestran dos decimales.',
    ),
  );
  for (const [index, result] of prepared.results.entries()) {
    const details = node('details', 'results-breakdown');
    if (index === 0) details.open = true;
    const summary = node('summary');
    summary.append(
      node('span', '', `${result.rank}. ${result.name}`),
      node('strong', '', `${result.formattedScore} / 100`),
    );
    const body = node('div', 'results-breakdown-body');
    body.append(node('h3', 'sr-only', `Desglose de ${result.name}`));
    const criteria = node('div', 'results-criteria');
    for (const contribution of result.contributions)
      criteria.append(renderContribution(contribution));
    body.append(criteria);
    details.append(summary, body);
    section.append(details);
  }
  workspace.append(section);
}

function renderComparison(workspace, comparison) {
  if (!comparison) return;
  const section = node('section', 'results-comparison');
  const heading = node('h2', '', 'Diferencia entre las primeras posiciones');
  heading.id = 'results-comparison-heading';
  section.setAttribute('aria-labelledby', heading.id);
  section.append(
    heading,
    node(
      'p',
      '',
      `${comparison.leaderName} supera a ${comparison.runnerName} por ${formatDifference(comparison.difference)} puntos. Cada línea compara el aporte del mismo criterio; un aporte alto por sí solo no explica toda la diferencia.`,
    ),
  );
  const list = node('ul', 'results-delta-list');
  for (const item of comparison.criteria) {
    const sign = item.delta > 0 ? '+' : item.delta < 0 ? '−' : '';
    const line = node('li');
    line.append(
      node('span', '', item.name),
      node('strong', '', `${sign}${formatDifference(Math.abs(item.delta))} puntos`),
    );
    list.append(line);
  }
  section.append(list);
  workspace.append(section);
}

export function mountResultsPage(main, project, id) {
  const workspace = main.querySelector('#results-workspace');
  renderTitle(workspace, project);
  const prepared = prepareResults(project);
  if (prepared.kind !== 'ready') {
    renderIncomplete(workspace, prepared, id);
    workspace.append(link('Ver estado del informe', `#/project/${encodeURIComponent(id)}/report`));
    return;
  }
  renderSummary(workspace, prepared);
  renderRanking(workspace, prepared);
  renderBreakdown(workspace, prepared);
  renderComparison(workspace, prepared.comparison);
  const actions = node('div', 'results-actions');
  actions.append(
    link(
      'Ver informe imprimible',
      `#/project/${encodeURIComponent(id)}/report`,
      'btn btn--outline',
    ),
    link(
      'Comparar escenarios',
      `#/project/${encodeURIComponent(id)}/scenarios`,
      'btn btn--primary',
    ),
    link('Editar evaluación', wizardPath(id, 'evaluation')),
    link('Cambiar pesos', wizardPath(id, 'weights'), 'text-link'),
  );
  workspace.append(actions);
}

export function renderResultsIndex() {
  return '<div class="page-title"><div><h1>Resultados</h1><p>Abre los resultados de una comparación guardada.</p></div></div><section id="results-index" class="results-index"></section>';
}

export function mountResultsIndex(main, records) {
  const index = main.querySelector('#results-index');
  if (!records.length) {
    index.append(
      node('p', 'empty-state', 'Todavía no hay comparaciones guardadas.'),
      link('Mis comparaciones →', '#/comparisons', 'btn btn--primary'),
    );
    return;
  }
  for (const record of records) {
    const project = record.project;
    const prepared = prepareResults(project);
    const article = node('article', 'results-index-item');
    article.append(
      node('h2', '', project.name.trim() || 'Sin título'),
      node('p', '', project.question.trim() || 'Pregunta pendiente'),
      node(
        'small',
        '',
        prepared.kind === 'ready'
          ? 'Comparación completa'
          : prepared.kind === 'missing'
            ? `${prepared.progress.remaining} respuestas pendientes`
            : 'Configuración pendiente',
      ),
      link(
        prepared.kind === 'ready' ? 'Ver resultados →' : 'Revisar proyecto →',
        wizardPath(record.id, 'results'),
      ),
    );
    index.append(article);
  }
}
