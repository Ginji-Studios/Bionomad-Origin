// controlli del BIONOMAD (Elegoo UNO R3) letti via Web Serial, 9600 baud.
// Dall'Arduino:
//   SINISTRA / DESTRA / STOP          foglie capacitive (movimento)
//   START                             pulsante di avvio (una riga a ogni pressione)
//   LU:1,TK:512,IR:0,AR:0             interruttore luce, manopola temperatura (0-1023),
//                                     pulsante irrigazione, pulsante arieggiamento
// Verso l'Arduino:
//   E1 / E0  emergenza (LED rosso lampeggiante + buzzer)   G  lampeggio verde (task riuscita)
//   N        notifica (bip breve)                           O:0-100  livello di ossigeno (LED RGB)

const BAUD = 9600;

export const VIAL_COLORS = {
  1: { name: "VERDE", color: 0x5c9a6b },
  2: { name: "BLU", color: 0x3b6fb0 },
  3: { name: "ROSSA", color: 0xb4553f }
};

const state = {
  connected: false,
  light: 0.6, // 0..1
  temperature: 22, // °C
  slots: [0, 0],
  irrigation: false,
  touchLeft: false,
  touchRight: false,
  serialDirection: 0,
  // nuovi controlli
  lightKnob: 0, // 0..1 manopola della luce
  knob: 0.5, // 0..1 manopola della temperatura
  irrigate: false,
  vent: false,
  // pressioni contate (anche se rapidissime, tra un fotogramma e l'altro)
  irrCount: 0,
  airCount: 0,
  startPresses: 0,
  pausePresses: 0
};

let port = null;
let writer = null;
let lastArduinoCommand = null;
// sensori che l'Arduino ha davvero mandato almeno una volta (L, T, P, W, TOUCH):
// solo quelli comandano il gioco, tutti gli altri restano simulati da tastiera / pulsanti
const reported = new Set();
const reportedOnce = {};

function parseLine(line) {
  const command = line.trim().toUpperCase();
  if (command === "SINISTRA" || command === "DESTRA" || command === "STOP") {
    reported.add("TOUCH");
    if (command !== lastArduinoCommand) {
      console.log("Da Arduino:", command);
      lastArduinoCommand = command;
    }
    if (command === "STOP") {
      state.serialDirection = 0;
      state.touchLeft = false;
      state.touchRight = false;
    } else if (command === "SINISTRA") {
      state.serialDirection = -1;
      state.touchLeft = true;
      state.touchRight = false;
    } else if (command === "DESTRA") {
      state.serialDirection = 1;
      state.touchLeft = false;
      state.touchRight = true;
    }
    return;
  }

  if (command === "START") {
    reported.add("START");
    state.startPresses += 1;
    return;
  }
  // tasto START tenuto premuto: pausa
  if (command === "PAUSA") {
    reported.add("START");
    state.pausePresses += 1;
    return;
  }
  // le righe con '#' sono messaggi dell'arduino (es. UID di una fiala NFC non registrata)
  if (line.trim().startsWith("#")) {
    console.info("[pianta]", line.trim());
    return;
  }

  for (const part of line.trim().split(",")) {
    const [key, raw] = part.split(":");
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    if (key === "L") {
      reported.add("L");
      state.light = Math.max(0, Math.min(1, value / 1023));
    }
    if (key === "T") {
      reported.add("T");
      state.temperature = value;
    }
    if (key === "P1") {
      reported.add("P");
      state.slots[0] = value;
    }
    if (key === "P2") {
      reported.add("P");
      state.slots[1] = value;
    }
    if (key === "W") {
      reported.add("W");
      state.irrigation = value === 1;
    }
    // manopola della luce (potenziometro 0..1023); "LU" 0/1 resta per il vecchio interruttore
    if (key === "LK") {
      reported.add("LK");
      // media mobile: il potenziometro trema un po', così il valore resta fermo
      const v = Math.max(0, Math.min(1, value / 1023));
      state.lightKnob = reportedOnce.LK ? state.lightKnob + (v - state.lightKnob) * 0.5 : v;
      reportedOnce.LK = true;
    }
    if (key === "LU") {
      reported.add("LK");
      state.lightKnob = value === 1 ? 0.75 : 0;
    }
    if (key === "TK") {
      reported.add("TK");
      const v = Math.max(0, Math.min(1, value / 1023));
      state.knob = reportedOnce.TK ? state.knob + (v - state.knob) * 0.5 : v;
      reportedOnce.TK = true;
    }
    if (key === "IR") {
      reported.add("IR");
      if (value === 1 && !state.irrigate) state.irrCount++;
      state.irrigate = value === 1;
    }
    if (key === "AR") {
      reported.add("AR");
      if (value === 1 && !state.vent) state.airCount++;
      state.vent = value === 1;
    }
    if (key === "TL") {
      reported.add("TOUCH");
      state.touchLeft = value === 1;
    }
    if (key === "TR") {
      reported.add("TOUCH");
      state.touchRight = value === 1;
    }
  }
}

