export const ELEVATION_SOURCE = {
  label: 'Open-Meteo · Copernicus DEM GLO-90',
  url: 'https://open-meteo.com/en/docs/elevation-api',
  resolution: 'περίπου 90 μ.',
  methodology: 'Ανάκτηση τιμής από το ψηφιακό μοντέλο υψομέτρου για τις συντεταγμένες.',
  limitations: 'Η τιμή εξαρτάται από την ανάλυση του μοντέλου και μπορεί να διαφέρει από επιτόπια μέτρηση.',
};

export const GEOLOGY_SOURCE = {
  label: 'Macrostrat · Γεωλογικοί χάρτες',
  url: 'https://macrostrat.org/',
  methodology: 'Χωρικό ερώτημα στη σύνθεση γεωλογικών χαρτών. Χρησιμοποιείται η πρώτη χαρτογραφική εγγραφή που επιστρέφει η υπηρεσία.',
  limitations: 'Η κάλυψη και η κλίμακα διαφέρουν ανά χάρτη. Η γεωλογική ενότητα δεν τεκμηριώνει το μητρικό υλικό του εδάφους.',
};

export const DATA_TYPES = {
  measured: ['Μετρημένο', 'Τιμή από άμεση παρατήρηση ή μέτρηση.'],
  modelled: ['Μοντελοποιημένο', 'Τιμή από επιστημονικό μοντέλο.'],
  classified: ['Ταξινομημένο', 'Κατηγορία που αποδίδεται με βάση χάρτη ή σύστημα ταξινόμησης.'],
  estimated: ['Εκτιμώμενο', 'Προσέγγιση με δηλωμένη μέθοδο ή αβεβαιότητα.'],
};

export const TABS = [
  ['overview', 'Επισκόπηση', ['coordinates', 'accuracy', 'elevation', 'geologicUnit', 'soilClass', 'vegetationZone', 'climateClass', 'biodiversity']],
  ['terrain', 'Ανάγλυφο', ['elevation', 'slopeDegrees', 'slopePercent', 'aspect', 'morphology']],
  ['geology', 'Γεωλογία', ['geologicUnit', 'lithology', 'geologicAge']],
  ['soil', 'Έδαφος', ['soilClass', 'parentMaterial', 'ph', 'sand', 'silt', 'clay', 'organicCarbon']],
  ['vegetation', 'Βλάστηση', ['vegetationZone', 'landCover', 'plantCommunities', 'flora']],
  ['climate', 'Κλίμα', ['annualTemperature', 'annualPrecipitation', 'climateClass', 'monthlyTemperature', 'monthlyPrecipitation']],
];

