// Skyline notturne di Milano, New Delhi e Reykjavík nello stile del concept del team:
// tutto viene disegnato in scala di grigi, poi quant() lo converte nella palette BIODOM
// a 5 colori con retino ordinato (celle 2x2). Versione per il gioco: più chiara,
// senza foschia, senza scanline e senza etichette, così i personaggi restano leggibili.

export const PALETTE = ["#1C2839", "#2D3D52", "#304E6A", "#5E6D88", "#F1F0ED"];

// coordinate logiche del concept: vista alta 540, strada a GY, mondo largo W
export const VH_L = 540;
export const GY = 480;
let NEAR = null;
export const W_L = 2880;
// schiarita generale richiesta (in scala 0-1, prima del retino)
const LIFT = 0.07;
// giorno o notte: cambia cielo, finestre e lampioni, e schiarisce un po' tutto
let DAY = false;
let DAY_LIFT = 0;

let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const G = (v, a = 1) => {
  const n = Math.max(0, Math.min(255, v * 255)) | 0;
  return `rgba(${n},${n},${n},${a})`;
};
let X;
let VW = 864; // larghezza logica della vista, impostata da buildSkyline

// scala di grigi -> rampa di colori piatti del nuovo stile (illustrazione vettoriale, niente retino).
// I pixel già colorati (accenti disegnati con colori veri) restano com'erano; su tutto una grana leggera.
const RAMP = [[0, "#1E2B3E"], [0.22, "#2E415A"], [0.42, "#4C6585"], [0.62, "#7A8EA9"], [0.8, "#ADB9CA"], [1, "#EEF0F4"]].map(([t, h]) => [t, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]);
function ramp(v) {
  for (let i = 1; i < RAMP.length; i++)
    if (v <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const u = (v - t0) / (t1 - t0);
      return c0.map((c, j) => c + (c1[j] - c) * u);
    }
  return RAMP[RAMP.length - 1][1];
}
export function quant(c) {
  const w = c.width;
  const h = c.height;
  const x = c.getContext("2d", { willReadFrequently: true });
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    if (d[k + 3] < 4) continue;
    const r = d[k];
    const g = d[k + 1];
    const b = d[k + 2];
    const n = (rnd() - 0.5) * 3; // grana appena percettibile, niente retino
    if (Math.abs(r - g) < 6 && Math.abs(g - b) < 6) {
      const v = Math.max(0, Math.min(1, (r + g + b) / 765 + LIFT * 0.5 + DAY_LIFT));
      const col = ramp(v);
      d[k] = col[0] + n;
      d[k + 1] = col[1] + n;
      d[k + 2] = col[2] + n;
    } else {
      d[k] = r + n;
      d[k + 1] = g + n;
      d[k + 2] = b + n;
    }
  }
  x.putImageData(img, 0, 0);
}

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const path = (p) => {
  X.beginPath();
  p.forEach(([a, b], i) => (i ? X.lineTo(a, b) : X.moveTo(a, b)));
  X.closePath();
};
const fillP = (p, f) => {
  path(p);
  X.fillStyle = f;
  X.fill();
};
const lgx = (x0, x1, l, r) => {
  const g = X.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, G(l));
  g.addColorStop(1, G(r));
  return g;
};
const bb = (p) => {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
};
const sheen = (x, y, w, h) => {
  const g = X.createLinearGradient(0, y, 0, y + h * 0.5);
  g.addColorStop(0, G(1, 0.14));
  g.addColorStop(1, G(1, 0));
  X.fillStyle = g;
  X.fillRect(x, y, w, h);
};
// facciata finestrata: gradiente laterale, piani, finestre scure con qualcuna accesa
function facade(pts, l, r, o = {}) {
  const [x, top, w, h] = bb(pts);
  const gx = o.gx || 7;
  const gy = o.gy || 9;
  const m = (l + r) / 2;
  X.save();
  path(pts);
  X.clip();
  X.fillStyle = lgx(x, x + w, l, r);
  X.fillRect(x, top, w, h);
  for (let y = top + 7; y < top + h - 4; y += gy) {
    X.fillStyle = G(0, 0.18);
    X.fillRect(x, y + gy - 5, w, 1);
    for (let a = x + 3; a < x + w - 3; a += gx) {
      X.fillStyle = rnd() < (DAY ? 0 : o.lit ?? 0.06) ? G(0.97) : G(m * ((o.glass ?? 0.55) + rnd() * 0.3) * (DAY ? 0.85 : 1));
      X.fillRect(a, y, gx - 3, gy - 5);
    }
  }
  for (let a = x + 1; a < x + w; a += gx) {
    X.fillStyle = G(0, 0.12);
    X.fillRect(a, top, 1, h);
  }
  const rg = X.createLinearGradient(x, top, x + w, top + h);
  rg.addColorStop(0.3, G(1, 0));
  rg.addColorStop(0.45, G(1, 0.09));
  rg.addColorStop(0.6, G(1, 0));
  X.fillStyle = rg;
  X.fillRect(x, top, w, h);
  const ao = X.createLinearGradient(0, top + h * 0.65, 0, top + h);
  ao.addColorStop(0, G(0, 0));
  ao.addColorStop(1, G(0, 0.28));
  X.fillStyle = ao;
  X.fillRect(x, top + h * 0.65, w, h * 0.35);
  sheen(x, top, w, h);
  X.restore();
}
// pietra/mattoni: nervature verticali, filari, granulosità
function stone(pts, l, r, o = {}) {
  const [x, top, w, h] = bb(pts);
  X.save();
  path(pts);
  X.clip();
  X.fillStyle = lgx(x, x + w, l, r);
  X.fillRect(x, top, w, h);
  for (let a = x; a < x + w; a += o.rib || 6) {
    X.fillStyle = G(0, 0.15);
    X.fillRect(a, top, 1, h);
  }
  if (o.brick)
    for (let y = top; y < top + h; y += 5) {
      X.fillStyle = G(0, 0.14);
      X.fillRect(x, y, w, 1);
    }
  const ao = X.createLinearGradient(0, top + h * 0.7, 0, top + h);
  ao.addColorStop(0, G(0, 0));
  ao.addColorStop(1, G(0, 0.3));
  X.fillStyle = ao;
  X.fillRect(x, top + h * 0.7, w, h * 0.3);
  // (niente puntini a quadratino: superficie pulita, stile vettoriale)
  sheen(x, top, w, h);
  X.restore();
}
const spire = (x, by, h, wd, l) => {
  fillP([[x - wd, by], [x - wd * 0.55, by - h * 0.72], [x, by - h], [x + wd * 0.55, by - h * 0.72], [x + wd, by]], lgx(x - wd, x + wd, l + 0.18, l - 0.12));
  X.fillStyle = G(1, 0.9);
  X.fillRect(x - 1, by - h - 3, 2, 4);
};

