// location del gioco: ognuna ritorna floor, obstacles, points e spawn
import { COLORS, bandGradient, ditherRect, drawPanel, pixelDisc } from "../ui/theme.js";
import { drawCityscape } from "./cityscape.js";

const W = 960;
const HORIZON = 380;
export const FLOOR = [400, 482];

// oggetto "in piedi" sul pavimento
function standing(scene, baseY) {
  return scene.add.graphics().setDepth(baseY);
}

// cielo e skyline per origine

const SKY = {
  delhi: [0xe2d6bd, 0xd8c9a9, 0xcdbb98],
  milano: [0xe6e9e5, 0xd9dfe0, 0xc9d3d8],
  reykjavik: [0xeaf0f2, 0xd8e5ec, 0xc4d8e4]
};
const SKY_EVENING = [0x2c3e52, 0x25354a, 0x1f2c40];

export function drawBackdrop(scene, originId, { evening = false, sun = true, zone = "centro" } = {}) {
  drawCityscape(scene, originId, { evening, sun, zone });
}

// pavimenti

export function drawStreetFloor(scene, evening, width = W) {
  const g = scene.add.graphics();
  // marciapiede a lastre
  g.fillStyle(evening ? 0x6e7673 : COLORS.stone, 1);
  g.fillRect(0, HORIZON, width, 160);
  g.fillStyle(evening ? 0x5f6663 : 0x959c99, 1);
  for (let y = HORIZON + 40; y < 540; y += 40) g.fillRect(0, y, width, 2);
  for (let y = HORIZON; y < 540; y += 40) {
    const offset = ((y - HORIZON) / 40) % 2 ? 32 : 0;
    for (let x = offset; x < width; x += 64) g.fillRect(x, y, 2, 40);
  }
  // tombini e piccoli dettagli
  for (let x = 140; x < width; x += 420) {
    g.fillStyle(evening ? 0x4f5654 : 0x7f8784, 1);
    g.fillRect(x, 500, 28, 12);
    g.fillStyle(evening ? 0x6e7673 : COLORS.stone, 1);
    for (let i = 0; i < 3; i += 1) g.fillRect(x + 4, 502 + i * 4, 20, 2);
  }
  // cordolo e ombra all'orizzonte
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, HORIZON - 4, width, 4);
  ditherRect(g, 0, HORIZON, width, 10, COLORS.inkDeep, 4);
  return g;
}

function drawRoom(scene, evening) {
  const g = scene.add.graphics();
  g.fillStyle(evening ? 0xb9c2c4 : COLORS.bgSoft, 1);
  g.fillRect(0, 46, W, HORIZON - 46);
  g.fillStyle(evening ? 0xaab3b6 : COLORS.panelLight, 1);
  for (let x = 0; x < W; x += 96) g.fillRect(x, 46, 2, HORIZON - 46);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, HORIZON - 14, W, 14);
  g.fillStyle(evening ? 0xcfd3cf : COLORS.paper, 1);
  g.fillRect(0, HORIZON, W, 160);
  g.fillStyle(evening ? 0xb9bfbb : COLORS.panelLight, 1);
  for (let x = 0; x < W; x += 48) for (let y = HORIZON; y < 540; y += 48) if (((x + y - HORIZON) / 48) % 2 === 0) g.fillRect(x, y, 48, 48);
  ditherRect(g, 0, HORIZON, W, 8, COLORS.inkDeep, 4);
  return g;
}

// elementi

function drawHub(scene, x, baseY, evening) {
  // hub BIODOM
  const g = standing(scene, baseY);
  ditherRect(g, x - 74, baseY - 2, 148, 8, COLORS.inkDeep, 6);
  drawPanel(g, x - 70, baseY - 70, 140, 70, { fill: COLORS.paper, border: COLORS.ink });
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(x - 66, baseY - 66, 132, 10);
  drawPanel(g, x - 30, baseY - 52, 60, 34, { fill: evening ? 0x2c566a : COLORS.inkDeep, border: COLORS.ink });
  g.fillStyle(evening ? 0xe8c66a : 0x7e9c8c, 1);
  g.fillRect(x - 22, baseY - 44, 30, 4);
  g.fillRect(x - 22, baseY - 34, 18, 4);
  const plant = scene.add.image(x + 44, baseY - 66, "plant_tall").setOrigin(0.5, 1).setScale(3).setDepth(baseY);
  return { g, plant, screen: { x: x - 30, y: baseY - 52 } };
}

