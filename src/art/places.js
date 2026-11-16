// luoghi degli eventi disegnati con gli strumenti del concept (scala di grigi → palette).
// Gli interni hanno le finestre "bucate": dietro si vede la skyline della città.
// Coordinate logiche: alto 540, pavimento a GY = 480, largo LW = 1280 / k.
import { paint, GY } from "../world/skyline.js";
import { K } from "./people.js";
import { POSTER_IMG } from "../ui/posters.js";

// manifesto BIODOM in cornice: l'immagine originale passa in scala di grigi (più luminosa e
// contrastata, così le scritte restano leggibili) e poi il retino della palette la ridisegna.
// Dentro i luoghi il manifesto viene messo in coda e retinato a parte a grana fine (cell 1).
let QUEUE = null;
// la cutscene finale disegna il divano a parte (sprite nel piano del personaggio)
let NO_SOFA = false;
export function posterArt(T, key, x, y, w, h, { frame = true } = {}) {
  if (QUEUE && !T.direct) {
    QUEUE.push([key, x, y, w, h, frame]);
    return;
  }
  const { X, G } = T;
  const img = POSTER_IMG[key];
  if (frame) {
    X.fillStyle = G(0.1);
    X.fillRect(x - 4, y - 4, w + 8, h + 8);
    X.fillStyle = G(0.72);
    X.fillRect(x - 2, y - 2, w + 4, h + 4);
  }
  if (img) {
    X.save();
    X.filter = "grayscale(1) brightness(1.35) contrast(1.5)";
    X.imageSmoothingEnabled = true;
    X.drawImage(img, x, y, w, h);
    X.restore();
  } else {
    X.fillStyle = G(0.5);
    X.fillRect(x, y, w, h);
  }
  if (frame) {
    X.fillStyle = G(0.95);
    [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]].forEach(([a, b]) => X.fillRect(a, b, 3, 3));
  }
}

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
  // seduta all'altezza giusta per i personaggi (ci si siede sopra nella cutscene finale)
  stone([[x, GY], [x, GY - 42], [x + w, GY - 42], [x + w, GY]], 0.45, 0.3, { rib: 30 });
  stone([[x - 10, GY], [x - 10, GY - 64], [x + 14, GY - 64], [x + 14, GY]], 0.5, 0.34, { rib: 30 });
  stone([[x + w - 14, GY], [x + w - 14, GY - 64], [x + w + 10, GY - 64], [x + w + 10, GY]], 0.5, 0.34, { rib: 30 });
  stone([[x + 10, GY - 42], [x + 10, GY - 100], [x + w - 10, GY - 100], [x + w - 10, GY - 42]], 0.4, 0.26, { rib: 40 });
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

// ---------- arredi per città ----------

// parquet a spina di pesce (Milano)
function herringbone(T, w) {
  const { X, G } = T;
  X.fillStyle = G(0.32);
  X.fillRect(0, GY, w, 60);
  for (let y = GY; y < 540; y += 8) {
    for (let x = ((y - GY) / 8) % 2 ? 0 : 12; x < w; x += 24) {
      X.fillStyle = G(0.22 + ((x + y) % 3) * 0.04);
      X.fillRect(x, y, 12, 4);
      X.fillStyle = G(0, 0.25);
      X.fillRect(x + 12, y, 1, 8);
    }
  }
  X.fillStyle = G(0.75);
  X.fillRect(0, GY, w, 2);
}

// assi di legno chiaro (Reykjavík)
function planksFloor(T, w) {
  const { X, G, rnd } = T;
  X.fillStyle = G(0.42);
  X.fillRect(0, GY, w, 60);
  for (let y = GY + 8; y < 540; y += 12) {
    X.fillStyle = G(0, 0.2);
    X.fillRect(0, y, w, 1);
    for (let x = rnd() * 120; x < w; x += 140 + rnd() * 80) X.fillRect(x, y - 11, 1, 11);
  }
  X.fillStyle = G(0.8);
  X.fillRect(0, GY, w, 2);
}

