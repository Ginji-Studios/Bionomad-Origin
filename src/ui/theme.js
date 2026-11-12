import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";
// tema grafico condiviso

// palette dal branding BIODOM
export const COLORS = {
  paper: 0xf1f0ed,
  bg: 0xe9eae6,
  bgSoft: 0xdde0dc,
  panel: 0xf1f0ed,
  panelLight: 0xcdd2ce,
  stone: 0xa3a9a6,
  steelLight: 0x9fb4c2,
  steel: 0x5e7f94,
  ink: 0x163c4d,
  inkDeep: 0x1c2839,
  line: 0x163c4d,
  lineLight: 0x5e7f94,
  text: 0x163c4d,
  textDim: 0x5e7f94,
  textMuted: 0x8e9a9c,
  green: 0x163c4d, // gesti di cura = inchiostro pieno
  greenDark: 0xdde3e3,
  red: 0xb4553f, // ruggine
  redDark: 0x1c2839,
  orange: 0x163c4d, // frecce di navigazione
  yellow: 0xb4553f, // evidenziazioni / obiettivi
  cyan: 0x5e7f94, // ossigeno ok
  black: 0x1c2839
};

export const FONTS = {
  pixel: '"Press Start 2P", monospace', // titoli, HUD (usare 8 / 16 / 24 / 32 / 48 px)
  body: '"VT323", monospace' // testi lunghi e descrizioni
};

export const hex = (color) => `#${color.toString(16).padStart(6, "0")}`;

// rimpicciolisce il font finché il testo non entra in `fit`
function fitWidth(label, fit, size, step) {
  let current = size;
  while (fit && label.width > fit && current > step * 2) {
    current -= step;
    label.setFontSize(current);
  }
  return label;
}

function applyOrigin(text, origin) {
  if (origin !== undefined) {
    Array.isArray(origin) ? text.setOrigin(origin[0], origin[1]) : text.setOrigin(origin);
  }
  return text;
}

// titoli ed etichette
export function pixelText(scene, x, y, text, { size = 16, color = COLORS.text, align = "left", origin, shadow = false, fit } = {}) {
  const real = Math.round(size * 1.55 + 8);
  const originY = origin === undefined ? 0 : Array.isArray(origin) ? origin[1] : origin;
  // le posizioni erano pensate per il vecchio font
  const shiftY = originY === 0 ? -Math.round((real - size) / 2) : 0;
  const label = scene.add.text(x, y + shiftY, text, {
    fontFamily: FONTS.body,
    fontSize: `${real}px`,
    color: hex(color),
    align,
    letterSpacing: size >= 16 ? 2 : 1
  });
  fitWidth(label, fit, real, 2);
  if (shadow) {
    label.setShadow(3, 3, "#9fb4c2", 0, false, true);
  }
  return applyOrigin(label, origin);
}

// "O₂" con il 2 a pedice (il VT323 non ha il carattere ₂): prefix + O + ₂ + suffix, centrato in x, y
export function o2Label(scene, x, y, { px = 24, color = COLORS.ink, prefix = "", suffix = "" } = {}) {
  const style = (size) => ({ fontFamily: FONTS.body, fontSize: `${size}px`, color: hex(color), letterSpacing: 1 });
  const c = scene.add.container(x, y);
  const parts = [
    scene.add.text(0, 0, `${prefix}O`, style(px)),
    scene.add.text(0, Math.round(px * 0.32), "2", style(Math.round(px * 0.62))),
    scene.add.text(0, 0, suffix, style(px))
  ];
  let cursor = 0;
  parts.forEach((t, i) => {
    t.x = cursor;
    cursor += t.width + (i === 1 ? 1 : 0);
  });
  parts.forEach((t) => {
    t.x -= Math.round(cursor / 2);
    t.y -= Math.round(px / 2);
  });
  c.add(parts);
  c.width = cursor;
  return c;
}

export function bodyText(scene, x, y, text, { size = 24, color = COLORS.text, align = "left", wrap, origin, lineSpacing = 0, fit } = {}) {
  const label = scene.add.text(x, y, text, {
    fontFamily: FONTS.body,
    fontSize: `${size}px`,
    color: hex(color),
    align,
    lineSpacing,
    wordWrap: wrap ? { width: wrap } : undefined
  });
  fitWidth(label, fit, size, 2);
  return applyOrigin(label, origin);
}

