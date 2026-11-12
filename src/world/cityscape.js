// città disegnata a livelli, con parallasse quando la
import { BAYER, COLORS, bandGradient, ditherRect, pixelDisc } from "../ui/theme.js";
import { ORIGINS } from "../config/origins.js";

const HORIZON = 380;
const VIEW_W = 960;

const PALETTES = {
  delhi: { sky: [0xe6dcc6, 0xdccfb2, 0xd0c09f, 0xc4b28e], far: 0xc4b596, mid: 0x9e8e70, near: 0x766953, window: 0xe2d6bd, tree: 0x7c8a5e },
  milano: { sky: [0xeceeea, 0xdfe4e3, 0xd2dadd, 0xc4d0d6], far: 0xb3c4cf, mid: 0x6f8ea2, near: 0x3f5a6c, window: 0xc9d6de, tree: 0x5c7a6b },
  reykjavik: { sky: [0xf0f4f5, 0xe1eaef, 0xd0dfe8, 0xbfd4e1], far: 0xb8cbd8, mid: 0x7495aa, near: 0x46627a, window: 0xd6e3eb, tree: 0x5c7a6b }
};
const EVENING = { sky: [0x34485e, 0x2c3e52, 0x25354a, 0x1f2c40], far: 0x3a4f66, mid: 0x26374c, near: 0x172231, window: 0xe8c66a, tree: 0x22324a };

// generatore pseudo-casuale con seme
function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function layer(scene, factor, parallax, depth) {
  const g = scene.add.graphics().setDepth(depth);
  if (parallax) g.setScrollFactor(factor, 1);
  return g;
}

// quartieri
export const ZONES = ["centro", "residenziale", "parco", "industriale"];

let snowyRoofs = false;
// stile architettonico della città corrente (facciate, tetti, dettagli tipici)
let cityStyle = "milano";
let cityEvening = false;

