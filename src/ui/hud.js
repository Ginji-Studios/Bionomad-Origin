import { Sfx } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { ZONES } from "../world/skyline.js";
import { addHiRes } from "../art/hires.js";
import { npcKey, WALK_FRAMES } from "../art/people.js";
import { Bionomad, IDEAL } from "../systems/Bionomad.js";

// nuovo stile (illustrazione piatta): carte chiare, inchiostro blu notte, accento giallo.
// c0 = carta, c1 = carta in ombra, c2 = evidenziato, c3 = linee e testi secondari, c4 = inchiostro
export const C = { c0: 0xe6e9e5, c1: 0xd7dbd6, c2: 0xc6ccc6, c3: 0x8c9893, c4: 0x2e4350 };
export const HEX = { c0: "#E6E9E5", c1: "#D7DBD6", c2: "#C6CCC6", c3: "#55605F", c4: "#2E4350" };
export const Y_ACCENT = 0x7d909f;
export const FONT = '"Roboto Mono", ui-monospace, Menlo, monospace';
export const VIEW = { w: 1280, h: 800 };

export function txt(scene, x, y, s, { size = 22, color = HEX.c4, origin = 0, wrap, align = "left", weight = "400", depth } = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: weight === "400" ? "normal" : "bold",
    color,
    align,
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: Math.round(size * 0.3),
    // testo nitido anche quando lo schermo ingrandisce il gioco
    resolution: 2
  });
  if (Array.isArray(origin)) t.setOrigin(origin[0], origin[1]);
  else t.setOrigin(origin);
  if (depth !== undefined) t.setDepth(depth);
  return t;
}

export function box(scene, x, y, w, h, { fill = C.c0, alpha = 0.82, border = C.c3, bw = 2, depth } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRect(x, y, w, h);
  if (border !== null) {
    g.lineStyle(bw, border, 1);
    g.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
  }
  if (depth !== undefined) g.setDepth(depth);
  return g;
}

// staffe agli angoli dello schermo (cornice del concept)
// cornice agli angoli: nel nuovo stile l'interfaccia è pulita, non si disegna più
export function brackets(scene) {
  return scene.add.graphics();
}

// pulsante: primario = carta con testo navy, secondario = navy con bordo
export function button(scene, x, y, w, h, label, onPress, { primary = false, size = 26, depth = 1600, scroll = false, left = false } = {}) {
  const c = scene.add.container(x, y).setDepth(depth);
  if (!scroll) c.setScrollFactor(0);
  const g = scene.add.graphics();
  const t = left ? txt(scene, 24, h / 2, label, { size, origin: [0, 0.5] }) : txt(scene, w / 2, h / 2, label, { size, origin: 0.5 });
  c.add([g, t]);
  let selected = primary;
  let enabled = true;
  let down = false;
  let over = false;
  const draw = () => {
    g.clear();
    const fillOn = selected || down;
    const r = Math.min(h / 2, 16);
    g.fillStyle(fillOn ? C.c4 : over ? C.c2 : C.c0, fillOn ? 1 : 0.95);
    g.fillRoundedRect(0, 0, w, h, r);
    if (!fillOn) {
      g.lineStyle(2, C.c3, 0.7);
      g.strokeRoundedRect(1, 1, w - 2, h - 2, r);
    }
    t.setColor(fillOn ? HEX.c0 : HEX.c4);
  };
  draw();
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  if (!scroll) zone.setScrollFactor(0);
  c.add(zone);
  zone.on("pointerdown", () => {
    if (!enabled) return;
    down = true;
    draw();
  });
  zone.on("pointerover", () => {
    over = true;
    draw();
  });
  zone.on("pointerout", () => {
    down = false;
    over = false;
    draw();
  });
  zone.on("pointerup", () => {
    if (!enabled || !down) return;
    down = false;
    draw();
    Sfx.confirm();
    onPress?.();
  });
  return {
    c,
    label: t,
    setSelected(v) {
      selected = v;
      draw();
      return this;
    },
    setEnabled(v) {
      enabled = v;
      // l'opacità si tocca solo qui: così il passaggio del dito non riaccende un pulsante in dissolvenza
      c.setAlpha(enabled ? 1 : 0.4);
      draw();
      return this;
    },
    setLabel(s) {
      t.setText(s);
      return this;
    },
    press() {
      if (enabled) onPress?.();
    }
  };
}

