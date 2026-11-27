const OLYMPUS = [40.09, 22.36];
const HOME_ZOOM = 10;

export function resetMapView(map) {
  map.setView(OLYMPUS, HOME_ZOOM);
}

export function createMap(leaflet) {
  const map = leaflet.map('map', { zoomControl: false });
  resetMapView(map);
  leaflet.control.zoom({ position: 'bottomleft' }).addTo(map);
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
    observer.observe(map.getContainer());
    map.once('unload', () => observer.disconnect());
  }
  return map;
}