// colori delle facciate tipici per città (di giorno); di sera si scuriscono verso il blu
const FACADES = {
  milano: [0xd9b48c, 0xc98552, 0xe2d6bd, 0x9fb4c2, 0x5e7f94],
  delhi: [0xd98a9a, 0x7fb0aa, 0xe8c66a, 0xc98552, 0xe2d6bd],
  reykjavik: [0xb4553f, 0xe8c66a, 0x5e7f94, 0xf1f0ed, 0x163c4d]
};
function mixC(a, b, t) {
  const ch = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
function facade(rand, pal) {
  const list = FACADES[cityStyle] ?? FACADES.milano;
  const c = list[Math.floor(rand() * list.length)];
  // un po' di foschia/distanza: il colore si avvicina a quello del livello
  // i colori locali sono solo un accento: dominano sempre i toni BIODOM del livello
  return cityEvening ? mixC(c, pal.mid, 0.8) : mixC(c, pal.mid, 0.6);
}

export function drawCityscape(scene, originId, { evening = false, width = VIEW_W, parallax = false, sun = true, zone = "centro" } = {}) {
  const pal = evening ? { ...PALETTES[originId] ?? PALETTES.milano, ...EVENING } : PALETTES[originId] ?? PALETTES.milano;
  const rand = seeded(originId.length * 7919 + (evening ? 13 : 0) + ZONES.indexOf(zone) * 1031);
  snowyRoofs = originId === "reykjavik";
  cityStyle = originId;
  cityEvening = evening;
  const span = (f) => (parallax ? Math.ceil(VIEW_W + (width - VIEW_W) * f) + 80 : width);

  // cielo
  const sky = layer(scene, 0, parallax, -10);
  bandGradient(sky, 0, 46, VIEW_W, HORIZON - 46, pal.sky);
  if (evening) {
    sky.fillStyle(COLORS.paper, 0.8);
    for (let i = 0; i < 40; i += 1) sky.fillRect(Math.floor(rand() * VIEW_W), 50 + Math.floor(rand() * 150), 2, 2);
  }
  if (sun) {
    const sunColor = evening ? 0xdadfda : COLORS.paper;
    pixelDisc(sky, 760, 132, evening ? 24 : 40, sunColor, 1, 2);
    if (!evening) ditherRect(sky, 720, 100, 80, 64, pal.sky[1], 2);
  }

  // nuvole a retino che scorrono piano
  for (let i = 0; i < 4; i += 1) {
    const cloud = layer(scene, 0.03, parallax, -9);
    const cw = 80 + Math.floor(rand() * 90);
    const color = evening ? 0x3a4f66 : COLORS.paper;
    for (let k = 0; k < 4; k += 1) pixelDisc(cloud, Math.floor((k * cw) / 4), Math.floor(rand() * 10), 14 + Math.floor(rand() * 12), color, 1, 2);
    cloud.fillStyle(color, 1);
    cloud.fillRect(-10, 6, cw + 10, 14);
    ditherRect(cloud, -10, 16, cw + 10, 8, evening ? 0x2c3e52 : pal.sky[2], 6);
    cloud.setPosition(Math.floor(rand() * VIEW_W), 70 + Math.floor(rand() * 90));
    scene.tweens.add({ targets: cloud, x: cloud.x + 200, duration: 40000 + rand() * 20000, yoyo: true, repeat: -1 });
  }

  // skyline lontano
  const far = layer(scene, 0.15, parallax, -8);
  for (let x = -20; x < span(0.15); ) {
    const w = 26 + Math.floor(rand() * 54);
    const h = 90 + Math.floor(rand() * 150);
    far.fillStyle(pal.far, 1);
    far.fillRect(x, HORIZON - h, w, h);
    if (rand() < 0.35) far.fillRect(x + Math.floor(w / 2), HORIZON - h - 24, 2, 24); // antenna
    ditherRect(far, x + w - 8, HORIZON - h, 8, h, pal.mid, 4);
    far.fillStyle(pal.window, 0.7);
    for (let wy = HORIZON - h + 10; wy < HORIZON - 30; wy += 14) {
      for (let wx = x + 4; wx < x + w - 10; wx += 8) if (rand() < 0.25) far.fillRect(wx, wy, 2, 4);
    }
    x += w + Math.floor(rand() * 10);
  }
  // profili tipici sullo sfondo
  if (originId === "reykjavik") {
    // monte Esja innevato dietro la città
    const esja = layer(scene, 0.08, parallax, -8.5);
    for (let mx = -40; mx < span(0.08); mx += 380) {
      for (let i = 0; i < 150; i += 4) {
        esja.fillStyle(i < 30 ? 0xf1f0ed : pal.far, 1);
        esja.fillRect(mx + 190 - i * 1.6, HORIZON - 230 + i, i * 3.2, 4);
      }
    }
  } else if (originId === "delhi") {
    // minareti e cupole (Jama Masjid) e il Qutub Minar
    for (let mx = 120; mx < span(0.15); mx += 700) {
      far.fillStyle(pal.mid, 1);
      far.fillRect(mx, HORIZON - 120, 140, 120);
      pixelDisc(far, mx + 70, HORIZON - 120, 34, pal.mid, 1, 2);
      pixelDisc(far, mx + 28, HORIZON - 120, 18, pal.mid, 1, 2);
      pixelDisc(far, mx + 112, HORIZON - 120, 18, pal.mid, 1, 2);
      [mx - 10, mx + 146].forEach((tx) => {
        far.fillRect(tx, HORIZON - 230, 6, 230);
        far.fillRect(tx - 2, HORIZON - 236, 10, 6);
      });
      for (let i = 0; i < 5; i += 1) far.fillRect(mx + 360 + i, HORIZON - 260 + i * 50, 22 - i * 2, 50);
    }
  } else {
    // grattacieli di Porta Nuova con la guglia e il Pirellone
    for (let mx = 200; mx < span(0.15); mx += 820) {
      far.fillStyle(pal.mid, 1);
      far.fillRect(mx, HORIZON - 250, 40, 250);
      far.fillRect(mx + 18, HORIZON - 300, 4, 50);
      far.fillRect(mx + 40, HORIZON - 200, 30, 200);
      far.fillRect(mx + 300, HORIZON - 220, 70, 220);
      ditherRect(far, mx + 300, HORIZON - 220, 70, 8, pal.sky[0], 6, 2);
      // bosco verticale: due torri con i terrazzi verdi
      [mx + 470, mx + 520].forEach((bx, k) => {
        far.fillStyle(pal.mid, 1);
        far.fillRect(bx, HORIZON - 180 - k * 30, 34, 180 + k * 30);
        ditherRect(far, bx - 4, HORIZON - 176 - k * 30, 42, 172 + k * 30, pal.tree, 6, 2);
      });
    }
  }
  ditherRect(far, 0, HORIZON - 70, span(0.15), 70, pal.sky[3], 4);

  // edifici e monumenti
  const mid = layer(scene, 0.4, parallax, -7);
  const midSpan = span(0.4);
  const landmarkEvery = 1300;
  if (zone === "centro") {
    for (let x = -20; x < midSpan; ) {
      // ogni tanto lascia spazio a un monumento
      if (Math.floor(x / landmarkEvery) !== Math.floor((x - 1) / landmarkEvery) && x > 0) x += 340;
      const w = 60 + Math.floor(rand() * 80);
      const h = 90 + Math.floor(rand() * 120);
      drawBuilding(mid, x, w, h, pal, rand, evening);
      x += w + 6 + Math.floor(rand() * 30);
    }
    for (let lx = 140; lx < midSpan; lx += landmarkEvery) {
      const g = layer(scene, 0.4, parallax, -7);
      g.fillStyle(pal.mid, 1);
      drawLandmark(g, originId, lx, pal);
    }
  } else if (zone === "residenziale") {
    for (let x = -20; x < midSpan; ) {
      const w = 70 + Math.floor(rand() * 50);
      drawHouseBlock(mid, x, w, 50 + Math.floor(rand() * 60), pal, rand, evening);
      x += w + 10 + Math.floor(rand() * 20);
    }
  } else if (zone === "parco") {
    // colline morbide e qualche palazzo lontano tra gli alberi
    for (let x = 0; x < midSpan; x += 160) pixelDisc(mid, x, HORIZON, 70 + Math.floor(rand() * 40), pal.tree, 1, 2);
    ditherRect(mid, 0, HORIZON - 60, midSpan, 60, pal.near, 2);
    for (let x = 40; x < midSpan; x += 90 + Math.floor(rand() * 60)) drawTree(mid, x, pal, rand, originId);
  } else {
    // zona industriale
    for (let x = -20; x < midSpan; ) {
      const w = 120 + Math.floor(rand() * 80);
      drawShed(mid, x, w, pal);
      if (rand() < 0.6) drawChimney(scene, mid, x + 30, pal, rand, parallax);
      x += w + 20;
    }
    for (let tx = 260; tx < midSpan; tx += 520) drawAirTower(scene, mid, tx, pal, parallax);
  }
  ditherRect(mid, 0, HORIZON - 26, midSpan, 26, pal.near, 3);
  if (originId === "reykjavik") ditherRect(mid, 0, HORIZON - 12, midSpan, 12, 0xf1f0ed, 5);

  // alberi e cartelloni
  const near = layer(scene, 0.75, parallax, -6);
  const nearSpan = span(0.75);
  const gap = zone === "parco" ? 90 : zone === "residenziale" ? 150 : 200;
  for (let x = 60; x < nearSpan; x += gap + Math.floor(rand() * 140)) {
    if (zone !== "parco" && rand() < 0.35) drawPosterWall(scene, near, x, pal, parallax);
    else drawTree(near, x, pal, rand, originId);
  }

  drawLocalDetails(scene, near, originId, pal, { evening, parallax, rand, span: nearSpan });
  // Milano centro: ingressi della metropolitana col cartello rosso "M"
  if (originId === "milano" && zone === "centro") {
    for (let mx = 260; mx < nearSpan; mx += 640) drawMetroEntrance(scene, near, mx, parallax, evening);
  }
  addLife(scene, pal, { evening, parallax, rand, originId });
  addSmog(scene, originId, { evening, parallax, rand });
}

// smog: più l'aria è inquinata (difficoltà), più la città sparisce nella foschia.
// la nebbia è una texture a retino generata una volta, ripetuta in TileSprite che scorrono
// a velocità diverse: così si muove in modo continuo senza costare nulla
const SMOG = {
  day: { 1: 0x9a9d96, 2: 0xb09872 },
  evening: { 1: 0x4b5664, 2: 0x5c5040 }
};

// rumore morbido (value noise) con seme, tra 0 e 1
function makeNoise(rand, cols, rows) {
  const grid = Array.from({ length: rows + 1 }, () => Array.from({ length: cols + 1 }, () => rand()));
  return (x, y) => {
    const xi = Math.floor(x) % cols;
    const yi = Math.floor(y) % rows;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = grid[yi][xi] + (grid[yi][xi + 1] - grid[yi][xi]) * sx;
    const bottom = grid[yi + 1][xi] + (grid[yi + 1][xi + 1] - grid[yi + 1][xi]) * sx;
    return top + (bottom - top) * sy;
  };
}

// texture di nebbia 512x192 a celle di 4 px: banchi ondulati, più densa in basso, bordo superiore sfrangiato
function fogTexture(scene, key, color, density, rand) {
  if (scene.textures.exists(key)) return;
  const W = 512;
  const H = 192;
  const cell = 4;
  const cols = W / cell;
  const rows = H / cell;
  const noise = makeNoise(rand, 16, 6);
  const detail = makeNoise(rand, 64, 24);
  const texture = scene.textures.createCanvas(key, W, H);
  const ctx = texture.getContext();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  for (let cy = 0; cy < rows; cy += 1) {
    const vertical = cy / rows; // 0 in alto, 1 in basso
    for (let cx = 0; cx < cols; cx += 1) {
      // le coordinate avvolgono orizzontalmente, così il tile si ripete senza giunture
      const n = noise((cx / cols) * 16, (cy / rows) * 6) * 0.7 + detail((cx / cols) * 64, (cy / rows) * 24) * 0.3;
      const level = (n * 0.8 + vertical * 1.1 - 0.55) * 16 * density;
      if (BAYER[cy & 3][cx & 3] < level) ctx.fillRect(cx * cell, cy * cell, cell, cell);
    }
  }
  texture.refresh();
}

function addSmog(scene, originId, { evening, parallax, rand }) {
  const level = ORIGINS.find((o) => o.id === originId)?.smog ?? 0;
  if (!level) return;
  const color = (evening ? SMOG.evening : SMOG.day)[level];
  const fixed = (obj) => (parallax ? obj.setScrollFactor(0) : obj);
  const key = `fog_${originId}_${evening ? "e" : "d"}`;
  fogTexture(scene, key, color, 0.55 + level * 0.3, rand);

  // cielo velato
  const veil = fixed(scene.add.graphics().setDepth(-9.5));
  veil.fillStyle(color, 0.1 + level * 0.08);
  veil.fillRect(0, 46, VIEW_W, HORIZON - 46);

  // banchi di nebbia tra i livelli della città, ognuno con la sua velocità
  // (tilePositionX scorre nel tempo; il tile si ripete senza giunture)
  const bands = [
    { depth: -7.5, y: HORIZON - 150, h: 170, alpha: 0.5 + level * 0.15, speed: 6, flip: false },
    { depth: -6.5, y: HORIZON - 80, h: 100, alpha: 0.4 + level * 0.15, speed: 11, flip: true },
    { depth: -5.5, y: HORIZON - 30, h: 60, alpha: 0.35 + level * 0.1, speed: 17, flip: false }
  ];
  const layers = bands.map((band) => {
    const t = fixed(scene.add.tileSprite(0, band.y, VIEW_W, band.h, key).setOrigin(0, 0).setDepth(band.depth));
    t.setAlpha(band.alpha);
    t.tilePositionX = Math.floor(rand() * 512);
    t.tilePositionY = band.flip ? 192 - band.h : 0;
    return { t, speed: band.speed * (rand() < 0.5 ? -1 : 1) };
  });

  // scorrimento continuo, a passi interi di pixel per restare nello stile
  const onUpdate = (time, delta) => {
    layers.forEach((layer) => {
      layer.t.tilePositionX = Math.round((layer.t.tilePositionX + (layer.speed * delta) / 1000) * 4) / 4;
    });
  };
  scene.events.on("update", onUpdate);
  scene.events.once("shutdown", () => scene.events.off("update", onUpdate));
}



// elementi tipici di ogni città, sul livello vicino
function drawLocalDetails(scene, g, originId, pal, { evening, parallax, rand, span }) {
  if (originId === "delhi") {
    // bandierine arancio / giallo / magenta tese tra due pali
    for (let x = 120; x < span; x += 640) {
      g.fillStyle(pal.near, 1);
      g.fillRect(x, HORIZON - 120, 3, 120);
      g.fillRect(x + 200, HORIZON - 120, 3, 120);
      g.fillRect(x, HORIZON - 116, 203, 1);
      const colors = [0xe08a2e, 0xe8c66a, 0xc2407a, 0x5c7a6b];
      for (let i = 0; i < 12; i += 1) {
        const fx = x + 8 + i * 16;
        const sag = Math.round(Math.sin((i / 11) * Math.PI) * 14);
        g.fillStyle(colors[i % colors.length], 1);
        g.fillRect(fx, HORIZON - 114 + sag, 8, 4);
        g.fillRect(fx + 2, HORIZON - 110 + sag, 4, 4);
      }
    }
    // banco del chai
    for (let x = 420; x < span; x += 900) {
      g.fillStyle(pal.near, 1);
      g.fillRect(x, HORIZON - 34, 70, 30);
      for (let i = 0; i < 7; i += 1) {
        g.fillStyle(i % 2 ? 0xe08a2e : 0x5c7a6b, 1);
        g.fillRect(x - 6 + i * 12, HORIZON - 52, 12, 10);
      }
      g.fillStyle(0xe8c66a, 1);
      g.fillRect(x + 10, HORIZON - 28, 8, 8);
      const t = scene.add.text(x + 30, HORIZON - 30, "CHAI", { fontFamily: '"VT323", monospace', fontSize: "16px", color: "#f1f0ed" }).setDepth(-6);
      if (parallax) t.setScrollFactor(0.75, 1);
    }
  } else if (originId === "milano") {
    // bar con gli ombrelloni e i tavolini
    for (let x = 300; x < span; x += 760) {
      g.fillStyle(pal.near, 1);
      g.fillRect(x, HORIZON - 70, 110, 66);
      g.fillStyle(pal.window, 1);
      g.fillRect(x + 8, HORIZON - 52, 40, 30);
      g.fillRect(x + 60, HORIZON - 52, 40, 30);
      g.fillStyle(0x163c4d, 1);
      g.fillRect(x + 6, HORIZON - 70, 98, 12);
      const t = scene.add.text(x + 40, HORIZON - 72, "BAR", { fontFamily: '"VT323", monospace', fontSize: "16px", color: "#f1f0ed" }).setDepth(-6);
      if (parallax) t.setScrollFactor(0.75, 1);
      [x + 130, x + 180].forEach((ux) => {
        pixelDisc(g, ux, HORIZON - 40, 18, 0xb4553f, 1, 2);
        g.fillStyle(pal.sky[0], 1);
        g.fillRect(ux - 20, HORIZON - 40, 40, 20);
        g.fillStyle(pal.near, 1);
        g.fillRect(ux - 1, HORIZON - 40, 2, 36);
        g.fillRect(ux - 10, HORIZON - 16, 20, 3);
      });
    }
  } else if (originId === "reykjavik") {
    // neve sul marciapiede e cumuli ai piedi degli edifici
    for (let x = 0; x < span; x += 70 + Math.floor(rand() * 60)) {
      pixelDisc(g, x, HORIZON, 12 + Math.floor(rand() * 10), 0xf1f0ed, 1, 2);
    }
    ditherRect(g, 0, HORIZON - 8, span, 8, 0xf1f0ed, 6);
  }
}

// vita in città

function addLife(scene, pal, { evening, parallax, rand, originId }) {
  // strada dietro il marciapiede con il traffico
  const road = layer(scene, 0.85, parallax, -5);
  road.fillStyle(evening ? 0x1c2839 : 0x5d6d7e, 1);
  road.fillRect(-100, HORIZON - 16, 6000, 12);
  road.fillStyle(evening ? 0x3a4f66 : 0x9aa6ae, 1);
  for (let x = -100; x < 6000; x += 40) road.fillRect(x, HORIZON - 11, 16, 2);

  const spawnCar = () => {
    const dir = rand() < 0.5 ? 1 : -1;
    const car = scene.add.container(dir > 0 ? -140 : VIEW_W + 140, HORIZON - 8).setDepth(-4);
    if (parallax) car.setScrollFactor(0);
    const g = scene.add.graphics();
    const lights = evening ? 0xe8c66a : 0xc9d6de;
    let speed = 3500 + rand() * 3000;
    const kind = rand();
    if (originId === "milano" && kind < 0.35) {
      // il tram arancione
      g.fillStyle(0xd98a4b, 1);
      g.fillRect(-60, -26, 120, 22);
      g.fillStyle(0xf1f0ed, 1);
      g.fillRect(-60, -12, 120, 3);
      g.fillStyle(lights, 1);
      for (let i = 0; i < 6; i += 1) g.fillRect(-54 + i * 19, -23, 12, 8);
      g.fillStyle(0x16202e, 1);
      g.fillRect(-2, -34, 4, 8);
      g.fillRect(-14, -36, 28, 2);
      g.fillRect(-48, -4, 12, 4);
      g.fillRect(36, -4, 12, 4);
      speed += 3000;
    } else if (originId === "delhi" && kind < 0.5) {
      // tuk-tuk giallo e verde
      g.fillStyle(0x2e7d4f, 1);
      g.fillRect(-18, -24, 32, 6);
      g.fillStyle(0xe8c66a, 1);
      g.fillRect(-18, -18, 34, 12);
      g.fillStyle(0x16202e, 1);
      g.fillRect(-16, -18, 2, 12);
      g.fillRect(-14, -4, 8, 4);
      g.fillRect(8, -4, 8, 4);
    } else if (originId === "reykjavik" && kind < 0.5) {
      // fuoristrada con le gomme grosse
      g.fillStyle([0xb4553f, 0xdadfda, 0x163c4d][Math.floor(rand() * 3)], 1);
      g.fillRect(-26, -24, 52, 16);
      g.fillStyle(lights, 1);
      g.fillRect(-20, -21, 12, 6);
      g.fillRect(-4, -21, 12, 6);
      g.fillStyle(0x16202e, 1);
      g.fillRect(-24, -8, 14, 8);
      g.fillRect(10, -8, 14, 8);
      g.fillStyle(0xf1f0ed, 1);
      g.fillRect(-26, -26, 52, 2);
    } else {
      const body = [0x5e7f94, 0xdadfda, 0xb4553f, 0x163c4d, 0x7e9c8c][Math.floor(rand() * 5)];
      g.fillStyle(body, 1);
      g.fillRect(-26, -14, 52, 10);
      g.fillRect(-14, -22, 28, 8);
      g.fillStyle(lights, 1);
      g.fillRect(-10, -20, 8, 5);
      g.fillRect(2, -20, 8, 5);
      g.fillStyle(0x16202e, 1);
      g.fillRect(-20, -4, 10, 4);
      g.fillRect(10, -4, 10, 4);
    }
    car.add(g);
    if (dir < 0) car.setScale(-1, 1);
    scene.tweens.add({ targets: car, x: dir > 0 ? VIEW_W + 140 : -140, duration: speed, onComplete: () => car.destroy() });
  };
  scene.time.addEvent({ delay: 1800, loop: true, callback: () => rand() < 0.75 && spawnCar() });
  spawnCar();

  // Reykjavík: nevicata leggera e, di sera, aurora boreale
  if (originId === "reykjavik") {
    if (evening) {
      const aurora = scene.add.graphics().setDepth(-9.5);
      if (parallax) aurora.setScrollFactor(0);
      for (let x = 0; x < VIEW_W; x += 4) {
        const h = 30 + Math.round(Math.sin(x / 70) * 18 + Math.sin(x / 23) * 8);
        aurora.fillStyle(0x7fd6a0, 0.28);
        aurora.fillRect(x, 70 + Math.round(Math.sin(x / 110) * 20), 4, h);
      }
      scene.tweens.add({ targets: aurora, alpha: 0.35, duration: 2400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    scene.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const flake = scene.add.rectangle(rand() * VIEW_W, 46, 2, 2, 0xf1f0ed).setDepth(500);
        if (parallax) flake.setScrollFactor(0);
        scene.tweens.add({ targets: flake, y: 540, x: flake.x - 40 + rand() * 30, duration: 5000 + rand() * 3000, onComplete: () => flake.destroy() });
      }
    });
  }

  // Delhi: aquiloni colorati nel cielo
  if (originId === "delhi" && !evening) {
    [[180, 110, 0xc2407a], [520, 80, 0xe08a2e], [820, 140, 0x2e7d4f]].forEach(([kx, ky, color]) => {
      const kite = scene.add.graphics().setDepth(-9);
      if (parallax) kite.setScrollFactor(0.05, 1);
      kite.fillStyle(color, 1);
      kite.fillRect(-2, -8, 4, 2);
      kite.fillRect(-4, -6, 8, 2);
      kite.fillRect(-6, -4, 12, 4);
      kite.fillRect(-4, 0, 8, 2);
      kite.fillRect(-2, 2, 4, 2);
      kite.fillStyle(0x3f5a6c, 1);
      for (let i = 0; i < 6; i += 1) kite.fillRect(i * 2, 4 + i * 4, 1, 4);
      kite.setPosition(kx, ky);
      scene.tweens.add({ targets: kite, y: ky + 10, x: kx + 6, duration: 1600 + rand() * 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
  }

  // stormo di uccelli (solo di giorno)
  if (!evening) {
    scene.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        const flock = scene.add.graphics().setDepth(-9);
        if (parallax) flock.setScrollFactor(0);
        flock.fillStyle(0x3f5a6c, 1);
        for (let i = 0; i < 4; i += 1) {
          const bx = i * 18 + (i % 2) * 6;
          const by = (i % 2) * 8;
          flock.fillRect(bx, by, 4, 2);
          flock.fillRect(bx + 4, by + 2, 2, 2);
          flock.fillRect(bx + 6, by, 4, 2);
        }
        flock.setPosition(-80, 80 + rand() * 80);
        scene.tweens.add({ targets: flock, x: VIEW_W + 80, y: flock.y - 30, duration: 9000, onComplete: () => flock.destroy() });
        scene.tweens.add({ targets: flock, scaleY: 0.5, duration: 200, yoyo: true, repeat: 22 });
      }
    });
  }
}

function drawHouseBlock(g, x, w, h, pal, rand, evening) {
  const top = HORIZON - h;
  g.fillStyle(facade(rand, pal), 1);
  g.fillRect(x, top, w, h);
  ditherRect(g, x + w - 10, top, 10, h, pal.near, 6);
  // tetto a punta
  g.fillStyle(rand() < 0.3 ? 0xb4553f : pal.near, 1);
  for (let i = 0; i < 6; i += 1) g.fillRect(x - 4 + i * (w / 12), top - 6 - i * 5, w + 8 - i * (w / 6), 6);
  if (snowyRoofs) {
    g.fillStyle(0xf1f0ed, 1);
    for (let i = 0; i < 6; i += 1) g.fillRect(x - 4 + i * (w / 12), top - 6 - i * 5, 4, 2);
    for (let i = 0; i < 6; i += 1) g.fillRect(x + w + 4 - i * (w / 12) - 4, top - 6 - i * 5, 4, 2);
    g.fillRect(x + w / 2 - 6, top - 32, 12, 4);
  }
  for (let wy = top + 10; wy < HORIZON - 18; wy += 20) {
    for (let wx = x + 10; wx < x + w - 18; wx += 18) {
      g.fillStyle(evening && rand() < 0.4 ? pal.window : evening ? pal.near : pal.window, 1);
      g.fillRect(wx, wy, 8, 10);
    }
  }
  g.fillStyle(pal.near, 1);
  g.fillRect(x + w / 2 - 6, HORIZON - 18, 12, 18);
}

function drawShed(g, x, w, pal) {
  const top = HORIZON - 70;
  g.fillStyle(pal.mid, 1);
  g.fillRect(x, top, w, 70);
  // tetto a shed (denti di sega)
  for (let sx = x; sx < x + w; sx += 30) {
    for (let i = 0; i < 6; i += 1) g.fillRect(sx, top - 18 + i * 3, 30 - i * 5, 3);
  }
  g.fillStyle(pal.window, 0.8);
  for (let wx = x + 10; wx < x + w - 10; wx += 16) g.fillRect(wx, top + 16, 10, 6);
  ditherRect(g, x, top + 40, w, 30, pal.near, 4);
}

function drawChimney(scene, g, x, pal, rand, parallax) {
  const h = 120 + Math.floor(rand() * 60);
  g.fillStyle(pal.near, 1);
  g.fillRect(x, HORIZON - h, 14, h);
  g.fillStyle(0xb4553f, 1);
  g.fillRect(x, HORIZON - h + 10, 14, 4);
  // fumo a sbuffi
  scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => {
      const puff = scene.add.graphics().setDepth(-7);
      if (parallax) puff.setScrollFactor(0.4, 1);
      pixelDisc(puff, 0, 0, 8, pal.sky[2], 1, 2);
      ditherRect(puff, -8, 0, 16, 8, pal.far, 6);
      puff.setPosition(x + 7, HORIZON - h - 6);
      scene.tweens.add({ targets: puff, y: puff.y - 70, x: puff.x + 30, scale: 2, alpha: 0, duration: 3200, onComplete: () => puff.destroy() });
    }
  });
}

