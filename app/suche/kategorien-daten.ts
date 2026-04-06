export const ANGEBOT_KATEGORIEN = [
  {
    label: "Reitunterricht",
    themen: [
      "Springen", "Dressur", "Vielseitigkeit", "Fahren", "Westernreiten", 
      "Voltigieren", "Klassisch-barocke Reiterei", "Rennreiten", "Gangreiten",
      { name: "Working-Equitation-Trainer" },
      { name: "Centered-Riding-Instructor", subs: ["Level 1", "Level 2", "Level 3"] },
      "Akademische-Reitkunst-Instruktor", "Natural-Horsemanship-Instructor",
      "Parelli Instructor", "Monty Roberts Instructor", "Dual-Aktivierung-Trainer",
      "Equikinetic-Trainer", "Polo Instructor", "Islandpferdetrainer (IPZV-System)"
    ]
  },
  {
    label: "Beritt",
    themen: [
      "Jungpferdeausbildung", "Korrekturberitt", "Dressur", "Springen", 
      "Vielseitigkeit", "Western", "Gangpferde", "Showreiten", "Einfahren"
    ]
  },
  {
    label: "Hufbearbeitung",
    themen: [
      "Staatlich geprüfter Hufbeschlagschmied", "Barhufbearbeiter/in", 
      "Huftechniker/in", "Spezialist/in für orthopädischen Beschlag", "Huforthopäde/in"
    ]
  },
  {
    label: "Therapien & Training für Reiter",
    themen: [
      "Hippotherapeut", "Reitpädagoge", "Reittherapeut", 
      "Fachkraft für heilpädagogisches Reiten", "Mentaltrainer für Reiter",
      "Neuroathletiktrainer", "Yoga-Trainer für Reiter", "Sportphysiotherapeut"
    ]
  },
  {
    label: "Therapien für Pferde",
    themen: [
      "Pferdephysiotherapeut", "Pferdeosteotherapeut", "Pferdeheilpraktiker",
      "Chiropraktiker Pferd", "Akupunkteur Pferd", "Tierergotherapeut",
      "Craniosacral-Therapeut", "Blutegeltherapie", "Sattelanpassung"
    ]
  }
];

