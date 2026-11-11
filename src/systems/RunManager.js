import { EVENTS, EVENTS_PER_RUN } from "../config/events.js";

// Stato della run salvato nel registry di Phaser (condiviso tra le scene).
// run = { origin, events: [id, id, id], index, oxygen, results: ["ok" | "fail"] }

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function startRun(registry, originId) {
  // Gli eventi vengono poi giocati in ordine di orario (mattina → sera).
  const events = shuffle(Object.keys(EVENTS))
    .slice(0, EVENTS_PER_RUN)
    .sort((a, b) => EVENTS[a].time.localeCompare(EVENTS[b].time));
  registry.set("origin", originId);
  registry.set("run", { origin: originId, events, index: 0, oxygen: 1, results: [], lastLocation: "home" });
  return registry.get("run");
}

export function getRun(registry) {
  return registry.get("run");
}

export function currentEvent(registry) {
  const run = getRun(registry);
  if (!run) return null;
  const id = run.events[run.index];
  return id ? { id, ...EVENTS[id] } : null;
}

// Ritorna true se la run è finita (tutti gli eventi completati).
export function completeEvent(registry, oxygen) {
  const run = getRun(registry);
  run.results.push("ok");
  run.lastLocation = EVENTS[run.events[run.index]].location;
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

// Prossima tappa del viaggio: la location del prossimo evento, oppure casa a fine giornata.
export function nextDestination(registry) {
  const run = getRun(registry);
  const id = run?.events[run.index];
  return id ? { location: EVENTS[id].location, time: EVENTS[id].time, evening: Boolean(EVENTS[id].evening) } : { location: "home", time: "20:15", evening: true };
}