function drawAirTower(scene, g, x, pal, parallax) {
  // torre BIODOM di purificazione
  g.fillStyle(pal.near, 1);
  g.fillRect(x, HORIZON - 230, 30, 230);
  for (let y = HORIZON - 220; y < HORIZON - 20; y += 40) g.fillRect(x - 6, y, 42, 6);
  pixelDisc(g, x + 15, HORIZON - 236, 20, pal.near, 1, 2);
  const light = scene.add.rectangle(x + 15, HORIZON - 240, 10, 6, 0x9fd4b0).setDepth(-7);
  if (parallax) light.setScrollFactor(0.4, 1);
  scene.tweens.add({ targets: light, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });
}

function drawBuilding(g, x, w, h, pal, rand, evening) {
  const top = HORIZON - h;
  const wall = facade(rand, pal);
  g.fillStyle(wall, 1);
  g.fillRect(x, top, w, h);
  if (cityStyle === "reykjavik") {
    // lamiera ondulata: righe verticali
    g.fillStyle(mixC(wall, 0x000000, 0.15), 1);
    for (let rx = x + 2; rx < x + w - 12; rx += 4) g.fillRect(rx, top + 4, 1, h - 4);
  }
  // lato in ombra a retino
  ditherRect(g, x + w - 12, top, 12, h, pal.near, 6);
  // cornicione e dettagli sul tetto
  g.fillStyle(snowyRoofs ? 0xf1f0ed : pal.near, 1);
  g.fillRect(x - 2, top, w + 4, 4);
  g.fillStyle(pal.near, 1);
  if (rand() < 0.5) {
    g.fillRect(x + 8, top - 14, 18, 14); // serbatoio / condizionatore
    g.fillRect(x + 10, top - 18, 2, 4);
  }
  if (rand() < 0.3) g.fillRect(x + w - 20, top - 30, 2, 30);
  // finestre a griglia
  for (let wy = top + 12; wy < HORIZON - 14; wy += 16) {
    for (let wx = x + 8; wx < x + w - 16; wx += 12) {
      const lit = evening ? rand() < 0.18 : true;
      g.fillStyle(lit ? pal.window : pal.near, evening ? 1 : 0.8);
      g.fillRect(wx, wy, 6, 8);
    }
  }
  // balconi
  if (rand() < 0.4) {
    g.fillStyle(pal.near, 1);
    for (let by = top + 26; by < HORIZON - 20; by += 32) g.fillRect(x + 4, by, w - 16, 2);
  }
  // dettagli tipici
  if (cityStyle === "milano") {
    // persiane verdi e vasi di gerani sui balconi
    for (let wy = top + 12; wy < HORIZON - 14; wy += 32) {
      for (let wx = x + 8; wx < x + w - 16; wx += 24) {
        g.fillStyle(evening ? 0x2e4a3a : 0x4f7a5a, 1);
        g.fillRect(wx - 3, wy, 2, 8);
        g.fillRect(wx + 7, wy, 2, 8);
        if (rand() < 0.4) {
          g.fillStyle(0xb4553f, 1);
          g.fillRect(wx, wy + 10, 6, 2);
        }
      }
    }
  } else if (cityStyle === "delhi") {
    // tetto piatto con serbatoio nero e cornici ad arco (jharokha)
    g.fillStyle(0x1c2028, 1);
    g.fillRect(x + w - 34, top - 12, 14, 12);
    g.fillRect(x + w - 32, top - 14, 10, 2);
    g.fillStyle(mixC(wall, 0xffffff, 0.35), 1);
    for (let wy = top + 10; wy < HORIZON - 14; wy += 16) for (let wx = x + 7; wx < x + w - 16; wx += 12) g.fillRect(wx, wy - 2, 8, 2);
    // insegna colorata
    if (rand() < 0.6) {
      g.fillStyle([0xb4553f, 0x163c4d, 0x5e7f94, 0xb4553f][Math.floor(rand() * 4)], 1);
      g.fillRect(x + 6, HORIZON - 40, Math.min(60, w - 20), 12);
      g.fillStyle(0xf1f0ed, 1);
      for (let lx = x + 10; lx < x + Math.min(60, w - 20); lx += 6) g.fillRect(lx, HORIZON - 36, 4, 2);
    }
  } else if (cityStyle === "reykjavik") {
    // tetto a punta colorato
    g.fillStyle(rand() < 0.5 ? 0xb4553f : 0x3f5a6c, 1);
    for (let i = 0; i < 5; i += 1) g.fillRect(x + i * (w / 10), top - 6 - i * 6, w - i * (w / 5), 6);
    g.fillStyle(0xf1f0ed, 1);
    for (let i = 0; i < 5; i += 1) g.fillRect(x + i * (w / 10), top - 6 - i * 6, 4, 2);
  }
}

