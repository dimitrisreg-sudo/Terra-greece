import { distanceKm, radiusPolygon, usableCoordinates } from './gbif-geography.js';
import { withRequestDeadline } from './request-signal.js';

const API = 'https://api.gbif.org/v1';
const SPECIES_LIMIT = 12;
const SUMMARY_CONCURRENCY = 3;
const PAGE_SIZE = 300;
export const OCCURRENCE_LIMIT = 1200;

async function getJson(path, signal) {
  return withRequestDeadline(async requestSignal => {
    const response = await fetch(API + path, { signal: requestSignal });
    if (!response.ok) {
      const error = new Error('GBIF ' + response.status);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }, signal);
}

function occurrenceFilters({ point, radius, month }) {
  const params = new URLSearchParams({
    hasCoordinate: 'true',
    hasGeospatialIssue: 'false',
  });
  if (radius === 0) {
    params.set('country', 'GR');
  } else {
    params.set('geometry', radiusPolygon(point, radius));
    params.set('occurrenceStatus', 'PRESENT');
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

function discoveryParams(filters, limit) {
  const params = occurrenceFilters(filters);
  params.set('taxonKey', filters.taxonKey);
  params.set('limit', String(limit));
  params.set('facet', 'speciesKey');
  params.set('facetLimit', String(SPECIES_LIMIT + 1));
  return params;
}

function speciesFacets(page) {
  const buckets = page.facets?.find(facet => facet.field === 'SPECIES_KEY')?.counts;
  return Array.isArray(buckets) ? buckets : undefined;
}

export const RECORDED_PAGE_LIMIT = 2;

export async function sampleRecordedSpecies(filters, signal) {
  const { point, radius } = filters;
  const params = discoveryParams(filters, PAGE_SIZE);
  const species = new Set();
  const checked = new Set();
  const datasets = new Map();
  let counts;
  let total;
  let inspected = 0;
  let retained = 0;
  let unknownAccuracy = 0;
  let firstYear;
  let lastYear;
  let missingYear = 0;
  let complete = false;
  let interrupted = false;
  for (let pageIndex = 0; pageIndex < RECORDED_PAGE_LIMIT; pageIndex++) {
    const offset = pageIndex * PAGE_SIZE;
    params.set('offset', String(offset));
    let page;
    try {
      page = await getJson('/occurrence/search?' + params, signal);
      if (!Number.isSafeInteger(page.count) || page.count < 0 || !Array.isArray(page.results)) {
        throw new Error('Invalid GBIF page');
      }
    } catch (error) {
      if (pageIndex === 0 || (signal.aborted && signal.reason?.name !== 'TimeoutError')) throw error;
      interrupted = true;
      break;
    }
    signal.throwIfAborted();
    if (pageIndex === 0) {
      total = page.count;
      counts = speciesFacets(page);
      params.delete('facet');
      params.delete('facetLimit');
    }
    inspected += page.results.length;
    for (const record of page.results) {
      if (record.key != null && checked.has(record.key)) continue;
      if (record.key != null) checked.add(record.key);
      if (!usableCoordinates(record)
        || (record.occurrenceStatus && !['PRESENT', 'DETECTED'].includes(record.occurrenceStatus))) continue;
      const distance = distanceKm(point, record.decimalLatitude, record.decimalLongitude);
      const uncertainty = record.coordinateUncertaintyInMeters;
      const knownAccuracy = Number.isFinite(uncertainty) && uncertainty > 0;
      if (distance + (knownAccuracy ? uncertainty / 1000 : 0) > radius) continue;
      retained++;
      if (!knownAccuracy) unknownAccuracy++;
      const year = record.year;
      if (Number.isInteger(year) && year > 0) {
        firstYear = Math.min(firstYear ?? year, year);
        lastYear = Math.max(lastYear ?? year, year);
      } else missingYear++;
      if (record.datasetKey && /^[0-9a-f-]{36}$/i.test(record.datasetKey)) {
        const licenses = datasets.get(record.datasetKey) ?? new Set();
        if (record.license) licenses.add(record.license);
        datasets.set(record.datasetKey, licenses);
      }
      // GBIF speciesKey is the accepted species, including for identified infraspecific taxa.
      const speciesKey = record.speciesKey ?? (record.taxonRank === 'SPECIES' ? record.acceptedTaxonKey : undefined);
      if (Number.isSafeInteger(speciesKey) && speciesKey > 0
        && !record.issues?.some(issue => ['TAXON_MATCH_HIGHERRANK', 'TAXON_MATCH_FUZZY',
          'TAXON_MATCH_AGGREGATE', 'TAXON_MATCH_NONE'].includes(issue))) species.add(speciesKey);
    }
    complete = offset + page.results.length >= total;
    if (complete || page.endOfRecords === true || page.results.length < PAGE_SIZE) break;
  }
  return {
    distinct: species.size, total, inspected, retained, unknownAccuracy, firstYear, lastYear, missingYear,
    limited: !complete, interrupted, counts,
    datasets: Array.from(datasets, ([key, licenses]) => ({ key, licenses: [...licenses] })),
  };
}

export async function discoverSpecies(filters, signal, onProgress, cachedCounts) {
  const counts = cachedCounts ?? speciesFacets(await getJson('/occurrence/search?' + discoveryParams(filters, 0), signal)) ?? [];
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
