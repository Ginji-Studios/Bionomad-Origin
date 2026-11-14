// luoghi degli eventi disegnati con gli strumenti del concept (scala di grigi → palette).
// Gli interni hanno le finestre "bucate": dietro si vede la skyline della città.
// Coordinate logiche: alto 540, pavimento a GY = 480, largo LW = 1280 / k.
import { paint, GY } from "../world/skyline.js";
import { K } from "./people.js";

export const LW = Math.round(1280 / K);
const px = (x) => Math.round(x * K);

// pavimento interno a listelli
function floor(T, w) {
  const { X, G, rnd } = T;
  const g = X.createLinearGradient(0, GY, 0, 540);
  g.addColorStop(0, G(0.3));
  g.addColorStop(1, G(0.12));
  X.fillStyle = g;
  X.fillRect(0, GY, w, 60);
  for (let y = GY + 6; y < 540; y += 10) {
    X.fillStyle = G(0, 0.18);
    X.fillRect(0, y, w, 1);
    for (let x = (y / 10) % 2 ? 0 : 40; x < w; x += 80) X.fillRect(x, y - 9, 1, 9);
  }
  for (let i = 0; i < 60; i++) {
    X.fillStyle = G(1, 0.05);
    X.fillRect(rnd() * w, GY + rnd() * 60, 20 + rnd() * 40, 1);
  }
  X.fillStyle = G(0.75);
  X.fillRect(0, GY, w, 2);
}

// parete con finestre bucate (le finestre restano trasparenti)
function wall(T, w, windows, { tone = 0.3 } = {}) {
  const { X, G } = T;
  X.save();
  X.beginPath();
  X.rect(0, 0, w, GY);
  windows.forEach(([x, y, ww, hh]) => X.rect(x + ww, y, -ww, hh));
  X.clip("evenodd");
  const g = X.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, G(tone * 0.6));
  g.addColorStop(1, G(tone));
  X.fillStyle = g;
  X.fillRect(0, 0, w, GY);
  for (let x = 0; x < w; x += 6) {
    X.fillStyle = G(0, 0.06);
    X.fillRect(x, 0, 1, GY);
  }
  // battiscopa
  X.fillStyle = G(0.18);
  X.fillRect(0, GY - 14, w, 14);
  X.restore();
  // cornici delle finestre
  windows.forEach(([x, y, ww, hh]) => {
    X.strokeStyle = G(0.75);
    X.lineWidth = 4;
    X.strokeRect(x, y, ww, hh);
    X.fillStyle = G(0.75);
    X.fillRect(x + ww / 2 - 2, y, 4, hh);
    X.fillStyle = G(0.5);
    X.fillRect(x - 6, y + hh, ww + 12, 6);
  });
}

// hub BIODOM: colonna con vasca di vetro e piante, pannello luminoso
function hub(T, cx, base, s = 1) {
  const { X, G, fillP, lgx, stone } = T;
  stone([[cx - 26 * s, base], [cx - 26 * s, base - 70 * s], [cx + 26 * s, base - 70 * s], [cx + 26 * s, base]], 0.5, 0.3, { rib: 6 });
  // pannello di stato
  X.fillStyle = G(0.95);
  X.fillRect(cx - 12 * s, base - 50 * s, 24 * s, 10 * s);
  // vasca di vetro con piante
  const top = base - 150 * s;
  fillP([[cx - 34 * s, base - 70 * s], [cx - 34 * s, top], [cx + 34 * s, top], [cx + 34 * s, base - 70 * s]], G(0.25, 0.9));
  for (let i = 0; i < 7; i++) {
    const x = cx - 26 * s + i * 9 * s;
    X.strokeStyle = G(0.6);
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(x, base - 74 * s);
    X.quadraticCurveTo(x + 4, base - 100 * s, x + (i % 2 ? 6 : -6) * s, top + 18 * s + (i % 3) * 8 * s);
    X.stroke();
    for (let j = 0; j < 3; j++) {
      X.fillStyle = G(0.82 + 0.05 * j);
      X.beginPath();
      X.ellipse(x + (j % 2 ? 6 : -6) * s, top + 24 * s + (i % 3) * 8 * s + j * 14 * s, 8 * s, 3 * s, j % 2 ? -0.6 : 0.6, 0, 7);
      X.fill();
    }
  }
  X.strokeStyle = G(0.92);
  X.lineWidth = 2;
  X.strokeRect(cx - 34 * s, top, 68 * s, 80 * s);
  X.fillStyle = lgx(cx - 38 * s, cx + 38 * s, 0.7, 0.4);
  X.fillRect(cx - 38 * s, top - 8 * s, 76 * s, 8 * s);
}

