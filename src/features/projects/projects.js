import { validateProject } from '../../domain/validation.js';
import { serializeBackup } from '../../data/backup-format.js';
import { downloadJson } from '../transfer/transfer-service.js';

const title = (name, description, action = '') =>
  `<div class="page-title"><div><h1>${name}</h1><p>${description}</p></div>${action}</div>`;
const displayName = (project) => project.name.trim() || 'Sin título';
const isDraft = (project) =>
  !validateProject(project, { mode: 'complete', scenarioMode: 'base' }).ok;
const dateText = (date) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(date));

export function renderComparisons() {
  return `${title('Mis comparaciones', 'Proyectos guardados en este navegador.', '<a class="btn btn--primary" href="#/new">＋ Nueva comparación</a>')}
    <div class="projects-toolbar"><label for="project-search">Buscar por nombre</label><input id="project-search" type="search" autocomplete="off" placeholder="Buscar proyectos">
      <label for="project-sort">Ordenar</label><select id="project-sort"><option value="recent">Actualizados recientemente</option><option value="oldest">Actualizados primero</option></select></div>
    <p id="projects-transfer-status" role="status" aria-live="polite"></p><div id="project-list" class="saved-project-list" aria-live="polite"></div>
    <div class="example-entry"><div><h2>Ejemplo de comparación</h2><p>Crea una copia editable de las tres herramientas y sus cuatro criterios.</p></div><a class="btn btn--outline" href="#/example">Abrir ejemplo</a></div>`;
}

function action(label, actionName, id, className = 'text-link') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset.action = actionName;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function projectCard(record) {
  const { project } = record;
  const draft = isDraft(project);
  const article = document.createElement('article');
  article.className = 'saved-project';
  const top = document.createElement('div');
  top.className = 'saved-project-top';
  const heading = document.createElement('h2');
  heading.textContent = displayName(project);
  const badge = document.createElement('span');
  badge.className = `status ${draft ? 'status--warn' : 'status--done'}`;
  badge.textContent = draft ? 'Borrador' : 'Completa';
  top.append(heading, badge);
  const question = document.createElement('p');
  question.textContent = project.question.trim() || 'Añade una pregunta de decisión.';
  const updated = document.createElement('small');
  updated.textContent = `Actualizado ${dateText(project.updatedAt)}`;
  const actions = document.createElement('div');
  actions.className = 'saved-project-actions';
  actions.append(
    action(draft ? 'Continuar' : 'Abrir', 'open', record.id, 'btn btn--outline'),
    action('Duplicar', 'duplicate', record.id),
    action('Exportar JSON', 'export', record.id),
    action('Eliminar', 'delete', record.id, 'text-link text-link--danger'),
  );
  if (!draft) {
    const results = document.createElement('a');
    results.href = `#/project/${encodeURIComponent(record.id)}/results`;
    results.className = 'text-link';
    results.textContent = 'Ver resultados';
    actions.prepend(results);
  }
  article.append(top, question, updated, actions);
  return article;
}

export function mountComparisons(main, records) {
  const search = main.querySelector('#project-search');
  const sort = main.querySelector('#project-sort');
  const list = main.querySelector('#project-list');
  function update() {
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase('es');
    const matching = records.filter(({ project }) =>
      project.name.toLocaleLowerCase('es').includes(query),
    );
    if (sort.value === 'oldest') matching.reverse();
    if (!matching.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = records.length
        ? 'No hay proyectos con ese nombre.'
        : 'Todavía no tienes proyectos. Crea una comparación o abre el ejemplo.';
      list.append(empty);
    } else list.append(...matching.map(projectCard));
  }
  search.addEventListener('input', update);
  sort.addEventListener('change', update);
  update();
}

