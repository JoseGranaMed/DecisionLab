import {
  formatDifference,
  formatImportance,
  formatInput,
  formatScore,
} from '../results/presentation.js';
import { wizardPath } from '../wizard/wizard.js';
import { prepareReport } from './presentation.js';

const node = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};
const link = (content, href) => {
  const anchor = node('a', 'text-link', content);
  anchor.href = href;
  return anchor;
};
const dateText = (value) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(value));
const signed = (value) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatDifference(Math.abs(value))}`;

export function renderReportPage() {
  return '<section id="report-workspace" class="report-workspace"></section>';
}

function section(title, className = '') {
  const element = node('section', `report-section ${className}`);
  element.append(node('h2', '', title));
  return element;
}

function detailsRow(term, value) {
  const row = node('div', 'report-detail');
  row.append(node('dt', '', term), node('dd', '', value));
  return row;
}

function stepForError(error) {
  if (['name', 'question', 'description'].includes(error.path)) return 'details';
  if (error.path.startsWith('alternatives')) return 'alternatives';
  if (error.path.startsWith('evaluations')) return 'evaluation';
  if (error.code === 'zero-weight-sum' || error.path.includes('.weight')) return 'weights';
  return 'criteria';
}

function incomplete(workspace, prepared, id) {
  workspace.append(
    node('h1', '', 'Informe pendiente'),
    node('p', '', 'Completa la comparación antes de imprimir una clasificación definitiva.'),
  );
  const list = node('ul', 'report-pending-list');
  if (prepared.kind === 'missing') {
    const item = node('li');
    item.append(
      node('span', '', `${prepared.progress.remaining} evaluaciones pendientes.`),
      link('Completar evaluación →', wizardPath(id, 'evaluation')),
    );
    list.append(item);
  } else
    for (const error of prepared.errors) {
      const item = node('li');
      item.append(
        node('span', '', error.message),
        link('Revisar →', wizardPath(id, stepForError(error))),
      );
      list.append(item);
    }
  workspace.append(list, link('← Volver a resultados', wizardPath(id, 'results')));
}

function configuration(workspace, report) {
  const sectionElement = section('Configuración');
  sectionElement.append(node('h3', '', 'Alternativas'));
  const alternatives = node('ol', 'report-simple-list');
  for (const alternative of report.project.alternatives)
    alternatives.append(node('li', '', alternative.name));
  sectionElement.append(alternatives, node('h3', '', 'Criterios y prioridades'));
  sectionElement.append(
    node('p', 'report-scroll-hint', 'Desliza la tabla para ver pesos e importancia.'),
  );
  const scroll = node('div', 'report-table-scroll');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute(
    'aria-label',
    'Criterios y prioridades; desplázate horizontalmente si es necesario',
  );
  const table = node('table', 'report-table');
  const head = node('thead');
  const headings = node('tr');
  for (const text of ['Criterio', 'Tipo y rango', 'Peso', 'Importancia']) {
    const th = node('th', '', text);
    th.scope = 'col';
    headings.append(th);
  }
  head.append(headings);
  const body = node('tbody');
  for (const criterion of report.criteria) {
    const row = node('tr');
    const name = node('th', '', criterion.name);
    name.scope = 'row';
    row.append(
      name,
      node(
        'td',
        '',
        criterion.type === 'rating'
          ? 'Valoración · 0–5'
          : `${criterion.unit} · ${formatInput(criterion.min)}–${formatInput(criterion.max)} · ${criterion.direction === 'lower' ? 'menor es mejor' : 'mayor es mejor'}`,
      ),
      node('td', '', formatInput(criterion.weight)),
      node('td', '', `${formatImportance(criterion.proportion)} %`),
    );
    body.append(row);
  }
  table.append(head, body);
  scroll.append(table);
  sectionElement.append(scroll);
  workspace.append(sectionElement);
}

function evaluations(workspace, report) {
  const sectionElement = section('Evaluaciones utilizadas');
  const opening = node('div', 'report-keep-together');
  opening.append(sectionElement.querySelector('h2'));
  sectionElement.append(opening);
  for (const [index, group] of report.evaluations.entries()) {
    const article = node('article', 'report-evaluation');
    article.append(node('h3', '', group.alternative.name));
    const values = node('dl', 'report-details');
    for (const { criterion, value } of group.values)
      values.append(
        detailsRow(
          criterion.name,
          `${formatInput(value)}${criterion.type === 'numeric' ? ` ${criterion.unit}` : ' / 5'}`,
        ),
      );
    article.append(values);
    (index === 0 ? opening : sectionElement).append(article);
  }
  workspace.append(sectionElement);
}

function results(workspace, report) {
  const sectionElement = section('Clasificación · escenario base');
  sectionElement.append(
    node('p', '', 'Puntuaciones sobre 100, calculadas con los pesos y respuestas indicados.'),
  );
  for (const result of report.results) {
    const article = node('article', 'report-result');
    const heading = node('h3');
    heading.append(
      node('span', '', `${result.rank}.º ${result.name}`),
      node('strong', '', `${formatScore(result.score)} / 100`),
    );
    const track = node('div', 'report-bar-track');
    const bar = node('span', 'report-bar');
    bar.style.width = `${result.score}%`;
    track.append(bar);
    track.setAttribute('aria-hidden', 'true');
    article.append(heading, track);
    if (result.actualTieWithPrevious)
      article.append(node('p', 'report-tie', 'Empate real con la posición anterior.'));
    if (result.apparentTieWithPrevious)
      article.append(
        node(
          'p',
          'report-tie',
          'Empate aparente a dos decimales; la clasificación usa valores completos.',
        ),
      );
    const contributions = node('dl', 'report-details');
    for (const item of result.contributions)
      contributions.append(
        detailsRow(
          item.criterionName,
          `${formatScore(item.points)} puntos · importancia ${formatImportance(item.proportion)} %`,
        ),
      );
    article.append(contributions);
    sectionElement.append(article);
  }
  workspace.append(sectionElement);
}

function scenario(workspace, report) {
  if (!report.scenario) {
    if (report.scenarioIssue)
      workspace.append(
        node(
          'p',
          'report-note',
          `El escenario alternativo no se incluye porque necesita corrección: ${report.scenarioIssue}`,
        ),
      );
    return;
  }
  const compared = report.scenario;
  const sectionElement = section(`Escenario alternativo · ${compared.name}`);
  const introduction = node('div', 'report-keep-together');
  introduction.append(
    sectionElement.querySelector('h2'),
    node(
      'p',
      '',
      'Solo cambian los pesos. Las alternativas, criterios y respuestas son los mismos. Un ascenso de posición no representa una mejora objetiva.',
    ),
  );
  const weights = node('dl', 'report-details');
  for (const item of compared.alternate.weights) {
    const criterion = report.criteria.find((entry) => entry.id === item.criterionId);
    weights.append(
      detailsRow(
        criterion.name,
        `Peso ${formatInput(item.rawWeight)} · importancia ${formatImportance(item.proportion)} %`,
      ),
    );
  }
  const weightGroup = node('div', 'report-keep-together');
  weightGroup.append(node('h3', '', 'Pesos alternativos'), weights);
  introduction.append(weightGroup);
  sectionElement.append(introduction, node('h3', '', 'Comparación de resultados'));
  for (const change of compared.changes) {
    const article = node('article', 'report-scenario-result');
    article.append(
      node('h4', '', change.name),
      node(
        'p',
        '',
        `Base ${formatScore(change.baseScore)} (${change.baseRank}.º) → alternativo ${formatScore(change.alternateScore)} (${change.alternateRank}.º). Diferencia ${signed(change.scoreDelta)} puntos.`,
      ),
    );
    const contributions = node('dl', 'report-details');
    for (const item of change.contributions) {
      const criterion = report.criteria.find((entry) => entry.id === item.criterionId);
      contributions.append(
        detailsRow(
          criterion.name,
          `${formatScore(item.basePoints)} → ${formatScore(item.alternatePoints)} · ${signed(item.delta)} puntos`,
        ),
      );
    }
    article.append(contributions);
    sectionElement.append(article);
  }
  workspace.append(sectionElement);
}

export function mountReportPage(main, project, id) {
  const workspace = main.querySelector('#report-workspace');
  const report = prepareReport(project);
  if (report.kind !== 'ready') {
    incomplete(workspace, report, id);
    return;
  }
  const header = node('header', 'report-header');
  header.append(
    node('p', 'report-brand', 'DecisionLab · Informe de comparación'),
    node('h1', '', project.name),
    node('p', 'report-question', project.question),
  );
  if (project.description?.trim()) header.append(node('p', '', project.description));
  header.append(node('p', 'report-date', `Generado el ${dateText(report.generatedAt)}`));
  const actions = node('div', 'report-actions');
  const print = node('button', 'btn btn--primary', 'Imprimir / Guardar como PDF');
  print.type = 'button';
  print.addEventListener('click', () => window.print());
  actions.append(print, link('← Volver a resultados', wizardPath(id, 'results')));
  header.append(actions);
  workspace.append(header);
  configuration(workspace, report);
  evaluations(workspace, report);
  results(workspace, report);
  scenario(workspace, report);
  workspace.append(
    node(
      'p',
      'report-method',
      'Método: cada respuesta se normaliza entre 0 y 100 según su escala o rango. Su aporte es el valor normalizado multiplicado por la proporción del peso. La puntuación suma los aportes completos; las cifras visibles se redondean a dos decimales. Este informe compara preferencias, no predice resultados futuros.',
    ),
  );
}
