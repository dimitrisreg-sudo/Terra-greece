import { CLIMATE_PERIOD } from './climate-normals.js';
import { FLAT_THRESHOLD, SAMPLE_SPACING, WATER_GUARD } from './terrain.js';

export const ELEVATION_SOURCE = {
  label: 'Open-Meteo · Copernicus DEM GLO-90',
  url: 'https://open-meteo.com/en/docs/elevation-api',
  resolution: 'ονομαστικά 90 μ.',
  period: 'Έκδοση GLO-90 του 2021, σύμφωνα με την τεκμηρίωση Open-Meteo.',
  citation: 'Παράχθηκε με Copernicus WorldDEM™-90 © DLR e.V. 2010–2014 και © Airbus Defence and Space GmbH 2014–2018, που παρέχεται στο πλαίσιο του COPERNICUS από την Ευρωπαϊκή Ένωση και την ESA. Με την επιφύλαξη παντός δικαιώματος.',
  methodology: 'Ανάκτηση τιμής από το ψηφιακό μοντέλο υψομέτρου για τις συντεταγμένες.',
  limitations: 'Η τιμή εξαρτάται από την ανάλυση του μοντέλου και μπορεί να διαφέρει από επιτόπια μέτρηση.',
};

const TERRAIN_SOURCE = {
  ...ELEVATION_SOURCE,
  methodology: `Κλίση και έκθεση από το σταθμισμένο παράθυρο Horn 3×3. Τα δείγματα απέχουν περίπου ${SAMPLE_SPACING} μ. Η απόσταση υπολογίζεται σε μέτρα, με διόρθωση του μήκους ως προς το γεωγραφικό πλάτος. Η έκθεση είναι η διεύθυνση κατάβασης από τον γεωγραφικό βορρά, δεξιόστροφα. Κλίση κάτω από ${String(FLAT_THRESHOLD).replace('.', ',')}° θεωρείται πρακτικά επίπεδη για την έκθεση.`,
  limitations: `Εκτιμήσεις από ψηφιακό μοντέλο επιφάνειας. Τα σημεία του API δεν συμπίπτουν κατ’ ανάγκη με τα εγγενή κελιά του DEM. Βλάστηση, κτίρια και ακτογραμμές μπορούν να επηρεάσουν τις τιμές. Δεν εμφανίζονται παράγωγα με ελλιπή ή άκυρα δείγματα ή με δείγμα ≤ ${WATER_GUARD} μ. Ο έλεγχος είναι προληπτικός και δεν επιβεβαιώνει ότι όλα τα δείγματα είναι στη στεριά.`,
};

export const GEOLOGY_SOURCE = {
  label: 'Macrostrat · Γεωλογικοί χάρτες',
  url: 'https://macrostrat.org/',
  methodology: 'Χωρικό ερώτημα στη σύνθεση γεωλογικών χαρτών. Χρησιμοποιείται η πρώτη χαρτογραφική εγγραφή που επιστρέφει η υπηρεσία.',
  limitations: 'Η κάλυψη και η κλίμακα διαφέρουν ανά χάρτη. Η γεωλογική ενότητα δεν τεκμηριώνει το μητρικό υλικό του εδάφους.',
};

export const SOIL_SOURCE = {
  label: 'ISRIC · SoilGrids 2.0',
  url: 'https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html',
  resolution: '250 μ.',
  citation: 'Poggio et al. (2021), SoilGrids 2.0, DOI 10.5194/soil-7-217-2021 · CC BY 4.0.',
  methodology: 'Πρόβλεψη στο κελί και στο επιλεγμένο βάθος μέσω WMS GetFeatureInfo. Εμφανίζονται η μέση τιμή και, όπου διατίθενται, τα ποσοστημόρια 5% και 95%.',
  limitations: 'Οι τιμές είναι μοντελοποιημένες προβλέψεις, όχι εργαστηριακές μετρήσεις. Τα κλάσματα υφής εμφανίζονται χωρίς ανακανονικοποίηση. Η ανάλυση περιορίζει την ερμηνεία κοντά στις ακτές και σε ανομοιογενές έδαφος.',
};

