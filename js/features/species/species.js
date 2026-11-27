import { discoverSpecies, loadSpeciesOccurrences, OCCURRENCE_LIMIT } from '../../services/gbif.js';
import { occurrenceGrid } from './occurrence-grid.js';

const format = value => Number(value).toLocaleString('el-GR');
const alphabetical = new Intl.Collator('el', { sensitivity: 'base', numeric: true });
const displayName = species => species.name || `GBIF ${species.key}`;

export function createSpeciesPanel(layers, location) {
  return function renderPanel(content, options) {
    content.innerHTML = `
      <p class="muted">Διάλεξε ομάδα και εμφάνισε είδη που έχουν καταγραφεί στη γεωγραφική περιοχή που επιλέγεις.</p>
      <label class="field">Ομάδα ειδών
      <select id="group">
        <option value="1" selected>🐾 Ζώα</option>
        <option value="6">🌱 Φυτά</option>
        <option value="5">🍄 Μύκητες</option>
      </select></label>
      <label class="field">Γεωγραφική περιοχή
      <select id="radius">
        <option value="0">Ολόκληρη η Ελλάδα</option>
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
      <label class="field">Φίλτρο στα εμφανιζόμενα είδη<input type="search" id="speciesSearch" disabled></label>
      <div id="speciesStatus" class="muted" role="status"></div>
      <div id="speciesMapStatus" class="muted" role="status"></div>
      <div id="speciesList"></div>
      <p class="muted">Οι καταμετρήσεις GBIF αφορούν γεωαναφερμένες εγγραφές που αντιστοιχούν στα φίλτρα. Δεν δείχνουν αφθονία ή βέβαιη σημερινή παρουσία. Στον χάρτη εμφανίζονται μόνο κέντρα κελιών 0,1° και παραλείπονται εγγραφές με δηλωμένη απόκρυψη ή γενίκευση.</p>
    `;
    const list = content.querySelector('#speciesList');
    const status = content.querySelector('#speciesStatus');
    const mapStatus = content.querySelector('#speciesMapStatus');
    const filter = content.querySelector('#speciesSearch');
    const group = content.querySelector('#group');
    const radius = content.querySelector('#radius');
    const month = content.querySelector('#month');
    if (options) {
      radius.value = String(options.radius);
      group.value = options.taxonKey;
    }
    let species = [];
    let activeFilters;
    let currentRequest;

    function stopRequest() {
      currentRequest?.abort();
      currentRequest = undefined;
    }

    function clearResults(message) {
      stopRequest();
      activeFilters = undefined;
      species = [];
      list.replaceChildren();
      filter.value = '';
      filter.disabled = true;
      status.textContent = message;
      mapStatus.textContent = '';
      layers.clearObservations();
    }

    function renderResults() {
      const query = filter.value.trim().toLocaleLowerCase('el');
      const items = species.filter(item => displayName(item).toLocaleLowerCase('el').includes(query));
      list.replaceChildren();
      if (!items.length) {
        const message = document.createElement('p');
        message.className = 'muted';
        message.textContent = 'Δεν βρέθηκαν είδη για τα φίλτρα.';
        list.append(message);
        return;
      }

      for (const item of items) {
        const button = document.createElement('button');
        const name = document.createElement('strong');
        const count = document.createElement('small');
        button.type = 'button';
        button.className = 'entry';
        name.textContent = displayName(item);
        count.textContent = `${format(item.count)} εγγραφές GBIF με τα φίλτρα`;
        button.append(name, count);
        button.onclick = () => showSpecies(item);
        list.append(button);
      }
    }

    async function loadSpecies() {
      const distance = Number(radius.value);
      const point = distance === 0 ? undefined : location.searchPoint();
      clearResults('Αναζήτηση ειδών στο GBIF…');
      const request = new AbortController();
      currentRequest = request;
      const filters = { point, radius: distance, taxonKey: group.value, month: month.value };
      try {
        const data = await discoverSpecies(filters, request.signal, (checked, total) => {
          if (request === currentRequest) status.textContent = `Επαλήθευση καταμετρήσεων GBIF: ${checked} / ${total} είδη…`;
        }, location.discoveryCounts(filters));
        if (request !== currentRequest) return;
        activeFilters = filters;
        species = data.species.sort((a, b) => b.count - a.count
          || alphabetical.compare(displayName(a), displayName(b))
          || alphabetical.compare(a.key, b.key));
        const summary = data.limited
          ? `Εμφανίζονται ${species.length} είδη από τη συγκεντρωτική κατάταξη του GBIF, ταξινομημένα με επαληθευμένες καταμετρήσεις ανά είδος. Ο κατάλογος έχει περιορισμένο εύρος.`
          : `${species.length} είδη με γεωαναφερμένες εγγραφές GBIF για τα επιλεγμένα φίλτρα.`;
        const missing = species.some(item => !item.name) ? ' Όπου δεν ήταν διαθέσιμο το όνομα, εμφανίζεται ο κωδικός GBIF.' : '';
        const failed = data.failed ? ` Για ${data.failed} είδη δεν ήταν δυνατή η επαλήθευση και εξαιρέθηκαν.` : '';
        status.textContent = summary + failed + missing;
        filter.disabled = species.length === 0;
        renderResults();
      } catch {
        if (request === currentRequest) status.textContent = 'Η αναζήτηση στο GBIF απέτυχε. Δοκίμασε ξανά αργότερα.';
      } finally {
        if (request === currentRequest) currentRequest = undefined;
      }
    }

    async function showSpecies(item) {
      if (!activeFilters) return;
      stopRequest();
      const request = new AbortController();
      currentRequest = request;
      const name = displayName(item);
      layers.clearObservations();
      mapStatus.textContent = `${name}: φόρτωση γεωαναφερμένων εγγραφών…`;
      try {
        const data = await loadSpeciesOccurrences(activeFilters, item.key, request.signal, (loaded, total) => {
          if (request !== currentRequest) return;
          mapStatus.textContent = `${name}: έλεγχος ${format(loaded)} από έως ${format(Math.min(total, OCCURRENCE_LIMIT))} εγγραφές για τον χάρτη…`;
        });
        if (request !== currentRequest) return;
        const cells = occurrenceGrid(data.records);
        const points = cells.map(({ position, count }) => {
          const popup = document.createElement('div');
          const label = document.createElement('strong');
          label.textContent = name;
          popup.append(label, document.createElement('br'), `${format(count)} εγγραφές στο κελί 0,1° (ενδεικτική θέση)`);
          return { position, popup };
        });
        layers.showObservations(points);
        const shown = cells.reduce((sum, cell) => sum + cell.count, 0);
        const checked = data.limited
          ? `Δείγμα χάρτη: ελέγχθηκαν ${format(data.records.length)} από ${format(data.total)} εγγραφές GBIF.`
          : `Ελέγχθηκαν ${format(data.records.length)} εγγραφές GBIF.`;
        const interrupted = data.interrupted ? ' Η φόρτωση διακόπηκε από σφάλμα GBIF. Επίλεξε ξανά το είδος για επανάληψη.' : '';
        mapStatus.textContent = `${name}: ${checked} ${format(shown)} εγγραφές σε ${cells.length} κελιά. Εξαιρέθηκαν μη κατάλληλες θέσεις.${interrupted}`;
      } catch {
        if (request === currentRequest) mapStatus.textContent = `${name}: η φόρτωση σημείων απέτυχε. Επίλεξε ξανά το είδος.`;
      } finally {
        if (request === currentRequest) currentRequest = undefined;
      }
    }

    function resetSearch() {
      if (currentRequest || status.textContent) clearResults('Άλλαξαν τα κριτήρια. Εκτέλεσε νέα αναζήτηση.');
    }

    const unsubscribe = location.onPointChange(() => {
      if (radius.value !== '0') resetSearch();
    });
    for (const select of [group, radius, month]) select.onchange = resetSearch;
    content.querySelector('#loadSpecies').onclick = loadSpecies;
    filter.oninput = renderResults;

    return () => {
      unsubscribe();
      stopRequest();
    };
  };
}
