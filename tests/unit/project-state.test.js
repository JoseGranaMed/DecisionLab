import { describe, expect, it } from 'vitest';
import { createDraftProject } from '../../src/domain/model.js';
import { createProjectState } from '../../src/app/project-state.js';

function fixture(updateProject) {
  let record = {
    id: 'p',
    revision: 1,
    project: createDraftProject({ id: 'p', timestamp: '2026-10-31T00:00:00.000Z' }),
  };
  const repository = {
    getProject: async () => structuredClone(record),
    listProjects: async () => [structuredClone(record)],
    updateProject: async (project, revision) => {
      const next = await updateProject(project, revision);
      record = structuredClone(next);
      return structuredClone(record);
    },
  };
  const state = createProjectState(repository, { setTimer: () => 1, clearTimer: () => {} });
  return { state, current: () => record };
}

describe('estado de edición', () => {
  it('una escritura antigua no sustituye una edición más reciente', async () => {
    let resolveFirst;
    let calls = 0;
    const { state, current } = fixture((project, revision) => {
      calls++;
      const next = { id: 'p', revision: revision + 1, project };
      return calls === 1
        ? new Promise((resolve) => {
            resolveFirst = () => resolve(next);
          })
        : next;
    });
    await state.open('p');
    state.edit({ name: 'Primera edición' });
    const saving = state.saveNow();
    state.edit({ name: 'Segunda edición' });
    resolveFirst();
    expect(await saving).toBe(true);
    expect(state.snapshot().active.name).toBe('Segunda edición');
    expect(current().project.name).toBe('Segunda edición');
    expect(current().revision).toBe(3);
    expect(state.snapshot().status).toBe('saved');
  });

  it('conserva cambios tras un error y permite reintentar', async () => {
    let calls = 0;
    const { state } = fixture((project, revision) => {
      calls++;
      if (calls === 1) throw new Error('Sin espacio');
      return { id: 'p', revision: revision + 1, project };
    });
    await state.open('p');
    state.edit({ name: 'Sin perder' });
    expect(await state.saveNow()).toBe(false);
    expect(state.snapshot()).toMatchObject({
      dirty: true,
      status: 'error',
      active: { name: 'Sin perder' },
    });
    expect(await state.saveNow()).toBe(true);
    expect(state.snapshot()).toMatchObject({
      dirty: false,
      status: 'saved',
      active: { name: 'Sin perder' },
    });
  });
});
