import { EVENTS, EXTRA_TASKS, EMERGENCY_CHANCE } from "../config/events.js";
import { ORIGINS } from "../config/origins.js";

// la run vive nel registry di Phaser, così la vedono tutte le scene

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// task extra di un evento: non ripetono un sensore già usato nell'evento
function pickExtras(eventId, origin) {
  const used = new Set(EVENTS[eventId].steps.filter((s) => s.sensor).map((s) => s.sensor));
  const extras = [];
  const take = (pool, kind) => {
    const free = shuffle(pool).filter((task) => !used.has(task.sensor));
    const task = free[0] ?? shuffle(pool)[0];
    used.add(task.sensor);
    extras.push({ ...task, extra: kind });
  };
  // una cura in più a caso ogni tanto, così le giornate non sono mai uguali
  const bonus = Math.random() < 0.3 ? 1 : 0;
  for (let i = 0; i < (origin?.extras?.care ?? 0) + bonus; i += 1) take(EXTRA_TASKS.care, "care");
  for (let i = 0; i < (origin?.extras?.fix ?? 0); i += 1) take(EXTRA_TASKS.fix, "fix");
  return extras;
}

// le extra vanno prima dell'uscita / della corsa verso casa, altrimenti in coda
function withExtras(steps, extras) {
  if (!extras?.length) return steps;
  const last = steps[steps.length - 1];
  if (["exit", "emergency"].includes(last.type)) return [...steps.slice(0, -1), ...extras, last];
  return [...steps, ...extras];
}

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

// quanti eventi in base alla difficoltà della città
function eventCount(origin) {
  const lvl = origin?.level ?? 2;
  if (lvl === 1) return Math.random() < 0.5 ? 2 : 3;
  if (lvl === 3) return Math.random() < 0.5 ? 3 : 4;
  return 3;
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
  if (!t || step.type !== "plant") return step;
  const s = { ...step };
  if (s.holdMs) s.holdMs = Math.round(s.holdMs * t.hold);
  if (s.timeoutMs) s.timeoutMs = Math.round(s.timeoutMs * t.timeout);
  if (s.riseBy) s.riseBy = Math.max(2, s.riseBy + t.delta);
  if (s.dropBy) s.dropBy = Math.max(2, s.dropBy + t.delta);
  if (s.maxOver && s.riseBy) s.maxOver = Math.max(s.maxOver, s.riseBy + 3);
  if (s.baseTemperature != null) s.baseTemperature += t.temp;
  return s;
}

export function startRun(registry, originId) {
  const origin = ORIGINS.find((o) => o.id === originId);
  const lvl = origin?.level ?? 2;
  const history = readHistory();
  const seen = (id) => history.filter((h) => h === id).length;
  // raramente la giornata è solo l'emergenza (nessuna task extra: è già lunga e difficile)
  const emergency = Math.random() < EMERGENCY_CHANCE * (lvl === 3 ? 1.6 : lvl === 1 ? 0.5 : 1) && seen("emergenza") === 0;
  let events = ["emergenza"];
  if (!emergency) {
    // le tappe alternano giorno e notte: di giorno eventi diurni, di notte quelli serali.
    // Pesi: eventi visti di recente quasi mai, livello vicino alla difficoltà della città,
    // mai lo stesso luogo due volte di fila.
    events = [];
    const n = eventCount(origin);
    for (let i = 0; i < n; i++) {
      const night = i % 2 === 1;
      const pool = Object.keys(EVENTS).filter((id) => !EVENTS[id].emergency && !events.includes(id) && Boolean(EVENTS[id].evening) === night);
      const prevLoc = events.length ? EVENTS[events[events.length - 1]].location : null;
      events.push(
        pick(pool, (id) => {
          const ev = EVENTS[id];
          let w = 1 / (1 + 12 * seen(id));
          w *= [1, 0.6, 0.3][Math.abs((ev.level ?? 2) - lvl)];
          if (ev.location === prevLoc) w *= 0.15;
          return w;
        })
      );
    }
  }
  const extras = events.map((id) => (EVENTS[id].emergency ? [] : pickExtras(id, origin)));
  const tune = events.map(() => makeTune(origin));
  saveHistory(events);
  registry.set("origin", originId);
  registry.set("run", { origin: originId, events, extras, tune, zoneOffset: Math.floor(Math.random() * 4), index: 0, oxygen: 1, results: [], negligence: 0, lastLocation: "home" });
  return registry.get("run");
}

// ogni tappa attraversa un quartiere diverso della città
export function cityZone(run) {
  return ((run?.zoneOffset ?? 0) + (run?.index ?? 0)) % 4;
}

// le task si alternano: giorno, notte, giorno... (la prima è di giorno)
export function dayTime(run) {
  return (run?.index ?? 0) % 2 === 1 ? "night" : "day";
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
  const steps = event.emergency ? event.steps : withExtras(event.steps, run.extras?.[run.index]);
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
