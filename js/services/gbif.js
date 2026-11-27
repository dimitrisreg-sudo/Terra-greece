export async function searchOccurrences({ lat, lng }, { radius, taxonKey, month }, signal) {
  const ring = [];
  for (let index = 0; index <= 36; index++) {
    const angle = 2 * Math.PI * index / 36;
    const longitude = lng + radius * Math.cos(angle) / (111.2 * Math.cos(lat * Math.PI / 180));
    const latitude = lat + radius * Math.sin(angle) / 111.2;
    ring.push(`${longitude.toFixed(5)} ${latitude.toFixed(5)}`);
  }

  const params = new URLSearchParams({
    geometry: `POLYGON((${ring.join(',')}))`,
    taxonKey,
    hasCoordinate: 'true',
    limit: '300',
  });
  if (month) params.set('month', month);

  const response = await fetch('https://api.gbif.org/v1/occurrence/search?' + params, { signal });
  if (!response.ok) throw new Error('GBIF ' + response.status);
  return response.json();
}

export function occurrenceUrl(key) {
  return 'https://www.gbif.org/occurrence/' + encodeURIComponent(key);
}
