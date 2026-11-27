import { createLocationData } from './location-data.js';
import { createLocationPanel } from './location-panel.js';
import { createSoilData } from './soil-data.js';

export function bindLocation(leaflet, map) {
  const panel = document.getElementById('info');
  let locationValues = {};
  let soilValues = {};
  const soil = createSoilData(values => {
    soilValues = values;
    view.update({ ...locationValues, ...soilValues });
  });
  const view = createLocationPanel(document.getElementById('locationTabs'), document.getElementById('infoContent'), {
    onTabChange: tab => soil.setVisible(tab === 'soil'),
    onSoilDepthChange: soil.setDepth,
  });
  const selectData = createLocationData(values => {
    locationValues = values;
    view.update({ ...locationValues, ...soilValues });
  });
  const title = document.getElementById('infoTitle');
  const locateButton = document.getElementById('btnLocate');
  const gpsStatus = document.getElementById('gpsStatus');
  const listeners = new Set();
  let marker;
  let accuracyCircle;
  let focusReturn;
  let selectedPoint = null;

  function showInfo(point, { accuracy, trigger } = {}) {
    const changed = selectedPoint?.lat !== point.lat || selectedPoint?.lng !== point.lng;
    selectedPoint = point;
    accuracyCircle?.remove();
    accuracyCircle = undefined;
    const hasAccuracy = Number.isFinite(accuracy) && accuracy > 0;
    if (hasAccuracy) {
      accuracyCircle = leaflet.circle(point, {
        radius: accuracy,
        color: '#344c3d',
        weight: 2,
        dashArray: '5 5',
        fillOpacity: 0.14,
        interactive: false,
      }).addTo(map);
    }
    if (trigger) focusReturn = trigger;
    else focusReturn = map.getContainer();
    if (marker) marker.remove();
    marker = leaflet.marker(point).addTo(map);
    panel.hidden = false;
    view.overview(accuracy);
    soil.selectPoint(point);
    selectData(point, accuracy);
    if (trigger) title.focus({ preventScroll: true });
    if (changed) for (const notify of listeners) notify();
    return point;
  }

  function locate() {
    if (!navigator.geolocation) {
      gpsStatus.textContent = 'Η συσκευή ή ο browser δεν υποστηρίζει γεωεντοπισμό.';
      return;
    }

    locateButton.disabled = true;
    gpsStatus.textContent = 'Εντοπισμός θέσης…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locateButton.disabled = false;
        gpsStatus.textContent = '';
        const point = { lat: coords.latitude, lng: coords.longitude };
        map.setView(point, 13);
        showInfo(point, { accuracy: coords.accuracy, trigger: locateButton });
      },
      error => {
        locateButton.disabled = false;
        gpsStatus.textContent = error.code === 1
          ? 'Δεν δόθηκε άδεια τοποθεσίας. Έλεγξε τις ρυθμίσεις του browser.'
          : 'Δεν ήταν δυνατός ο εντοπισμός. Δοκίμασε ξανά.';
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function closeInfo() {
    panel.hidden = true;
    soil.setVisible(false);
    if (focusReturn?.getClientRects().length && !focusReturn.disabled) focusReturn.focus();
    else document.getElementById('menuToggle').focus();
  }

  map.on('click', event => showInfo(event.latlng));
  document.getElementById('closeInfo').onclick = closeInfo;
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeInfo();
  });
  const pin = document.getElementById('pin');
  pin.onclick = () => showInfo(map.getCenter(), { trigger: pin });
  locateButton.onclick = locate;

  return {
    searchPoint: () => selectedPoint ?? showInfo(map.getCenter()),
    onPointChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
