const node = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};

export function renderTransferPage() {
  return `<div class="page-title"><div><h1>Configuración</h1><p>Gestiona copias de tus comparaciones en este dispositivo.</p></div></div>
    <div class="transfer-workspace">
      <section class="transfer-section" aria-labelledby="transfer-export-heading"><h2 id="transfer-export-heading">Crear un respaldo</h2><p>Descarga un archivo JSON con tus proyectos, incluidos borradores y escenarios. Los resultados se calculan al abrir cada proyecto.</p><button class="btn btn--primary" type="button" id="export-all">Exportar todos los proyectos</button><div id="transfer-projects" class="transfer-projects"></div></section>
      <section class="transfer-section" aria-labelledby="transfer-import-heading"><h2 id="transfer-import-heading">Recuperar un respaldo</h2><p>Selecciona un archivo JSON de DecisionLab. Revisaremos todos sus proyectos antes de guardarlos. Máximo 20 MiB y 500 proyectos.</p><label class="transfer-file-label" for="backup-file">Archivo de respaldo</label><input id="backup-file" type="file" accept=".json,application/json"><div id="transfer-preview" class="transfer-preview" hidden></div></section>
      <p id="transfer-status" role="status" aria-live="polite" tabindex="-1"></p><p id="transfer-error" class="transfer-error" role="alert" tabindex="-1" hidden></p>
      <aside class="transfer-note"><h2>Sobre tus datos</h2><p>Los proyectos se guardan en este navegador. El archivo descargado queda donde tú elijas; no se sincroniza automáticamente. Guárdalo en un lugar seguro y revisa su contenido antes de compartirlo.</p></aside>
    </div>`;
}

export function mountTransferPage(main, service, records, onImported) {
  const list = main.querySelector('#transfer-projects');
  const fileInput = main.querySelector('#backup-file');
  const preview = main.querySelector('#transfer-preview');
  const status = main.querySelector('#transfer-status');
  const error = main.querySelector('#transfer-error');
  const exportAll = main.querySelector('#export-all');
  let inspection = null;
  let busy = false;

  function message(text) {
    error.hidden = true;
    error.textContent = '';
    status.textContent = text;
  }
  function fail(cause) {
    status.textContent = '';
    error.hidden = false;
    error.textContent = cause?.message || 'No se pudo completar la operación.';
    error.focus();
  }
  function renderRecords(items) {
    list.replaceChildren();
    if (!items.length) {
      list.append(node('p', 'empty-state', 'Aún no hay proyectos para exportar.'));
      exportAll.disabled = true;
      return;
    }
    exportAll.disabled = false;
    for (const record of items) {
      const row = node('div', 'transfer-project');
      const label = node('span', '', record.project.name.trim() || 'Sin título');
      const button = node('button', 'text-link', 'Exportar JSON');
      button.type = 'button';
      button.setAttribute('aria-label', `Exportar JSON de ${label.textContent}`);
      button.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        try {
          message(`Descargando ${await service.exportOne(record.id)}.`);
        } catch (cause) {
          fail(cause);
        } finally {
          busy = false;
        }
      });
      row.append(label, button);
      list.append(row);
    }
  }

  function clearPreview() {
    inspection = null;
    preview.hidden = true;
    preview.replaceChildren();
  }

  function renderPreview({ backup, conflicts }) {
    preview.replaceChildren();
    preview.hidden = false;
    const heading = node(
      'h3',
      '',
      `Vista previa · ${backup.projects.length} ${backup.projects.length === 1 ? 'proyecto' : 'proyectos'}`,
    );
    heading.tabIndex = -1;
    preview.append(
      heading,
      node(
        'p',
        '',
        `${conflicts.length} ${conflicts.length === 1 ? 'ID coincide' : 'ID coinciden'} con proyectos guardados en este navegador.`,
      ),
    );
    const projects = node('ul', 'transfer-preview-list');
    for (const project of backup.projects) {
      const item = node('li');
      item.append(
        node('strong', '', project.name.trim() || 'Sin título'),
        node(
          'span',
          '',
          `${project.alternatives.length} alternativas · ${project.criteria.length} criterios · ${project.evaluations.length} respuestas${conflicts.includes(project.id) ? ' · ID existente' : ''}`,
        ),
      );
      projects.append(item);
    }
    preview.append(
      projects,
      node('p', '', 'Elige cómo guardar los proyectos. Ninguna opción reemplaza los existentes.'),
    );
    const choices = node('fieldset', 'transfer-choices');
    choices.append(node('legend', '', 'Tratamiento de identificadores'));
    for (const [value, labelText] of [
      ['copy', 'Importar todos como copias independientes'],
      ['copy-conflicts', 'Conservar ID libres y copiar los conflictos'],
    ]) {
      const label = node('label');
      const radio = node('input');
      radio.type = 'radio';
      radio.name = 'import-mode';
      radio.value = value;
      radio.checked = value === 'copy';
      label.append(radio, node('span', '', labelText));
      choices.append(label);
    }
    const actions = node('div', 'transfer-actions');
    const confirm = node('button', 'btn btn--primary', 'Confirmar importación');
    confirm.type = 'button';
    const cancel = node('button', 'btn btn--outline', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', () => {
      clearPreview();
      fileInput.value = '';
      message('Importación cancelada. No se modificaron los proyectos.');
      fileInput.focus();
    });
    confirm.addEventListener('click', async () => {
      if (!inspection || busy) return;
      busy = true;
      confirm.disabled = true;
      try {
        const mode = choices.querySelector('input:checked').value;
        const imported = await service.importBackup(inspection.backup, mode);
        clearPreview();
        fileInput.value = '';
        try {
          renderRecords(await onImported());
        } catch {
          message(
            'Los proyectos se importaron, pero no se pudo actualizar la lista. Recarga la página para verlos.',
          );
          status.focus();
          return;
        }
        message(
          `${imported.length} ${imported.length === 1 ? 'proyecto importado' : 'proyectos importados'}. ${imported.filter((item) => item.copied).length} como copia. No se reemplazaron proyectos existentes.`,
        );
        status.focus();
      } catch (cause) {
        fail(cause);
        confirm.disabled = false;
      } finally {
        busy = false;
      }
    });
    actions.append(confirm, cancel);
    preview.append(choices, actions);
    heading.focus();
  }

  exportAll.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      message(`Descargando ${await service.exportAll()}.`);
    } catch (cause) {
      fail(cause);
    } finally {
      busy = false;
    }
  });
  fileInput.addEventListener('change', async () => {
    clearPreview();
    message('Revisando el archivo…');
    if (!fileInput.files.length) {
      message('');
      return;
    }
    if (busy) return;
    busy = true;
    try {
      inspection = await service.inspect(fileInput.files[0]);
      message('Archivo válido. Revisa la vista previa antes de importar.');
      renderPreview(inspection);
    } catch (cause) {
      fail(cause);
    } finally {
      busy = false;
    }
  });
  renderRecords(records);
}
