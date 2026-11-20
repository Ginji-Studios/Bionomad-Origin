// Città in stile illustrazione vettoriale piatta (riferimento del team): blu-grigi morbidi,
// sagome a strati dritte, parallasse orizzontale, lampioni e cavi, strada e marciapiede,
// grana leggera su tutto. Nessun retino.
//
// Coordinate logiche: vista alta 540 (k = altezza schermo / 540), mondo largo W_L.
// Livelli: 0 cielo (fermo), 1 nuvole + montagne (0.12), 2 sagome lontane (0.3),
//          3 palazzi medi (0.55), 4 primo piano + strada (1).

export const W_L = 2880;
const VH = 540;
export const BASE = 440; // piede dei palazzi
export const ROAD = 488; // bordo del marciapiede davanti

// ------------------------------------------------------------------ colori
export const V = {
  skyTop: "#C3CCD9",
  skyBot: "#E3E7ED",
  cloud: "#EEF0F4",
  far: ["#2B3D56", "#33476A", "#3A5070", "#2F4360"],
  mid: ["#4C6787", "#587497", "#6581A3", "#45607F"],
  near: ["#8394AD", "#92A2B9", "#A1AEC3", "#B1BCCD", "#7586A1"],
  lamp: "#C6CDD8",
  wire: "#B5BFCC",
  base: "#6E7C93",
  road: "#59667C",
  roadLine: "#D8DEE6",
  curb: "#E6E9EE",
  walk: "#A6B1C2",
  walkLine: "#919DB0",
  snow: "#EEF1F5",
  win: "#F2E1A6",
  yellow: "#E2B33C"
};

let NIGHT = false;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
// di notte i colori scendono verso un blu notte, i chiari un po' di più
export function tint(h, extra = 0) {
  if (!NIGHT && !extra) return h;
  const c = hex(h);
  const k = NIGHT ? 0.5 + extra : extra;
  const n = [22, 32, 52];
  return toHex(c.map((v, i) => v + (n[i] - v) * Math.min(1, k)));
}
export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let X;

// ------------------------------------------------------------------ primitive
const fill = (c) => (X.fillStyle = tint(c));
const R = (x, y, w, h, c) => {
  fill(c);
  X.fillRect(x, y, w, h);
};
const poly = (pts, c) => {
  fill(c);
  X.beginPath();
  pts.forEach(([a, b], i) => (i ? X.lineTo(a, b) : X.moveTo(a, b)));
  X.closePath();
  X.fill();
};
const ell = (x, y, rx, ry, c, a0 = 0, a1 = Math.PI * 2) => {
  fill(c);
  X.beginPath();
  X.ellipse(x, y, rx, ry, 0, a0, a1);
  X.fill();
};
const shadeOf = (c, k) => mix(c, "#1A2638", k);
const lightOf = (c, k) => mix(c, "#F2F4F7", k);

// palazzo a due facce (luce e ombra) come nel riferimento, con finestre facoltative
function tower(x, w, h, c, o = {}) {
  const top = BASE - h;
  R(x, top, w, h + 2, c);
  // faccia in ombra
  if (o.side !== false) R(x + w * (o.split ?? 0.68), top, w * (1 - (o.split ?? 0.68)), h + 2, shadeOf(c, 0.18));
  // finestre: feritoie orizzontali chiare o griglia di quadratini
  if (o.slits) {
    for (let y = top + 10; y < BASE - 10; y += o.slits) R(x + 4, y, w * 0.6, 2, lightOf(c, 0.18));
  }
  if (o.grid) {
    const [gx, gy] = o.grid;
    for (let y = top + 8; y < BASE - 14; y += gy)
      for (let a = x + 5; a < x + w - 6; a += gx) {
        const lit = NIGHT && rnd() < 0.18;
        R(a, y, Math.max(2, gx - 5), Math.max(2, gy - 6), lit ? V.win : shadeOf(c, 0.22));
      }
  }
  if (o.vstripes) for (let a = x + 6; a < x + w - 4; a += o.vstripes) R(a, top + 6, 2, h - 6, shadeOf(c, 0.12));
  if (o.cap) R(x - 2, top - 3, w + 4, 4, lightOf(c, 0.15));
  return top;
}
function spire(x, base, h, wd, c) {
  poly([[x - wd, base], [x, base - h], [x + wd, base]], c);
}
function antenna(x, top, h, c) {
  R(x - 1, top - h, 2, h, c);
}
function domeAt(cx, y, r, c, o = {}) {
  ell(cx, y, r, r * (o.flat ?? 1), c, Math.PI, 0);
  if (o.lantern) {
    R(cx - 3, y - r * (o.flat ?? 1) - 10, 6, 10, c);
    ell(cx, y - r * (o.flat ?? 1) - 10, 4, 4, c, Math.PI, 0);
  }
}
function roof(x, w, y, h, c) {
  poly([[x - 3, y], [x + w / 2, y - h], [x + w + 3, y]], c);
}
function chimneys(x, w, y, c, n = 2) {
  for (let i = 0; i < n; i++) {
    const cx = x + 8 + rnd() * (w - 20);
    R(cx, y - 10 - rnd() * 6, 6, 16, c);
  }
}
function snowOn(x, w, y) {
  if (CITY !== "reykjavik") return;
  R(x - 2, y - 3, w + 4, 4, V.snow);
}
function snowRoof(x, w, y, h) {
  if (CITY !== "reykjavik") return;
  poly([[x - 3, y], [x + w / 2, y - h], [x + w + 3, y], [x + w - 4, y + 3], [x + w / 2, y - h + 5], [x + 4, y + 3]], V.snow);
}
function treeBlob(x, y, r, c) {
  ell(x, y, r, r * 1.1, c);
  ell(x - r * 0.6, y + r * 0.3, r * 0.7, r * 0.7, c);
  ell(x + r * 0.6, y + r * 0.35, r * 0.7, r * 0.7, c);
}