// ingresso della metro di Milano: palo con il quadrato rosso e la M bianca, scala che scende e ringhiera
function drawMetroEntrance(scene, g, x, parallax, evening) {
  const b = HORIZON;
  // scala che scende (gradini scuri) e ringhiera verde
  g.fillStyle(0x1c2028, 1);
  g.fillRect(x, b - 8, 70, 8);
  g.fillStyle(0x3a3633, 1);
  for (let i = 0; i < 4; i += 1) g.fillRect(x + 4 + i * 4, b - 8 + i * 2, 62 - i * 8, 2);
  g.fillStyle(0x2e5a3a, 1);
  g.fillRect(x - 2, b - 30, 74, 3);
  for (let rx = x; rx <= x + 70; rx += 10) g.fillRect(rx, b - 30, 2, 22);
  // palo grigio con il cartello a cassonetto montato di lato, come quelli veri
  g.fillStyle(0x7e8683, 1);
  g.fillRect(x + 66, b - 150, 4, 150);
  g.fillStyle(0x5f6663, 1);
  g.fillRect(x + 68, b - 150, 2, 150);
  const sx = x + 70;
  const sy = b - 146;
  // cassonetto in metallo: cornice grigia e fianco più scuro
  g.fillStyle(0x9aa3ad, 1);
  g.fillRect(sx, sy, 46, 46);
  g.fillStyle(0x6e7673, 1);
  g.fillRect(sx + 46, sy + 2, 4, 46);
  g.fillRect(sx + 2, sy + 46, 46, 2);
  // pannello rosso
  g.fillStyle(0xd0302a, 1);
  g.fillRect(sx + 4, sy + 4, 38, 38);
  // M bianca a tratti obliqui: gambe che si allargano verso il basso e V centrale alta
  g.fillStyle(0xf1f0ed, 1);
  const stroke = (x1, y1, x2, y2) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i += 1) {
      const px = Math.round(x1 + ((x2 - x1) * i) / steps);
      const py = Math.round(y1 + ((y2 - y1) * i) / steps);
      g.fillRect(sx + px, sy + py, 4, 2);
    }
  };
  stroke(8, 35, 15, 10); // gamba sinistra
  stroke(15, 10, 21, 27); // V: discesa
  stroke(21, 27, 27, 10); // V: risalita
  stroke(27, 10, 32, 35); // gamba destra
  if (evening) {
    const glow = scene.add.rectangle(sx + 23, sy + 23, 58, 58, 0xd0302a, 0.18).setDepth(-6);
    if (parallax) glow.setScrollFactor(0.75, 1);
  }
}

