import { getCorineLandCover } from '../../services/corine.js';
import { CORINE_SOURCE } from './fields.js';

const CACHE_LIMIT = 32;

function fieldValue(result) {
  if (result.state === 'ambiguous') {
    const codes = result.matches.map(({ code }) => code).join(', ');
    return { state: 'unavailable', message: `Αμφίσημο αποτέλεσμα κοντά σε όριο κάλυψης (κωδικοί ${codes}).` };
  }
  if (result.state === 'unavailable') {
    return { state: 'unavailable', message: 'Δεν βρέθηκε ταξινομημένο πολύγωνο CORINE για αυτό το σημείο.' };
  }
  const { match } = result;
  return {
    state: 'available',
    value: `${match.label} (${match.code})`,
    source: {
      ...CORINE_SOURCE,
      originalLabel: match.english,
      hierarchy: `${match.code[0]} ${match.domain} → ${match.code.slice(0, 2)} ${match.group} → ${match.code} ${match.label}`,
    },
  };
}

export function createLandCoverData(onUpdate) {
  const cache = new Map();
  let point;
  let key;
  let active = false;
  let request;

  function publish(value) {
    onUpdate({ landCover: value });
  }

  async function load(origin, cacheKey, controller) {
    try {
      const result = await getCorineLandCover(origin, controller.signal);
      if (controller.signal.aborted) return;
      const value = fieldValue(result);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, value);
      publish(value);
    } catch {
      if (!controller.signal.aborted) {
        publish({ state: 'error', message: 'Αποτυχία ανάκτησης CORINE. Άνοιξε ξανά την καρτέλα για επανάληψη.' });
      }
    } finally {
      if (request === controller) request = undefined;
    }
  }

  function start() {
    if (!active || !point || request) return;
    if (cache.has(key)) {
      publish(cache.get(key));
      return;
    }
    request = new AbortController();
    publish({ state: 'loading' });
    load(point, key, request);
  }

  function cancel() {
    request?.abort();
    request = undefined;
  }

  return {
    selectPoint(next) {
      const nextKey = `${next.lat},${next.lng}`;
      if (nextKey === key) return;
      cancel();
      point = next;
      key = nextKey;
      publish(cache.get(key));
      start();
    },
    setVisible(visible) {
      if (active === visible) return;
      active = visible;
      if (active) start();
      else if (request) {
        cancel();
        publish(undefined);
      }
    },
  };
}