// ------------------------------------------------------------------ livelli comuni
function sky(w) {
  const g = X.createLinearGradient(0, 0, 0, VH);
  if (NIGHT) {
    g.addColorStop(0, "#1C2A40");
    g.addColorStop(0.7, "#33476A");
    g.addColorStop(1, "#43597C");
  } else {
    g.addColorStop(0, V.skyTop);
    g.addColorStop(0.75, V.skyBot);
    g.addColorStop(1, V.skyBot);
  }
  X.fillStyle = g;
  X.fillRect(0, 0, w, VH);
  if (NIGHT) {
    X.fillStyle = "#E9ECF2";
    X.beginPath();
    X.arc(w * 0.78, 70, 16, 0, 7);
    X.fill();
    X.fillStyle = "rgba(233,236,242,0.08)";
    X.beginPath();
    X.arc(w * 0.78, 70, 34, 0, 7);
    X.fill();
  }
}
function cloud(x, y, s) {
  X.fillStyle = NIGHT ? "rgba(120,140,170,0.25)" : "rgba(238,240,244,0.85)";
  X.beginPath();
  X.ellipse(x, y, 34 * s, 12 * s, 0, 0, 7);
  X.ellipse(x - 18 * s, y + 3 * s, 20 * s, 9 * s, 0, 0, 7);
  X.ellipse(x + 20 * s, y + 3 * s, 22 * s, 9 * s, 0, 0, 7);
  X.ellipse(x - 2 * s, y - 8 * s, 18 * s, 12 * s, 0, 0, 7);
  X.fill();
}
function clouds(w) {
  for (let x = 120; x < w; x += 330 + rnd() * 260) cloud(x, 70 + rnd() * 70, 0.8 + rnd() * 0.6);
}
function mountains(w, snow) {
  const c = NIGHT ? "#2D3E5A" : "#8E9CB2";
  fill(c);
  X.beginPath();
  X.moveTo(0, BASE);
  let x = 0;
  const peaks = [];
  while (x < w) {
    const px = x + 120 + rnd() * 180;
    const py = BASE - 130 - rnd() * 90;
    peaks.push([px, py]);
    X.lineTo(px, py);
    x = px + 120 + rnd() * 160;
    X.lineTo(x, BASE - 60 - rnd() * 50);
  }
  X.lineTo(w, BASE);
  X.closePath();
  X.fill();
  if (snow)
    peaks.forEach(([px, py]) => {
      fill(V.snow);
      X.beginPath();
      X.moveTo(px - 30, py + 34);
      X.lineTo(px, py);
      X.lineTo(px + 34, py + 36);
      X.lineTo(px + 18, py + 28);
      X.lineTo(px + 6, py + 38);
      X.lineTo(px - 8, py + 26);
      X.closePath();
      X.fill();
    });
}
// fila di palazzi generici fra x0 e x1 (riempitivo coerente con lo stile)
function fillerRow(x0, x1, hMin, hMax, cols, o = {}) {
  let x = x0;
  while (x < x1) {
    const w = (o.wMin ?? 50) + rnd() * ((o.wMax ?? 110) - (o.wMin ?? 50));
    const h = hMin + rnd() * (hMax - hMin);
    const c = cols[(rnd() * cols.length) | 0];
    const top = tower(x, w, h, c, {
      slits: o.slits && rnd() < 0.6 ? 9 + ((rnd() * 4) | 0) : 0,
      grid: o.grid && rnd() < 0.5 ? [10, 14] : null,
      vstripes: o.vstripes && rnd() < 0.3 ? 8 : 0
    });
    if (o.roofs && rnd() < 0.5) {
      const rr = rnd();
      if (rr < 0.3) chimneys(x, w, top, c);
      else if (rr < 0.5) antenna(x + w * 0.4, top, 20 + rnd() * 30, c);
      else if (rr < 0.65) R(x + w * 0.2, top - 12, w * 0.5, 12, c);
    }
    snowOn(x, w, top);
    x += w + (o.gap ?? -4);
  }
}

