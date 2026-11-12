// segni dell'inquinamento nel mondo di gioco: particolato che cade, droni del consorzio,
// pannelli informativi del Protocollo di Protezione Respiratoria, torri di filtraggio
import { COLORS, ditherRect, pixelDisc } from "../ui/theme.js";
import { crowdVariant } from "../ui/pixelSprites.js";

const VIEW_W = 960;
const FONT = '"VT323", monospace';

export function mixColor(a, b, t) {
  const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// particolato: granelli scuri che scendono lenti e di sbieco (più fitti dove l'aria è peggiore)
export function addAsh(scene, level, { parallax = false, evening = false, top = 46, bottom = 540, depth = 499, x0 = 0, w = VIEW_W } = {}) {
  const amount = 0.35 + level; // 0.35 · 1.35 · 2.35
  const colors = evening ? [0x6b6a62, 0x8a8273, 0x4b5664] : [0x8a8273, 0x6e6a60, 0xa3a9a6];
  const spawn = () => {
    const size = Math.random() < 0.25 ? 3 : 2;
    const p = scene.add.rectangle(x0 + Math.random() * w, top - 4, size, size, colors[Math.floor(Math.random() * colors.length)], 0.85).setDepth(depth);
    if (parallax) p.setScrollFactor(0);
    const fall = bottom - top + 8;
    scene.tweens.add({
      targets: p,
      y: top + fall,
      x: p.x + 30 + Math.random() * 50,
      duration: 7000 + Math.random() * 5000,
      onComplete: () => p.destroy()
    });
    // piccolo ondeggiamento
    scene.tweens.add({ targets: p, alpha: 0.4, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1 });
  };
  // riempie subito la scena, poi continua
  for (let i = 0; i < Math.round(10 * amount); i += 1) {
    scene.time.delayedCall(Math.random() * 6000, spawn);
  }
  scene.time.addEvent({ delay: Math.round(520 / amount), loop: true, callback: spawn });
}

// drone del consorzio che pattuglia il cielo e ogni tanto scansiona la strada
export function addDrones(scene, { parallax = false, evening = false, depth = -8.8 } = {}) {
  const fly = () => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const drone = scene.add.container(dir > 0 ? -40 : VIEW_W + 40, 90 + Math.random() * 90).setDepth(depth);
    if (parallax) drone.setScrollFactor(0);
    const g = scene.add.graphics();
    g.fillStyle(COLORS.inkDeep, 1);
    g.fillRect(-8, -2, 16, 6); // corpo
    g.fillRect(-14, -4, 6, 2); // bracci
    g.fillRect(8, -4, 6, 2);
    g.fillStyle(COLORS.steel, 1);
    g.fillRect(-6, 4, 12, 2); // sensore
    const rotorL = scene.add.rectangle(-11, -6, 10, 2, COLORS.steelLight);
    const rotorR = scene.add.rectangle(11, -6, 10, 2, COLORS.steelLight);
    const led = scene.add.rectangle(0, 0, 2, 2, COLORS.red);
    drone.add([g, rotorL, rotorR, led]);
    scene.tweens.add({ targets: [rotorL, rotorR], scaleX: 0.3, duration: 60, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: led, alpha: 0, duration: 380, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: drone, y: drone.y + 6, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // a metà strada si ferma e scansiona: righe orizzontali che scendono a scatti, senza aloni
    const midX = 200 + Math.random() * (VIEW_W - 400);
    const dist = Math.abs(midX - drone.x);
    scene.tweens.chain({
      targets: drone,
      tweens: [
        { x: midX, duration: dist * 9 },
        {
          x: midX,
          duration: 1400,
          onStart: () => {
            for (let i = 0; i < 6; i += 1) {
              scene.time.delayedCall(i * 200, () => {
                if (!drone.active) return;
                const line = scene.add.rectangle(drone.x, drone.y + 12 + i * 10, 20 + i * 8, 2, evening ? 0xe8c66a : COLORS.red, 0.7).setDepth(depth);
                if (parallax) line.setScrollFactor(0);
                scene.tweens.add({ targets: line, alpha: 0, duration: 500, onComplete: () => line.destroy() });
              });
            }
          }
        },
        { x: dir > 0 ? VIEW_W + 40 : -40, duration: (VIEW_W - dist) * 9, onComplete: () => drone.destroy() }
      ]
    });
  };
  scene.time.delayedCall(1500, fly);
  scene.time.addEvent({ delay: 11000, loop: true, callback: fly });
}

// pannello LED del Protocollo su palo: messaggi che si alternano, sempre dentro il riquadro
export function drawAirMonitor(scene, g, x, ground, { parallax = false, factor = 0.75, messages, depth = -6, w = 132, h = 54, pole = 80 } = {}) {
  const top = ground - pole - h;
  if (pole > 0) {
    g.fillStyle(COLORS.inkDeep, 1);
    g.fillRect(x + w / 2 - 2, top + h, 4, pole);
    g.fillRect(x + w / 2 - 10, ground - 4, 20, 4);
  }
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(x - 3, top - 3, w + 6, h + 6);
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x, top, w, h);
  // trama dei led
  g.fillStyle(0x24344a, 1);
  for (let ly = top + 2; ly < top + h - 1; ly += 3) g.fillRect(x + 2, ly, w - 4, 1);
  // spia che lampeggia
  const spot = scene.add.rectangle(x + w - 8, top + 8, 4, 4, COLORS.red).setDepth(depth);
  scene.tweens.add({ targets: spot, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
  const head = scene.add.text(x + 8, top + 5, "", { fontFamily: FONT, fontSize: "16px", color: "#9fb4c2" }).setDepth(depth);
  const value = scene.add.text(x + 8, top + 24, "", { fontFamily: FONT, fontSize: "22px", color: "#f1f0ed" }).setDepth(depth);
  [spot, head, value].forEach((o) => parallax && o.setScrollFactor(factor, 1));
  // il testo si rimpicciolisce finché non sta nel pannello (niente sbordature)
  const fit = (t, text, size, maxW) => {
    t.setText(text);
    let s = size;
    t.setFontSize(s);
    while (t.width > maxW && s > 10) t.setFontSize((s -= 1));
  };
  let i = Math.floor(Math.random() * messages.length);
  const show = () => {
    const [a, b, alarm] = messages[i % messages.length];
    fit(head, a, 16, w - 26);
    fit(value, b, 22, w - 14);
    value.setColor(alarm ? "#d98a7a" : "#f1f0ed");
    i += 1;
  };
  show();
  scene.time.addEvent({ delay: 2600, loop: true, callback: show });
  return { top, bottom: top + h };
}

// torre di filtraggio biodom+ sullo sfondo: colonna con anelli e luce verde che pulsa
export function drawFilterTower(scene, g, x, ground, color, { parallax = false, factor = 0.15, depth = -8, h = 250 } = {}) {
  g.fillStyle(color, 1);
  g.fillRect(x, ground - h, 18, h);
  for (let y = ground - h + 16; y < ground - 10; y += 34) g.fillRect(x - 6, y, 30, 4);
  g.fillRect(x - 12, ground - h - 10, 42, 10);
  g.fillRect(x - 6, ground - h - 18, 30, 8);
  // bocchette di aspirazione
  g.fillStyle(mixColor(color, 0x000000, 0.25), 1);
  for (let y = ground - h + 24; y < ground - 20; y += 34) g.fillRect(x + 4, y, 10, 2);
  const light = scene.add.rectangle(x + 9, ground - h - 22, 12, 4, 0x9fd4b0).setDepth(depth);
  if (parallax) light.setScrollFactor(factor, 1);
  scene.tweens.add({ targets: light, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
}

// albero sotto la cupola di protezione: l'unico verde rimasto per strada
export function drawDomedTree(g, x, ground, pal) {
  const r = 30;
  // basamento
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x - r - 4, ground - 10, r * 2 + 8, 10);
  g.fillStyle(0x9fd4b0, 1);
  g.fillRect(x - 4, ground - 6, 8, 2);
  // alberello sano
  g.fillStyle(pal.near, 1);
  g.fillRect(x - 2, ground - 34, 4, 24);
  pixelDisc(g, x, ground - 40, 16, 0x5c7a6b, 1, 2);
  pixelDisc(g, x - 6, ground - 32, 10, 0x7fae86, 1, 2);
  // vetro: contorno della mezza sfera a pixel
  g.fillStyle(COLORS.steelLight, 1);
  for (let a = 0; a <= 180; a += 3) {
    const rad = (a * Math.PI) / 180;
    g.fillRect(Math.round(x + Math.cos(rad) * r) - 1, Math.round(ground - 10 - Math.sin(rad) * (r + 18)), 2, 2);
  }
  g.fillStyle(COLORS.paper, 1);
  for (let i = 0; i < 4; i += 1) g.fillRect(x - 18 + i * 2, ground - 44 + i * 6, 2, 6);
}

// albero secco: solo tronco e rami spogli
export function drawDeadTree(g, x, ground, color, h = 50) {
  g.fillStyle(color, 1);
  g.fillRect(x - 2, ground - h, 4, h);
  const branch = (bx, by, dx, len) => {
    for (let i = 0; i < len; i += 1) g.fillRect(bx + dx * i * 2, by - i * 2, 2, 2);
  };
  branch(x, ground - h + 10, -1, 9);
  branch(x, ground - h + 4, 1, 8);
  branch(x - 8, ground - h - 2, -1, 4);
  branch(x + 6, ground - h - 6, 1, 4);
  branch(x, ground - h + 20, 1, 6);
  g.fillRect(x - 1, ground - h - 10, 2, 10);
  // foglie secche cadute alla base
  g.fillStyle(0x8a7f66, 1);
  [-10, -4, 6, 12].forEach((d) => g.fillRect(x + d, ground - 2, 3, 2));
}

// avviso del consorzio appeso al muro: foglio con il triangolo e righe di testo (senza parole)
export function drawNotice(g, x, y, { evening = false } = {}) {
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x - 2, y - 2, 64, 84);
  g.fillStyle(evening ? 0xd6d2c8 : COLORS.paper, 1);
  g.fillRect(x, y, 60, 80);
  g.fillStyle(COLORS.red, 1);
  for (let i = 0; i < 9; i += 1) g.fillRect(x + 30 - i, y + 8 + i * 2, i * 2 + 1, 2);
  g.fillStyle(COLORS.paper, 1);
  g.fillRect(x + 29, y + 14, 2, 6);
  g.fillRect(x + 29, y + 22, 2, 2);
  g.fillStyle(COLORS.steel, 1);
  [44, 36, 44, 28, 40].forEach((w, i) => g.fillRect(x + 8, y + 36 + i * 7, w, 2));
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + 8, y + 72, 16, 2);
  g.fillStyle(0x9fd4b0, 1);
  g.fillRect(x + 46, y + 70, 6, 6);
  // puntina
  g.fillStyle(COLORS.red, 1);
  g.fillRect(x + 28, y - 4, 4, 4);
}

// purificatore d'aria a parete con la ventola che gira
export function drawPurifier(scene, x, y, { depth = 2, evening = false } = {}) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x - 2, y - 2, 84, 52);
  g.fillStyle(evening ? 0xc8ccc8 : 0xdadfda, 1);
  g.fillRect(x, y, 80, 48);
  // griglia di aspirazione
  g.fillStyle(COLORS.steel, 1);
  for (let gy = y + 6; gy < y + 42; gy += 4) g.fillRect(x + 6, gy, 36, 2);
  // ventola
  pixelDisc(g, x + 60, y + 24, 14, COLORS.inkDeep, 1, 2);
  const blades = scene.add.graphics().setDepth(depth);
  blades.fillStyle(COLORS.steelLight, 1);
  blades.fillRect(-10, -1, 20, 2);
  blades.fillRect(-1, -10, 2, 20);
  blades.setPosition(x + 60, y + 24);
  scene.tweens.add({ targets: blades, angle: 360, duration: 900, repeat: -1 });
  const led = scene.add.rectangle(x + 8, y + 44, 4, 2, 0x9fd4b0).setDepth(depth);
  scene.tweens.add({ targets: led, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
  // aria pulita che esce: pixel chiari che salgono
  scene.time.addEvent({
    delay: 500,
    loop: true,
    callback: () => {
      const p = scene.add.rectangle(x + 6 + Math.random() * 36, y - 4, 2, 2, COLORS.paper, 0.9).setDepth(depth);
      scene.tweens.add({ targets: p, y: p.y - 26, alpha: 0, duration: 1400, onComplete: () => p.destroy() });
    }
  });
  return g;
}

// nastro sigillante sugli angoli di una finestra
export function sealWindow(g, x, y, w, h) {
  g.fillStyle(0xd8cfb8, 1);
  const strip = (sx, sy, dx, dy) => {
    for (let i = 0; i < 9; i += 1) g.fillRect(sx + dx * i * 2, sy + dy * i * 2, 4, 4);
  };
  strip(x, y, 1, 1);
  strip(x + w - 4, y, -1, 1);
  strip(x, y + h - 4, 1, -1);
  strip(x + w - 4, y + h - 4, -1, -1);
}

// messaggi dei pannelli in strada
export function streetMessages(origin) {
  const pm = origin?.pm25 ?? 18;
  return [
    ["QUALITÀ DELL'ARIA", origin?.smog >= 2 ? "LETALE" : origin?.smog ? "TOSSICA" : "NOCIVA", true],
    ["PM2.5 ATTUALE", `${Math.round(pm * 9)}`, true],
    ["PROTOCOLLO ONU", "ATTIVO"],
    ["ARIA ESTERNA", "NON RESPIRABILE", true],
    ["INDOSSA IL", "PRESIDIO"],
    ["CONSORZIO", "biodom+"],
    ["SOSTA ALL'APERTO", "VIETATA", true]
  ];
}

// velatura del cielo: tinta del particolato anche nelle città "pulite"
export function skyTint(g, color, alpha, top = 46, bottom = 380) {
  g.fillStyle(color, alpha);
  g.fillRect(0, top, VIEW_W, bottom - top);
  ditherRect(g, 0, top, VIEW_W, 40, color, 3, 2, alpha + 0.2);
}

// negozio del consorzio: vetrina con gli zaini BIONOMAD esposti e l'insegna "PUNTO biodom+"
export function drawHubStore(scene, g, x, pal, { parallax = false, evening = false, ground = 380 } = {}) {
  const w = 170;
  const top = ground - 98;
  g.fillStyle(pal.near, 1);
  g.fillRect(x, top, w, 94);
  // tenda a strisce
  for (let i = 0; i < 17; i += 1) {
    g.fillStyle(i % 2 ? COLORS.paper : COLORS.ink, 1);
    g.fillRect(x + i * 10, top + 26, 10, 8);
  }
  // insegna
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + 4, top + 4, w - 8, 20);
  const sign = scene.add.text(x + 10, top + 5, "PUNTO biodom+", { fontFamily: FONT, fontSize: "18px", color: "#f1f0ed" }).setDepth(-6);
  while (sign.width > w - 34) sign.setFontSize(parseInt(sign.style.fontSize, 10) - 1);
  if (parallax) sign.setScrollFactor(0.75, 1);
  const led = scene.add.rectangle(x + w - 14, top + 14, 6, 6, 0x9fd4b0).setDepth(-6);
  if (parallax) led.setScrollFactor(0.75, 1);
  scene.tweens.add({ targets: led, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  // vetrina
  g.fillStyle(evening ? 0x2c3e52 : 0xc9d6de, 1);
  g.fillRect(x + 8, top + 38, 100, 54);
  if (evening) ditherRect(g, x + 8, top + 38, 100, 54, 0x9fd4b0, 2, 2, 0.6);
  g.fillStyle(COLORS.ink, 1);
  [top + 62, top + 88].forEach((sy) => g.fillRect(x + 8, sy, 100, 3));
  // zaini esposti: corpo blu con la piantina verde in cima
  [top + 62, top + 88].forEach((sy) => {
    for (let i = 0; i < 5; i += 1) {
      const px = x + 14 + i * 19;
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(px, sy - 16, 12, 16);
      g.fillStyle(COLORS.steel, 1);
      g.fillRect(px + 2, sy - 12, 8, 2);
      g.fillStyle(0x7fae86, 1);
      g.fillRect(px + 3, sy - 22, 2, 6);
      g.fillRect(px + 7, sy - 24, 2, 8);
    }
  });
  // porta con l'hub di prova accanto
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x + 118, top + 38, 44, 56);
  g.fillStyle(0x9fd4b0, 1);
  g.fillRect(x + 124, top + 44, 32, 2);
  return w;
}

// passanti lontani sul marciapiede: gli stessi personaggi del primo piano, solo più piccoli.
// adulti e bambini, tutti con mascherina e presidio
export function addSidewalkCrowd(scene, pal, { parallax = false, evening = false, span = 960, rand = Math.random, ground = 364, depth = -5.6 } = {}) {
  const people = [];
  const person = (x, child) => {
    const s = child ? 0.85 : 1.35;
    const p = scene.add.container(x, ground).setDepth(depth);
    if (parallax) p.setScrollFactor(0.8, 1);
    const base = crowdVariant(scene, true, { full: false });
    const pack = scene.add.image(-30 * (s / 4), -24 * (s / 4), "pack").setOrigin(0.5, 1).setScale(s);
    const body = scene.add.image(0, 0, base).setOrigin(0.5, 1).setScale(s);
    // un po' di foschia sulle figure lontane
    const tint = evening ? 0x8a96a6 : 0xd8dad6;
    pack.setTint(tint);
    body.setTint(tint);
    p.add([pack, body]);
    p.base = base;
    p.fig = body;
    people.push(p);
    return p;
  };
  const walk = (group, dir, speed) => {
    const dist = 140 + rand() * 220;
    group.forEach((p) => (p.scaleX = dir));
    scene.tweens.add({
      targets: group,
      x: `+=${dist * dir}`,
      duration: (dist / speed) * 1000,
      yoyo: true,
      repeat: -1,
      onYoyo: () => group.forEach((p) => (p.scaleX *= -1)),
      onRepeat: () => group.forEach((p) => (p.scaleX *= -1))
    });
  };
  for (let x = 30 + rand() * 80; x < span; x += 110 + rand() * 170) {
    const dir = rand() < 0.5 ? 1 : -1;
    const roll = rand();
    if (roll < 0.35) walk([person(x, false), person(x + 16 * dir, true)], dir, 14); // genitore e bambino
    else if (roll < 0.45) walk([person(x, true), person(x + 12, true)], dir, 16); // due bambini
    else walk([person(x, false)], dir, 12 + rand() * 10);
  }
  // passo: gli stessi fotogrammi della camminata dei personaggi in primo piano
  const frames = ["w1", "p1", "w2", "p2"];
  let step = 0;
  scene.time.addEvent({
    delay: 170,
    loop: true,
    callback: () => {
      step = (step + 1) % 4;
      people.forEach((p) => {
        const key = `${p.base}_${frames[step]}`;
        if (scene.textures.exists(key)) p.fig.setTexture(key);
      });
    }
  });
}
