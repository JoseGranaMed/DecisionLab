import {
  evaluationProgress,
  getEvaluation,
  removeEvaluation,
  setEvaluation,
} from '../../domain/answers.js';
import { validateSetup } from '../../domain/setup.js';
import { wizardPath } from '../wizard/wizard.js';
import { parseInputNumber, ambiguousNumber } from '../../shared/numbers.js';

const keyOf = (alternativeId, criterionId) => JSON.stringify([alternativeId, criterionId]);

export function renderEvaluationPage() {
  return `<div class="page-title"><div><h1>Evaluación</h1><p>Registra una respuesta por cada alternativa y criterio. Puedes dejar respuestas pendientes y continuar después.</p></div></div><section id="evaluation-workspace" class="evaluation-workspace"></section>`;
}

/** One decimal separator is accepted; thousands separators and ambiguous mixed forms are rejected. */
export function parseEvaluationNumber(raw) {
  return parseInputNumber(raw);
}

function criterionHint(criterion) {
  if (criterion.type === 'rating') return 'Valoración de 0 a 5 · mayor es mejor';
  return `${criterion.unit} · ${criterion.min}–${criterion.max} · ${criterion.direction === 'lower' ? 'menor es mejor' : 'mayor es mejor'}`;
}

function gateStep(error) {
  const { path, code } = error;
  if (['name', 'question', 'description'].some((field) => path === field)) return 'details';
  if (path.startsWith('alternatives')) return 'alternatives';
  if (
    code === 'zero-weight-sum' ||
    path.includes('.weight') ||
    path === 'weights' ||
    path.startsWith('scenarios')
  )
    return 'weights';
  return 'criteria';
}