// ------------------------------------------------------------------ primo piano: strada
function street(w) {
  // marciapiede lontano (piede dei palazzi)
  R(0, BASE, w, 10, V.base);
  // strada
  R(0, BASE + 10, w, ROAD - BASE - 10, V.road);
  for (let x = 20; x < w; x += 120) R(x, BASE + 28, 64, 3, V.roadLine);
  // bordo chiaro del marciapiede davanti
  R(0, ROAD - 3, w, 4, V.curb);
  // marciapiede davanti con le linee delle lastre in prospettiva
  R(0, ROAD + 1, w, VH - ROAD, V.walk);
  X.strokeStyle = tint(V.walkLine);
  X.lineWidth = 1;
  const vx = w / 2;
  for (let x = -w; x < w * 2; x += 90) {
    X.beginPath();
    X.moveTo(vx + (x - vx) * 0.35, ROAD + 1);
    X.lineTo(x, VH);
    X.stroke();
  }
  R(0, ROAD + 22, w, 1, V.walkLine);
}
function lampPost(x) {
  const top = BASE - 112;
  R(x - 2, top, 4, 112, V.lamp);
  X.strokeStyle = tint(V.lamp);
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(x, top + 4);
  X.quadraticCurveTo(x, top - 10, x + 14, top - 8);
  X.stroke();
  ell(x + 16, top - 4, 6, 4, V.lamp);
  R(x - 4, BASE - 6, 8, 6, V.lamp);
  if (NIGHT) {
    const g = X.createRadialGradient(x + 16, top, 2, x + 16, top + 20, 60);
    g.addColorStop(0, "rgba(242,225,166,0.55)");
    g.addColorStop(1, "rgba(242,225,166,0)");
    X.fillStyle = g;
    X.beginPath();
    X.moveTo(x + 10, top);
    X.lineTo(x - 30, BASE + 20);
    X.lineTo(x + 62, BASE + 20);
    X.lineTo(x + 22, top);
    X.fill();
  }
}
function wires(w, xs) {
  X.strokeStyle = tint(V.wire);
  X.lineWidth = 1;
  [BASE - 104, BASE - 96].forEach((y, i) => {
    X.beginPath();
    for (let j = 0; j < xs.length - 1; j++) {
      const a = xs[j];
      const b = xs[j + 1];
      X.moveTo(a, y);
      X.quadraticCurveTo((a + b) / 2, y + 10 + i * 2, b, y);
    }
    X.stroke();
  });
}
function frontLayer(w, buildings) {
  buildings(w);
  street(w);
  const xs = [];
  for (let x = 140; x < w; x += 360) xs.push(x);
  wires(w, xs);
  xs.forEach(lampPost);
  // i passanti lontani ora sono animati (vedi livePeople in hud.js), non più disegnati fermi
}

