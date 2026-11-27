import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Load the browser ES module without imposing a package configuration on the static site.
const moduleSource = readFileSync(new URL('../js/features/location/terrain.js', import.meta.url));
const { createTerrainGrid, formatAspect, terrainMetrics } = await import(
  'data:text/javascript;base64,' + moduleSource.toString('base64')
);

const point = { lat: 40.09, lng: 22.36 };
const grid = createTerrainGrid(point);

function plane(east, north) {
  return [90, 0, -90].flatMap(y => [-90, 0, 90].map(x => 500 + x * east + y * north));
}

function close(actual, expected, tolerance = 0.002) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
}

test('grid is centred and compensates for longitude convergence', () => {
  assert.equal(grid.length, 9);
  assert.deepEqual(grid[4], point);
  assert.ok(grid[0].lat > point.lat && grid[0].lng < point.lng);
  assert.ok(grid[8].lat < point.lat && grid[8].lng > point.lng);
  const higher = createTerrainGrid({ lat: 60, lng: point.lng });
  assert.ok(higher[5].lng - point.lng > grid[5].lng - point.lng);
  close((grid[1].lat - point.lat) * 111195.08, 90, 0.01);
  close((grid[5].lng - point.lng) * 111195.08 * Math.cos(point.lat * Math.PI / 180), 90, 0.01);
});

test('flat and near-flat terrain have no defined aspect', () => {
  assert.deepEqual(terrainMetrics(grid, plane(0, 0)), { elevation: 500, slopeDegrees: 0, slopePercent: 0, aspect: null });
  assert.equal(terrainMetrics(grid, plane(0.005, 0)).aspect, null);
  assert.notEqual(terrainMetrics(grid, plane(0.01, 0)).aspect, null);
  assert.equal(formatAspect(null), 'Επίπεδο — χωρίς καθορισμένη έκθεση');
});

const slopes = [
  [0, -0.2, 0, 'Βόρεια'],
  [-0.2, -0.2, 45, 'Βορειοανατολικά'],
  [-0.2, 0, 90, 'Ανατολικά'],
  [-0.2, 0.2, 135, 'Νοτιοανατολικά'],
  [0, 0.2, 180, 'Νότια'],
  [0.2, 0.2, 225, 'Νοτιοδυτικά'],
  [0.2, 0, 270, 'Δυτικά'],
  [0.2, -0.2, 315, 'Βορειοδυτικά'],
];
for (const [east, north, bearing, direction] of slopes) {
  test(`known downhill surface: ${direction}`, () => {
    const result = terrainMetrics(grid, plane(east, north));
    const gradient = Math.hypot(east, north);
    close(result.slopeDegrees, Math.atan(gradient) * 180 / Math.PI);
    close(result.slopePercent, gradient * 100);
    close(result.aspect, bearing);
    assert.equal(formatAspect(result.aspect), `${direction} · ${bearing}°`);
  });
}

test('missing or invalid samples leave the valid centre available', () => {
  for (const missing of [null, undefined, NaN, Infinity, '500', -32768]) {
    const data = plane(0.2, 0);
    data[2] = missing;
    assert.deepEqual(terrainMetrics(grid, data), { elevation: 500, reason: 'missing' });
  }
  assert.deepEqual(terrainMetrics(grid, plane(0, 0).slice(0, 5)), { elevation: 500, reason: 'missing' });
  const data = plane(0, 0);
  data[4] = null;
  assert.deepEqual(terrainMetrics(grid, data), { elevation: undefined, reason: 'missing' });
});

test('possible water or coast is withheld without discarding the central elevation', () => {
  assert.deepEqual(terrainMetrics(grid, Array(9).fill(0)), { elevation: 0, reason: 'water' });
  const data = plane(0.2, 0);
  data[2] = 5;
  assert.deepEqual(terrainMetrics(grid, data), { elevation: 500, reason: 'water' });
});