function drawDoor(g, x, top, color = COLORS.steel) {
  drawPanel(g, x, top, 84, HORIZON - top, { fill: color, border: COLORS.ink, borderWidth: 6 });
  g.fillStyle(0x4f6f84, 1);
  g.fillRect(x + 16, top + 18, 52, 56);
  g.fillRect(x + 16, top + 88, 52, HORIZON - top - 106);
  g.fillStyle(COLORS.paper, 1);
  g.fillRect(x + 64, top + 82, 6, 8);
}

function drawDesk(scene, x, evening) {
  const g = scene.add.graphics().setDepth(HORIZON);
  drawPanel(g, x + 60, HORIZON - 96, 100, 60, { fill: COLORS.inkDeep, border: COLORS.ink, borderWidth: 4 });
  g.fillStyle(evening ? 0x5e7f94 : COLORS.steelLight, 1);
  for (let i = 0; i < 3; i += 1) g.fillRect(x + 72, HORIZON - 84 + i * 12, 40 + ((i * 23) % 30), 4);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + 104, HORIZON - 36, 12, 8);
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(x, HORIZON - 28, 220, 16);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x, HORIZON - 12, 220, 4);
  g.fillRect(x + 8, HORIZON - 8, 10, 30);
  g.fillRect(x + 202, HORIZON - 8, 10, 30);
}

// location

export function buildOffice(scene, originId, { evening = false, ac = false } = {}) {
  drawRoom(scene, evening);
  const g = scene.add.graphics();

  // finestra sulla città
  const win = { x: 320, y: 80, w: 320, h: 170 };
  drawPanel(g, win.x, win.y, win.w, win.h, { fill: evening ? 0x1f2c40 : COLORS.paper, border: COLORS.ink, borderWidth: 6 });
  bandGradient(g, win.x + 6, win.y + 6, win.w - 12, win.h - 12, evening ? SKY_EVENING : SKY[originId] ?? SKY.milano);
  g.fillStyle(evening ? 0x34485e : COLORS.steelLight, 1);
  [[330, 40, 70], [376, 30, 100], [412, 54, 60], [470, 26, 120], [500, 64, 80], [570, 60, 96]].forEach(([x, w, h]) => g.fillRect(x, win.y + win.h - 6 - h, w, h));
  if (evening) {
    g.fillStyle(0xe8c66a, 1);
    [[384, 190], [482, 160], [520, 200], [590, 180]].forEach(([x, y]) => g.fillRect(x, y, 6, 8));
  }
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(win.x + win.w / 2 - 2, win.y, 4, win.h);

  drawDoor(g, 30, 196);
  drawDesk(scene, 150, evening);
  drawDesk(scene, 690, evening);

  // archivio
  drawPanel(g, 900, 230, 52, HORIZON - 230, { fill: COLORS.stone, border: COLORS.ink, borderWidth: 3 });

  const hub = drawHub(scene, 480, 456, evening);

  // condizionatore a parete con aria fredda animata
  let acPoint = null;
  if (ac) {
    const a = scene.add.graphics().setDepth(HORIZON - 1);
    drawPanel(a, 740, 60, 150, 44, { fill: COLORS.paper, border: COLORS.ink });
    a.fillStyle(COLORS.steel, 1);
    for (let i = 0; i < 5; i += 1) a.fillRect(752 + i * 26, 92, 20, 4);
    for (let i = 0; i < 6; i += 1) {
      const wind = scene.add.rectangle(760 + i * 22, 112, 4, 14, COLORS.steelLight).setDepth(HORIZON);
      scene.tweens.add({ targets: wind, y: 190, alpha: 0, duration: 1100, delay: i * 180, repeat: -1 });
    }
    acPoint = { x: 815, y: 420 };
  }

  return {
    floor: FLOOR,
    spawn: { x: 72, y: 430 },
    hub,
    obstacles: [
      { x: 150, y: 380, w: 220, h: 26 }, // scrivania sinistra
      { x: 690, y: 380, w: 220, h: 26 }, // scrivania destra
      { x: 410, y: 432, w: 140, h: 26 } // hub
    ],
    points: {
      door: { x: 72, y: 410 },
      hub: { x: 480, y: 470 },
      can: { x: 790, y: 450 },
      ...(acPoint ? { ac: acPoint } : {})
    }
  };
}