// boiserie: pannelli a rilievo nella parte bassa della parete (Milano)
function wainscot(T, w, skip = []) {
  const { X, G } = T;
  X.fillStyle = G(0.4);
  X.fillRect(0, GY - 150, w, 4);
  for (let x = 20; x < w - 60; x += 110) {
    if (skip.some(([a, b]) => x + 90 > a && x < b)) continue;
    X.strokeStyle = G(0.48);
    X.lineWidth = 2;
    X.strokeRect(x, GY - 130, 90, 100);
  }
}

// assi orizzontali di legno sulle pareti (Reykjavík)
function plankWall(T, w, wins) {
  const { X, G } = T;
  for (let y = 20; y < GY - 14; y += 22) {
    X.fillStyle = G(0, 0.16);
    const inWin = (x) => wins.some(([wx, wy, ww, hh]) => x > wx && x < wx + ww && y > wy && y < wy + hh);
    for (let x = 0; x < w; x += 4) if (!inWin(x)) X.fillRect(x, y, 4, 2);
  }
}

// arco a sesto acuto sopra la finestra + grata jaali sul vetro (Delhi)
function jharokha(T, [x, y, ww, hh]) {
  const { X, G } = T;
  X.strokeStyle = G(0.82);
  X.lineWidth = 5;
  X.beginPath();
  X.moveTo(x - 8, y + 4);
  X.quadraticCurveTo(x - 4, y - 60, x + ww / 2, y - 80);
  X.quadraticCurveTo(x + ww + 4, y - 60, x + ww + 8, y + 4);
  X.stroke();
  X.strokeStyle = G(0.7, 0.55);
  X.lineWidth = 2;
  for (let i = -hh; i < ww; i += 26) {
    X.beginPath();
    X.moveTo(x + Math.max(0, i), y + Math.max(0, -i));
    X.lineTo(x + Math.min(ww, i + hh), y + Math.min(hh, hh - (i + hh - ww) * (i + hh > ww ? 1 : 0)));
    X.stroke();
    X.beginPath();
    X.moveTo(x + ww - Math.max(0, i), y + Math.max(0, -i));
    X.lineTo(x + ww - Math.min(ww, i + hh), y + Math.min(hh, hh - (i + hh - ww) * (i + hh > ww ? 1 : 0)));
    X.stroke();
  }
  // tettuccio sporgente
  X.fillStyle = G(0.6);
  X.fillRect(x - 16, y - 86, ww + 32, 8);
}

// davanzale con la neve (Reykjavík)
function snowSill(T, [x, y, ww, hh]) {
  const { X, G } = T;
  X.fillStyle = G(0.95);
  X.beginPath();
  X.ellipse(x + ww / 2, y + hh - 2, ww / 2 - 6, 6, 0, Math.PI, 0);
  X.fill();
}

// fregio a motivi geometrici lungo la parete (Delhi)
function frieze(T, w, y) {
  const { X, G } = T;
  X.fillStyle = G(0.5);
  X.fillRect(0, y, w, 16);
  for (let x = 0; x < w; x += 20) {
    X.fillStyle = G(0.75);
    X.beginPath();
    X.moveTo(x, y + 8);
    X.lineTo(x + 10, y + 2);
    X.lineTo(x + 20, y + 8);
    X.lineTo(x + 10, y + 14);
    X.fill();
  }
}

// tappeto a righe e bordo decorato
function rug(T, x, w, tone = 0.55) {
  const { X, G } = T;
  X.fillStyle = G(tone);
  X.fillRect(x, GY + 6, w, 22);
  for (let i = 0; i < w; i += 12) {
    X.fillStyle = G(tone + 0.2);
    X.fillRect(x + i, GY + 10, 6, 3);
    X.fillRect(x + i + 6, GY + 21, 6, 3);
  }
  X.fillStyle = G(tone - 0.25);
  X.fillRect(x, GY + 15, w, 2);
}