function drawLandmark(g, originId, ox, pal) {
  const b = HORIZON;
  if (originId === "delhi") {
    // india Gate
    g.fillRect(ox, b - 160, 40, 160);
    g.fillRect(ox + 110, b - 160, 40, 160);
    g.fillRect(ox - 8, b - 188, 166, 32);
    g.fillRect(ox + 16, b - 204, 118, 16);
    ditherRect(g, ox + 40, b - 156, 70, 30, pal.near, 4);
    // cupola
    g.fillStyle(pal.mid, 1);
    g.fillRect(ox + 180, b - 70, 120, 70);
    pixelDisc(g, ox + 240, b - 70, 40, pal.mid, 1, 2);
    g.fillRect(ox + 238, b - 126, 4, 18);
  } else if (originId === "reykjavik") {
    // hallgrímskirkja a gradoni
    for (let i = 0; i < 7; i += 1) {
      const w = 150 - i * 20;
      g.fillRect(ox + 80 - w / 2, b - 70 - i * 18, w, 18);
    }
    g.fillRect(ox + 70, b - 260, 20, 136);
    g.fillRect(ox + 77, b - 280, 6, 20);
    ditherRect(g, ox + 80, b - 190, 10, 190, pal.near, 5);
    // casette colorate con tetto a punta
    [[ox + 190, 0xb4553f], [ox + 270, COLORS.paper]].forEach(([hx, roof]) => {
      g.fillStyle(pal.mid, 1);
      g.fillRect(hx, b - 64, 70, 64);
      g.fillStyle(roof, 1);
      for (let i = 0; i < 5; i += 1) g.fillRect(hx + i * 7, b - 68 - i * 6, 70 - i * 14, 6);
    });
  } else {
    // duomo con guglie
    g.fillRect(ox, b - 96, 200, 96);
    for (let x = ox + 4; x < ox + 200; x += 12) {
      const tall = (x - ox) % 36 === 4;
      g.fillRect(x, b - 96 - (tall ? 56 : 30), 4, tall ? 56 : 30);
    }
    g.fillRect(ox + 96, b - 190, 8, 94);
    g.fillStyle(0xe8c66a, 1);
    g.fillRect(ox + 96, b - 198, 8, 8);
    ditherRect(g, ox + 20, b - 70, 160, 40, pal.near, 4);
    // torre Velasca
    g.fillStyle(pal.mid, 1);
    g.fillRect(ox + 250, b - 190, 54, 190);
    g.fillRect(ox + 238, b - 246, 78, 56);
    ditherRect(g, ox + 290, b - 246, 26, 246, pal.near, 5);
  }
}