async function readLoop() {
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(parseLine);
    }
  } catch (error) {
    console.warn("Pianta scollegata", error);
  }
  state.connected = false;
  reported.clear();
  state.serialDirection = 0;
  state.touchLeft = false;
  state.touchRight = false;
}

export const PlantSensors = {
  state,

  get supported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  },

  // va chiamato da un gesto dell'utente (tasto o click)
  async connect() {
    if (!this.supported) throw new Error("Web Serial non disponibile: usa Chrome o Edge su localhost");
    port = await navigator.serial.requestPort();
    try {
      await port.open({ baudRate: BAUD });
    } catch (error) {
      port = null;
      const detail = error?.message ? ` (${error.message})` : "";
      throw new Error(`Impossibile aprire la porta seriale. Chiudi il Monitor seriale o altri programmi che la stanno usando${detail}`);
    }
    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(port.writable).catch(() => {});
    writer = encoder.writable.getWriter();
    state.connected = true;
    readLoop();
  },

  send(command) {
    if (writer) writer.write(`${command}\n`).catch(() => {});
  },

  // true se quel sensore va simulato (pianta scollegata o sensore che l'Arduino non manda)
  // chiavi: "TOUCH" foglie, "LU" interruttore luce, "TK" manopola, "IR" irrigazione, "AR" aria, "START"
  simulated(key) {
    return !(state.connected && reported.has(key));
  },

  // pressioni del pulsante di avvio arrivate dall'ultima lettura
  takeStart() {
    const n = state.startPresses;
    state.startPresses = 0;
    return n > 0;
  },

  // START tenuto premuto (pausa) arrivato dall'ultima lettura
  takePause() {
    const n = state.pausePresses;
    state.pausePresses = 0;
    return n > 0;
  },

  get direction() {
    return state.serialDirection;
  },

  // simulazione da tastiera: C copri, I torcia, H scalda, F raffredda
  simulate(keys, delta, baseTemperature = 22) {
    const seconds = delta / 1000;
    if (this.simulated("L")) {
      const targetLight = keys.C.isDown ? 0.04 : keys.I.isDown ? 0.95 : this.ambientLight;
      state.light += (targetLight - state.light) * Math.min(1, seconds * 8);
    }
    if (this.simulated("T")) {
      const targetTemp = keys.H.isDown ? baseTemperature + 12 : keys.F.isDown ? baseTemperature - 10 : baseTemperature;
      const rate = keys.H.isDown || keys.F.isDown ? 2.2 : 1.2;
      state.temperature += Math.sign(targetTemp - state.temperature) * Math.min(Math.abs(targetTemp - state.temperature), rate * seconds);
    }
    if (this.simulated("TOUCH")) {
      state.touchLeft = keys.Q.isDown;
      state.touchRight = keys.E.isDown;
    }
  },

  // fiale simulate: 1/2/3 inseriscono una fiala colorata, 0 toglie l'ultima
  insertVial(color, required = null) {
    if (!this.simulated("P")) return;
    let free = state.slots.indexOf(0);
    if (free === -1 && required) {
      const remaining = [...required];
      const keep = state.slots.map((value) => {
        const k = remaining.indexOf(value);
        if (k === -1) return false;
        remaining.splice(k, 1);
        return true;
      });
      free = keep.indexOf(false);
    }
    if (free !== -1) state.slots[free] = color;
  },

  removeVial() {
    if (!this.simulated("P")) return;
    const last = state.slots[1] ? 1 : state.slots[0] ? 0 : -1;
    if (last !== -1) state.slots[last] = 0;
  },

  ambientLight: 0.6,

  resetSimulation(baseTemperature = 22, { ambientLight = 0.6 } = {}) {
    this.ambientLight = ambientLight;
    if (this.simulated("L")) state.light = ambientLight;
    if (this.simulated("T")) state.temperature = baseTemperature;
    if (this.simulated("P")) state.slots = [0, 0];
  }
};