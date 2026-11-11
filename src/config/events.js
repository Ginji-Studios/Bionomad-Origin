// Eventi della run: ogni run ne pesca 3 a caso.
// Ogni evento ha una location e una sequenza di task (step) da completare in ordine.
//
// Tipi di step:
//   pickup  – raggiungi `target` e premi SPAZIO per raccogliere `item`
//   use     – raggiungi `target` con `item` e premi SPAZIO (animazione `effect`)
//   useSelf – premi SPAZIO ovunque per usare `item` sulla tua pianta
//   talk    – raggiungi `target` e premi SPAZIO (mostra `line`)
//   confirm – raggiungi `target`, premi SPAZIO e conferma la domanda `question`
//   hold    – resta vicino a `target` finché la barra non si riempie (`duration` ms)
//   prune   – minigioco: taglia le foglie rovinate della pianta
//   sit     – raggiungi `target`, premi SPAZIO: piccola scena (`duration` ms)
//   exit    – raggiungi `target` e premi SPAZIO per uscire
//
// Le altre 5 idee (task sulla pianta fisica) si aggiungono qui con gli stessi tipi.

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

export const EVENTS_PER_RUN = 3;