// rettangolo con bordo netto, niente angoli arrotondati
export function drawPanel(graphics, x, y, w, h, { fill = COLORS.panel, fillAlpha = 1, border = COLORS.line, borderWidth = 2 } = {}) {
  graphics.fillStyle(fill, fillAlpha);
  graphics.fillRect(x, y, w, h);
  if (borderWidth > 0) {
    graphics.fillStyle(border, 1);
    graphics.fillRect(x, y, w, borderWidth);
    graphics.fillRect(x, y + h - borderWidth, w, borderWidth);
    graphics.fillRect(x, y, borderWidth, h);
    graphics.fillRect(x + w - borderWidth, y, borderWidth, h);
  }
  return graphics;
}

export function panel(scene, x, y, w, h, options) {
  return drawPanel(scene.add.graphics(), x, y, w, h, options);
}

// cerchio "a gradini", come un disco disegnato a mano in pixel-art
export function pixelDisc(graphics, cx, cy, radius, color, alpha = 1, unit = 4) {
  graphics.fillStyle(color, alpha);
  for (let dy = -radius; dy < radius; dy += unit) {
    const mid = dy + unit / 2;
    const half = Math.floor(Math.sqrt(Math.max(0, radius * radius - mid * mid)) / unit) * unit;
    if (half > 0) {
      graphics.fillRect(cx - half, cy + dy, half * 2, unit);
    }
  }
  return graphics;
}

// retino a dithering (matrice di Bayer 4x4)
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export function ditherRect(graphics, x, y, w, h, color, level, cell = 2, alpha = 1) {
  graphics.fillStyle(color, alpha);
  for (let row = 0; row * cell < h; row += 1) {
    for (let col = 0; col * cell < w; col += 1) {
      if (BAYER[row % 4][col % 4] < level) {
        graphics.fillRect(x + col * cell, y + row * cell, cell, cell);
      }
    }
  }
  return graphics;
}

// ombra piena e morbida (niente retino)
export function dropShadow(graphics, x, y, w, h, offset = 6) {
  graphics.fillStyle(COLORS.inkDeep, 0.22);
  graphics.fillRect(x + offset, y + offset, w, h);
  return graphics;
}

// sfumatura a fasce piene
export function bandGradient(graphics, x, y, w, h, colors) {
  const bandH = Math.ceil(h / colors.length);
  colors.forEach((color, i) => {
    graphics.fillStyle(color, 1);
    graphics.fillRect(x, y + i * bandH, w, Math.min(bandH, h - i * bandH));
  });
  colors.forEach((color, i) => {
    if (i === 0) return;
    const edge = y + i * bandH;
    ditherRect(graphics, x, edge, w, 4, colors[i - 1], 8);
    ditherRect(graphics, x, edge - 4, w, 4, color, 4);
  });
  return graphics;
}

// sfumatura verticale a retino, da levelTop a levelBottom
export function ditherGradient(graphics, x, y, w, h, color, levelTop, levelBottom, bands = 8, cell = 4) {
  const bandH = Math.ceil(h / bands / cell) * cell;
  for (let i = 0; i < bands; i += 1) {
    const level = Math.round(levelTop + ((levelBottom - levelTop) * i) / (bands - 1));
    ditherRect(graphics, x, y + i * bandH, w, Math.min(bandH, h - i * bandH), color, level, cell);
  }
  return graphics;
}

// sfondo "carta a quadretti" come nelle tavole BIODOM
export function paperGrid(scene, { color = COLORS.bg, lines = COLORS.bgSoft, step = 48 } = {}) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(lines, 1);
  for (let x = 0; x < width; x += step) g.fillRect(x, 0, 8, height);
  for (let y = 0; y < height; y += step) g.fillRect(0, y, width, 8);
  return g;
}

