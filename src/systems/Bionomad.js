// stato del BIONOMAD (lo zaino-serra) per tutta la partita: temperatura dello zaino e
// dell'esterno, luce, acqua e aria. Lo leggono HUD, pannello e scene; i comandi arrivano dai
// controlli fisici (Arduino via seriale) oppure, se un comando non è collegato, dalla
// tastiera e dai pulsanti a schermo.
//
// Comandi del dispositivo:
//   START  pulsante di avvio / pausa
//   LK     manopola della luce (0..100): più la giri, più luce
//   TK     manopola della temperatura (0..100)
//   IR     pulsante di irrigazione: si preme UNA volta (quick time event) e versa una dose d'acqua
//   AR     pulsante di arieggiamento: va TENUTO PREMUTO, il ventilatore soffia finché lo tieni giù
import { PlantSensors } from "../input/PlantSensors.js";

// una pressione di ACQUA = una dose che scorre per POUR_MS; l'aria invece soffia finché ARIA è premuto
export const POUR_MS = 1800;
export const VENT_MS = 3400;

export const IDEAL = { tMin: 17, tMax: 25, wMin: 0.4, wMax: 0.75, aMin: 0.5, lMin: 0.55, lMax: 0.9 };

const s = {
  temp: 21, // °C nello zaino
  out: 16, // °C fuori
  knob: 0.5, // 0..1 (manopola della temperatura)
  lightLvl: 0, // 0..1 (manopola della luce)
  light: false, // luce accesa (manopola oltre il minimo)
  water: 0.6, // 0..1 umidità della terra
  air: 0.85, // 0..1 aria pulita
  irrigating: false,
  venting: false
};
// comandi simulati (tastiera / pulsanti a schermo), usati solo se l'Arduino non li manda
const sim = { knob: 0.5, lightKnob: 0, irrigating: false, venting: false };

// manopole comandate dal PC (tastiera, pulsanti a schermo): al primo tocco fanno uno scatto
// preciso (1 °C / 2 % di luce), tenendo premuto partono piano e accelerano in modo morbido
const TURN = {
  knob: { step: 0.02, slow: 0.05, fast: 0.32 }, // 0.02 = 1 °C; 0.05/s = 2,5 °C/s → 16 °C/s
  lightKnob: { step: 0.02, slow: 0.08, fast: 0.5 }
};
const held = { knob: 0, lightKnob: 0 };
const DELAY_MS = 220; // pausa dopo lo scatto, così un tocco breve resta un passo singolo
const RAMP_MS = 1100;
// pressioni e dosi in corso
const pulse = { irrRaw: false, airRaw: false, pour: 0, vent: 0, irrPresses: 0, airPresses: 0 };

