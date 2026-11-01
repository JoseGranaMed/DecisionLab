import { createDraftProject, SCHEMA_VERSION } from '../domain/model.js';
import { validateProject } from '../domain/validation.js';
import { StorageError, transact, requestResult } from './indexeddb.js';

function validId(id) {
  if (typeof id !== 'string' || !id.trim())
    throw new StorageError('invalid-id', 'Identificador de proyecto inválido.');
}

function checkedProject(project) {
  const validation = validateProject(project, { mode: 'draft' });
  if (!validation.ok)
    throw new StorageError(
      'invalid-project',
      'El proyecto tiene datos inconsistentes.',
      validation.errors,
    );
  return structuredClone(project);
}

function checkedRecord(record) {
  if (!record) return null;
  if (record.project?.schemaVersion > SCHEMA_VERSION) {
    throw new StorageError(
      'schema-incompatible',
      'Este proyecto fue creado con una versión más reciente de DecisionLab.',
    );
  }
  if (
    record.id !== record.project?.id ||
    !Number.isInteger(record.revision) ||
    record.revision < 1 ||
    !validateProject(record.project, { mode: 'draft' }).ok
  ) {
    throw new StorageError('corrupt-record', 'Hay un proyecto almacenado con datos incompatibles.');
  }
  return structuredClone(record);
}

function freshTimestamp(current, now) {
  const candidate = now();
  const previous = Date.parse(current);
  return Date.parse(candidate) <= previous ? new Date(previous + 1).toISOString() : candidate;
}

/** Repository contract: methods return {project, revision}, arrays of those records, booleans, or throw StorageError. */
export function createProjectRepository({
  databaseName = 'decisionlab',
  indexedDBFactory = globalThis.indexedDB,
  idFactory = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString(),
} = {}) {
  const run = (mode, work) => transact(indexedDBFactory, databaseName, mode, work);

  async function createProject({
    name = '',
    question = '',
    description = '',
    template = null,
  } = {}) {
    if ([name, question, description].some((field) => typeof field !== 'string'))
      throw new StorageError('invalid-project', 'Los datos generales deben ser textos.');
    const id = idFactory();
    validId(id);
    const timestamp = now();
    const project = template
      ? { ...structuredClone(template), id, createdAt: timestamp, updatedAt: timestamp }
      : createDraftProject({ id, timestamp });
    if (!template)
      Object.assign(project, {
        name: name.trim(),
        question: question.trim(),
        description: description.trim(),
      });
    const record = { id, revision: 1, project: checkedProject(project) };
    await run('readwrite', (store) => requestResult(store.add(record)));
    return structuredClone(record);
  }

  async function getProject(id) {
    validId(id);
    return checkedRecord(await run('readonly', (store) => requestResult(store.get(id))));
  }

  async function listProjects() {
    const records = await run('readonly', (store) => requestResult(store.getAll()));
    return records
      .map(checkedRecord)
      .sort(
        (a, b) =>
          b.project.updatedAt.localeCompare(a.project.updatedAt) || a.id.localeCompare(b.id),
      );
  }

  async function updateProject(project, expectedRevision) {
    validId(project?.id);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1)
      throw new StorageError('revision-required', 'Falta la revisión esperada.');
    const input = checkedProject(project);
    return run('readwrite', async (store) => {
      const current = checkedRecord(await requestResult(store.get(input.id)));
      if (!current) throw new StorageError('not-found', 'El proyecto ya no existe.');
      if (current.revision !== expectedRevision)
        throw new StorageError(
          'conflict',
          'El proyecto cambió en otra pestaña. Recarga antes de guardar.',
        );
      if (input.schemaVersion !== SCHEMA_VERSION || input.createdAt !== current.project.createdAt)
        throw new StorageError(
          'immutable-field',
          'No se puede cambiar la identidad o fecha de creación del proyecto.',
        );
      input.updatedAt = freshTimestamp(current.project.updatedAt, now);
      const next = { id: input.id, revision: current.revision + 1, project: input };
      await requestResult(store.put(next));
      return structuredClone(next);
    });
  }

  async function deleteProject(id, expectedRevision) {
    validId(id);
    return run('readwrite', async (store) => {
      const current = checkedRecord(await requestResult(store.get(id)));
      if (!current) return false;
      if (expectedRevision !== undefined && current.revision !== expectedRevision)
        throw new StorageError('conflict', 'El proyecto cambió en otra pestaña.');
      await requestResult(store.delete(id));
      return true;
    });
  }

  async function duplicateProject(id) {
    validId(id);
    return run('readwrite', async (store) => {
      const source = checkedRecord(await requestResult(store.get(id)));
      if (!source) throw new StorageError('not-found', 'El proyecto original ya no existe.');
      const newId = idFactory();
      validId(newId);
      const timestamp = now();
      const project = checkedProject({
        ...source.project,
        id: newId,
        name: `${source.project.name || 'Sin título'} (copia)`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const copy = { id: newId, revision: 1, project };
      await requestResult(store.add(copy));
      return structuredClone(copy);
    });
  }

  return {
    createProject,
    getProject,
    listProjects,
    updateProject,
    deleteProject,
    duplicateProject,
  };
}
