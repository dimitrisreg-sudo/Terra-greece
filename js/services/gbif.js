const API = 'https://api.gbif.org/v1';
const SPECIES_LIMIT = 12;
const SUMMARY_CONCURRENCY = 3;
const PAGE_SIZE = 300;
export const OCCURRENCE_LIMIT = 1200;

async function getJson(path, signal) {
  const response = await fetch(API + path, { signal });
  if (!response.ok) {
    const error = new Error('GBIF ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function occurrenceFilters({ point, radius, month }) {
  const params = new URLSearchParams({
    hasCoordinate: 'true',
    hasGeospatialIssue: 'false',
  });
  if (radius === 0) {
    params.set('country', 'GR');
  } else {
    const { lat, lng } = point;
    const ring = [];
    for (let index = 0; index < 36; index++) {
      const angle = 2 * Math.PI * index / 36;
      const longitude = lng + radius * Math.cos(angle) / (111.2 * Math.cos(lat * Math.PI / 180));
      const latitude = lat + radius * Math.sin(angle) / 111.2;
      ring.push(`${longitude.toFixed(5)} ${latitude.toFixed(5)}`);
    }
    ring.push(ring[0]);
    params.set('geometry', `POLYGON((${ring.join(',')}))`);
  }
  for (const value of month.split(',').filter(Boolean)) params.append('month', value);
  return params;
}

async function getSpeciesSummary(filters, key, signal) {
  const params = occurrenceFilters(filters);
  params.set('speciesKey', key);
  params.set('limit', '1');
  const page = await getJson('/occurrence/search?' + params, signal);
  return { key, count: page.count, name: page.results[0]?.species };
}

export async function discoverSpecies(filters, signal, onProgress) {
  const params = occurrenceFilters(filters);
  params.set('taxonKey', filters.taxonKey);
  params.set('limit', '0');
  params.set('facet', 'speciesKey');
  params.set('facetLimit', String(SPECIES_LIMIT + 1));
  const data = await getJson('/occurrence/search?' + params, signal);
  const counts = data.facets?.find(facet => facet.field === 'SPECIES_KEY')?.counts ?? [];
  const species = [];
  let failed = 0;
  const buckets = counts.slice(0, SPECIES_LIMIT);
  for (let start = 0; start < buckets.length; start += SUMMARY_CONCURRENCY) {
    if (signal.aborted) throw signal.reason;
    const batch = await Promise.allSettled(buckets.slice(start, start + SUMMARY_CONCURRENCY)
      .map(({ name: key }) => getSpeciesSummary(filters, key, signal)));
    if (signal.aborted) throw signal.reason;
    for (const result of batch) {
      if (result.status === 'fulfilled') species.push(result.value);
      else failed++;
    }
    onProgress(species.length + failed, buckets.length);
    if (batch.some(result => result.status === 'rejected' && result.reason?.status === 429)) {
      failed = buckets.length - species.length;
      break;
    }
  }
  if (failed && !species.length) throw new Error('GBIF species counts unavailable');
  return { species: species.filter(item => item.count > 0), limited: counts.length > SPECIES_LIMIT, failed };
}

export async function loadSpeciesOccurrences(filters, speciesKey, signal, onProgress) {
  const params = occurrenceFilters(filters);
  params.set('speciesKey', speciesKey);
  params.set('limit', String(PAGE_SIZE));
  const records = [];
  const seen = new Set();
  let total = 0;
  let fetched = 0;
  let complete = false;
  let interrupted = false;
  for (let offset = 0; offset < OCCURRENCE_LIMIT; offset += PAGE_SIZE) {
    params.set('offset', String(offset));
    let page;
    try {
      page = await getJson('/occurrence/search?' + params, signal);
    } catch (error) {
      if (signal.aborted || offset === 0) throw error;
      interrupted = true;
      break;
    }
    if (signal.aborted) throw signal.reason;
    total = page.count;
    fetched += page.results.length;
    for (const record of page.results) {
      if (record.key != null) {
        if (seen.has(record.key)) continue;
        seen.add(record.key);
      }
      records.push(record);
    }
    onProgress(fetched, total);
    complete = Boolean(page.endOfRecords) || offset + page.results.length >= total;
    if (complete || page.results.length < PAGE_SIZE) break;
  }
  return { records, total, limited: !complete, interrupted };
}
