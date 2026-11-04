import { SCHEMA_VERSION } from '../domain/model.js';
import { validateProject } from '../domain/validation.js';

export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_PROJECTS = 500;

export class BackupError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
    this.details = details;
  }
}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isoDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT/.test(value) &&
  Number.isFinite(Date.parse(value));

function exactKeys(value, allowed, path) {
  if (!object(value)) throw new BackupError('invalid-shape', `${path} debe ser un objeto.`);
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown)
    throw new BackupError('unexpected-field', `${path} contiene un campo no admitido: ${unknown}.`);
}

function pick(value, keys, path) {
  exactKeys(value, keys, path);
  for (const key of keys)
    if (Object.hasOwn(value, key) && value[key] === null)
      throw new BackupError('null-field', `${path}.${key} no puede ser nulo.`);
  return Object.fromEntries(
    keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]),
  );
}

function boundedStrings(value, path = 'respaldo') {
  if (typeof value === 'string' && value.length > 5000)
    throw new BackupError('text-too-long', `${path} contiene un texto demasiado largo.`);
  if (Array.isArray(value))
    value.forEach((item, index) => boundedStrings(item, `${path}[${index}]`));
  else if (object(value))
    Object.entries(value).forEach(([key, item]) => {
      if (key.length > 256)
        throw new BackupError('id-too-long', `${path} contiene una clave demasiado larga.`);
      boundedStrings(item, `${path}.${key}`);
    });
}

/** Copies only the fields of schema 1. No parsed object is spread into app state. */
export function canonicalProject(source, index = 0) {
  const path = `projects[${index}]`;
  const project = pick(
    source,
    [
      'id',
      'schemaVersion',
      'name',
      'question',
      'description',
      'workflowStep',
      'createdAt',
      'updatedAt',
      'alternatives',
      'criteria',
      'evaluations',
      'scenarios',
    ],
    path,
  );
  if (project.schemaVersion !== SCHEMA_VERSION)
    throw new BackupError(
      'schema-version',
      `El proyecto ${index + 1} usa una versión de esquema incompatible.`,
    );
  for (const field of ['alternatives', 'criteria', 'evaluations', 'scenarios'])
    if (!Array.isArray(project[field]))
      throw new BackupError('invalid-shape', `${path}.${field} debe ser una lista.`);
  project.alternatives = project.alternatives.map((item, itemIndex) =>
    pick(item, ['id', 'name', 'description', 'order'], `${path}.alternatives[${itemIndex}]`),
  );
  project.criteria = project.criteria.map((item, itemIndex) =>
    pick(
      item,
      ['id', 'name', 'description', 'type', 'weight', 'unit', 'min', 'max', 'direction'],
      `${path}.criteria[${itemIndex}]`,
    ),
  );
  project.evaluations = project.evaluations.map((item, itemIndex) =>
    pick(item, ['alternativeId', 'criterionId', 'value'], `${path}.evaluations[${itemIndex}]`),
  );
  project.scenarios = project.scenarios.map((item, itemIndex) => {
    const scenario = pick(item, ['id', 'name', 'weights'], `${path}.scenarios[${itemIndex}]`);
    if (!object(scenario.weights))
      throw new BackupError(
        'invalid-shape',
        `${path}.scenarios[${itemIndex}].weights debe ser un objeto.`,
      );
    scenario.weights = Object.fromEntries(Object.entries(scenario.weights));
    if (Object.values(scenario.weights).some((weight) => weight === null))
      throw new BackupError(
        'null-field',
        `${path}.scenarios[${itemIndex}].weights contiene un peso nulo.`,
      );
    return scenario;
  });
  const validation = validateProject(project, { mode: 'draft' });
  if (!validation.ok)
    throw new BackupError(
      'invalid-project',
      `El proyecto ${index + 1} contiene datos inconsistentes: ${validation.errors[0].message}`,
      validation.errors,
    );
  boundedStrings(project, path);
  return project;
}

function verifiedProjects(projects) {
  if (!Array.isArray(projects) || projects.length > MAX_BACKUP_PROJECTS)
    throw new BackupError(
      'project-limit',
      `El respaldo admite hasta ${MAX_BACKUP_PROJECTS} proyectos.`,
    );
  const seen = new Set();
  return projects.map((item, index) => {
    const project = canonicalProject(item, index);
    if (seen.has(project.id))
      throw new BackupError(
        'duplicate-project',
        'El respaldo contiene identificadores de proyecto repetidos.',
      );
    seen.add(project.id);
    return project;
  });
}

export function serializeBackup(projects, exportedAt = new Date().toISOString()) {
  if (!isoDate(exportedAt))
    throw new BackupError('invalid-date', 'La fecha del respaldo no es válida.');
  const backup = {
    application: 'DecisionLab',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    projects: verifiedProjects(projects),
  };
  const json = `${JSON.stringify(backup, null, 2)}\n`;
  if (new globalThis.TextEncoder().encode(json).length > MAX_BACKUP_BYTES)
    throw new BackupError('file-too-large', 'El respaldo supera el límite de 20 MiB.');
  return json;
}

export function parseBackup(text) {
  if (
    typeof text !== 'string' ||
    new globalThis.TextEncoder().encode(text).length > MAX_BACKUP_BYTES
  )
    throw new BackupError('file-too-large', 'El archivo supera el límite de 20 MiB.');
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-json', 'El archivo no contiene JSON válido.');
  }
  exactKeys(backup, ['application', 'formatVersion', 'exportedAt', 'projects'], 'El respaldo');
  if (backup.application !== 'DecisionLab')
    throw new BackupError('application', 'El archivo no es un respaldo de DecisionLab.');
  if (backup.formatVersion !== BACKUP_FORMAT_VERSION)
    throw new BackupError('format-version', 'La versión del formato de respaldo no es compatible.');
  if (!isoDate(backup.exportedAt))
    throw new BackupError('invalid-date', 'La fecha del respaldo no es válida.');
  return {
    application: backup.application,
    formatVersion: backup.formatVersion,
    exportedAt: backup.exportedAt,
    projects: verifiedProjects(backup.projects),
  };
}

/** Preparation is pure; IDs of alternatives, criteria, answers and scenarios stay unchanged. */
export function planImport(
  projects,
  existingIds,
  { mode = 'copy', idFactory = () => globalThis.crypto.randomUUID() } = {},
) {
  if (!['copy', 'copy-conflicts'].includes(mode))
    throw new BackupError('invalid-mode', 'Modo de importación desconocido.');
  const candidates = verifiedProjects(projects);
  const used = new Set(existingIds);
  return candidates.map((project) => {
    const sourceId = project.id;
    const copied = mode === 'copy' || used.has(sourceId);
    if (copied) {
      let id;
      for (let attempt = 0; attempt < 20; attempt++) {
        id = idFactory();
        if (typeof id === 'string' && id.trim() && !used.has(id) && id !== sourceId) break;
      }
      if (typeof id !== 'string' || !id.trim() || used.has(id) || id === sourceId)
        throw new BackupError('id-collision', 'No se pudo generar un identificador libre.');
      project.id = id;
    }
    used.add(project.id);
    return { sourceId, project, copied };
  });
}
