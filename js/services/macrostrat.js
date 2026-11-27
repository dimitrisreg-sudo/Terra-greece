export async function getGeologicUnit({ lat, lng }) {
  const response = await fetch(
    `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&response=long`
  );
  const data = await response.json();
  const units = data.success?.data;
  const unit = Array.isArray(units) ? units[0] : units;
  return unit?.name || unit?.strat_name || unit?.lith || unit?.lithology || unit?.descrip;
}
