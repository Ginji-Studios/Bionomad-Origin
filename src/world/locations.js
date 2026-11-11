// Location disegnate via codice con campiture piene (stile pulito, pochi retini).
// Ogni funzione restituisce:
//   floor     – [yMin, yMax] dei piedi del giocatore
//   obstacles – rettangoli sul pavimento (coordinate dei piedi) per le collisioni
//   points    – punti interattivi { x, y } usati dalle task degli eventi
//   spawn     – posizione iniziale
import { COLORS, bandGradient, drawPanel, pixelDisc } from "../ui/theme.js";

const W = 960;
const HORIZON = 380;
export const FLOOR = [400, 482];

// Oggetto "in piedi" sul pavimento: si disegna con profondità = base, così il giocatore
// può passarci davanti o dietro.
function standing(scene, baseY) {
  return scene.add.graphics().setDepth(baseY);
}

// ---------- Cielo e skyline per origine ----------

const SKY = {
  delhi: [0xe2d6bd, 0xd8c9a9, 0xcdbb98],
  milano: [0xe6e9e5, 0xd9dfe0, 0xc9d3d8],
  reykjavik: [0xeaf0f2, 0xd8e5ec, 0xc4d8e4]
};
const SKY_EVENING = [0x2c3e52, 0x25354a, 0x1f2c40];

export function drawBackdrop(scene, originId, { evening = false } = {}) {
  const g = scene.add.graphics();
  bandGradient(g, 0, 46, W, HORIZON - 46, evening ? SKY_EVENING : SKY[originId] ?? SKY.milano);

  const sunColor = evening ? 0xdadfda : originId === "delhi" ? 0xeee2c4 : COLORS.paper;
  pixelDisc(g, 760, 140, evening ? 26 : 42, sunColor, 1, 4);

  const far = evening ? 0x34485e : originId === "delhi" ? 0xbfae8c : COLORS.steelLight;
  const near = evening ? 0x1c2839 : originId === "delhi" ? 0x8f8064 : COLORS.steel;
  const lit = evening ? 0xe8c66a : null;

  g.fillStyle(far, 1);
  [[0, 90, 130], [120, 70, 180], [430, 80, 150], [640, 60, 210], [840, 120, 160]].forEach(([x, w, h]) => g.fillRect(x, HORIZON - h, w, h));

  g.fillStyle(near, 1);
  if (originId === "delhi") drawDelhi(g, near);
  else if (originId === "reykjavik") drawReykjavik(g, near, far);
  else drawMilano(g, near);

  // Finestre accese di sera, poche e calde
  if (lit) {
    g.fillStyle(lit, 1);
    [[70, 300], [86, 330], [520, 280], [700, 250], [716, 300], [880, 320], [900, 290]].forEach(([x, y]) => g.fillRect(x, y, 6, 8));
  }
  return g;
}

function drawMilano(g, color) {
  const b = HORIZON;
  // Duomo
  g.fillRect(200, b - 90, 190, 90);
  for (let x = 204; x < 390; x += 14) {
    const tall = (x - 204) % 42 === 0;
    g.fillRect(x, b - 90 - (tall ? 50 : 28), 4, tall ? 50 : 28);
  }
  g.fillRect(290, b - 176, 8, 86);
  // Torre Velasca
  g.fillRect(470, b - 180, 52, 180);
  g.fillRect(458, b - 236, 76, 56);
  // Pirelli
  g.fillRect(600, b - 260, 40, 260);
  g.fillRect(40, b - 110, 120, 110);
  g.fillRect(800, b - 120, 120, 120);
}

function drawDelhi(g, color) {
  const b = HORIZON;
  // India Gate
  g.fillRect(230, b - 150, 36, 150);
  g.fillRect(334, b - 150, 36, 150);
  g.fillRect(222, b - 176, 156, 30);
  g.fillRect(246, b - 190, 108, 14);
  // Cupole
  g.fillRect(470, b - 80, 140, 80);
  pixelDisc(g, 540, b - 80, 46, color, 1, 4);
  g.fillRect(536, b - 140, 8, 20);
  // Minareto (Qutub Minar)
  for (let i = 0; i < 6; i += 1) g.fillRect(680 + i * 2, b - 60 - i * 40, 32 - i * 4, 44);
  g.fillRect(40, b - 100, 130, 100);
  g.fillRect(820, b - 110, 120, 110);
}

