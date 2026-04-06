import { type Asteroid, storeAsteroids, markDataLoaded, isDataCached, getCachedCount, streamAsteroidsFromCache, getPartialLoadProgress, updatePartialLoadProgress } from './indexedDB';

// Asteroid classification based on orbital parameters
function classifyAsteroid(asteroid: Partial<Asteroid>): string {
  const { a = 0, e = 0, q = 0, neo, pha } = asteroid;

  if (pha) return 'Potentially Hazardous';
  if (neo) return 'Near-Earth Object';

  // Main belt classifications
  if (a >= 2.0 && a <= 3.3 && e < 0.3) {
    if (a < 2.5) return 'Inner Main Belt';
    if (a < 2.82) return 'Middle Main Belt';
    return 'Outer Main Belt';
  }

  // Trojans (Jupiter)
  if (a >= 5.05 && a <= 5.4) return 'Jupiter Trojan';

  // Kuiper Belt
  if (a >= 30 && a <= 50) return 'Kuiper Belt Object';

  // Trans-Neptunian
  if (a > 30) return 'Trans-Neptunian Object';

  // Hildas
  if (a >= 3.7 && a <= 4.2 && e < 0.3) return 'Hilda Asteroid';

  // Apollo, Amor, Aten based on orbital elements
  if (q < 1.017 && a >= 1.0) return 'Apollo Asteroid';
  if (q >= 1.017 && q <= 1.3 && a > 1.0) return 'Amor Asteroid';
  if (a < 1.0) return 'Aten Asteroid';

  return 'Unknown';
}

// Estimate asteroid color based on albedo and class
function getAsteroidColor(asteroid: Partial<Asteroid>): string {
  const albedo = asteroid.albedo || 0.1;
  const className = asteroid.class || '';

  // C-type (carbonaceous) - dark
  if (className.startsWith('C') || albedo < 0.1) {
    return '#4a4a4a';
  }

  // S-type (silicaceous) - rocky/reddish
  if (className.startsWith('S') || (albedo >= 0.1 && albedo < 0.25)) {
    return '#8b7355';
  }

  // M-type (metallic) - bright/metallic
  if (className.startsWith('M') || albedo >= 0.25) {
    return '#a8a8a8';
  }

  // Based on albedo gradient
  if (albedo < 0.05) return '#2d2d2d';
  if (albedo < 0.15) return '#5a5a5a';
  if (albedo < 0.3) return '#888888';
  return '#b0b0b0';
}

// Estimate mining difficulty based on orbital parameters
function getMiningDifficulty(asteroid: Partial<Asteroid>): string {
  const { a = 0, e = 0, i = 0, moid = 999 } = asteroid;

  // Delta-v approximation (simplified)
  const deltaV = Math.abs(a - 1) * 5 + e * 3 + (i / 10) * 2;

  if (deltaV < 3 && moid < 0.1) return 'Easy';
  if (deltaV < 5 && moid < 0.3) return 'Moderate';
  if (deltaV < 8) return 'Difficult';
  if (deltaV < 12) return 'Very Difficult';
  return 'Extreme';
}

// Estimate asteroid value based on size, composition, and accessibility
function estimateValue(asteroid: Partial<Asteroid>): number {
  const diameter = asteroid.diameter || 0;
  const albedo = asteroid.albedo || 0.1;
  const className = asteroid.class || '';

  // No diameter = no reliable estimate
  if (diameter <= 0) {
    // Estimate from absolute magnitude if available
    const H = asteroid.H || 20;
    const estimatedDiameter = 1329 / Math.sqrt(albedo || 0.1) * Math.pow(10, -0.2 * H);
    return estimateValueFromDiameter(estimatedDiameter, albedo, className);
  }

  return estimateValueFromDiameter(diameter, albedo, className);
}