export const ZERTIFIKAT_KATEGORIEN = {
  "FN-Abzeichen": {
    "Dressur": ["RA5", "RA4", "RA3", "RA2", "RA1"],
    "Springen": ["RA5", "RA4", "RA3", "RA2", "RA1"],
    "Vielseitigkeit": ["RA5", "RA4", "RA3", "RA2", "RA1"],
    "Fahren": ["FA5", "FA4", "FA3", "FA2", "FA1"],
    "Westernreiten": ["WRA5", "WRA4", "WRA3", "WRA2", "WRA1"],
    "Longieren/Voltigieren": ["LA5", "LA5V", "LA4", "LA3", "LA2", "LA1V", "LA1"],
    "Klassisch-barocke Reiterei": ["BRA4", "BRA3", "BRA2", "BRAA1"],
    "Sonstiges": "Freitext"
  },
  "Trainerschein/DOSB-Lizenz": {
    "Reiten": ["Trainer C Basissport", "Trainer C Leistungssport", "Trainer B Basissport", "Trainer B Leistungssport", "Trainer A Basissport", "Trainer A Leistungssport"],
    "Fahren": ["Trainer C Basissport", "Trainer C Leistungssport", "Trainer B Basissport", "Trainer B Leistungssport", "Trainer A Basissport", "Trainer A Leistungssport"],
    "Westernreiten": ["Trainer C", "Trainer B", "Trainer A"],
    "Voltigieren": ["Trainer C", "Trainer B", "Trainer A"],
    "Klassisch-barocke Reiterei": ["Trainer C", "Trainer B", "Trainer A"],
    "Distanzreiten": ["Trainer C", "Trainer B", "Trainer A"],
    "Gangreiten": ["Trainer C", "Trainer B", "Trainer A"],
    "Sonstiges": "Freitext"
  },
  "Weitere DOSB-Qualifikationen": [
    "DOSB Vereinsmanager C",
    "DOSB Vereinsmanager B",
    "DOSB Übungsleiter B Prävention",
    "Sonstiges"
  ],
  "FN-Ergänzungsqualifikationen": [
    "Ausbilder im Gesundheitssport mit Pferd",
    "Ergänzungsstufe für Trainer A Leistungssport",
    "Ergänzungsqualifikation Kinderunterricht im Pferdesport",
    "Ergänzungsqualifikation Bodenarbeit",
    "Ergänzungsqualifikation Sitz- und Gleichgewichtsschulung",
    "Ergänzungsqualifikation Damensattel",
    "Ergänzungsqualifikation Geländereiten",
    "Ergänzungsqualifikation Inklusion",
    "Ergänzungsqualifikation Möglichkeiten der Zäumung",
    "Ergänzungsqualifikation Technikprogramme",
    "Ergänzungsqualifikation Technikprogramm Voltigieren",
    "Ergänzungsqualifikation Turnerische Grundlagen für Voltigierer",
    "Sonstiges"
  ],
  "Staatlich anerkannte Berufsabschlüsse": {
    "Abschlüsse": [
      "Pferdewirt Klassische Reitausbildung",
      "Pferdewirt Pferdehaltung und Service",
      "Pferdewirt Zucht und Haltung",
      "Pferdewirt Spezialreitweisen",
      "Pferdewirt Rennreiten"
    ],
    "Sonstiges": "Freitext"
  },
  "Hufbearbeitung": [
    "Staatlich geprüfter Hufbeschlagschmied",
    "Barhufbearbeiter/in",
    "Huftechniker/in",
    "Spezialist/in für orthopädischen Beschlag",
    "Huforthopäde/in",
    "Sonstiges"
  ],
  "Therapien für Pferde": [
    "Pferdephysiotherapeut",
    "Pferdeosteotherapeut",
    "Pferdeheilpraktiker",
    "Chiropraktiker Pferd",
    "Akupunkteur Pferd",
    "Tierphysiotherapeut (Humanphysio mit Zusatz)",
    "Tierergotherapeut",
    "Craniosacral-Therapeut Pferd",
    "Mykotherapeut Pferd",
    "Sonstiges"
  ],
  "Studiengänge": [
    "Pferdewirtschaft",
    "Pferdewissenschaften",
    "Agrarwissenschaften mit Pferdeschwerpunkt",
    "Sportwissenschaft mit Schwerpunkt Reitsport",
    "Sonstiges"
  ],
  "Reitweisen": {
    "Working-Equitation-Trainer": null,
    "Centered-Riding-Instructor": ["Level 1", "Level 2", "Level 3"],
    "Akademische-Reitkunst-Instruktor": null,
    "Natural-Horsemanship-Instructor": null,
    "Parelli Instructor": null,
    "Monty Roberts Instructor": null,
    "Dual-Aktivierung-Trainer": null,
    "Equikinetic-Trainer": null,
    "Polo Instructor": null,
    "Islandpferdetrainer (IPZV-System)": null,
    "Sonstiges": "Freitext"
  },
  "Therapien & Training für Reiter": [
    "Hippotherapeut",
    "Reitpädagoge",
    "Reittherapeut",
    "Fachkraft für heilpädagogisches Reiten",
    "Fachkraft für therapeutisches Reiten",
    "Tiergestützter Therapeut mit Pferd",
    "Mentaltrainer für Reiter",
    "Sportmentalcoach Reitsport",
    "Neuroathletiktrainer",
    "Yoga-Trainer für Reiter",
    "Pilates-Trainer für Reiter",
    "Sportphysiotherapeut",
    "Sonstiges"
  ]
};


// Deine QUALIFIKATIONEN bleiben als flache Map für die Suche/Validierung so wie sie sind!