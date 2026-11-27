const EARTH_RADIUS_KM = 6371.0088;
const radians = degrees => degrees * Math.PI / 180;
const degrees = angle => angle * 180 / Math.PI;

export function radiusPolygon({ lat, lng }, radius) {
  const latitude = radians(lat);
  const longitude = radians(lng);
  const distance = radius / EARTH_RADIUS_KM;
  const vertices = Array.from({ length: 72 }, (_, index) => {
    const bearing = -2 * Math.PI * index / 72;
    const y = Math.asin(Math.sin(latitude) * Math.cos(distance)
      + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing));
    const x = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(y));
    return `${degrees(x).toFixed(7)} ${degrees(y).toFixed(7)}`;
  });
  return `POLYGON((${[...vertices, vertices[0]].join(',')}))`;
}

export function distanceKm(point, lat, lng) {
  const a = Math.sin(radians(lat - point.lat) / 2) ** 2
    + Math.cos(radians(point.lat)) * Math.cos(radians(lat))
    * Math.sin(radians(lng - point.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function usableCoordinates(record) {
  const { decimalLatitude: lat, decimalLongitude: lng } = record;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !record.informationWithheld && !record.dataGeneralizations && !record.hasGeospatialIssues
    && !record.issues?.some(issue => ['COORDINATE_INVALID', 'COORDINATE_OUT_OF_RANGE',
      'COUNTRY_COORDINATE_MISMATCH', 'ZERO_COORDINATE'].includes(issue));
}
