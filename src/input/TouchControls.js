// comandi touch per telefono e tablet: i pulsanti simulano i tasti della tastiera,
// così tutte le scene funzionano senza modifiche.

const KEYS = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  " ": 32,
  Enter: 13,
  Escape: 27,
  c: 67,
  i: 73,
  h: 72,
  f: 70,
  r: 82,
  "0": 48,
  "1": 49,
  "2": 50,
  "3": 51
};

function sendKey(type, key) {
  const code = key === " " ? "Space" : /^[0-9]$/.test(key) ? `Digit${key}` : key;
  const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
  Object.defineProperty(event, "keyCode", { get: () => KEYS[key] });
  Object.defineProperty(event, "which", { get: () => KEYS[key] });
  window.dispatchEvent(event);
}

function button(label, key, className) {
  const el = document.createElement("button");
  el.className = `tc-btn ${className ?? ""}`;
  el.textContent = label;
  let held = false;
  const press = (e) => {
    e.preventDefault();
    if (held) return;
    held = true;
    el.classList.add("is-down");
    sendKey("keydown", key);
  };
  const release = (e) => {
    e.preventDefault();
    if (!held) return;
    held = false;
    el.classList.remove("is-down");
    sendKey("keyup", key);
  };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
  return el;
}

export function setupTouchControls() {
  const touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (!touch) return;
  document.body.classList.add("has-touch");

  const root = document.createElement("div");
  root.className = "touch-controls";

  const pad = document.createElement("div");
  pad.className = "tc-pad";
  pad.append(
    button("▲", "ArrowUp", "up"),
    button("◀", "ArrowLeft", "left"),
    button("▶", "ArrowRight", "right"),
    button("▼", "ArrowDown", "down")
  );

  const actions = document.createElement("div");
  actions.className = "tc-actions";
  const plant = document.createElement("div");
  plant.className = "tc-plant";
  plant.append(
    button("copri", "c", "s-light"),
    button("torcia", "i", "s-light"),
    button("scalda", "h", "s-temperature"),
    button("raffredda", "f", "s-temperature"),
    button("leva", "r", "s-irrigation"),
    button("verde", "1", "s-vials v1"),
    button("blu", "2", "s-vials v2"),
    button("rossa", "3", "s-vials v3"),
    button("togli", "0", "s-vials")
  );
  actions.append(plant, button("USA", " ", "big"));

  const top = document.createElement("div");
  top.className = "tc-top";
  const full = document.createElement("button");
  full.className = "tc-btn small";
  full.textContent = "⛶";
  full.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  top.append(button("ESC", "Escape", "small"), full, button("INVIO", "Enter", "small"));

  root.append(pad, actions, top);
  document.body.append(root);
}
