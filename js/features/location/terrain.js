const EARTH_RADIUS = 6371008.8;
const RAD = Math.PI / 180;
export const SAMPLE_SPACING = 90;
export const FLAT_THRESHOLD = 0.5;
export const WATER_GUARD = 5;

const compass = ['Βόρεια', 'Βορειοανατολικά', 'Ανατολικά', 'Νοτιοανατολικά',
  'Νότια', 'Νοτιοδυτικά', 'Δυτικά', 'Βορειοδυτικά'];

function distance(a, b) {
  const latitude = Math.sin((b.lat - a.lat) * RAD / 2);
  const longitude = Math.sin((b.lng - a.lng) * RAD / 2);
  const halfChord = latitude ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * longitude ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(halfChord)));
}

export function createTerrainGrid(point) {
  // The centre uses the same coordinate precision as the location cache.
  const lat = Number(point.lat.toFixed(5));
  const lng = Number(point.lng.toFixed(5));
  const stepLat = SAMPLE_SPACING / (EARTH_RADIUS * RAD);
  if (Math.abs(lat) + stepLat >= 90) return null;
  const stepLng = stepLat / Math.cos(lat * RAD);
  const points = [];
  for (const north of [1, 0, -1]) {
    for (const east of [-1, 0, 1]) {
      const longitude = lng + east * stepLng;
      points.push({
        lat: Number((lat + north * stepLat).toFixed(7)),
        lng: Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(7)),
      });
    }
  }
  return points;
}

export function terrainMetrics(points, elevations) {
  const valid = value => Number.isFinite(value) && value >= -500 && value <= 9000;
  const elevation = valid(elevations[4]) ? elevations[4] : undefined;
  if (elevations.length !== 9 || !Array.from(elevations).every(valid)) {
    return { elevation, reason: 'missing' };
  }
  // The API supplies no water mask. Withhold derivatives when even one sample is near sea level.
  if (elevations.some(value => value <= WATER_GUARD)) return { elevation, reason: 'water' };

  // Horn weights (1, 2, 1), applied to opposite-pair slopes using their actual horizontal distances.
  const weights = [1, 2, 1];
  let east = 0;
  let north = 0;
  for (let index = 0; index < 3; index++) {
    const west = index * 3;
    east += weights[index] * (elevations[west + 2] - elevations[west]) / distance(points[west], points[west + 2]);
    north += weights[index] * (elevations[index] - elevations[index + 6]) / distance(points[index], points[index + 6]);
  }
  east /= 4;
  north /= 4;

  const gradient = Math.hypot(east, north);
  const slopeDegrees = Math.atan(gradient) / RAD;
  const slopePercent = 100 * gradient;
  const aspect = slopeDegrees < FLAT_THRESHOLD ? null : (Math.atan2(-east, -north) / RAD + 360) % 360;
  if (!Number.isFinite(slopeDegrees) || !Number.isFinite(slopePercent)) return { elevation, reason: 'missing' };
  return { elevation, slopeDegrees, slopePercent, aspect };
}

export function formatAspect(aspect) {
  if (aspect === null) return 'Επίπεδο — χωρίς καθορισμένη έκθεση';
  const bearing = Math.round(aspect) % 360;
  const direction = compass[Math.floor((aspect + 22.5) / 45) % compass.length];
  return `${direction} · ${bearing}°`;
}
