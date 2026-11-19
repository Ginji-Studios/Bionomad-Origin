// interfaccia del gioco nello stile del concept: monospace, pannelli navy
// semitrasparenti con bordo sottile, staffe agli angoli, pulsanti grandi per il tablet.
import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { paint, quant, ZONES } from "../world/skyline.js";
import { LANDMARKS } from "../world/city.js";
import { iconKey } from "./icons.js";
import { Bionomad, IDEAL } from "../systems/Bionomad.js";

// nuovo stile (illustrazione piatta): carte chiare, inchiostro blu notte, accento giallo.
// c0 = carta, c1 = carta in ombra, c2 = evidenziato, c3 = linee e testi secondari, c4 = inchiostro
export const C = { c0: 0xf4f5f7, c1: 0xe3e8ef, c2: 0xd3dbe6, c3: 0x9aa7ba, c4: 0x24344b };
export const HEX = { c0: "#F4F5F7", c1: "#E3E8EF", c2: "#D3DBE6", c3: "#6B7B93", c4: "#24344B" };
export const Y_ACCENT = 0xe2b33c;
export const Y_HEX = "#E2B33C";
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

// RESPIRO in alto al centro: pillola minimale con ombra morbida, puntino di stato e barra sottile
export function o2Hud(scene) {
  const W = 300;
  const H = 44;
  const c = scene.add.container(Math.round(VIEW.w / 2 - W / 2), 24).setDepth(1500).setScrollFactor(0);
  const g = scene.add.graphics();
  const fx = scene.add.graphics();
  const label = txt(scene, 40, H / 2, "RESPIRO", { size: 13, color: HEX.c3, origin: [0, 0.5] });
  label.setLetterSpacing?.(2);
  const pct = txt(scene, W - 22, H / 2, "", { size: 17, weight: "500", origin: [1, 0.5] });
  c.add([g, fx, label, pct]);
  g.fillStyle(C.c4, 0.1);
  g.fillRoundedRect(0, 4, W, H, H / 2);
  g.fillStyle(C.c0, 0.96);
  g.fillRoundedRect(0, 0, W, H, H / 2);
  const BX = 128;
  const BW = 100;
  let disp = null;
  let lastPct = "";
  return {
    c,
    set(v, time = 0) {
      v = Math.max(0, Math.min(1, v));
      if (disp == null) disp = v;
      disp += (v - disp) * 0.18;
      const low = disp < 0.3;
      const col = low ? 0xb4553f : disp < 0.6 ? Y_ACCENT : 0x6fae7f;
      fx.clear();
      // puntino di stato: verde, giallo, rosso che pulsa
      fx.fillStyle(col, low ? 0.55 + 0.45 * Math.abs(Math.sin(time / 220)) : 1);
      fx.fillCircle(22, H / 2, 6);
      fx.fillStyle(C.c1, 1);
      fx.fillRoundedRect(BX, H / 2 - 3, BW, 6, 3);
      fx.fillStyle(low ? 0xb4553f : C.c4, 1);
      fx.fillRoundedRect(BX, H / 2 - 3, Math.max(6, BW * disp), 6, 3);
      const t = `${Math.round(disp * 100)}%`;
      if (t !== lastPct) {
        pct.setText(t);
        lastPct = t;
      }
    }
  };
}

// colori del HUD: blu notte su chiaro (nessun verde)
export const GREEN = { dark: 0x24344b, mid: 0x6b7b93, light: 0xb3bccb, cream: 0xf4f5f7 };
export const GREEN_HEX = { dark: "#24344B", mid: "#6B7B93", cream: "#F4F5F7" };
// testo pulito, senza bordi né ombre: i colori cambiano con lo sfondo (setDark)
const softGlow = (t) => t;

// TASK in alto a sinistra, senza riquadro: CITTÀ in grassetto spaziato, coordinate sotto,
// poi la task attuale e i passi come trattini
let PLACE = "";
let PLACE_CO = "";
export function taskPanel(scene, { x = 40, y = 30 } = {}) {
  const c = scene.add.container(x, y).setDepth(1500).setScrollFactor(0);
  const place = softGlow(txt(scene, 0, 0, "", { size: 30, weight: "700", color: GREEN_HEX.dark }));
  place.setLetterSpacing?.(3);
  const co = softGlow(txt(scene, 0, 40, "", { size: 19, color: GREEN_HEX.mid }));
  const task = softGlow(txt(scene, 0, 82, "", { size: 20, weight: "500", color: HEX.c4, wrap: 420 }));
  const fx = scene.add.graphics();
  c.add([fx, place, co, task]);
  let lastKey = "";
  let dark = false;
  let last = null;
  const paintText = () => {
    place.setColor(dark ? "#F4F5F7" : GREEN_HEX.dark);
    co.setColor(dark ? "#B3BCCB" : GREEN_HEX.mid);
    task.setColor(dark ? "#F4F5F7" : HEX.c4);
  };
  return {
    c,
    // sfondo scuro (sera, interni bui): testo crema; sfondo chiaro: verde bosco
    setDark(v) {
      dark = Boolean(v);
      paintText();
      if (last) this.set(...last);
    },
    set(title, steps, current, opts = {}) {
      last = [title, steps, current, opts];
      const { progress = null } = opts;
      const cut = title.indexOf(" · ");
      const name = cut > 0 ? title.slice(cut + 3) : title;
      place.setText((PLACE || name).toUpperCase());
      co.setText(PLACE_CO);
      const now = steps[Math.min(current, steps.length - 1)] ?? "";
      const key = `${title}|${current}`;
      task.setText(now);
      const hgt = task.y + task.height + 16;
      fx.clear();
      // passi: trattini sottili (fatti, attuale in giallo, da fare)
      const n = steps.length;
      if (n > 1) {
        steps.forEach((_, i) => {
          fx.fillStyle(i < current ? (dark ? GREEN.cream : GREEN.dark) : i === current ? Y_ACCENT : dark ? GREEN.mid : GREEN.light, 1);
          fx.fillRoundedRect(i * 31, hgt - 4, 26, 4, 2);
        });
      }
      if (progress !== null) {
        fx.fillStyle(GREEN.light, 0.6);
        fx.fillRoundedRect(0, hgt + 6, 200, 3, 1.5);
        fx.fillStyle(GREEN.dark, 1);
        fx.fillRoundedRect(0, hgt + 6, 200 * progress, 3, 1.5);
      }
      if (key !== lastKey && lastKey) scene.tweens.add({ targets: task, alpha: { from: 0, to: 1 }, x: { from: 8, to: 0 }, duration: 260, ease: "Cubic.easeOut" });
      lastKey = key;
      this.height = hgt;
    }
  };
}