export const FIELDS = {
  coordinates: { label: 'Γεωγραφικές συντεταγμένες', definition: 'Γεωγραφικό πλάτος και μήκος σε δεκαδικές μοίρες (WGS 84).', unit: '°' },
  accuracy: { label: 'Εκτιμώμενη ακρίβεια θέσης', definition: 'Εκτιμώμενη οριζόντια ακτίνα αβεβαιότητας που αναφέρει η συσκευή.', type: 'estimated', source: {
    label: 'Γεωεντοπισμός προγράμματος περιήγησης',
    url: 'https://www.w3.org/TR/geolocation/',
    methodology: 'Χρησιμοποιείται η ακρίβεια που επιστρέφει το Geolocation API.',
    limitations: 'Η ποιότητα της εκτίμησης εξαρτάται από τις πηγές θέσης της συσκευής.',
  } },
  elevation: { label: 'Υψόμετρο', definition: 'Ύψος της επιφάνειας ως προς τη μέση στάθμη της θάλασσας.', unit: 'μ.', type: 'modelled', source: ELEVATION_SOURCE },
  slopeDegrees: { label: 'Κλίση σε μοίρες', definition: 'Γωνία της επιφάνειας του εδάφους ως προς το οριζόντιο επίπεδο.', unit: '°' },
  slopePercent: { label: 'Κλίση σε ποσοστό', definition: 'Κατακόρυφη μεταβολή ως ποσοστό της οριζόντιας απόστασης.', unit: '%' },
  aspect: { label: 'Προσανατολισμός πλαγιάς', definition: 'Κατεύθυνση προς την οποία κατέρχεται η πλαγιά.' },
  morphology: { label: 'Μορφολογία αναγλύφου', definition: 'Μορφή της επιφάνειας, όπως κορυφογραμμή, κοιλάδα ή πεδιάδα.' },
  geologicUnit: { label: 'Γεωλογική ενότητα', definition: 'Ενότητα πετρωμάτων που αποτυπώνεται στον γεωλογικό χάρτη.', type: 'classified', source: GEOLOGY_SOURCE },
  lithology: { label: 'Λιθολογία', definition: 'Τύπος ή περιγραφή του χαρτογραφημένου πετρώματος.', type: 'classified', source: GEOLOGY_SOURCE },
  geologicAge: { label: 'Γεωλογική ηλικία', definition: 'Χρονοστρωματογραφικό διάστημα ή ηλικιακό εύρος της ενότητας.', type: 'classified', source: GEOLOGY_SOURCE },
  soilClass: { label: 'Ταξινόμηση εδάφους', definition: 'Ομάδα εδάφους σύμφωνα με τεκμηριωμένο σύστημα ταξινόμησης.' },
  parentMaterial: { label: 'Μητρικό υλικό εδάφους', definition: 'Υλικό από το οποίο σχηματίστηκε το έδαφος. Απαιτεί ανεξάρτητη εδαφολογική τεκμηρίωση.' },
  ph: { label: 'pH', definition: 'Δείκτης οξύτητας ή αλκαλικότητας του εδάφους.' },
  sand: { label: 'Άμμος', definition: 'Ποσοστό άμμου στη μηχανική σύσταση του εδάφους.', unit: '%' },
  silt: { label: 'Ιλύς', definition: 'Ποσοστό ιλύος στη μηχανική σύσταση του εδάφους.', unit: '%' },
  clay: { label: 'Άργιλος', definition: 'Ποσοστό αργίλου στη μηχανική σύσταση του εδάφους.', unit: '%' },
  organicCarbon: { label: 'Οργανικός άνθρακας', definition: 'Περιεκτικότητα του εδάφους σε άνθρακα οργανικής προέλευσης.' },
  vegetationZone: { label: 'Ζώνη βλάστησης', definition: 'Χωρική ζώνη που χαρακτηρίζεται από γενικό τύπο φυσικής βλάστησης.' },
  landCover: { label: 'Κάλυψη γης', definition: 'Τύπος φυσικής ή ανθρωπογενούς κάλυψης της επιφάνειας.' },
  plantCommunities: { label: 'Φυτοκοινότητες', definition: 'Σύνολα φυτικών ειδών που συνυπάρχουν σε συγκεκριμένες οικολογικές συνθήκες.' },
  flora: { label: 'Καταγεγραμμένη χλωρίδα', definition: 'Τεκμηριωμένες καταγραφές φυτικών ειδών στην περιοχή.' },
  biodiversity: { label: 'Καταγεγραμμένη βιοποικιλότητα γύρω από το σημείο', definition: 'Σύνοψη τεκμηριωμένων καταγραφών σε καθορισμένη περιοχή και περίοδο. Η ερμηνεία απαιτεί γνωστή κάλυψη και δειγματοληψία.' },
  annualTemperature: { label: 'Μέση ετήσια θερμοκρασία', definition: 'Μέση τιμή θερμοκρασίας σε ετήσια βάση για ορισμένη περίοδο αναφοράς.', unit: '°C' },
  annualPrecipitation: { label: 'Ετήσιος υετός', definition: 'Συνολικός υετός σε ετήσια βάση για ορισμένη περίοδο αναφοράς.', unit: 'mm' },
  climateClass: { label: 'Κλιματική ταξινόμηση', definition: 'Κλιματική κατηγορία που προκύπτει από καθορισμένο σύστημα ταξινόμησης.' },
  monthlyTemperature: { label: 'Μηνιαία θερμοκρασία', definition: 'Μέση τιμή θερμοκρασίας ανά μήνα για ορισμένη περίοδο αναφοράς.', unit: '°C' },
  monthlyPrecipitation: { label: 'Μηνιαίος υετός', definition: 'Υετός ανά μήνα για ορισμένη περίοδο αναφοράς.', unit: 'mm' },
};
