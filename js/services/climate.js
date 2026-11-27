import { END_DATE, START_DATE } from '../features/location/climate-normals.js';

const ENDPOINT = 'https://archive-api.open-meteo.com/v1/archive';
const TIMEOUT = 20000;

export function era5Cell({ lat, lng }) {
  const nearest = value => Math.round(value * 4) / 4;
  const longitude = nearest(lng);
  return { lat: nearest(lat), lng: ((longitude + 180) % 360 + 360) % 360 - 180 };
}

export async function getClimateArchive(cell, signal) {
  if (signal.aborted) throw signal.reason;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, TIMEOUT);
  try {
    const params = new URLSearchParams({
      latitude: cell.lat, longitude: cell.lng, start_date: START_DATE, end_date: END_DATE,
      daily: 'temperature_2m_mean,precipitation_sum', models: 'era5', timezone: 'GMT',
      temperature_unit: 'celsius', precipitation_unit: 'mm', elevation: 'nan', cell_selection: 'nearest',
    });
    const response = await fetch(ENDPOINT + '?' + params, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error('Open-Meteo archive ' + response.status);
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const seconds = /^\d+$/.test(retry ?? '') ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000;
        error.retryAfter = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
      }
      throw error;
    }
    const json = await response.json();
    if (!Number.isFinite(json.latitude) || !Number.isFinite(json.longitude) ||
        Math.abs(json.latitude - cell.lat) > 0.001 || Math.abs(json.longitude - cell.lng) > 0.001) {
      throw new Error('ERA5 returned an unexpected grid cell');
    }
    return json;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
