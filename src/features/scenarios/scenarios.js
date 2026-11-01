import { compareScenarios } from '../../domain/scenarios.js';
import { normalizeWeights } from '../../domain/normalization.js';
import {
  createScenario,
  updateScenario,
  resetScenarioWeights,
  removeScenario,
} from '../../domain/scenario-operations.js';
import { parseInputNumber } from '../../shared/numbers.js';
import {
  formatScore,
  formatInput,
  formatImportance,
  formatDifference,
} from '../results/presentation.js';
import { wizardPath } from '../wizard/wizard.js';
import { updateSaveState } from '../projects/projects.js';

const node = (tag, className = '', value = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
};
const link = (label, href, className = 'text-link') => {
  const element = node('a', className, label);
  element.href = href;
  return element;
};
const signed = (value) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatDifference(Math.abs(value))}`;
const scenarioPath = (id) => `#/project/${encodeURIComponent(id)}/scenarios`;

export function renderScenariosIndex() {
  return '<div class="page-title"><div><h1>Escenarios</h1><p>Elige una comparación guardada para explorar cómo cambian los resultados al ajustar sus prioridades.</p></div></div><section id="scenarios-index" class="scenarios-index"></section>';
}

export function mountScenariosIndex(main, records) {
  const index = main.querySelector('#scenarios-index');
  if (!records.length) {
    index.append(
      node('p', 'empty-state', 'Todavía no hay comparaciones guardadas.'),
      link('Mis comparaciones →', '#/comparisons', 'btn btn--primary'),
    );
    return;
  }
  for (const record of records) {
    const row = node('article', 'scenarios-index-item');
    row.append(
      node('h2', '', record.project.name.trim() || 'Sin título'),
      node('p', '', record.project.question.trim() || 'Pregunta pendiente'),
      node(
        'small',
        '',
        record.project.scenarios.length
          ? 'Escenario alternativo disponible'
          : 'Sin escenario alternativo',
      ),
      link('Abrir escenarios →', scenarioPath(record.id)),
    );
    index.append(row);
  }
}

export function renderScenariosPage() {
  return '<section id="scenarios-workspace" class="scenarios-workspace"></section>';
}

function chart(label, value, alternate = false) {
  const row = node('div', 'scenarios-chart-row');
  const heading = node('span', '', label);
  const score = node('strong', '', `${formatScore(value)} / 100`);
  const track = node('div', 'scenarios-chart-track');
  const bar = node(
    'span',
    alternate ? 'scenarios-chart-bar scenarios-chart-bar--alternate' : 'scenarios-chart-bar',
  );
  bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  track.append(bar);
  track.setAttribute('aria-hidden', 'true');
  row.append(heading, score, track);
  return row;
}

function tieNote(result) {
  if (result.actualTieWithPrevious) return 'Empate real con la posición anterior.';
  if (result.apparentTieWithPrevious)
    return 'Empate aparente al mostrar dos decimales; el orden usa valores sin redondear.';
  return '';
}