export function buildFoodTruck(scene, originId, { evening = false } = {}) {
  drawBackdrop(scene, originId, { evening, zone: "parco" });
  drawStreetFloor(scene, evening);

  // food truck
  const t = standing(scene, 412);
  const tx = 540;
  ditherRect(t, tx - 8, 404, 336, 12, COLORS.inkDeep, 6);
  drawPanel(t, tx, 228, 320, 170, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 4 });
  t.fillStyle(COLORS.steel, 1);
  t.fillRect(tx + 4, 340, 312, 54);
  // tendalino a strisce
  for (let i = 0; i < 10; i += 1) {
    t.fillStyle(i % 2 ? COLORS.paper : COLORS.red, 1);
    t.fillRect(tx + 30 + i * 22, 240, 22, 22);
  }
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx + 30, 262, 220, 4);
  // finestra di servizio + bancone
  drawPanel(t, tx + 40, 268, 200, 70, { fill: COLORS.inkDeep, border: COLORS.ink });
  t.fillStyle(COLORS.stone, 1);
  t.fillRect(tx + 30, 336, 220, 10);
  // insegna
  drawPanel(t, tx + 70, 200, 140, 30, { fill: COLORS.ink, border: COLORS.ink });
  // ruote
  [tx + 60, tx + 250].forEach((wx) => {
    pixelDisc(t, wx, 400, 22, COLORS.inkDeep, 1, 4);
    pixelDisc(t, wx, 400, 8, COLORS.stone, 1, 4);
  });
  // colonnina di ricarica
  drawPanel(t, tx + 274, 300, 30, 60, { fill: COLORS.ink, border: COLORS.inkDeep });
  t.fillStyle(0x7e9c8c, 1);
  t.fillRect(tx + 282, 310, 14, 8);

  const vendor = scene.add.image(tx + 140, 338, "npc_vendor").setOrigin(0.5, 1).setScale(3).setDepth(413);
  vendor.setCrop(0, 0, 14, 16);

  // panchina
  const b = standing(scene, 452);
  ditherRect(b, 106, 448, 168, 8, COLORS.inkDeep, 5);
  b.fillStyle(COLORS.ink, 1);
  b.fillRect(110, 410, 160, 10);
  b.fillRect(110, 428, 160, 8);
  b.fillRect(120, 436, 8, 16);
  b.fillRect(252, 436, 8, 16);
  b.fillStyle(COLORS.steel, 1);
  b.fillRect(110, 420, 160, 8);

  return {
    floor: FLOOR,
    spawn: { x: 60, y: 474 },
    vendor,
    obstacles: [
      { x: tx, y: 380, w: 320, h: 34 }, // truck
      { x: 110, y: 430, w: 160, h: 22 } // panchina
    ],
    points: {
      counter: { x: tx + 140, y: 424 },
      charger: { x: tx + 290, y: 424 },
      bench: { x: 190, y: 454 }
    },
    benchSeat: { x: 190, y: 430 }
  };
}

// strada generica (usata nella sequenza di game over)
export function buildStreet(scene, originId, { evening = false, sun = true, zone = "industriale" } = {}) {
  drawBackdrop(scene, originId, { evening, sun, zone });
  drawStreetFloor(scene, evening);
  return { floor: FLOOR, spawn: { x: 60, y: 450 }, obstacles: [], points: {} };
}

export function buildBusStop(scene, originId, { evening = true } = {}) {
  drawBackdrop(scene, originId, { evening, zone: "residenziale" });
  drawStreetFloor(scene, evening);

  // pensilina
  const s = standing(scene, 410);
  ditherRect(s, 296, 404, 288, 10, COLORS.inkDeep, 5);
  s.fillStyle(COLORS.ink, 1);
  s.fillRect(300, 230, 280, 12);
  s.fillRect(306, 242, 8, 168);
  s.fillRect(566, 242, 8, 168);
  s.fillStyle(0x9fb4c2, 0.45);
  s.fillRect(314, 250, 252, 120);
  drawPanel(s, 470, 262, 80, 50, { fill: COLORS.paper, border: COLORS.ink });
  s.fillStyle(COLORS.red, 1);
  s.fillRect(478, 270, 20, 12);
  s.fillStyle(COLORS.ink, 1);
  s.fillRect(330, 372, 200, 8);
  s.fillRect(340, 380, 8, 28);
  s.fillRect(512, 380, 8, 28);

  // palina BUS
  drawSign(scene, 663, "BUS", { sub: "linea 92", depth: 430, top: 214, ground: 430 });

  // lampione acceso
  const l = scene.add.graphics();
  l.fillStyle(COLORS.inkDeep, 1);
  l.fillRect(150, 220, 6, 160);
  l.fillRect(136, 220, 34, 4);
  l.fillStyle(0xe8c66a, 1);
  l.fillRect(142, 224, 22, 8);
  l.fillStyle(0xe8c66a, 0.18);
  l.fillRect(110, 232, 86, 148);

  return {
    floor: FLOOR,
    spawn: { x: 60, y: 450 },
    obstacles: [
      { x: 330, y: 396, w: 200, h: 14 }, // panchina
      { x: 300, y: 396, w: 14, h: 16 },
      { x: 566, y: 396, w: 14, h: 16 },
      { x: 656, y: 420, w: 14, h: 12 } // palina
    ],
    points: {
      man: { x: 760, y: 450 }
    },
    busLabel: { x: 664, y: 248 }
  };
}