// comandi a schermo al centro in basso: cerchi crema con bordo verde, ◀ ▶ ● disegnati.
// Funzionano anche da tastiera (A/D o frecce, SPAZIO/E)
export function controls(scene, { action = true } = {}) {
  const st = { left: false, right: false, action: false, actionPressed: false, enabled: true };
  const size = 84;
  const gap = 14;
  const y = VIEW.h - size - 26;
  const n = action ? 3 : 2;
  const x0 = VIEW.w / 2 - (n * size + (n - 1) * gap) / 2;
  const mk = (x, key) => {
    const c = scene.add.container(x, y).setDepth(1700).setScrollFactor(0);
    const g = scene.add.graphics();
    c.add(g);
    const r = size / 2;
    const draw = (on) => {
      g.clear();
      g.fillStyle(GREEN.dark, 0.12);
      g.fillCircle(r, r + 3, r);
      g.fillStyle(on ? GREEN.dark : GREEN.cream, on ? 1 : 0.94);
      g.fillCircle(r, r, r - 1);
      g.lineStyle(3, GREEN.dark, 1);
      g.strokeCircle(r, r, r - 2);
      g.fillStyle(on ? GREEN.cream : GREEN.dark, 1);
      if (key === "left") g.fillTriangle(r - 15, r, r + 11, r - 15, r + 11, r + 15);
      else if (key === "right") g.fillTriangle(r + 15, r, r - 11, r - 15, r - 11, r + 15);
      else g.fillCircle(r, r, 9);
    };
    draw(false);
    const zone = scene.add.zone(0, 0, size, size).setOrigin(0).setInteractive().setScrollFactor(0);
    c.add(zone);
    const set = (v) => {
      if (key === "action" && v && !st.action) st.actionPressed = true;
      st[key] = v;
      draw(v);
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
      ba.c.setAlpha(on ? 1 : 0.45);
    },
    setVisible(v) {
      [bl, br, ba].forEach((b) => b?.c.setVisible(v));
    }
  };
}

// segnaposto: pillola chiara con il nome del punto e una freccia, cerchio a terra
export function marker(scene, x, label, { y = 520, h = 200, depth = 900 } = {}) {
  const c = scene.add.container(x, y).setDepth(depth);
  const floor = scene.add.graphics();
  const card = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const t = txt(scene, 0, 0, label, { size: 17, weight: "500", origin: 0.5 });
  card.add([g, t]);
  c.add([floor, card]);
  let active = false;
  const draw = () => {
    g.clear();
    const w = t.width + 34;
    g.fillStyle(active ? C.c4 : C.c0, 0.95);
    g.fillRoundedRect(-w / 2, -18, w, 36, 18);
    g.fillTriangle(-8, 17, 8, 17, 0, 27);
    t.setColor(active ? HEX.c0 : HEX.c4);
    floor.clear();
    floor.lineStyle(3, active ? Y_ACCENT : C.c0, active ? 1 : 0.8);
    floor.strokeEllipse(0, h - 4, 90, 18);
  };
  draw();
  scene.tweens.add({ targets: card, y: -8, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return {
    c,
    setActive(v) {
      if (v === active) return;
      active = v;
      draw();
    },
    setLabel(s2) {
      t.setText(s2);
      draw();
    },
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
  scene.textures.addCanvas(key, canvas);
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
  return { ...s, imgs };
}

export const clamp = Phaser.Math.Clamp;

// nome della città e coordinate in alto a sinistra, etichette dei monumenti agganciate
// ai livelli della skyline (si muovono con il parallasse)
const CITY_INFO = {
  milano: { name: "MILANO", co: "45.4642°N 9.1900°E" },
  delhi: { name: "NEW DELHI", co: "28.6139°N 77.2090°E" },
  reykjavik: { name: "REYKJAVÍK", co: "64.1466°N 21.9426°W" }
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
  const t = txt(scene, 8, 0, "", { size: 14, weight: "500", origin: 0.5, color: "#B4553F" });
  c.add([g, t]);
  let last = "";
  return {
    update(time) {
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
        g.fillStyle(0xb4553f, 1);
        g.fillCircle(-w / 2 + 16, 0, 5);
      }
      c.setVisible(Boolean(msg));
      if (msg) c.setAlpha(1);
    }
  };
}
