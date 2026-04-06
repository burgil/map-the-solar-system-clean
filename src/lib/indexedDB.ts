import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'SolarSystemDB';
const DB_VERSION = 4; // Bumped to force re-parse with case-insensitive NEO/PHA
const STORE_NAME = 'asteroids';
const META_STORE = 'metadata';

export interface Asteroid {
  id: string;
  spkid: number;
  full_name: string;
  pdes: string;
  name: string;
  neo: boolean;
  pha: boolean;
  H: number;
  diameter: number;
  albedo: number;
  diameter_sigma: number;
  orbit_id: string;
  epoch: number;
  epoch_mjd: number;
  e: number;
  a: number;
  q: number;
  i: number;
  om: number;
  w: number;
  ma: number;
  ad: number;
  n: number;
  tp: number;
  per: number;
  per_y: number;
  moid: number;
  moid_ld: number;
  class: string;
  rms: number;
  // Computed values
  estimatedValue: number;
  miningDifficulty: string;
  category: string;
  color: string;
}

let dbInstance: IDBPDatabase | null = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  // First, check if we need to delete the old database
  const databases = await indexedDB.databases?.() || [];
  const existingDB = databases.find(db => db.name === DB_NAME);

  if (existingDB && existingDB.version !== DB_VERSION) {
    console.log(`DB version mismatch (${existingDB.version} vs ${DB_VERSION}), deleting old database...`);
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => {
        console.log('Old database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onblocked = () => {
        console.warn('Delete blocked, proceeding anyway...');
        resolve();
      };
    });
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      console.log('Creating fresh database stores...');

      // Asteroids store with indexes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name');
        store.createIndex('class', 'class');
        store.createIndex('estimatedValue', 'estimatedValue');
        store.createIndex('diameter', 'diameter');
        store.createIndex('neo', 'neo');
        store.createIndex('pha', 'pha');
      }

      // Metadata store
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export async function isDataCached(): Promise<boolean> {
  const db = await getDB();
  const meta = await db.get(META_STORE, 'dataLoaded');
  return meta?.value === true;
}

export async function getCachedCount(): Promise<number> {
  const db = await getDB();
  return await db.count(STORE_NAME);
}

// Get partial loading progress (for resuming interrupted downloads)
export async function getPartialLoadProgress(): Promise<{ storedCount: number; totalExpected: number; isComplete: boolean }> {
  const db = await getDB();
  const storedCount = await db.count(STORE_NAME);
  const meta = await db.get(META_STORE, 'loadProgress');
  const isComplete = (await db.get(META_STORE, 'dataLoaded'))?.value === true;

  return {
    storedCount,
    totalExpected: meta?.totalExpected || 0,
    isComplete,
  };
}

// Update partial loading progress
export async function updatePartialLoadProgress(storedCount: number, totalExpected: number): Promise<void> {
  const db = await getDB();
  await db.put(META_STORE, { key: 'loadProgress', storedCount, totalExpected, timestamp: Date.now() });
}

export async function storeAsteroids(asteroids: Asteroid[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');

  for (const asteroid of asteroids) {
    await tx.store.put(asteroid);
  }

  await tx.done;
}

export async function markDataLoaded(): Promise<void> {
  const db = await getDB();
  await db.put(META_STORE, { key: 'dataLoaded', value: true, timestamp: Date.now() });
}

export async function getAsteroidsByPage(page: number, pageSize: number): Promise<Asteroid[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store;

  let cursor = await store.openCursor();
  const results: Asteroid[] = [];
  let skipped = 0;
  const skipCount = page * pageSize;

  while (cursor) {
    if (skipped < skipCount) {
      skipped++;
      cursor = await cursor.continue();
      continue;
    }

    if (results.length >= pageSize) break;
    results.push(cursor.value);
    cursor = await cursor.continue();
  }

  return results;
}

export async function searchAsteroids(
  query: string,
  page: number = 0,
  pageSize: number = 50
): Promise<{ results: Asteroid[]; total: number }> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store;

  let cursor = await store.openCursor();
  const allMatches: Asteroid[] = [];
  const lowerQuery = query.toLowerCase();

  while (cursor) {
    const asteroid = cursor.value as Asteroid;
    if (
      asteroid.name?.toLowerCase().includes(lowerQuery) ||
      asteroid.pdes?.toLowerCase().includes(lowerQuery) ||
      asteroid.full_name?.toLowerCase().includes(lowerQuery)
    ) {
      allMatches.push(asteroid);
    }
    cursor = await cursor.continue();
  }

  const start = page * pageSize;
  return {
    results: allMatches.slice(start, start + pageSize),
    total: allMatches.length,
  };
}



export async function getAllAsteroids(): Promise<Asteroid[]> {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}



export async function getStatistics(): Promise<{
  totalCount: number;
  totalValue: number;
  neoCount: number;
  phaCount: number;
  classCounts: Record<string, number>;
}> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store;

  let cursor = await store.openCursor();
  let totalCount = 0;
  let totalValue = 0;
  let neoCount = 0;
  let phaCount = 0;
  const classCounts: Record<string, number> = {};

  while (cursor) {
    const asteroid = cursor.value as Asteroid;
    totalCount++;
    totalValue += asteroid.estimatedValue || 0;
    if (asteroid.neo) neoCount++;
    if (asteroid.pha) phaCount++;
    classCounts[asteroid.class] = (classCounts[asteroid.class] || 0) + 1;
    cursor = await cursor.continue();
  }

  return { totalCount, totalValue, neoCount, phaCount, classCounts };
}



// Stream asteroids from cache with abort support
export async function streamAsteroidsFromCache(abortSignal?: AbortSignal): Promise<Asteroid[]> {
  const db = await getDB();
  const total = await db.count(STORE_NAME);

  if (total === 0) return [];

  // Check abort BEFORE the expensive getAll operation
  if (abortSignal?.aborted) {
    console.log('📦 streamAsteroidsFromCache: Aborted before loading');
    return [];
  }

  const allAsteroids = await db.getAll(STORE_NAME);

  return allAsteroids;
}