// freccia pixel-art
export function pixelArrow(graphics, x, y, direction, color, unit = 6) {
  graphics.fillStyle(color, 1);
  const steps = 4;
  for (let i = 0; i < steps; i += 1) {
    const span = (i * 2 + 1) * unit;
    if (direction === "left" || direction === "right") {
      const dx = direction === "left" ? i * unit : -i * unit - unit;
      graphics.fillRect(x + dx, y - span / 2, unit, span);
    } else {
      const dy = direction === "up" ? i * unit : -i * unit - unit;
      graphics.fillRect(x - span / 2, y + dy, span, unit);
    }
  }
  const shaftLength = unit * 4;
  if (direction === "left") graphics.fillRect(x + steps * unit, y - unit, shaftLength, unit * 2);
  if (direction === "right") graphics.fillRect(x - steps * unit - shaftLength, y - unit, shaftLength, unit * 2);
  if (direction === "up") graphics.fillRect(x - unit, y + steps * unit, unit * 2, shaftLength);
  if (direction === "down") graphics.fillRect(x - unit, y - steps * unit - shaftLength, unit * 2, shaftLength);
  return graphics;
}

// barra superiore delle schermate di menu (es
export function addTopBar(scene, left, right = "BIODOM+") {
  const { width } = scene.scale;
  fadeIn(scene);
  const g = scene.add.graphics();
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(0, 0, width, 40);
  pixelText(scene, 18, 13, left, { size: 16, color: COLORS.paper });
  // a destra il logotipo vero di biodom+ in versione pixel
  if (right === "BIODOM+" && scene.textures.exists("logo_biodom")) {
    scene.add.image(width - 18, 21, "logo_biodom").setOrigin(1, 0.5).setTint(COLORS.steelLight);
  } else {
    pixelText(scene, width - 18, 13, right, { size: 16, color: COLORS.steelLight, origin: [1, 0] });
  }
  return g;
}

