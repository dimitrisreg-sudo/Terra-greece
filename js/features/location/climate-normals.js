export const CLIMATE_PERIOD = '1991–2020';
export const START_YEAR = 1991;
export const END_YEAR = 2020;
export const START_DATE = START_YEAR + '-01-01';
export const END_DATE = END_YEAR + '-12-31';

const YEARS = END_YEAR - START_YEAR + 1;
const DAY = 86400000;
const FIRST_DAY = Date.UTC(START_YEAR, 0, 1);
const LAST_DAY = Date.UTC(END_YEAR + 1, 0, 1);
const DATES = Array.from({ length: (LAST_DAY - FIRST_DAY) / DAY }, (_, index) => {
  const date = new Date(FIRST_DAY + index * DAY);
  return { iso: date.toISOString().slice(0, 10), year: date.getUTCFullYear() - START_YEAR, month: date.getUTCMonth() };
});

function series(daily, units, key, unit, valid) {
  const values = daily[key];
  if (units[key] !== unit || !Array.isArray(values) || values.length !== DATES.length) return null;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || !valid(values[i])) return null;
  }
  return values;
}

function normal(values, total) {
  if (!values) return null;
  const years = Array.from({ length: YEARS }, () =>
    Array.from({ length: 12 }, () => ({ sum: 0, days: 0 }))
  );
  DATES.forEach(({ year, month }, index) => {
    years[year][month].sum += values[index];
    years[year][month].days++;
  });
  const monthly = Array(12).fill(0);
  let annual = 0;
  for (const year of years) {
    let annualSum = 0;
    let annualDays = 0;
    year.forEach(({ sum, days }, month) => {
      monthly[month] += total ? sum : sum / days;
      annualSum += sum;
      annualDays += days;
    });
    annual += total ? annualSum : annualSum / annualDays;
  }
  return { monthly: monthly.map(value => value / YEARS), annual: annual / YEARS };
}

export function calculateClimateNormals(data) {
  const { daily, daily_units: units, utc_offset_seconds: tz } = data;
  const dates = daily?.time;
  if (tz !== 0 || units?.time !== 'iso8601' || !Array.isArray(dates) || dates.length !== DATES.length
      || DATES.some(({ iso }, index) => dates[index] !== iso)) {
    throw new Error('Incomplete or invalid 1991–2020 climate calendar');
  }

  const temperature = series(daily, units, 'temperature_2m_mean', '°C', value => value >= -100 && value <= 70);
  const precipitation = series(daily, units, 'precipitation_sum', 'mm', value => value >= 0);
  return { temperature: normal(temperature, false), precipitation: normal(precipitation, true) };
}
