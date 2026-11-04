import {
  BackupError,
  MAX_BACKUP_BYTES,
  parseBackup,
  serializeBackup,
} from '../../data/backup-format.js';

function downloadJson(json, kind, documentRef = globalThis.document, urlApi = globalThis.URL) {
  const name = `decisionlab-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new globalThis.Blob([json], { type: 'application/json;charset=utf-8' });
  const url = urlApi.createObjectURL(blob);
  let anchor;
  try {
    anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.hidden = true;
    documentRef.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    setTimeout(() => urlApi.revokeObjectURL(url), 1000);
  }
  return name;
}

export function createTransferService(repository) {
  return {
    async exportOne(id) {
      const record = await repository.getProject(id);
      if (!record) throw new BackupError('not-found', 'La comparación ya no existe.');
      return downloadJson(serializeBackup([record.project]), 'proyecto');
    },
    async exportAll() {
      const records = await repository.listProjects();
      return downloadJson(serializeBackup(records.map((record) => record.project)), 'respaldo');
    },
    async inspect(file) {
      if (!file) throw new BackupError('missing-file', 'Selecciona un archivo JSON.');
      if (file.size > MAX_BACKUP_BYTES)
        throw new BackupError('file-too-large', 'El archivo supera el límite de 20 MiB.');
      const backup = parseBackup(await file.text());
      const existing = new Set((await repository.listProjects()).map((record) => record.id));
      return {
        backup,
        conflicts: backup.projects
          .filter((project) => existing.has(project.id))
          .map((project) => project.id),
      };
    },
    async importBackup(backup, mode) {
      return repository.importProjects(backup.projects, { mode });
    },
  };
}