function door(T, x, { lit = true } = {}) {
  const { X, G, stone } = T;
  stone([[x - 6, GY], [x - 6, GY - 200], [x + 96, GY - 200], [x + 96, GY]], 0.5, 0.36, { rib: 50 });
  X.fillStyle = G(0.18);
  X.fillRect(x + 4, GY - 190, 82, 190);
  X.fillStyle = G(0.26);
  X.fillRect(x + 12, GY - 180, 66, 70);
  X.fillRect(x + 12, GY - 100, 66, 92);
  X.fillStyle = G(0.9);
  X.fillRect(x + 70, GY - 100, 8, 4);
  if (lit) {
    // insegna di uscita
    X.fillStyle = G(0.95);
    X.fillRect(x + 26, GY - 226, 40, 14);
  }
}

function sofa(T, x, w) {
  const { stone } = T;
  stone([[x, GY], [x, GY - 60], [x + w, GY - 60], [x + w, GY]], 0.45, 0.3, { rib: 30 });
  stone([[x - 10, GY], [x - 10, GY - 80], [x + 14, GY - 80], [x + 14, GY]], 0.5, 0.34, { rib: 30 });
  stone([[x + w - 14, GY], [x + w - 14, GY - 80], [x + w + 10, GY - 80], [x + w + 10, GY]], 0.5, 0.34, { rib: 30 });
  stone([[x + 10, GY - 60], [x + 10, GY - 110], [x + w - 10, GY - 110], [x + w - 10, GY - 60]], 0.4, 0.26, { rib: 40 });
}

function table(T, x, w, h = 70) {
  const { X, G } = T;
  X.fillStyle = G(0.62);
  X.fillRect(x, GY - h, w, 6);
  X.fillStyle = G(0.2);
  X.fillRect(x + 6, GY - h + 6, 5, h - 6);
  X.fillRect(x + w - 11, GY - h + 6, 5, h - 6);
}

function desk(T, x) {
  const { X, G, lgx } = T;
  table(T, x, 150, 76);
  // monitor acceso
  X.fillStyle = G(0.15);
  X.fillRect(x + 40, GY - 140, 70, 48);
  X.fillStyle = lgx(x + 44, x + 106, 0.8, 0.55);
  X.fillRect(x + 44, GY - 136, 62, 40);
  X.fillStyle = G(0.15);
  X.fillRect(x + 70, GY - 92, 10, 16);
  // sedia
  X.fillStyle = G(0.2);
  X.fillRect(x + 20, GY - 96, 30, 44);
  X.fillRect(x + 16, GY - 54, 40, 8);
  X.fillRect(x + 32, GY - 46, 5, 46);
}

function plantPot(T, x, h = 60) {
  const { X, G, stone } = T;
  stone([[x - 16, GY], [x - 20, GY - 34], [x + 20, GY - 34], [x + 16, GY]], 0.5, 0.32, { rib: 6 });
  for (let i = 0; i < 9; i++) {
    X.fillStyle = G(0.55 + (i % 3) * 0.12);
    X.beginPath();
    X.ellipse(x + (i - 4) * 5, GY - 34 - h * 0.4 - (i % 3) * 10, 6, h * 0.35, (i - 4) * 0.25, 0, 7);
    X.fill();
  }
}

