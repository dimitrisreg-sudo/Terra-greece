import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../js/features/location/climate-normals.js', import.meta.url));
const { calculateClimateNormals } = await import('data:text/javascript;base64,' + code.toString('base64'));
const start = Date.UTC(1991, 0, 1);
const days = (Date.UTC(2021, 0, 1) - start) / 86400000;
const dates = Array.from({ length: days }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));

function archive(temp = () => 12, rain = () => 1) {
  return {
    utc_offset_seconds: 0,
    daily_units: { time: 'iso8601', temperature_2m_mean: '°C', precipitation_sum: 'mm' },
    daily: { time: [...dates], temperature_2m_mean: dates.map(temp), precipitation_sum: dates.map(rain) },
  };
}

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

test('monthly totals are averaged across years, with eight leap days', () => {
  assert.equal(days, 10958);
  const { temperature, precipitation } = calculateClimateNormals(archive());
  assert.deepEqual(temperature.monthly, Array(12).fill(12));
  assert.equal(temperature.annual, 12);
  close(precipitation.annual, 365 + 8 / 30);
  close(precipitation.monthly[1], 28 + 8 / 30);
  assert.equal(precipitation.monthly[3], 30);
  assert.equal(precipitation.monthly[11], 31);
});

test('monthly and annual temperature give equal weight to each year after daily averaging', () => {
  const { temperature, precipitation } = calculateClimateNormals(archive(
    date => date.endsWith('-02-29') ? 29 : 0,
    date => date.endsWith('-02-29') ? 30 : 0
  ));
  close(temperature.monthly[1], 8 / 30);
  close(temperature.annual, 8 * 29 / 366 / 30);
  close(precipitation.monthly[1], 8);
  close(precipitation.annual, 8);
});

test('incomplete, duplicate and reordered date series are rejected', () => {
  for (const invalidate of [
    list => list.pop(),
    list => { list[1] = list[0]; },
    list => { [list[0], list[1]] = [list[1], list[0]]; },
    list => { list[100] = '1991-02-29'; },
  ]) {
    const input = archive();
    invalidate(input.daily.time);
    assert.throws(() => calculateClimateNormals(input), /calendar/);
  }
});

test('invalid units, missing values and invalid precipitation remain separate from a valid series', () => {
  for (const invalid of [null, undefined, NaN, Infinity, -0.01, '0']) {
    const input = archive();
    input.daily.precipitation_sum[0] = invalid;
    const result = calculateClimateNormals(input);
    assert.equal(result.precipitation, null);
    assert.equal(result.temperature.annual, 12);
  }
  const input = archive();
  input.daily_units.temperature_2m_mean = '°F';
  const result = calculateClimateNormals(input);
  assert.equal(result.temperature, null);
  close(result.precipitation.annual, 365 + 8 / 30);
  input.utc_offset_seconds = 7200;
  assert.throws(() => calculateClimateNormals(input), /calendar/);
});

test('zero rainfall is valid, but a truncated temperature series is not', () => {
  const input = archive(() => 0, () => 0);
  input.daily.temperature_2m_mean.pop();
  const result = calculateClimateNormals(input);
  assert.equal(result.temperature, null);
  assert.deepEqual(result.precipitation, { annual: 0, monthly: Array(12).fill(0) });
});