function renderGate(workspace, id, errors) {
  const heading = document.createElement('h2');
  heading.textContent = 'Completa la configuración antes de evaluar';
  const intro = document.createElement('p');
  intro.textContent = 'El borrador se conserva. Revisa los puntos pendientes y vuelve a este paso.';
  const list = document.createElement('ul');
  list.className = 'evaluation-gate-list';
  const seen = new Set();
  for (const error of errors) {
    const key = `${error.path}:${error.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = document.createElement('li');
    const message = document.createElement('span');
    message.textContent = error.message;
    const link = document.createElement('a');
    link.href = wizardPath(id, gateStep(error));
    link.textContent = 'Revisar →';
    entry.append(message, link);
    list.append(entry);
  }
  workspace.classList.add('evaluation-gate');
  workspace.append(heading, intro, list);
}

function controlFor(alternative, criterion, value, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'evaluation-control';
  const label = document.createElement('span');
  label.className = 'evaluation-control-label';
  label.textContent = criterion.name;
  const context = document.createElement('span');
  context.className = 'evaluation-control-context';
  context.textContent = alternative.name;
  const hint = document.createElement('small');
  hint.className = 'evaluation-hint';
  hint.textContent = criterionHint(criterion);
  let input;
  if (criterion.type === 'rating') {
    input = document.createElement('select');
    const pending = document.createElement('option');
    pending.value = '';
    pending.textContent = 'Pendiente';
    input.append(pending);
    for (let number = 0; number <= 5; number++) {
      const option = document.createElement('option');
      option.value = String(number);
      option.textContent = String(number);
      input.append(option);
    }
    input.value = value === null ? '' : String(value);
    input.addEventListener('change', () => onChange(input.value));
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.value = value === null ? '' : String(value);
    input.placeholder = 'Pendiente';
    input.addEventListener('input', () => onChange(input.value));
  }
  input.dataset.evaluationPair = keyOf(alternative.id, criterion.id);
  input.setAttribute('aria-label', `${alternative.name} · ${criterion.name}`);
  input.setAttribute('aria-invalid', 'false');
  const error = document.createElement('small');
  error.className = 'field-error';
  wrap.append(label, context, input, hint, error);
  return { wrap, input, error };
}

export function mountEvaluation(main, state, id) {
  const workspace = main.querySelector('#evaluation-workspace');
  const initial = state.snapshot().active;
  const readiness = validateSetup(initial);
  if (!readiness.ok) {
    renderGate(workspace, id, readiness.errors);
    return { hasInvalid: () => false };
  }

  const controls = new Map();
  const invalid = new Map();
  const project = () => state.snapshot().active;
  const progressText = document.createElement('p');
  progressText.className = 'evaluation-progress-text';
  progressText.setAttribute('role', 'status');
  progressText.setAttribute('aria-live', 'polite');
  const progressTrack = document.createElement('div');
  progressTrack.className = 'progress-track evaluation-progress-track';
  const progressFill = document.createElement('span');
  progressTrack.append(progressFill);
  const guidance = document.createElement('p');
  guidance.className = 'evaluation-guidance';
  guidance.textContent =
    'Valoración: 0 es menos conveniente y 5 es más conveniente. En valores numéricos puedes usar coma o punto decimal, sin separadores de miles. Las formas ambiguas como 1.000 se rechazan.';
  workspace.append(progressText, progressTrack, guidance);

  const statusByAlternative = new Map();
  function refreshProgress() {
    const current = project();
    const progress = evaluationProgress(current);
    const completed = progress.completed;
    let pendingEdits = 0;
    for (const key of invalid.keys()) {
      const [alternativeId, criterionId] = JSON.parse(key);
      if (getEvaluation(current, alternativeId, criterionId) !== null) pendingEdits++;
    }
    const visibleCompleted = completed - pendingEdits;
    progressText.textContent = `${visibleCompleted} de ${progress.total} evaluaciones completadas · ${progress.total - visibleCompleted} pendientes`;
    progressFill.style.width = `${progress.total ? (visibleCompleted / progress.total) * 100 : 0}%`;
    progressTrack.setAttribute('role', 'img');
    progressTrack.setAttribute('aria-label', progressText.textContent);
    for (const item of progress.byAlternative) {
      const localInvalid = [...invalid.keys()].filter((key) => {
        const [alternativeId, criterionId] = JSON.parse(key);
        return (
          alternativeId === item.alternativeId && getEvaluation(current, alternativeId, criterionId)
        );
      }).length;
      const visible = item.completed - localInvalid;
      for (const element of statusByAlternative.get(item.alternativeId) ?? []) {
        element.textContent = `${visible} de ${item.total} respuestas · ${item.total - visible} pendientes`;
      }
    }
  }

  function register(key, control) {
    if (!controls.has(key)) controls.set(key, []);
    controls.get(key).push(control);
  }

  function updatePair(alternative, criterion, raw) {
    const key = keyOf(alternative.id, criterion.id);
    const result =
      raw.trim() === ''
        ? removeEvaluation(project(), alternative.id, criterion.id)
        : setEvaluation(
            project(),
            alternative.id,
            criterion.id,
            criterion.type === 'rating' ? Number(raw) : parseEvaluationNumber(raw),
          );
    const message = result.ok
      ? ''
      : criterion.type === 'numeric' && ambiguousNumber(raw.trim())
        ? 'Formato ambiguo. Escribe miles sin separador.'
        : result.errors[0].message;
    if (message) invalid.set(key, { raw, message });
    else {
      invalid.delete(key);
      state.edit(result.value);
    }
    for (const control of controls.get(key) ?? []) {
      control.input.value = raw;
      control.input.setAttribute('aria-invalid', String(Boolean(message)));
      control.error.textContent = message;
    }
    refreshProgress();
  }

  const desktop = document.createElement('div');
  desktop.className = 'evaluation-desktop';
  const scroll = document.createElement('div');
  scroll.className = 'evaluation-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute(
    'aria-label',
    'Matriz de evaluación; desplázate horizontalmente para ver más criterios',
  );
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const alternativeHeader = document.createElement('th');
  alternativeHeader.scope = 'col';
  alternativeHeader.textContent = 'Alternativa';
  headerRow.append(alternativeHeader);
  for (const criterion of initial.criteria) {
    const th = document.createElement('th');
    th.scope = 'col';
    const name = document.createElement('strong');
    name.textContent = criterion.name;
    const hint = document.createElement('small');
    hint.textContent = criterionHint(criterion);
    th.append(name, hint);
    headerRow.append(th);
  }
  head.append(headerRow);
  const body = document.createElement('tbody');
  for (const alternative of initial.alternatives) {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    const name = document.createElement('strong');
    name.textContent = alternative.name;
    const status = document.createElement('small');
    if (!statusByAlternative.has(alternative.id)) statusByAlternative.set(alternative.id, []);
    statusByAlternative.get(alternative.id).push(status);
    th.append(name, status);
    row.append(th);
    for (const criterion of initial.criteria) {
      const cell = document.createElement('td');
      const answer = getEvaluation(initial, alternative.id, criterion.id);
      const key = keyOf(alternative.id, criterion.id);
      const control = controlFor(alternative, criterion, answer?.value ?? null, (raw) =>
        updatePair(alternative, criterion, raw),
      );
      control.wrap.classList.add('evaluation-control--matrix');
      register(key, control);
      cell.append(control.wrap);
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  scroll.append(table);
  const scrollHint = document.createElement('p');
  scrollHint.className = 'evaluation-scroll-hint';
  scrollHint.textContent =
    'Si no ves todos los criterios, desplázate horizontalmente dentro de la matriz.';
  desktop.append(scrollHint, scroll);

  const mobile = document.createElement('div');
  mobile.className = 'evaluation-mobile';
  for (const alternative of initial.alternatives) {
    const section = document.createElement('section');
    section.className = 'evaluation-alternative';
    const title = document.createElement('h2');
    title.textContent = alternative.name;
    const status = document.createElement('p');
    status.className = 'evaluation-alternative-status';
    statusByAlternative.get(alternative.id).push(status);
    section.append(title, status);
    for (const criterion of initial.criteria) {
      const answer = getEvaluation(initial, alternative.id, criterion.id);
      const key = keyOf(alternative.id, criterion.id);
      const control = controlFor(alternative, criterion, answer?.value ?? null, (raw) =>
        updatePair(alternative, criterion, raw),
      );
      register(key, control);
      section.append(control.wrap);
    }
    mobile.append(section);
  }
  workspace.append(desktop, mobile);
  refreshProgress();
  return { hasInvalid: () => invalid.size > 0 };
}
