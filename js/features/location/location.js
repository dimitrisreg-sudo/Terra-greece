import { getElevation } from '../../services/elevation.js';
import { getGeologicUnit } from '../../services/macrostrat.js';

export function bindLocation(leaflet, map) {
  const panel = document.getElementById('info');
  const content = document.getElementById('infoContent');
  let marker;
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

  function showInfo(point) {
    selectedPoint = point;
    if (marker) marker.remove();
    marker = leaflet.marker(point).addTo(map);
    panel.classList.add('open');
    content.innerHTML = `
      <h2>📍 Πληροφορίες σημείου</h2>
      <div class="metric"><span>Συντεταγμένες</span><b>${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</b></div>
      <div class="metric"><span>Υψόμετρο</span><b id="elevation">Ανάκτηση…</b></div>
      <div class="metric"><span>Μητρικό πέτρωμα / γεωλογία</span><b id="rock">Ανάκτηση…</b></div>
      <div class="metric"><span>Ζώνη βλάστησης</span><b>Δεν έχει χαρτογραφηθεί ακόμη</b></div>
      <div class="notice">Η γεωλογική μονάδα δεν ταυτίζεται πάντοτε με το μητρικό υλικό του εδάφους. Για τη ζώνη βλάστησης απαιτείται εξειδικευμένο επιστημονικό επίπεδο.</div>
    `;
    loadPointData(point);
    return point;
  }

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        map.setView(point, 13);
        showInfo(point);
      },
      () => alert('Δεν ήταν δυνατός ο εντοπισμός. Το GPS συνήθως απαιτεί HTTPS.'),
      { timeout: 12000 }
    );
  }

  map.on('click', event => showInfo(event.latlng));
  document.getElementById('closeInfo').onclick = () => panel.classList.remove('open');
  document.getElementById('pin').onclick = () => showInfo(map.getCenter());
  document.getElementById('btnLocate').onclick = locate;

  return () => selectedPoint ?? showInfo(map.getCenter());
}