export const WRB_SOURCE = {
  label: 'ISRIC · SoilGrids 2.0 / WRB 2006',
  url: 'https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_03.html',
  resolution: '250 μ.',
  citation: 'ISRIC SoilGrids, WRB Reference Soil Groups · CC BY 4.0.',
  methodology: 'Πιθανότερη ομάδα αναφοράς WRB 2006 ανά κελί, από συναθροισμένες πιθανότητες της έκδοσης 2017.',
  limitations: 'Ταξινόμηση χωρίς προσδιοριστικό υποομάδας ή συγκεκριμένο βάθος. Εμφανίζεται μόνο όπου υπάρχει κάλυψη επιφανειακού pH SoilGrids (0–5 cm). Το στρώμα MostProbable δεν δίνει την πιθανότητα της ομάδας στην ίδια απόκριση.',
};

const ERA5_SOURCE = {
  label: 'Open-Meteo · ECMWF/Copernicus ERA5',
  url: 'https://open-meteo.com/en/docs/historical-weather-api',
  resolution: '0,25° (περίπου 25 km), εγγενές πλέγμα ERA5 για τη συγκεκριμένη μεταβλητή.',
  period: CLIMATE_PERIOD,
  citation: 'Hersbach et al. (2020), The ERA5 global reanalysis · Copernicus Climate Change Service, ECMWF. Πρόσβαση μέσω Open-Meteo.',
  limitations: 'Κλιματικές κανονικές τιμές από επανάλυση. Το χονδρό πλέγμα μπορεί να εξομαλύνει το ανάγλυφο και την παράκτια μετάβαση. Χρησιμοποιείται το πλησιέστερο κελί, χωρίς υψομετρική διόρθωση. Οι ημέρες ορίζονται σε UTC.',
};
export const ERA5_TEMPERATURE_SOURCE = {
  ...ERA5_SOURCE,
  label: ERA5_SOURCE.label + ' · Θερμοκρασία στα 2 μ.',
  methodology: 'Ημερήσιες μέσες τιμές θερμοκρασίας αέρα στα 2 μ. Πρώτα λαμβάνεται ο μέσος των ημερών ανά μήνα ή έτος και κατόπιν ο μέσος των 30 ομόλογων περιόδων.',
};
export const ERA5_PRECIPITATION_SOURCE = {
  ...ERA5_SOURCE,
  label: ERA5_SOURCE.label + ' · Ολικός υετός',
  methodology: 'Ημερήσιος ολικός υετός ERA5 σε ισοδύναμο νερού. Πρώτα αθροίζεται ανά μήνα ή έτος και κατόπιν λαμβάνεται ο μέσος των 30 ομόλογων περιόδων.',
};
export const KOPPEN_SOURCE = {
  label: 'Beck et al. · Köppen–Geiger V3',
  url: 'https://doi.org/10.6084/m9.figshare.21789074',
  resolution: '30 δευτερόλεπτα τόξου (περίπου 1 km).',
  period: CLIMATE_PERIOD,
  citation: 'Beck et al. (2023), Scientific Data 10, 724 · CC BY 4.0. Περιφερειακή αποκοπή της ιστορικής στρώσης V3.',
  methodology: 'Ανάγνωση της δημοσιευμένης κλάσης από το κελί του επιλεγμένου σημείου. Η ταξινόμηση βασίζεται στις ιστορικές κλιματολογίες που τεκμηριώνουν οι συγγραφείς.',
  limitations: 'Ξεχωριστή πηγή από το κλιματόγραμμα ERA5. Ο χάρτης καλύπτει τη χερσαία επιφάνεια. Θαλάσσια κελιά και σημεία εκτός της αποκοπής εμφανίζονται ως μη διαθέσιμα.',
};

