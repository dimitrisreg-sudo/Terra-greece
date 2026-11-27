import { withRequestDeadline } from './request-signal.js';

export async function getElevations(points, signal) {
  const params = new URLSearchParams({
    latitude: points.map(point => point.lat).join(','),
    longitude: points.map(point => point.lng).join(','),
  });
  return withRequestDeadline(async requestSignal => {
    const response = await fetch('https://api.open-meteo.com/v1/elevation?' + params, { signal: requestSignal });
    if (!response.ok) throw new Error('Open-Meteo ' + response.status);
    const data = await response.json();
    return Array.isArray(data.elevation) ? data.elevation : [];
  }, signal);
}
