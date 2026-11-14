// interfaccia del gioco nello stile del concept: monospace, pannelli navy
// semitrasparenti con bordo sottile, staffe agli angoli, pulsanti grandi per il tablet.
import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";
import { quant } from "../world/skyline.js";
import { iconKey } from "./icons.js";

export const C = { c0: 0x1c2839, c1: 0x2d3d52, c2: 0x304e6a, c3: 0x5e6d88, c4: 0xf1f0ed };
export const HEX = { c0: "#1C2839", c1: "#2D3D52", c2: "#304E6A", c3: "#5E6D88", c4: "#F1F0ED" };
export const FONT = '"Roboto Mono", ui-monospace, Menlo, monospace';
export const VIEW = { w: 1280, h: 800 };

export function txt(scene, x, y, s, { size = 22, color = HEX.c4, origin = 0, wrap, align = "left", weight = "400", depth } = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: weight === "500" ? "bold" : "normal",
    color,
    align,
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: Math.round(size * 0.3)
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
export function brackets(scene, { inset = 14, len = 38, depth = 1500 } = {}) {
  const { w, h } = VIEW;
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  g.lineStyle(2, C.c4, 0.7);
  const corner = (x, y, dx, dy) => {
    g.beginPath();
    g.moveTo(x, y + dy * len);
    g.lineTo(x, y);
    g.lineTo(x + dx * len, y);
    g.strokePath();
  };
  corner(inset, inset, 1, 1);
  corner(w - inset, inset, -1, 1);
  corner(inset, h - inset, 1, -1);
  corner(w - inset, h - inset, -1, -1);
  return g;
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
  // nodi agli angoli, come i riquadri del fascicolo
  const nodes = () => {
    g.fillStyle(C.c4, 1);
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([nx, ny]) => g.fillRect(nx - 3, ny - 3, 6, 6));
  };
  const draw = () => {
    g.clear();
    const fillOn = selected || down;
    if (over && !fillOn) {
      g.fillStyle(C.c2, 0.95);
      g.fillRect(0, 0, w, h);
      g.lineStyle(2, C.c4, 1);
      g.strokeRect(1, 1, w - 2, h - 2);
      nodes();
      t.setColor(HEX.c4);
      return;
    }
    g.fillStyle(fillOn ? C.c4 : C.c0, fillOn ? 1 : 0.85);
    g.fillRect(0, 0, w, h);
    g.lineStyle(2, fillOn ? C.c4 : C.c3, 1);
    g.strokeRect(1, 1, w - 2, h - 2);
    nodes();
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

// RESPIRO in alto a sinistra: etichetta + barra a 10 segmenti
export function o2Hud(scene, { x = VIEW.w / 2 - 166, y = 30 } = {}) {
  const c = scene.add.container(x, y).setDepth(1500).setScrollFactor(0);
  const label = txt(scene, 135, 0, "RESPIRO", { size: 20, origin: [0.5, 0] });
  const g = scene.add.graphics();
  const pct = txt(scene, 0, 0, "", { size: 20 });
  c.add([label, g, pct]);
  const segW = 22;
  const gap = 5;
  const bx = 0;
  const by = 34;
  let last = -1;
  let blink = 0;
  return {
    c,
    set(v, time = 0) {
      const n = Math.max(0, Math.min(10, Math.ceil(v * 10 - 0.001)));
      const low = v < 0.3;
      const on = !low || Math.floor(time / 300) % 2 === 0;
      if (n === last && blink === on) return;
      last = n;
      blink = on;
      g.clear();
      for (let i = 0; i < 10; i += 1) {
        const sx = bx + i * (segW + gap);
        if (i < n && on) {
          g.fillStyle(C.c4, 1);
          g.fillRect(sx, by, segW, 22);
        } else {
          g.lineStyle(2, C.c3, 1);
          g.strokeRect(sx + 1, by + 1, segW - 2, 20);
        }
      }
      pct.setText(`${Math.round(v * 100)}%`).setPosition(bx + 10 * (segW + gap) + 8, by);
    }
  };
}

// pannello TASK a sinistra: un elenco breve, la task attuale evidenziata
export function taskPanel(scene, { x = 40, y = 112, w = 330 } = {}) {
  const c = scene.add.container(x, y).setDepth(1500).setScrollFactor(0);
  let rows = [];
  let anims = [];
  let last = { title: null, current: -1 };
  let fx = null; // { title, idx, t0 } della riga appena completata
  const FX_MS = 1100;
  const bg = scene.add.graphics();
  c.add(bg);
  // barratura "a retino": una testina luminosa scorre sul testo lasciando una riga
  // a pixel, poi la spunta compare con un piccolo rimbalzo e salgono tre bollicine di O₂.
  // È guidata dal tempo trascorso, così sopravvive ai ridisegni del pannello.
  const strike = (t, m, elapsed) => {
    const g = scene.add.graphics();
    c.add(g);
    rows.push(g);
    const x0 = t.x - 4;
    const lineW = Math.min(t.width, w - 66) + 8;
    const ly = t.y + Math.min(t.height, 30) / 2;
    const draw = (ms) => {
      g.clear();
      const p = ((u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)))(Math.min(1, ms / 520));
      const len = Math.round(lineW * p);
      g.fillStyle(C.c3, 1);
      for (let i = 0; i < len; i += 2) g.fillRect(x0 + i, ly + ((i >> 1) % 2), 2, 2);
      if (p < 1) {
        g.fillStyle(C.c4, 1);
        g.fillRect(x0 + len - 4, ly - 6, 6, 14);
        g.fillStyle(C.c4, 0.5);
        g.fillRect(x0 + len - 14, ly - 3, 8, 8);
      }
      const q = Phaser.Math.Clamp((ms - 520) / 260, 0, 1);
      if (m.active) m.setScale(q === 0 ? 0 : 1 + 2.7 * Math.pow(q - 1, 3) + 1.7 * Math.pow(q - 1, 2));
      const r = Phaser.Math.Clamp((ms - 520) / 580, 0, 1);
      if (r > 0 && r < 1) {
        g.fillStyle(C.c4, 1 - r);
        for (let i = 0; i < 3; i++) g.fillRect(x0 + lineW * (0.3 + i * 0.25) - 2, ly - 2 - r * (26 + i * 6), 4, 4);
      }
    };
    if (elapsed >= FX_MS) return draw(FX_MS);
    draw(elapsed);
    anims.push(scene.tweens.addCounter({
      from: elapsed, to: FX_MS, duration: FX_MS - elapsed,
      onUpdate: (tw) => g.active && draw(tw.getValue())
    }));
  };
  return {
    c,
    set(title, steps, current, { progress = null } = {}) {
      anims.forEach((a) => a.stop && a.stop());
      anims = [];
      rows.forEach((r) => r.destroy());
      rows = [];
      bg.clear();
      if (last.title === title && current > last.current && last.current >= 0) fx = { title, idx: last.current, t0: scene.time.now };
      last = { title, current };
      const head = txt(scene, 18, 14, title, { size: 18, color: HEX.c3, wrap: w - 36 });
      c.add(head);
      rows.push(head);
      let yy = head.y + head.height + 14;
      steps.forEach((s, i) => {
        const done = i < current;
        const now = i === current;
        const mark = done ? "✓" : now ? "▶" : "·";
        const t = txt(scene, 50, yy, s, { size: now ? 24 : 20, color: now ? HEX.c0 : done ? HEX.c3 : HEX.c4, wrap: w - 66 });
        const m = txt(scene, 22, yy, mark, { size: now ? 24 : 20, color: now ? HEX.c0 : done ? HEX.c3 : HEX.c4 });
        if (now) {
          const hl = scene.add.graphics();
          hl.fillStyle(C.c4, 1);
          hl.fillRect(8, yy - 8, w - 16, t.height + 16);
          if (progress !== null) {
            hl.fillStyle(C.c2, 1);
            hl.fillRect(8, yy + t.height + 4, Math.round((w - 16) * progress), 4);
          }
          c.add(hl);
          rows.push(hl);
        }
        c.add([m, t]);
        rows.push(m, t);
        if (done) strike(t, m, fx && fx.title === title && fx.idx === i ? scene.time.now - fx.t0 : FX_MS);
        yy += t.height + (now ? 24 : 14);
      });
      const hgt = yy + 4;
      bg.fillStyle(C.c0, 0.82);
      bg.fillRect(0, 0, w, hgt);
      bg.lineStyle(2, C.c3, 1);
      bg.strokeRect(1, 1, w - 2, hgt - 2);
      this.height = hgt;
    }
  };
}

// comandi a schermo: frecce grandi a sinistra, pulsante azione a destra.
// Funzionano anche da tastiera (A/D o frecce, SPAZIO/E)
export function controls(scene, { action = true } = {}) {
  const st = { left: false, right: false, action: false, actionPressed: false, enabled: true };
  const size = 118;
  const y = VIEW.h - size - 28;
  const mk = (x, label, key) => {
    const c = scene.add.container(x, y).setDepth(1700).setScrollFactor(0);
    const g = scene.add.graphics();
    const t = txt(scene, size / 2, size / 2, label, { size: key === "action" ? 44 : 40, origin: 0.5 });
    c.add([g, t]);
    const draw = (on) => {
      g.clear();
      g.fillStyle(on ? C.c4 : C.c0, on ? 1 : 0.7);
      g.fillRect(0, 0, size, size);
      g.lineStyle(2, on ? C.c4 : C.c3, 1);
      g.strokeRect(1, 1, size - 2, size - 2);
      t.setColor(on ? HEX.c0 : HEX.c4);
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
    return { c, draw, set, label: t };
  };
  const bl = mk(40, "◀", "left");
  const br = mk(40 + size + 16, "▶", "right");
  const ba = action ? mk(VIEW.w - size - 40, "●", "action") : null;
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
      const pressed = st.actionPressed;
      st.actionPressed = false;
      return { dir: st.enabled ? (r ? 1 : 0) - (l ? 1 : 0) : 0, action: st.enabled && pressed, holding: st.action || keys.SPACE.isDown || keys.E.isDown };
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

// segnaposto del concept: riquadro con etichetta sopra e "+" al centro
export function marker(scene, x, label, { y = 520, w = 110, h = 200, depth = 900, icon = null } = {}) {
  // riquadro con dentro l'oggetto da usare, sospeso sopra il punto; una linea tratteggiata
  // scende fino al pavimento dove c'è la staffa d'arrivo. Vicino: il riquadro si accende.
  const CARD = 116;
  const c = scene.add.container(x, y).setDepth(depth);
  const floor = scene.add.graphics();
  const card = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const img = scene.add.image(0, 0, "__DEFAULT").setVisible(false);
  const tb = scene.add.graphics();
  const t = txt(scene, 0, -CARD / 2 - 12, label, { size: 18, origin: [0.5, 1] });
  card.add([g, img, tb, t]);
  c.add([floor, card]);
  card.y = -40; // centro del riquadro, sopra le teste
  let active = false;
  const draw = () => {
    g.clear();
    g.fillStyle(C.c0, 0.92);
    g.fillRect(-CARD / 2, -CARD / 2, CARD, CARD);
    g.lineStyle(active ? 3 : 2, active ? C.c4 : C.c3, 1);
    g.strokeRect(-CARD / 2, -CARD / 2, CARD, CARD);
    g.fillStyle(C.c4, 1);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => g.fillRect((sx * CARD) / 2 - 3, (sy * CARD) / 2 - 3, 6, 6));
    // linguetta che punta in basso
    g.fillStyle(active ? C.c4 : C.c3, 1);
    g.fillTriangle(-8, CARD / 2, 8, CARD / 2, 0, CARD / 2 + 10);
    tb.clear();
    tb.fillStyle(active ? C.c4 : C.c0, 0.95);
    tb.fillRect(-t.width / 2 - 8, t.y - t.height - 4, t.width + 16, t.height + 8);
    t.setColor(active ? HEX.c0 : HEX.c4);
    // tratteggio fino a terra e staffa sul pavimento
    floor.clear();
    const y0 = card.y + CARD / 2 + 14;
    floor.fillStyle(C.c4, active ? 0.9 : 0.5);
    for (let yy = y0; yy < h - 6; yy += 10) floor.fillRect(-1, yy, 2, 5);
    floor.lineStyle(3, C.c4, active ? 1 : 0.7);
    floor.beginPath();
    floor.moveTo(-40, h - 12);
    floor.lineTo(-40, h);
    floor.lineTo(40, h);
    floor.lineTo(40, h - 12);
    floor.strokePath();
  };
  const setIcon = (name) => {
    if (!name) return img.setVisible(false);
    img.setTexture(iconKey(scene, name)).setVisible(true);
  };
  setIcon(icon);
  draw();
  // il riquadro galleggia appena
  scene.tweens.add({ targets: card, y: card.y - 6, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return {
    c,
    setActive(v) {
      if (v === active) return;
      active = v;
      card.setScale(v ? 1.08 : 1);
      draw();
    },
    setLabel(s, iconName) {
      t.setText(s);
      if (iconName !== undefined) setIcon(iconName);
      draw();
    },
    setIcon
  };
}

// messaggio breve al centro in alto
export function toast(scene, s, { duration = 2200, y = 120 } = {}) {
  const c = scene.add.container(VIEW.w / 2, y).setDepth(2200).setScrollFactor(0);
  const t = txt(scene, 0, 0, s, { size: 24, origin: 0.5, wrap: 760, align: "center" });
  const g = scene.add.graphics();
  g.fillStyle(C.c0, 0.92);
  g.fillRect(-t.width / 2 - 22, -t.height / 2 - 14, t.width + 44, t.height + 28);
  g.lineStyle(2, C.c4, 1);
  g.strokeRect(-t.width / 2 - 21, -t.height / 2 - 13, t.width + 42, t.height + 26);
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
export function skylineLayers(scene, cityId, build, { time = "night" } = {}) {
  const ck = `${cityId}_${time}`;
  if (!skyCache.has(ck)) skyCache.set(ck, build(cityId, { viewW: VIEW.w, viewH: VIEW.h, time }));
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
const LANDMARKS = {
  milano: [["[01] Duomo", 1, 520, 112], ["[02] Torre Velasca", 0.55, 150, 300], ["[03] Pirellone", 0.55, 330, 292], ["[04] Torre Unicredit", 0.55, 600, 182], ["[05] Allianz", 0.55, 840, 212], ["[06] Palazzo Lombardia", 0.55, 1180, 268], ["[07] Bosco Verticale", 0.55, 1415, 328], ["[08] Galleria V. Emanuele II", 1, 1250, 224], ["[09] Castello Sforzesco", 1, 2260, 60]],
  delhi: [["[01] India Gate", 1, 520, 252], ["[02] Rashtrapati Bhavan", 1, 1750, 265], ["[03] Qutub Minar", 0.55, 500, 200], ["[04] Tomba di Humayun", 0.55, 1000, 285], ["[05] Tempio del Loto", 0.55, 1500, 325], ["[06] Akshardham", 0.55, 1800, 280]],
  reykjavik: [["[01] Hallgrímskirkja", 1, 520, 80], ["[02] Perlan", 0.55, 700, 325], ["[03] Harpa", 0.55, 1300, 358], ["[04] Esja", 0.12, 600, 270]]
};

export function cityHud(scene, cityId, { labels = true, k = VIEW.h / 540 } = {}) {
  const info = CITY_INFO[cityId] ?? CITY_INFO.milano;
  txt(scene, 40, 30, info.name, { size: 20, depth: 1500 }).setScrollFactor(0);
  txt(scene, 40, 56, info.co, { size: 18, color: HEX.c3, depth: 1500 }).setScrollFactor(0);
  if (!labels) return;
  const list = [];
  (LANDMARKS[cityId] ?? []).forEach(([label, f, x, y]) => {
    const t = txt(scene, 5, -3, label, { size: 15, origin: [0, 1] });
    const g = scene.add.graphics();
    g.fillStyle(C.c0, 0.8);
    g.fillRect(0, -t.height - 6, t.width + 10, t.height + 6);
    g.lineStyle(1, C.c3, 1);
    g.strokeRect(0.5, -t.height - 5.5, t.width + 9, t.height + 5);
    const c = scene.add.container(Math.round(x * k), Math.round(y * k), [g, t]).setScrollFactor(f, 0).setDepth(-2);
    list.push({ c, f, w: t.width + 10 });
  });
  // le etichette compaiono solo nella zona libera dello schermo (non sotto il pannello task)
  scene.events.on("update", () => {
    const cam = scene.cameras.main;
    list.forEach(({ c, f, w }) => {
      const sx = c.x - cam.scrollX * f;
      c.setVisible(sx > 390 && sx + w < VIEW.w - 30);
    });
  });
}

// titolo retinato: lettere con sfumatura dall'alto, righe di scansione e ombra, poi il retino
// a 5 colori del gioco (come il logo O₂RIGIN del menu). Ritorna un'immagine.
export function ditherTitle(scene, x, y, text, { size = 44, origin = 0, depth } = {}) {
  const key = `dt_${size}_${text}`;
  if (!scene.textures.exists(key)) {
    const lines = text.split("\n");
    const c = document.createElement("canvas");
    const m = c.getContext("2d");
    m.font = `bold ${size}px "Roboto Mono", ui-monospace, monospace`;
    const w = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width))) + 12;
    const lh = Math.round(size * 1.25);
    c.width = w;
    c.height = lh * lines.length + 10;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.font = `bold ${size}px "Roboto Mono", ui-monospace, monospace`;
    g.textBaseline = "top";
    lines.forEach((l, i) => {
      g.fillStyle = "rgb(55,55,55)";
      g.fillText(l, Math.round(size / 16) + 2, i * lh + Math.round(size / 16) + 2);
    });
    lines.forEach((l, i) => {
      const gr = g.createLinearGradient(0, i * lh, 0, i * lh + size);
      gr.addColorStop(0, "rgb(255,255,255)");
      gr.addColorStop(0.6, "rgb(228,228,228)");
      gr.addColorStop(1, "rgb(140,140,140)");
      g.fillStyle = gr;
      g.fillText(l, 0, i * lh);
    });
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(0,0,0,0.16)";
    for (let yy = 0; yy < c.height; yy += 4) g.fillRect(0, yy, c.width, 1);
    g.globalCompositeOperation = "source-over";
    quant(c, 2);
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
    gr.addColorStop(0, `rgb(${v(from)},${v(from)},${v(from)})`);
    gr.addColorStop(1, `rgb(${v(to)},${v(to)},${v(to)})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    quant(c, 2);
    scene.textures.addCanvas(k, c);
  }
  return scene.add.image(x, y, k).setOrigin(0);
}
