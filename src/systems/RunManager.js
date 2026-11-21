import { EVENTS, EMERGENCY_CHANCE, DAY_PLAN, NIGHT_CHANCE, TRAVEL_TASK_COUNT, TRAVEL_TASKS, officeTail, nightSteps } from "../config/events.js";
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
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...ids, ...readHistory()].slice(0, 15)));
  } catch {
    /* storage non disponibile: pazienza */
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
  const plan = [{}];
  let travel = [null];
  if (!emergency) {
    // giornata: bus del mattino → ufficio (fino alle 18:30) → casa la sera (a volte anche la notte).
    // Una sola visita per posto: niente ritorni in ufficio o a casa.
    events = [];
    plan.length = 0;
    const P = planner();
    // quali tragitti hanno una notifica: 0 = verso il bus, 1 = verso l'ufficio, 2 = verso casa
    const legs = shuffle([0, 1, 2]).slice(0, TRAVEL_TASK_COUNT[lvl - 1]);
    travel = [null, null, null];
    const travelGoal = (leg) => {
      if (!legs.includes(leg)) return;
      const goals = leg === 2 ? ["water", "air", "light"] : ["water", "air"];
      travel[leg] = P.take(P.best(goals));
    };
    DAY_PLAN.forEach((slot, i) => {
      travelGoal(i);
      const pool = Object.keys(EVENTS).filter((id) => EVENTS[id].slot === slot);
      // l'evento con la cura più "nuova", a parità quello visto meno nelle ultime partite
      const sc = Object.fromEntries(pool.map((id) => [id, P.score(EVENTS[id].goal) + seen(id) * 4]));
      const id = [...pool].sort((a, b) => sc[a] - sc[b])[0];
      P.take(EVENTS[id].goal);
      const extra = {};
      if (slot === "office") extra.tail = P.take(P.best(["light", "air", "water", "temp"]));
      if (slot === "home" && Math.random() < NIGHT_CHANCE[lvl - 1]) extra.night = P.take(P.best(["water", "air"]));
      events.push(id);
      plan.push(extra);
    });
  }
  saveHistory(events);
  registry.set("origin", originId);
  registry.set("run", { origin: originId, events, plan, travel, tune: events.map(() => makeTune(origin)), zoneOffset: Math.floor(Math.random() * 4), index: 0, oxygen: 1, results: [], negligence: 0, lastLocation: "home" });
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
  return g ? TRAVEL_TASKS[g] : null;
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
  if (extra.tail) steps = [...steps, ...officeTail(extra.tail)];
  if (extra.night) steps = [...steps, ...nightSteps(extra.night)];
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
