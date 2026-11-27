import { withRequestDeadline } from './request-signal.js';

export async function getGeologicUnit({ lat, lng }, signal) {
  return withRequestDeadline(async requestSignal => {
    const response = await fetch(
      `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&response=long`,
      { signal: requestSignal }
    );
    if (!response.ok) throw new Error('Macrostrat ' + response.status);
    const data = await response.json();
    const units = data.success?.data;
    const unit = Array.isArray(units) ? units[0] : units;
    if (!unit) return null;

    return {
      name: unit.name || unit.strat_name,
      lithology: unit.lith || unit.lithology,
      age: unit.best_int_name || [...new Set([unit.b_int_name, unit.t_int_name].filter(Boolean))].join(' – '),
      citation: data.success.refs?.[unit.source_id],
      scale: unit.scale,
    };
  }, signal);
}
