// eventi della run (ne escono 3 a caso, in ordine di orario).
// tipi di step: pickup, use, useSelf, talk, confirm, hold, prune, sit, exit, reach,
// plant (sensore: light / temperature / vials / irrigation), busLeaves, emergency
//
// negligenze sulla pianta (costano ossigeno):
//  - timeoutMs: se non la scaldi / raffreddi in tempo te ne sei dimenticato
//  - maxOver: scaldarla troppo la scotta
//  - floodMs: leva dell'acqua lasciata aperta, la pianta si allaga
//  - fiale: il colore deve corrispondere, quella sbagliata va tolta
export const EVENTS = {
  ufficio_mattina: {
    title: "UFFICIO · MATTINA",
    time: "09:00",
    location: "office",
    description: "Devi annaffiare l'hub dell'ufficio. Raccogli l'annaffiatoio, raggiungi l'hub e annaffia.",
    steps: [
      { type: "pickup", target: "can", item: "can", text: "RACCOGLI L'ANNAFFIATOIO" },
      { type: "use", target: "hub", item: "can", effect: "water", text: "ANNAFFIA L'HUB" }
    ]
  },
  food_truck_acqua: {
    title: "FOOD TRUCK · ACQUA",
    time: "13:00",
    location: "foodtruck",
    description: "Non annaffi la tua pianta da un po'. Compra l'acqua al food truck, versala nel serbatoio e attiva l'irrigazione.",
    steps: [
      { type: "pickup", target: "counter", item: "bottle", text: "COMPRA L'ACQUA", line: "Ecco la tua acqua, 1 credito!" },
      {
        type: "plant",
        sensor: "irrigation",
        on: true,
        holdMs: 2500,
        text: "ATTIVA L'IRRIGAZIONE",
        hint: "Premi il pulsante dell'irrigazione sul vaso e lascia scorrere l'acqua.",
        key: "R"
      },
      {
        type: "plant",
        sensor: "irrigation",
        on: false,
        holdMs: 400,
        floodMs: 3500,
        text: "SPEGNI L'IRRIGAZIONE",
        hint: "Basta così: ripremi il pulsante per non allagare la pianta.",
        key: "R"
      }
    ]
  },
  ufficio_sera: {
    title: "UFFICIO · SERA",
    time: "18:30",
    location: "office",
    evening: true,
    description: "Fine giornata di lavoro: imposta l'hub in modalità notturna, aspetta il caricamento ed esci.",
    steps: [
      { type: "confirm", target: "hub", question: "Attivare la modalità notturna?", text: "RAGGIUNGI L'HUB" },
      { type: "hold", target: "hub", duration: 3500, text: "ATTENDI IL CARICAMENTO" },
      { type: "exit", target: "door", text: "ESCI DALL'UFFICIO" }
    ]
  },
  bus_sera: {
    title: "FERMATA BUS · SERA",
    time: "19:15",
    location: "busstop",
    evening: true,
    description: "Mentre aspetti il bus, un signore ti fa notare che alcune foglie sono rovinate: potale.",
    steps: [
      { type: "talk", target: "man", line: "Ehi! Quelle foglie marroni la fanno soffrire...", text: "PARLA CON IL SIGNORE" },
      { type: "prune", text: "POTA LE FOGLIE ROVINATE" }
    ]
  },
  food_truck_ricarica: {
    title: "FOOD TRUCK · RICARICA",
    time: "12:30",
    location: "foodtruck",
    description: "Ricarica l'Active Pack con il BIONOMAD alla colonnina del food truck, poi mangia con il pack.",
    steps: [
      { type: "hold", target: "charger", duration: 4000, text: "RICARICA L'ACTIVE PACK" },
      { type: "sit", target: "bench", duration: 2600, text: "SIEDITI E MANGIA" }
    ]
  }
};

