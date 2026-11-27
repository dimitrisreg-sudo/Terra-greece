import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Load browser ES modules without imposing package configuration on the static site.
const moduleUrl = path => 'data:text/javascript;base64,'
  + readFileSync(new URL(path, import.meta.url)).toString('base64');
const classesUrl = moduleUrl('../js/features/location/corine-classes.js');
const { corineClass } = await import(classesUrl);
const service = readFileSync(new URL('../js/services/corine.js', import.meta.url), 'utf8')
  .replace('../features/location/corine-classes.js', classesUrl);
const { getCorineLandCover, readCorineIntersection } = await import(
  'data:text/javascript;base64,' + Buffer.from(service).toString('base64')
);
const response = (...codes) => ({ features: codes.map(code => ({ attributes: { CODE_18_EN: code } })) });

test('the 44 official classes have Greek titles, both parents and unique codes', () => {
  const codes = Array.from({ length: 900 }, (_, i) => corineClass(100 + i)).filter(Boolean);
  assert.equal(codes.length, 44);
  assert.ok(codes.every(({ label, domain, group, english }) =>
    [label, domain, group].every(text => /\p{Script=Greek}/u.test(text)) && /[A-Za-z]/.test(english)));
  assert.deepEqual(corineClass('223'), {
    code: '223', label: 'Ελαιώνες', english: 'Olive groves',
    domain: 'Γεωργικές περιοχές', group: 'Μόνιμες καλλιέργειες',
  });
  for (const code of ['1120', '312.5', '999', '990', '995', '000', null, 'constructor']) {
    assert.equal(corineClass(code), null);
  }
});

test('water is a valid class, different from unclassified pixels or no intersection', () => {
  assert.equal(readCorineIntersection(response(523)).match.label, 'Θάλασσες και ωκεανοί');
  for (const data of [response(), response('999'), response('990'), response('995'), response(null)]) {
    assert.deepEqual(readCorineIntersection(data), { state: 'unavailable' });
  }
});

test('ambiguous boundaries are retained, while identical intersections resolve to one class', () => {
  const result = readCorineIntersection(response('523', '331', '523'));
  assert.equal(result.state, 'ambiguous');
  assert.deepEqual(result.matches.map(match => match.code), ['331', '523']);
  assert.equal(readCorineIntersection(response('523', '999')).state, 'ambiguous');
  assert.equal(readCorineIntersection(response('311', '311')).match.code, '311');
});

test('unknown class, malformed result, ArcGIS error and truncated result are service errors', () => {
  for (const data of [response('1234'), {}, { features: [{}] }, { error: { code: 500 } },
    { ...response('211'), exceededTransferLimit: true }]) {
    assert.throws(() => readCorineIntersection(data));
  }
});

test('query requests one WGS 84 point and propagates HTTP errors and aborts', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const point = { lat: 39.55, lng: 22.38 };
  globalThis.fetch = async url => {
    const query = new URL(url).searchParams;
    assert.equal(query.get('geometry'), '22.38,39.55');
    assert.equal(query.get('inSR'), '4326');
    assert.equal(query.get('spatialRel'), 'esriSpatialRelIntersects');
    assert.equal(query.get('returnGeometry'), 'false');
    return Response.json(response('211'));
  };
  const signal = new AbortController().signal;
  assert.equal((await getCorineLandCover(point, signal)).match.code, '211');
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(() => getCorineLandCover(point, signal), /503/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => getCorineLandCover(point, controller.signal), { name: 'AbortError' });
});
