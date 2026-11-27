import { DATA_TYPES, ELEVATION_SOURCE, FIELDS, GEOLOGY_SOURCE, TABS } from './fields.js';

const UNAVAILABLE = 'Δεν υπάρχουν ακόμη διαθέσιμα δεδομένα';
const STATUS = {
  loading: 'Ανάκτηση δεδομένων…',
  unavailable: UNAVAILABLE,
  error: 'Αποτυχία ανάκτησης δεδομένων. Επίλεξε ξανά το σημείο για επανάληψη.',
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function sourceLink(source) {
  if (!source.url) return element('span', source.label);
  const link = element('a', source.label);
  link.href = source.url;
  return link;
}

function fieldView(id) {
  const field = FIELDS[id];
  const row = element('div', '', 'science-field');
  const heading = element('div', '', 'science-field-heading');
  const details = element('details', '', 'science-definition');
  const summary = element('summary', 'ⓘ');
  const documentation = element('div');
  summary.setAttribute('aria-label', `Τεκμηρίωση για το πεδίο «${field.label}»`);
  details.append(summary, documentation);
  const value = element('div', '', 'science-value');
  const type = element('span', '', 'science-type');
  heading.append(element('h3', field.label), details);
  row.append(heading, value, type);

  let lastResult;
  function update(result) {
    row.hidden = id === 'accuracy' && !result;
    if (lastResult === result && documentation.hasChildNodes()) return;
    lastResult = result;
    const state = result?.state || 'unavailable';
    const unit = result?.unit ?? field.unit;
    value.textContent = state === 'available'
      ? [result.value, unit].filter(part => part != null && part !== '').join(' ')
      : STATUS[state];
    value.dataset.state = state;
    const provenance = DATA_TYPES[result?.type ?? field.type];
    type.textContent = state === 'available' ? provenance?.[0] ?? '' : '';
    type.hidden = !type.textContent;

    const source = result?.source ?? field.source;
    documentation.replaceChildren(element('p', field.definition));
    if (!source) {
      documentation.append(element('p', 'Πηγή: δεν έχει συνδεθεί ακόμη σύνολο δεδομένων.'));
      return;
    }
    const reference = element('p', 'Πηγή: ');
    reference.append(sourceLink(source));
    documentation.append(reference);
    for (const [label, text] of [
      ['Πρωτογενής αναφορά', source.citation],
      ['Περίοδος αναφοράς', source.period],
      ['Χωρική ανάλυση', source.resolution],
      ['Κλίμακα χάρτη (όπως παρέχεται)', source.scale],
      ['Μέθοδος', source.methodology],
      ['Περιορισμοί', source.limitations],
    ]) {
      if (text) documentation.append(element('p', `${label}: ${text}`));
    }
  }

  return { id, row, update, details };
}

function documentationSection() {
  const details = element('details', '', 'science-sources');
  const list = element('ul');
  for (const source of [ELEVATION_SOURCE, GEOLOGY_SOURCE, FIELDS.accuracy.source]) {
    const item = element('li');
    item.append(sourceLink(source));
    list.append(item);
  }
  details.append(element('summary', 'Πηγές και τεκμηρίωση'), list);
  for (const [label, description] of Object.values(DATA_TYPES)) {
    const term = element('p');
    term.append(element('strong', label), ` — ${description}`);
    details.append(term);
  }
  return details;
}

export function createLocationPanel(tablist, content) {
  const fields = [];
  const tabs = [];
  const panels = [];
  let currentIndex = -1;
  const warning = element('p', 'Χαμηλή ακρίβεια θέσης. Η πραγματική θέση μπορεί να διαφέρει αισθητά από τον δείκτη.', 'notice warning');
  warning.hidden = true;
  const sources = documentationSection();

  function activate(index, focus = false) {
    if (index !== currentIndex) {
      currentIndex = index;
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      content.scrollTop = 0;
    }
    if (focus) tabs[index].focus({ preventScroll: true });
    const button = tabs[index];
    const left = button.offsetLeft - tablist.offsetLeft;
    if (left < tablist.scrollLeft) tablist.scrollLeft = left;
    else if (left + button.offsetWidth > tablist.scrollLeft + tablist.clientWidth) {
      tablist.scrollLeft = left + button.offsetWidth - tablist.clientWidth;
    }
  }

  TABS.forEach(([id, label, fieldIds], index) => {
    const tab = element('button', label);
    const pane = element('div', '', 'science-tabpanel');
    tab.type = 'button';
    tab.id = 'location-tab-' + id;
    pane.id = 'location-pane-' + id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', pane.id);
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', tab.id);
    pane.tabIndex = 0;
    tab.onclick = () => activate(index);
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
      else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = TABS.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
    for (const fieldId of fieldIds) {
      const view = fieldView(fieldId);
      fields.push(view);
      pane.append(view.row);
      if (fieldId === 'accuracy') pane.append(warning);
    }
    tabs.push(tab);
    panels.push(pane);
    tablist.append(tab);
    content.append(pane);
  });
  content.append(sources);
  activate(0);

  return {
    overview(accuracy) {
      activate(0);
      tablist.scrollLeft = 0;
      content.scrollTop = 0;
      warning.hidden = !(Number.isFinite(accuracy) && accuracy >= 100);
      for (const field of fields) field.details.open = false;
      sources.open = false;
    },
    update(values) {
      for (const view of fields) view.update(values[view.id]);
    },
  };
}
