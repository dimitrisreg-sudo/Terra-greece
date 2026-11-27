import { occurrenceUrl, searchOccurrences } from '../../services/gbif.js';

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

export function createSpeciesPanel(layers, selectSearchPoint) {
  let records = [];
  let requestId = 0;

  function highlightSpecies(name, occurrences, status) {
    const points = [];
    for (const record of occurrences) {
      const { decimalLatitude, decimalLongitude, issues } = record;
      if (!Number.isFinite(decimalLatitude) || !Number.isFinite(decimalLongitude)) continue;
      if (issues?.includes('COORDINATE_INVALID')) continue;
      const date = escapeHtml(record.eventDate || record.year || 'χωρίς ημερομηνία');
      points.push({
        position: [decimalLatitude, decimalLongitude],
        popup: `<b>${escapeHtml(name)}</b><br>Καταγραφή: ${date}<br><a href="${occurrenceUrl(record.key)}" target="_blank" rel="noopener">Πηγή GBIF</a>`,
      });
    }

    layers.showObservations(points);
    status.textContent = `${name}: ${points.length} σημεία από το δείγμα των εγγραφών. Δεν αποτελούν πληθυσμό ή βέβαιη παρουσία σήμερα.`;
  }

  function renderResults() {
    const list = document.getElementById('speciesList');
    if (!list) return;
    const status = document.getElementById('speciesStatus');
    const query = document.getElementById('speciesSearch').value.toLowerCase();
    const groups = new Map();
    for (const record of records) {
      const name = record.species || record.scientificName;
      if (!name) continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(record);
    }

    const items = [...groups].filter(([name]) => name.toLowerCase().includes(query)).slice(0, 80);
    list.innerHTML = items.length
      ? items.map(([name, occurrences]) =>
        `<div class="entry" data-name="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><small>${occurrences.length} εγγραφές στο δείγμα · πάτησε για προβολή</small></div>`
      ).join('')
      : '<p class="muted">Δεν βρέθηκαν είδη στο τρέχον δείγμα.</p>';

    for (const entry of list.querySelectorAll('.entry')) {
      entry.onclick = () => highlightSpecies(entry.dataset.name, groups.get(entry.dataset.name), status);
    }
  }

  async function loadSpecies() {
    const point = selectSearchPoint();
    const status = document.getElementById('speciesStatus');
    status.textContent = 'Αναζήτηση καταγραφών GBIF…';
    document.getElementById('speciesList').innerHTML = '';
    layers.clearObservations();

    const request = ++requestId;
    try {
      const data = await searchOccurrences(point, {
        radius: Number(document.getElementById('radius').value),
        taxonKey: document.getElementById('group').value,
        month: document.getElementById('month').value,
      });
      if (request !== requestId) return;
      records = data.results.filter(record => record.species || record.scientificName);
      status.textContent = `${Number(data.count).toLocaleString('el-GR')} συνολικές εγγραφές στην περιοχή · εμφανίζονται έως 300 πρώτες.`;
      renderResults();
    } catch {
      if (request === requestId) {
        status.textContent = 'Δεν ήταν δυνατή η φόρτωση GBIF. Έλεγξε τη σύνδεση ή δοκίμασε αργότερα.';
      }
    }
  }

  return function renderPanel(content) {
    content.innerHTML = `
      <h2>Ζώα · Φυτά · Μανιτάρια</h2>
      <p class="muted">Διάλεξε ομάδα και εμφάνισε είδη που έχουν καταγραφεί γύρω από το σημείο σου.</p>
      <select id="group">
        <option value="212">🐦 Πουλιά</option>
        <option value="1">🐾 Ζώα</option>
        <option value="6">🌱 Φυτά</option>
        <option value="5">🍄 Μύκητες</option>
      </select>
      <select id="radius">
        <option value="5">Ακτίνα 5 χλμ.</option>
        <option value="10" selected>Ακτίνα 10 χλμ.</option>
        <option value="20">Ακτίνα 20 χλμ.</option>
      </select>
      <select id="month">
        <option value="">Όλες οι εποχές</option>
        <option value="3,4,5">Άνοιξη</option>
        <option value="6,7,8">Καλοκαίρι</option>
        <option value="9,10,11">Φθινόπωρο</option>
        <option value="12,1,2">Χειμώνας</option>
      </select>
      <button class="action" id="loadSpecies">Αναζήτηση ειδών</button>
      <input type="search" id="speciesSearch" placeholder="Φιλτράρισμα ονόματος…">
      <div id="speciesStatus" class="muted"></div>
      <div id="speciesList"></div>
      <p class="muted">Προβάλλεται δείγμα έως 300 εγγραφών. Δεν είναι πλήρης κατάλογος. Οι ευαίσθητες τοποθεσίες δεν πρέπει να εμφανίζονται με ακρίβεια.</p>
    `;
    content.querySelector('#loadSpecies').onclick = loadSpecies;
    content.querySelector('#speciesSearch').oninput = renderResults;
  };
}