export function buildHouse(scene, { evening = false } = {}) {
  drawRoom(scene, evening);
  const g = scene.add.graphics();

  // serra domestica
  const x = 40;
  const y = 96;
  const w = 300;
  const h = HORIZON - y - 14;
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x + 100, y - 10, 100, 12);
  drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 4 });
  g.fillStyle(0xdfe7ea, 1);
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + w / 2 - 2, y, 4, h);
  [y + 86, y + 174, y + 262].forEach((shelfY, row) => {
    g.fillStyle(COLORS.steel, 1);
    g.fillRect(x + 4, shelfY, w - 8, 6);
    for (let i = 0; i < 8; i += 1) {
      scene.add.image(x + 26 + i * 35, shelfY, (i + row) % 3 === 0 ? "pot_flower" : "pot_plant").setOrigin(0.5, 1).setScale(2.5);
    }
  });
  g.fillStyle(COLORS.paper, 1);
  for (let i = 0; i < 8; i += 1) g.fillRect(x + 24 + i * 4, y + 20 + i * 4, 4, 4);

  drawDoor(g, 840, 196);

  return {
    floor: FLOOR,
    spawn: { x: 420, y: 440 },
    obstacles: [{ x: 40, y: 380, w: 300, h: 20 }],
    points: {
      pack: { x: 660, y: 430 },
      door: { x: 882, y: 410 }
    },
    door: { x: 840, top: 196 }
  };
}

// location per gli eventi sulla pianta

// interno del bus
export function buildBus(scene, originId, { evening = false } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(evening ? 0xb9c2c4 : COLORS.bgSoft, 1);
  g.fillRect(0, 46, W, HORIZON - 46);

  // città che scorre fuori dai finestrini (parallasse)
  const outside = scene.add.container(0, 0);
  const strip = scene.add.graphics();
  bandGradient(strip, 0, 90, W * 2, 170, evening ? SKY_EVENING : SKY[originId] ?? SKY.milano);
  strip.fillStyle(evening ? 0x34485e : COLORS.steelLight, 1);
  for (let x = 0; x < W * 2; x += 70) strip.fillRect(x, 260 - ((x * 37) % 90) - 40, 56, 140);
  strip.fillStyle(evening ? 0x1c2839 : COLORS.steel, 1);
  for (let x = 30; x < W * 2; x += 110) strip.fillRect(x, 260 - ((x * 53) % 60) - 20, 70, 140);
  outside.add(strip);
  scene.tweens.add({ targets: outside, x: -W, duration: 9000, repeat: -1 });

  // cornice con i finestrini (copre la città tra un finestrino e l'altro)
  const frame = scene.add.graphics();
  frame.fillStyle(evening ? 0xb9c2c4 : COLORS.bgSoft, 1);
  frame.fillRect(0, 46, W, 44);
  frame.fillRect(0, 250, W, HORIZON - 250);
  for (let x = 0; x < W; x += 240) frame.fillRect(x, 90, 24, 160);
  frame.fillStyle(COLORS.ink, 1);
  for (let x = 0; x < W; x += 240) {
    frame.fillRect(x + 24, 86, 216, 4);
    frame.fillRect(x + 24, 250, 216, 4);
  }
  // mancorrente e pali
  frame.fillRect(0, 70, W, 6);
  for (let x = 120; x < W; x += 240) frame.fillRect(x, 76, 6, HORIZON - 76);
  // sedili
  for (let x = 40; x < W; x += 240) {
    drawPanel(frame, x, 300, 70, 50, { fill: COLORS.steel, border: COLORS.ink });
    frame.fillStyle(COLORS.ink, 1);
    frame.fillRect(x + 6, 350, 6, 30);
    frame.fillRect(x + 58, 350, 6, 30);
  }
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(0, HORIZON - 4, W, 4);

  const floor = scene.add.graphics();
  floor.fillStyle(evening ? 0x6e7673 : COLORS.stone, 1);
  floor.fillRect(0, HORIZON, W, 160);
  floor.fillStyle(0x8e9693, 1);
  for (let y = HORIZON + 24; y < 540; y += 24) floor.fillRect(0, y, W, 2);
  ditherRect(floor, 0, HORIZON, W, 8, COLORS.inkDeep, 4);

  return {
    floor: [430, 470],
    spawn: { x: 480, y: 452 },
    crowd: [180, 270, 360, 590, 680, 770, 860],
    obstacles: [],
    points: {}
  };
}