// ------------------------------------------------------------------ MILANO
const M = {
  far(w) {
    // sagome di Porta Nuova, Pirellone, Velasca, Duomo lontano
    fillerRow(0, w, 120, 230, V.far, { wMin: 40, wMax: 90, roofs: true });
    const c = V.far[0];
    // Torre Velasca
    tower(150, 46, 230, c, { side: false });
    R(140, BASE - 290, 66, 64, c);
    R(160, BASE - 300, 6, 10, c);
    // Pirellone
    poly([[320, BASE], [324, BASE - 290], [384, BASE - 290], [388, BASE]], V.far[1]);
    R(318, BASE - 294, 72, 6, V.far[1]);
    // Torre UniCredit con la guglia
    poly([[590, BASE], [596, BASE - 250], [640, BASE - 270], [646, BASE]], c);
    spire(632, BASE - 268, 120, 2, c);
    // Allianz (il "Dritto")
    tower(820, 40, 330, V.far[2], { side: false });
    R(816, BASE - 336, 48, 8, V.far[2]);
    // Bosco Verticale: due torri con il verde
    [1400, 1460].forEach((x, i) => {
      tower(x, 38, 250 - i * 40, V.far[3], { side: false });
      for (let y = BASE - 240 + i * 40; y < BASE - 10; y += 16) {
        treeBlob(x + 4, y, 6, V.far[1]);
        treeBlob(x + 34, y + 8, 6, V.far[1]);
      }
    });
    // Palazzo Lombardia
    poly([[1160, BASE], [1170, BASE - 240], [1210, BASE - 250], [1220, BASE]], V.far[1]);
  },
  mid(w) {
    fillerRow(0, w, 90, 190, V.mid, { slits: true, grid: true, roofs: true, wMin: 60, wMax: 130 });
  },
  zones: [
    // DUOMO
    (w) => {
      fillerRow(0, w, 60, 120, V.near, { grid: true, roofs: true, wMin: 70, wMax: 140, gap: 0 });
      // Duomo: facciata a capanna con le guglie, guglia maggiore con la Madonnina
      const cx = 520;
      const c = V.near[3];
      R(cx - 150, BASE - 150, 300, 150, c);
      poly([[cx - 150, BASE - 150], [cx, BASE - 230], [cx + 150, BASE - 150]], c);
      for (let i = -3; i <= 3; i++) spire(cx + i * 46, BASE - 150 - (3 - Math.abs(i)) * 24, 70, 5, c);
      spire(cx, BASE - 230, 150, 6, c);
      R(cx - 2, BASE - 392, 4, 14, V.yellow);
      [-100, -50, 0, 50, 100].forEach((d) => R(cx + d - 14, BASE - 110, 28, 110, shadeOf(c, 0.2)));
      // Galleria Vittorio Emanuele II: arco e cupola di vetro
      const gx = 1250;
      R(gx - 130, BASE - 140, 260, 140, V.near[1]);
      ell(gx, BASE - 40, 46, 80, shadeOf(V.near[1], 0.3), Math.PI, 0);
      R(gx - 46, BASE - 40, 92, 40, shadeOf(V.near[1], 0.3));
      domeAt(gx, BASE - 140, 52, lightOf(V.near[1], 0.2), { flat: 0.7, lantern: true });
      // Castello Sforzesco: torre del Filarete
      const tx = 2260;
      R(tx - 180, BASE - 90, 360, 90, V.near[0]);
      for (let a = tx - 180; a < tx + 180; a += 16) R(a, BASE - 98, 9, 8, V.near[0]);
      R(tx - 34, BASE - 230, 68, 140, V.near[2]);
      R(tx - 24, BASE - 300, 48, 70, V.near[2]);
      domeAt(tx, BASE - 300, 24, V.near[2], { lantern: true });
      ell(tx, BASE - 190, 14, 14, shadeOf(V.near[2], 0.25));
    },
    // PORTA NUOVA
    (w) => {
      fillerRow(0, w, 70, 150, V.near, { slits: true, wMin: 80, wMax: 160, gap: 0 });
      // podio di Gae Aulenti con la torre UniCredit che sale fuori quadro
      poly([[560, BASE], [570, BASE - 300], [640, BASE - 330], [680, BASE - 330], [690, BASE]], V.near[2]);
      R(660, BASE - 330, 4, -120, V.near[2]);
      ell(880, BASE - 4, 120, 18, lightOf(V.near[3], 0.3), Math.PI, 0);
      // Bosco Verticale da vicino
      [1240, 1320].forEach((x, i) => {
        tower(x, 64, 260 - i * 50, V.near[4], { side: true });
        for (let y = BASE - 250 + i * 50; y < BASE - 8; y += 18) {
          treeBlob(x + 6, y, 8, "#6E8A86");
          treeBlob(x + 58, y + 9, 8, "#6E8A86");
        }
      });
      tower(2050, 70, 230, V.near[1], { slits: 10 });
    },
    // NAVIGLI
    (w) => {
      let x = 0;
      while (x < w) {
        const bw = 70 + rnd() * 50;
        const h = 70 + rnd() * 40;
        const c = V.near[(rnd() * 4) | 0];
        tower(x, bw, h, c, { side: false });
        for (let y = BASE - h + 14; y < BASE - 20; y += 24) for (let a = x + 10; a < x + bw - 14; a += 22) {
          R(a, y, 10, 14, shadeOf(c, 0.3));
          R(a - 3, y + 14, 16, 2, lightOf(c, 0.3)); // ringhiera del balcone
        }
        roof(x, bw, BASE - h, 18, shadeOf(c, 0.15));
        x += bw;
      }
      // Colonne di San Lorenzo e la basilica
      const cx = 1600;
      for (let i = 0; i < 9; i++) R(cx - 160 + i * 40, BASE - 120, 12, 120, V.near[3]);
      R(cx - 170, BASE - 128, 350, 10, V.near[3]);
      R(1840, BASE - 150, 160, 150, V.near[1]);
      domeAt(1920, BASE - 150, 58, V.near[1], { lantern: true, flat: 0.8 });
    },
    // CITYLIFE
    (w) => {
      fillerRow(0, w, 50, 100, V.near, { grid: true, wMin: 80, wMax: 150, gap: 0 });
      // Allianz, Generali (curva), PwC
      tower(540, 60, 360, V.near[2], { slits: 12 });
      fill(V.near[0]);
      X.beginPath();
      X.moveTo(860, BASE);
      X.lineTo(870, BASE - 200);
      X.quadraticCurveTo(880, BASE - 330, 930, BASE - 380);
      X.lineTo(960, BASE - 380);
      X.quadraticCurveTo(930, BASE - 300, 950, BASE);
      X.closePath();
      X.fill();
      poly([[1200, BASE], [1205, BASE - 260], [1235, BASE - 290], [1265, BASE - 260], [1270, BASE]], V.near[3]);
      for (let i = 0; i < 8; i++) treeBlob(1650 + i * 34, BASE - 20, 16, "#7A928F");
    }
  ],
  labels: [
    [["Duomo di Milano", 470, 30], ["Galleria V. Emanuele II", 1170, 236], ["Castello Sforzesco", 2180, 128]],
    [["Torre UniCredit", 590, 100], ["Piazza Gae Aulenti", 800, 400], ["Bosco Verticale", 1240, 170], ["Torre Solaria", 2030, 200]],
    [["Naviglio Grande", 300, 330], ["Colonne di San Lorenzo", 1450, 300], ["Basilica di San Lorenzo", 1860, 220]],
    [["Torre Allianz", 520, 70], ["Torre Generali", 860, 50], ["Torre PwC", 1180, 140], ["Parco CityLife", 1650, 400]]
  ]
};

