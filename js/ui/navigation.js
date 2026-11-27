import { BASEMAPS } from '../map/layer-catalog.js';

function renderBasemaps(content, layers) {
  const options = Object.entries(BASEMAPS).map(([key, { name }]) => {
    const checked = layers.basemapKey === key ? 'checked' : '';
    return `<label class="option"><input type="radio" name="base" value="${key}" ${checked}>${name}</label>`;
  }).join('');
  content.innerHTML = `<h2>Υπόβαθρο χάρτη</h2>${options}<p class="muted">Ο γεωλογικός χάρτης είναι χαρτογραφική σύνθεση και η κάλυψή του ενδέχεται να διαφέρει ανά περιοχή.</p>`;
  for (const input of content.querySelectorAll('input')) {
    input.onchange = () => layers.setBasemap(input.value);
  }
}

function renderOverlays(content, layers) {
  const geologyChecked = layers.hasOverlay('geology') ? 'checked' : '';
  const observationsChecked = layers.hasOverlay('observations') ? 'checked' : '';
  content.innerHTML = `
    <h2>Επίπεδα</h2>
    <label class="option"><input id="geocheck" type="checkbox" ${geologyChecked}> Γεωλογία πάνω στο υπόβαθρο</label>
    <label class="option"><input id="obscheck" type="checkbox" ${observationsChecked}> Σημεία επιλεγμένου είδους</label>
    <p class="muted">Οι γεωλογικοί σχηματισμοί προέρχονται από Macrostrat. Οι καταγραφές ειδών από GBIF δεν αποτελούν εκτιμήσεις πληθυσμών.</p>
  `;
  content.querySelector('#geocheck').onchange = event => layers.setOverlay('geology', event.target.checked);
  content.querySelector('#obscheck').onchange = event => layers.setOverlay('observations', event.target.checked);
}

export function bindNavigation(layers, renderSpecies, resetView) {
  const sheet = document.getElementById('sheet');
  const content = document.getElementById('sheetContent');
  const buttons = document.querySelectorAll('.rail button');

  function clearActiveButtons() {
    for (const button of buttons) button.classList.remove('active');
  }

  const panels = {
    btnBase: () => renderBasemaps(content, layers),
    btnLayers: () => renderOverlays(content, layers),
    btnSpecies: () => renderSpecies(content),
  };
  for (const [id, render] of Object.entries(panels)) {
    const button = document.getElementById(id);
    button.onclick = () => {
      sheet.classList.add('open');
      clearActiveButtons();
      button.classList.add('active');
      render();
    };
  }

  document.getElementById('closeSheet').onclick = () => {
    sheet.classList.remove('open');
    clearActiveButtons();
  };
  document.getElementById('btnHome').onclick = resetView;
}
