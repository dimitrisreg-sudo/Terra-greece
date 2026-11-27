const OLYMPUS = [40.09, 22.36];
const HOME_ZOOM = 10;

export function resetMapView(map) {
  map.setView(OLYMPUS, HOME_ZOOM);
}

export function createMap(leaflet) {
  const map = leaflet.map('map', { zoomControl: false });
  resetMapView(map);
  leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
  return map;
}
