import { EVENTS, EMERGENCY_CHANCE, DAY_PLAN, NIGHT_CHANCE, TRAVEL_TASK_COUNT, TRAVEL_TASKS, officeTail, nightSteps, randomSteps } from "../config/events.js";
import { ORIGINS } from "../config/origins.js";

// la run vive nel registry di Phaser, così la vedono tutte le scene

// storico delle ultime partite (sul dispositivo): serve a non riproporre gli stessi eventi
const HISTORY_KEY = "o2rigin_history";
function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveHistory(ids) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...ids, ...readHistory()].slice(0, 24)));
  } catch {
    /* storage non disponibile: pazienza */
  }
}

// "firme" delle ultime partite: una run non può essere uguale a una delle ultime 8
const SIG_KEY = "o2rigin_runs";
function readSigs() {
  try {
    return JSON.parse(localStorage.getItem(SIG_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveSig(sig) {
  try {
    localStorage.setItem(SIG_KEY, JSON.stringify([sig, ...readSigs()].slice(0, 8)));
  } catch {
    /* pazienza */
  }
}

// estrazione pesata
function pick(pool, weight) {
  const ws = pool.map(weight);
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= ws[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}

// variazioni per evento: tempi e gradi cambiano un po' ogni partita, più duri nelle città difficili
function makeTune(origin) {
  const lvl = origin?.level ?? 2;
  const r = (a, b) => a + Math.random() * (b - a);
  return {
    hold: [r(0.8, 1), r(0.95, 1.15), r(1.1, 1.35)][lvl - 1],
    timeout: [r(1.1, 1.3), r(0.95, 1.05), r(0.8, 0.92)][lvl - 1],
    delta: Math.floor(Math.random() * 3) - 1,
    // la temperatura fuori cambia di qualche grado a ogni partita
    out: Math.round((Math.random() * 2 - 1) * 4),
    temp: { reykjavik: -4, milano: 0, delhi: 5 }[origin?.id] ?? 0
  };
}

function tuneStep(step, t) {
  if (!t || (step.type !== "plant" && step.type !== "bio")) return step;
  const s = { ...step };
  if (s.holdMs) s.holdMs = Math.round(s.holdMs * t.hold);
  if (s.timeoutMs) s.timeoutMs = Math.round(s.timeoutMs * t.timeout);
  if (s.riseBy) s.riseBy = Math.max(2, s.riseBy + t.delta);
  if (s.dropBy) s.dropBy = Math.max(2, s.dropBy + t.delta);
  if (s.maxOver && s.riseBy) s.maxOver = Math.max(s.maxOver, s.riseBy + 3);
  if (s.baseTemperature != null) s.baseTemperature += t.temp;
  if (s.out != null && t.out) s.out += t.out;
  return s;
}

// la giornata si costruisce in ordine, una cura dopo l'altra: ogni volta si sceglie la cura
// meno fatta finora e mai uguale alla precedente, così le task non si ripetono a raffica
function planner() {
  const used = { light: 0, temp: 0, water: 0, air: 0 };
  let last = null;
  const score = (g) => used[g] * 10 + (g === last ? 25 : 0) + Math.random();
  return {
    best(goals) {
      const sc = Object.fromEntries(goals.map((g) => [g, score(g)]));
      return [...goals].sort((a, b) => sc[a] - sc[b])[0];
    },
    take(goal) {
      used[goal] += 1;
      last = goal;
      return goal;
    },
    // peso di una cura: già fatta oggi = molto meno probabile, uguale alla precedente = quasi mai
    weight(g) {
      return (g === last ? 0.08 : 1) / (1 + used[g] * 2.5);
    },
    draw(goals) {
      return pick(goals, (g) => this.weight(g));
    },
    score
  };
}

export function startRun(registry, originId) {
  const origin = ORIGINS.find((o) => o.id === originId);
  const lvl = origin?.level ?? 2;
  const history = readHistory();
  const seen = (id) => history.filter((h) => h === id).length;
  // molto raramente la giornata è solo l'emergenza (e allora niente altri eventi)
  const emergency = Math.random() < EMERGENCY_CHANCE && seen("emergenza") === 0;
  let events = ["emergenza"];
  let plan = [{}];
  let travel = [null];
  let travelV = [0];
  if (!emergency) {
    // giornata (solo gli eventi ufficiali): bus del mattino → ufficio → casa la sera.
    // Cosa cambia da una partita all'altra:
    //   bus      affollato (luce) oppure bus perso (temperatura)
    //   ufficio  riscaldamento spento e/o capo, in ordine casuale, poi fine giornata (luce)
    //   casa     riscaldamento acceso, a volte la notte il BIONOMAD ti sveglia (acqua/aria)
    //   RANDOM   notifiche acqua/aria in momenti a caso: nei tragitti, in ufficio, a casa
    //   testi, orari e gradi cambiano ogni volta; una giornata uguale a una delle ultime 8 si rifà
    const sigs = readSigs();
    const active = (slot) => Object.keys(EVENTS).filter((id) => EVENTS[id].slot === slot && !EVENTS[id].off);
    const fresh = (id) => 1 / (1 + seen(id) * 2.5);
    const v3 = () => Math.floor(Math.random() * 3);
    let sig = "";
    for (let attempt = 0; attempt < 40; attempt++) {
      // quante notifiche RANDOM e dove: t0/t1/t2 = tragitti, office/home = dentro l'evento
      const [lo, hi] = [[1, 2], [1, 3], [2, 4]][lvl - 1];
      const nRand = Math.max(lo, Math.min(hi, TRAVEL_TASK_COUNT[lvl - 1] + Math.floor(Math.random() * (hi - lo + 1))));
      const spots = shuffle(["t0", "t1", "t2", "office", "home"]).slice(0, nRand);
      let lastRand = null;
      // acqua o aria a caso; la stessa di prima solo una volta su quattro
      // avoid = cura appena fatta lì vicino (mai due uguali di fila)
      const other = { water: "air", air: "water" };
      const randGoal = (avoid) => {
        let g = !lastRand ? (Math.random() < 0.5 ? "water" : "air") : Math.random() < 0.25 ? lastRand : other[lastRand];
        if (g === avoid) g = other[g];
        return (lastRand = g);
      };

      const bus = pick(active("bus"), fresh);
      const officePool = shuffle(active("office"));
      const officeCount = Math.random() < [0.3, 0.5, 0.7][lvl - 1] ? 2 : 1;
      const office = officePool.length > 1 ? (officeCount === 2 ? officePool.slice(0, 2) : [pick(officePool, fresh)]) : officePool;
      const home = pick(active("home"), fresh);

      const ev = [bus, office[0], home];
      const tr = [0, 1, 2].map((leg) => (spots.includes("t" + leg) ? randGoal() : null));
      const pl = [
        { v: v3() },
        { v: v3(), also: office.slice(1), tail: "light", rnd: spots.includes("office") ? [{ goal: randGoal(office.map((id) => EVENTS[id].goal).find((g) => g === "air" || g === "water")), v: v3() }] : [] },
        { v: v3(), rnd: spots.includes("home") ? [{ goal: randGoal(), v: v3() }] : [] }
      ];
      if (Math.random() < NIGHT_CHANCE[lvl - 1]) {
        const before = pl[2].rnd[0]?.goal;
        pl[2].night = before ? other[before] : Math.random() < 0.5 ? "water" : "air";
      }
      events = ev;
      plan = pl;
      travel = tr;
      travelV = tr.map(v3);
      sig = JSON.stringify([ev, office, tr, pl.map((x) => [(x.rnd ?? []).map((r) => r.goal), x.night ?? null])]);
      if (!sigs.includes(sig)) break;
    }
    saveSig(sig);
  }
  saveHistory(events);
  registry.set("origin", originId);
  registry.set("run", { origin: originId, events, plan, travel, travelV, tune: events.map(() => makeTune(origin)), zoneOffset: Math.floor(Math.random() * 4), index: 0, oxygen: 1, results: [], negligence: 0, lastLocation: "home" });
  return registry.get("run");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// cura da fare durante il tragitto verso l'evento corrente (o null)
export function travelTask(run) {
  const g = run?.travel?.[run?.index ?? 0];
  if (!g) return null;
  const t = TRAVEL_TASKS[g];
  const v = run.travelV?.[run.index ?? 0] ?? 0;
  return { ...t, line: t.lines[v % t.lines.length] };
}

// ogni tappa attraversa un quartiere diverso della città
export function cityZone(run) {
  return ((run?.zoneOffset ?? 0) + (run?.index ?? 0)) % 4;
}

// di giorno o di sera: lo decide l'evento (fine giornata, casa, notte = sera)
export function dayTime(run) {
  const id = run?.events?.[run?.index ?? 0];
  if (!id) return "night";
  return EVENTS[id]?.evening ? "night" : "day";
}

// temperatura esterna della città: Reykjavík più fredda, New Delhi più calda
export function cityTemp(run, t) {
  const d = { reykjavik: -6, milano: 0, delhi: 6 }[run?.origin] ?? 0;
  return t + d;
}

export function getRun(registry) {
  return registry.get("run");
}

export function currentEvent(registry) {
  const run = getRun(registry);
  if (!run) return null;
  const id = run.events[run.index];
  if (!id) return null;
  const event = EVENTS[id];
  const extra = run.plan?.[run.index] ?? {};
  let steps = event.steps;
  // notifiche RANDOM dentro l'evento (in ufficio dopo il primo imprevisto, a casa prima di dormire)
  for (const r of extra.rnd ?? []) steps = [...steps, ...randomSteps(r.goal, r.v, event.location === "office")];
  // secondo imprevisto in ufficio: il BIONOMAD è già sull'hub, quindi niente "appoggia"
  for (const id of extra.also ?? []) steps = [...steps, ...EVENTS[id].steps.filter((st) => st.type !== "place")];
  if (extra.tail) steps = [...steps, ...officeTail(extra.tail, extra.v)];
  if (extra.night) steps = [...steps, ...nightSteps(extra.night, extra.v)];
  return { id, ...event, steps: steps.map((st) => tuneStep(st, run.tune?.[run.index])) };
}

// ritorna true se la run è finita (tutti gli eventi completati)
export function completeEvent(registry, oxygen) {
  const run = getRun(registry);
  run.results.push("ok");
  const done = EVENTS[run.events[run.index]];
  run.lastLocation = done.endsAt ?? done.location;
  run.index += 1;
  run.oxygen = oxygen;
  registry.set("run", run);
  return run.index >= run.events.length;
}

export function failRun(registry) {
  const run = getRun(registry);
  run.results.push("fail");
  run.failed = true;
  registry.set("run", run);
}

// prossima tappa del viaggio
export function nextDestination(registry) {
  const run = getRun(registry);
  const id = run?.events[run.index];
  return id ? { location: EVENTS[id].location, time: EVENTS[id].time, evening: Boolean(EVENTS[id].evening) } : { location: "home", time: "20:15", evening: true };
}