// ------------------------------------------------------------------ NEW DELHI
function minaret(x, h, c) {
  R(x - 5, BASE - h, 10, h, c);
  R(x - 8, BASE - h * 0.66, 16, 4, c);
  R(x - 8, BASE - h * 0.4, 16, 4, c);
  domeAt(x, BASE - h, 7, c);
}
function chhatri(x, y, c) {
  R(x - 10, y - 12, 2, 12, c);
  R(x + 8, y - 12, 2, 12, c);
  R(x - 13, y - 15, 26, 3, c);
  domeAt(x, y - 15, 10, c);
}
const D = {
  far(w) {
    fillerRow(0, w, 60, 150, V.far, { wMin: 60, wMax: 120 });
    // Qutub Minar
    poly([[500, BASE], [506, BASE - 290], [520, BASE - 290], [526, BASE]], V.far[1]);
    for (let y = BASE - 60; y > BASE - 290; y -= 60) R(498, y, 30, 4, V.far[1]);
    // Tomba di Humayun
    R(940, BASE - 70, 120, 70, V.far[0]);
    domeAt(1000, BASE - 70, 42, V.far[0], { lantern: true });
    // Tempio del Loto
    for (let i = -3; i <= 3; i++) {
      fill(V.far[2]);
      X.beginPath();
      X.ellipse(1500 + i * 22, BASE - 30, 22, 70 - Math.abs(i) * 10, i * 0.25, Math.PI, 0);
      X.fill();
    }
    // Akshardham
    R(1760, BASE - 80, 120, 80, V.far[3]);
    domeAt(1820, BASE - 80, 34, V.far[3], { lantern: true });
    [1770, 1870].forEach((x) => domeAt(x, BASE - 80, 14, V.far[3]));
  },
  mid(w) {
    fillerRow(0, w, 50, 130, V.mid, { slits: true, wMin: 70, wMax: 140 });
    for (let x = 80; x < w; x += 140 + rnd() * 120) treeBlob(x, BASE - 30, 24, "#4F6A7C");
  },
  zones: [
    // RAJPATH: India Gate e Rashtrapati Bhavan
    (w) => {
      for (let x = 0; x < w; x += 46 + rnd() * 40) treeBlob(x, BASE - 30, 26 + rnd() * 10, "#7B9194");
      const cx = 520;
      const c = V.near[3];
      R(cx - 70, BASE - 180, 140, 180, c);
      ell(cx, BASE - 40, 28, 90, shadeOf(c, 0.3), Math.PI, 0);
      R(cx - 28, BASE - 40, 56, 40, shadeOf(c, 0.3));
      R(cx - 80, BASE - 190, 160, 12, lightOf(c, 0.2));
      R(cx - 40, BASE - 210, 80, 20, c);
      domeAt(cx, BASE - 210, 14, c);
      const bx = 1750;
      R(bx - 260, BASE - 110, 520, 110, V.near[1]);
      for (let a = bx - 240; a < bx + 240; a += 24) R(a, BASE - 100, 8, 100, shadeOf(V.near[1], 0.15));
      R(bx - 80, BASE - 170, 160, 60, V.near[1]);
      domeAt(bx, BASE - 170, 62, V.near[2], { flat: 0.8 });
      R(bx - 3, BASE - 240, 6, 16, V.near[2]);
    },
    // OLD DELHI: Forte Rosso e Jama Masjid
    (w) => {
      fillerRow(0, w, 50, 100, V.near, { grid: true, wMin: 50, wMax: 90, gap: 0 });
      const fx = 620;
      R(fx - 260, BASE - 120, 520, 120, V.near[0]);
      for (let a = fx - 260; a < fx + 260; a += 20) ell(a + 10, BASE - 120, 9, 9, V.near[0], Math.PI, 0);
      [fx - 160, fx, fx + 160].forEach((x) => chhatri(x, BASE - 120, V.near[2]));
      R(fx - 40, BASE - 100, 80, 100, shadeOf(V.near[0], 0.2));
      ell(fx, BASE - 30, 26, 60, shadeOf(V.near[0], 0.4), Math.PI, 0);
      const mx = 2050;
      R(mx - 150, BASE - 100, 300, 100, V.near[3]);
      [mx - 70, mx, mx + 70].forEach((x, i) => domeAt(x, BASE - 100, i === 1 ? 50 : 36, V.near[3], { lantern: true }));
      [mx - 170, mx + 170].forEach((x) => minaret(x, 230, V.near[2]));
    },
    // CONNAUGHT PLACE: colonnati bianchi
    (w) => {
      let x = 0;
      while (x < w) {
        const bw = 200 + rnd() * 80;
        R(x, BASE - 110, bw, 110, V.near[3]);
        R(x, BASE - 116, bw, 8, lightOf(V.near[3], 0.3));
        for (let a = x + 8; a < x + bw - 10; a += 20) R(a, BASE - 70, 8, 70, shadeOf(V.near[3], 0.18));
        for (let a = x + 10; a < x + bw - 20; a += 30) R(a, BASE - 100, 16, 18, shadeOf(V.near[3], 0.3));
        x += bw + 30;
      }
      for (let i = 0; i < 10; i++) treeBlob(1150 + i * 22, BASE - 30, 24, "#7B9194");
    },
    // MEHRAULI: Qutub Minar e Alai Darwaza
    (w) => {
      for (let x = 0; x < w; x += 60 + rnd() * 60) treeBlob(x, BASE - 26, 22 + rnd() * 10, "#7B9194");
      const qx = 900;
      poly([[qx - 26, BASE], [qx - 16, BASE - 380], [qx + 16, BASE - 380], [qx + 26, BASE]], V.near[1]);
      for (let y = BASE - 80; y > BASE - 380; y -= 75) R(qx - 28 + (BASE - y) * 0.03, y, 56 - (BASE - y) * 0.06, 6, lightOf(V.near[1], 0.25));
      for (let a = -20; a < 20; a += 6) R(qx + a, BASE - 370, 2, 360, shadeOf(V.near[1], 0.12));
      const ax = 1350;
      R(ax - 70, BASE - 140, 140, 140, V.near[3]);
      ell(ax, BASE - 40, 30, 70, shadeOf(V.near[3], 0.35), Math.PI, 0);
      R(ax - 30, BASE - 40, 60, 40, shadeOf(V.near[3], 0.35));
      domeAt(ax, BASE - 140, 50, V.near[3], { flat: 0.6 });
    }
  ],
  labels: [
    [["India Gate", 470, 210], ["Rashtrapati Bhavan", 1680, 180]],
    [["Forte Rosso", 560, 290], ["Chandni Chowk", 1250, 360], ["Jama Masjid", 1990, 180]],
    [["Connaught Place", 400, 300], ["Central Park", 1180, 370]],
    [["Qutub Minar", 850, 40], ["Alai Darwaza", 1290, 230]]
  ]
};

