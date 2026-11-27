const GEOLOGY_TILES = 'https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png';

export const BASEMAPS = {
  sat: {
    name: 'Δορυφορικός',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  },
  osm: {
    name: 'Απλός χάρτης',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
  topo: {
    name: 'Τοπογραφικός',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '© OpenTopoMap, © OpenStreetMap',
  },
  geology: {
    name: 'Γεωλογικός χάρτης (Macrostrat)',
    url: GEOLOGY_TILES,
    maxZoom: 18,
    attribution: '© Macrostrat / source maps',
  },
};

export const GEOLOGY_OVERLAY = {
  url: GEOLOGY_TILES,
  opacity: 0.58,
  maxZoom: 18,
  attribution: '© Macrostrat',
};
