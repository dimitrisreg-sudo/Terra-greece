import { era5Cell, getClimateArchive } from '../../services/climate.js';
import { calculateClimateNormals } from './climate-normals.js';
import { getClimateClass } from './koppen-geiger.js';

const CACHE_LIMIT = 24;
const REQUEST_WINDOW = 60000;
const REQUEST_LIMIT = 3;
const properties = ['annualTemperature', 'monthlyTemperature', 'annualPrecipitation', 'monthlyPrecipitation'];
const format = value => value.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fields(result, cell) {
  const output = {};
  const location = `${cell.lat.toFixed(2)}°, ${cell.lng.toFixed(2)}°`;
  for (const variable of ['temperature', 'precipitation']) {
    const normal = result[variable];
    const suffix = variable === 'temperature' ? 'Temperature' : 'Precipitation';
    output['annual' + suffix] = normal
      ? { state: 'available', value: format(normal.annual), gridCell: location }
      : { state: 'unavailable', message: 'Η ημερήσια σειρά ή η μονάδα δεν είναι πλήρης ή έγκυρη για το 1991–2020.' };
    output['monthly' + suffix] = normal
      ? { state: 'available', value: '12 μηνιαίες τιμές στον πίνακα', series: normal.monthly, unit: '', gridCell: location }
      : output['annual' + suffix];
  }
  return output;
}

export function createClimateData(onUpdate) {
  const cache = new Map();
  let timestamps = [];
  let backoffUntil = 0;
  let point;
  let cell;
  let key;
  let visible = false;
  let request;
  let classificationToken;
  let values = {};

  function setStates(state, message) {
    for (const id of properties) values[id] = { state, message };
    onUpdate(values);
  }

  async function loadClassification(origin, token) {
    try {
      const value = await getClimateClass(origin);
      if (classificationToken !== token) return;
      values.climateClass = value ? { state: 'available', value } : { state: 'unavailable' };
    } catch {
      if (classificationToken !== token) return;
      values.climateClass = { state: 'error' };
    }
    onUpdate(values);
  }

  async function loadArchive(origin, cacheKey, controller) {
    try {
      const data = await getClimateArchive(origin, controller.signal);
      if (controller.signal.aborted) return;
      const result = fields(calculateClimateNormals(data), origin);
      if (Object.values(result).every(field => field.state === 'available')) {
        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
        cache.set(cacheKey, result);
      }
      Object.assign(values, result);
      onUpdate(values);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.retryAfter) {
        backoffUntil = Date.now() + error.retryAfter * 1000;
        setStates('error', 'Το Open-Meteo έφτασε στο όριο αιτημάτων. Άνοιξε ξανά την καρτέλα αργότερα.');
      } else setStates('error', 'Αποτυχία ανάκτησης ή επικύρωσης της χρονοσειράς. Άνοιξε ξανά την καρτέλα για επανάληψη.');
    } finally {
      if (request === controller) request = undefined;
    }
  }

  function start() {
    if (!visible || !point) return;
    if (!values.climateClass || values.climateClass.state === 'error') {
      classificationToken = {};
      values.climateClass = { state: 'loading' };
      loadClassification(point, classificationToken);
    }
    const cached = cache.get(key);
    if (cached) {
      Object.assign(values, cached);
      onUpdate(values);
      return;
    }
    if (request) return;
    const now = Date.now();
    timestamps = timestamps.filter(time => now - time < REQUEST_WINDOW);
    if (now < backoffUntil || timestamps.length >= REQUEST_LIMIT) {
      setStates('error', 'Προσωρινό όριο ιστορικών αιτημάτων. Άνοιξε ξανά την καρτέλα σε λίγο.');
      return;
    }
    timestamps.push(now);
    request = new AbortController();
    setStates('loading');
    loadArchive(cell, key, request);
  }

  return {
    selectPoint(next) {
      if (point?.lat === next.lat && point?.lng === next.lng) return;
      request?.abort();
      request = undefined;
      classificationToken = undefined;
      point = next;
      cell = era5Cell(next);
      key = `${cell.lat},${cell.lng}`;
      values = { ...cache.get(key) };
      onUpdate(values);
      start();
    },
    setVisible(next) {
      if (next === visible) return;
      visible = next;
      if (visible) start();
      else if (request) {
        request.abort();
        request = undefined;
        for (const id of properties) delete values[id];
        onUpdate(values);
      }
    },
  };
}