// O₂ in alto al centro, come nel riferimento: barra rettangolare a tacche con il bordo
// sottile antracite e il "tappo" a destra (una pila), poi la scritta O₂. Niente pillole.
export const INK = { dark: "#2A3034", soft: "#55605F", paper: "#E6E9E5" };
export function o2Hud(scene) {
  const W = 360;
  const H = 24;
  const SEG = 30;
  const c = scene.add.container(Math.round(VIEW.w / 2 - (W + 50) / 2), 26).setDepth(1500).setScrollFactor(0);
  const frame = scene.add.graphics();
  const fx = scene.add.graphics();
  const label = txt(scene, W + 18, H / 2, "O₂", { size: 18, weight: "500", color: INK.dark, origin: [0, 0.5] });
  label.setShadow(0, 0, "rgba(230,233,229,1)", 8, false, true);
  c.add([frame, fx, label]);
  const ink = 0x2a3034;
  // bordo, tappo e un velo chiaro dentro (si legge anche sopra i palazzi scuri)
  frame.fillStyle(0xe6e9e5, 0.9);
  frame.fillRect(0, 0, W, H);
  frame.lineStyle(2, ink, 1);
  frame.strokeRect(0, 0, W, H);
  frame.fillStyle(ink, 1);
  frame.fillRect(W + 2, H / 2 - 5, 6, 10);
  const sw = (W - 8) / SEG;
  let disp = null;
  let lastN = -1;
  let lastLow = null;
  return {
    c,
    set(v, time = 0) {
      v = Math.max(0, Math.min(1, v));
      if (disp == null) disp = v;
      disp += (v - disp) * 0.18;
      const low = disp < 0.3;
      const n = Math.round(disp * SEG);
      const blink = low ? 0.55 + 0.45 * Math.abs(Math.sin(time / 220)) : 1;
      if (n === lastN && low === lastLow && !low) return;
      lastN = n;
      lastLow = low;
      fx.clear();
      for (let i = 0; i < SEG; i++) {
        const on = i < n;
        fx.fillStyle(on ? (low ? 0x262b2c : 0x2e4350) : 0xb9c1bc, on ? blink : 0.55);
        fx.fillRect(4 + i * sw, 4, sw - 2, H - 8);
      }
    }
  };
}

// palette del brand biodom+ (dai manifesti): inchiostro, verdi-acqua, carta
export const BRAND = { ink: 0x1b2528, teal: 0x2f5a60, teal2: 0x3e6e75, teal3: 0x5a8e92, teal4: 0x7faaaa, paper: 0xe7e6e1, mist: 0xdde3e2 };
// colori del HUD: blu notte su chiaro (nessun verde)
export const GREEN = { dark: 0x2e4350, mid: 0x55605f, light: 0xb3bccb, cream: 0xe6e9e5 };
export const GREEN_HEX = { dark: "#2E4350", mid: "#55605F", cream: "#E6E9E5" };
// testo pulito, senza bordi né ombre: i colori cambiano con lo sfondo (setDark)
const softGlow = (t) => t;

