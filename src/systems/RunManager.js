import { EVENTS, EVENTS_PER_RUN, EXTRA_TASKS, EMERGENCY_CHANCE } from "../config/events.js";
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
  for (let i = 0; i < (origin?.extras?.care ?? 0); i += 1) take(EXTRA_TASKS.care, "care");
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

export function startRun(registry, originId) {
  // gli eventi vengono poi giocati in ordine di orario (mattina → sera)
  // raramente la giornata è solo l'emergenza (nessuna task extra: è già lunga e difficile)
  const emergency = Math.random() < EMERGENCY_CHANCE;
  const events = emergency
    ? ["emergenza"]
    : shuffle(Object.keys(EVENTS).filter((id) => !EVENTS[id].emergency))
        .slice(0, EVENTS_PER_RUN)
        .sort((a, b) => EVENTS[a].time.localeCompare(EVENTS[b].time));
  const origin = ORIGINS.find((o) => o.id === originId);
  const extras = events.map((id) => (EVENTS[id].emergency ? [] : pickExtras(id, origin)));
  registry.set("origin", originId);
  registry.set("run", { origin: originId, events, extras, zoneOffset: Math.floor(Math.random() * 4), index: 0, oxygen: 1, results: [], negligence: 0, lastLocation: "home" });
  return registry.get("run");
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
  return { id, ...event, steps: event.emergency ? event.steps : withExtras(event.steps, run.extras?.[run.index]) };
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