function estimateValueFromDiameter(diameter: number, albedo: number, className: string): number {
  // Volume in km³
  const radius = diameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);

  // Mass estimation (density varies by type)
  let density = 2.5; // g/cm³ default (rocky)

  if (className.startsWith('C') || albedo < 0.1) {
    density = 1.5; // Carbonaceous - water, organics
  } else if (className.startsWith('M') || albedo > 0.25) {
    density = 5.0; // Metallic - iron, nickel, platinum
  } else if (className.startsWith('S')) {
    density = 2.7; // Silicaceous - rocky
  }

  // Mass in kg (volume in km³ to m³, density g/cm³ to kg/m³)
  const massKg = volume * 1e9 * density * 1000;

  // Value per kg based on composition with more variance
  // Add randomness based on diameter to create natural variation
  const varianceFactor = 0.5 + (diameter % 10) / 10; // 0.5-1.5x variance

  let valuePerKg = 0.0001 * varianceFactor; // Default: rocky material, low value

  if (className.startsWith('M') || albedo > 0.25) {
    // Metallic asteroids: iron, nickel, platinum group metals
    valuePerKg = 0.1 * varianceFactor; // $/kg for precious metals content
  } else if (className.startsWith('C') || albedo < 0.1) {
    // Carbonaceous: water, organics (valuable for space resources)
    valuePerKg = 0.01 * varianceFactor; // $/kg for volatiles
  } else {
    // S-type: silicates, some metals
    valuePerKg = 0.005 * varianceFactor;
  }

  // Calculate base value
  let value = massKg * valuePerKg;

  // Scale down to realistic range (millions to trillions, not quadrillions)
  // Small asteroids: millions, Large asteroids: billions/trillions
  value = value * 0.0000001;

  // Ensure minimum value for small asteroids
  if (value < 1000000) {
    value = Math.max(100000, value * 100); // At least $100K
  }

  return Math.round(value);
}

// Parse a single CSV row
function parseRow(row: string, headers: string[]): Partial<Asteroid> | null {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  if (values.length < headers.length) return null;

  const obj: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    const value = values[i];

    if (header === 'neo' || header === 'pha') {
      // Parse case-insensitively for Y/N flags
      obj[header] = value?.toUpperCase() === 'Y';
    } else if (['spkid', 'H', 'diameter', 'albedo', 'diameter_sigma', 'epoch', 'epoch_mjd',
      'e', 'a', 'q', 'i', 'om', 'w', 'ma', 'ad', 'n', 'tp', 'per', 'per_y',
      'moid', 'moid_ld', 'rms'].includes(header)) {
      const num = parseFloat(value);
      obj[header] = isNaN(num) ? 0 : num;
    } else {
      obj[header] = value;
    }
  });

  return obj as Partial<Asteroid>;
}

export interface LoadProgress {
  phase: 'checking' | 'downloading' | 'parsing' | 'storing' | 'loading-cache' | 'complete';
  current: number;
  total: number;
  message: string;
}

