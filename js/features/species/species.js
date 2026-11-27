import { occurrenceUrl, searchOccurrences } from '../../services/gbif.js';

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

export function createSpeciesPanel(layers, location) {

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

  return function renderPanel(content) {
    content.innerHTML = `
      <p class="muted">Διάλεξε ομάδα και εμφάνισε είδη που έχουν καταγραφεί γύρω από το σημείο σου.</p>
      <label class="field">Ομάδα ειδών
      <select id="group">
        <option value="1" selected>🐾 Ζώα</option>
        <option value="6">🌱 Φυτά</option>
        <option value="5">🍄 Μύκητες</option>
      </select></label>
      <label class="field">Ακτίνα αναζήτησης
      <select id="radius">
        <option value="5">Ακτίνα 5 χλμ.</option>
        <option value="10" selected>Ακτίνα 10 χλμ.</option>
        <option value="20">Ακτίνα 20 χλμ.</option>
      </select></label>
      <label class="field">Εποχή
      <select id="month">
        <option value="">Όλες οι εποχές</option>
        <option value="3,4,5">Άνοιξη</option>
        <option value="6,7,8">Καλοκαίρι</option>
        <option value="9,10,11">Φθινόπωρο</option>
        <option value="12,1,2">Χειμώνας</option>
      </select></label>
      <button class="action" id="loadSpecies">Αναζήτηση ειδών</button>
      <label class="field">Φίλτρο ονόματος<input type="search" id="speciesSearch" disabled></label>
      <div id="speciesStatus" class="muted" role="status"></div>
      <div id="speciesList"></div>
      <p class="muted">Προβάλλεται δείγμα έως 300 εγγραφών. Δεν είναι πλήρης κατάλογος. Η πυκνότητα καταγραφών δεν δείχνει αφθονία ή βέβαιη σημερινή παρουσία. Οι ευαίσθητες τοποθεσίες δεν πρέπει να εμφανίζονται με ακρίβεια.</p>
    `;
    const list = content.querySelector('#speciesList');
    const status = content.querySelector('#speciesStatus');
    const filter = content.querySelector('#speciesSearch');
    const group = content.querySelector('#group');
    const radius = content.querySelector('#radius');
    const month = content.querySelector('#month');
    let records = [];
    let currentRequest;

    function clearResults(message) {
      currentRequest?.abort();
      currentRequest = undefined;
      records = [];
      list.replaceChildren();
      filter.value = '';
      filter.disabled = true;
      status.textContent = message;
    }

    function renderResults() {
      const query = filter.value.toLowerCase();
      const groups = new Map();
      for (const record of records) {
        const name = record.species || record.scientificName;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(record);
      }

      const items = [...groups].filter(([name]) => name.toLowerCase().includes(query)).slice(0, 80);
      list.innerHTML = items.length
        ? items.map(([name, occurrences]) =>
          `<button type="button" class="entry" data-name="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><small>${occurrences.length} εγγραφές στο δείγμα</small></button>`
        ).join('')
        : '<p class="muted">Δεν βρέθηκαν είδη στο τρέχον δείγμα.</p>';

      for (const entry of list.querySelectorAll('.entry')) {
        entry.onclick = () => highlightSpecies(entry.dataset.name, groups.get(entry.dataset.name), status);
      }
    }

    async function loadSpecies() {
      const point = location.searchPoint();
      clearResults('Αναζήτηση καταγραφών GBIF…');
      layers.clearObservations();
      const request = new AbortController();
      currentRequest = request;
      try {
        const data = await searchOccurrences(point, {
          radius: Number(radius.value),
          taxonKey: group.value,
          month: month.value,
        }, request.signal);
        if (request !== currentRequest) return;
        records = data.results.filter(record => record.species || record.scientificName);
        status.textContent = `${Number(data.count).toLocaleString('el-GR')} συνολικές εγγραφές στην περιοχή · εμφανίζονται έως 300 πρώτες.`;
        filter.disabled = records.length === 0;
        renderResults();
      } catch {
        if (request === currentRequest) {
          status.textContent = 'Δεν ήταν δυνατή η φόρτωση GBIF. Έλεγξε τη σύνδεση ή δοκίμασε αργότερα.';
        }
      } finally {
        if (request === currentRequest) currentRequest = undefined;
      }
    }

    function resetSearch() {
      if (!currentRequest && !status.textContent) return;
      clearResults('Άλλαξαν τα κριτήρια. Εκτέλεσε νέα αναζήτηση.');
      layers.clearObservations();
    }

    const unsubscribe = location.onPointChange(resetSearch);
    for (const select of [group, radius, month]) select.onchange = resetSearch;
    content.querySelector('#loadSpecies').onclick = loadSpecies;
    filter.oninput = renderResults;

    return () => {
      unsubscribe();
      currentRequest?.abort();
      currentRequest = undefined;
    };
  };
}
