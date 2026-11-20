// suoni sintetizzati con Web Audio: nessun file audio, tono sobrio e "istituzionale".
// effetti brevi per i gesti, le task e l'ossigeno, più un sottofondo d'ambiente per ogni luogo.
// M attiva / disattiva l'audio (la scelta resta salvata nel browser)

let ctx = null;
let audioPaused = false;
let master = null;
let fxBus = null;
let ambBus = null;
let echoBus = null;
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
    // eco breve da "sala": dà ai comunicati il suono di un annuncio pubblico
    echoBus = ctx.createGain();
    echoBus.gain.value = 0.7;
    const dl = ctx.createDelay(1);
    dl.delayTime.value = 0.19;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    echoBus.connect(master);
    echoBus.connect(dl);
    dl.connect(lp);
    lp.connect(fb);
    fb.connect(dl);
    lp.connect(master);
    ambBus = ctx.createGain();
    ambBus.gain.value = 0.35;
    ambBus.connect(master);
    // rumore bianco riutilizzabile (2 s)
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended" && !audioPaused) ctx.resume();
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

// pausa del team: l'audio si congela insieme al gioco e riparte da dove era
export function setAudioPaused(on) {
  audioPaused = on;
  if (!ctx) return;
  if (on) ctx.suspend();
  else ctx.resume();
}

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

// effetti: linguaggio sonoro "istituzionale" da strumento di monitoraggio — toni puri (sinusoidi),
// brevi e bassi di volume, intervalli di quinta, clic da terminale; niente arpeggi da videogioco
const click = (vol = 0.05, delay = 0) => noise(0.012, { vol, freq: 5200, q: 0.9, type: "highpass", delay });
const ping = (f, dur, vol, delay = 0, bus) => tone(f, dur, { type: "sine", vol, delay, attack: 0.004, bus });
export const Sfx = {
  // tocco sull'interfaccia: clic secco + puntino di tono
  blip: () => {
    click(0.035);
    ping(1320, 0.04, 0.025);
  },
  // conferma: due toni a distanza di quinta, in salita
  confirm: () => {
    click(0.03);
    ping(660, 0.07, 0.045);
    ping(990, 0.11, 0.045, 0.07);
  },
  back: () => {
    click(0.03);
    ping(990, 0.06, 0.04);
    ping(660, 0.1, 0.04, 0.06);
  },
  // cambio schermata: fruscio di dati, breve e scuro
  whoosh: () => noise(0.22, { vol: 0.035, freq: 2600, sweep: -2000, q: 0.7, type: "bandpass" }),
  // passi: all'aperto un fruscio sul marciapiede, al chiuso un "toc" leggero sul pavimento
  step: (indoor = false) => {
    if (indoor) {
      noise(0.06, { vol: 0.12, freq: 380, q: 1.4, type: "lowpass" });
      tone(110 + Math.random() * 20, 0.05, { type: "sine", vol: 0.07 });
    } else noise(0.04, { vol: 0.03, freq: 700, q: 2 });
  },
  // ossigeno guadagnato: "ping" chiaro da monitor, con la sua armonica
  o2Gain: (soft = false) => {
    const v = soft ? 0.02 : 0.055;
    ping(1046, 0.18, v);
    ping(2093, 0.1, v * 0.35);
  },
  // ossigeno perso: tono basso che si abbassa appena
  o2Loss: (soft = false) => tone(247, 0.24, { type: "sine", vol: soft ? 0.02 : 0.055, slide: -50 }),
  // task registrata: clic + quinta pulita, come una conferma di sistema
  task: () => {
    click(0.04);
    ping(784, 0.14, 0.06, 0.02);
    ping(1175, 0.26, 0.05, 0.12);
  },
  // negligenza: doppio segnale basso, smorzato
  negligence: () => {
    ping(196, 0.16, 0.07);
    ping(196, 0.2, 0.07, 0.22);
  },
  // allarme ossigeno basso: tre bip regolari da apparecchiatura medica
  alarm: () => [0, 0.16, 0.32].forEach((d) => ping(988, 0.09, 0.045, d)),
  // allerta smog: sirena lenta da protezione civile, morbida
  siren: () => {
    tone(440, 0.7, { type: "sine", vol: 0.04, slide: 110 });
    tone(550, 0.7, { type: "sine", vol: 0.04, slide: -110, delay: 0.7 });
  },
  cough: () => {
    noise(0.12, { vol: 0.07, freq: 600, q: 0.7 });
    noise(0.1, { vol: 0.05, freq: 500, q: 0.7, delay: 0.2 });
  },
  // lo zaino si aggancia: scatto del raccordo e tono di conferma (niente sfiato)
  attach: () => {
    click(0.06);
    ping(523, 0.22, 0.045, 0.04);
  },
  // battitura del testo: tic da telescrivente
  tick: () => noise(0.008, { vol: 0.02, freq: 4200, q: 1, type: "highpass" }),
  // comunicato ufficiale: segnale d'annuncio pubblico a tre toni discendenti, con eco di sala
  announce: () => [784, 659, 523].forEach((f, i) => ping(f, 0.45, 0.06, i * 0.34, echoBus)),
  // fine giornata: accordo calmo che si apre, con eco
  win: () => [523, 659, 784, 1046].forEach((f, i) => ping(f, 1.1, 0.035, i * 0.05, echoBus)),
  // ossigeno esaurito: due toni bassi discendenti, lunghi
  gameOver: () => {
    ping(330, 0.7, 0.06, 0, echoBus);
    ping(220, 1.2, 0.06, 0.55, echoBus);
  }
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
