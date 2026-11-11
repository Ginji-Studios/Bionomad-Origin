// eventi della run (ne escono 3 a caso, in ordine di orario).
// tipi di step: pickup, use, useSelf, talk, confirm, hold, prune, sit, exit, reach,
// plant (sensore: light / temperature / vials / touch), busLeaves, emergency
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
    description: "Non annaffi la tua pianta da un po'. Compra una bottiglia d'acqua al food truck e annaffiala.",
    steps: [
      { type: "pickup", target: "counter", item: "bottle", text: "COMPRA L'ACQUA", line: "Ecco la tua acqua, 1 credito!" },
      { type: "useSelf", item: "bottle", effect: "water", text: "ANNAFFIA LA TUA PIANTA (SPAZIO)" }
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
        holdMs: 1500,
        baseTemperature: 16,
        text: "RISCALDA LA PIANTA",
        hint: "Scalda la pianta con le mani o la torcia termica: la temperatura deve salire di 3 °C.",
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
    description: "Alla pianta serve il fertilizzante: raggiungi l'Home Hub e inserisci le fiale nel terriccio dove indicato.",
    steps: [
      { type: "reach", target: "hub", text: "RAGGIUNGI L'HOME HUB" },
      {
        type: "plant",
        sensor: "vials",
        atLeast: 2,
        holdMs: 600,
        text: "INSERISCI LE FIALE",
        hint: "Inserisci le 2 fiale di fertilizzante nei punti segnati sul vaso.",
        key: "V"
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
        holdMs: 2000,
        baseTemperature: 8,
        text: "SCALDA LA PIANTA",
        hint: "Fa freddo: scalda la pianta con le mani o la torcia termica.",
        key: "H"
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
    drainMultiplier: 2,
    endsAt: "home",
    description: "LED rossi! Un parassita ha infiltrato il tuo BIONOMAD. Torna a casa il prima possibile: la pianta chiederà cure improvvise e l'ossigeno cala più in fretta.",
    steps: [{ type: "emergency", target: "home", actionEveryMs: 5500, text: "TORNA A CASA!" }]
  }
});

// azioni di cura casuali durante l'emergenza
export const EMERGENCY_ACTIONS = [
  { type: "plant", sensor: "light", above: 0.8, holdMs: 1200, text: "ILLUMINALA!", hint: "Dai luce alla pianta.", key: "I", timeoutMs: 6000 },
  { type: "plant", sensor: "temperature", riseBy: 2, holdMs: 800, text: "SCALDALA!", hint: "Scalda la pianta.", key: "H", timeoutMs: 6000 },
  { type: "plant", sensor: "touch", holdMs: 900, text: "TOCCA UNA FOGLIA!", hint: "Tocca una foglia della pianta.", key: "Q / E", timeoutMs: 6000 }
];

export const EVENTS_PER_RUN = 3;