function renderComparison(workspace, project, scenario) {
  const section = node('section', 'scenarios-comparison');
  section.id = 'scenarios-comparison';
  const comparison = compareScenarios(project, scenario.id);
  if (!comparison.ok) {
    section.append(
      node('h2', '', 'Comparación pendiente'),
      node('p', 'scenarios-error', comparison.errors[0].message),
      node(
        'p',
        '',
        'Corrige los pesos alternativos o completa las respuestas del proyecto. Los resultados base siguen disponibles.',
      ),
      link('Ver resultados base →', wizardPath(project.id, 'results')),
    );
    workspace.append(section);
    return;
  }
  const { base, alternate, changes } = comparison.value;
  section.append(
    node('h2', '', 'Qué cambió en la clasificación'),
    node(
      'p',
      'scenarios-intro',
      'Las alternativas y sus evaluaciones son las mismas. Solo cambian las prioridades de los criterios. Subir de posición no significa que una alternativa haya mejorado.',
    ),
  );
  const baseById = new Map(base.results.map((result) => [result.alternativeId, result]));
  const alternateById = new Map(alternate.results.map((result) => [result.alternativeId, result]));
  const criterionById = new Map(project.criteria.map((criterion) => [criterion.id, criterion]));
  const list = node('div', 'scenarios-comparison-list');
  for (const change of changes) {
    const item = node('article', 'scenarios-result');
    const title = node('div', 'scenarios-result-title');
    title.append(
      node('h3', '', change.name),
      node('strong', '', `${change.baseRank}.º → ${change.alternateRank}.º`),
    );
    const position =
      change.rankChange > 0 ? 'Sube' : change.rankChange < 0 ? 'Baja' : 'Mantiene su posición';
    const summary = node(
      'p',
      'scenarios-change',
      `${position} · ${signed(change.scoreDelta)} puntos`,
    );
    const charts = node('div', 'scenarios-charts');
    charts.append(
      chart('Base', change.baseScore),
      chart(scenario.name, change.alternateScore, true),
    );
    item.append(title, summary, charts);
    const baseTie = tieNote(baseById.get(change.alternativeId));
    const alternateTie = tieNote(alternateById.get(change.alternativeId));
    if (baseTie) item.append(node('p', 'scenarios-tie', `Base: ${baseTie}`));
    if (alternateTie) item.append(node('p', 'scenarios-tie', `${scenario.name}: ${alternateTie}`));
    const details = node('details', 'scenarios-contributions');
    details.append(node('summary', '', 'Ver aportes por criterio'));
    const contributionList = node('ul');
    for (const contribution of change.contributions) {
      const name = criterionById.get(contribution.criterionId)?.name ?? contribution.criterionId;
      const row = node('li');
      row.append(
        node('span', '', name),
        node(
          'span',
          '',
          `${formatScore(contribution.basePoints)} → ${formatScore(contribution.alternatePoints)}`,
        ),
        node('strong', '', `${signed(contribution.delta)} puntos`),
      );
      contributionList.append(row);
    }
    details.append(contributionList);
    item.append(details);
    list.append(item);
  }
  section.append(
    list,
    node(
      'p',
      'scenarios-method',
      'Las barras usan una escala fija de 0 a 100. Las cifras visibles tienen dos decimales; los cambios y posiciones se calculan con valores completos.',
    ),
  );
  workspace.append(section);
}