// HUD di gioco
export function addHud(scene, { oxygen = 1, location = "ITALIA", flag = "flag_it" } = {}) {
  const { width } = scene.scale;
  const depth = 1000;
  const fix = (obj) => obj.setDepth(depth).setScrollFactor(0);
  const g = fix(scene.add.graphics());
  // fascia scura con filetto ruggine e bordo a retino, come un'etichetta tecnica BIODOM
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(0, 0, width, 44);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, 40, width, 4);
  g.fillStyle(COLORS.red, 1);
  g.fillRect(0, 44, width, 2);
  ditherRect(g, 0, 46, width, 4, COLORS.inkDeep, 6, 2);

  // cuore in una targhetta
  drawPanel(g, 8, 6, 34, 32, { fill: 0x24344a, border: COLORS.steel, borderWidth: 2 });
  const heart = fix(scene.add.image(25, 22, "heart").setScale(2.5));
  scene.tweens.add({ targets: heart, scale: 3.1, duration: 260, yoyo: true, repeat: -1, repeatDelay: 520, ease: "Sine.easeOut" });

  fix(pixelText(scene, 52, 6, "OSSIGENO", { size: 8, color: COLORS.steelLight }));
  fix(o2Label(scene, 66, 30, { px: 20, color: COLORS.paper })).setDepth(depth);

  // barra: cornice con angoli, tacche ogni 25% e segmenti con riflesso
  const bar = { x: 150, y: 9, w: 340, h: 26 };
  const frame = fix(scene.add.graphics());
  const drawFrame = (color) => {
    frame.clear();
    drawPanel(frame, bar.x, bar.y, bar.w, bar.h, { fill: COLORS.inkDeep, border: color, borderWidth: 2 });
    frame.fillStyle(color, 1);
    // angoli rinforzati
    [[bar.x - 4, bar.y - 2], [bar.x + bar.w, bar.y - 2], [bar.x - 4, bar.y + bar.h - 6], [bar.x + bar.w, bar.y + bar.h - 6]].forEach(([x, y]) => frame.fillRect(x, y, 4, 8));
    // tacche 25 / 50 / 75
    frame.fillStyle(COLORS.steel, 1);
    [0.25, 0.5, 0.75].forEach((t) => frame.fillRect(Math.round(bar.x + 4 + (bar.w - 8) * t), bar.y + bar.h + 1, 2, 4));
  };
  drawFrame(COLORS.paper);
  const segments = fix(scene.add.graphics());

  // percentuale in una targhetta
  const chip = fix(scene.add.graphics());
  drawPanel(chip, bar.x + bar.w + 14, 8, 68, 28, { fill: 0x24344a, border: COLORS.steel, borderWidth: 2 });
  const percent = fix(pixelText(scene, bar.x + bar.w + 48, 22, "", { size: 16, origin: 0.5 }));

  // luogo: bandiera incorniciata + città, separati da un divisore
  const place = fix(pixelText(scene, width - 16, 14, location, { size: 16, color: COLORS.paper, origin: [1, 0], fit: 200 }));
  const flagFrame = fix(scene.add.graphics());
  const flagIcon = fix(scene.add.image(0, 22, flag).setScale(2));
  const placeFlag = () => {
    const fx = place.x - place.width - 24;
    flagIcon.setX(fx);
    flagFrame.clear();
    flagFrame.fillStyle(COLORS.paper, 1);
    flagFrame.fillRect(fx - 14, 11, 28, 22);
    flagFrame.fillStyle(COLORS.steel, 1);
    flagFrame.fillRect(fx - 28, 8, 2, 28);
  };
  placeFlag();

  let low = false;
  const hud = {
    oxygen,
    setOxygen(value) {
      hud.oxygen = Math.max(0, Math.min(1, value));
      const count = 33;
      const filled = Math.round(hud.oxygen * count);
      const danger = hud.oxygen < 0.35;
      const color = danger ? COLORS.red : hud.oxygen < 0.7 ? COLORS.steelLight : COLORS.paper;
      segments.clear();
      for (let i = 0; i < count; i += 1) {
        const x = bar.x + 5 + i * 10;
        if (i < filled) {
          segments.fillStyle(color, 1);
          segments.fillRect(x, bar.y + 5, 8, bar.h - 10);
          // riflesso in alto e ombra in basso: il segmento sembra una fialetta
          segments.fillStyle(0xffffff, 0.35);
          segments.fillRect(x, bar.y + 5, 8, 2);
          segments.fillStyle(COLORS.inkDeep, 0.3);
          segments.fillRect(x, bar.y + bar.h - 9, 8, 4);
        } else {
          segments.fillStyle(0x2c3e52, 1);
          segments.fillRect(x + 2, bar.y + 11, 4, 4);
        }
      }
      percent.setText(`${Math.round(hud.oxygen * 100)}%`);
      percent.setColor(hex(danger ? 0xe07a62 : COLORS.paper));
      // sotto il 35% la cornice diventa rossa
      if (danger !== low) {
        low = danger;
        if (danger) Sfx.alarm();
        drawFrame(danger ? COLORS.red : COLORS.paper);
      }
    },
    setLocation(text) {
      place.setText(text);
      placeFlag();
    }
  };
  hud.setOxygen(oxygen);
  return hud;
}

// riquadro obiettivo in basso al centro (es
export function addObjectiveBox(scene, text) {
  const { width, height } = scene.scale;
  const fix = (o, d) => o.setDepth(d).setScrollFactor(0);
  const g = fix(scene.add.graphics(), 1000);
  // stessa dimensione del testo dell'obiettivo, solo in un colore più spento
  const tag = fix(bodyText(scene, 0, 0, "OBIETTIVO", { size: 24, color: COLORS.steelLight, origin: [0, 0.5] }), 1001);
  const label = fix(bodyText(scene, 0, 0, "", { size: 24, color: COLORS.paper, origin: [0, 0.5] }), 1001);
  const cy = height - 28;

  const box = {
    hide() {
      g.setVisible(false);
      label.setVisible(false);
      tag.setVisible(false);
    },
    setText(value) {
      const changed = label.text !== value;
      label.setText(value);
      // barra compatta su una riga: linguetta con il "+" del brand, etichetta, testo
      const tab = 24;
      const w = tab + 12 + tag.width + 12 + label.width + 16;
      const h = 32;
      const x = Math.round(width / 2 - w / 2);
      const y = cy - h / 2;
      g.clear();
      drawPanel(g, x, y, w, h, { fill: COLORS.ink, border: COLORS.inkDeep, borderWidth: 2 });
      g.fillStyle(COLORS.red, 1);
      g.fillRect(x + 2, y + 2, tab, h - 4);
      g.fillStyle(COLORS.paper, 1);
      g.fillRect(x + 2 + tab / 2 - 1, cy - 5, 2, 10);
      g.fillRect(x + 2 + tab / 2 - 5, cy - 1, 10, 2);
      g.fillStyle(COLORS.steel, 1);
      g.fillRect(x + tab + 12 + tag.width + 5, y + 8, 1, h - 16);
      tag.setPosition(x + tab + 12, cy - 1);
      label.setPosition(x + tab + 12 + tag.width + 12, cy - 1);
      if (changed) {
        label.setAlpha(0).x += 10;
        scene.tweens.add({ targets: label, alpha: 1, x: label.x - 10, duration: 200, ease: "Cubic.easeOut" });
      }
    }
  };
  box.setText(text);
  return box;
}