// ------------------------------------------------------------------ REYKJAVÍK
function house(x, w, h, c) {
  R(x, BASE - h, w, h, c);
  roof(x, w, BASE - h, h * 0.45, shadeOf(c, 0.25));
  snowRoof(x, w, BASE - h, h * 0.45);
  for (let a = x + 8; a < x + w - 12; a += 18) R(a, BASE - h + 12, 9, 12, NIGHT && rnd() < 0.4 ? V.win : shadeOf(c, 0.3));
}
function hallgrims(cx, c) {
  // torre a gradoni di basalto
  const steps = [[110, 90], [86, 150], [62, 210], [40, 270]];
  steps.forEach(([hw, h], i) => {
    R(cx - hw, BASE - h, hw * 2, h, i % 2 ? c : lightOf(c, 0.06));
    for (let a = cx - hw + 6; a < cx + hw - 4; a += 10) R(a, BASE - h + 6, 3, h - 10, shadeOf(c, 0.15));
  });
  R(cx - 30, BASE - 330, 60, 60, c);
  spire(cx, BASE - 330, 110, 26, c);
  snowOn(cx - 30, 60, BASE - 330);
}
const RK = {
  far(w) {
    fillerRow(0, w, 40, 110, V.far, { wMin: 60, wMax: 120 });
    // Perlan sulla collina
    ell(700, BASE, 220, 90, V.far[1], Math.PI, 0);
    for (let i = 0; i < 6; i++) R(640 + i * 20, BASE - 140, 16, 60, V.far[0]);
    domeAt(700, BASE - 140, 66, V.far[2], { flat: 0.7 });
    // Harpa
    poly([[1220, BASE], [1240, BASE - 90], [1330, BASE - 120], [1400, BASE - 60], [1400, BASE]], V.far[2]);
  },
  mid(w) {
    let x = 0;
    while (x < w) {
      const bw = 50 + rnd() * 50;
      house(x, bw, 50 + rnd() * 50, V.mid[(rnd() * 4) | 0]);
      x += bw + 6;
    }
  },
  zones: [
    // MIÐBORG
    (w) => {
      let x = 0;
      while (x < w) {
        const bw = 70 + rnd() * 50;
        if (Math.abs(x - 520) > 160) house(x, bw, 70 + rnd() * 40, V.near[(rnd() * 5) | 0]);
        x += bw + 10;
      }
      hallgrims(520, V.near[3]);
    },
    // HÖFNIN: Harpa, Sólfar e gli alberi delle barche
    (w) => {
      fillerRow(0, w, 50, 90, V.near, { grid: true, wMin: 70, wMax: 130, gap: 0 });
      const hx = 620;
      poly([[hx - 200, BASE], [hx - 170, BASE - 160], [hx + 40, BASE - 210], [hx + 200, BASE - 120], [hx + 210, BASE]], V.near[2]);
      X.strokeStyle = tint(lightOf(V.near[2], 0.35));
      X.lineWidth = 1;
      for (let a = hx - 190; a < hx + 200; a += 14) {
        X.beginPath();
        X.moveTo(a, BASE);
        X.lineTo(a + 20, BASE - 200);
        X.stroke();
      }
      // Sólfar: la nave vichinga d'acciaio
      const sx = 1400;
      X.strokeStyle = tint(V.near[0]);
      X.lineWidth = 6;
      X.beginPath();
      X.moveTo(sx - 90, BASE - 30);
      X.quadraticCurveTo(sx, BASE - 10, sx + 90, BASE - 40);
      X.stroke();
      for (let i = -3; i <= 3; i++) {
        X.beginPath();
        X.moveTo(sx + i * 22, BASE - 22);
        X.lineTo(sx + i * 22 + 10, BASE - 70);
        X.stroke();
      }
      [1850, 1920, 2000].forEach((x) => R(x, BASE - 160, 3, 160, V.near[4]));
    },
    // LAUGAVEGUR
    (w) => {
      let x = 0;
      while (x < w) {
        const bw = 60 + rnd() * 50;
        house(x, bw, 60 + rnd() * 50, V.near[(rnd() * 5) | 0]);
        x += bw + 4;
      }
    },
    // ÖSKJUHLÍÐ: collina con il bosco e Perlan in cima
    (w) => {
      fill(V.near[4]);
      X.beginPath();
      X.moveTo(280, BASE);
      for (let x = 280; x <= 1520; x += 20) X.lineTo(x, BASE - 120 * Math.max(0, 1 - Math.pow((x - 900) / 620, 2)));
      X.lineTo(1520, BASE);
      X.closePath();
      X.fill();
      const top = BASE - 120;
      for (let i = 0; i < 6; i++) R(840 + i * 20, top - 70, 16, 72, V.near[2]);
      domeAt(900, top - 70, 70, lightOf(V.near[2], 0.25), { flat: 0.7 });
      for (let x = 320; x < 1480; x += 26) {
        const y = BASE - 120 * Math.max(0, 1 - Math.pow((x - 900) / 620, 2));
        if (Math.abs(x - 900) < 70) continue;
        poly([[x - 12, y + 6], [x, y - 40], [x + 12, y + 6]], "#5E7480");
        snowRoof(x - 8, 16, y - 18, 22);
      }
      let x = 1600;
      while (x < w) {
        const bw = 70 + rnd() * 40;
        house(x, bw, 60 + rnd() * 40, V.near[(rnd() * 5) | 0]);
        x += bw + 10;
      }
    }
  ],
  labels: [
    [["Hallgrímskirkja", 470, 70]],
    [["Harpa", 560, 210], ["Sólfar", 1360, 380], ["Gamla Höfnin", 1830, 260]],
    [["Laugavegur", 500, 350], ["Skólavörðustígur", 1500, 350]],
    [["Perlan", 860, 160], ["Öskjuhlíð", 1250, 380]]
  ]
};