// in alto a sinistra, come nel riferimento: l'ORA grande, sotto "Città, Paese", poi la task
// attuale e i passi come trattini. In alto a destra la temperatura di fuori.
// Testo antracite su fondo chiaro; sera e interni bui: testo carta (setDark).
let PLACE = "";
let PLACE_CO = "";
// ora del gioco: ogni luogo ha la sua ora tipica, poi scorre un minuto ogni 1,5 secondi
const HOUR_AT = { busstop: 7 * 60 + 50, bus: 8 * 60 + 15, foodtruck: 12 * 60 + 40, office: 9 * 60 + 30, home: 19 * 60 + 10 };
function startMinutes(scene) {
  if (scene.scene.key === "TravelScene") {
    if (scene.finished) return 18 * 60 + 40;
    return (HOUR_AT[scene.dest?.location] ?? 8 * 60) - 25;
  }
  const loc = scene.event?.location;
  if (scene.time_ === "night") return loc === "home" ? 22 * 60 + 40 : 19 * 60 + 30;
  if (scene.time_ === "dusk" || scene.time_ === "evening") return 18 * 60 + 10;
  return HOUR_AT[loc] ?? 10 * 60;
}
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m) % 60).padStart(2, "0")}`;
export function taskPanel(scene, { x = 40, y = 26 } = {}) {
  const c = scene.add.container(x, y).setDepth(1500).setScrollFactor(0);
  const clock = txt(scene, 0, -4, "", { size: 34, weight: "500", color: INK.dark });
  const place = txt(scene, 0, 40, "", { size: 17, color: INK.dark });
  const task = txt(scene, 0, 78, "", { size: 18, weight: "500", color: INK.dark, wrap: 420 });
  const temp = txt(scene, VIEW.w - 2 * x, -4, "", { size: 30, weight: "500", color: INK.dark, origin: [1, 0] });
  const fx = scene.add.graphics();
  c.add([fx, clock, place, task, temp]);
  let lastKey = "";
  let dark = false;
  const t0 = scene.time.now;
  let tStart = t0;
  let m0 = null;
  const paintText = () => {
    // fondo chiaro: antracite con un alone carta appena visibile; fondo scuro: carta
    const ink = dark ? INK.paper : INK.dark;
    const sh = dark ? "rgba(14,22,30,0.7)" : "rgba(230,233,229,0.55)";
    [clock, place, task, temp].forEach((t) => {
      t.setColor(ink);
      t.setShadow(0, dark ? 2 : 0, sh, 6, false, true);
    });
  };
  const tick = () => {
    if (!clock.scene) return;
    if (m0 == null) m0 = startMinutes(scene);
    clock.setText(hhmm(m0 + (scene.time.now - tStart) / 1500));
    const out = Math.round(Bionomad.state?.out ?? 16);
    temp.setText(`${out}°C`);
  };
  const ev = scene.time.addEvent({ delay: 500, loop: true, callback: tick });
  scene.events.once("shutdown", () => ev.remove());
  const panel = {
    c,
    // le notifiche che iniziano con un orario ("18:30 · …") rimettono l'orologio a quell'ora
    setTime(line) {
      const m = /^(\d{1,2}):(\d{2})/.exec(String(line ?? ""));
      if (!m) return;
      m0 = +m[1] * 60 + +m[2];
      tStart = scene.time.now;
      tick();
    },
    // sera e interni bui: testo chiaro
    setDark(d) {
      dark = Boolean(d);
      paintText();
    },
    set(title, steps, current, opts = {}) {
      const { progress = null } = opts;
      const cut = title.indexOf(" · ");
      const name = cut > 0 ? title.slice(cut + 3) : title;
      place.setText(PLACE ? PLACE : name);
      tick();
      const now = steps[Math.min(current, steps.length - 1)] ?? "";
      const key = `${title}|${current}`;
      task.setText(now);
      const hgt = task.y + task.height + 14;
      fx.clear();
      const inkN = dark ? 0xe6e9e5 : 0x2a3034;
      // passi: trattini rettangolari (fatti pieni, attuale giallo, da fare a contorno)
      const n = steps.length;
      if (n > 1) {
        steps.forEach((_, i) => {
          if (i < current) {
            fx.fillStyle(inkN, 1);
            fx.fillRect(i * 31, hgt - 4, 26, 4);
          } else if (i === current) {
            fx.fillStyle(Y_ACCENT, 1);
            fx.fillRect(i * 31, hgt - 4, 26, 4);
          } else {
            fx.lineStyle(1, inkN, 0.7);
            fx.strokeRect(i * 31 + 0.5, hgt - 3.5, 25, 3);
          }
        });
      }
      if (progress !== null) {
        fx.lineStyle(1, inkN, 0.8);
        fx.strokeRect(0.5, hgt + 6.5, 200, 4);
        fx.fillStyle(inkN, 1);
        fx.fillRect(1, hgt + 7, 199 * progress, 3);
      }
      if (key !== lastKey && lastKey) scene.tweens.add({ targets: task, alpha: { from: 0, to: 1 }, x: { from: 8, to: 0 }, duration: 260, ease: "Cubic.easeOut" });
      lastKey = key;
      this.height = hgt;
    }
  };
  paintText();
  tick();
  return panel;
}

// comandi a schermo al centro in basso: cerchi crema con bordo verde, ◀ ▶ ● disegnati.
// Funzionano anche da tastiera (A/D o frecce, SPAZIO/E)
export function controls(scene, { action = true } = {}) {
  const st = { left: false, right: false, action: false, actionPressed: false, enabled: true };
  // tasti piccoli e discreti: vetro chiaro semitrasparente, bordo sottile, icone fini
  const size = 58;
  const gap = 12;
  const y = VIEW.h - size - 22;
  const n = action ? 3 : 2;
  const x0 = VIEW.w / 2 - (n * size + (n - 1) * gap) / 2;
  const mk = (x, key) => {
    const c = scene.add.container(x, y).setDepth(1700).setScrollFactor(0);
    const g = scene.add.graphics();
    c.add(g);
    const r = size / 2;
    const draw = (on) => {
      g.clear();
      // ombra morbida
      g.fillStyle(0x0e1624, 0.14);
      g.fillCircle(r, r + 3, r);
      // vetro chiaro (o pieno blu notte quando è premuto)
      g.fillStyle(on ? 0x2e4350 : 0xe6e9e5, on ? 0.96 : 0.82);
      g.fillCircle(r, r, r);
      g.lineStyle(1.5, on ? 0x2e4350 : 0xffffff, on ? 1 : 0.9);
      g.strokeCircle(r, r, r - 0.75);
      // disattivato (non c'è niente da fare): icona grigia
      g.fillStyle(on ? 0xe6e9e5 : c.dis ? 0x8c9893 : 0x2e4350, 1);
      if (key === "left") g.fillTriangle(r - 8, r, r + 5, r - 8, r + 5, r + 8);
      else if (key === "right") g.fillTriangle(r + 8, r, r - 5, r - 8, r - 5, r + 8);
      else {
        g.fillCircle(r, r, 6);
        g.lineStyle(1.5, on ? 0xe6e9e5 : c.dis ? 0x8c9893 : 0x2e4350, 0.5);
        g.strokeCircle(r, r, 11);
      }
    };
    draw(false);
    const zone = scene.add.zone(0, 0, size, size).setOrigin(0).setInteractive().setScrollFactor(0);
    c.add(zone);
    const set = (v) => {
      if (key === "action" && v && !st.action) st.actionPressed = true;
      st[key] = v;
      draw(v && !c.dis);
    };
    zone.on("pointerdown", () => set(true));
    zone.on("pointerup", () => set(false));
    zone.on("pointerout", () => set(false));
    return { c, draw, set };
  };
  const bl = mk(x0, "left");
  const br = mk(x0 + size + gap, "right");
  const ba = action ? mk(x0 + 2 * (size + gap), "action") : null;
  const kb = scene.input.keyboard;
  const keys = kb.addKeys("A,D,LEFT,RIGHT,SPACE,E");
  kb.on("keydown-SPACE", () => (st.actionPressed = true));
  kb.on("keydown-E", () => (st.actionPressed = true));
  return {
    st,
    // da chiamare a ogni update: ritorna -1, 0, 1 e consuma la pressione dell'azione
    poll() {
      const l = st.left || keys.A.isDown || keys.LEFT.isDown;
      const r = st.right || keys.D.isDown || keys.RIGHT.isDown;
      const serial = PlantSensors.direction;
      const pressed = st.actionPressed;
      st.actionPressed = false;
      const dir = (r ? 1 : 0) - (l ? 1 : 0);
      return { dir: st.enabled ? (dir || serial) : 0, action: st.enabled && pressed, holding: st.action || keys.SPACE.isDown || keys.E.isDown };
    },
    // il pulsante azione si accende quando c'è qualcosa da fare
    highlight(on) {
      if (!ba) return;
      // sempre presente: attivo quando serve, grigio e più trasparente quando non serve
      if (ba.c.dis === !on) return;
      ba.c.dis = !on;
      ba.draw(false);
      ba.c.setAlpha(on ? 1 : 0.6);
    },
    setVisible(v) {
      [bl, br, ba].forEach((b) => b?.c.setVisible(v));
    }
  };
}

// segnaposto: pillola chiara con il nome del punto e una freccia, cerchio a terra
export function marker(scene, x, label, { y = 520, h = 200, depth = 900 } = {}) {
  // dove andare: solo il cerchio sul pavimento, ma ben visibile: bordo a due toni (carta +
  // petrolio, si vede sia sui pavimenti chiari sia su quelli scuri), interno velato e un'onda
  // che si allarga. Vicino al punto il cerchio si riempie.
  const c = scene.add.container(x, y).setDepth(depth);
  const floor = scene.add.graphics();
  const wave = scene.add.graphics();
  c.add([floor, wave]);
  let active = false;
  const draw = () => {
    floor.clear();
    floor.fillStyle(active ? 0x2e4350 : 0xe6e9e5, active ? 0.45 : 0.3);
    floor.fillEllipse(0, h - 4, 130, 28);
    floor.lineStyle(7, 0xe6e9e5, 1);
    floor.strokeEllipse(0, h - 4, 130, 28);
    floor.lineStyle(3, 0x2e4350, 1);
    floor.strokeEllipse(0, h - 4, 130, 28);
  };
  draw();
  const wv = { k: 0 };
  scene.tweens.add({
    targets: wv,
    k: 1,
    duration: 1400,
    repeat: -1,
    onUpdate: () => {
      wave.clear();
      const a = 0.8 * (1 - wv.k);
      wave.lineStyle(4, 0xe6e9e5, a);
      wave.strokeEllipse(0, h - 4, 130 + wv.k * 100, 28 + wv.k * 22);
      wave.lineStyle(1.5, 0x2e4350, a);
      wave.strokeEllipse(0, h - 4, 130 + wv.k * 100, 28 + wv.k * 22);
    }
  });
  return {
    c,
    setActive(v) {
      if (v === active) return;
      active = v;
      draw();
    },
    setLabel() {},
    setIcon() {}
  };
}

// messaggio breve al centro in alto
export function toast(scene, s, { duration = 2200, y = 120 } = {}) {
  const c = scene.add.container(VIEW.w / 2, y).setDepth(2200).setScrollFactor(0);
  const t = txt(scene, 0, 0, s, { size: 24, origin: 0.5, wrap: 760, align: "center" });
  const g = scene.add.graphics();
  g.fillStyle(C.c0, 0.95);
  g.fillRoundedRect(-t.width / 2 - 26, -t.height / 2 - 16, t.width + 52, t.height + 32, 22);
  c.add([g, t]);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 160 });
  scene.time.delayedCall(duration, () => scene.tweens.add({ targets: c, alpha: 0, duration: 260, onComplete: () => c.destroy() }));
  return c;
}

export function fadeIn(scene, ms = 300) {
  scene.cameras.main.fadeIn(ms, 28, 40, 57);
}

export function goTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  // la scena viene riusata quando ci si torna: alla chiusura il blocco si azzera
  scene.events.once("shutdown", () => (scene._leaving = false));
  Sfx.whoosh?.();
  // force: parte anche se la dissolvenza in entrata è ancora in corso
  scene.cameras.main.fade(260, 28, 40, 57, true);
  scene.cameras.main.once("camerafadeoutcomplete", () => scene.scene.start(key, data));
}

// immagine di sfondo da un canvas, con chiave unica
export function canvasImage(scene, key, canvas, x = 0, y = 0) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  // canvas disegnato in alta risoluzione (es. i luoghi): resta nitido e vettoriale
  if (canvas._ss) addHiRes(scene, key, canvas, canvas._ss);
  else scene.textures.addCanvas(key, canvas);
  return scene.add.image(x, y, key).setOrigin(0);
}

// skyline di una città come livelli in parallasse (con cache tra le scene)
const skyCache = new Map();
export function skylineLayers(scene, cityId, build, { time = "night", zone = 0 } = {}) {
  const ck = `${cityId}_${time}_${zone}`;
  if (!skyCache.has(ck)) skyCache.set(ck, build(cityId, { viewW: VIEW.w, viewH: VIEW.h, time, zone }));
  const s = skyCache.get(ck);
  const imgs = s.layers.map(({ f, canvas }, i) => {
    const key = `sky_${ck}_${i}`;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
    return scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(f, 0).setDepth(-10 + i);
  });
  livePeople(scene, s, -10 + imgs.length - 0.5, cityId);
  return { ...s, imgs };
}

// passanti lontani sul marciapiede di fondo: sono gli stessi NPC del primo piano (stesso
// disegno, stessi abiti della città, stessa camminata a fotogrammi), solo più piccoli e
// un po' velati dalla distanza
export function livePeople(scene, sky, depth, cityId = "milano") {
  const k = sky.k ?? 1.48;
  const y0 = sky.groundY + 7 * k;
  const W = sky.worldW ?? VIEW.w * 3;
  const keys = [0, 1, 2, 3, 4].map((i) => npcKey(scene, cityId, 20 + i));
  const people = [];
  let x = 60 + Math.random() * 80;
  let n = 0;
  while (x < W) {
    const key = keys[n++ % keys.length];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const img = scene.add.image(x, y0, `${key}_0`).setOrigin(0.5, 1).setDepth(depth).setScrollFactor(1, 0);
    img.setScale(0.23 + Math.random() * 0.04).setFlipX(dir < 0).setTint(0xc4cddb);
    people.push({ img, key, x, dir, v: 16 + Math.random() * 18, ph: Math.random(), stop: 0 });
    x += 120 + Math.random() * 260;
  }
  const tick = (time, delta) => {
    const dt = Math.min(delta, 50) / 1000;
    const cam = scene.cameras.main;
    const left = cam.scrollX - 60;
    const right = cam.scrollX + VIEW.w + 60;
    people.forEach((p) => {
      if (!p.img.scene) return;
      if (p.stop > 0) {
        p.stop -= dt;
        if (p.stop <= 0) p.img.setTexture(`${p.key}_0`);
      } else {
        p.x += p.dir * p.v * dt;
        p.ph = (p.ph + p.v * dt * 0.045) % 1;
        if (Math.random() < dt * 0.03) {
          p.stop = 1 + Math.random() * 2;
          p.img.setTexture(`${p.key}_idle`);
        }
      }
      if (p.x < -30) p.x = W + 20;
      if (p.x > W + 30) p.x = -20;
      const vis = p.x > left && p.x < right;
      p.img.setVisible(vis);
      if (!vis) return;
      p.img.x = p.x;
      if (p.stop <= 0) p.img.setTexture(`${p.key}_${Math.floor(p.ph * WALK_FRAMES) % WALK_FRAMES}`);
    });
  };
  scene.events.on("update", tick);
  scene.events.once("shutdown", () => scene.events.off("update", tick));
  return people;
}

// nome della città e coordinate in alto a sinistra, etichette dei monumenti agganciate
// ai livelli della skyline (si muovono con il parallasse)
const CITY_INFO = {
  milano: { name: "Milano, Italia", co: "45.4642°N 9.1900°E" },
  delhi: { name: "New Delhi, India", co: "28.6139°N 77.2090°E" },
  reykjavik: { name: "Reykjavík, Islanda", co: "64.1466°N 21.9426°W" }
};

export function cityHud(scene, cityId, { zone = null } = {}) {
  // solo il nome del luogo (città · quartiere), mostrato nel pannello della task.
  // Niente etichette dei monumenti: si riconoscono dalla forma.
  const info = CITY_INFO[cityId] ?? CITY_INFO.milano;
  const zones = ZONES[cityId] ?? ZONES.milano;
  const z = zone == null ? null : zones[zone % zones.length];
  PLACE = info.name;
  PLACE_CO = info.co;
}

// titolo retinato: lettere con sfumatura dall'alto, righe di scansione e ombra, poi il retino
// a 5 colori del gioco (come il logo O₂RIGIN del menu). Ritorna un'immagine.
export function ditherTitle(scene, x, y, text, { size = 44, origin = 0, depth } = {}) {
  const key = `dt_${size}_${text}`;
  if (!scene.textures.exists(key)) {
    const lines = text.split("\n");
    const c = document.createElement("canvas");
    const m = c.getContext("2d", { willReadFrequently: true });
    m.font = `bold ${size}px "Roboto Mono", ui-monospace, monospace`;
    const w = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width))) + 12;
    const lh = Math.round(size * 1.25);
    c.width = w;
    c.height = lh * lines.length + 10;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.font = `bold ${size}px "Roboto Mono", ui-monospace, monospace`;
    g.textBaseline = "top";
    // titolo pulito: inchiostro blu notte, nessun retino
    lines.forEach((l, i) => {
      g.fillStyle = HEX.c4;
      g.fillText(l, 0, i * lh);
    });
    scene.textures.addCanvas(key, c);
  }
  const img = scene.add.image(x, y, key);
  if (Array.isArray(origin)) img.setOrigin(origin[0], origin[1]);
  else img.setOrigin(origin);
  if (depth !== undefined) img.setDepth(depth);
  return img;
}

// fascia retinata: sfumatura da un tono all'altro convertita nel retino (effetto ascii)
export function ditherBand(scene, x, y, w, h, { from = 0.05, to = 0.35, vertical = false, key } = {}) {
  const k = key ?? `db_${w}x${h}_${from}_${to}_${vertical ? 1 : 0}`;
  if (!scene.textures.exists(k)) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    const gr = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
    const v = (n) => Math.round(n * 255);
    // fondo pieno chiaro, con una sfumatura appena percepibile (niente retino)
    gr.addColorStop(0, "#EEF1F5");
    gr.addColorStop(1, "#E1E6EE");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    scene.textures.addCanvas(k, c);
  }
  return scene.add.image(x, y, k).setOrigin(0);
}

// avviso sotto il respiro, solo quando il BIONOMAD ha un problema (temperatura, acqua, aria)
export function statusChip(scene) {
  const c = scene.add.container(VIEW.w / 2, 94).setDepth(1500).setScrollFactor(0).setVisible(false);
  const g = scene.add.graphics();
  const t = txt(scene, 8, 0, "", { size: 14, weight: "500", origin: 0.5, color: "#262B2C" });
  c.add([g, t]);
  let last = "";
  return {
    update(time) {
      // avvisi sotto al respiro (freddo, caldo, sete, aria) tolti: lo stato del BIONOMAD
      // si vede solo dentro le task, quando si apre lo zaino
      return;
      // eslint-disable-next-line no-unreachable
      const s = Bionomad.state;
      let msg = "";
      if (s.temp < IDEAL.tMin - 1) msg = `ZAINO ${Math.round(s.temp)}°C · TROPPO FREDDO`;
      else if (s.temp > IDEAL.tMax + 1) msg = `ZAINO ${Math.round(s.temp)}°C · TROPPO CALDO`;
      else if (s.water < 0.2) msg = "IL BIONOMAD HA SETE";
      else if (s.water > 0.92) msg = "TROPPA ACQUA";
      else if (s.air < 0.3) msg = "IL BIONOMAD HA BISOGNO D'ARIA";
      if (msg !== last) {
        last = msg;
        t.setText(msg);
        g.clear();
        const w = t.width + 50;
        g.fillStyle(C.c4, 0.1);
        g.fillRoundedRect(-w / 2, -13, w, 30, 15);
        g.fillStyle(C.c0, 0.96);
        g.fillRoundedRect(-w / 2, -15, w, 30, 15);
        g.fillStyle(0x262b2c, 1);
        g.fillCircle(-w / 2 + 16, 0, 5);
      }
      c.setVisible(Boolean(msg));
      if (msg) c.setAlpha(1);
    }
  };
}

// ---------------------------------------------------------------- allerta "task in arrivo"
// Poco prima di ogni task: i bordi dello schermo pulsano in giallo due volte e in alto scende
// una pillola "TASK IN ARRIVO" con una barra che si svuota. Poi parte la notifica vera.
// Il gioco non si ferma: si può continuare a camminare. done() viene chiamato alla fine.
export function alertCue(scene, done, { ms = 1700, text = "TASK IN ARRIVO" } = {}) {
  const D = 4800;
  const all = [];
  // bordi che pulsano (cornice sfumata in giallo brand)
  const edge = scene.add.graphics().setScrollFactor(0).setDepth(D).setAlpha(0);
  for (let i = 0; i < 14; i++) {
    const w = 6 + i * 6;
    edge.lineStyle(6, 0x7d909f, 0.16 * (1 - i / 14));
    edge.strokeRect(w / 2, w / 2, VIEW.w - w, VIEW.h - w);
  }
  all.push(edge);
  scene.tweens.add({ targets: edge, alpha: 1, duration: ms / 4, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
  // pillola in alto al centro, sotto la barra del RESPIRO
  const W = 360;
  const H = 54;
  const box = scene.add.container(VIEW.w / 2, 112).setScrollFactor(0).setDepth(D + 1).setAlpha(0);
  const g = scene.add.graphics();
  g.fillStyle(0x182226, 0.18);
  g.fillRoundedRect(-W / 2 + 2, -H / 2 + 6, W, H, H / 2);
  g.fillStyle(0x1b2528, 0.94);
  g.fillRoundedRect(-W / 2, -H / 2, W, H, H / 2);
  g.fillStyle(0x7d909f, 1);
  g.fillCircle(-W / 2 + 30, 0, 15);
  const bang = txt(scene, -W / 2 + 30, 1, "!", { size: 22, weight: "700", color: "#1B2528", origin: 0.5 });
  const label = txt(scene, -W / 2 + 58, -3, text, { size: 19, weight: "700", color: "#E6E9E5", origin: [0, 0.5] });
  const bar = scene.add.graphics();
  box.add([g, bang, label, bar]);
  all.push(box);
  const prog = { p: 1 };
  const drawBar = () => {
    bar.clear();
    bar.fillStyle(0xe6e9e5, 0.18);
    bar.fillRoundedRect(-W / 2 + 58, 13, W - 90, 4, 2);
    bar.fillStyle(0x7d909f, 1);
    bar.fillRoundedRect(-W / 2 + 58, 13, Math.max(4, (W - 90) * prog.p), 4, 2);
  };
  drawBar();
  box.y = 86;
  scene.tweens.add({ targets: box, alpha: 1, y: 112, duration: 280, ease: "Back.easeOut" });
  scene.tweens.add({ targets: bang, scale: 1.25, duration: 220, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
  scene.tweens.add({ targets: prog, p: 0, duration: ms, onUpdate: drawBar });
  scene.time.delayedCall(ms, () => {
    scene.tweens.add({ targets: box, alpha: 0, y: 96, duration: 220, onComplete: () => all.forEach((o) => o.destroy()) });
    done?.();
  });
}