export function renderProjectEditor() {
  return `${title('Datos de la comparación', 'Define la decisión. Después podrás registrar alternativas, criterios y pesos.')}
    <div class="editor-layout"><form id="project-form" class="project-form" novalidate>
      <div class="form-field"><label for="project-name">Nombre del proyecto <span aria-hidden="true">*</span></label><input id="project-name" name="name" type="text" autocomplete="off" maxlength="120" aria-describedby="project-name-error"><small id="project-name-error" class="field-error"></small></div>
      <div class="form-field"><label for="project-question">Pregunta de decisión <span aria-hidden="true">*</span></label><input id="project-question" name="question" type="text" maxlength="240" aria-describedby="project-question-error"><small id="project-question-error" class="field-error"></small></div>
      <div class="form-field"><label for="project-description">Descripción <span class="optional">opcional</span></label><textarea id="project-description" name="description" rows="4" maxlength="1000"></textarea></div>
      <div class="editor-actions"><button class="btn btn--primary" id="save-project" type="button" data-action="save">Guardar ahora</button><a class="btn btn--outline" href="#/comparisons">Mis comparaciones</a></div>
      <p id="save-state" class="save-state" role="status" aria-live="polite"></p><p id="save-error" class="save-error" role="alert" hidden></p>
    </form><aside class="editor-note"><h2>Estado del proyecto</h2><p id="project-completeness">Borrador</p><p>Los cambios se guardan en este navegador. Aún no hay sincronización entre dispositivos.</p></aside></div>`;
}

export function mountProjectEditor(main, project, onEdit) {
  const form = main.querySelector('#project-form');
  for (const field of ['name', 'question', 'description'])
    form.elements[field].value = project[field] ?? '';
  function validateField(field) {
    const input = form.elements[field];
    const error = main.querySelector(`#project-${field}-error`);
    if (error) {
      error.textContent = input.value.trim()
        ? ''
        : field === 'name'
          ? 'Añade un nombre para identificar el proyecto.'
          : 'Escribe la pregunta que quieres responder.';
      input.setAttribute('aria-invalid', String(Boolean(error.textContent)));
    }
  }
  for (const field of ['name', 'question', 'description']) {
    form.elements[field].addEventListener('input', () =>
      onEdit({ [field]: form.elements[field].value }),
    );
    if (field !== 'description')
      form.elements[field].addEventListener('blur', () => validateField(field));
  }
  return () => {
    validateField('name');
    validateField('question');
  };
}

export function updateSaveState(main, state) {
  const status = main.querySelector('#save-state');
  if (!status) return;
  status.textContent = {
    idle: '',
    dirty: 'Cambios pendientes de guardar.',
    saving: 'Guardando…',
    saved: 'Guardado en este navegador.',
    error: 'No se pudo guardar. Tus cambios siguen abiertos en esta pestaña.',
  }[state.status];
  const error = main.querySelector('#save-error');
  const conflict = state.status === 'error' && state.error?.code === 'conflict';
  const saveButton = main.querySelector('[data-action="save"]');
  if (saveButton) saveButton.disabled = conflict;
  error.hidden = state.status !== 'error';
  error.textContent =
    state.status === 'error'
      ? conflict
        ? 'Este proyecto cambió en otra pestaña. Tus cambios aquí no se guardaron. Descarga una copia antes de recargar; luego podrás importarla desde Configuración. La versión guardada en la otra pestaña no se reemplazó.'
        : `${state.error?.message || 'Error de almacenamiento.'} Pulsa «Guardar ahora» para reintentar.`
      : '';
  let recovery = main.querySelector('#save-conflict-recovery');
  if (conflict && state.active) {
    if (!recovery) {
      recovery = document.createElement('button');
      recovery.id = 'save-conflict-recovery';
      recovery.className = 'btn btn--outline';
      recovery.type = 'button';
      recovery.textContent = 'Descargar copia de mis cambios';
      error.insertAdjacentElement('afterend', recovery);
    }
    recovery.onclick = () => {
      try {
        downloadJson(serializeBackup([state.active]), 'cambios-pendientes');
      } catch (cause) {
        error.textContent = `No se pudo descargar la copia: ${cause.message}`;
      }
    };
  } else recovery?.remove();
  const completeness = main.querySelector('#project-completeness');
  if (completeness && state.active)
    completeness.textContent = isDraft(state.active) ? 'Borrador' : 'Datos completos';
}
