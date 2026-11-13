// sensori della pianta (Elegoo UNO R3) letti via Web Serial.
// riga dall'arduino: L:612,T:23.4,P1:1,P2:0,W:0,TL:0,TR:1
//   luce, °C (DHT11), fiala nel pozzetto 1 e 2 letta dal PN532 (0 vuoto, 1 verde, 2 blu, 3 rossa),
//   leva acqua, foglia sx/dx
// comandi verso l'arduino: E1 / E0 led emergenza, G lampeggio verde

const BAUD = 115200;

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
  touchRight: false
};

let port = null;
let writer = null;

function parseLine(line) {
  // le righe con '#' sono messaggi dell'arduino (es. UID di una fiala NFC non registrata)
  if (line.trim().startsWith("#")) {
    console.info("[pianta]", line.trim());
    return;
  }
  for (const part of line.trim().split(",")) {
    const [key, raw] = part.split(":");
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    if (key === "L") state.light = Math.max(0, Math.min(1, value / 1023));
    if (key === "T") state.temperature = value;
    if (key === "P1") state.slots[0] = value;
    if (key === "P2") state.slots[1] = value;
    if (key === "W") state.irrigation = value === 1;
    if (key === "TL") state.touchLeft = value === 1;
    if (key === "TR") state.touchRight = value === 1;
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
    await port.open({ baudRate: BAUD });
    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(port.writable).catch(() => {});
    writer = encoder.writable.getWriter();
    state.connected = true;
    readLoop();
  },

  send(command) {
    if (writer) writer.write(`${command}\n`).catch(() => {});
  },

  // simulazione da tastiera: C copri, I torcia, H scalda, F raffredda
  simulate(keys, delta, baseTemperature = 22) {
    if (state.connected) return;
    const seconds = delta / 1000;
    const targetLight = keys.C.isDown ? 0.04 : keys.I.isDown ? 0.95 : this.ambientLight;
    state.light += (targetLight - state.light) * Math.min(1, seconds * 8);
    const targetTemp = keys.H.isDown ? baseTemperature + 12 : keys.F.isDown ? baseTemperature - 10 : baseTemperature;
    const rate = keys.H.isDown || keys.F.isDown ? 2.2 : 1.2;
    state.temperature += Math.sign(targetTemp - state.temperature) * Math.min(Math.abs(targetTemp - state.temperature), rate * seconds);
    state.touchLeft = keys.Q.isDown;
    state.touchRight = keys.E.isDown;
  },

  // fiale simulate: 1/2/3 inseriscono una fiala colorata, 0 toglie l'ultima
  // se il pozzetto è pieno, la nuova fiala prende il posto di quella non richiesta (o di troppo):
  // così basta premere il colore giusto anche dopo un errore
  insertVial(color, required = null) {
    if (state.connected) return;
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
    if (state.connected) return;
    const last = state.slots[1] ? 1 : state.slots[0] ? 0 : -1;
    if (last !== -1) state.slots[last] = 0;
  },

  // luce "a riposo" della simulazione (bassa se il vaso è rimasto coperto)
  ambientLight: 0.6,

  resetSimulation(baseTemperature = 22, { ambientLight = 0.6 } = {}) {
    this.ambientLight = ambientLight;
    if (state.connected) return;
    state.light = ambientLight;
    state.temperature = baseTemperature;
    state.slots = [0, 0];
  }
};