// rumore liscio
const N = Array.from({ length: 4000 }, () => rnd());
const nz = (x) => {
  x = Math.abs(x);
  const i = x | 0;
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return N[i % 4000] * (1 - s) + N[(i + 1) % 4000] * s;
};

// ---------------- MILANO ----------------
function sky(w) {
  const g = X.createLinearGradient(0, 0, 0, GY);
  [[0, 0.03], [0.35, 0.14], [0.62, 0.3], [0.82, 0.5], [1, 0.7]].forEach(([o, v]) => g.addColorStop(o, G(v)));
  X.fillStyle = g;
  X.fillRect(0, 0, w, VH_L);
  for (let i = 0; i < 90; i++) {
    X.fillStyle = G(0.9, 0.3 + rnd() * 0.6);
    X.fillRect(rnd() * w, rnd() * 230, 2, 2);
  }
  // luna, con un alone piccolo (niente velature sul cielo)
  const mx = Math.min(760, w - 110);
  const h = X.createRadialGradient(mx, 120, 20, mx, 120, 110);
  h.addColorStop(0, G(1, 0.4));
  h.addColorStop(1, G(1, 0));
  X.fillStyle = h;
  X.fillRect(mx - 120, 0, 240, 240);
  X.save();
  X.beginPath();
  X.arc(mx, 120, 36, 0, 7);
  X.clip();
  X.fillStyle = G(0.97);
  X.fillRect(mx - 40, 80, 80, 80);
  for (let i = 0; i < 9; i++) {
    X.fillStyle = G(0.7, 0.5);
    X.beginPath();
    X.arc(mx - 12 + rnd() * 30 - 10, 112 + rnd() * 36 - 14, 3 + rnd() * 7, 0, 7);
    X.fill();
  }
  X.restore();
}
function far(w) {
  for (let x = -10; x < w; ) {
    const bw = (24 + rnd() * 36) | 0;
    const bh = (60 + rnd() * 110) | 0;
    facade(rect(x, GY - bh, bw, bh), 0.46, 0.36, { gx: 6, gy: 8, lit: 0.03, glass: 0.85 });
    x += bw + ((rnd() * 6) | 0);
  }
}
function mid(w) {
  const gl = { gx: 5, gy: 8, lit: 0.08, glass: 0.7 };
  for (let x = -20; x < w; ) {
    const bw = (34 + rnd() * 40) | 0;
    const bh = (70 + rnd() * 80) | 0;
    facade(rect(x, GY - bh, bw, bh), 0.3, 0.2, { gx: 7, gy: 9, lit: 0.05 });
    if (rnd() < 0.5) {
      X.fillStyle = G(0.12);
      X.fillRect(x + bw * 0.3, GY - bh - 10, 4, 10);
    }
    x += bw + ((rnd() * 8) | 0);
  }
  // Torre Velasca
  let c = 150;
  facade(rect(c - 26, GY - 95, 52, 95), 0.3, 0.2, { gx: 6 });
  facade([[c - 26, GY - 95], [c + 26, GY - 95], [c + 50, GY - 120], [c - 50, GY - 120]], 0.28, 0.18);
  facade(rect(c - 50, GY - 158, 100, 38), 0.32, 0.2, { gx: 7, gy: 8 });
  fillP([[c - 50, GY - 158], [c + 50, GY - 158], [c + 42, GY - 168], [c - 42, GY - 168]], G(0.2));
  X.strokeStyle = G(0.1);
  X.lineWidth = 2;
  [-1, 1].forEach((i) => {
    X.beginPath();
    X.moveTo(c + i * 26, GY - 95);
    X.lineTo(c + i * 50, GY - 120);
    X.stroke();
  });
  // Pirellone
  c = 330;
  facade(rect(c - 60, GY - 34, 120, 34), 0.3, 0.2, { gy: 8 });
  facade([[c - 36, GY], [c - 36, GY - 132], [c - 26, GY - 150], [c - 12, GY - 155], [c + 12, GY - 155], [c + 26, GY - 150], [c + 36, GY - 132], [c + 36, GY]], 0.36, 0.2, { gx: 6, gy: 8, lit: 0.07 });
  X.fillStyle = G(1, 0.07);
  X.fillRect(c - 12, GY - 155, 24, 155);
  fillP(rect(c - 40, GY - 160, 80, 5), G(0.15));
  fillP(rect(c - 9, GY - 172, 18, 12), G(0.22));
  // Torri Unicredit
  [[540, 160, -1], [665, 130, 1]].forEach(([x, h, s]) => facade([[x - 22, GY], [x - 22, GY - (s < 0 ? h : h + 25)], [x + 22, GY - (s < 0 ? h + 25 : h)], [x + 22, GY]], 0.4, 0.24, gl));
  c = 600;
  facade([[c - 26, GY], [c - 26, GY - 205], [c - 22, GY - 222], [c - 14, GY - 245], [c - 4, GY - 262], [c + 4, GY - 262], [c + 14, GY - 245], [c + 22, GY - 222], [c + 26, GY - 205], [c + 26, GY]], 0.44, 0.24, gl);
  fillP([[c - 3, GY - 262], [c + 3, GY - 262], [c + 0.7, GY - 292], [c - 0.7, GY - 292]], G(0.6));
  // Allianz, Generali, Hadid
  c = 840;
  facade(rect(c - 20, GY - 262, 40, 262), 0.4, 0.2, { gx: 8, gy: 7, glass: 0.6 });
  c = 905;
  const gp = [[c - 24, GY]];
  for (let i = 0; i <= 12; i++) gp.push([c - 24 + i * 4, GY - 222 + 16 * Math.sin((i / 12) * 1.5)]);
  gp.push([c + 24, GY]);
  facade(gp, 0.42, 0.22, gl);
  c = 985;
  const tw = [];
  const tr = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const o = Math.sin(t * 3.4) * 10;
    const wd = 22 - 5 * t;
    const y = GY - 195 * t;
    tw.push([c + o - wd, y]);
    tr.unshift([c + o + wd, y]);
  }
  facade(tw.concat(tr), 0.4, 0.22, gl);
  // Palazzo Lombardia
  c = 1180;
  const lp = [[c - 60, GY]];
  for (let x = c - 60; x <= c + 60; x += 4) lp.push([x, GY - 175 + Math.sin(x * 0.12) * 10]);
  lp.push([c + 60, GY]);
  facade(lp, 0.38, 0.26, { gx: 5, gy: 7, lit: 0.12, glass: 0.75 });
  facade(rect(c + 20, GY - 205, 34, 40), 0.36, 0.24, gl);
  // Bosco Verticale
  [[1400, 34, 139], [1448, 28, 100]].forEach(([x, bw, bh]) => {
    facade(rect(x, GY - bh, bw, bh), 0.34, 0.2, { gx: 7, gy: 8, lit: 0.06 });
    for (let y = GY - bh + 6; y < GY; y += 8)
      for (let a = x - 5; a < x + bw + 5; a += 3) {
        X.fillStyle = G(0.12 + rnd() * 0.14);
        X.beginPath();
        X.arc(a, y + rnd() * 2, 3 + rnd() * 2, 0, 7);
        X.fill();
      }
    for (let i = 0; i < 14; i++) {
      X.fillStyle = G(0.16 + rnd() * 0.16);
      X.beginPath();
      X.arc(x + rnd() * bw, GY - bh - 2, 4 + rnd() * 3, 0, 7);
      X.fill();
    }
  });
  // gru
  X.fillStyle = G(0.1);
  X.fillRect(1700, GY - 250, 4, 250);
  X.fillRect(1630, GY - 250, 170, 3);
  X.fillRect(1800, GY - 250, 3, 26);
  X.strokeStyle = G(0.1);
  X.lineWidth = 1;
  X.beginPath();
  for (let y = GY - 250; y < GY; y += 10) {
    X.moveTo(1700, y);
    X.lineTo(1704, y + 10);
    X.moveTo(1704, y);
    X.lineTo(1700, y + 10);
  }
  X.stroke();
}
function duomo(cx) {
  const S = 0.9;
  const b = GY;
  const xx = (x) => cx + x * S;
  const yy = (y) => b - y * S;
  const ro = (x) => {
    x = Math.abs(x);
    return x <= 50 ? 190 + (50 - x) * 0.84 : x <= 140 ? 130 + (140 - x) * 0.667 : 130;
  };
  const dk = (p, v) => fillP(p.map(([x, y]) => [xx(x), yy(y)]), G(v));
  for (let i = -21; i <= 21; i++) spire(xx(i * 12.5), yy(150 + (Math.abs(i) < 9 ? 30 : 0)), (55 + rnd() * 40) * S, 5 * S, 0.62);
  stone([[xx(-262), b], [xx(-262), yy(120)], [xx(-130), yy(160)], [xx(130), yy(160)], [xx(262), yy(120)], [xx(262), b]], 0.6, 0.42, { rib: 7 });
  stone(rect(xx(-30), yy(330), 60 * S, 180 * S), 0.72, 0.5, { rib: 5 });
  spire(xx(0), yy(330), 95 * S, 16 * S, 0.78);
  X.fillStyle = G(1);
  X.fillRect(xx(0) - 1, yy(425) - 6, 3, 6);
  stone([[-140, 0], [-140, 130], [-50, 190], [0, 232], [50, 190], [140, 130], [140, 0]].map(([x, y]) => [xx(x), yy(y)]), 0.9, 0.6, { rib: 6 });
  [-140, -93, -47, 47, 93, 140].forEach((x, i) => {
    stone(rect(xx(x) - 6 * S, yy(ro(x) + 10), 12 * S, (ro(x) + 10) * S), 0.95, 0.65, { rib: 4 });
    spire(xx(x), yy(ro(x) + 10), (60 + (i % 2) * 14) * S, 6 * S, 0.8);
  });
  spire(xx(0), yy(232), 80 * S, 7 * S, 0.85);
  dk([[-15, 75], [-15, 150], [0, 185], [15, 150], [15, 75]], 0.1);
  [-70, 70].forEach((x) => dk([[x - 9, 70], [x - 9, 125], [x, 148], [x + 9, 125], [x + 9, 70]], 0.12));
  [-100, -50, 0, 50, 100].forEach((x) => dk([[x - 11, 0], [x - 11, 34], [x, 52], [x + 11, 34], [x + 11, 0]], 0.07));
  for (let i = -1; i <= 1; i++) {
    X.fillStyle = G(0.8, 0.5);
    X.fillRect(xx(i * 7) - 1, yy(150), 1.5, 70 * S);
  }
  X.fillStyle = G(0, 0.2);
  X.fillRect(xx(-140), yy(62), 280 * S, 2);
}
function galleria(cx) {
  const b = GY;
  stone(rect(cx - 170, b - 210, 340, 210), 0.6, 0.44, { rib: 9 });
  stone(rect(cx - 170, b - 232, 340, 22), 0.66, 0.48, { rib: 14 });
  for (let x = -160; x <= 160; x += 40) stone(rect(cx + x, b - 252, 6, 20), 0.7, 0.5);
  X.save();
  X.beginPath();
  X.moveTo(cx - 62, b);
  X.lineTo(cx - 62, b - 120);
  X.arc(cx, b - 120, 62, Math.PI, 0);
  X.lineTo(cx + 62, b);
  X.closePath();
  X.clip();
  const g = X.createLinearGradient(0, b - 185, 0, b);
  g.addColorStop(0, G(0.95));
  g.addColorStop(1, G(0.25));
  X.fillStyle = g;
  X.fillRect(cx - 62, b - 185, 124, 185);
  for (let x = cx - 60; x < cx + 60; x += 10) {
    X.fillStyle = G(0, 0.35);
    X.fillRect(x, b - 185, 1, 185);
  }
  X.restore();
  [-125, 125].forEach((x) => fillP([[cx + x - 22, b], [cx + x - 22, b - 90], [cx + x, b - 112], [cx + x + 22, b - 90], [cx + x + 22, b]], G(0.14)));
}
function castello(cx) {
  const b = GY;
  stone(rect(cx - 270, b - 110, 540, 110), 0.52, 0.4, { brick: 1, rib: 40 });
  for (let x = cx - 270; x < cx + 270; x += 14) stone(rect(x, b - 124, 8, 14), 0.5, 0.4, { brick: 1 });
  stone(rect(cx - 50, b - 200, 100, 200), 0.58, 0.4, { brick: 1, rib: 50 });
  stone(rect(cx - 36, b - 300, 72, 100), 0.6, 0.42, { brick: 1, rib: 36 });
  [-22, 0, 22].forEach((x) => fillP([[cx + x - 6, b - 250], [cx + x - 6, b - 275], [cx + x, b - 285], [cx + x + 6, b - 275], [cx + x + 6, b - 250]], G(0.1)));
  fillP([[cx - 14, b], [cx - 14, b - 60], [cx, b - 80], [cx + 14, b - 60], [cx + 14, b]], G(0.07));
  X.fillStyle = G(0.9);
  X.beginPath();
  X.arc(cx, b - 225, 13, 0, 7);
  X.fill();
  X.strokeStyle = G(0.1);
  X.lineWidth = 2;
  X.beginPath();
  X.moveTo(cx, b - 225);
  X.lineTo(cx, b - 235);
  X.moveTo(cx, b - 225);
  X.lineTo(cx + 7, b - 222);
  X.stroke();
  for (let x = cx - 44; x < cx + 44; x += 11) stone(rect(x, b - 312, 7, 14), 0.6, 0.42, { brick: 1 });
  fillP([[cx - 38, b - 300], [cx - 28, b - 340], [cx - 12, b - 368], [cx, b - 400], [cx + 12, b - 368], [cx + 28, b - 340], [cx + 38, b - 300]], lgx(cx - 38, cx + 38, 0.62, 0.32));
}
// lampione: palo e luce (alone piccolo, solo attorno alla testa)
const lamp = (x, v = 1) => {
  X.fillStyle = G(0.08);
  X.fillRect(x, GY - 200, 4, 200);
  X.fillRect(x - 14, GY - 205, 32, 3);
  if (DAY) return;
  const r = X.createRadialGradient(x + 2, GY - 205, 2, x + 2, GY - 205, 50);
  r.addColorStop(0, G(v, 0.6));
  r.addColorStop(1, G(v, 0));
  X.fillStyle = r;
  X.fillRect(x - 50, GY - 255, 104, 100);
};
// strada: lastre di pietra con bordo chiaro
function ground(w, sn) {
  const g = X.createLinearGradient(0, GY, 0, VH_L);
  g.addColorStop(0, G(sn ? 0.34 : 0.22));
  g.addColorStop(1, G(sn ? 0.14 : 0.1));
  X.fillStyle = g;
  X.fillRect(0, GY, w, VH_L - GY);
  for (let y = GY + 4, r = 0; y < VH_L; y += 9, r++)
    for (let x = (r % 2) * 7; x < w; x += 14) {
      X.fillStyle = G((sn ? 0.2 : 0.12) + rnd() * 0.22, 0.55);
      X.fillRect(x, y, 12, 7);
    }
  X.fillStyle = G(0.7);
  X.fillRect(0, GY, w, 2);
}
function near(w) {
  ground(w, 0);
  for (let x = 1500; x < 2040; ) {
    const bw = (90 + rnd() * 40) | 0;
    const bh = (150 + rnd() * 70) | 0;
    facade(rect(x, GY - bh, bw, bh), 0.3, 0.2, { gx: 9, gy: 14, lit: 0.1, glass: 0.5 });
    fillP([[x - 4, GY - bh], [x + bw + 4, GY - bh], [x + bw - 6, GY - bh - 14], [x + 6, GY - bh - 14]], G(0.17));
    x += bw + 4;
  }
  duomo(520);
  galleria(1250);
  castello(2260);
  const ps = [100, 580, 1060, 1540, 2020, 2500];
  ps.forEach((x, i) => {
    lamp(x, 1);
    if (ps[i + 1]) {
      X.strokeStyle = G(0.06);
      X.lineWidth = 2;
      X.beginPath();
      X.moveTo(x + 2, GY - 203);
      X.quadraticCurveTo((x + ps[i + 1]) / 2 + 2, GY - 172, ps[i + 1] + 2, GY - 203);
      X.stroke();
    }
  });
}