// eventi sulla pianta vera
Object.assign(EVENTS, {
  bus_mattina: {
    title: "BUS · MATTINA",
    time: "08:10",
    location: "bus",
    plant: true,
    description: "Sulla via per il lavoro il bus è affollatissimo: copri il BIONOMAD per proteggerlo finché non si libera spazio.",
    steps: [
      {
        type: "plant",
        sensor: "light",
        below: 0.2,
        holdMs: 5000,
        malus: true,
        drainBoost: 2,
        text: "COPRI IL BIONOMAD",
        hint: "Copri la pianta con la mano (buio sul sensore di luce) finché la barra non si riempie. Coprirla costa ossigeno!",
        key: "C"
      }
    ]
  },
  ufficio_freddo: {
    title: "UFFICIO · CONDIZIONATORE",
    time: "10:30",
    location: "office",
    ac: true,
    noPack: true,
    plant: true,
    description: "Hai lasciato il BIONOMAD vicino al condizionatore e la pianta si è raffreddata: recuperalo e riscaldala.",
    steps: [
      { type: "pickup", target: "ac", item: "pack", text: "RECUPERA IL BIONOMAD", line: "Brr... è gelido!" },
      {
        type: "plant",
        sensor: "temperature",
        riseBy: 3,
        maxOver: 6,
        holdMs: 1500,
        timeoutMs: 16000,
        baseTemperature: 16,
        text: "RISCALDA LA PIANTA",
        hint: "Scalda con la torcia termica di 3 °C, senza esagerare: troppo calore la scotta.",
        key: "H"
      }
    ]
  },
  casa_fertilizzante: {
    title: "CASA · SERA",
    time: "20:00",
    location: "home",
    evening: true,
    plant: true,
    endsAt: "home",
    description: "Alla pianta serve il fertilizzante: raggiungi l'Home Hub e inserisci le fiale nel pozzetto apposito.",
    steps: [
      { type: "reach", target: "hub", text: "RAGGIUNGI L'HOME HUB" },
      {
        type: "plant",
        sensor: "vials",
        holdMs: 1200,
        text: "INSERISCI LE FIALE GIUSTE",
        hint: "Metti nel pozzetto le 2 fiale del colore indicato. Se sbagli, toglila e rimettila.",
        key: "1/2/3"
      }
    ]
  },
  bus_perso: {
    title: "BUS PERSO · A PIEDI",
    time: "19:30",
    location: "busstop",
    evening: true,
    plant: true,
    description: "Hai perso il bus: si torna a casa a piedi e fa freddo. Scalda la pianta prima di incamminarti.",
    steps: [
      { type: "busLeaves", text: "IL BUS È PARTITO..." },
      {
        type: "plant",
        sensor: "temperature",
        riseBy: 3,
        maxOver: 6,
        holdMs: 2000,
        timeoutMs: 16000,
        baseTemperature: 8,
        text: "SCALDA LA PIANTA",
        hint: "Fa freddo: scalda la pianta con le mani o la torcia termica.",
        key: "H"
      }
    ]
  },
  ondata_caldo: {
    title: "PARCO · ONDATA DI CALORE",
    time: "14:30",
    location: "foodtruck",
    plant: true,
    description: "Il sole picchia sul parco e il BIONOMAD si sta surriscaldando: raffreddalo prima che la pianta appassisca.",
    steps: [
      { type: "reach", target: "bench", text: "METTITI ALL'OMBRA" },
      {
        type: "plant",
        sensor: "temperature",
        dropBy: 3,
        holdMs: 1800,
        timeoutMs: 16000,
        baseTemperature: 34,
        text: "RAFFREDDA LA PIANTA",
        hint: "Fa troppo caldo: abbassa la temperatura di 3 °C prima che sia tardi.",
        key: "F"
      }
    ]
  },
  emergenza: {
    title: "EMERGENZA · PARASSITA",
    time: "17:45",
    location: "street",
    evening: true,
    plant: true,
    emergency: true,
    drainMultiplier: 2.3,
    endsAt: "home",
    description: "LED rossi! Un parassita ha infiltrato il tuo BIONOMAD. Oggi è l'unica task: torna a casa stabilizzando la pianta con 6 cure improvvise, mentre l'ossigeno cala più in fretta.",
    steps: [{ type: "emergency", target: "home", actionEveryMs: 4200, cures: 6, text: "STABILIZZA LA PIANTA E TORNA A CASA" }]
  }
});

