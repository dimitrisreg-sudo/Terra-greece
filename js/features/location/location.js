import { getElevation } from '../../services/elevation.js';
import { getGeologicUnit } from '../../services/macrostrat.js';

export function bindLocation(leaflet, map) {
  const panel = document.getElementById('info');
  const content = document.getElementById('infoContent');
  const title = document.getElementById('infoTitle');
  const locateButton = document.getElementById('btnLocate');
  const gpsStatus = document.getElementById('gpsStatus');
  const listeners = new Set();
  let marker;
  let accuracyCircle;
  let focusReturn;
  let selectedPoint = null;
  let pointRequest = 0;

  async function loadPointData(point) {
    const request = ++pointRequest;
    const elevationField = document.getElementById('elevation');
    const rockField = document.getElementById('rock');

    try {
      const elevation = await getElevation(point);
      if (request === pointRequest) {
        elevationField.textContent = Number.isFinite(elevation)
          ? Math.round(elevation) + ' μ. (μοντέλο εδάφους)'
          : 'Μη διαθέσιμο';
      }
    } catch {
      if (request === pointRequest) elevationField.textContent = 'Μη διαθέσιμο';
    }

    try {
      const unit = await getGeologicUnit(point);
      if (request === pointRequest) {
        rockField.textContent = unit
          ? String(unit).slice(0, 110)
          : 'Δεν υπάρχουν διαθέσιμα στοιχεία';
      }
    } catch {
      if (request === pointRequest) rockField.textContent = 'Η υπηρεσία δεν ανταποκρίθηκε';
    }
  }

  function showInfo(point, { accuracy, trigger } = {}) {
    const changed = selectedPoint?.lat !== point.lat || selectedPoint?.lng !== point.lng;
    selectedPoint = point;
    accuracyCircle?.remove();
    accuracyCircle = undefined;
    const hasAccuracy = Number.isFinite(accuracy) && accuracy > 0;
    const accuracyText = hasAccuracy && accuracy >= 1000
      ? `${(accuracy / 1000).toLocaleString('el-GR', { maximumFractionDigits: 1 })} χλμ.`
      : `${Math.round(accuracy).toLocaleString('el-GR')} μ.`;
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
    content.innerHTML = `
      <div class="metric"><span>Συντεταγμένες</span><b>${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</b></div>
      ${hasAccuracy ? `<div class="metric"><span>Εκτιμώμενη ακρίβεια θέσης</span><b>±${accuracyText}</b></div>` : ''}
      ${hasAccuracy && accuracy >= 100 ? '<p class="notice warning">Χαμηλή ακρίβεια θέσης. Η πραγματική θέση μπορεί να διαφέρει αισθητά από τον δείκτη.</p>' : ''}
      <div class="metric"><span>Υψόμετρο</span><b id="elevation">Ανάκτηση…</b></div>
      <div class="metric"><span>Μητρικό πέτρωμα / γεωλογία</span><b id="rock">Ανάκτηση…</b></div>
      <div class="metric"><span>Ζώνη βλάστησης</span><b>Δεν έχει χαρτογραφηθεί ακόμη</b></div>
      <div class="notice">Η γεωλογική μονάδα δεν ταυτίζεται πάντοτε με το μητρικό υλικό του εδάφους. Για τη ζώνη βλάστησης απαιτείται εξειδικευμένο επιστημονικό επίπεδο.</div>
    `;
    loadPointData(point);
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
