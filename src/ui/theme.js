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
const BAYER = [
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
  pixelText(scene, width - 18, 13, right, { size: 16, color: COLORS.steelLight, origin: [1, 0] });
  return g;
}

// HUD di gioco
export function addHud(scene, { oxygen = 1, location = "ITALIA", flag = "flag_it" } = {}) {
  const { width } = scene.scale;
  const depth = 1000;
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(0, 0, width, 44);

  const heart = scene.add.image(26, 22, "heart").setScale(3).setDepth(depth).setScrollFactor(0);
  scene.tweens.add({ targets: heart, scale: 3.6, duration: 260, yoyo: true, repeat: -1, repeatDelay: 520, ease: "Sine.easeOut" });

  pixelText(scene, 48, 14, "OSSIGENO", { size: 16, color: COLORS.steelLight }).setDepth(depth).setScrollFactor(0);

  const bar = { x: 186, y: 9, w: 340, h: 26 };
  const frame = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  drawPanel(frame, bar.x, bar.y, bar.w, bar.h, { fill: COLORS.inkDeep, border: COLORS.paper, borderWidth: 2 });
  const segments = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  const percent = pixelText(scene, bar.x + bar.w + 18, 14, "", { size: 16 }).setDepth(depth).setScrollFactor(0);

  const place = pixelText(scene, width - 16, 14, location, { size: 16, color: COLORS.steelLight, origin: [1, 0], fit: 200 }).setDepth(depth).setScrollFactor(0);
  const flagIcon = scene.add.image(0, 22, flag).setScale(2).setDepth(depth).setScrollFactor(0);
  const placeFlag = () => flagIcon.setX(place.x - place.width - 22);
  placeFlag();

  const hud = {
    oxygen,
    setOxygen(value) {
      hud.oxygen = Math.max(0, Math.min(1, value));
      const count = 33;
      const filled = Math.round(hud.oxygen * count);
      const color = hud.oxygen < 0.35 ? COLORS.red : hud.oxygen < 0.7 ? COLORS.steelLight : COLORS.paper;
      segments.clear();
      for (let i = 0; i < count; i += 1) {
        segments.fillStyle(i < filled ? color : 0x2c3e52, 1);
        segments.fillRect(bar.x + 5 + i * 10, bar.y + 5, 8, bar.h - 10);
      }
      percent.setText(`${Math.round(hud.oxygen * 100)}%`);
      percent.setColor(hex(hud.oxygen < 0.35 ? 0xe07a62 : COLORS.paper));
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
  const g = scene.add.graphics().setDepth(1000).setScrollFactor(0);
  const label = pixelText(scene, width / 2, height - 30, "", { size: 16, color: COLORS.paper, origin: 0.5 }).setDepth(1001).setScrollFactor(0);

  const box = {
    hide() {
      g.setVisible(false);
      label.setVisible(false);
    },
    setText(value) {
      label.setText(value);
      const w = label.width + 48;
      const h = 44;
      g.clear();
      const x = Math.round(width / 2 - w / 2);
      const y = height - 30 - h / 2;
      dropShadow(g, x, y, w, h);
      drawPanel(g, x, y, w, h, { fill: COLORS.ink, border: COLORS.inkDeep, borderWidth: 2 });
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
  const w = Math.round(label.width + 14);
  const h = Math.round(label.height + 2);
  const left = Math.round(x - originX * w);
  const top = Math.round(y - h / 2);
  const g = drawPanel(scene.add.graphics().setDepth(depth).setScrollFactor(0), left, top, w, h, { fill, border: COLORS.ink, borderWidth: 2 });
  label.setPosition(left + 7, top + 1);
  return { g, label };
}

// transizioni morbide tra scene (dissolvenza sul blu inchiostro)
export function fadeIn(scene, duration = 280) {
  scene.transitioning = false;
  scene.cameras.main.fadeIn(duration, 28, 40, 57);
}

export function goTo(scene, key, data) {
  if (scene.transitioning) return;
  scene.transitioning = true;
  scene.cameras.main.fadeOut(220, 28, 40, 57);
  scene.cameras.main.once("camerafadeoutcomplete", () => scene.scene.start(key, data));
}