// l'emergenza è rara: quando esce è l'unico evento della giornata
export const EMERGENCY_CHANCE = 0.08;

// azioni di cura casuali durante l'emergenza: tempi stretti e tenute più lunghe
export const EMERGENCY_ACTIONS = [
  { type: "plant", sensor: "light", above: 0.85, holdMs: 1800, text: "ILLUMINALA!", hint: "Accendi la torcia e puntala sulla pianta.", key: "I", timeoutMs: 5500 },
  { type: "plant", sensor: "temperature", riseBy: 3, holdMs: 1200, text: "SCALDALA!", hint: "Usa la torcia termica: +3 °C.", key: "H", timeoutMs: 5500 },
  { type: "plant", sensor: "temperature", dropBy: 3, holdMs: 1200, baseTemperature: 31, text: "RAFFREDDALA!", hint: "La febbre del parassita: abbassa la temperatura di 3 °C.", key: "F", timeoutMs: 5500 },
  { type: "plant", sensor: "irrigation", on: true, holdMs: 1600, text: "IRRIGALA!", hint: "Attiva l'irrigazione, poi richiudi la leva.", key: "R", timeoutMs: 5500 },
  { type: "plant", sensor: "vials", holdMs: 1200, text: "ANTIPARASSITARIO!", hint: "Inserisci nel pozzetto le 2 fiale del colore indicato.", key: "1/2/3", timeoutMs: 8000 }
];

// task extra in base alla difficoltà:
// MEDIO aggiunge una cura, DIFFICILE una cura + un rimedio a una negligenza
export const EXTRA_TASKS = {
  care: [
    { type: "plant", sensor: "light", above: 0.75, holdMs: 2500, text: "+ ILLUMINALA", hint: "Accendi la torcia e puntala sulla pianta.", key: "I" },
    { type: "plant", sensor: "temperature", riseBy: 2, maxOver: 5, holdMs: 1500, timeoutMs: 16000, text: "+ SCALDALA UN PO'", hint: "Due gradi in più con la torcia termica, non di più.", key: "H" },
    { type: "plant", sensor: "vials", holdMs: 1200, text: "+ NUTRILA", hint: "Inserisci nel pozzetto le 2 fiale del colore indicato.", key: "1/2/3" },
    { type: "plant", sensor: "irrigation", on: true, holdMs: 2000, text: "+ DALLE UN SORSO", hint: "Apri la leva dell'acqua... e poi ricordati di richiuderla!", key: "R" }
  ],
  fix: [
    { type: "plant", sensor: "irrigation", on: false, holdMs: 400, floodMs: 4500, setup: "leverOpen", text: "! CHIUDI LA LEVA APERTA", hint: "Hai lasciato l'irrigazione aperta: il vaso si sta allagando!", key: "R" },
    { type: "plant", sensor: "vials", holdMs: 1200, setup: "wrongVial", text: "! CAMBIA LA FIALA SBAGLIATA", hint: "Nel pozzetto c'è la fiala del colore sbagliato: toglila (0) e metti quella giusta.", key: "1/2/3" },
    { type: "plant", sensor: "temperature", dropBy: 4, holdMs: 1500, timeoutMs: 14000, baseTemperature: 31, text: "! L'HAI SURRISCALDATA", hint: "Hai lasciato acceso il riscaldamento: raffreddala di 4 °C.", key: "F" },
    { type: "plant", sensor: "light", above: 0.7, holdMs: 2000, timeoutMs: 14000, setup: "covered", text: "! L'HAI LASCIATA AL BUIO", hint: "Il vaso è rimasto coperto tutto il giorno: scoprilo e illuminalo.", key: "I" }
  ]
};

export const EVENTS_PER_RUN = 3;
