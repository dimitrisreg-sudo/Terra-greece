import { sampleRecordedSpecies } from '../../services/gbif.js';

export const BIODIVERSITY_RADIUS = 5;
export const KINGDOMS = [['6', 'Χλωρίδα'], ['1', 'Πανίδα'], ['5', 'Μύκητες']];
const CACHE_AGE = 15 * 60 * 1000;
const TIMEOUT = 12000;
const pointKey = point => `${point.lat},${point.lng}`;

export function createBiodiversityData(onUpdate) {
  const cache = new Map();
  let point;
  let states = {};
  let request;

  function cached(point, taxonKey) {
    if (!point) return undefined;
    const result = cache.get(pointKey(point))?.[taxonKey];
    return result && Date.now() - result.retrievedAt < CACHE_AGE ? result : undefined;
  }

  function cancel() {
    request?.abort();
    request = undefined;
  }

  function reset() {
    states = Object.fromEntries(KINGDOMS.map(([key]) => [key, cached(point, key) ?? { state: 'idle' }]));
    onUpdate(states);
  }

  function selectPoint(next) {
    if (point && pointKey(point) === pointKey(next)) return;
    cancel();
    point = next;
    reset();
  }

  async function load() {
    if (!point || request) return;
    const selected = point;
    const pending = KINGDOMS.filter(([key]) => !cached(selected, key));
    if (!pending.length) return;
    const controller = new AbortController();
    request = controller;
    const timer = setTimeout(() => controller.abort(new DOMException('GBIF timeout', 'TimeoutError')), TIMEOUT);
    for (const [key] of pending) states[key] = { state: 'loading' };
    onUpdate(states);

    try {
      await Promise.all(pending.map(async ([key]) => {
        let result;
        try {
          const sample = await sampleRecordedSpecies({
            point: selected, radius: BIODIVERSITY_RADIUS, taxonKey: key, month: '',
          }, controller.signal);
          result = { ...sample, state: 'available', retrievedAt: Date.now() };
        } catch {
          result = { state: 'error' };
        }
        if (request !== controller) return;
        if (result.state === 'available' && !result.interrupted) {
          const id = pointKey(selected);
          const group = cache.get(id) ?? {};
          group[key] = result;
          cache.delete(id);
          cache.set(id, group);
          if (cache.size > 20) cache.delete(cache.keys().next().value);
        }
        states[key] = result;
        onUpdate(states);
      }));
    } finally {
      clearTimeout(timer);
      if (request === controller) request = undefined;
    }
  }

  return {
    load,
    selectPoint,
    cancelPending() {
      if (!request) return;
      cancel();
      reset();
    },
    discoveryCounts({ point, radius, month, taxonKey }) {
      if (radius === BIODIVERSITY_RADIUS && month === '') return cached(point, taxonKey)?.counts;
    },
  };
}