// ---------- luoghi ----------

function home(T) {
  const wins = [[150, 90, 220, 230], [470, 90, 220, 230]];
  wall(T, LW, wins, { tone: 0.34 });
  floor(T, LW);
  sofa(T, 60, 170);
  table(T, 300, 110, 50);
  plantPot(T, 440);
  hub(T, 590, GY, 1);
  door(T, LW - 130);
  // lampada da terra
  const { X, G } = T;
  X.fillStyle = G(0.15);
  X.fillRect(30, GY - 200, 4, 200);
  X.fillStyle = G(0.9);
  X.fillRect(16, GY - 214, 32, 16);
  return { hub: 590, door: LW - 85 };
}

function office(T) {
  const wins = [[40, 70, 520, 220]];
  wall(T, LW, wins, { tone: 0.38 });
  // montanti della vetrata continua
  const { X, G, stone } = T;
  for (let x = 40; x <= 560; x += 104) {
    X.fillStyle = G(0.72);
    X.fillRect(x - 2, 70, 4, 220);
  }
  floor(T, LW);
  desk(T, 40);
  desk(T, 230);
  hub(T, 470, GY, 1);
  // condizionatore a parete
  stone([[600, 120], [600, 70], [720, 70], [720, 120]], 0.75, 0.55, { rib: 4 });
  X.fillStyle = G(0.2);
  X.fillRect(608, 108, 104, 4);
  // annaffiatoio su un mobiletto
  table(T, 380, 60, 60);
  X.fillStyle = G(0.6);
  X.fillRect(395, GY - 86, 30, 24);
  X.fillRect(425, GY - 82, 16, 4);
  door(T, LW - 130);
  return { can: 410, hub: 470, ac: 660, door: LW - 85 };
}

function bus(T) {
  const { X, G, stone } = T;
  const wins = [];
  for (let x = 30; x < LW; x += 170) wins.push([x, 110, 150, 150]);
  wall(T, LW, wins, { tone: 0.42 });
  // soffitto e corrimano
  X.fillStyle = G(0.22);
  X.fillRect(0, 0, LW, 60);
  X.fillStyle = G(0.8);
  X.fillRect(0, 64, LW, 4);
  for (let x = 120; x < LW; x += 170) {
    X.fillStyle = G(0.75);
    X.fillRect(x, 64, 5, GY - 64);
  }
  // pavimento in gomma
  const g = X.createLinearGradient(0, GY, 0, 540);
  g.addColorStop(0, G(0.26));
  g.addColorStop(1, G(0.1));
  X.fillStyle = g;
  X.fillRect(0, GY, LW, 60);
  for (let x = 0; x < LW; x += 8) {
    X.fillStyle = G(0, 0.15);
    X.fillRect(x, GY, 2, 60);
  }
  X.fillStyle = G(0.75);
  X.fillRect(0, GY, LW, 2);
  // sedili
  for (let x = 30; x < LW; x += 170) {
    stone([[x + 20, GY - 40], [x + 20, GY - 120], [x + 40, GY - 120], [x + 40, GY - 40]], 0.5, 0.3, { rib: 8 });
    stone([[x + 20, GY - 40], [x + 20, GY - 56], [x + 110, GY - 56], [x + 110, GY - 40]], 0.5, 0.3, { rib: 20 });
    X.fillStyle = G(0.15);
    X.fillRect(x + 60, GY - 40, 6, 40);
  }
  return { seat: 400 };
}