// ventilatore a soffitto
function ceilingFan(T, x) {
  const { X, G } = T;
  X.fillStyle = G(0.2);
  X.fillRect(x - 2, 0, 4, 40);
  X.fillStyle = G(0.65);
  X.fillRect(x - 70, 40, 140, 6);
  X.fillStyle = G(0.85);
  X.fillRect(x - 8, 36, 16, 14);
}

// stufa a legna con tubo e fuoco (Reykjavík)
function stove(T, x) {
  const { X, G, stone } = T;
  stone([[x, GY], [x, GY - 90], [x + 70, GY - 90], [x + 70, GY]], 0.3, 0.16, { rib: 10 });
  X.fillStyle = G(0.95);
  X.fillRect(x + 14, GY - 70, 42, 30);
  X.fillStyle = G(0.75);
  for (let i = 0; i < 4; i++) X.fillRect(x + 18 + i * 10, GY - 52 - (i % 2) * 8, 5, 12 + (i % 2) * 8);
  X.fillStyle = G(0.22);
  X.fillRect(x + 28, 0, 14, GY - 90);
}

function picture(T, x, y, w, h) {
  const { X, G, lgx } = T;
  X.fillStyle = G(0.75);
  X.fillRect(x - 4, y - 4, w + 8, h + 8);
  X.fillStyle = lgx(x, x + w, 0.35, 0.6);
  X.fillRect(x, y, w, h);
  X.fillStyle = G(0.85);
  X.beginPath();
  X.arc(x + w * 0.7, y + h * 0.35, h * 0.15, 0, 7);
  X.fill();
}

// libreria a muro: fianchi e ripiani in legno, libri appoggiati di varie altezze,
// qualcuno inclinato, e un oggetto per ripiano
function shelf(T, x, y, w, n = 3) {
  const { X, G } = T;
  const rowH = 44;
  const h = n * rowH + 6;
  // fondo e fianchi
  X.fillStyle = G(0.24);
  X.fillRect(x, y - rowH + 6, w, h);
  X.fillStyle = G(0.58);
  X.fillRect(x - 4, y - rowH + 2, 4, h + 4);
  X.fillRect(x + w, y - rowH + 2, 4, h + 4);
  X.fillRect(x - 4, y - rowH, w + 8, 4);
  for (let r = 0; r < n; r++) {
    const by = y + r * rowH;
    let bx = x + 3;
    let i = 0;
    while (bx < x + w - 14) {
      const bw = 5 + ((i * 3 + r) % 3) * 2;
      const bh = 22 + ((i * 7 + r * 5) % 4) * 4;
      X.fillStyle = G(0.36 + ((i * 7 + r * 3) % 5) * 0.11);
      if (i % 6 === 5) {
        // libro inclinato appoggiato al vicino
        X.save();
        X.translate(bx, by);
        X.rotate(0.3);
        X.fillRect(0, -bh + 4, bw, bh - 4);
        X.restore();
        bx += bw + 6;
      } else {
        X.fillRect(bx, by - bh, bw, bh);
        X.fillStyle = G(0.85, 0.5);
        X.fillRect(bx + 1, by - bh + 4, bw - 2, 1);
        bx += bw + 1;
      }
      i++;
      if (i === 4 + r) {
        // soprammobile: un vasetto
        X.fillStyle = G(0.8);
        X.fillRect(bx + 4, by - 12, 10, 12);
        bx += 20;
      }
    }
    // ripiano
    X.fillStyle = G(0.62);
    X.fillRect(x, by, w, 4);
    X.fillStyle = G(0.4);
    X.fillRect(x, by + 4, w, 2);
  }
}

// ---------- luoghi ----------

