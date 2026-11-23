// eventi della giornata con i nuovi controlli del BIONOMAD:
//   LUCE (manopola: intensità della luce interna), TEMP (manopola + display zaino/esterno),
//   ACQUA (una pressione = irrigazione interna; due = troppa), ARIA (una pressione = ventola).
//
// tipi di step:
//   notify    arriva una notifica sul telefono / dal BIONOMAD (si completa da sola)
//   bio       pannello del BIONOMAD con un obiettivo: goal = light | temp | water | air
//             light: qteMs = tempo per accenderla (quick time event)
//             temp:  out = °C fuori, holdMs = quanto restare nella fascia giusta
//             water: una pressione in tempo (quick time event); due allagano la terra
//             air:   una pressione in tempo (quick time event)
//   place     appoggiare il BIONOMAD sul tavolo (in ufficio si usa l'hub dell'ufficio)
//   take      riprendere il BIONOMAD dal tavolo
//   reach     raggiungere un punto      exit  uscire      talk  parlare con qualcuno
//   sleep     andare a dormire (tenere premuto vicino al divano)
//   busLeaves il bus parte senza di te
//   emergency corsa verso casa con tre cure a sorpresa
export const EVENTS = {
  // ---------------------------------------------------------------- BUS (mattina)
  bus_affollato: {
    slot: "bus",
    goal: "light",
    title: "BUS · AFFOLLATO",
    time: "08:15",
    location: "bus",
    description: "Il bus è pieno e le persone coprono il tuo BIONOMAD: accendi la luce in tempo.",
    steps: [
      { type: "notify", ms: 1600, text: "SALI SUL BUS", line: "Il bus è pieno: le persone coprono il BIONOMAD, la pianta è al buio!" },
      { type: "bio", goal: "light", qteMs: 9000, text: "LA PIANTA È AL BUIO", hint: "Le persone coprono lo zaino: gira la manopola LUCE fino alla fascia evidenziata, prima che finisca il tempo." }
    ]
  },
  bus_perso: {
    slot: "bus",
    goal: "temp",
    title: "FERMATA · BUS PERSO",
    time: "08:30",
    location: "busstop",
    description: "Perdi il bus e fuori fa freddo: porta la temperatura dello zaino al valore giusto.",
    steps: [
      { type: "busLeaves", text: "ASPETTA IL BUS" },
      { type: "bio", goal: "temp", out: 3, holdMs: 2000, text: "FA FREDDO: SCALDA LO ZAINO", hint: "Fuori ci sono 3 °C: gira TEMP verso il caldo finché il display resta tra 17 e 25 °C." }
    ]
  },
  // ---------------------------------------------------------------- UFFICIO (una sola visita)
  // si arriva, si appoggia il BIONOMAD sull'hub, c'è un imprevisto di giorno; poi la giornata
  // scorre fino alle 18:30 e prima di uscire c'è l'ultima cura (vedi OFFICE_TAILS)
  ufficio_riscaldamento: {
    slot: "office",
    goal: "temp",
    title: "UFFICIO · RISCALDAMENTO SPENTO",
    time: "09:30",
    location: "office",
    out: 21,
    description: "Si spegne il riscaldamento dell'ufficio: alza la temperatura del BIONOMAD.",
    steps: [
      { type: "place", target: "hub", text: "APPOGGIA IL BIONOMAD SULL'HUB" },
      { type: "notify", ms: 2600, text: "AL LAVORO", line: "10:40 · Il riscaldamento dell'ufficio si è spento: il BIONOMAD ha freddo", out: 12 },
      { type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" },
      { type: "bio", goal: "temp", out: 12, holdMs: 2000, text: "IL BIONOMAD HA FREDDO", hint: "Riscaldamento spento: gira TEMP verso il caldo e tieni il display tra 17 e 25 °C." }
    ]
  },
  ufficio_capo: {
    slot: "office",
    goal: "air",
    title: "UFFICIO · RIUNIONE COL CAPO",
    time: "09:30",
    location: "office",
    out: 21,
    description: "Devi parlare con il capo: pulisci il BIONOMAD perché sia smagliante.",
    steps: [
      { type: "place", target: "hub", text: "APPOGGIA IL BIONOMAD SULL'HUB" },
      { type: "notify", ms: 2600, text: "AL LAVORO", line: "11:50 · Il capo vuole vederti: il BIONOMAD deve essere smagliante" },
      { type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" },
      { type: "bio", goal: "air", text: "PULISCI IL BIONOMAD", hint: "C'è polvere sulle foglie: tieni premuto ARIA: la ventola la soffia via." },
      { type: "talk", target: "boss", text: "PARLA CON IL CAPO", line: "Ottimo lavoro: sembra appena uscito dalla serra!" }
    ]
  },
  // ---------------------------------------------------------------- CASA (sera, ultima tappa)
  // si entra dalla porta; a volte segue la notte nella stessa scena (vedi NIGHT_STEPS)
  casa_riscaldamento: {
    slot: "home",
    goal: "temp",
    evening: true,
    title: "CASA · RISCALDAMENTO ACCESO",
    time: "19:30",
    location: "home",
    out: 28,
    description: "Entri in casa e il riscaldamento è acceso: abbassa la temperatura del BIONOMAD.",
    steps: [
      { type: "notify", ms: 1800, text: "SEI A CASA", line: "19:30 · In casa ci sono 28 °C: il riscaldamento è al massimo", out: 28 },
      { type: "bio", goal: "temp", out: 28, holdMs: 2000, text: "FA CALDO: RAFFREDDA LO ZAINO", hint: "In casa ci sono 28 °C: gira TEMP verso il freddo e tieni il display tra 17 e 25 °C." }
    ]
  },
  // ---------------------------------------------------------------- EMERGENZA (molto rara)
  emergenza: {
    emergency: true,
    title: "EMERGENZA · BIONOMAD COMPROMESSO",
    time: "ORA",
    location: "street",
    endsAt: "home",
    description: "Il BIONOMAD è stato compromesso: torna subito a casa tenendolo in vita.",
    steps: [{ type: "emergency", cures: 3, actionEveryMs: 5200, text: "TORNA A CASA" }]
  }
};

// una giornata: bus del mattino → ufficio (dal mattino alle 18:30) → casa (sera, a volte anche la notte)
export const DAY_PLAN = ["bus", "office", "home"];
// probabilità che la notte il BIONOMAD ti svegli, per difficoltà (facile, media, difficile)
export const NIGHT_CHANCE = [0.25, 0.45, 0.7];
// notifiche durante i tragitti: quante in tutta la giornata, per difficoltà
export const TRAVEL_TASK_COUNT = [1, 1, 2];

// ultima cura in ufficio, alle 18:30, prima di uscire: si sceglie quella meno fatta nella giornata
export const OFFICE_TAILS = {
  light: { lines: ["18:30 · Fine giornata: fuori è già buio"], text: "ACCENDI LA LUCE PRIMA DI USCIRE", hint: "Fuori è buio: gira la manopola LUCE fino alla fascia evidenziata." }
};
// v = variante di testo, estratta a inizio partita
export function officeTail(goal, v = 0) {
  const t = OFFICE_TAILS[goal];
  return [
    { type: "notify", ms: 2200, text: "LA GIORNATA SCORRE", line: t.lines[v % t.lines.length], dusk: 0.22 },
    { type: "reach", target: "hub", text: "TORNA DAL BIONOMAD" },
    { type: "bio", goal, text: t.text, hint: t.hint, ...(t.out != null ? { out: t.out, holdMs: t.holdMs } : {}) },
    { type: "take", target: "hub", text: "RIPRENDI IL BIONOMAD" },
    { type: "exit", target: "door", text: "ESCI DALL'UFFICIO" }
  ];
}

// la notte, nella stessa scena di casa: a letto, poi il BIONOMAD ti sveglia
export const NIGHT_LINES = {
  water: { lines: ["03:12 · Il BIONOMAD ti sveglia: la terra è secca"], text: "IRRIGA IL BIONOMAD", hint: "La terra è secca: premi ACQUA una sola volta, in tempo." },
  air: { lines: ["03:12 · Il BIONOMAD ti sveglia: l'aria nel vetro è viziata"], text: "ARIEGGIA IL BIONOMAD", hint: "L'aria nel vetro è viziata: tieni premuto ARIA finché il vetro non è pulito." }
};
export function nightSteps(goal, v = 0) {
  const t = NIGHT_LINES[goal];
  return [
    { type: "sleep", target: "sofa", duration: 1500, text: "VAI A DORMIRE" },
    { type: "notify", ms: 2000, text: "DORMI…", line: t.lines[v % t.lines.length], wake: true },
    { type: "bio", goal, text: t.text, hint: t.hint }
  ];
}

// notifiche durante i tragitti
export const TRAVEL_TASKS = {
  water: { type: "bio", goal: "water", text: "IRRIGA IL BIONOMAD", line: "Il BIONOMAD ha bisogno di essere irrigato", lines: ["Il BIONOMAD ha bisogno di essere irrigato"], hint: "La terra è secca: premi ACQUA una sola volta, in tempo. Due volte la allaghi." },
  air: { type: "bio", goal: "air", text: "ARIEGGIA IL BIONOMAD", line: "Il BIONOMAD ha bisogno di essere ventilato", lines: ["Il BIONOMAD ha bisogno di essere ventilato"], hint: "Smog e polvere nel vetro: tieni premuto ARIA finché il vetro non è pulito." }
};

// RANDOM: notifica "il BIONOMAD ha bisogno di acqua / aria" in un momento a caso della giornata.
// in ufficio bisogna prima raggiungere l'hub; v = variante del testo
export function randomSteps(goal, v = 0, atHub = false) {
  const t = TRAVEL_TASKS[goal];
  return [
    { type: "notify", ms: 1800, text: "NOTIFICA", line: t.lines[v % t.lines.length] },
    ...(atHub ? [{ type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" }] : []),
    { type: "bio", goal, text: t.text, hint: t.hint }
  ];
}

export const EMERGENCY_CHANCE = 0.03;
// cure a sorpresa durante la corsa verso casa (tre a caso)
export const EMERGENCY_ACTIONS = [
  { type: "bio", goal: "light", qteMs: 8000, text: "! ACCENDI LA LUCE", hint: "Subito: gira la manopola LUCE nella fascia giusta." },
  { type: "bio", goal: "temp", out: 4, holdMs: 2000, timeoutMs: 18000, text: "! SCALDA LO ZAINO", hint: "Gira TEMP verso il caldo: 17–25 °C." },
  { type: "bio", goal: "temp", out: 34, holdMs: 2000, timeoutMs: 18000, text: "! RAFFREDDA LO ZAINO", hint: "Gira TEMP verso il freddo: 17–25 °C." },
  { type: "bio", goal: "water", timeoutMs: 18000, text: "! IRRIGA", hint: "Premi ACQUA una volta." },
  { type: "bio", goal: "air", timeoutMs: 18000, text: "! ARIEGGIA", hint: "Tieni premuto ARIA." }
];