// esterni: solo gli oggetti in primo piano, il cielo e la città arrivano dalla skyline
function busstop(T) {
  const { X, G, stone, lgx } = T;
  // pensilina
  X.fillStyle = G(0.12);
  X.fillRect(300, GY - 230, 6, 230);
  X.fillRect(560, GY - 230, 6, 230);
  X.fillStyle = lgx(290, 580, 0.7, 0.45);
  X.fillRect(286, GY - 244, 296, 16);
  X.fillStyle = G(0.4, 0.55);
  X.fillRect(306, GY - 228, 254, 150);
  X.strokeStyle = G(0.85);
  X.lineWidth = 2;
  X.strokeRect(306, GY - 228, 254, 150);
  // panchina
  stone([[330, GY - 50], [330, GY - 62], [530, GY - 62], [530, GY - 50]], 0.6, 0.4, { rib: 20 });
  X.fillStyle = G(0.12);
  X.fillRect(345, GY - 50, 6, 50);
  X.fillRect(510, GY - 50, 6, 50);
  // palina con il cartello
  X.fillStyle = G(0.12);
  X.fillRect(680, GY - 260, 6, 260);
  X.fillStyle = G(0.92);
  X.fillRect(656, GY - 280, 54, 40);
  X.fillStyle = G(0.15);
  X.fillRect(664, GY - 272, 38, 6);
  X.fillRect(664, GY - 260, 26, 6);
  return { man: 520, stop: 683 };
}

function foodtruck(T) {
  const { X, G, stone, lgx, fillP } = T;
  // furgone
  const x = 300;
  stone([[x, GY - 30], [x, GY - 220], [x + 300, GY - 220], [x + 300, GY - 30]], 0.66, 0.42, { rib: 40 });
  fillP([[x + 300, GY - 30], [x + 300, GY - 170], [x + 360, GY - 150], [x + 380, GY - 100], [x + 380, GY - 30]], lgx(x + 300, x + 380, 0.6, 0.38));
  X.fillStyle = G(0.85);
  X.fillRect(x + 320, GY - 150, 36, 40);
  // finestra di servizio illuminata con tendina a strisce
  X.fillStyle = G(0.95);
  X.fillRect(x + 50, GY - 170, 180, 80);
  for (let i = 0; i < 9; i++) {
    X.fillStyle = G(i % 2 ? 0.85 : 0.35);
    X.fillRect(x + 40 + i * 22, GY - 200, 22, 20);
  }
  X.fillStyle = G(0.4);
  X.fillRect(x + 40, GY - 92, 200, 8);
  // ruote
  [x + 60, x + 300].forEach((wx) => {
    X.fillStyle = G(0.08);
    X.beginPath();
    X.arc(wx, GY - 22, 24, 0, 7);
    X.fill();
    X.fillStyle = G(0.5);
    X.beginPath();
    X.arc(wx, GY - 22, 9, 0, 7);
    X.fill();
  });
  // colonnina di ricarica
  stone([[110, GY], [110, GY - 130], [150, GY - 130], [150, GY]], 0.6, 0.4, { rib: 5 });
  X.fillStyle = G(0.95);
  X.fillRect(118, GY - 116, 24, 16);
  X.strokeStyle = G(0.2);
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(150, GY - 80);
  X.quadraticCurveTo(175, GY - 30, 168, GY - 4);
  X.stroke();
  // panchina
  stone([[720, GY - 50], [720, GY - 62], [840, GY - 62], [840, GY - 50]], 0.6, 0.4, { rib: 20 });
  stone([[720, GY - 62], [720, GY - 100], [730, GY - 100], [730, GY - 62]], 0.6, 0.4);
  X.fillStyle = G(0.12);
  X.fillRect(732, GY - 50, 6, 50);
  X.fillRect(822, GY - 50, 6, 50);
  return { charger: 130, counter: 440, bench: 780 };
}

const PLACES = { home, office, bus, busstop, foodtruck };
export const OUTDOOR = new Set(["busstop", "foodtruck", "street"]);

// disegna un luogo: canvas a schermo intero + punti (in pixel) dei bersagli
export function buildPlace(id) {
  let pts = {};
  const canvas = paint(1280, 800, K, (T) => {
    pts = (PLACES[id] ?? home)(T) ?? {};
  }, { seedValue: 21 });
  const points = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, px(v)]));
  return { canvas, points, floorY: px(GY) };
}
