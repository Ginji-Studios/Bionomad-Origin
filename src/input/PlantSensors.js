// sensori della pianta (Elegoo UNO R3) letti via Web Serial.
// riga dall'arduino: L:612,T:23.4,V:1,TL:0,TR:1  (luce, °C, fiale, foglia sx/dx)
// comandi verso l'arduino: E1 / E0 led emergenza, G lampeggio verde

const BAUD = 115200;

const state = {
  connected: false,
  light: 0.6, // 0..1
  temperature: 22, // °C
  vials: 0,
  touchLeft: false,
  touchRight: false
};

let port = null;
let writer = null;

function parseLine(line) {
  for (const part of line.trim().split(",")) {
    const [key, raw] = part.split(":");
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    if (key === "L") state.light = Math.max(0, Math.min(1, value / 1023));
    if (key === "T") state.temperature = value;
    if (key === "V") state.vials = value;
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

  // simulazione da tastiera (usata solo se la pianta non è collegata)
  simulate(keys, delta, baseTemperature = 22) {
    if (state.connected) return;
    const seconds = delta / 1000;
    const targetLight = keys.C.isDown ? 0.04 : keys.I.isDown ? 0.95 : 0.6;
    state.light += (targetLight - state.light) * Math.min(1, seconds * 8);
    const targetTemp = keys.H.isDown ? baseTemperature + 10 : baseTemperature;
    const rate = keys.H.isDown ? 2.2 : 1.2;
    state.temperature += Math.sign(targetTemp - state.temperature) * Math.min(Math.abs(targetTemp - state.temperature), rate * seconds);
    state.touchLeft = keys.Q.isDown;
    state.touchRight = keys.E.isDown;
  },

  resetSimulation(baseTemperature = 22) {
    if (state.connected) return;
    state.light = 0.6;
    state.temperature = baseTemperature;
    state.vials = 0;
  }
};