function renderEditor(workspace, project, scenario, state, redraw) {
  const section = node('section', 'scenarios-editor');
  section.append(node('h2', '', 'Prioridades del escenario'));
  const guidance = node(
    'p',
    'scenarios-intro',
    'Modifica los pesos para explorar otras prioridades. Se admite cero, pero la suma debe ser positiva. Las respuestas y los pesos base no cambian.',
  );
  section.append(guidance);
  const nameLabel = node('label', 'scenarios-name-label', 'Nombre del escenario');
  const nameInput = node('input');
  nameInput.id = 'scenario-name';
  nameInput.maxLength = 120;
  nameInput.autocomplete = 'off';
  nameInput.value = scenario.name;
  const nameError = node('small', 'field-error');
  nameError.id = 'scenario-name-error';
  nameInput.setAttribute('aria-describedby', nameError.id);
  nameLabel.append(nameInput, nameError);
  section.append(nameLabel);
  const base = normalizeWeights(project.criteria);
  const alternative = normalizeWeights(project.criteria, scenario.weights);
  const baseById = new Map((base.ok ? base.value : []).map((item) => [item.criterionId, item]));
  const alternativeById = new Map(
    (alternative.ok ? alternative.value : []).map((item) => [item.criterionId, item]),
  );
  const list = node('div', 'scenarios-weights');
  const controls = new Map();
  for (const criterion of project.criteria) {
    const row = node('div', 'scenarios-weight-row');
    row.append(node('h3', '', criterion.name));
    const baseText = node('div', 'scenarios-weight-base');
    baseText.append(
      node('span', '', 'Base'),
      node('strong', '', formatInput(criterion.weight)),
      node('small', '', `${formatImportance(baseById.get(criterion.id)?.proportion ?? 0)} %`),
    );
    const label = node('label', 'scenarios-weight-control');
    label.append(node('span', '', 'Alternativo'));
    const input = node('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.value =
      scenario.weights[criterion.id] === undefined
        ? ''
        : formatInput(scenario.weights[criterion.id]);
    input.setAttribute('aria-label', `Peso alternativo · ${criterion.name}`);
    const error = node('small', 'field-error');
    error.id = `scenario-weight-error-${controls.size}`;
    input.setAttribute('aria-describedby', error.id);
    const proportion = node(
      'small',
      'scenarios-proportion',
      alternativeById.has(criterion.id)
        ? `${formatImportance(alternativeById.get(criterion.id).proportion)} %`
        : '—',
    );
    label.append(input, proportion, error);
    controls.set(criterion.id, { input, error, proportion });
    row.append(baseText, label);
    list.append(row);
  }
  section.append(list);
  const sumError = node('p', 'scenarios-error');
  sumError.id = 'scenario-sum-error';
  sumError.setAttribute('role', 'alert');
  section.append(sumError);
  const actions = node('div', 'scenarios-actions');
  const reset = node('button', 'btn btn--outline', 'Restablecer pesos');
  reset.type = 'button';
  const remove = node('button', 'text-link text-link--danger', 'Eliminar escenario');
  remove.type = 'button';
  actions.append(reset, remove);
  section.append(actions);
  const save = node('div', 'scenarios-save');
  const saveButton = node('button', 'btn btn--primary', 'Guardar ahora');
  saveButton.type = 'button';
  const saveState = node('p', 'save-state');
  saveState.id = 'save-state';
  saveState.setAttribute('role', 'status');
  saveState.setAttribute('aria-live', 'polite');
  const saveError = node('p', 'save-error');
  saveError.id = 'save-error';
  saveError.setAttribute('role', 'alert');
  saveError.hidden = true;
  save.append(saveButton, saveState, saveError);
  section.append(save);
  workspace.append(section);
  let invalidLocal = false;

  function validateAndCommit({ initial = false } = {}) {
    const weights = {};
    let valid = true;
    const nameValid = Boolean(nameInput.value.trim());
    nameError.textContent = nameValid ? '' : 'Escribe un nombre para el escenario.';
    nameInput.setAttribute('aria-invalid', String(!nameValid));
    if (!nameValid) valid = false;
    for (const [id, control] of controls) {
      const raw = control.input.value;
      const value = parseInputNumber(raw);
      const message =
        raw.trim() === ''
          ? 'Introduce un peso; cero es válido.'
          : !Number.isFinite(value)
            ? 'Introduce un número finito sin separadores de miles.'
            : value < 0
              ? 'El peso no puede ser negativo.'
              : '';
      control.error.textContent = message;
      control.input.setAttribute('aria-invalid', String(Boolean(message)));
      if (message) valid = false;
      else weights[id] = value;
    }
    const normalized = valid ? normalizeWeights(project.criteria, weights) : null;
    sumError.textContent = valid && !normalized.ok ? normalized.errors[0].message : '';
    if (normalized && !normalized.ok) valid = false;
    invalidLocal = !valid && !initial;
    workspace.closest('main').dataset.scenarioInvalid = String(invalidLocal);
    if (!valid) {
      for (const control of controls.values()) control.proportion.textContent = '—';
      const comparison = workspace.querySelector('#scenarios-comparison');
      if (comparison)
        comparison.replaceChildren(
          node('h2', '', 'Corrige el escenario para comparar'),
          node(
            'p',
            '',
            initial
              ? 'Los cambios de criterios dejaron este escenario sin pesos válidos. Corrige sus pesos; los resultados base siguen disponibles.'
              : 'Esta edición todavía no se ha guardado. La última versión válida permanece en el navegador.',
          ),
        );
      return;
    }
    for (const item of normalized.value)
      controls.get(item.criterionId).proportion.textContent =
        `${formatImportance(item.proportion)} %`;
    const current = state.snapshot().active;
    const result = updateScenario(current, scenario.id, { name: nameInput.value, weights });
    if (!result.ok) {
      sumError.textContent = result.errors[0].message;
      invalidLocal = true;
      return;
    }
    const previous = current.scenarios.find((item) => item.id === scenario.id);
    if (
      previous.name !== result.value.scenarios[0].name ||
      project.criteria.some((criterion) => previous.weights[criterion.id] !== weights[criterion.id])
    )
      state.edit(result.value);
    const comparison = workspace.querySelector('#scenarios-comparison');
    comparison?.remove();
    renderComparison(workspace, result.value, result.value.scenarios[0]);
  }

  nameInput.addEventListener('input', validateAndCommit);
  for (const control of controls.values())
    control.input.addEventListener('input', validateAndCommit);
  saveButton.addEventListener('click', async () => {
    validateAndCommit();
    if (invalidLocal) {
      (nameError.textContent
        ? nameInput
        : ([...controls.values()].find((item) => item.error.textContent)?.input ?? nameInput)
      ).focus();
      return;
    }
    await state.saveNow();
  });
  reset.addEventListener('click', () => {
    if (!window.confirm('¿Restablecer los pesos alternativos a los pesos base?')) return;
    const result = resetScenarioWeights(state.snapshot().active, scenario.id);
    if (result.ok) {
      state.edit(result.value);
      redraw();
    }
  });
  remove.addEventListener('click', () => {
    if (!window.confirm('¿Eliminar este escenario alternativo?')) return;
    const result = removeScenario(state.snapshot().active, scenario.id);
    if (result.ok) {
      state.edit(result.value);
      redraw();
    }
  });
  return { hasInvalid: () => invalidLocal, validate: validateAndCommit };
}

export function mountScenariosPage(main, state, id) {
  main.dataset.scenarioInvalid = 'false';
  const workspace = main.querySelector('#scenarios-workspace');
  const project = state.snapshot().active;
  const header = node('header', 'scenarios-header');
  header.append(
    node('p', 'results-kicker', 'Simulación de prioridades'),
    node('h1', '', project.name.trim() || 'Sin título'),
    node('p', 'scenarios-question', project.question.trim() || 'Pregunta pendiente'),
    node(
      'p',
      'scenarios-intro',
      'Escenario base: pesos originales del proyecto. El escenario alternativo usa los mismos datos y respuestas.',
    ),
    link('← Volver a resultados', wizardPath(id, 'results')),
  );
  workspace.append(header);
  const scenario = project.scenarios[0];
  if (!scenario) {
    const empty = node('section', 'scenarios-empty');
    empty.append(
      node('h2', '', 'Todavía no hay escenario alternativo'),
      node(
        'p',
        '',
        'Crea uno para cambiar los pesos y comparar la clasificación con el escenario base. Los pesos iniciales serán los mismos.',
      ),
    );
    const button = node('button', 'btn btn--primary', 'Crear escenario');
    button.type = 'button';
    button.addEventListener('click', () => {
      const result = createScenario(state.snapshot().active, { id: window.crypto.randomUUID() });
      if (result.ok) {
        state.edit(result.value);
        main.innerHTML = renderScenariosPage();
        mountScenariosPage(main, state, id);
      } else empty.append(node('p', 'scenarios-error', result.errors[0].message));
    });
    empty.append(button);
    workspace.append(empty);
    return { hasInvalid: () => false };
  }
  const redraw = () => {
    main.innerHTML = renderScenariosPage();
    mountScenariosPage(main, state, id);
  };
  const editor = renderEditor(workspace, project, scenario, state, redraw);
  renderComparison(workspace, project, scenario);
  if (!scenario.name.trim() || !normalizeWeights(project.criteria, scenario.weights).ok)
    editor.validate({ initial: true });
  updateSaveState(main, state.snapshot());
  return editor;
}