// casa con l'Home Hub (stazione di ricarica e fertilizzazione)
export function buildHome(scene, originId, { evening = true } = {}) {
  const world = buildHouse(scene, { evening });
  const hub = scene.add.image(560, 424, "home_hub").setOrigin(0.5, 1).setScale(6).setDepth(424);
  ditherRect(scene.add.graphics().setDepth(423), 508, 420, 104, 8, COLORS.inkDeep, 6);
  return {
    ...world,
    spawn: { x: 880, y: 450 },
    homeHub: hub,
    obstacles: [...world.obstacles, { x: 512, y: 408, w: 96, h: 18 }],
    points: { ...world.points, hub: { x: 560, y: 450 } }
  };
}

// strada di corsa verso casa (emergenza)
export function buildRunHome(scene, originId, { evening = true } = {}) {
  const world = buildStreet(scene, originId, { evening });
  drawSign(scene, 870, "CASA", { dir: "right", sub: "50 m" });
  return { ...world, points: { home: { x: 910, y: 450 } } };
}

// cartello stradale a freccia (stile segnaletica)
export function drawSign(scene, x, label, { dir = null, sub = null, depth = 390, top = 236, ground = 392 } = {}) {
  const text = scene.add.text(0, 0, label, { fontFamily: '"VT323", monospace', fontSize: "30px", color: "#f1f0ed", letterSpacing: 2 }).setDepth(depth + 1);
  const subText = sub ? scene.add.text(0, 0, sub, { fontFamily: '"VT323", monospace', fontSize: "18px", color: "#9fb4c2" }).setDepth(depth + 1) : null;
  const w = Math.max(text.width, subText?.width ?? 0) + 36;
  const h = sub ? 58 : 44;
  const tip = dir ? 22 : 0;
  const left = Math.round(x - w / 2 - (dir === "left" ? tip / 2 : 0) + (dir === "right" ? -tip / 2 : 0));
  const g = scene.add.graphics().setDepth(depth);

  // palo e base
  g.fillStyle(0x1c2839, 1);
  g.fillRect(x - 3, top + h, 6, ground - top - h);
  g.fillRect(x - 12, ground - 4, 24, 4);
  ditherRect(g, x - 16, ground, 32, 4, 0x1c2839, 6);

  // ombra
  g.fillStyle(0x1c2839, 0.22);
  g.fillRect(left + 5, top + 5, w + tip, h);

  // targa con punta a freccia
  g.fillStyle(0x163c4d, 1);
  const bodyX = dir === "left" ? left + tip : left;
  g.fillRect(bodyX, top, w, h);
  if (dir) {
    for (let i = 0; i < h / 2; i += 2) {
      const len = Math.round(tip * (1 - i / (h / 2)));
      const ty1 = top + h / 2 - i - 2;
      const ty2 = top + h / 2 + i;
      if (dir === "right") {
        g.fillRect(bodyX + w, ty1, len, 2);
        g.fillRect(bodyX + w, ty2, len, 2);
      } else {
        g.fillRect(bodyX - len, ty1, len, 2);
        g.fillRect(bodyX - len, ty2, len, 2);
      }
    }
  }
  // filetto interno chiaro
  g.lineStyle(2, 0xf1f0ed, 1);
  g.strokeRect(bodyX + 4, top + 4, w - 8, h - 8);

  text.setPosition(Math.round(bodyX + w / 2 - text.width / 2), top + (sub ? 6 : Math.round(h / 2 - text.height / 2)));
  subText?.setPosition(Math.round(bodyX + w / 2 - subText.width / 2), top + 34);
  return g;
}