export const CORINE_SOURCE = {
  label: 'Copernicus CLMS / EEA · CORINE 2018 μέσω ΟΦΥΠΕΚΑ',
  url: 'https://geohub.necca.gov.gr/server/rest/services/LIFE-IP4NATURA/CORINE_LAND_USE_LAND_COVER_2018/FeatureServer/0',
  period: '2017–2018 (έτος αναφοράς 2018).',
  version: 'Η αντιστοιχία της υπηρεσίας ΟΦΥΠΕΚΑ με την πανευρωπαϊκή έκδοση V2020_20u1 δεν έχει επιβεβαιωθεί.',
  resolution: 'Διανυσματικά πολύγωνα. Ελάχιστη χαρτογραφική ενότητα 25 ha και πλάτος 100 μ. Το ξεχωριστό raster CORINE έχει κελιά 100 μ.',
  citation: 'Πληροφορία της Υπηρεσίας Παρακολούθησης Γης Copernicus της Ευρωπαϊκής Ένωσης, με συντονισμό EEA. Ελληνική υπηρεσία ΟΦΥΠΕΚΑ / LIFE-IP 4 NATURA. Ελεύθερη χρήση με απόδοση κατά την πολιτική CLMS. Ελληνική απόδοση ονομασιών από το Terra Greece. Πρόσβαση: 27.11.2026.',
  methodology: 'Φωτοερμηνεία και ταξινόμηση δορυφορικών εικόνων σε 44 κλάσεις. Η εφαρμογή ελέγχει ποια πολύγωνα τέμνουν το σημείο.',
  limitations: 'Ιστορική χαρτογράφηση κάλυψης γης του 2018. Τα γενικευμένα όρια είναι ιδιαίτερα αβέβαια κοντά σε ακτές και αλλαγές κάλυψης. Η κάλυψη της ελληνικής υπηρεσίας είναι περιορισμένη. Οι κλάσεις δεν τεκμηριώνουν ζώνη βλάστησης, κυρίαρχα είδη ή φυτοκοινότητες.',
};