// messaggio temporaneo sotto l'HUD
export function showToast(scene, text, { duration = 2600, color = COLORS.text, y = 116, depth = 1100 } = {}) {
  scene.toast?.destroy();
  const { width } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
  const label = bodyText(scene, width / 2, y, text, { size: 26, color, origin: 0.5, align: "center", wrap: 640 });
  const w = Math.max(220, label.width + 40);
  const h = label.height + 20;
  const g = scene.add.graphics();
  dropShadow(g, Math.round(width / 2 - w / 2), Math.round(y - h / 2), w, h);
  drawPanel(g, Math.round(width / 2 - w / 2), Math.round(y - h / 2), w, h, { fill: COLORS.paper, border: COLORS.ink });
  container.add([g, label]);
  container.setAlpha(0).setY(-10);
  scene.tweens.add({ targets: container, alpha: 1, y: 0, duration: 200, ease: "Sine.easeOut" });
  scene.toast = container;
  scene.time.delayedCall(duration, () => {
    if (scene.toast === container) {
      scene.tweens.add({ targets: container, alpha: 0, y: -10, duration: 200, onComplete: () => container.destroy() });
      scene.toast = null;
    }
  });
  return container;
}

export function addCornerHints(scene, leftText, rightText = "ESC  MENU") {
  const { width, height } = scene.scale;
  if (leftText) textChip(scene, 14, height - 30, leftText, { size: 20 });
  if (rightText) textChip(scene, width - 14, height - 30, rightText, { size: 20, originX: 1 });
}

// etichetta su "chip" di carta
export function textChip(scene, x, y, text, { originX = 0, size = 22, fill = COLORS.paper, color = COLORS.ink, depth = 1000 } = {}) {
  const label = bodyText(scene, 0, 0, text, { size, color }).setDepth(depth + 1).setScrollFactor(0);
  const w = Math.round(label.width + 22);
  const h = Math.round(label.height + 4);
  const left = Math.round(x - originX * w);
  const top = Math.round(y - h / 2);
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  // barretta d'inchiostro a sinistra e angolino ruggine: stile etichetta BIODOM
  drawPanel(g, left, top, w, h, { fill, border: COLORS.ink, borderWidth: 2 });
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(left + 2, top + 2, 4, h - 4);
  g.fillStyle(COLORS.red, 1);
  g.fillRect(left + w - 6, top + 2, 4, 4);
  label.setPosition(left + 12, top + 2);
  return { g, label };
}

// transizioni morbide tra scene (dissolvenza sul blu inchiostro)
// transizione a blocchi: una diagonale di quadretti attraversa lo schermo.
// amount 0 = scena visibile, 1 = tutta coperta; ogni blocco cresce dal centro al suo turno
const WIPE_CELL = 48;
function drawWipe(g, width, height, amount, reverse) {
  g.clear();
  if (amount <= 0) return;
  g.fillStyle(COLORS.inkDeep, 1);
  if (amount >= 1) {
    g.fillRect(0, 0, width, height);
    return;
  }
  const cols = Math.ceil(width / WIPE_CELL);
  const rows = Math.ceil(height / WIPE_CELL);
  const span = cols + rows;
  const soft = 8; // quante diagonali sono "in crescita" nello stesso momento
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const diag = reverse ? span - (x + y) : x + y;
      const local = Phaser.Math.Clamp((amount * (span + soft) - diag) / soft, 0, 1);
      if (local <= 0) continue;
      // +2 px di sovrapposizione: niente fessure tra i blocchi pieni
      const size = local >= 1 ? WIPE_CELL + 2 : Math.max(4, Math.round((WIPE_CELL * local) / 4) * 4);
      const cx = x * WIPE_CELL + WIPE_CELL / 2;
      const cy = y * WIPE_CELL + WIPE_CELL / 2;
      g.fillRect(cx - size / 2, cy - size / 2, size, size);
    }
  }
}

