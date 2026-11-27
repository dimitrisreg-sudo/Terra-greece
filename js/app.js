import { bindLocation } from './features/location/location.js';
import { createSpeciesPanel } from './features/species/species.js';
import { createMap, resetMapView } from './map/create-map.js';
import { createLayerController } from './map/layer-controller.js';
import { bindNavigation } from './ui/navigation.js';

function showFatalError(error) {
  console.error('Terra Greece map initialization failed:', error);
  const overlay = document.createElement('div');
  const box = document.createElement('div');
  const title = document.createElement('h2');
  const message = document.createElement('p');
  overlay.className = 'error';
  title.textContent = 'Δεν φορτώθηκε ο χάρτης';
  message.textContent = error?.message || 'Παρουσιάστηκε απρόσμενο σφάλμα κατά την αρχικοποίηση.';
  box.append(title, message);
  overlay.append(box);
  document.body.append(overlay);
}

function boot() {
  try {
    const leaflet = window.L;
    if (!leaflet) {
      throw new Error('Δεν φορτώθηκε το τοπικό Leaflet (./vendor/leaflet/leaflet.js). Έλεγξε ότι το αρχείο υπάρχει στο repository.');
    }

    const map = createMap(leaflet);
    const layers = createLayerController(leaflet, map);
    const location = bindLocation(leaflet, map, options => navigation.openSpecies(options));
    const species = createSpeciesPanel(layers, location);
    const navigation = bindNavigation(layers, species, () => resetMapView(map));
  } catch (error) {
    showFatalError(error);
  }
}

boot();