const CITY_DEF = { milano: M, delhi: D, reykjavik: RK };
const ZONE_NAMES = {
  milano: ["DUOMO", "PORTA NUOVA", "NAVIGLI", "CITYLIFE"],
  delhi: ["RAJPATH", "OLD DELHI", "CONNAUGHT PLACE", "MEHRAULI"],
  reykjavik: ["MIÐBORG", "HÖFNIN", "LAUGAVEGUR", "ÖSKJUHLÍÐ"]
};
export const ZONES = Object.fromEntries(
  Object.entries(CITY_DEF).map(([id, d]) => [id, ZONE_NAMES[id].map((name, i) => ({ name, labels: d.labels[i] }))])
);

// grana leggera, come la carta del riferimento (solo sui pixel pieni)
export function grain(c, amount = 7, seedValue = 3) {
  const x = c.getContext("2d", { willReadFrequently: true });
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let s = seedValue;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    s = (s * 16807) % 2147483647;
    const n = ((s / 2147483647) - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  return c;
}

let CITY = "milano";
export function buildCity(cityId, { viewW = 1280, viewH = 800, time = "day", zone = 0 } = {}) {
  CITY = CITY_DEF[cityId] ? cityId : "milano";
  const def = CITY_DEF[CITY];
  NIGHT = time !== "day";
  const k = viewH / VH;
  const VW = viewW / k;
  const zi = ((zone % 4) + 4) % 4;
  const draws = [
    [0, sky],
    [0.12, (w) => {
      if (CITY === "reykjavik") mountains(w, true);
      clouds(w);
    }],
    [0.3, def.far],
    [0.55, def.mid],
    [1, (w) => frontLayer(w, def.zones[zi])]
  ];
  const layers = draws.map(([f, draw], li) => {
    seed = 11 + li * 101 + zi * 7;
    const wl = f ? VW + (W_L - VW) * f : VW;
    const c = document.createElement("canvas");
    c.width = Math.round(wl * k);
    c.height = viewH;
    X = c.getContext("2d", { willReadFrequently: true });
    X.save();
    X.scale(k, k);
    draw(wl);
    X.restore();
    grain(c, li === 0 ? 5 : 8, 7 + li);
    return { f, canvas: c };
  });
  NIGHT = false;
  return { layers, k, groundY: Math.round(BASE * k), worldW: Math.round(W_L * k) };
}
