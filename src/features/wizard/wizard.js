import {
  addAlternative,
  updateAlternative,
  removeAlternative,
  moveAlternative,
  addCriterion,
  updateCriterion,
  setCriterionType,
  removeCriterion,
  moveCriterion,
  weightProportions,
  validateSetup,
} from '../../domain/setup.js';

const steps = [
  ['details', 'Definir'],
  ['alternatives', 'Alternativas'],
  ['criteria', 'Criterios'],
  ['weights', 'Pesos'],
  ['evaluation', 'Evaluación'],
];
const descriptions = {
  alternatives:
    'Registra de dos a cinco opciones para comparar. Puedes guardar antes de completar la lista.',
  criteria: 'Define de dos a ocho criterios y sus escalas.',
  weights:
    'Los porcentajes muestran la importancia relativa de cada criterio; no necesitas sumar 100.',
};

export function stepFromHash(hash) {
  const match = /^#\/project\/[^/]+(?:\/(details|alternatives|criteria|weights|evaluation))?$/.exec(
    hash,
  );
  return match?.[1] ?? 'details';
}

export function wizardPath(id, step) {
  return `#/project/${encodeURIComponent(id)}/${step}`;
}

export function renderWizardChrome(step) {
  const index = steps.findIndex(([key]) => key === step);
  return `<nav class="wizard-steps" aria-label="Progreso de la comparación"><span>Paso ${index + 1} de 6</span><ol>${steps.map(([key, label], position) => `<li class="${key === step ? 'is-current' : ''}"><a data-wizard-step="${key}" ${key === step ? 'aria-current="step"' : ''}>${position + 1}. ${label}</a></li>`).join('')}</ol><div class="progress-track" role="img" aria-label="Paso ${index + 1} de 6"><span style="width:${((index + 1) / 6) * 100}%"></span></div></nav>`;
}

export function renderWizardStep(step) {
  if (step === 'details') return '';
  return `<div class="page-title"><div><h1>${steps.find(([key]) => key === step)?.[1]}</h1><p>${descriptions[step]}</p></div></div><section class="wizard-workspace"><div class="wizard-section-head"><p id="wizard-count"></p>${step !== 'weights' ? `<button class="btn btn--outline" type="button" id="wizard-add">${step === 'alternatives' ? 'Añadir alternativa' : 'Añadir criterio'}</button>` : ''}</div><div id="wizard-list" class="wizard-list"></div><p id="wizard-summary" class="wizard-summary" aria-live="polite"></p></section>`;
}

export function renderWizardFooter(step) {
  const index = steps.findIndex(([key]) => key === step);
  return `<div class="wizard-footer"><a class="btn btn--outline" data-wizard-previous>${index === 0 ? 'Mis comparaciones' : '← Anterior'}</a>${index < steps.length - 1 ? '<a class="btn btn--primary" data-wizard-next>Siguiente →</a>' : '<span class="wizard-future">Los resultados funcionales se incorporarán en la siguiente fase.</span>'}<a class="text-link" href="#/comparisons">Salir del asistente</a></div>${step === 'details' ? '' : '<p id="save-state" class="save-state" role="status" aria-live="polite"></p><p id="save-error" class="save-error" role="alert" hidden></p>'}`;
}

export function mountWizardNavigation(main, id, step) {
  const index = steps.findIndex(([key]) => key === step);
  main.querySelectorAll('[data-wizard-step]').forEach((link) => {
    link.href = wizardPath(id, link.dataset.wizardStep);
  });
  main.querySelector('[data-wizard-previous]').href =
    index === 0 ? '#/comparisons' : wizardPath(id, steps[index - 1][0]);
  const next = main.querySelector('[data-wizard-next]');
  if (next) next.href = wizardPath(id, steps[index + 1][0]);
}

function field(label, value, onInput, { multiline = false, type = 'text', step = undefined } = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'wizard-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement(multiline ? 'textarea' : 'input');
  if (!multiline) input.type = type;
  if (step) input.step = step;
  input.value = value ?? '';
  input.addEventListener('input', () => onInput(input.value, wrap));
  const error = document.createElement('small');
  error.className = 'field-error';
  wrap.append(caption, input, error);
  return wrap;
}

function selectField(label, value, choices, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'wizard-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const select = document.createElement('select');
  for (const [key, text] of choices) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = text;
    select.append(option);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value, wrap));
  const error = document.createElement('small');
  error.className = 'field-error';
  wrap.append(caption, select, error);
  return wrap;
}

