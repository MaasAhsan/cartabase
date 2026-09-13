// CartabaseDB — all vehicle data and captured images live entirely
// on this device, in IndexedDB. Nothing is sent to a server.

const CartabaseDB = (() => {
  const DB_NAME = 'cartabase';
  const DB_VERSION = 1;
  const STORE = 'vehicles';

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('capturedAt', 'capturedAt');
          store.createIndex('brand', 'brand');
          store.createIndex('color', 'color');
          store.createIndex('vehicleType', 'vehicleType');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(mode) {
    const db = await open();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // record shape:
  // {
  //   id, imageBlob (Blob), licensePlate, plateConfidence,
  //   color, colorConfidence, brand, brandConfidence,
  //   model, modelConfidence, vehicleType, vehicleTypeConfidence,
  //   capturedAt, createdAt, updatedAt
  // }

  async function addVehicle(record) {
    const store = await tx('readwrite');
    const now = new Date().toISOString();
    const toStore = { ...record, createdAt: now, updatedAt: now };
    const id = await promisify(store.add(toStore));
    return getVehicle(id);
  }

  async function getVehicle(id) {
    const store = await tx('readonly');
    return promisify(store.get(Number(id)));
  }

  async function updateVehicle(id, changes) {
    const store = await tx('readwrite');
    const existing = await promisify(store.get(Number(id)));
    if (!existing) return null;
    const updated = { ...existing, ...changes, id: existing.id, updatedAt: new Date().toISOString() };
    await promisify(store.put(updated));
    return updated;
  }

  async function deleteVehicle(id) {
    const store = await tx('readwrite');
    const existing = await promisify(store.get(Number(id)));
    if (!existing) return null;
    await promisify(store.delete(Number(id)));
    return existing;
  }

  async function listVehicles(filters = {}) {
    const store = await tx('readonly');
    const all = await promisify(store.getAll());

    let results = all;

    if (filters.plate) {
      const needle = filters.plate.toUpperCase().replace(/\s+/g, '');
      results = results.filter((v) =>
        (v.licensePlate || '').toUpperCase().replace(/\s+/g, '').includes(needle));
    }
    if (filters.color) {
      results = results.filter((v) => v.color === filters.color);
    }
    if (filters.brand) {
      results = results.filter((v) => v.brand === filters.brand);
    }
    if (filters.model) {
      const needle = filters.model.toUpperCase();
      results = results.filter((v) => (v.model || '').toUpperCase().includes(needle));
    }
    if (filters.vehicleType) {
      results = results.filter((v) => v.vehicleType === filters.vehicleType);
    }
    if (filters.dateFrom) {
      results = results.filter((v) => v.capturedAt && v.capturedAt.slice(0, 10) >= filters.dateFrom);
    }
    if (filters.dateTo) {
      results = results.filter((v) => v.capturedAt && v.capturedAt.slice(0, 10) <= filters.dateTo);
    }

    results.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || '') || b.id - a.id);
    return results;
  }

  async function distinctValues(field) {
    const store = await tx('readonly');
    const all = await promisify(store.getAll());
    const set = new Set(all.map((v) => v[field]).filter(Boolean));
    return Array.from(set).sort();
  }

  async function exportAll() {
    const store = await tx('readonly');
    return promisify(store.getAll());
  }

  return { addVehicle, getVehicle, updateVehicle, deleteVehicle, listVehicles, distinctValues, exportAll };
})();
