import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceKm, radiusPolygon } from '../js/services/gbif-geography.js';
import { discoverSpecies, sampleRecordedSpecies } from '../js/services/gbif.js';
import { occurrenceGrid } from '../js/features/species/occurrence-grid.js';
import { createBiodiversityData } from '../js/features/location/biodiversity-data.js';

const point = { lat: 40.085, lng: 22.358 };
const filters = { point, radius: 5, month: '', taxonKey: '6' };
const signal = () => new AbortController().signal;
const datasetKey = 'f673b31c-d875-4964-9815-47e9d27e97ba';
const record = (key, acceptedTaxonKey, fields = {}) => ({
  key, acceptedTaxonKey, taxonRank: 'SPECIES', occurrenceStatus: 'PRESENT', year: 2018,
  decimalLatitude: point.lat, decimalLongitude: point.lng, datasetKey, license: 'CC_BY_4_0', ...fields,
});
const json = value => Response.json(value);
function mock(t, fetch) {
  t.mock.method(globalThis, 'fetch', (url, options) => fetch(new URL(url).searchParams, options));
}

test('all seven Greek test regions get a closed counterclockwise 5 km geodesic ring', () => {
  const sites = [point, {lat: 41.122, lng: 26.221}, {lat: 39.88, lng: 20.94}, {lat: 39.45, lng: 22.34},
    {lat: 35.3, lng: 25.15}, {lat: 37.975, lng: 23.735}, {lat: 38.9, lng: 24.8}];
  for (const site of sites) {
    const vertices = radiusPolygon(site, 5).slice(9, -2).split(',').map(pair => pair.split(' ').map(Number));
    assert.equal(vertices.length, 73);
    assert.deepEqual(vertices[0], vertices.at(-1));
    let signedArea = 0;
    for (let i = 0; i < 72; i++) {
      const [lng, lat] = vertices[i];
      const [nextLng, nextLat] = vertices[i + 1];
      assert.ok(Math.abs(distanceKm(site, lat, lng) - 5) < .00002);
      signedArea += lng * nextLat - nextLng * lat;
    }
    assert.ok(signedArea > 0);
  }
});

test('sample excludes out-of-radius corners, uncertainty, withheld and absent records, deduplicates accepted taxa', async t => {
  const data = [
    record(1, 15, { taxonKey: 15, coordinateUncertaintyInMeters: 30 }),
    record(2, 15, { taxonKey: 100, year: 1905 }),
    record(3, 16, { year: undefined }),
    record(4, 17, { decimalLongitude: point.lng + .05, decimalLatitude: point.lat + .04 }),
    record(5, 18, { coordinateUncertaintyInMeters: 5100 }),
    record(6, 19, { dataGeneralizations: 'hidden' }),
    record(7, 20, { informationWithheld: 'hidden' }),
    record(8, 21, { occurrenceStatus: 'ABSENT' }),
    record(9, 22, { taxonRank: 'SUBSPECIES', speciesKey: 16 }),
    record(10, 23, { issues: ['TAXON_MATCH_AGGREGATE'] }),
    record(11, 24, { decimalLatitude: null }),
    record(12, 25, { issues: ['ZERO_COORDINATE'] }),
    record(1, 999),
  ];
  mock(t, query => {
    assert.equal(query.get('geometry'), radiusPolygon(point, 5));
    assert.equal(query.get('taxonKey'), '6');
    assert.equal(query.get('occurrenceStatus'), 'PRESENT');
    assert.equal(query.has('country'), false);
    return json({ count: data.length, endOfRecords: true, results: data });
  });
  const result = await sampleRecordedSpecies(filters, signal());
  assert.equal(result.distinct, 2);
  assert.equal(result.total, 13);
  assert.equal(result.retained, 5);
  assert.equal(result.unknownAccuracy, 4);
  assert.equal(result.firstYear, 1905);
  assert.equal(result.lastYear, 2018);
  assert.equal(result.missingYear, 1);
  assert.deepEqual(result.datasets, [{ key: datasetKey, licenses: ['CC_BY_4_0'] }]);
  assert.equal(JSON.stringify(result).includes('decimalLatitude'), false);
  assert.equal(result.limited, false);
  assert.equal(occurrenceGrid([data[0], data[5], data[6], data[10], data[11]])[0].count, 1);
});

