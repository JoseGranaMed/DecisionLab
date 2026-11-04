export const DATABASE_VERSION = 1;
export const STORE_NAME = 'projects';

export class StorageError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'StorageError';
    this.code = code;
  }
}

export function toStorageError(error) {
  if (error instanceof StorageError) return error;
  const code =
    error?.name === 'VersionError'
      ? 'version-incompatible'
      : error?.name === 'QuotaExceededError'
        ? 'quota-exceeded'
        : error?.name === 'ConstraintError'
          ? 'duplicate-id'
          : 'storage-failed';
  return new StorageError(
    code,
    'No se pudo completar la operación de almacenamiento local.',
    error,
  );
}

export function openDatabase(factory, name) {
  if (!factory)
    return Promise.reject(
      new StorageError('unavailable', 'IndexedDB no está disponible en este navegador.'),
    );
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    try {
      request = factory.open(name, DATABASE_VERSION);
    } catch (error) {
      reject(toStorageError(error));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onerror = () => {
      if (!settled) reject(toStorageError(request.error));
    };
    request.onblocked = () => {
      settled = true;
      reject(
        new StorageError('blocked', 'Cierra otras pestañas de DecisionLab y vuelve a intentarlo.'),
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (settled) db.close();
      else {
        settled = true;
        resolve(db);
      }
    };
  });
}

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error));
  });
}

export async function transact(factory, name, mode, work) {
  const db = await openDatabase(factory, name);
  let transaction;
  let done;
  try {
    transaction = db.transaction(STORE_NAME, mode);
    done = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(toStorageError(transaction.error));
      transaction.onabort = () => reject(toStorageError(transaction.error));
    });
    const value = await work(transaction.objectStore(STORE_NAME));
    await done;
    return value;
  } catch (error) {
    if (transaction) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already have completed or aborted.
      }
    }
    await done?.catch(() => {});
    throw toStorageError(error);
  } finally {
    db.close();
  }
}