function wipe(scene, from, to, duration, onComplete) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(9999).setScrollFactor(0);
  // in uscita la diagonale copre da sinistra, in entrata si ritira verso destra
  const reverse = to === 0;
  const draw = (v) => drawWipe(g, width, height, reverse ? v : v, reverse);
  draw(from);
  scene.tweens.addCounter({
    from,
    to,
    duration,
    ease: "Sine.easeInOut",
    onUpdate: (t) => draw(t.getValue()),
    onComplete: () => {
      draw(to);
      if (to === 0) g.destroy();
      // un frame di attesa a schermo coperto: la scena nuova non "lampeggia"
      if (onComplete) scene.time.delayedCall(30, onComplete);
    }
  });
}

export function fadeIn(scene, duration = 280) {
  scene.transitioning = false;
  wipe(scene, 1, 0, 420);
}

export function goTo(scene, key, data) {
  if (scene.transitioning) return;
  scene.transitioning = true;
  Sfx.whoosh();
  wipe(scene, 0, 1, 380, () => scene.scene.start(key, data));
}

// scoppio di quadretti (scintille, foglie, polvere) per dare peso a un momento
export function burst(scene, x, y, { colors = [COLORS.paper], count = 12, spread = 60, depth = 990, size = 4, gravity = 40, duration = 600 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.5 + Math.random() * 0.5);
    const p = scene.add.rectangle(x, y, size, size, colors[i % colors.length]).setDepth(depth);
    scene.tweens.add({
      targets: p,
      x: Math.round(x + Math.cos(angle) * dist),
      y: Math.round(y + Math.sin(angle) * dist + gravity),
      alpha: 0,
      duration: duration + Math.random() * 200,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy()
    });
  }
}

// cartello da film: una fascia scura attraversa lo schermo con titolo e sottotitolo, poi se ne va
export function titleCard(scene, title, subtitle = "", { hold = 1300, y } = {}) {
  const { width, height } = scene.scale;
  const cy = y ?? Math.round(height / 2);
  const c = scene.add.container(0, 0).setDepth(2500).setScrollFactor(0);
  const band = scene.add.rectangle(width / 2, cy, width, 96, COLORS.inkDeep, 0.92);
  const line = scene.add.rectangle(width / 2, cy + 46, width, 4, COLORS.red);
  const big = pixelText(scene, width / 2, cy - 14, title, { size: 32, color: COLORS.paper, origin: 0.5, fit: width - 80 });
  const small = bodyText(scene, width / 2, cy + 24, subtitle, { size: 22, color: COLORS.steelLight, origin: 0.5 });
  c.add([band, line, big, small]);
  band.scaleY = 0;
  line.scaleX = 0;
  big.x = width + 400;
  small.x = -400;
  scene.tweens.add({ targets: band, scaleY: 1, duration: 200, ease: "Cubic.easeOut" });
  scene.tweens.add({ targets: line, scaleX: 1, duration: 420, delay: 120, ease: "Cubic.easeOut" });
  scene.tweens.add({ targets: [big, small], x: width / 2, duration: 420, delay: 140, ease: "Back.easeOut" });
  return new Promise((resolve) => {
    scene.time.delayedCall(hold + 500, () => {
      scene.tweens.add({ targets: big, x: -400, duration: 300, ease: "Cubic.easeIn" });
      scene.tweens.add({ targets: small, x: width + 400, duration: 300, ease: "Cubic.easeIn" });
      scene.tweens.add({ targets: [band, line], scaleY: 0, duration: 220, delay: 240, onComplete: () => { c.destroy(); resolve(); } });
    });
  });
}