export async function loadAsteroidData(
  onProgress?: (progress: LoadProgress) => void,
  abortSignal?: AbortSignal
): Promise<number> {
  // Show initial progress immediately
  onProgress?.({ phase: 'checking', current: 0, total: 100, message: 'Checking cache...' });

  // CRITICAL: Yield to event loop FIRST so user can click Skip before we start loading
  // This gives the loading screen ~100ms to render and register user input
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check if user clicked Skip during the yield
  if (abortSignal?.aborted) {
    console.log('📦 loadAsteroidData: Cancelled during initial yield');
    throw new DOMException('Aborted', 'AbortError');
  }

  // Check if data is fully loaded
  if (await isDataCached()) {
    const count = await getCachedCount();
    if (count > 0) {
      // Check abort before streaming from cache
      if (abortSignal?.aborted) {
        console.log('📦 loadAsteroidData: Cancelled before cache streaming');
        throw new DOMException('Aborted', 'AbortError');
      }

      // Stream from cache with progress
      onProgress?.({ phase: 'loading-cache', current: 0, total: count, message: 'Loading asteroids from cache...' });

      // Note: streamAsteroidsFromCache checks abort BEFORE the expensive db.getAll
      await streamAsteroidsFromCache(abortSignal);

      // Check abort after cache streaming
      if (abortSignal?.aborted) {
        console.log('📦 loadAsteroidData: Cancelled after cache streaming');
        throw new DOMException('Aborted', 'AbortError');
      }

      onProgress?.({ phase: 'complete', current: 100, total: 100, message: `Loaded ${count.toLocaleString()} asteroids` });
      return count;
    }
  }

  // Check for partial loading (interrupted download)
  const partialProgress = await getPartialLoadProgress();
  const alreadyStored = partialProgress.storedCount;

  if (alreadyStored > 0 && !partialProgress.isComplete) {
    onProgress?.({
      phase: 'checking',
      current: 0,
      total: 100,
      message: `Found ${alreadyStored.toLocaleString()} partially stored asteroids, resuming...`
    });
  }

  // Fetch the CSV file with abort support
  onProgress?.({ phase: 'downloading', current: 0, total: 100, message: 'Downloading asteroid data...' });

  const response = await fetch('/data/dataset.csv', { signal: abortSignal });
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }

  const contentLength = response.headers.get('Content-Length');
  const estimatedTotal = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Cannot read response body');

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    // Check for cancellation during download
    if (abortSignal?.aborted) {
      console.log('📦 loadAsteroidData: Cancelled during download');
      reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }

    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;

    // If no content-length, estimate based on typical file size
    const displayTotal = estimatedTotal > 0 ? estimatedTotal : Math.max(received * 1.1, 138 * 1024 * 1024);

    onProgress?.({
      phase: 'downloading',
      current: received,
      total: displayTotal,
      message: `Downloading... ${(received / 1024 / 1024).toFixed(1)} MB${estimatedTotal > 0 ? ` / ${(estimatedTotal / 1024 / 1024).toFixed(1)} MB` : ''}`
    });
  }

  // Download complete - update to show 100%
  onProgress?.({
    phase: 'downloading',
    current: 100,
    total: 100,
    message: `Downloaded ${(received / 1024 / 1024).toFixed(1)} MB`
  });

  // Wait for the CSS transition to complete (300ms) before changing phase
  await new Promise(resolve => setTimeout(resolve, 400));

  // Combine chunks
  onProgress?.({ phase: 'parsing', current: 0, total: 100, message: 'Preparing data...' });
  await new Promise(resolve => setTimeout(resolve, 50));

  const allChunks = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  const csvText = new TextDecoder().decode(allChunks);

  // Parse CSV
  onProgress?.({ phase: 'parsing', current: 0, total: 100, message: 'Parsing asteroid data...' });
  await new Promise(resolve => setTimeout(resolve, 10));

  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const asteroids: Asteroid[] = [];
  const batchSize = 10000;
  let batch: Asteroid[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Check for cancellation during parsing
    if (abortSignal?.aborted) {
      console.log('📦 loadAsteroidData: Cancelled during parsing');
      throw new DOMException('Aborted', 'AbortError');
    }

    const line = lines[i].trim();
    if (!line) continue;

    const parsed = parseRow(line, headers);
    if (!parsed || !parsed.id) continue;

    // Enrich with computed values
    const asteroid: Asteroid = {
      ...parsed,
      id: parsed.id as string,
      spkid: parsed.spkid as number || 0,
      full_name: parsed.full_name as string || '',
      pdes: parsed.pdes as string || '',
      name: parsed.name as string || '',
      neo: parsed.neo as boolean || false,
      pha: parsed.pha as boolean || false,
      H: parsed.H as number || 0,
      diameter: parsed.diameter as number || 0,
      albedo: parsed.albedo as number || 0.1,
      diameter_sigma: parsed.diameter_sigma as number || 0,
      orbit_id: parsed.orbit_id as string || '',
      epoch: parsed.epoch as number || 0,
      epoch_mjd: parsed.epoch_mjd as number || 0,
      e: parsed.e as number || 0,
      a: parsed.a as number || 0,
      q: parsed.q as number || 0,
      i: parsed.i as number || 0,
      om: parsed.om as number || 0,
      w: parsed.w as number || 0,
      ma: parsed.ma as number || 0,
      ad: parsed.ad as number || 0,
      n: parsed.n as number || 0,
      tp: parsed.tp as number || 0,
      per: parsed.per as number || 0,
      per_y: parsed.per_y as number || 0,
      moid: parsed.moid as number || 999,
      moid_ld: parsed.moid_ld as number || 0,
      class: parsed.class as string || 'MBA',
      rms: parsed.rms as number || 0,
      category: classifyAsteroid(parsed),
      color: getAsteroidColor(parsed),
      estimatedValue: estimateValue(parsed),
      miningDifficulty: getMiningDifficulty(parsed),
    };

    batch.push(asteroid);

    if (batch.length >= batchSize) {
      onProgress?.({
        phase: 'parsing',
        current: i,
        total: lines.length,
        message: `Parsing... ${i.toLocaleString()} / ${lines.length.toLocaleString()}`
      });

      asteroids.push(...batch);
      batch = [];

      // Yield to event loop to allow abort to propagate
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check abort after batch
      if (abortSignal?.aborted) {
        console.log('📦 loadAsteroidData: Cancelled during parsing batch');
        throw new DOMException('Aborted', 'AbortError');
      }
    }
  }

  // Check abort before storing
  if (abortSignal?.aborted) {
    console.log('📦 loadAsteroidData: Cancelled before storing');
    throw new DOMException('Aborted', 'AbortError');
  }

  if (batch.length > 0) {
    asteroids.push(...batch);
  }

  // Store in IndexedDB (skip already stored asteroids on resume)
  onProgress?.({ phase: 'storing', current: alreadyStored, total: asteroids.length, message: 'Storing in database...' });

  const storeBatchSize = 5000;
  let storedSoFar = alreadyStored;

  // Start from where we left off (skip batches already stored)
  const startIndex = alreadyStored > 0 ? Math.floor(alreadyStored / storeBatchSize) * storeBatchSize : 0;

  for (let i = startIndex; i < asteroids.length; i += storeBatchSize) {
    // Check abort at start of each store batch
    if (abortSignal?.aborted) {
      console.log('📦 loadAsteroidData: Cancelled during storing');
      throw new DOMException('Aborted', 'AbortError');
    }

    const storeBatch = asteroids.slice(i, i + storeBatchSize);
    await storeAsteroids(storeBatch);

    storedSoFar = Math.min(i + storeBatchSize, asteroids.length);

    // Update partial progress so we can resume if interrupted
    await updatePartialLoadProgress(storedSoFar, asteroids.length);

    onProgress?.({
      phase: 'storing',
      current: storedSoFar,
      total: asteroids.length,
      message: `Storing... ${storedSoFar.toLocaleString()} / ${asteroids.length.toLocaleString()}`
    });
  }

  await markDataLoaded();

  onProgress?.({
    phase: 'complete',
    current: asteroids.length,
    total: asteroids.length,
    message: `Loaded ${asteroids.length.toLocaleString()} asteroids`
  });

  return asteroids.length;
}

// Format large numbers as currency
export function formatValue(value: number): string {
  if (value >= 1e15) return `$${(value / 1e15).toFixed(2)} Quadrillion`;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} Trillion`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)} Billion`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)} Million`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)} Thousand`;
  return `$${value.toFixed(2)}`;
}

export function formatCompactValue(value: number): string {
  // More varied/realistic display with 2 decimal places
  if (value >= 1e15) return `$${(value / 1e15).toFixed(2)} Quadrillion`;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} Trillion`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)} Billion`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)} Million`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}
