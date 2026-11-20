// eventi della giornata con i nuovi controlli del BIONOMAD:
//   LUCE (tasto: luce interna dello zaino), TEMP (manopola + display zaino/esterno),
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
    title: "BUS · AFFOLLATO",
    time: "08:15",
    location: "bus",
    description: "Il bus è pieno e le persone coprono il tuo BIONOMAD: accendi la luce in tempo.",
    steps: [
      { type: "notify", ms: 1600, text: "SALI SUL BUS", line: "Il bus è pieno: le persone coprono il BIONOMAD, la pianta è al buio!" },
      { type: "bio", goal: "light", qteMs: 9000, text: "LA PIANTA È AL BUIO", hint: "Le persone coprono lo zaino: premi LUCE prima che finisca il tempo." }
    ]
  },
  bus_perso: {
    slot: "bus",
    title: "FERMATA · BUS PERSO",
    time: "08:30",
    location: "busstop",
    description: "Perdi il bus e fuori fa freddo: porta la temperatura dello zaino al valore giusto.",
    steps: [
      { type: "busLeaves", text: "ASPETTA IL BUS" },
      { type: "bio", goal: "temp", out: 3, holdMs: 2000, text: "FA FREDDO: SCALDA LO ZAINO", hint: "Fuori ci sono 3 °C: gira TEMP verso il caldo finché il display resta tra 17 e 25 °C." }
    ]
  },
  // ---------------------------------------------------------------- UFFICIO
  // in ufficio il BIONOMAD resta sul tavolo, collegato all'hub dell'ufficio: si va da lui
  ufficio_riscaldamento: {
    slot: "office",
    title: "UFFICIO · RISCALDAMENTO SPENTO",
    time: "10:30",
    location: "office",
    out: 21,
    description: "Si spegne il riscaldamento dell'ufficio: alza la temperatura del BIONOMAD.",
    steps: [
      { type: "place", target: "hub", text: "APPOGGIA IL BIONOMAD SUL TAVOLO" },
      { type: "notify", ms: 2600, text: "AL LAVORO", line: "NOTIFICA · Riscaldamento dell'ufficio spento: il BIONOMAD ha freddo", out: 12 },
      { type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" },
      { type: "bio", goal: "temp", out: 12, holdMs: 2000, text: "IL BIONOMAD HA FREDDO", hint: "Riscaldamento spento: gira TEMP verso il caldo e tieni il display tra 17 e 25 °C." },
      { type: "take", target: "hub", text: "RIPRENDI IL BIONOMAD" },
      { type: "exit", target: "door", text: "ESCI DALL'UFFICIO" }
    ]
  },
  ufficio_capo: {
    slot: "office",
    title: "UFFICIO · RIUNIONE COL CAPO",
    time: "12:00",
    location: "office",
    out: 21,
    description: "Devi parlare con il capo: pulisci il BIONOMAD perché sia smagliante.",
    steps: [
      { type: "place", target: "hub", text: "APPOGGIA IL BIONOMAD SUL TAVOLO" },
      { type: "notify", ms: 2600, text: "AL LAVORO", line: "NOTIFICA · Il capo ti aspetta: il BIONOMAD deve essere smagliante" },
      { type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" },
      { type: "bio", goal: "air", text: "PULISCI IL BIONOMAD", hint: "C'è polvere sulle foglie: premi ARIA una volta, in tempo, e la ventola la soffia via." },
      { type: "take", target: "hub", text: "RIPRENDI IL BIONOMAD" },
      { type: "talk", target: "boss", text: "PARLA CON IL CAPO", line: "Ottimo lavoro: sembra appena uscito dalla serra!" }
    ]
  },
  ufficio_sera: {
    slot: "evening",
    evening: true,
    title: "UFFICIO · FINE GIORNATA",
    time: "18:30",
    location: "office",
    out: 20,
    description: "Finisce la giornata di lavoro e fuori è buio: accendi la luce del BIONOMAD prima di uscire.",
    steps: [
      { type: "place", target: "hub", text: "APPOGGIA IL BIONOMAD SUL TAVOLO" },
      { type: "notify", ms: 2400, text: "ULTIME MAIL", line: "Fine della giornata: fuori è già buio" },
      { type: "reach", target: "hub", text: "RAGGIUNGI IL BIONOMAD" },
      { type: "bio", goal: "light", text: "ACCENDI LA LUCE PRIMA DI USCIRE", hint: "Fuori è buio: premi LUCE per accendere la luce interna dello zaino." },
      { type: "take", target: "hub", text: "RIPRENDI IL BIONOMAD" },
      { type: "exit", target: "door", text: "ESCI DALL'UFFICIO" }
    ]
  },
  // ---------------------------------------------------------------- CASA
  casa_riscaldamento: {
    slot: "home",
    evening: true,
    title: "CASA · RISCALDAMENTO ACCESO",
    time: "19:30",
    location: "home",
    out: 28,
    description: "Entri in casa e il riscaldamento è acceso: abbassa la temperatura del BIONOMAD.",
    steps: [
      { type: "notify", ms: 1800, text: "ENTRA IN CASA", line: "Il riscaldamento di casa è acceso: 28 °C", out: 28 },
      { type: "bio", goal: "temp", out: 28, holdMs: 2000, text: "FA CALDO: RAFFREDDA LO ZAINO", hint: "In casa ci sono 28 °C: gira TEMP verso il freddo e tieni il display tra 17 e 25 °C." }
    ]
  },
  casa_notte: {
    slot: "night",
    evening: true,
    title: "CASA · NOTTE",
    time: "23:40",
    location: "home",
    out: 22,
    description: "Dormi, ma il BIONOMAD ti sveglia: ha bisogno di acqua o di aria.",
    steps: [
      { type: "sleep", target: "sofa", duration: 1800, text: "VAI A DORMIRE" },
      { type: "notify", ms: 2200, text: "DORMI…", line: "03:12 · Il BIONOMAD ti sveglia: ha bisogno di cure", wake: true },
      { type: "bio", goal: "need", text: "IL BIONOMAD TI HA SVEGLIATO", hint: "Guarda la pianta: acqua o aria?" }
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

// una giornata: bus del mattino → ufficio (giorno) → ufficio (sera) → casa (sera) → a volte la notte
export const DAY_PLAN = ["bus", "office", "evening", "home", "night"];
// probabilità di avere anche la notte in casa, per difficoltà (facile, media, difficile)
export const NIGHT_CHANCE = [0.25, 0.5, 0.8];

// notifiche a caso durante i tragitti
export const TRAVEL_TASK_CHANCE = 0.5;
export const TRAVEL_TASKS = [
  { type: "bio", goal: "water", text: "IRRIGA IL BIONOMAD", line: "NOTIFICA · Il BIONOMAD ha bisogno di acqua", hint: "La terra è secca: premi ACQUA una sola volta, in tempo. Due volte la allaghi." },
  { type: "bio", goal: "air", text: "ARIEGGIA IL BIONOMAD", line: "NOTIFICA · Il BIONOMAD ha bisogno di aria", hint: "Smog e polvere nel vetro: premi ARIA una volta, in tempo." }
];

export const EMERGENCY_CHANCE = 0.03;
// cure a sorpresa durante la corsa verso casa (tre a caso)
export const EMERGENCY_ACTIONS = [
  { type: "bio", goal: "light", qteMs: 8000, text: "! ACCENDI LA LUCE", hint: "Subito: premi LUCE." },
  { type: "bio", goal: "temp", out: 4, holdMs: 2000, timeoutMs: 18000, text: "! SCALDA LO ZAINO", hint: "Gira TEMP verso il caldo: 17–25 °C." },
  { type: "bio", goal: "temp", out: 34, holdMs: 2000, timeoutMs: 18000, text: "! RAFFREDDA LO ZAINO", hint: "Gira TEMP verso il freddo: 17–25 °C." },
  { type: "bio", goal: "water", timeoutMs: 18000, text: "! IRRIGA", hint: "Premi ACQUA una volta." },
  { type: "bio", goal: "air", timeoutMs: 18000, text: "! ARIEGGIA", hint: "Premi ARIA una volta." }
];

