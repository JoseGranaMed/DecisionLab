/** One in-memory editing state coordinates UI, repository and autosave. */
export function createProjectState(
  repository,
  { delay = 650, setTimer = setTimeout, clearTimer = clearTimeout } = {},
) {
  let records = [];
  let active = null;
  let draft = null;
  let revision = 0;
  let generation = 0;
  let dirty = false;
  let status = 'idle';
  let error = null;
  let timer = null;
  let inFlight = null;
  const listeners = new Set();

  const snapshot = () => ({
    records: structuredClone(records),
    active: draft ? structuredClone(draft) : null,
    revision,
    dirty,
    status,
    error,
  });
  const emit = () => {
    for (const listener of listeners) listener(snapshot());
  };
  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const schedule = () => {
    cancelTimer();
    timer = setTimer(() => {
      timer = null;
      void saveNow();
    }, delay);
  };

  function setActive(record) {
    cancelTimer();
    active = record?.id ?? null;
    draft = record ? structuredClone(record.project) : null;
    revision = record?.revision ?? 0;
    generation++;
    dirty = false;
    status = record ? 'saved' : 'idle';
    error = null;
    emit();
  }

  async function refresh() {
    records = await repository.listProjects();
    emit();
    return snapshot().records;
  }

  async function open(id, isCurrent = () => true) {
    if (dirty || inFlight) throw new Error('unsaved-changes');
    const record = await repository.getProject(id);
    if (isCurrent()) setActive(record);
    return record;
  }

  async function create(options) {
    if (dirty || inFlight) throw new Error('unsaved-changes');
    const record = await repository.createProject(options);
    await refresh();
    setActive(record);
    return record;
  }

  function edit(fields) {
    if (!draft) throw new Error('no-active-project');
    draft = { ...draft, ...fields };
    generation++;
    dirty = true;
    status = 'dirty';
    error = null;
    emit();
    schedule();
  }

  async function saveNow() {
    cancelTimer();
    if (inFlight) {
      const committed = await inFlight;
      return committed && dirty ? saveNow() : committed;
    }
    if (!dirty || !draft) return true;
    inFlight = performSave().finally(() => {
      inFlight = null;
    });
    const committed = await inFlight;
    return committed && dirty ? saveNow() : committed;
  }

  async function performSave() {
    const savedGeneration = generation;
    const savedId = active;
    const candidate = structuredClone(draft);
    status = 'saving';
    error = null;
    emit();
    try {
      const record = await repository.updateProject(candidate, revision);
      revision = record.revision;
      if (active === savedId && generation === savedGeneration) {
        draft = structuredClone(record.project);
        dirty = false;
        status = 'saved';
      } else {
        status = 'dirty';
        schedule();
      }
      await refresh();
      emit();
      return true;
    } catch (cause) {
      error = cause;
      status = 'error';
      dirty = true;
      emit();
      return false;
    }
  }

  async function duplicate(id) {
    if (dirty || inFlight) throw new Error('unsaved-changes');
    const record = await repository.duplicateProject(id);
    await refresh();
    setActive(record);
    return record;
  }

  async function remove(id, expectedRevision) {
    if (dirty || inFlight) throw new Error('unsaved-changes');
    const removed = await repository.deleteProject(id, expectedRevision);
    await refresh();
    if (active === id) setActive(null);
    return removed;
  }

  function discard() {
    setActive(null);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    refresh,
    open,
    create,
    edit,
    saveNow,
    duplicate,
    remove,
    discard,
  };
}
