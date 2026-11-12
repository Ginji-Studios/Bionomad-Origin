// suoni sintetizzati con Web Audio: nessun file audio, tono sobrio e "istituzionale".
// effetti brevi per i gesti, le task e l'ossigeno, più un sottofondo d'ambiente per ogni luogo.
// M attiva / disattiva l'audio (la scelta resta salvata nel browser)

let ctx = null;
let master = null;
let fxBus = null;
let ambBus = null;
let noiseBuffer = null;
let ambient = null;
let ambientKind = null;
let muted = false;
try {
  muted = window.localStorage?.getItem("o2rigin_muted") === "1";
} catch (e) {
  muted = false;
}

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    fxBus = ctx.createGain();
    fxBus.gain.value = 0.7;
    fxBus.connect(master);
    ambBus = ctx.createGain();
    ambBus.gain.value = 0.35;
    ambBus.connect(master);
    // rumore bianco riutilizzabile (2 s)
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// il browser fa partire l'audio solo dopo un gesto dell'utente
export function unlockAudio() {
  const a = audio();
  if (a && ambientKind && !ambient) startAmbient(ambientKind);
}

export function toggleMute() {
  muted = !muted;
  try {
    window.localStorage?.setItem("o2rigin_muted", muted ? "1" : "0");
  } catch (e) {
    /* niente */
  }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
  return muted;
}
export const isMuted = () => muted;

function tone(freq, dur, { type = "square", vol = 0.15, slide = 0, delay = 0, attack = 0.006, bus = null } = {}) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(bus ?? fxBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.1, freq = 1200, q = 1, type = "bandpass", delay = 0, sweep = 0 } = {}) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.linearRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(fxBus);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// effetti
export const Sfx = {
  blip: () => tone(740, 0.05, { vol: 0.06 }),
  confirm: () => {
    tone(523, 0.07, { vol: 0.07 });
    tone(784, 0.12, { vol: 0.07, delay: 0.07 });
  },
  back: () => tone(392, 0.08, { vol: 0.06, slide: -80 }),
  whoosh: () => noise(0.32, { vol: 0.07, freq: 500, sweep: 1600, q: 0.8 }),
  step: () => noise(0.04, { vol: 0.035, freq: 700, q: 2 }),
  // ossigeno guadagnato: due note limpide che salgono
  o2Gain: (soft = false) => {
    const v = soft ? 0.025 : 0.07;
    tone(880, 0.09, { type: "triangle", vol: v });
    tone(1318, 0.16, { type: "triangle", vol: v, delay: 0.08 });
  },
  // ossigeno perso: nota che scende
  o2Loss: (soft = false) => tone(330, 0.22, { type: "sawtooth", vol: soft ? 0.018 : 0.05, slide: -140 }),
  // task completata: arpeggio
  task: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, { type: "triangle", vol: 0.08, delay: i * 0.09 })),
  // negligenza: doppio ronzio basso
  negligence: () => {
    tone(140, 0.16, { type: "square", vol: 0.06 });
    tone(120, 0.22, { type: "square", vol: 0.06, delay: 0.18 });
  },
  // allarme ossigeno basso
  alarm: () => {
    tone(880, 0.12, { vol: 0.05 });
    tone(660, 0.12, { vol: 0.05, delay: 0.14 });
  },
  // sirena del picco di smog
  siren: () => {
    tone(520, 0.6, { type: "triangle", vol: 0.04, slide: 260 });
    tone(780, 0.6, { type: "triangle", vol: 0.04, slide: -260, delay: 0.6 });
  },
  cough: () => {
    noise(0.12, { vol: 0.08, freq: 600, q: 0.7 });
    noise(0.1, { vol: 0.06, freq: 500, q: 0.7, delay: 0.2 });
  },
  // lo zaino si aggancia: soffio d'aria e nota che sale
  attach: () => {
    noise(0.5, { vol: 0.08, freq: 300, sweep: 2400, q: 0.6 });
    tone(440, 0.4, { type: "triangle", vol: 0.05, slide: 440, delay: 0.1 });
  },
  // comunicato ufficiale: tre note da annuncio pubblico
  announce: () => [659, 523, 784].forEach((f, i) => tone(f, 0.22, { type: "sine", vol: 0.07, delay: i * 0.2 })),
  win: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { type: "triangle", vol: 0.08, delay: i * 0.12 })),
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, { type: "sawtooth", vol: 0.04, delay: i * 0.28, slide: -20 }))
};

// sottofondo d'ambiente: "city" (traffico lontano e vento filtrato), "night", "indoor" (ronzio del purificatore)
function startAmbient(kind) {
  const a = audio();
  if (!a) return;
  const nodes = [];
  const out = a.createGain();
  out.gain.value = 0;
  out.connect(ambBus);
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = kind === "indoor" ? 260 : kind === "night" ? 380 : 520;
  // il vento sale e scende piano
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = kind === "indoor" ? 40 : 180;
  lfo.connect(lfoGain);
  lfoGain.connect(f.frequency);
  const ng = a.createGain();
  ng.gain.value = kind === "indoor" ? 0.18 : 0.5;
  src.connect(f);
  f.connect(ng);
  ng.connect(out);
  // ronzio basso: le torri di filtraggio in città, il purificatore in casa
  const hum = a.createOscillator();
  hum.type = "sine";
  hum.frequency.value = kind === "indoor" ? 110 : 55;
  const hg = a.createGain();
  hg.gain.value = kind === "indoor" ? 0.05 : 0.035;
  hum.connect(hg);
  hg.connect(out);
  src.start();
  lfo.start();
  hum.start();
  nodes.push(src, lfo, hum);
  out.gain.linearRampToValueAtTime(1, a.currentTime + 1.2);
  ambient = { out, nodes };
}

export function setAmbient(kind) {
  if (kind === ambientKind && ambient) return;
  ambientKind = kind;
  const a = ctx;
  if (ambient && a) {
    const old = ambient;
    old.out.gain.setTargetAtTime(0, a.currentTime, 0.3);
    setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* già fermo */ } }), 1500);
    ambient = null;
  }
  if (kind && a && a.state === "running") startAmbient(kind);
}
