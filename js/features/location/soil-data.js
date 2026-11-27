import { getSoilGroup, getSoilPrediction, SOIL_PROPERTIES } from '../../services/soilgrids.js';

export const SOIL_DEPTHS = ['0-5', '5-15', '15-30', '30-60', '60-100', '100-200'];
const numericFields = Object.keys(SOIL_PROPERTIES);
const CACHE_LIMIT = 24;
const unavailable = { state: 'unavailable' };
const error = { state: 'error', message: 'Αποτυχία ανάκτησης SoilGrids. Άνοιξε ξανά την καρτέλα για επανάληψη.' };
const loading = { state: 'loading' };
const format = value => value.toLocaleString('el-GR', { maximumFractionDigits: 1 });

function remember(cache, key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

export function createSoilData(onUpdate) {
  const groupCache = new Map();
  const predictionCache = new Map();
  let point;
  let pointKey;
  let depth = SOIL_DEPTHS[0];
  let visible = false;
  let groupRequest;
  let surfacePrediction;
  let predictionRequest;
  let group;
  let predictions = {};

  function update() {
    onUpdate({ soilClass: group, ...predictions });
  }

  async function loadGroup(request) {
    const key = pointKey;
    try {
      const origin = point;
      // WRB and the property rasters have different coastal coverage. Require surface soil coverage.
      surfacePrediction = getSoilPrediction('ph', origin, SOIL_DEPTHS[0], 'mean', request.signal);
      const surface = await surfacePrediction;
      if (request.signal.aborted) return;
      const name = surface ? await getSoilGroup(origin, request.signal) : null;
      if (request.signal.aborted) return;
      group = name ? { state: 'available', value: name } : unavailable;
      remember(groupCache, key, group);
    } catch {
      if (request.signal.aborted) return;
      group = error;
    }
    groupRequest = undefined;
    update();
  }

  async function loadPredictions(request) {
    const origin = point;
    const interval = depth;
    const key = `${pointKey}/${interval}`;
    const signal = request.signal;
    const active = predictions;
    const next = numericFields.filter(id => !active[id]);
    const publish = (id, result) => {
      if (signal.aborted) return;
      active[id] = { ...result, depth: interval };
      update();
    };

    // Three workers share a queue, keeping the maximum at three numeric requests in flight.
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next.length && !signal.aborted) {
        const id = next.shift();
        try {
          const lookup = interval === SOIL_DEPTHS[0] && id === 'ph' && surfacePrediction
            ? surfacePrediction
            : getSoilPrediction(id, origin, interval, 'mean', signal);
          const mean = await lookup;
          if (signal.aborted) return;
          if (!mean) {
            publish(id, unavailable);
            continue;
          }
          const prediction = { state: 'available', value: format(mean.value) };
          publish(id, { ...prediction, uncertainty: 'Ανάκτηση διαστήματος πρόβλεψης…' });
          try {
            const low = await getSoilPrediction(id, origin, interval, 'Q0.05', signal);
            const high = await getSoilPrediction(id, origin, interval, 'Q0.95', signal);
            const complete = low?.cell === mean.cell && high?.cell === mean.cell && low.value <= high.value;
            publish(id, complete
              ? { ...prediction, uncertainty: `${format(low.value)}–${format(high.value)}`, interval: true }
              : { ...prediction, uncertainty: 'Δεν υπάρχει διαθέσιμο διάστημα πρόβλεψης.' });
          } catch {
            publish(id, { ...prediction, uncertainty: 'Αποτυχία ανάκτησης διαστήματος πρόβλεψης.', partialError: true });
          }
        } catch {
          publish(id, error);
        }
      }
    }));
    if (signal.aborted) return;
    predictionRequest = undefined;
    const reusable = Object.fromEntries(Object.entries(active).filter(([, value]) => value.state !== 'error' && !value.partialError));
    remember(predictionCache, key, reusable);
  }

  function start() {
    if (!visible || !point) return;
    if (!groupRequest && (!group || group.state === 'loading' || group.state === 'error')) {
      groupRequest = new AbortController();
      group = loading;
      loadGroup(groupRequest);
    }
    if (!predictionRequest) {
      const cached = predictionCache.get(`${pointKey}/${depth}`);
      predictions = { ...cached };
      const request = new AbortController();
      if (Object.keys(predictions).length < numericFields.length) {
        predictionRequest = request;
        loadPredictions(request);
        for (const id of numericFields) predictions[id] ??= { ...loading, depth };
      }
    }
    update();
  }

  function stopPredictions() {
    predictionRequest?.abort();
    predictionRequest = undefined;
  }

  function stopGroup() {
    groupRequest?.abort();
    groupRequest = undefined;
    surfacePrediction = undefined;
  }

  return {
    selectPoint(next) {
      const key = `${next.lat.toFixed(5)},${next.lng.toFixed(5)}`;
      if (key === pointKey) return;
      stopPredictions();
      stopGroup();
      point = { lat: Number(next.lat.toFixed(5)), lng: Number(next.lng.toFixed(5)) };
      pointKey = key;
      group = groupCache.get(key);
      predictions = { ...predictionCache.get(`${pointKey}/${depth}`) };
      update();
      start();
    },
    setDepth(value) {
      if (!SOIL_DEPTHS.includes(value) || value === depth) return;
      stopPredictions();
      depth = value;
      predictions = {};
      start();
    },
    setVisible(value) {
      if (visible === value) return;
      visible = value;
      if (visible) start();
      else {
        stopPredictions();
        stopGroup();
        if (group?.state === 'loading') group = undefined;
        update();
      }
    },
  };
}