// ---------------- NEW DELHI ----------------
const skyG = (w, s) => {
  const g = X.createLinearGradient(0, 0, 0, GY);
  s.forEach(([o, v]) => g.addColorStop(o, G(v)));
  X.fillStyle = g;
  X.fillRect(0, 0, w, VH_L);
};
const tree = (x, h, l) => {
  X.fillStyle = G(0.08);
  X.fillRect(x - 3, GY - h * 0.5, 6, h * 0.5);
  for (let i = 0; i < 26; i++) {
    X.fillStyle = G(l + rnd() * 0.1);
    X.beginPath();
    X.arc(x + (rnd() - 0.5) * h * 0.9, GY - h * 0.65 - (rnd() - 0.4) * h * 0.4, h * 0.16 + rnd() * h * 0.1, 0, 7);
    X.fill();
  }
};
const dome = (c, y, r, l) => {
  X.fillStyle = lgx(c - r, c + r, l, l - 0.4);
  X.beginPath();
  X.ellipse(c, y, r, r * 0.95, 0, Math.PI, 0);
  X.fill();
};
function lotus(c) {
  stone(rect(c - 150, GY - 14, 300, 14), 0.3, 0.2, { rib: 20 });
  for (let r = 0; r < 3; r++)
    for (let i = -4; i <= 4; i++) {
      const x = c + i * (22 - r * 4);
      const t = GY - (150 - r * 30) + Math.abs(i) * (10 + r * 4);
      const bl = x - (18 - r * 3);
      const br = x + (18 - r * 3);
      X.beginPath();
      X.moveTo(bl, GY - 14);
      X.quadraticCurveTo(bl - 4, (GY + t) / 2, c + i * (6 - r), t);
      X.quadraticCurveTo(br + 4, (GY + t) / 2, br, GY - 14);
      X.closePath();
      X.fillStyle = lgx(bl, br, 0.95 - r * 0.08, 0.55 - r * 0.05);
      X.fill();
      X.strokeStyle = G(0, 0.25);
      X.lineWidth = 1;
      X.stroke();
    }
}