function drawTree(g, x, pal, rand, originId = "milano") {
  const h = 40 + Math.floor(rand() * 30);
  if (originId === "delhi") {
    // palma: tronco a gradini e foglie a raggiera
    g.fillStyle(pal.near, 1);
    for (let i = 0; i < h + 20; i += 4) g.fillRect(x + Math.round(Math.sin(i / 20) * 4), HORIZON - i, 6, 4);
    const top = HORIZON - h - 20;
    const tx = x + Math.round(Math.sin((h + 20) / 20) * 4) + 3;
    g.fillStyle(pal.tree, 1);
    for (let i = 0; i < 5; i += 1) {
      g.fillRect(tx - 6 - i * 6, top + i * 3, 8, 3);
      g.fillRect(tx + i * 6, top + i * 3, 8, 3);
    }
    g.fillRect(tx - 3, top - 6, 6, 8);
    return;
  }
  if (originId === "reykjavik") {
    // abete con la neve sulle punte
    g.fillStyle(pal.near, 1);
    g.fillRect(x - 3, HORIZON - 14, 6, 14);
    for (let i = 0; i < 6; i += 1) {
      const w = 40 - i * 6;
      g.fillStyle(pal.tree, 1);
      g.fillRect(x - w / 2, HORIZON - 22 - i * 10, w, 10);
      g.fillStyle(0xf1f0ed, 1);
      g.fillRect(x - w / 2, HORIZON - 22 - i * 10, w, 2);
    }
    return;
  }
  g.fillStyle(pal.near, 1);
  g.fillRect(x - 3, HORIZON - h, 6, h);
  const r = 22 + Math.floor(rand() * 12);
  pixelDisc(g, x, HORIZON - h - r / 2, r, pal.tree, 1, 2);
  pixelDisc(g, x - r / 2, HORIZON - h - 4, r * 0.7, pal.tree, 1, 2);
  ditherRect(g, x - r, HORIZON - h - 6, r * 2, 12, pal.near, 6);
}

