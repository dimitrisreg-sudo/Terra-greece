import { BASEMAPS, GEOLOGY_OVERLAY } from './layer-catalog.js';

export function createLayerController(leaflet, map) {
  const { url: geologyUrl, ...geologyOptions } = GEOLOGY_OVERLAY;
  const observations = leaflet.layerGroup().addTo(map);
  const overlays = {
    geology: leaflet.tileLayer(geologyUrl, geologyOptions),
    observations,
  };
  let basemap;
  let basemapKey;

  function setBasemap(key) {
    if (basemap) map.removeLayer(basemap);
    const { url, maxZoom, attribution } = BASEMAPS[key];
    basemap = leaflet.tileLayer(url, { maxZoom, attribution }).addTo(map);
    basemap.bringToBack();
    basemapKey = key;
  }

  function setOverlay(key, visible) {
    const layer = overlays[key];
    if (visible) layer.addTo(map);
    else map.removeLayer(layer);
  }

  function showObservations(points) {
    observations.clearLayers();
    for (const { position, popup } of points) {
      leaflet.circleMarker(position, {
        radius: 6,
        color: '#174b39',
        fillColor: '#efb34e',
        fillOpacity: 0.85,
        weight: 1,
      }).bindPopup(popup).addTo(observations);
    }
    setOverlay('observations', true);
    if (points.length) {
      map.fitBounds(points.map(point => point.position), { padding: [50, 50], maxZoom: 12 });
    }
  }

  setBasemap('sat');
  return {
    get basemapKey() { return basemapKey; },
    setBasemap,
    hasOverlay: key => map.hasLayer(overlays[key]),
    setOverlay,
    clearObservations: () => observations.clearLayers(),
    showObservations,
  };
}
