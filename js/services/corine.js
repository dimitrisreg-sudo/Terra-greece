import { corineClass } from '../features/location/corine-classes.js';

export const CORINE_ENDPOINT = 'https://geohub.necca.gov.gr/server/rest/services/LIFE-IP4NATURA/CORINE_LAND_USE_LAND_COVER_2018/FeatureServer/0';
const TIMEOUT = 12000;
const NO_DATA = new Set(['', '990', '995', '999']);

export function readCorineIntersection(response) {
  if (response?.error || !Array.isArray(response?.features) || response.exceededTransferLimit) {
    throw new Error('Invalid or incomplete CORINE response');
  }

  const matches = new Map();
  let unmapped = false;
  for (const feature of response.features) {
    if (!feature?.attributes || !Object.hasOwn(feature.attributes, 'CODE_18_EN')) {
      throw new Error('Missing CORINE code field');
    }
    const code = String(feature.attributes.CODE_18_EN ?? '').trim();
    if (NO_DATA.has(code)) {
      unmapped = true;
      continue;
    }
    const match = corineClass(code);
    if (!match) throw new Error('Unrecognised CORINE class');
    matches.set(code, match);
  }

  if (matches.size > 1 || (unmapped && matches.size)) {
    return { state: 'ambiguous', matches: [...matches.values()].sort((a, b) => Number(a.code) - Number(b.code)) };
  }
  if (!matches.size) return { state: 'unavailable' };
  return { state: 'available', match: matches.values().next().value };
}

export async function getCorineLandCover(point, signal) {
  if (signal.aborted) throw signal.reason;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, TIMEOUT);
  try {
    const params = new URLSearchParams({
      f: 'json',
      where: '1=1',
      geometry: `${point.lng},${point.lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'CODE_18_EN',
      returnGeometry: 'false',
    });
    const response = await fetch(CORINE_ENDPOINT + '/query?' + params, { signal: controller.signal });
    if (!response.ok) throw new Error('CORINE ' + response.status);
    return readCorineIntersection(await response.json());
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