export const DATA_TYPES = {
  measured: ['Μετρημένο', 'Τιμή από άμεση παρατήρηση ή μέτρηση.'],
  modelled: ['Μοντελοποιημένο', 'Τιμή από επιστημονικό μοντέλο.'],
  classified: ['Ταξινομημένο', 'Κατηγορία που αποδίδεται με βάση χάρτη ή σύστημα ταξινόμησης.'],
  estimated: ['Εκτιμώμενο', 'Προσέγγιση με δηλωμένη μέθοδο ή αβεβαιότητα.'],
  modelDerived: ['Εκτίμηση από μοντέλο', 'Παράγωγη τιμή που υπολογίζεται από δεδομένα μοντέλου.'],
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
  slopeDegrees: { label: 'Κλίση σε μοίρες', definition: 'Γωνία της επιφάνειας του εδάφους ως προς το οριζόντιο επίπεδο.', unit: '°', type: 'modelDerived', source: TERRAIN_SOURCE },
  slopePercent: { label: 'Κλίση σε ποσοστό', definition: 'Κατακόρυφη μεταβολή ως ποσοστό της οριζόντιας απόστασης.', unit: '%', type: 'modelDerived', source: TERRAIN_SOURCE },
  aspect: { label: 'Προσανατολισμός πλαγιάς', definition: 'Κατεύθυνση προς την οποία κατέρχεται η πλαγιά.', type: 'modelDerived', source: TERRAIN_SOURCE },
  morphology: { label: 'Μορφολογία αναγλύφου', definition: 'Μορφή της επιφάνειας, όπως κορυφογραμμή, κοιλάδα ή πεδιάδα.' },
  geologicUnit: { label: 'Γεωλογική ενότητα', definition: 'Ενότητα πετρωμάτων που αποτυπώνεται στον γεωλογικό χάρτη.', type: 'classified', source: GEOLOGY_SOURCE },
  lithology: { label: 'Λιθολογία', definition: 'Τύπος ή περιγραφή του χαρτογραφημένου πετρώματος.', type: 'classified', source: GEOLOGY_SOURCE },
  geologicAge: { label: 'Γεωλογική ηλικία', definition: 'Χρονοστρωματογραφικό διάστημα ή ηλικιακό εύρος της ενότητας.', type: 'classified', source: GEOLOGY_SOURCE },
  soilClass: { label: 'Πιθανότερη ομάδα εδάφους (WRB 2006)', definition: 'Η ομάδα αναφοράς με τη μεγαλύτερη εκτιμώμενη πιθανότητα στο κελί.', type: 'classified', source: WRB_SOURCE },
  parentMaterial: { label: 'Μητρικό υλικό εδάφους', definition: 'Υλικό από το οποίο σχηματίστηκε το έδαφος. Απαιτεί ανεξάρτητη εδαφολογική τεκμηρίωση.' },
  ph: { label: 'pH σε νερό', definition: 'Δείκτης οξύτητας ή αλκαλικότητας του εδάφους σε υδατικό μέσο.', type: 'modelled', source: SOIL_SOURCE },
  sand: { label: 'Άμμος', definition: 'Ποσοστό άμμου στη μηχανική σύσταση του εδάφους.', unit: '%', type: 'modelled', source: SOIL_SOURCE },
  silt: { label: 'Ιλύς', definition: 'Ποσοστό ιλύος στη μηχανική σύσταση του εδάφους.', unit: '%', type: 'modelled', source: SOIL_SOURCE },
  clay: { label: 'Άργιλος', definition: 'Ποσοστό αργίλου στη μηχανική σύσταση του εδάφους.', unit: '%', type: 'modelled', source: SOIL_SOURCE },
  organicCarbon: { label: 'Οργανικός άνθρακας', definition: 'Συγκέντρωση οργανικού άνθρακα ανά μάζα εδάφους. Διαφέρει από το απόθεμα ανά μονάδα επιφάνειας.', unit: 'g/kg', type: 'modelled', source: SOIL_SOURCE },
  vegetationZone: { label: 'Ζώνη βλάστησης', definition: 'Χωρική ζώνη που χαρακτηρίζεται από γενικό τύπο φυσικής βλάστησης.' },
  landCover: { label: 'Κάλυψη γης', definition: 'Χαρτογραφημένος τύπος κάλυψης ή χρήσης της επιφάνειας κατά CORINE.', type: 'classified', source: CORINE_SOURCE },
  plantCommunities: { label: 'Φυτοκοινότητες', definition: 'Σύνολα φυτικών ειδών που συνυπάρχουν σε συγκεκριμένες οικολογικές συνθήκες.' },
  flora: { label: 'Καταγεγραμμένη χλωρίδα', definition: 'Τεκμηριωμένες καταγραφές φυτικών ειδών στην περιοχή.' },
  biodiversity: { label: 'Καταγεγραμμένη βιοποικιλότητα γύρω από το σημείο', definition: 'Σύνοψη τεκμηριωμένων καταγραφών σε καθορισμένη περιοχή και περίοδο. Η ερμηνεία απαιτεί γνωστή κάλυψη και δειγματοληψία.' },
  annualTemperature: { label: 'Μέση ετήσια θερμοκρασία', definition: 'Μέση τιμή θερμοκρασίας σε ετήσια βάση για ορισμένη περίοδο αναφοράς.', unit: '°C', type: 'modelDerived', source: ERA5_TEMPERATURE_SOURCE },
  annualPrecipitation: { label: 'Ετήσιος υετός', definition: 'Συνολικός υετός σε ετήσια βάση για ορισμένη περίοδο αναφοράς.', unit: 'mm', type: 'modelDerived', source: ERA5_PRECIPITATION_SOURCE },
  climateClass: { label: 'Κλιματική ταξινόμηση Köppen–Geiger', definition: 'Κλιματική κατηγορία σύμφωνα με το σύστημα Köppen–Geiger.', type: 'classified', source: KOPPEN_SOURCE },
  monthlyTemperature: { label: 'Μηνιαία θερμοκρασία', definition: 'Μέση τιμή θερμοκρασίας ανά μήνα για ορισμένη περίοδο αναφοράς.', unit: '°C', type: 'modelDerived', source: ERA5_TEMPERATURE_SOURCE },
  monthlyPrecipitation: { label: 'Μηνιαίος υετός', definition: 'Υετός ανά μήνα για ορισμένη περίοδο αναφοράς.', unit: 'mm', type: 'modelDerived', source: ERA5_PRECIPITATION_SOURCE },
};
