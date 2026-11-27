import { getElevation } from '../../services/elevation.js';
import { getGeologicUnit } from '../../services/macrostrat.js';
import { GEOLOGY_SOURCE } from './fields.js';

const CACHE_LIMIT = 32;
const geologyFields = ['geologicUnit', 'lithology', 'geologicAge'];
const coordinate = value => value.toFixed(5);
const available = (value, metadata = {}) => ({ state: 'available', value, ...metadata });

function geologyValues(unit) {
  const source = { ...GEOLOGY_SOURCE, citation: unit?.citation, scale: unit?.scale };
  const values = [unit?.name, unit?.lithology, unit?.age];
  return Object.fromEntries(geologyFields.map((id, index) => [
    id,
    typeof values[index] === 'string' && values[index].trim()
      ? available(values[index], { source })
      : { state: 'unavailable', source },
  ]));
}

export function createLocationData(onUpdate) {
  const providers = [
    {
      ids: ['elevation'], cache: new Map(), load: async (point, signal) => {
        const value = await getElevation(point, signal);
        return { elevation: Number.isFinite(value) ? available(Math.round(value)) : { state: 'unavailable' } };
      },
    },
    {
      ids: geologyFields, cache: new Map(), load: async (point, signal) => geologyValues(await getGeologicUnit(point, signal)),
    },
  ];
  let controller;
  let activeKey;
  let values = {};

  async function loadProvider(provider, point, key, request) {
    try {
      const result = await provider.load(point, request.signal);
      if (request.signal.aborted) return;
      if (provider.cache.size >= CACHE_LIMIT) provider.cache.delete(provider.cache.keys().next().value);
      provider.cache.set(key, result);
      Object.assign(values, result);
    } catch {
      if (request.signal.aborted) return;
      for (const id of provider.ids) values[id] = { state: 'error' };
    }
    onUpdate(values);
  }

  return function selectPoint(point, accuracy) {
    const key = `${coordinate(point.lat)}, ${coordinate(point.lng)}`;
    if (key !== activeKey) {
      controller?.abort();
      controller = new AbortController();
      activeKey = key;
      values = {};
      for (const provider of providers) {
        const cached = provider.cache.get(key);
        if (cached) Object.assign(values, cached);
        else {
          for (const id of provider.ids) values[id] = { state: 'loading' };
          loadProvider(provider, point, key, controller);
        }
      }
    } else {
      for (const provider of providers) {
        if (!provider.ids.some(id => values[id]?.state === 'error')) continue;
        for (const id of provider.ids) values[id] = { state: 'loading' };
        loadProvider(provider, point, key, controller);
      }
    }
    values.coordinates = available(key, {
      type: accuracy ? 'estimated' : undefined,
      unit: '',
      source: {
        label: accuracy ? 'Γεωεντοπισμός προγράμματος περιήγησης' : 'Επιλογή στον χάρτη',
        methodology: 'Εμφανίζονται οι συντεταγμένες του επιλεγμένου σημείου.',
        limitations: 'Ο αριθμός δεκαδικών ψηφίων δεν δηλώνει ακρίβεια θέσης.',
      },
    });
    if (Number.isFinite(accuracy) && accuracy > 0) {
      const kilometres = accuracy >= 1000;
      const number = (kilometres ? accuracy / 1000 : accuracy).toLocaleString('el-GR', {
        maximumFractionDigits: kilometres ? 1 : 0,
      });
      values.accuracy = available(`±${number}`, { unit: kilometres ? 'χλμ.' : 'μ.' });
    } else delete values.accuracy;
    onUpdate(values);
  };
}