test('bounded pagination combines pages, deduplicates repeated records and supplies matching Explorer facets', async t => {
  const calls = [];
  mock(t, query => {
    calls.push(query);
    if (query.get('limit') === '1') return json({ count: 701, results: [{ species: 'Taxon A' }] });
    const offset = Number(query.get('offset'));
    return json({ count: 1040, endOfRecords: false, facets: offset ? [] : [{ field: 'SPECIES_KEY', counts: [{ name: '10' }] }],
      results: Array.from({ length: 300 }, (_, i) => record(i + (offset ? 299 : 0), offset ? 11 : 10)) });
  });
  const result = await sampleRecordedSpecies(filters, signal());
  assert.deepEqual(calls.map(query => query.get('offset')), ['0', '300']);
  assert.equal(calls[1].has('facet'), false);
  assert.equal(result.inspected, 600);
  assert.equal(result.retained, 599);
  assert.equal(result.distinct, 2);
  assert.equal(result.limited, true);
  const discovery = await discoverSpecies(filters, signal(), () => {}, result.counts);
  assert.deepEqual(discovery.species, [{ key: '10', count: 701, name: 'Taxon A' }]);
  assert.equal(calls.length, 3);
});

test('empty, malformed, rate-limited and interrupted GBIF responses', async t => {
  let mode = 'empty';
  mock(t, query => {
    if (mode === 'empty') return json({ count: 0, endOfRecords: true, results: [] });
    if (mode === 'short') return json({ count: 42, endOfRecords: true, results: [record(1, 15)] });
    if (mode === 'malformed') return json({ results: [] });
    if (mode === 'blocked' || query.get('offset') === '300') return new Response(null, { status: 429 });
    return json({ count: 600, endOfRecords: false, results: Array(300).fill(record(1, 15)) });
  });
  assert.equal((await sampleRecordedSpecies(filters, signal())).total, 0);
  mode = 'short';
  assert.equal((await sampleRecordedSpecies(filters, signal())).limited, true);
  mode = 'malformed';
  await assert.rejects(sampleRecordedSpecies(filters, signal()), /Invalid GBIF page/);
  mode = 'blocked';
  await assert.rejects(sampleRecordedSpecies(filters, signal()), { status: 429 });
  mode = 'partial';
  const result = await sampleRecordedSpecies(filters, signal());
  assert.equal(result.interrupted, true);
  assert.equal(result.distinct, 1);
});

test('point selection is lazy, newer selections cancel stale requests, aggregates and facets are scoped to matching filters', async t => {
  const pending = [];
  mock(t, (query, { signal }) => new Promise(resolve => pending.push({ query, signal, resolve })));
  let states;
  const data = createBiodiversityData(next => { states = structuredClone(next); });
  data.selectPoint(point);
  assert.equal(pending.length, 0);
  const old = data.load();
  assert.equal(states['6'].state, 'loading');
  const next = { lat: 39.45, lng: 22.34 };
  data.selectPoint(next);
  assert.ok(pending.every(call => call.signal.aborted));
  const recent = data.load();
  const emptyPage = () => json({ count: 0, results: [], endOfRecords: true,
    facets: [{ field: 'SPECIES_KEY', counts: [] }] });
  pending.slice(3).forEach(call => call.resolve(emptyPage()));
  await recent;
  pending.slice(0, 3).forEach(call => call.resolve(json({ count: 1, results: [record(1, 15)] })));
  await old;
  assert.equal(states['1'].total, 0);
  await data.load();
  assert.equal(pending.length, 6);
  assert.deepEqual(data.discoveryCounts({ ...filters, point: next }), []);
  assert.equal(data.discoveryCounts(filters), undefined);
  assert.equal(data.discoveryCounts({ ...filters, point: next, radius: 10 }), undefined);
  assert.equal(data.discoveryCounts({ ...filters, point: next, month: '1' }), undefined);
});

test('timeout preserves a first page, while cancellation rejects the same partial sample', async t => {
  let failPage;
  mock(t, (query, { signal }) => {
    if (query.get('offset') === '0') {
      return json({ count: 600, results: Array(300).fill(record(1, 15)) });
    }
    return new Promise((resolve, reject) => {
      failPage();
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  for (const name of ['TimeoutError', 'AbortError']) {
    const controller = new AbortController();
    const pageTwo = new Promise(resolve => { failPage = resolve; });
    const result = sampleRecordedSpecies(filters, controller.signal);
    await pageTwo;
    controller.abort(new DOMException(name, name));
    if (name === 'AbortError') await assert.rejects(result, { name });
    else {
      const partial = await result;
      assert.equal(partial.interrupted, true);
      assert.equal(partial.distinct, 1);
    }
  }
});
