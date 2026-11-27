import { BIODIVERSITY_RADIUS, KINGDOMS } from './biodiversity-data.js';

const integer = new Intl.NumberFormat('el-GR');
const date = new Intl.DateTimeFormat('el-GR', { dateStyle: 'medium', timeZone: 'Europe/Athens' });

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function renderKingdom(node, label, result) {
  node.replaceChildren(element('strong', label + ' · '));
  if (result?.state === 'loading') node.append('Ανάκτηση από το GBIF…');
  else if (result?.state === 'error') node.append('Η ανάκτηση από το GBIF απέτυχε.');
  else if (result?.state !== 'available') node.append('Αναμονή φόρτωσης.');
  else {
    const { distinct, total, inspected, retained, limited, interrupted, firstYear, lastYear, missingYear, unknownAccuracy, retrievedAt } = result;
    const years = firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`;
    node.append(`${integer.format(distinct)} διακριτά είδη που τεκμηριώθηκαν στο δείγμα (ελάχιστο). `
      + `${integer.format(total)} εγγραφές στο χωρικό ερώτημα GBIF, ${integer.format(inspected)} ελέγχθηκαν, ${integer.format(retained)} πληρούσαν τα κριτήρια παρουσίας και θέσης. `
      + (interrupted ? 'Η σελιδοποίηση διακόπηκε από σφάλμα. ' : limited ? 'Ελέγχθηκε μέρος των εγγραφών. ' : '')
      + (total === 0 ? 'Το μηδέν δεν τεκμηριώνει απουσία. ' : '')
      + `Ανάκτηση ${date.format(retrievedAt)}.`);
    if (retained) node.append(` Έτη καταγραφής: ${years ?? 'άγνωστα'}. ${integer.format(missingYear)} χωρίς έτος, ${integer.format(unknownAccuracy)} χωρίς δηλωμένη ακρίβεια.`);
    if (result.datasets.length) {
      const sources = element('details');
      const list = element('ul');
      for (const { key, licenses } of result.datasets) {
        const item = element('li');
        const link = element('a', key);
        link.href = 'https://www.gbif.org/dataset/' + key;
        item.append(link, ' · ' + (licenses.join(', ') || 'Άδεια στη σελίδα του συνόλου'));
        list.append(item);
      }
      sources.append(element('summary', 'Σύνολα δεδομένων και άδειες'), list);
      node.append(sources);
    }
  }
}

export function createBiodiversityView({ floraOnly, load, explore }) {
  const node = element('div');
  node.className = 'biodiversity-summary';
  const context = element('p', `GBIF · Ακτίνα ${BIODIVERSITY_RADIUS} χλμ. · Όλες οι εποχές`);
  const list = element('ul');
  list.setAttribute('aria-live', 'polite');
  const kingdoms = (floraOnly ? KINGDOMS.slice(0, 1) : KINGDOMS)
    .map(([key, label]) => ({ key, label, item: element('li') }));
  list.append(...kingdoms.map(({ item }) => item));
  const loadButton = element('button', 'Φόρτωση σύνοψης GBIF');
  const exploreButton = element('button', 'Άνοιγμα Εξερεύνησης ειδών');
  for (const button of [loadButton, exploreButton]) {
    button.type = 'button';
    button.className = 'action';
  }
  loadButton.onclick = load;
  exploreButton.onclick = () => explore(floraOnly ? '6' : '1', exploreButton);
  node.append(context, list, loadButton, exploreButton,
    element('p', 'Η κάλυψη και η προσπάθεια καταγραφής διαφέρουν ανά τόπο, περίοδο και ομάδα. Οι εγγραφές δεν τεκμηριώνουν σημερινή παρουσία, αφθονία ή συνολικό οικολογικό πλούτο.'));
  return {
    node,
    update(states) {
      for (const kingdom of kingdoms) {
        const result = states[kingdom.key];
        if (kingdom.result === result) continue;
        kingdom.result = result;
        renderKingdom(kingdom.item, kingdom.label, result);
      }
      const values = Object.values(states);
      loadButton.disabled = values.some(result => result.state === 'loading')
        || (values.length > 0 && values.every(result => result.state === 'available' && !result.interrupted));
    },
  };
}