function home(T, city) {
  const { X, G } = T;
  const wins = city === "reykjavik" ? [[170, 130, 180, 170], [490, 130, 180, 170]] : city === "delhi" ? [[160, 130, 200, 200], [480, 130, 200, 200]] : [[150, 70, 220, 250], [470, 70, 220, 250]];
  wall(T, LW, wins, { tone: city === "reykjavik" ? 0.4 : city === "delhi" ? 0.36 : 0.34 });
  if (city === "milano") {
    herringbone(T, LW);
    wainscot(T, LW, [[560, 640]]);
    picture(T, 720, 150, 90, 64);
    // lampada ad arco
    X.strokeStyle = G(0.6);
    X.lineWidth = 4;
    X.beginPath();
    X.moveTo(36, GY);
    X.lineTo(36, GY - 160);
    X.quadraticCurveTo(60, GY - 300, 230, GY - 230);
    X.stroke();
    X.fillStyle = G(0.92);
    X.beginPath();
    X.arc(232, GY - 222, 16, Math.PI, 0);
    X.fill();
    if (!NO_SOFA) sofa(T, 60, 170);
    table(T, 300, 110, 50);
  } else if (city === "delhi") {
    floor(T, LW);
    frieze(T, LW, GY - 160);
    wins.forEach((w) => jharokha(T, w));
    ceilingFan(T, 760);
    rug(T, 40, 360, 0.5);
    // divano basso con cuscini e rulli
    const { stone } = T;
    if (!NO_SOFA) {
      stone([[60, GY], [60, GY - 40], [250, GY - 40], [250, GY]], 0.45, 0.3, { rib: 30 });
      for (let i = 0; i < 4; i++) stone([[70 + i * 44, GY - 40], [70 + i * 44, GY - 78], [108 + i * 44, GY - 78], [108 + i * 44, GY - 40]], 0.7, 0.5, { rib: 10 });
    }
    // lanterna d'ottone appesa
    X.fillStyle = G(0.2);
    X.fillRect(318, 0, 2, 120);
    X.fillStyle = G(0.85);
    X.beginPath();
    X.moveTo(306, 120);
    X.lineTo(332, 120);
    X.lineTo(326, 150);
    X.lineTo(312, 150);
    X.fill();
    table(T, 300, 90, 36);
    // nicchia ad arco con vaso
    X.fillStyle = G(0.22);
    X.beginPath();
    X.moveTo(740, GY - 60);
    X.lineTo(740, GY - 180);
    X.quadraticCurveTo(775, GY - 230, 810, GY - 180);
    X.lineTo(810, GY - 60);
    X.fill();
    X.fillStyle = G(0.7);
    X.fillRect(762, GY - 110, 26, 40);
  } else {
    planksFloor(T, LW);
    plankWall(T, LW, wins);
    wins.forEach((w) => snowSill(T, w));
    rug(T, 60, 240, 0.62);
    stove(T, 760);
    shelf(T, 364, 200, 116, 2);
    if (!NO_SOFA) sofa(T, 60, 170);
    table(T, 300, 110, 50);
  }
  plantPot(T, 440);
  hub(T, 590, GY, 1);
  door(T, LW - 130);
  if (city !== "milano") {
    // lampada da terra
    X.fillStyle = G(0.15);
    X.fillRect(30, GY - 200, 4, 200);
    X.fillStyle = G(0.9);
    X.fillRect(16, GY - 214, 32, 16);
  }
  // seduta del divano e finestre (per la luce della luna nella cutscene finale)
  return { hub: 590, door: LW - 85, sofa: 150, seat: GY - (city === "delhi" ? 40 : 42), w0x: wins[0][0], w0y: wins[0][1], w0w: wins[0][2], w0h: wins[0][3], w1x: wins[1][0], w1y: wins[1][1], w1w: wins[1][2], w1h: wins[1][3] };
}

