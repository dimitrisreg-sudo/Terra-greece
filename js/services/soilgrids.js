const ENDPOINT = 'https://maps.isric.org/mapserv';
const TIMEOUT = 12000;
const WRB_GROUPS = new Set([
  'Acrisols', 'Albeluvisols', 'Alisols', 'Andosols', 'Arenosols', 'Calcisols', 'Cambisols',
  'Chernozems', 'Cryosols', 'Durisols', 'Ferralsols', 'Fluvisols', 'Gleysols', 'Gypsisols',
  'Histosols', 'Kastanozems', 'Leptosols', 'Lixisols', 'Luvisols', 'Nitisols', 'Phaeozems',
  'Planosols', 'Plinthosols', 'Podzols', 'Regosols', 'Solonchaks', 'Solonetz', 'Stagnosols',
  'Umbrisols', 'Vertisols',
]);

export const SOIL_PROPERTIES = {
  ph: { layer: 'phh2o', factor: 10, maximum: 140 },
  sand: { layer: 'sand', factor: 10, maximum: 1000 },
  silt: { layer: 'silt', factor: 10, maximum: 1000 },
  clay: { layer: 'clay', factor: 10, maximum: 1000 },
  organicCarbon: { layer: 'soc', factor: 10, maximum: 10000 },
};

function pointQuery(property, layer, { lat, lng }) {
  const halfWidth = 0.0001;
  const params = new URLSearchParams({
    map: `/map/${property}.map`,
    SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetFeatureInfo', SRS: 'EPSG:4326',
    BBOX: [lng - halfWidth, lat - halfWidth, lng + halfWidth, lat + halfWidth]
      .map(value => value.toFixed(7)).join(','),
    WIDTH: '3', HEIGHT: '3', X: '1', Y: '1',
    LAYERS: layer, QUERY_LAYERS: layer, STYLES: '', FEATURE_COUNT: '1',
    FORMAT: 'image/png', INFO_FORMAT: 'text/html',
  });
  return ENDPOINT + '?' + params;
}

async function queryCell(property, layer, point, signal) {
  if (signal.aborted) throw signal.reason;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, TIMEOUT);
  try {
    const response = await fetch(pointQuery(property, layer, point), { signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) {
      throw new Error('SoilGrids WMS ' + response.status);
    }
    const html = await response.text();
    const values = [...html.matchAll(/<span id="value">([^<>]*)<\/span>/g)].map(match => match[1].trim());
    if (!values.length && /<body>\s*<\/body>/i.test(html)) return null;
    if (values.length !== 2 || values[1] !== layer) throw new Error('Unexpected SoilGrids response');

    // ISRIC's WMS template labels the longitude span "latitude", and vice versa.
    const x = html.match(/<span id="latitude">([^<>]+)<\/span>/)?.[1];
    const y = html.match(/<span id="longitude">([^<>]+)<\/span>/)?.[1];
    if (!x || !y || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
      throw new Error('Missing SoilGrids cell centre');
    }
    const east = (Number(x) - point.lng) * 111195 * Math.cos(point.lat * Math.PI / 180);
    const north = (Number(y) - point.lat) * 111195;
    if (Math.hypot(east, north) > 190) return null;
    return { text: values[0], cell: `${x},${y}` };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export async function getSoilPrediction(property, point, depth, statistic, signal) {
  const { layer, factor, maximum } = SOIL_PROPERTIES[property];
  const cell = await queryCell(layer, `${layer}_${depth}cm_${statistic}`, point, signal);
  if (!cell || !/^\d+$/.test(cell.text)) return null;
  const raw = Number(cell.text);
  if (raw > maximum || (property === 'ph' && raw === 0)) return null;
  return { value: raw / factor, cell: cell.cell };
}

export async function getSoilGroup(point, signal) {
  const cell = await queryCell('wrb', 'MostProbable', point, signal);
  return WRB_GROUPS.has(cell?.text) ? cell.text : null;
}
