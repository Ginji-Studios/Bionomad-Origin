// stato del BIONOMAD (lo zaino-serra) per tutta la partita: temperatura dello zaino e
// dell'esterno, luce, acqua e aria. Lo leggono HUD, pannello e scene; i comandi arrivano dai
// controlli fisici (Arduino via seriale) oppure, se un comando non è collegato, dalla
// tastiera e dai pulsanti a schermo.
//
// Comandi del dispositivo:
//   START  pulsante di avvio / pausa
//   LU     interruttore della luce (0/1)
//   TK     manopola della temperatura (0..1023)
//   IR     pulsante di irrigazione: si preme UNA volta (quick time event) e versa una dose d'acqua
//   AR     pulsante di arieggiamento: si preme UNA volta e il ventilatore soffia per qualche secondo
import { PlantSensors } from "../input/PlantSensors.js";

// una pressione = una dose: l'acqua scorre per POUR_MS, l'aria soffia per VENT_MS
export const POUR_MS = 1800;
export const VENT_MS = 3400;

export const IDEAL = { tMin: 17, tMax: 25, wMin: 0.4, wMax: 0.75, aMin: 0.5 };

const s = {
  temp: 21, // °C nello zaino
  out: 16, // °C fuori
  knob: 0.5, // 0..1 (manopola)
  light: false,
  water: 0.6, // 0..1 umidità della terra
  air: 0.85, // 0..1 aria pulita
  irrigating: false,
  venting: false
};
// comandi simulati (tastiera / pulsanti a schermo), usati solo se l'Arduino non li manda
const sim = { knob: 0.5, light: false, irrigating: false, venting: false };
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
  update(delta) {
    const dt = Math.min(delta, 100) / 1000;
    const ps = PlantSensors.state;
    s.knob = PlantSensors.simulated("TK") ? sim.knob : ps.knob;
    s.light = PlantSensors.simulated("LU") ? sim.light : ps.lightSwitch;
    // pulsanti: conta solo il momento in cui vengono premuti (fronte di salita)
    const irr = PlantSensors.simulated("IR") ? sim.irrigating : ps.irrigate;
    const air = PlantSensors.simulated("AR") ? sim.venting : ps.vent;
    // dall'Arduino: pressioni contate in PlantSensors (nessuna si perde)
    const irrHit = PlantSensors.simulated("IR") ? irr && !pulse.irrRaw : ps.irrCount > (pulse.irrSeen ?? ps.irrCount);
    const airHit = PlantSensors.simulated("AR") ? air && !pulse.airRaw : ps.airCount > (pulse.airSeen ?? ps.airCount);
    pulse.irrSeen = ps.irrCount;
    pulse.airSeen = ps.airCount;
    if (irrHit) {
      pulse.pour = POUR_MS;
      pulse.irrPresses++;
    }
    if (airHit) {
      pulse.vent = VENT_MS;
      pulse.airPresses++;
    }
    pulse.irrRaw = irr;
    pulse.airRaw = air;
    pulse.pour = Math.max(0, pulse.pour - Math.min(delta, 100));
    pulse.vent = Math.max(0, pulse.vent - Math.min(delta, 100));
    s.irrigating = pulse.pour > 0;
    s.venting = pulse.vent > 0;
    // la temperatura dello zaino segue la manopola con un po' di inerzia
    s.temp += (this.target() - s.temp) * Math.min(1, dt * 0.45);
    s.water = Math.max(0, Math.min(1, s.water + (s.irrigating ? 0.16 : -0.0035) * dt));
    s.air = Math.max(0, Math.min(1, s.air + (s.venting ? 0.22 : -0.0028) * dt));
  },
  // quanto il BIONOMAD sta "soffrendo": moltiplica il consumo di ossigeno
  stress() {
    let k = 1;
    if (s.temp < IDEAL.tMin - 2 || s.temp > IDEAL.tMax + 2) k += 0.25;
    if (s.water < 0.2 || s.water > 0.92) k += 0.2;
    if (s.air < 0.3) k += 0.2;
    return k;
  },
  tempOk() {
    return s.temp >= IDEAL.tMin && s.temp <= IDEAL.tMax;
  },
  waterOk() {
    return s.water >= IDEAL.wMin && s.water <= IDEAL.wMax;
  }
};