function office(T, city) {
  const { X, G, stone } = T;
  const wins = city === "delhi" ? [[40, 90, 240, 190], [320, 90, 240, 190]] : city === "reykjavik" ? [[60, 90, 480, 200]] : [[40, 70, 520, 220]];
  wall(T, LW, wins, { tone: city === "reykjavik" ? 0.44 : 0.38 });
  if (city === "milano") {
    // vetrata continua con montanti sottili, poster di design
    for (let x = 40; x <= 560; x += 104) {
      X.fillStyle = G(0.72);
      X.fillRect(x - 2, 70, 4, 220);
    }
    floor(T, LW);
    picture(T, 780, 120, 120, 80);
  } else if (city === "delhi") {
    // tapparelle mezze abbassate, ventilatori a soffitto, calendario, raffrescatore
    wins.forEach(([x, y, ww]) => {
      for (let i = 0; i < 9; i++) {
        X.fillStyle = G(0.62);
        X.fillRect(x, y + i * 8, ww, 5);
      }
    });
    floor(T, LW);
    ceilingFan(T, 150);
    ceilingFan(T, 700);
    X.fillStyle = G(0.9);
    X.fillRect(780, 130, 60, 76);
    X.fillStyle = G(0.3);
    X.fillRect(780, 130, 60, 14);
    for (let i = 0; i < 12; i++) X.fillRect(786 + (i % 4) * 13, 152 + Math.floor(i / 4) * 16, 8, 8);
    stone([[860, GY], [860, GY - 120], [930, GY - 120], [930, GY]], 0.66, 0.45, { rib: 6 });
    for (let i = 0; i < 6; i++) {
      X.fillStyle = G(0.25);
      X.fillRect(868, GY - 110 + i * 12, 54, 4);
    }
  } else {
    // legno chiaro, soffitto a doghe, piante e neve sul davanzale
    planksFloor(T, LW);
    for (let x = 0; x < LW; x += 18) {
      X.fillStyle = G(0.55);
      X.fillRect(x, 0, 12, 34);
    }
    wins.forEach((w) => snowSill(T, w));
    plantPot(T, 800, 80);
    plantPot(T, 600, 50);
  }
  desk(T, 40);
  desk(T, 230);
  hub(T, 470, GY, 1);
  // condizionatore a parete
  stone([[600, 120], [600, 70], [720, 70], [720, 120]], 0.75, 0.55, { rib: 4 });
  X.fillStyle = G(0.2);
  X.fillRect(608, 108, 104, 4);
  posterArt(T, "poster_4", 606, 150, 110, 61);
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
  // proporzioni sulle persone: soffitto poco sopra le teste, finestrini all'altezza del busto
  const CEIL = GY - 200;
  const WY = GY - 175;
  const WH = 105;
  const wins = [];
  for (let x = 30; x < LW; x += 170) wins.push([x, WY, 150, WH]);
  wall(T, LW, wins, { tone: 0.42 });
  // sopra il soffitto: cielo del bus "pieno", con le luci a striscia e i manifesti pubblicitari
  X.fillStyle = G(0.16);
  X.fillRect(0, 0, LW, CEIL);
  X.fillStyle = G(0.24);
  X.fillRect(0, CEIL - 46, LW, 46);
  for (let x = 40; x < LW; x += 170) {
    X.fillStyle = G(0.92);
    X.fillRect(x, CEIL - 10, 110, 4);
  }
  // un solo spazio pubblicitario, al centro della carrozza
  posterArt(T, "poster_4", 372, CEIL - 120, 120, 66);
  // corrimano all'altezza delle mani alzate e pali verticali
  X.fillStyle = G(0.8);
  X.fillRect(0, CEIL + 8, LW, 4);
  for (let x = 120; x < LW; x += 170) {
    X.fillStyle = G(0.75);
    X.fillRect(x, CEIL + 8, 5, GY - CEIL - 8);
    // maniglie a cinghia
    X.fillStyle = G(0.6);
    X.fillRect(x + 40, CEIL + 12, 2, 18);
    X.fillRect(x + 36, CEIL + 30, 10, 8);
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
  // sedili alla misura delle persone
  for (let x = 30; x < LW; x += 170) {
    stone([[x + 20, GY - 34], [x + 20, GY - 92], [x + 34, GY - 92], [x + 34, GY - 34]], 0.5, 0.3, { rib: 8 });
    stone([[x + 20, GY - 34], [x + 20, GY - 46], [x + 96, GY - 46], [x + 96, GY - 34]], 0.5, 0.3, { rib: 20 });
    X.fillStyle = G(0.15);
    X.fillRect(x + 54, GY - 34, 6, 34);
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
  posterArt(T, "poster_2", 318, GY - 220, 70, 98);
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
  // il dipendente dietro al bancone: grembiule, cappellino, mano appoggiata
  const vx = x + 202; // a destra, così il riquadro del bancone non lo copre
  const vy = GY - 92;
  X.fillStyle = G(0.3);
  X.beginPath();
  X.moveTo(vx - 22, vy);
  X.quadraticCurveTo(vx - 22, vy - 34, vx, vy - 36);
  X.quadraticCurveTo(vx + 22, vy - 34, vx + 22, vy);
  X.fill();
  X.fillStyle = G(0.82);
  X.fillRect(vx - 11, vy - 30, 22, 30);
  X.fillStyle = G(0.3);
  X.fillRect(vx - 6, vy - 30, 2, 8);
  X.fillRect(vx + 4, vy - 30, 2, 8);
  X.fillStyle = G(0.5);
  X.fillRect(vx - 4, vy - 42, 8, 8);
  X.fillStyle = G(0.6);
  X.beginPath();
  X.ellipse(vx, vy - 54, 11, 13, 0, 0, 7);
  X.fill();
  X.fillStyle = G(0.05);
  X.fillRect(vx - 6, vy - 56, 3, 3);
  X.fillRect(vx + 3, vy - 56, 3, 3);
  X.fillStyle = G(0.3);
  X.fillRect(vx - 3, vy - 47, 6, 2);
  X.fillStyle = G(0.75);
  X.fillRect(vx - 12, vy - 70, 24, 7);
  X.fillRect(vx - 14, vy - 64, 28, 3);
  X.fillStyle = G(0.6);
  X.beginPath();
  X.ellipse(vx + 26, vy - 4, 6, 4, 0, 0, 7);
  X.fill();
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
  // cartellone pubblicitario BIODOM su due pali
  X.fillStyle = G(0.14);
  X.fillRect(712, GY - 150, 6, 150);
  X.fillRect(842, GY - 150, 6, 150);
  posterArt(T, "poster_5", 690, GY - 250, 180, 100);
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
export function buildPlace(id, city = "milano", { sofa: withSofa = true } = {}) {
  let pts = {};
  QUEUE = [];
  NO_SOFA = !withSofa;
  const canvas = paint(1280, 800, K, (T) => {
    pts = (PLACES[id] ?? home)(T, city) ?? {};
  }, { seedValue: 21 });
  // manifesti retinati a grana fine e incollati sopra
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  QUEUE.forEach(([key, x, y, w, h, frame]) => {
    const pad = 4;
    const c = paint((w + pad * 2) * K, (h + pad * 2) * K, K, (T) => posterArt({ ...T, direct: true }, key, pad, pad, w, h, { frame }), { cell: 1, seedValue: 9 });
    ctx.drawImage(c, Math.round((x - pad) * K), Math.round((y - pad) * K));
  });
  QUEUE = null;
  NO_SOFA = false;
  const points = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, px(v)]));
  return { canvas, points, floorY: px(GY) };
}


