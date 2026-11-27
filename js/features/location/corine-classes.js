const domains = {
  1: 'Τεχνητές επιφάνειες',
  2: 'Γεωργικές περιοχές',
  3: 'Δάση και ημιφυσικές περιοχές',
  4: 'Υγρότοποι',
  5: 'Υδάτινες επιφάνειες',
};

const groups = {
  11: 'Αστικός ιστός',
  12: 'Βιομηχανικές, εμπορικές ζώνες και δίκτυα μεταφορών',
  13: 'Ορυχεία, χώροι απόθεσης και εργοτάξια',
  14: 'Τεχνητοί μη γεωργικοί χώροι πρασίνου',
  21: 'Αρόσιμη γη',
  22: 'Μόνιμες καλλιέργειες',
  23: 'Βοσκότοποι',
  24: 'Ετερογενείς γεωργικές περιοχές',
  31: 'Δάση',
  32: 'Θαμνώδης και ποώδης βλάστηση',
  33: 'Ανοιχτές εκτάσεις με λίγη ή καθόλου βλάστηση',
  41: 'Εσωτερικοί υγρότοποι',
  42: 'Παράκτιοι υγρότοποι',
  51: 'Εσωτερικά ύδατα',
  52: 'Θαλάσσια ύδατα',
};

const names = {
  111: ['Συνεχής αστικός ιστός', 'Continuous urban fabric'],
  112: ['Ασυνεχής αστικός ιστός', 'Discontinuous urban fabric'],
  121: ['Βιομηχανικές ή εμπορικές μονάδες', 'Industrial or commercial units'],
  122: ['Οδικά και σιδηροδρομικά δίκτυα και συναφείς εκτάσεις', 'Road and rail networks and associated land'],
  123: ['Λιμενικές ζώνες', 'Port areas'],
  124: ['Αεροδρόμια', 'Airports'],
  131: ['Χώροι εξόρυξης ορυκτών', 'Mineral extraction sites'],
  132: ['Χώροι απόθεσης αποβλήτων', 'Dump sites'],
  133: ['Εργοτάξια', 'Construction sites'],
  141: ['Αστικοί χώροι πρασίνου', 'Green urban areas'],
  142: ['Εγκαταστάσεις αθλητισμού και αναψυχής', 'Sport and leisure facilities'],
  211: ['Μη αρδευόμενη αρόσιμη γη', 'Non-irrigated arable land'],
  212: ['Μόνιμα αρδευόμενη γη', 'Permanently irrigated land'],
  213: ['Ορυζώνες', 'Rice fields'],
  221: ['Αμπελώνες', 'Vineyards'],
  222: ['Οπωρώνες και φυτείες σαρκωδών καρπών', 'Fruit trees and berry plantations'],
  223: ['Ελαιώνες', 'Olive groves'],
  231: ['Βοσκότοποι', 'Pastures'],
  241: ['Ετήσιες καλλιέργειες σε συνδυασμό με μόνιμες καλλιέργειες', 'Annual crops associated with permanent crops'],
  242: ['Σύνθετα συστήματα καλλιέργειας', 'Complex cultivation patterns'],
  243: ['Κυρίως γεωργικές εκτάσεις με σημαντικές περιοχές φυσικής βλάστησης', 'Land principally occupied by agriculture, with significant areas of natural vegetation'],
  244: ['Αγροδασικές εκτάσεις', 'Agro-forestry areas'],
  311: ['Δάση πλατύφυλλων', 'Broad-leaved forest'],
  312: ['Δάση κωνοφόρων', 'Coniferous forest'],
  313: ['Μικτά δάση', 'Mixed forest'],
  321: ['Φυσικοί λειμώνες', 'Natural grasslands'],
  322: ['Χερσότοποι και θαμνώνες ερεικών', 'Moors and heathland'],
  323: ['Σκληρόφυλλη βλάστηση', 'Sclerophyllous vegetation'],
  324: ['Μεταβατικές δασώδεις και θαμνώδεις εκτάσεις', 'Transitional woodland-shrub'],
  331: ['Παραλίες, αμμόλοφοι και αμμώδεις εκτάσεις', 'Beaches, dunes, sands'],
  332: ['Γυμνοί βράχοι', 'Bare rocks'],
  333: ['Εκτάσεις με αραιή βλάστηση', 'Sparsely vegetated areas'],
  334: ['Καμένες εκτάσεις', 'Burnt areas'],
  335: ['Παγετώνες και μόνιμα χιόνια', 'Glaciers and perpetual snow'],
  411: ['Εσωτερικά έλη', 'Inland marshes'],
  412: ['Τυρφώνες', 'Peat bogs'],
  421: ['Αλατούχα έλη', 'Salt marshes'],
  422: ['Αλυκές', 'Salines'],
  423: ['Παλιρροϊκές ζώνες', 'Intertidal flats'],
  511: ['Υδατορεύματα', 'Water courses'],
  512: ['Υδάτινα σώματα', 'Water bodies'],
  521: ['Παράκτιες λιμνοθάλασσες', 'Coastal lagoons'],
  522: ['Εκβολές ποταμών', 'Estuaries'],
  523: ['Θάλασσες και ωκεανοί', 'Sea and ocean'],
};

export function corineClass(raw) {
  const code = String(raw ?? '').trim();
  if (!/^\d{3}$/.test(code) || !Object.hasOwn(names, code)) return null;
  const [label, english] = names[code];
  return { code, label, english, domain: domains[code[0]], group: groups[code.slice(0, 2)] };
}