function action(label, onClick, disabled = false) {
  const button = document.createElement('button');
  button.className = 'text-link';
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

const numericInput = (text, control) =>
  control.querySelector('input').validity.badInput
    ? Number.NaN
    : text.trim() === ''
      ? undefined
      : Number(text);

export function mountWizardStep(
  main,
  state,
  step,
  { confirm = window.confirm, idFactory = () => window.crypto.randomUUID() } = {},
) {
  if (step === 'details') return { hasInvalid: () => false };
  const list = main.querySelector('#wizard-list');
  const summary = main.querySelector('#wizard-summary');
  const count = main.querySelector('#wizard-count');
  const invalid = new Set();
  const project = () => state.snapshot().active;

  function apply(result, control) {
    if (result.ok) {
      if (control) {
        control.querySelector('.field-error').textContent = '';
        control.querySelector('input, textarea, select')?.setAttribute('aria-invalid', 'false');
        invalid.delete(control);
      }
      state.edit(result.value);
      updateSummary();
      return true;
    }
    if (control) {
      control.querySelector('.field-error').textContent = result.errors[0].message;
      control.querySelector('input, textarea, select')?.setAttribute('aria-invalid', 'true');
      invalid.add(control);
    } else summary.textContent = result.errors[0].message;
    if (step === 'weights') updateSummary();
    return false;
  }

  function updateSummary() {
    const current = project();
    if (step === 'weights') {
      const normalized = weightProportions(current);
      const proportionsAvailable = normalized.ok && invalid.size === 0;
      const byId = new Map(
        normalized.ok ? normalized.value.map((item) => [item.criterionId, item.proportion]) : [],
      );
      list.querySelectorAll('[data-proportion]').forEach((element) => {
        element.textContent = proportionsAvailable
          ? `${(byId.get(element.dataset.proportion) * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`
          : '—';
      });
      if (invalid.size) {
        summary.textContent = invalid
          .values()
          .next()
          .value.querySelector('.field-error').textContent;
      } else if (!normalized.ok) {
        const error = normalized.errors.find(({ code }) => code !== 'zero-weight-sum');
        summary.textContent =
          error?.code === 'invalid-number' && current.criteria.some(({ weight }) => weight == null)
            ? 'Completa el peso de cada criterio para calcular sus proporciones.'
            : error?.code === 'insufficient-criteria'
              ? 'Añade criterios para configurar sus pesos.'
              : error?.message || 'Asigna un peso positivo al menos a un criterio para evaluar.';
      } else {
        summary.textContent = validateSetup(current).ok
          ? 'La configuración está lista para evaluar.'
          : 'Los pesos son válidos. Completa los datos pendientes antes de evaluar.';
      }
    } else
      summary.textContent =
        step === 'alternatives'
          ? `${current.alternatives.length} de 2 a 5 alternativas para completar este paso.`
          : `${current.criteria.length} de 2 a 8 criterios para completar este paso.`;
    count.textContent =
      step === 'alternatives'
        ? `${current.alternatives.length} alternativas`
        : `${current.criteria.length} criterios`;
  }

  function mutate(result) {
    if (invalid.size) {
      summary.textContent = 'Corrige los campos señalados antes de continuar.';
      return;
    }
    if (apply(result)) renderItems();
  }
  function renderItems() {
    list.replaceChildren();
    invalid.clear();
    const current = project();
    const items = step === 'alternatives' ? current.alternatives : current.criteria;
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent =
        step === 'alternatives'
          ? 'Añade la primera opción que quieres comparar.'
          : 'Añade los criterios que utilizarás para comparar.';
      list.append(empty);
    }
    items.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'wizard-item';
      const top = document.createElement('div');
      top.className = 'wizard-item-top';
      const heading = document.createElement('h2');
      heading.textContent = `${String(index + 1).padStart(2, '0')} · ${item.name.trim() || (step === 'alternatives' ? 'Alternativa sin nombre' : 'Criterio sin nombre')}`;
      if (step !== 'weights') {
        const actions = document.createElement('div');
        actions.className = 'wizard-item-actions';
        const moveItem = step === 'alternatives' ? moveAlternative : moveCriterion;
        const removeItem = step === 'alternatives' ? removeAlternative : removeCriterion;
        actions.append(
          action('Subir', () => mutate(moveItem(project(), item.id, -1)), index === 0),
          action(
            'Bajar',
            () => mutate(moveItem(project(), item.id, 1)),
            index === items.length - 1,
          ),
          action('Eliminar', () => {
            const currentProject = project();
            const related = currentProject.evaluations.filter((answer) =>
              step === 'alternatives'
                ? answer.alternativeId === item.id
                : answer.criterionId === item.id,
            ).length;
            const scenarioCount =
              step === 'criteria'
                ? currentProject.scenarios.filter((scenario) =>
                    Object.hasOwn(scenario.weights, item.id),
                  ).length
                : 0;
            if (
              (related || scenarioCount) &&
              !confirm(
                `Eliminar «${item.name || 'sin nombre'}» también quitará ${related} evaluaciones${scenarioCount ? ` y sus pesos en ${scenarioCount} escenarios` : ''}. ¿Continuar?`,
              )
            )
              return;
            if (!related && !scenarioCount && !confirm(`¿Eliminar «${item.name || 'sin nombre'}»?`))
              return;
            mutate(removeItem(currentProject, item.id));
          }),
        );
        top.append(heading, actions);
      } else top.append(heading);
      card.append(top);
      if (step === 'alternatives') {
        card.append(
          field('Nombre', item.name, (value, control) => {
            apply(updateAlternative(project(), item.id, { name: value }), control);
            heading.textContent = `${String(index + 1).padStart(2, '0')} · ${value.trim() || 'Alternativa sin nombre'}`;
          }),
          field(
            'Descripción',
            item.description,
            (value, control) =>
              apply(updateAlternative(project(), item.id, { description: value }), control),
            { multiline: true },
          ),
        );
      } else if (step === 'criteria') {
        card.append(
          field('Nombre', item.name, (value, control) => {
            apply(updateCriterion(project(), item.id, { name: value }), control);
            heading.textContent = `${String(index + 1).padStart(2, '0')} · ${value.trim() || 'Criterio sin nombre'}`;
          }),
          field(
            'Descripción',
            item.description,
            (value, control) =>
              apply(updateCriterion(project(), item.id, { description: value }), control),
            { multiline: true },
          ),
          selectField(
            'Tipo',
            item.type,
            [
              ['rating', 'Valoración de conveniencia · 0 a 5'],
              ['numeric', 'Valor numérico'],
            ],
            (value, control) => {
              const currentProject = project();
              const currentCriterion = currentProject.criteria.find(({ id }) => id === item.id);
              if (!currentCriterion) return;
              if (value === currentCriterion.type) return;
              if (invalid.size) {
                control.querySelector('select').value = currentCriterion.type;
                summary.textContent = 'Corrige los campos señalados antes de continuar.';
                return;
              }
              const related = currentProject.evaluations.filter(
                (answer) => answer.criterionId === item.id,
              ).length;
              const numericSettings =
                currentCriterion.type === 'numeric'
                  ? [
                      ...(currentCriterion.unit?.trim() ? ['la unidad'] : []),
                      ...(currentCriterion.min !== undefined ? ['el límite mínimo'] : []),
                      ...(currentCriterion.max !== undefined ? ['el límite máximo'] : []),
                      ...(currentCriterion.direction === 'lower' ? ['el sentido favorable'] : []),
                    ]
                  : [];
              const losses = [...(related ? [`${related} evaluaciones`] : []), ...numericSettings];
              if (
                losses.length &&
                !confirm(`Cambiar el tipo quitará ${losses.join(', ')}. ¿Continuar?`)
              ) {
                control.querySelector('select').value = currentCriterion.type;
                return;
              }
              mutate(setCriterionType(currentProject, item.id, value));
            },
          ),
        );
        if (item.type === 'numeric') {
          card.append(
            field('Unidad', item.unit, (value, control) =>
              apply(updateCriterion(project(), item.id, { unit: value }), control),
            ),
            field(
              'Valor mínimo',
              item.min,
              (value, control) =>
                apply(
                  updateCriterion(project(), item.id, { min: numericInput(value, control) }),
                  control,
                ),
              { type: 'number', step: 'any' },
            ),
            field(
              'Valor máximo',
              item.max,
              (value, control) =>
                apply(
                  updateCriterion(project(), item.id, { max: numericInput(value, control) }),
                  control,
                ),
              { type: 'number', step: 'any' },
            ),
            selectField(
              'Sentido favorable',
              item.direction,
              [
                ['higher', 'Mayor valor es mejor'],
                ['lower', 'Menor valor es mejor'],
              ],
              (value, control) =>
                apply(updateCriterion(project(), item.id, { direction: value }), control),
            ),
          );
        }
      } else {
        card.append(
          field(
            'Peso',
            item.weight,
            (value, control) =>
              apply(
                updateCriterion(project(), item.id, { weight: numericInput(value, control) }),
                control,
              ),
            { type: 'number', step: 'any' },
          ),
        );
        const proportion = document.createElement('p');
        proportion.className = 'weight-proportion';
        proportion.dataset.proportion = item.id;
        card.append(proportion);
      }
      list.append(card);
    });
    updateSummary();
  }

  main.querySelector('#wizard-add')?.addEventListener('click', () => {
    mutate(
      step === 'alternatives'
        ? addAlternative(project(), { id: idFactory() })
        : addCriterion(project(), { id: idFactory() }),
    );
  });
  renderItems();
  return { hasInvalid: () => invalid.size > 0 };
}