// cappa di neve su un tetto a capanna: uno strato spesso e morbido che segue le falde,
// sporge un poco dalla gronda e lascia cadere qualche ghiacciolo
function snowCap([l, r, t], sc) {
  const th = 3.2 * sc;
  const over = 2 * sc;
  const pts = [[l[0] - over, l[1] + 1], [t[0], t[1] - th * 0.6], [r[0] + over, r[1] + 1]];
  // lato in ombra (sotto) e lato illuminato (sopra)
  fillP([pts[0], pts[1], pts[2], [r[0] - 2, r[1] + th], [t[0], t[1] + th * 1.2], [l[0] + 2, l[1] + th]], G(0.62));
  fillP([pts[0], pts[1], pts[2], [r[0], r[1] + th * 0.45], [t[0], t[1] + th * 0.6], [l[0], l[1] + th * 0.45]], G(0.97));
  // grumi lungo la falda
  for (let i = 0; i < 3; i++) {
    const k = 0.15 + rnd() * 0.7;
    const sideL = rnd() < 0.5;
    const a = sideL ? l : r;
    const px = a[0] + (t[0] - a[0]) * k;
    const py = a[1] + (t[1] - a[1]) * k;
    X.fillStyle = G(0.95);
    X.beginPath();
    X.ellipse(px, py - th * 0.3, 2.2 * sc, 1.3 * sc, 0, Math.PI, 0);
    X.fill();
  }
  // ghiaccioli sotto la gronda
  X.fillStyle = G(0.85, 0.9);
  for (const e of [l, r]) {
    const n = 1 + ((rnd() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const gx = e[0] + (e === l ? 3 + i * 4 : -3 - i * 4) * sc * 0.6;
      const len = (2 + rnd() * 3) * sc;
      fillP([[gx - 1, e[1] + th * 0.4], [gx + 1, e[1] + th * 0.4], [gx, e[1] + th * 0.4 + len]], G(0.85, 0.9));
    }
  }
}
function houses(x0, x1, y, sc, l0) {
  for (let x = x0; x < x1; ) {
    const bw = (22 + rnd() * 18) * sc;
    const bh = (26 + rnd() * 24) * sc;
    const l = l0 + rnd() * 0.25;
    const rf = [[x - 2, y - bh], [x + bw + 2, y - bh], [x + bw / 2, y - bh - bw * 0.35]];
    facade(rect(x, y - bh, bw, bh), l, l * 0.7, { gx: 6, gy: 8, lit: 0.3, glass: 0.7 });
    fillP(rf, G(l * 0.45));
    snowCap(rf, sc);
    x += bw + ((rnd() * 3) | 0);
  }
}


// ---------------- ZONE DELLE CITTÀ ----------------
// ogni tappa attraversa un quartiere diverso: cambia il primo piano (livello vicino),
// con monumenti e luoghi veri; dietro resta lo skyline della città.

// giorno/notte per i disegni fatti con paint() (es. lo sfondo del menu)
export function setDayMode(day) {
  DAY = Boolean(day);
  DAY_LIFT = DAY ? 0.06 : 0;
}

// disegna una scena qualsiasi (interni, oggetti, personaggi) con gli stessi strumenti
// del concept e la converte in palette. draw riceve gli strumenti e lavora in
// coordinate logiche (alte 540): k scala alla risoluzione finale.
export function paint(width, height, k, draw, { cell = 2, seedValue = 7, raw = false, dither = true } = {}) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  X = c.getContext("2d", { willReadFrequently: true });
  seed = seedValue;
  X.save();
  X.scale(k, k);
  draw({ X, G, rnd, rect, path, fillP, lgx, facade, stone, spire, dome, tree, lamp, ground, houses, skyG, nz, GY });
  X.restore();
  // raw: niente retino (serve per le maschere dei colori d'accento)
  if (!raw) quant(c, cell, dither);
  return c;
}

// nuova città in stile illustrazione piatta (vedi city.js)
export { buildCity as buildSkyline, ZONES } from "./city.js";