// segnaposto della destinazione, nello stile BIODOM: targhetta di carta con bordo blu
// e il "+" ruggine del logo, puntale sotto, e un anello a retino che pulsa a terra
export function targetMarker(scene, { depth = 950, drop = 120 } = {}) {
  const c = scene.add.container(0, 0).setDepth(depth);
  // anello a terra (resta fermo mentre la targhetta ondeggia)
  const ring = scene.add.graphics();
  const drawRing = (g, rx, color) => {
    g.fillStyle(color, 1);
    for (let a = 0; a < 24; a += 1) {
      const t = (a / 24) * Math.PI * 2;
      if (a % 2) continue;
      g.fillRect(Math.round((Math.cos(t) * rx) / 4) * 4 - 2, Math.round((Math.sin(t) * rx * 0.32) / 2) * 2 - 1, 4, 2);
    }
  };
  drawRing(ring, 30, COLORS.red);
  drawRing(ring, 18, COLORS.ink);
  ring.y = drop;
  scene.tweens.add({ targets: ring, scaleX: 1.25, scaleY: 1.25, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  const g = scene.add.graphics();
  // ombra piena spostata, come i pannelli
  g.fillStyle(COLORS.inkDeep, 0.35);
  g.fillRect(-16, -34, 40, 40);
  // targhetta
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(-20, -38, 40, 40);
  g.fillStyle(COLORS.paper, 1);
  g.fillRect(-16, -34, 32, 32);
  // "+" del logo b+
  g.fillStyle(COLORS.red, 1);
  g.fillRect(-2, -28, 4, 20);
  g.fillRect(-10, -20, 20, 4);
  // angolini tecnici
  g.fillStyle(COLORS.steel, 1);
  [[-14, -32], [10, -32], [-14, -8], [10, -8]].forEach(([x, y]) => g.fillRect(x, y, 4, 4));
  // puntale a gradini
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(-12, 2, 24, 4);
  g.fillRect(-8, 6, 16, 4);
  g.fillRect(-4, 10, 8, 4);
  // tratteggio che scende verso il punto
  g.fillStyle(COLORS.ink, 0.6);
  for (let y = 22; y < drop - 14; y += 12) g.fillRect(-1, y, 2, 6);

  c.add([ring, g]);
  c.ring = ring;
  c.drop = drop;
  // la targhetta ondeggia; l'anello compensa e resta a terra
  c.bob = (offset) => {
    g.y = Math.round(offset);
  };
  return c;
}

// segni del brand BIODOM: "+" agli angoli, appena fuori dal riquadro, e filetti sottili
// che ne prolungano i bordi (come nelle tavole del progetto). Da usare su pannelli e foto
export function brandMarks(scene, x, y, w, h, { color = COLORS.steel, gap = 12, depth, lines = true, alpha = 1 } = {}) {
  const g = scene.add.graphics();
  if (depth !== undefined) g.setDepth(depth);
  g.setAlpha(alpha);
  const plus = (cx, cy) => {
    g.fillStyle(color, 1);
    g.fillRect(cx - 5, cy - 1, 10, 2);
    g.fillRect(cx - 1, cy - 5, 2, 10);
  };
  if (lines) {
    g.fillStyle(color, 0.35);
    g.fillRect(x - gap + 8, y - gap, w + gap * 2 - 16, 1);
    g.fillRect(x - gap + 8, y + h + gap, w + gap * 2 - 16, 1);
  }
  plus(x - gap, y - gap);
  plus(x + w + gap, y - gap);
  plus(x - gap, y + h + gap);
  plus(x + w + gap, y + h + gap);
  return g;
}

// disco a retino (Bayer), più fitto al centro: aloni, soli velati
export function ditherDisc(g, cx, cy, r, color, level, cell = 4) {
  g.fillStyle(color, 1);
  for (let y = -r; y < r; y += cell) {
    for (let x = -r; x < r; x += cell) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      const local = Math.round(level * (1 - d));
      if (BAYER[((y + r) / cell) & 3][((x + r) / cell) & 3] < local) g.fillRect(cx + x, cy + y, cell, cell);
    }
  }
}