// divano come sprite a parte, nel piano dove cammina il personaggio: la seduta è all'altezza
// del bacino della posa seduta, così ci si siede SOPRA (gambe davanti alla seduta, piedi a terra).
// seatPx = altezza della seduta in px a schermo. Origine in basso al centro.
export function sofaSprite(scene, city, seatPx) {
  const key = `sofa_${city}_${seatPx}`;
  if (scene.textures.exists(key)) return key;
  const s = seatPx / K; // seduta in unità logiche
  const W = 210;
  const H = s + 54;
  scene.textures.addCanvas(key, paint(Math.round(W * K), Math.round(H * K), K, (T) => {
    const { X, G, stone } = T;
    const b = H - 1;
    const x0 = 14;
    const x1 = W - 14;
    if (city === "delhi") {
      // divano basso con cuscini colorati e rulli
      stone([[x0, b], [x0, b - s], [x1, b - s], [x1, b]], 0.45, 0.3, { rib: 30 });
      for (let i = 0; i < 4; i++) {
        const cx = x0 + 8 + i * ((x1 - x0 - 16) / 4);
        stone([[cx, b - s], [cx, b - s - 40], [cx + 38, b - s - 40], [cx + 38, b - s]], 0.72, 0.5, { rib: 10 });
      }
      X.fillStyle = G(0.6);
      X.beginPath();
      X.ellipse(x0 + 2, b - s - 6, 9, 9, 0, 0, 7);
      X.ellipse(x1 - 2, b - s - 6, 9, 9, 0, 0, 7);
      X.fill();
    } else {
      // schienale, seduta con due cuscini, braccioli, piedini
      stone([[x0 + 8, b - s], [x0 + 8, b - s - 46], [x1 - 8, b - s - 46], [x1 - 8, b - s]], 0.5, 0.34, { rib: 40 });
      // cuscini dello schienale
      const half = (x1 - x0 - 16) / 2;
      [0, 1].forEach((i) => stone([[x0 + 12 + i * half, b - s - 4], [x0 + 12 + i * half, b - s - 40], [x0 + 8 + (i + 1) * half, b - s - 40], [x0 + 8 + (i + 1) * half, b - s - 4]], 0.64, 0.44, { rib: 60 }));
      // seduta: il bordo davanti
      stone([[x0, b - 6], [x0, b - s], [x1, b - s], [x1, b - 6]], 0.6, 0.4, { rib: 30 });
      // la superficie dei cuscini, appena più chiara
      X.fillStyle = G(0.82);
      X.fillRect(x0 + 2, b - s, x1 - x0 - 4, 3);
      X.fillStyle = G(0.2);
      X.fillRect((x0 + x1) / 2 - 1, b - s, 2, s - 6);
      // braccioli
      [x0 - 8, x1 - 16].forEach((ax) => {
        stone([[ax, b - 6], [ax, b - s - 20], [ax + 24, b - s - 20], [ax + 24, b - 6]], 0.68, 0.46, { rib: 30 });
        X.fillStyle = G(0.88);
        X.fillRect(ax + 1, b - s - 20, 22, 2);
      });
      // ombra sotto la seduta
      X.fillStyle = G(0.08);
      X.fillRect(x0, b - 7, x1 - x0, 2);
      // piedini
      X.fillStyle = G(0.12);
      [x0 - 4, x1 - 2].forEach((fx) => X.fillRect(fx, b - 6, 4, 6));
    }
  }, { seedValue: 31 }));
  return key;
}

