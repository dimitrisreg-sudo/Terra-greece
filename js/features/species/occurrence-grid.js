// Apply the same grid to local and nationwide results so a local query cannot expose finer positions.
export function occurrenceGrid(records) {
  const cells = new Map();
  for (const record of records) {
    const { decimalLatitude: lat, decimalLongitude: lng } = record;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    if (record.informationWithheld || record.dataGeneralizations || record.hasGeospatialIssues
      || record.issues?.some(issue => ['COORDINATE_INVALID', 'COORDINATE_OUT_OF_RANGE', 'COUNTRY_COORDINATE_MISMATCH'].includes(issue))) continue;

    const row = Math.floor(lat * 10);
    const column = Math.floor(lng * 10);
    const key = `${row},${column}`;
    if (!cells.has(key)) cells.set(key, { position: [(row + 0.5) / 10, (column + 0.5) / 10], count: 0 });
    cells.get(key).count++;
  }
  return [...cells.values()];
}
