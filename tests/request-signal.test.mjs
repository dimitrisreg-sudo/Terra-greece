import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withRequestDeadline } from '../js/services/request-signal.js';
import { getElevations } from '../js/services/elevation.js';
import { getGeologicUnit } from '../js/services/macrostrat.js';
import { discoverSpecies } from '../js/services/gbif.js';

test('service deadline is distinguishable from selection cancellation', async () => {
  const controller = new AbortController();
  const awaitAbort = signal => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  await assert.rejects(withRequestDeadline(awaitAbort, controller.signal, 1), { name: 'TimeoutError' });
  assert.equal(controller.signal.aborted, false);

  const pending = withRequestDeadline(awaitAbort, controller.signal);
  const reason = new DOMException('New selection', 'AbortError');
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
});

test('elevation, geology and Explorer use cancellable request signals', async t => {
  const controller = new AbortController();
  const captured = [];
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_, reject) => {
    captured.push(signal);
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const point = { lat: 40, lng: 22 };
  const requests = [
    getElevations([point], controller.signal),
    getGeologicUnit(point, controller.signal),
    discoverSpecies({ radius: 0, taxonKey: '1', month: '' }, controller.signal, () => {}),
  ];
  assert.equal(captured.length, 3);
  assert.ok(captured.every(signal => signal !== controller.signal));
  controller.abort();
  const results = await Promise.allSettled(requests);
  assert.ok(results.every(result => result.reason?.name === 'AbortError'));
});
