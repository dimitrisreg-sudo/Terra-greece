import { BASEMAPS } from '../map/layer-catalog.js';

function renderBasemaps(content, layers) {
  const options = Object.entries(BASEMAPS).map(([key, { name }]) => {
    const checked = layers.basemapKey === key ? 'checked' : '';
    return `<label class="option"><input type="radio" name="base" value="${key}" ${checked}>${name}</label>`;
  }).join('');
  content.innerHTML = `${options}<p class="muted">Ο γεωλογικός χάρτης είναι χαρτογραφική σύνθεση και η κάλυψή του ενδέχεται να διαφέρει ανά περιοχή.</p>`;
  for (const input of content.querySelectorAll('input')) {
    input.onchange = () => layers.setBasemap(input.value);
  }
}

function renderOverlays(content, layers) {
  const geologyChecked = layers.hasOverlay('geology') ? 'checked' : '';
  const observationsChecked = layers.hasOverlay('observations') ? 'checked' : '';
  content.innerHTML = `
    <label class="option"><input id="geocheck" type="checkbox" ${geologyChecked}> Γεωλογία πάνω στο υπόβαθρο</label>
    <label class="option"><input id="obscheck" type="checkbox" ${observationsChecked}> Σημεία επιλεγμένου είδους</label>
    <p class="muted">Οι γεωλογικοί σχηματισμοί προέρχονται από Macrostrat. Οι καταγραφές ειδών από GBIF δεν αποτελούν εκτιμήσεις πληθυσμών.</p>
  `;
  content.querySelector('#geocheck').onchange = event => layers.setOverlay('geology', event.target.checked);
  content.querySelector('#obscheck').onchange = event => layers.setOverlay('observations', event.target.checked);
}

function renderAbout(content) {
  content.innerHTML = `
    <p>Διαδραστικός επιστημονικός άτλαντας του φυσικού περιβάλλοντος της Ελλάδας.</p>
    <h3>Πηγές δεδομένων</h3>
    <ul class="sources">
      <li><a href="https://www.gbif.org/">GBIF</a> — καταγραφές ειδών</li>
      <li><a href="https://macrostrat.org/">Macrostrat</a> — γεωλογικοί χάρτες και ενότητες</li>
      <li><a href="https://open-meteo.com/">Open-Meteo</a> — μοντελοποιημένο υψόμετρο</li>
    </ul>
    <p class="muted">Οι πηγές των υποβάθρων αναγράφονται στον χάρτη.</p>
  `;
}

export function bindNavigation(layers, renderSpecies, resetView) {
  const navigation = document.querySelector('.navigation');
  const menu = document.getElementById('menuToggle');
  const links = document.getElementById('atlasLinks');
  const sheet = document.getElementById('sheet');
  const title = document.getElementById('sheetTitle');
  const content = document.getElementById('sheetContent');
  const desktop = matchMedia('(min-width: 800px)');
  let compact = false;
  let menuOpen = false;
  let activeButton;
  let disposePanel;
  let panelTrigger;

  function syncNavigation() {
    navigation.classList.toggle('compact', desktop.matches && compact);
    navigation.classList.toggle('menu-open', !desktop.matches && menuOpen);
    const expanded = desktop.matches ? !compact : menuOpen;
    const label = desktop.matches
      ? (compact ? 'Ανάπτυξη μενού' : 'Σύμπτυξη μενού')
      : (menuOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού');
    menu.setAttribute('aria-expanded', String(expanded));
    menu.setAttribute('aria-label', label);
    menu.title = label;
    menu.querySelector('.nav-label').textContent = label;
  }

  function collapseMobileMenu(restoreFocus = false) {
    if (desktop.matches || !menuOpen) return;
    menuOpen = false;
    syncNavigation();
    if (restoreFocus) menu.focus();
  }

  function closePanel(restoreFocus = false) {
    disposePanel?.();
    disposePanel = undefined;
    sheet.hidden = true;
    content.replaceChildren();
    activeButton?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      const target = panelTrigger?.getClientRects().length ? panelTrigger : desktop.matches || menuOpen ? activeButton : menu;
      target?.focus();
    }
    panelTrigger = undefined;
    activeButton = undefined;
  }

  function openPanel(button, label, render, trigger) {
    closePanel();
    collapseMobileMenu();
    activeButton = button;
    panelTrigger = trigger;
    button.setAttribute('aria-expanded', 'true');
    title.textContent = label;
    disposePanel = render(content);
    sheet.hidden = false;
    content.scrollTop = 0;
    title.focus();
  }

  const speciesButton = document.getElementById('btnSpecies');
  function openSpecies(options) {
    openPanel(speciesButton, 'Εξερεύνηση ειδών', panel => renderSpecies(panel, options), options?.trigger);
  }

  const panels = [
    ['btnBase', 'Υπόβαθρο χάρτη', panel => renderBasemaps(panel, layers)],
    ['btnLayers', 'Θεματικές ενότητες', panel => renderOverlays(panel, layers)],
    ['btnAbout', 'Πληροφορίες', renderAbout],
  ];
  for (const [id, label, render] of panels) {
    const button = document.getElementById(id);
    button.addEventListener('click', () => openPanel(button, label, render));
  }

  speciesButton.addEventListener('click', () => openSpecies());

  menu.addEventListener('click', () => {
    if (desktop.matches) compact = !compact;
    else menuOpen = !menuOpen;
    syncNavigation();
    if (!desktop.matches && menuOpen) links.querySelector('button').focus();
  });
  desktop.addEventListener('change', () => {
    const focusInLinks = links.contains(document.activeElement);
    menuOpen = false;
    syncNavigation();
    if (!desktop.matches && focusInLinks) menu.focus();
  });

  document.getElementById('closeSheet').addEventListener('click', () => closePanel(true));
  document.getElementById('btnHome').addEventListener('click', () => {
    closePanel();
    collapseMobileMenu(true);
    resetView();
  });
  document.getElementById('pin').addEventListener('click', () => {
    if (!desktop.matches) closePanel();
    collapseMobileMenu();
  }, { capture: true });
  document.getElementById('btnLocate').addEventListener('click', () => {
    if (!desktop.matches) closePanel();
    collapseMobileMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (menuOpen) collapseMobileMenu(true);
    else if (!sheet.hidden && (!desktop.matches || !document.getElementById('info').contains(document.activeElement))) closePanel(true);
    else return;
    event.preventDefault();
  });
  syncNavigation();
  return { openSpecies };
}