function drawReykjavik(g, color, far) {
  const b = HORIZON;
  // Montagne lontane (Esja)
  g.fillStyle(far, 1);
  for (let i = 0; i < 24; i += 1) {
    const h = 50 + Math.max(0, 100 - Math.abs(i - 9) * 12);
    g.fillRect(i * 40, b - h, 40, h);
  }
  g.fillStyle(color, 1);
  // Hallgrímskirkja: torre a gradoni
  g.fillRect(430, b - 70, 160, 70);
  for (let i = 0; i < 7; i += 1) {
    const w = 140 - i * 20;
    g.fillRect(510 - w / 2, b - 88 - i * 18, w, 18);
  }
  g.fillRect(500, b - 250, 20, 60);
  g.fillRect(506, b - 270, 8, 20);
  // Casette con tetto a punta
  [[60, 0xb4553f], [150, COLORS.paper], [700, 0x7e9c8c], [800, COLORS.steelLight], [880, 0xb4553f]].forEach(([x, roof]) => {
    g.fillStyle(color, 1);
    g.fillRect(x, b - 60, 70, 60);
    g.fillStyle(roof, 1);
    for (let i = 0; i < 5; i += 1) g.fillRect(x + i * 7, b - 64 - i * 6, 70 - i * 14, 6);
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(x + 14, b - 44, 10, 12);
    g.fillRect(x + 44, b - 44, 10, 12);
  });
}

// ---------- Pavimenti ----------

function drawStreetFloor(scene, evening) {
  const g = scene.add.graphics();
  g.fillStyle(evening ? 0x6e7673 : COLORS.stone, 1);
  g.fillRect(0, HORIZON, W, 160);
  g.fillStyle(evening ? 0x5f6663 : 0x959c99, 1);
  for (let x = 0; x < W; x += 64) g.fillRect(x, HORIZON, 2, 160);
  for (let y = HORIZON + 40; y < 540; y += 40) g.fillRect(0, y, W, 2);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, HORIZON - 4, W, 4);
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
  return g;
}

// ---------- Elementi ----------

function drawHub(scene, x, baseY, evening) {
  // Hub BIODOM: bancone in acciaio con schermo e pianta sopra.
  const g = standing(scene, baseY);
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

// ---------- Location ----------

export function buildOffice(scene, originId, { evening = false } = {}) {
  drawRoom(scene, evening);
  const g = scene.add.graphics();

  // Finestra sulla città
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

  // Archivio
  drawPanel(g, 900, 230, 52, HORIZON - 230, { fill: COLORS.stone, border: COLORS.ink, borderWidth: 3 });

  const hub = drawHub(scene, 480, 456, evening);

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
      can: { x: 790, y: 450 }
    }
  };
}

export function buildFoodTruck(scene, originId, { evening = false } = {}) {
  drawBackdrop(scene, originId, { evening });
  drawStreetFloor(scene, evening);

  // Food truck
  const t = standing(scene, 412);
  const tx = 540;
  drawPanel(t, tx, 228, 320, 170, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 4 });
  t.fillStyle(COLORS.steel, 1);
  t.fillRect(tx + 4, 340, 312, 54);
  // Tendalino a strisce
  for (let i = 0; i < 10; i += 1) {
    t.fillStyle(i % 2 ? COLORS.paper : COLORS.red, 1);
    t.fillRect(tx + 30 + i * 22, 240, 22, 22);
  }
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx + 30, 262, 220, 4);
  // Finestra di servizio + bancone
  drawPanel(t, tx + 40, 268, 200, 70, { fill: COLORS.inkDeep, border: COLORS.ink });
  t.fillStyle(COLORS.stone, 1);
  t.fillRect(tx + 30, 336, 220, 10);
  // Insegna
  drawPanel(t, tx + 70, 200, 140, 30, { fill: COLORS.ink, border: COLORS.ink });
  // Ruote
  [tx + 60, tx + 250].forEach((wx) => {
    pixelDisc(t, wx, 400, 22, COLORS.inkDeep, 1, 4);
    pixelDisc(t, wx, 400, 8, COLORS.stone, 1, 4);
  });
  // Colonnina di ricarica
  drawPanel(t, tx + 274, 300, 30, 60, { fill: COLORS.ink, border: COLORS.inkDeep });
  t.fillStyle(0x7e9c8c, 1);
  t.fillRect(tx + 282, 310, 14, 8);

  const vendor = scene.add.image(tx + 140, 338, "npc_vendor").setOrigin(0.5, 1).setScale(3).setDepth(413);
  vendor.setCrop(0, 0, 14, 16);

  // Panchina
  const b = standing(scene, 452);
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

export function buildBusStop(scene, originId, { evening = true } = {}) {
  drawBackdrop(scene, originId, { evening });
  drawStreetFloor(scene, evening);

  // Pensilina
  const s = standing(scene, 410);
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

  // Palina BUS
  const p = standing(scene, 430);
  p.fillStyle(COLORS.ink, 1);
  p.fillRect(660, 250, 6, 180);
  drawPanel(p, 640, 228, 48, 40, { fill: COLORS.paper, border: COLORS.ink });
  scene.add.text(664, 248, "BUS", { fontFamily: '"Press Start 2P"', fontSize: "8px", color: "#163c4d" }).setOrigin(0.5).setDepth(431);

  // Lampione acceso
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

  // Serra domestica
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