// muro con un manifesto BIODOM incollato sopra
let posterIndex = 0;
function drawPosterWall(scene, g, x, pal, parallax) {
  // ogni tanto un cartellone orizzontale con i manifesti delle tavole del progetto
  if (posterIndex % 4 === 3) {
    posterIndex += 1;
    const key = posterIndex % 8 === 0 ? "poster_5" : "poster_4";
    const bw = key === "poster_4" ? 196 : 160;
    const btop = HORIZON - 178;
    g.fillStyle(0x16202e, 1);
    g.fillRect(x + 20, btop + 116, 6, 62);
    g.fillRect(x + bw - 20, btop + 116, 6, 62);
    g.fillStyle(pal.near, 1);
    g.fillRect(x - 6, btop - 6, bw + 12, 120);
    g.fillStyle(0x16202e, 1);
    g.fillRect(x - 2, btop - 2, bw + 4, 112);
    const img = scene.add.image(x, btop, key).setOrigin(0, 0).setDepth(-6);
    if (parallax) img.setScrollFactor(0.75, 1);
    return;
  }
  const top = HORIZON - 136;
  g.fillStyle(pal.near, 1);
  g.fillRect(x, top, 96, 136);
  ditherRect(g, x + 84, top, 12, 136, 0x16202e, 5);
  g.fillStyle(pal.mid, 1);
  g.fillRect(x, top, 96, 4);
  g.fillStyle(0x16202e, 1);
  g.fillRect(x + 12, top + 14, 72, 98);
  const key = `poster_${(posterIndex % 3) + 1}`;
  posterIndex += 1;
  const poster = scene.add.image(x + 16, top + 18, key).setOrigin(0, 0).setScale(1, 1).setDepth(-6);
  if (parallax) poster.setScrollFactor(0.75, 1);
}