export const Bionomad = {
  state: s,
  sim,
  pulse,
  reset({ out = 16 } = {}) {
    Object.assign(s, { temp: 21, out, water: 0.6, air: 0.85 });
  },
  setOutside(t) {
    s.out = t;
  },
  // temperatura che lo zaino raggiunge con la manopola in quella posizione:
  // manopola a metà = come fuori, al massimo scalda di 25 °C, al minimo raffredda di 25 °C
  target(knob = s.knob) {
    return s.out + (knob - 0.5) * 50;
  },
  // la posizione della manopola che porta lo zaino a t gradi
  knobFor(t) {
    return Math.max(0, Math.min(1, (t - s.out) / 50 + 0.5));
  },
  // gira una manopola dal PC: dir = -1, 0, +1 (chiamata una volta per frame)
  turn(name, dir, delta) {
    if (!dir) {
      held[name] = 0;
      return;
    }
    const c = TURN[name];
    if (held[name] === 0) sim[name] += dir * c.step;
    held[name] += Math.min(delta, 100);
    const k = Math.min(1, Math.max(0, (held[name] - DELAY_MS) / RAMP_MS));
    if (held[name] > DELAY_MS) sim[name] += dir * (c.slow + (c.fast - c.slow) * k * k) * (Math.min(delta, 100) / 1000);
    sim[name] = Math.max(0, Math.min(1, sim[name]));
  },
  // regolazione fine (rotellina del mouse): n scatti
  nudge(name, n) {
    sim[name] = Math.max(0, Math.min(1, sim[name] + n * TURN[name].step * 0.5));
  },
  // valore diretto (trascinando la manopola / il termometro a schermo)
  set(name, v) {
    sim[name] = Math.max(0, Math.min(1, v));
  },
  update(delta) {
    const dt = Math.min(delta, 100) / 1000;
    const ps = PlantSensors.state;
    // manopola della temperatura: comandano sia il potenziometro sia il PC (tastiera / schermo),
    // vince l'ultimo che si è mosso
    if (!PlantSensors.simulated("TK") && (pulse.lastPot === undefined || Math.abs(ps.knob - pulse.lastPot) > 0.015)) {
      sim.knob = ps.knob;
      pulse.lastPot = ps.knob;
    }
    s.knob = sim.knob;
    // manopola della luce: come la temperatura, comandano sia il potenziometro sia il PC
    if (!PlantSensors.simulated("LK") && (pulse.lastPotL === undefined || Math.abs(ps.lightKnob - pulse.lastPotL) > 0.015)) {
      sim.lightKnob = ps.lightKnob;
      pulse.lastPotL = ps.lightKnob;
    }
    s.lightLvl = sim.lightKnob;
    s.light = s.lightLvl > 0.08;
    // pulsanti: conta solo il momento in cui vengono premuti (fronte di salita)
    const irr = PlantSensors.simulated("IR") ? sim.irrigating : ps.irrigate;
    const air = PlantSensors.simulated("AR") ? sim.venting : ps.vent;
    // dall'Arduino: pressioni contate in PlantSensors (nessuna si perde)
    const irrHit = PlantSensors.simulated("IR") ? irr && !pulse.irrRaw : ps.irrCount > (pulse.irrSeen ?? ps.irrCount);
    const airHit = PlantSensors.simulated("AR") ? air && !pulse.airRaw : ps.airCount > (pulse.airSeen ?? ps.airCount);
    pulse.irrSeen = ps.irrCount;
    pulse.airSeen = ps.airCount;
    if (irrHit) {
      // una pressione = una dose giusta: dalla terra secca si arriva sempre in mezzo alla fascia
      // buona (una volta basta, come dice la task). Premere di nuovo quando è già bagnata la allaga.
      const base = Math.max(s.water, pulse.fillTo ?? 0);
      pulse.fillTo = Math.min(1, base < IDEAL.wMin ? (IDEAL.wMin + IDEAL.wMax) / 2 : base + 0.42);
      pulse.pour = POUR_MS;
      pulse.irrPresses++;
    }
    if (airHit) pulse.airPresses++;
    // ventola accesa solo mentre il tasto è tenuto premuto (piccola coda per non sfarfallare)
    if (air) pulse.vent = 150;
    pulse.irrRaw = irr;
    pulse.airRaw = air;
    pulse.pour = Math.max(0, pulse.pour - Math.min(delta, 100));
    pulse.vent = Math.max(0, pulse.vent - Math.min(delta, 100));
    // l'acqua scorre per tutta la dose (animazione) e comunque finché non ha raggiunto la quota
    if (pulse.fillTo != null && s.water < pulse.fillTo - 0.005) pulse.pour = Math.max(pulse.pour, 120);
    else if (pulse.fillTo != null && pulse.pour <= 0) pulse.fillTo = null;
    s.irrigating = pulse.pour > 0;
    s.venting = pulse.vent > 0;
    // la temperatura dello zaino segue la manopola con un po' di inerzia
    s.temp += (this.target() - s.temp) * Math.min(1, dt * 0.9);
    // mentre scorre la dose sale fino alla quota (non oltre): la fine della dose decide il livello
    const fill = s.irrigating && pulse.fillTo != null ? Math.max(0.16, (pulse.fillTo - s.water) / Math.max(0.3, pulse.pour / 1000)) : 0.16;
    s.water = Math.max(0, Math.min(1, s.water + (s.irrigating ? fill : -0.0035) * dt));
    if (pulse.fillTo != null && s.water > pulse.fillTo) s.water = pulse.fillTo;
    s.air = Math.max(0, Math.min(1, s.air + (s.venting ? 0.26 : -0.0028) * dt));
  },
  // quanto il BIONOMAD sta "soffrendo": moltiplica il consumo di ossigeno
  stress() {
    let k = 1;
    if (s.temp < IDEAL.tMin - 2 || s.temp > IDEAL.tMax + 2) k += 0.25;
    if (s.water < 0.2 || s.water > 0.92) k += 0.2;
    if (s.air < 0.3) k += 0.2;
    return k;
  },
  // un po' di margine invisibile oltre la fascia mostrata, così il potenziometro non è troppo nervoso
  lightOk() {
    return s.lightLvl >= IDEAL.lMin - 0.07 && s.lightLvl <= IDEAL.lMax + 0.07;
  },
  tempOk() {
    return s.temp >= IDEAL.tMin - 1 && s.temp <= IDEAL.tMax + 1;
  },
  waterOk() {
    return s.water >= IDEAL.wMin && s.water <= IDEAL.wMax;
  }
};