// autobus urbano di profilo, retinato come il resto del gioco (verso destra).
// Origine in basso a sinistra; altezza in px a schermo.
export function busSprite(scene, city) {
  const key = `bus_side_${city}`;
  if (scene.textures.exists(key)) return key;
  const W = 420;
  const H = 214;
  scene.textures.addCanvas(key, paint(Math.round(W * K), Math.round(H * K), K, (T) => {
    const { X, G, lgx, fillP } = T;
    const g0 = 186; // linea delle ruote
    const top = 12;
    // ombra a terra
    X.fillStyle = G(0.05, 0.6);
    X.fillRect(20, g0 + 18, W - 40, 6);
    // carrozzeria: fianco con il muso arrotondato a destra
    const body = [[6, g0], [6, top + 14], [16, top], [W - 40, top], [W - 14, top + 10], [W - 6, top + 40], [W - 4, g0 - 20], [W - 8, g0]];
    const g = X.createLinearGradient(0, top, 0, g0);
    g.addColorStop(0, G(0.78));
    g.addColorStop(0.55, G(0.62));
    g.addColorStop(1, G(0.42));
    fillP(body, g);
    // tetto: climatizzatore e bordo chiaro
    X.fillStyle = G(0.5);
    X.fillRect(70, top - 8, 110, 9);
    X.fillRect(230, top - 6, 70, 7);
    X.fillStyle = G(0.92);
    X.fillRect(16, top, W - 56, 2);
    // fascia scura dei finestrini e parabrezza inclinato
    const wy = top + 22;
    const wh = 62;
    X.fillStyle = G(0.12);
    X.fillRect(14, wy, W - 70, wh);
    fillP([[W - 52, wy], [W - 30, wy], [W - 12, wy + 30], [W - 10, wy + wh + 10], [W - 52, wy + wh + 10]], G(0.14));
    // montanti e riflessi diagonali sul vetro
    for (let x = 14; x < W - 60; x += 64) {
      X.fillStyle = G(0.62);
      X.fillRect(x + 60, wy, 5, wh);
    }
    X.save();
    X.beginPath();
    X.rect(14, wy, W - 26, wh + 10);
    X.clip();
    X.strokeStyle = G(0.85, 0.45);
    X.lineWidth = 5;
    for (let x = 0; x < W; x += 90) {
      X.beginPath();
      X.moveTo(x, wy + wh);
      X.lineTo(x + 40, wy);
      X.stroke();
    }
    X.restore();
    // qualche passeggero in controluce
    X.fillStyle = G(0.3);
    [[40, 0.9], [128, 1], [204, 0.85], [286, 1]].forEach(([px, sc]) => {
      X.beginPath();
      X.arc(px, wy + wh - 30 * sc, 9 * sc, 0, 7);
      X.fill();
      X.fillRect(px - 13 * sc, wy + wh - 20 * sc, 26 * sc, 20 * sc);
    });
    // insegna di linea luminosa sopra il parabrezza
    X.fillStyle = G(0.08);
    X.fillRect(W - 92, top + 4, 66, 14);
    X.fillStyle = G(0.95);
    X.font = "bold 10px monospace";
    X.fillText("O2 · 42", W - 86, top + 15);
    // fascia della livrea BIODOM sotto i finestrini
    X.fillStyle = G(0.95);
    X.fillRect(6, wy + wh + 14, W - 14, 5);
    X.fillStyle = G(0.25);
    X.fillRect(6, wy + wh + 19, W - 14, 2);
    // porte a soffietto (anteriore e centrale) con vetri
    [[W - 110, 40], [168, 46]].forEach(([dx, dw]) => {
      X.fillStyle = G(0.3);
      X.fillRect(dx, wy - 4, dw, g0 - wy - 4);
      X.fillStyle = G(0.14);
      X.fillRect(dx + 4, wy, dw / 2 - 6, 90);
      X.fillRect(dx + dw / 2 + 2, wy, dw / 2 - 6, 90);
      X.fillStyle = G(0.8);
      X.fillRect(dx + dw / 2 - 1, wy - 4, 2, g0 - wy - 4);
    });
    // fari e luci
    X.fillStyle = G(1);
    X.fillRect(W - 12, g0 - 34, 6, 10);
    X.fillStyle = G(0.6);
    X.fillRect(6, g0 - 40, 5, 14);
    // paraurti
    X.fillStyle = G(0.18);
    X.fillRect(4, g0 - 8, W - 10, 8);
    // passaruota e ruote
    [70, W - 120].forEach((cx) => {
      X.fillStyle = G(0.1);
      X.beginPath();
      X.arc(cx, g0, 30, Math.PI, 0);
      X.fill();
      X.fillStyle = G(0.06);
      X.beginPath();
      X.arc(cx, g0 + 4, 24, 0, 7);
      X.fill();
      X.fillStyle = lgx(cx - 12, cx + 12, 0.8, 0.45);
      X.beginPath();
      X.arc(cx, g0 + 4, 11, 0, 7);
      X.fill();
      X.fillStyle = G(0.2);
      X.beginPath();
      X.arc(cx, g0 + 4, 3, 0, 7);
      X.fill();
    });
  }, { seedValue: 41 }));
  return key;
}
