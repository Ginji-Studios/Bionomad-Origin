// Skyline notturne di Milano, New Delhi e Reykjavík nello stile del concept del team:
// tutto viene disegnato in scala di grigi, poi quant() lo converte nella palette BIODOM
// a 5 colori con retino ordinato (celle 2x2). Versione per il gioco: più chiara,
// senza foschia, senza scanline e senza etichette, così i personaggi restano leggibili.

export const PALETTE = ["#1C2839", "#2D3D52", "#304E6A", "#5E6D88", "#F1F0ED"];
const PR = PALETTE.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

// coordinate logiche del concept: vista alta 540, strada a GY, mondo largo W
export const VH_L = 540;
export const GY = 480;
export const W_L = 2880;
// schiarita generale richiesta (in scala 0-1, prima del retino)
const LIFT = 0.07;
// giorno o notte: cambia cielo, finestre e lampioni, e schiarisce un po' tutto
let DAY = false;
let DAY_LIFT = 0;

let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const B8 = (() => {
  let m = [[0, 2], [3, 1]];
  while (m.length < 8) {
    const n = m.length;
    const r = [];
    for (let y = 0; y < 2 * n; y++) {
      r[y] = [];
      for (let x = 0; x < 2 * n; x++) r[y][x] = m[y % n][x % n] * 4 + [[0, 2], [3, 1]][y < n ? 0 : 1][x < n ? 0 : 1];
    }
    m = r;
  }
  return m.flat().map((v) => (v + 0.5) / 64);
})();
const G = (v, a = 1) => {
  const n = Math.max(0, Math.min(255, v * 255)) | 0;
  return `rgba(${n},${n},${n},${a})`;
};
let X;
let VW = 864; // larghezza logica della vista, impostata da buildSkyline

// scala di grigi -> palette con retino a celle CS x CS
export function quant(c, CS = 2) {
  const w = c.width;
  const h = c.height;
  const x = c.getContext("2d");
  const d = x.getImageData(0, 0, w, h).data;
  const out = x.createImageData(w, h);
  const o = out.data;
  for (let cy = 0; cy < h; cy += CS)
    for (let cx = 0; cx < w; cx += CS) {
      let s = 0;
      let a = 0;
      let n = 0;
      for (let j = 0; j < CS && cy + j < h; j++)
        for (let i = 0; i < CS && cx + i < w; i++) {
          const k = ((cy + j) * w + cx + i) * 4;
          s += d[k] * d[k + 3];
          a += d[k + 3];
          n++;
        }
      if (a / n < 128) continue;
      const v = Math.max(0, Math.min(1, s / a / 255 + LIFT + DAY_LIFT + (rnd() - 0.5) * 0.05));
      const p = v * 4;
      const lo = Math.min(3, p | 0);
      const i = B8[((cy / CS) & 7) * 8 + ((cx / CS) & 7)] < p - lo ? lo + 1 : lo;
      const col = PR[i];
      for (let j = 0; j < CS && cy + j < h; j++)
        for (let q = 0; q < CS && cx + q < w; q++) {
          const k = ((cy + j) * w + cx + q) * 4;
          o[k] = col[0];
          o[k + 1] = col[1];
          o[k + 2] = col[2];
          o[k + 3] = 255;
        }
    }
  x.putImageData(out, 0, 0);
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
  for (let i = 0; i < (w * h) / 50; i++) {
    X.fillStyle = G(rnd() < 0.5 ? 0 : 1, 0.08);
    X.fillRect(x + rnd() * w, top + rnd() * h, 2, 2);
  }
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
function mtn(w) {
  const ry = (x) => GY - 110 - (nz(x / 150) * 170 + nz(x / 55) * 60 + nz(x / 18) * 18);
  X.beginPath();
  X.moveTo(0, GY + 4);
  for (let x = 0; x <= w; x += 2) X.lineTo(x, ry(x));
  X.lineTo(w, GY + 4);
  X.closePath();
  const g = X.createLinearGradient(0, GY - 360, 0, GY);
  [[0, 0.92], [0.25, 0.7], [0.55, 0.4], [1, 0.52]].forEach(([o, v]) => g.addColorStop(o, G(v)));
  X.fillStyle = g;
  X.fill();
  for (let x = 0; x < w; x += 3) {
    X.fillStyle = G(0, 0.07 + rnd() * 0.08);
    X.fillRect(x, ry(x), 2, 10 + rnd() * 80);
  }
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
const fillers = (w, h0, hr, l) => {
  for (let x = -20; x < w; ) {
    const bw = (34 + rnd() * 40) | 0;
    const bh = (h0 + rnd() * hr) | 0;
    facade(rect(x, GY - bh, bw, bh), l, l * 0.65, { gx: 7, gy: 9, lit: 0.05 });
    if (rnd() < 0.5) {
      X.fillStyle = G(0.12);
      X.fillRect(x + bw * 0.3, GY - bh - 10, 4, 10);
    }
    x += bw + ((rnd() * 8) | 0);
  }
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
function skyD(w) {
  skyG(w, [[0, 0.1], [0.4, 0.3], [0.7, 0.55], [1, 0.8]]);
  // sole basso velato dallo smog: disco netto e alone contenuto
  const sx = Math.min(690, w - 120);
  const h = X.createRadialGradient(sx, GY - 90, 10, sx, GY - 90, 150);
  h.addColorStop(0, G(1, 0.5));
  h.addColorStop(1, G(1, 0));
  X.fillStyle = h;
  X.fillRect(sx - 160, GY - 250, 320, 320);
  X.fillStyle = G(1);
  X.beginPath();
  X.arc(sx, GY - 90, 46, 0, 7);
  X.fill();
  X.strokeStyle = G(0.08);
  X.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = 80 + rnd() * 500;
    const y = 90 + rnd() * 120;
    X.beginPath();
    X.moveTo(x - 8, y - 4);
    X.quadraticCurveTo(x - 3, y + 1, x, y);
    X.quadraticCurveTo(x + 3, y + 1, x + 8, y - 4);
    X.stroke();
  }
}
function qutub(c) {
  const Y = [0, 95, 165, 210, 238, 254];
  const hw = (y) => 27 - (15 * y) / 254;
  for (let i = 0; i < 5; i++) {
    const y0 = Y[i];
    const y1 = Y[i + 1];
    stone([[c - hw(y0), GY - y0], [c - hw(y1), GY - y1], [c + hw(y1), GY - y1], [c + hw(y0), GY - y0]], 0.5, 0.28, { rib: i < 2 ? 5 : 4 });
    fillP(rect(c - hw(y1) - 6, GY - y1 - 4, 2 * hw(y1) + 12, 6), G(0.2));
    X.fillStyle = G(0.1);
    for (let x = -hw(y1) - 4; x < hw(y1) + 4; x += 6) X.fillRect(c + x, GY - y1 + 2, 2, 4);
  }
  fillP([[c - 8, GY - 254], [c + 8, GY - 254], [c + 5, GY - 262], [c - 5, GY - 262]], G(0.6));
  fillP([[c - 4, GY - 262], [c + 4, GY - 262], [c, GY - 276]], G(0.7));
}
function humayun(c) {
  stone(rect(c - 170, GY - 28, 340, 28), 0.45, 0.3, { rib: 12 });
  stone(rect(c - 80, GY - 110, 160, 82), 0.5, 0.3, { rib: 9 });
  [-50, 0, 50].forEach((x) => fillP([[c + x - 14, GY - 28], [c + x - 14, GY - 60], [c + x, GY - 84], [c + x + 14, GY - 60], [c + x + 14, GY - 28]], G(0.1)));
  stone(rect(c - 36, GY - 136, 72, 28), 0.78, 0.5, { rib: 6 });
  dome(c, GY - 136, 44, 0.95);
  X.fillStyle = G(0.8);
  X.fillRect(c - 1, GY - 188, 2, 12);
  [-70, 70].forEach((x) => {
    stone(rect(c + x - 9, GY - 128, 18, 18), 0.7, 0.45);
    dome(c + x, GY - 128, 10, 0.9);
  });
}
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
function aksh(c) {
  stone(rect(c - 120, GY - 20, 240, 20), 0.5, 0.3, { rib: 14 });
  stone(rect(c - 100, GY - 100, 200, 80), 0.58, 0.34, { rib: 6 });
  [-80, -40, 40, 80].forEach((x) => {
    stone(rect(c + x - 14, GY - 130, 28, 30), 0.6, 0.36, { rib: 4 });
    spire(c + x, GY - 130, 34, 10, 0.55);
  });
  stone(rect(c - 30, GY - 135, 60, 35), 0.66, 0.4, { rib: 5 });
  dome(c, GY - 135, 34, 0.85);
  spire(c, GY - 165, 34, 3, 0.7);
}
function midD(w) {
  fillers(w, 40, 50, 0.3);
  facade(rect(250, GY - 240, 44, 240), 0.4, 0.2, { gx: 6, gy: 8, lit: 0.08, glass: 0.7 });
  facade(rect(1250, GY - 200, 40, 200), 0.38, 0.2, { gx: 6, gy: 8, lit: 0.08, glass: 0.7 });
  qutub(500);
  humayun(1000);
  lotus(1500);
  aksh(1800);
}
function gate(c) {
  const b = GY;
  stone(rect(c - 96, b - 24, 192, 24), 0.6, 0.4, { rib: 12 });
  stone(rect(c - 80, b - 180, 160, 156), 0.62, 0.38, { rib: 10, brick: 1 });
  stone(rect(c - 90, b - 196, 180, 16), 0.66, 0.42);
  stone(rect(c - 74, b - 206, 148, 10), 0.6, 0.4);
  stone(rect(c - 60, b - 214, 120, 8), 0.56, 0.38);
  X.save();
  X.beginPath();
  X.moveTo(c - 38, b - 24);
  X.lineTo(c - 38, b - 110);
  X.arc(c, b - 110, 38, Math.PI, 0);
  X.lineTo(c + 38, b - 24);
  X.closePath();
  X.clip();
  const g = X.createLinearGradient(0, b - 148, 0, b - 24);
  g.addColorStop(0, G(0.8));
  g.addColorStop(1, G(0.4));
  X.fillStyle = g;
  X.fillRect(c - 38, b - 148, 76, 124);
  X.restore();
  X.fillStyle = G(0.3);
  X.fillRect(c - 60, b - 170, 120, 14);
  X.fillStyle = G(0.95);
  X.fillRect(c - 3, b - 30, 6, 8);
}
function bhavan(c) {
  const b = GY;
  stone(rect(c - 300, b - 90, 600, 90), 0.62, 0.4, { rib: 8 });
  for (let x = -280; x <= 280; x += 30) fillP([[c + x - 9, b], [c + x - 9, b - 34], [c + x, b - 46], [c + x + 9, b - 34], [c + x + 9, b]], G(0.1));
  [-280, -200, 200, 280].forEach((x) => {
    stone(rect(c + x - 14, b - 120, 28, 30), 0.66, 0.44, { rib: 5 });
    dome(c + x, b - 120, 16, 0.9);
  });
  stone(rect(c - 90, b - 124, 180, 34), 0.68, 0.44, { rib: 5 });
  stone(rect(c - 52, b - 160, 104, 40), 0.72, 0.46, { rib: 5 });
  dome(c, b - 160, 60, 0.92);
  X.fillStyle = G(0.85);
  X.fillRect(c - 1, b - 224, 2, 14);
}
function nearD(w) {
  ground(w, 0);
  [180, 720, 900, 1150, 1380, 2150, 2400, 2650].forEach((x, i) => tree(x, 120 + (i % 3) * 35, 0.14));
  gate(520);
  bhavan(1750);
  [360, 1100, 2300].forEach((x) => lamp(x, 0.9));
}

// ---------------- REYKJAVÍK ----------------
function skyR(w) {
  skyG(w, [[0, 0.04], [0.5, 0.12], [0.8, 0.24], [1, 0.4]]);
  for (let i = 0; i < 160; i++) {
    X.fillStyle = G(0.9, 0.3 + rnd() * 0.6);
    X.fillRect(rnd() * w, rnd() * 300, 2, 2);
  }
  // aurora boreale a tende
  for (let k = 0; k < 3; k++) {
    const y0 = 80 + k * 45;
    for (let x = 0; x < w; x += 2) {
      const h = 40 + nz(x / 90 + k * 9) * 110;
      const y = y0 + Math.sin(x / 70 + k * 2) * 30;
      const g = X.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, G(0.8, 0));
      g.addColorStop(0.25, G(0.8, 0.3 + nz(x / 17) * 0.3));
      g.addColorStop(1, G(0.8, 0));
      X.fillStyle = g;
      X.fillRect(x, y, 2, h);
    }
  }
}
function mtnR(w) {
  const ry = (x) => GY - 70 - (100 + nz(x / 260) * 45 + nz(x / 60) * 14 + nz(x / 16) * 5);
  X.beginPath();
  X.moveTo(0, GY - 50);
  for (let x = 0; x <= w; x += 2) X.lineTo(x, ry(x));
  X.lineTo(w, GY - 50);
  X.closePath();
  const g = X.createLinearGradient(0, GY - 250, 0, GY - 50);
  [[0, 0.8], [0.3, 0.55], [0.7, 0.3], [1, 0.36]].forEach(([o, v]) => g.addColorStop(o, G(v)));
  X.fillStyle = g;
  X.fill();
  for (let x = 0; x < w; x += 3) {
    X.fillStyle = G(0, 0.08 + rnd() * 0.1);
    X.fillRect(x, ry(x), 2, 10 + rnd() * 60);
  }
  const wg = X.createLinearGradient(0, GY - 50, 0, GY + 4);
  wg.addColorStop(0, G(0.3));
  wg.addColorStop(1, G(0.12));
  X.fillStyle = wg;
  X.fillRect(0, GY - 50, w, 54);
  for (let i = 0; i < 120; i++) {
    X.fillStyle = G(0.7, 0.15 + rnd() * 0.2);
    X.fillRect(rnd() * w, GY - 48 + rnd() * 50, 6 + rnd() * 30, 1);
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
    X.strokeStyle = G(0.95, 0.9);
    X.lineWidth = 2;
    X.beginPath();
    X.moveTo(rf[0][0], rf[0][1]);
    X.lineTo(rf[2][0], rf[2][1]);
    X.lineTo(rf[1][0], rf[1][1]);
    X.stroke();
    x += bw + ((rnd() * 3) | 0);
  }
}
function perlan(c) {
  for (let i = 0; i < 5; i++) stone(rect(c - 62 + i * 26, GY - 95, 24, 95), 0.55, 0.3, { rib: 4 });
  X.fillStyle = lgx(c - 80, c + 80, 0.9, 0.4);
  X.beginPath();
  X.ellipse(c, GY - 95, 78, 46, 0, Math.PI, 0);
  X.fill();
  X.strokeStyle = G(0, 0.3);
  X.lineWidth = 1;
  for (let i = -70; i <= 70; i += 10) {
    X.beginPath();
    X.moveTo(c + i, GY - 95);
    X.lineTo(c + i * 0.3, GY - 140);
    X.stroke();
  }
  X.fillStyle = G(0.8);
  X.fillRect(c - 1, GY - 150, 2, 16);
}
function harpa(c) {
  const hp = [[c - 170, GY], [c - 170, GY - 80], [c - 120, GY - 112], [c + 120, GY - 112], [c + 170, GY - 80], [c + 170, GY]];
  facade(hp, 0.5, 0.28, { gx: 10, gy: 10, lit: 0.22, glass: 0.9 });
  X.save();
  path(hp);
  X.clip();
  X.strokeStyle = G(1, 0.22);
  X.lineWidth = 1;
  for (let x = c - 170; x < c + 170; x += 14) {
    X.beginPath();
    X.moveTo(x, GY - 112);
    X.lineTo(x + 40, GY);
    X.moveTo(x, GY);
    X.lineTo(x + 40, GY - 112);
    X.stroke();
  }
  X.restore();
}
function midR(w) {
  houses(-10, w, GY, 1.5, 0.22);
  perlan(700);
  harpa(1300);
}
function hall(c) {
  const b = GY;
  const wg = [[-170, 0], [-170, 50], [-150, 50], [-150, 90], [-128, 90], [-128, 130], [-106, 130], [-106, 170], [-80, 170], [-80, 0]];
  [1, -1].forEach((s) => stone(wg.map(([x, y]) => [c + x * s, b - y]), 0.72, 0.46, { rib: 5 }));
  stone(rect(c - 80, b - 170, 160, 170), 0.74, 0.5, { rib: 5 });
  stone(rect(c - 26, b - 260, 52, 260), 0.8, 0.5, { rib: 5 });
  stone(rect(c - 20, b - 290, 40, 30), 0.8, 0.5, { rib: 5 });
  stone(rect(c - 14, b - 315, 28, 25), 0.8, 0.5, { rib: 5 });
  fillP([[c - 10, b - 315], [c + 10, b - 315], [c, b - 385]], lgx(c - 10, c + 10, 0.85, 0.5));
  X.fillStyle = G(0.9);
  X.fillRect(c - 1, b - 402, 2, 18);
  X.fillRect(c - 5, b - 396, 10, 2);
  fillP([[c - 14, b], [c - 14, b - 50], [c, b - 80], [c + 14, b - 50], [c + 14, b]], G(0.08));
  X.fillStyle = G(0.08);
  X.fillRect(c - 4, b - 240, 8, 60);
  X.fillStyle = G(0.9);
  X.beginPath();
  X.arc(c, b - 275, 7, 0, 7);
  X.fill();
}
function nearR(w) {
  ground(w, 1);
  houses(900, w, GY, 2.2, 0.25);
  hall(520);
  // neve ai bordi della strada
  for (let x = 0; x < w; x += 120) {
    X.fillStyle = G(0.8, 0.8);
    X.beginPath();
    X.ellipse(x + rnd() * 60, GY + 3, 50 + rnd() * 40, 6, 0, Math.PI, 0);
    X.fill();
  }
  [300, 820, 1500, 2200].forEach((x) => lamp(x, 0.95));
}


// ---------------- ZONE DELLE CITTÀ ----------------
// ogni tappa attraversa un quartiere diverso: cambia il primo piano (livello vicino),
// con monumenti e luoghi veri; dietro resta lo skyline della città.

// disegna una funzione-monumento ingrandita attorno alla sua base
const scaled = (fn, c, sc) => {
  X.save();
  X.translate(c, GY);
  X.scale(sc, sc);
  X.translate(-c, -GY);
  fn(c);
  X.restore();
};
const lampsAt = (xs, v = 1) =>
  xs.forEach((x, i) => {
    lamp(x, v);
    if (xs[i + 1]) {
      X.strokeStyle = G(0.06);
      X.lineWidth = 2;
      X.beginPath();
      X.moveTo(x + 2, GY - 203);
      X.quadraticCurveTo((x + xs[i + 1]) / 2 + 2, GY - 172, xs[i + 1] + 2, GY - 203);
      X.stroke();
    }
  });
// palazzi bassi di fila, con tetto piatto e cornicione
const block = (x0, x1, h0, hr, l, o = {}) => {
  for (let x = x0; x < x1; ) {
    const bw = (70 + rnd() * 50) | 0;
    const bh = (h0 + rnd() * hr) | 0;
    facade(rect(x, GY - bh, bw, bh), l, l * 0.66, { gx: 9, gy: 13, lit: 0.1, glass: 0.55, ...o });
    fillP(rect(x - 3, GY - bh - 6, bw + 6, 6), G(l * 0.5));
    x += bw + 3;
  }
};

// MILANO · PORTA NUOVA: Piazza Gae Aulenti, Torre UniCredit, Bosco Verticale, Torre Solaria
function nearPortaNuova(w) {
  ground(w, 0);
  block(-10, 360, 120, 60, 0.3);
  // Torre UniCredit con la guglia
  const c = 620;
  facade([[c - 70, GY], [c - 70, GY - 300], [c - 50, GY - 330], [c - 20, GY - 352], [c + 20, GY - 352], [c + 50, GY - 330], [c + 70, GY - 300], [c + 70, GY]], 0.6, 0.36, { gx: 6, gy: 8, lit: 0.08, glass: 0.75 });
  fillP([[c - 5, GY - 352], [c + 5, GY - 352], [c + 1, GY - 430], [c - 1, GY - 430]], G(0.75));
  // pensilina circolare della piazza
  X.fillStyle = G(0.65);
  X.beginPath();
  X.ellipse(880, GY - 70, 160, 14, 0, 0, 7);
  X.fill();
  X.fillStyle = G(0.12);
  for (let x = 740; x <= 1020; x += 40) X.fillRect(x, GY - 62, 4, 62);
  // fontana a raso
  X.fillStyle = G(0.85, 0.7);
  for (let i = 0; i < 6; i++) X.fillRect(820 + i * 22, GY - 16 - (i % 2) * 8, 3, 16 + (i % 2) * 8);
  // Bosco Verticale: due torri coperte di alberi
  [[1220, 80, 300], [1340, 66, 230]].forEach(([x, bw, bh]) => {
    facade(rect(x, GY - bh, bw, bh), 0.5, 0.3, { gx: 8, gy: 10, lit: 0.06 });
    for (let y = GY - bh + 8; y < GY; y += 12)
      for (let a = x - 6; a < x + bw + 6; a += 5) {
        X.fillStyle = G(0.12 + rnd() * 0.2);
        X.beginPath();
        X.arc(a, y + rnd() * 3, 4 + rnd() * 3, 0, 7);
        X.fill();
      }
  });
  // Biblioteca degli Alberi: filari di alberi bassi
  [1560, 1640, 1720, 1800].forEach((x, i) => tree(x, 90 + (i % 2) * 30, 0.2));
  // Torre Solaria
  facade(rect(2050, GY - 280, 70, 280), 0.56, 0.34, { gx: 6, gy: 7, lit: 0.1, glass: 0.7 });
  for (let y = GY - 270; y < GY; y += 14) fillP(rect(2044, y, 82, 3), G(0.7, 0.6));
  block(2200, w, 110, 70, 0.3);
  lampsAt([300, 1100, 1500, 1950, 2500]);
}

// MILANO · NAVIGLI: case di ringhiera sul Naviglio Grande, ponte in ferro, Colonne di San Lorenzo
function nearNavigli(w) {
  ground(w, 0);
  // case di ringhiera con i ballatoi
  for (let x = -10; x < 1450; ) {
    const bw = (90 + rnd() * 40) | 0;
    const bh = (150 + rnd() * 50) | 0;
    const l = 0.42 + rnd() * 0.18;
    stone(rect(x, GY - 40 - bh, bw, bh), l, l * 0.7, { rib: 9 });
    fillP(rect(x - 4, GY - 46 - bh, bw + 8, 7), G(l * 0.45));
    for (let y = GY - 40 - bh + 18; y < GY - 50; y += 34) {
      X.fillStyle = G(0.12);
      for (let a = x + 8; a < x + bw - 10; a += 18) X.fillRect(a, y, 10, 16);
      X.fillStyle = G(0.75);
      X.fillRect(x, y + 20, bw, 2);
      for (let a = x; a < x + bw; a += 4) X.fillRect(a, y + 20, 1, 8);
    }
    x += bw + 2;
  }
  // il Naviglio: acqua scura con i riflessi, tra le case e la strada
  X.fillStyle = G(0.12);
  X.fillRect(-10, GY - 40, 1470, 40);
  for (let i = 0; i < 70; i++) {
    X.fillStyle = G(0.6 + rnd() * 0.3, 0.6);
    X.fillRect(rnd() * 1450, GY - 36 + rnd() * 32, 10 + rnd() * 24, 1);
  }
  // ponte in ferro sul canale
  X.strokeStyle = G(0.15);
  X.lineWidth = 4;
  X.beginPath();
  X.moveTo(560, GY - 30);
  X.quadraticCurveTo(640, GY - 80, 720, GY - 30);
  X.stroke();
  X.lineWidth = 2;
  for (let x = 570; x < 715; x += 12) {
    X.beginPath();
    X.moveTo(x, GY - 30 - 50 * Math.sin(((x - 560) / 160) * Math.PI) * 0.8);
    X.lineTo(x, GY - 72);
    X.stroke();
  }
  X.fillRect(556, GY - 74, 168, 3);
  // Colonne di San Lorenzo e la basilica dietro
  const c = 1900;
  stone(rect(c - 120, GY - 200, 240, 200), 0.5, 0.34, { rib: 12 });
  dome(c, GY - 200, 70, 0.75);
  [-50, 50].forEach((x) => stone(rect(c + x - 14, GY - 260, 28, 70), 0.55, 0.36, { rib: 6 }));
  for (let i = 0; i < 16; i++) {
    const x = c - 340 + i * 14;
    stone(rect(x, GY - 150, 9, 150), 0.82, 0.56, { rib: 3 });
  }
  fillP(rect(c - 346, GY - 162, 230, 14), G(0.75));
  block(2150, w, 120, 60, 0.32);
  lampsAt([200, 900, 1300, 2300, 2700]);
}

// MILANO · CITYLIFE: le Tre Torri (Allianz, Generali, PwC) e il parco
function nearCityLife(w) {
  ground(w, 0);
  block(-10, 300, 100, 60, 0.3);
  // Torre Allianz "il Dritto"
  let c = 560;
  facade(rect(c - 45, GY - 380, 90, 380), 0.56, 0.32, { gx: 8, gy: 7, glass: 0.6, lit: 0.08 });
  [-1, 1].forEach((d) => {
    X.strokeStyle = G(0.75);
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(c + d * 45, GY - 40);
    X.lineTo(c + d * 75, GY);
    X.stroke();
  });
  // Torre Generali "lo Storto" di Zaha Hadid
  c = 900;
  const gp = [[c - 50, GY]];
  for (let i = 0; i <= 14; i++) gp.push([c - 50 + Math.sin(i / 5) * 10, GY - (i / 14) * 320]);
  for (let i = 14; i >= 0; i--) gp.push([c + 50 + Math.sin(i / 5) * 10 + (i / 14) * 8, GY - (i / 14) * 320]);
  facade(gp, 0.58, 0.32, { gx: 6, gy: 8, glass: 0.75, lit: 0.08 });
  // Torre PwC "il Curvo" di Libeskind
  c = 1230;
  facade([[c - 60, GY], [c - 60, GY - 200], [c - 40, GY - 250], [c, GY - 270], [c + 60, GY - 230], [c + 60, GY]], 0.54, 0.34, { gx: 7, gy: 8, glass: 0.7, lit: 0.08 });
  // Parco CityLife
  for (let x = 1450; x < 2100; x += 70 + ((x * 7) % 30)) tree(x, 100 + ((x * 3) % 40), 0.18);
  X.fillStyle = G(0.3);
  X.fillRect(1440, GY - 6, 680, 6);
  block(2150, w, 110, 60, 0.3);
  lampsAt([380, 1050, 1400, 2200, 2600]);
}

// NEW DELHI · OLD DELHI: Forte Rosso, Jama Masjid, i vicoli di Chandni Chowk
function nearOldDelhi(w) {
  ground(w, 0);
  // Forte Rosso: mura merlate in arenaria e la Porta di Lahore con i chhatri
  const c = 620;
  stone(rect(c - 420, GY - 150, 840, 150), 0.5, 0.36, { brick: 1, rib: 30 });
  for (let x = c - 420; x < c + 420; x += 16) fillP([[x, GY - 150], [x + 10, GY - 150], [x + 10, GY - 160], [x + 5, GY - 166], [x, GY - 160]], G(0.46));
  stone(rect(c - 90, GY - 230, 180, 230), 0.56, 0.38, { rib: 15 });
  fillP([[c - 34, GY], [c - 34, GY - 110], [c, GY - 150], [c + 34, GY - 110], [c + 34, GY]], G(0.08));
  [-70, -24, 24, 70].forEach((x) => {
    stone(rect(c + x - 14, GY - 262, 28, 32), 0.62, 0.42, { rib: 5 });
    dome(c + x, GY - 262, 16, 0.9);
  });
  // vicoli con le case strette e i fili sospesi
  for (let x = 1080; x < 1620; ) {
    const bw = (40 + rnd() * 30) | 0;
    const bh = (110 + rnd() * 90) | 0;
    facade(rect(x, GY - bh, bw, bh), 0.42, 0.28, { gx: 9, gy: 14, lit: 0.12, glass: 0.5 });
    X.fillStyle = G(0.65);
    X.fillRect(x - 2, GY - bh + 30, bw + 4, 4);
    x += bw + 2;
  }
  X.strokeStyle = G(0.05);
  X.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    X.beginPath();
    X.moveTo(1080 + rnd() * 500, GY - 120 - rnd() * 70);
    X.quadraticCurveTo(1300, GY - 80 - rnd() * 40, 1080 + rnd() * 540, GY - 120 - rnd() * 70);
    X.stroke();
  }
  // Jama Masjid: tre cupole a strisce e due minareti
  const m = 2050;
  stone(rect(m - 250, GY - 140, 500, 140), 0.55, 0.36, { rib: 20 });
  [-130, 0, 130].forEach((x) => {
    const r = x ? 50 : 72;
    dome(m + x, GY - 140, r, 0.95);
    X.strokeStyle = G(0.4, 0.6);
    X.lineWidth = 2;
    for (let a = -r + 10; a < r; a += 16) {
      X.beginPath();
      X.moveTo(m + x + a, GY - 140);
      X.lineTo(m + x + a * 0.4, GY - 140 - r * 0.85);
      X.stroke();
    }
  });
  [-240, 240].forEach((x) => {
    stone(rect(m + x - 10, GY - 330, 20, 330), 0.6, 0.4, { brick: 1, rib: 5 });
    dome(m + x, GY - 330, 14, 0.9);
  });
  lampsAt([300, 1000, 1700, 2500], 0.9);
}

// NEW DELHI · CONNAUGHT PLACE: i portici bianchi a colonne e il grande tricolore del Central Park
function nearConnaught(w) {
  ground(w, 0);
  const arcade = (x0, x1) => {
    stone(rect(x0, GY - 150, x1 - x0, 150), 0.84, 0.6, { rib: 40 });
    for (let x = x0 + 10; x < x1 - 10; x += 26) {
      X.fillStyle = G(0.2);
      X.fillRect(x + 6, GY - 60, 14, 60);
      X.fillStyle = G(0.9);
      X.fillRect(x, GY - 70, 6, 70);
    }
    fillP(rect(x0 - 6, GY - 76, x1 - x0 + 12, 8), G(0.7));
    for (let x = x0 + 14; x < x1 - 20; x += 26) {
      X.fillStyle = G(0.25);
      X.fillRect(x, GY - 130, 12, 18);
    }
    fillP(rect(x0 - 4, GY - 158, x1 - x0 + 8, 10), G(0.66));
  };
  arcade(-10, 900);
  // Central Park con l'asta della bandiera
  for (let x = 1000; x < 1500; x += 80) tree(x, 90, 0.2);
  X.fillStyle = G(0.75);
  X.fillRect(1250, GY - 360, 4, 360);
  [0.95, 0.6, 0.3].forEach((v, i) => {
    X.fillStyle = G(v);
    X.fillRect(1254, GY - 360 + i * 22, 110, 22);
  });
  X.strokeStyle = G(0.15);
  X.lineWidth = 2;
  X.beginPath();
  X.arc(1309, GY - 327, 8, 0, 7);
  X.stroke();
  arcade(1600, w + 10);
  lampsAt([200, 700, 1100, 1450, 1900, 2400], 0.9);
}

// NEW DELHI · MEHRAULI: Qutub Minar da vicino e la porta Alai Darwaza
function nearMehrauli(w) {
  ground(w, 0);
  for (let x = -10; x < 700; x += 90) tree(x + 30, 110, 0.18);
  scaled(qutub, 900, 1.45);
  // Alai Darwaza: porta quadrata con l'arco a ferro di cavallo e la cupola bassa
  const c = 1350;
  stone(rect(c - 90, GY - 150, 180, 150), 0.6, 0.42, { rib: 10 });
  fillP([[c - 34, GY], [c - 34, GY - 80], [c - 40, GY - 100], [c, GY - 128], [c + 40, GY - 100], [c + 34, GY - 80], [c + 34, GY]], G(0.1));
  dome(c, GY - 150, 70, 0.7);
  // rovine ad archi
  for (let i = 0; i < 6; i++) {
    const x = 1650 + i * 90;
    stone(rect(x, GY - 140 + (i % 2) * 30, 70, 140 - (i % 2) * 30), 0.52, 0.36, { rib: 8 });
    fillP([[x + 15, GY], [x + 15, GY - 60], [x + 35, GY - 90], [x + 55, GY - 60], [x + 55, GY]], G(0.1));
  }
  for (let x = 2250; x < w; x += 100) tree(x, 120, 0.18);
  lampsAt([500, 1150, 2200], 0.85);
}

// REYKJAVÍK · HÖFNIN: Harpa sul mare, la scultura Sólfar, il porto vecchio
function nearHarbour(w) {
  ground(w, 1);
  // mare dietro il lungomare
  X.fillStyle = G(0.14);
  X.fillRect(-10, GY - 30, w + 20, 30);
  for (let i = 0; i < 80; i++) {
    X.fillStyle = G(0.6 + rnd() * 0.3, 0.5);
    X.fillRect(rnd() * w, GY - 28 + rnd() * 26, 12 + rnd() * 30, 1);
  }
  scaled(harpa, 620, 1.7);
  // Sólfar: lo scheletro d'acciaio della nave vichinga
  const s = 1400;
  X.strokeStyle = G(0.85);
  X.lineWidth = 4;
  X.beginPath();
  X.moveTo(s - 110, GY - 70);
  X.quadraticCurveTo(s, GY - 40, s + 110, GY - 70);
  X.stroke();
  X.lineWidth = 3;
  for (let i = -4; i <= 4; i++) {
    X.beginPath();
    X.moveTo(s + i * 24, GY - 46 - Math.abs(i) * 3);
    X.lineTo(s + i * 26, GY - 100 - Math.abs(i) * 6);
    X.stroke();
  }
  X.beginPath();
  X.moveTo(s + 110, GY - 70);
  X.lineTo(s + 150, GY - 130);
  X.moveTo(s - 110, GY - 70);
  X.lineTo(s - 140, GY - 120);
  X.stroke();
  // porto vecchio: barche e gru
  [1800, 2000].forEach((x, i) => {
    fillP([[x - 70, GY - 30], [x + 80, GY - 30], [x + 60, GY - 4], [x - 56, GY - 4]], G(0.5 + i * 0.2));
    stone(rect(x - 20, GY - 70, 50, 40), 0.75, 0.5, { rib: 6 });
    X.fillStyle = G(0.2);
    X.fillRect(x + 4, GY - 130, 3, 60);
  });
  X.fillStyle = G(0.12);
  X.fillRect(2300, GY - 260, 6, 260);
  X.fillRect(2230, GY - 260, 170, 4);
  lampsAt([250, 1100, 1650, 2500], 0.95);
}

// REYKJAVÍK · LAUGAVEGUR: case colorate in lamiera ondulata e la strada arcobaleno
function nearLaugavegur(w) {
  ground(w, 1);
  for (let x = -10; x < w; ) {
    const bw = (80 + rnd() * 50) | 0;
    const bh = (90 + rnd() * 70) | 0;
    const l = 0.3 + rnd() * 0.6;
    // lamiera ondulata: righe verticali fitte
    stone(rect(x, GY - bh, bw, bh), l, l * 0.75, { rib: 3 });
    fillP([[x - 6, GY - bh], [x + bw / 2, GY - bh - bw * 0.42], [x + bw + 6, GY - bh]], G(Math.max(0.1, l - 0.25)));
    X.fillStyle = G(0.12);
    for (let a = x + 12; a < x + bw - 16; a += 30) {
      X.fillRect(a, GY - bh + 20, 16, 22);
      X.fillStyle = G(0.9, DAY ? 0.3 : 0.8);
      X.fillRect(a + 2, GY - bh + 22, 12, 18);
      X.fillStyle = G(0.12);
    }
    // vetrina del negozio
    X.fillStyle = G(0.85, DAY ? 0.5 : 0.9);
    X.fillRect(x + 10, GY - 50, bw - 20, 34);
    x += bw + 4;
  }
  // la strada arcobaleno di Skólavörðustígur: bande sul selciato
  for (let i = 0; i < 6; i++) {
    X.fillStyle = G(0.35 + i * 0.12, 0.7);
    X.fillRect(1200, GY + 4 + i * 9, 600, 8);
  }
  lampsAt([200, 800, 1400, 2100, 2700], 0.95);
}

// REYKJAVÍK · ÖSKJUHLÍÐ: la collina boscosa con Perlan in cima
function nearPerlan(w) {
  ground(w, 1);
  X.fillStyle = lgx(0, w, 0.26, 0.18);
  X.beginPath();
  X.moveTo(300, GY);
  X.quadraticCurveTo(900, GY - 170, 1500, GY);
  X.fill();
  for (let x = 340; x < 1460; x += 34) {
    const h = 60 + ((x * 7) % 40);
    const y = GY - 170 * (1 - Math.pow((x - 900) / 600, 2)) + 6;
    X.fillStyle = G(0.12 + ((x * 3) % 10) * 0.012);
    X.beginPath();
    X.moveTo(x, y - h);
    X.lineTo(x - 14, y);
    X.lineTo(x + 14, y);
    X.fill();
  }
  X.save();
  X.translate(0, -150);
  scaled(perlan, 900, 1.5);
  X.restore();
  houses(1600, w, GY, 2.2, 0.28);
  lampsAt([200, 1550, 2100, 2600], 0.95);
}

// zone per città: nome del quartiere, primo piano, etichette dei luoghi nel primo piano
export const ZONES = {
  milano: [
    { name: "DUOMO", near: (w) => near(w), labels: [["Duomo di Milano", 520, 112], ["Galleria V. Emanuele II", 1250, 224], ["Castello Sforzesco", 2260, 60]] },
    { name: "PORTA NUOVA", near: nearPortaNuova, labels: [["Torre UniCredit", 620, 40], ["Piazza Gae Aulenti", 880, 380], ["Bosco Verticale", 1280, 150], ["Torre Solaria", 2085, 170]] },
    { name: "NAVIGLI", near: nearNavigli, labels: [["Naviglio Grande", 300, 270], ["Colonne di San Lorenzo", 1600, 300], ["Basilica di San Lorenzo", 1900, 190]] },
    { name: "CITYLIFE", near: nearCityLife, labels: [["Torre Allianz", 560, 80], ["Torre Generali", 900, 140], ["Torre PwC", 1230, 190], ["Parco CityLife", 1750, 350]] }
  ],
  delhi: [
    { name: "RAJPATH", near: (w) => nearD(w), labels: [["India Gate", 520, 252], ["Rashtrapati Bhavan", 1750, 265]] },
    { name: "OLD DELHI", near: nearOldDelhi, labels: [["Forte Rosso", 620, 200], ["Chandni Chowk", 1300, 250], ["Jama Masjid", 2050, 120]] },
    { name: "CONNAUGHT PLACE", near: nearConnaught, labels: [["Connaught Place", 450, 300], ["Central Park", 1250, 100]] },
    { name: "MEHRAULI", near: nearMehrauli, labels: [["Qutub Minar", 900, 70], ["Alai Darwaza", 1350, 250]] }
  ],
  reykjavik: [
    { name: "MIÐBORG", near: (w) => nearR(w), labels: [["Hallgrímskirkja", 520, 80]] },
    { name: "HÖFNIN", near: nearHarbour, labels: [["Harpa", 620, 250], ["Sólfar", 1400, 330], ["Gamla Höfnin", 1900, 360]] },
    { name: "LAUGAVEGUR", near: nearLaugavegur, labels: [["Laugavegur", 500, 300], ["Skólavörðustígur", 1500, 400]] },
    { name: "ÖSKJUHLÍÐ", near: nearPerlan, labels: [["Perlan", 900, 120], ["Öskjuhlíð", 1300, 330]] }
  ]
};

// cielo di giorno: chiaro ma sempre nei 5 colori del brand (il retino fa il resto),
// sole netto con un alone piccolo e qualche nuvola piatta, niente foschia
function daySky(w) {
  const g = X.createLinearGradient(0, 0, 0, GY);
  [[0, 0.3], [0.35, 0.46], [0.75, 0.64], [1, 0.76]].forEach(([o, v]) => g.addColorStop(o, G(v)));
  X.fillStyle = g;
  X.fillRect(0, 0, w, VH_L);
  const sx = Math.min(640, w - 130);
  const sy = 110;
  const h = X.createRadialGradient(sx, sy, 30, sx, sy, 120);
  h.addColorStop(0, G(1, 0.45));
  h.addColorStop(1, G(1, 0));
  X.fillStyle = h;
  X.fillRect(sx - 130, sy - 130, 260, 260);
  X.fillStyle = G(1);
  X.beginPath();
  X.arc(sx, sy, 40, 0, 7);
  X.fill();
  // nuvole solo nella fascia centrale del cielo, lontano dall'interfaccia in alto e a sinistra
  for (let i = 0; i < 5; i++) {
    const cw = 70 + rnd() * 110;
    const cx = 290 + cw / 2 + rnd() * Math.max(10, w - 360 - cw);
    const cy = 165 + rnd() * 70;
    X.fillStyle = G(0.93, 0.85);
    X.beginPath();
    X.ellipse(cx, cy, cw / 2, 9 + rnd() * 5, 0, 0, 7);
    X.fill();
    X.beginPath();
    X.ellipse(cx - cw * 0.12, cy - 9, cw * 0.24, 11, 0, 0, 7);
    X.fill();
  }
}

const CITIES = {
  milano: [[0, sky], [0.12, mtn], [0.3, far], [0.55, mid], [1, near]],
  delhi: [[0, skyD], [0.3, far], [0.55, midD], [1, nearD]],
  reykjavik: [[0, skyR], [0.12, mtnR], [0.3, (w) => houses(-10, w, GY, 0.9, 0.3)], [0.55, midR], [1, nearR]]
};

// costruisce i livelli di una città per una vista di viewW x viewH pixel.
// Ogni livello ha il suo fattore di parallasse f e un canvas già convertito in palette.
// Il disegno usa le coordinate del concept (alto 540) scalate di k = viewH / 540,
// e il retino viene applicato alla risoluzione finale, così resta nitido.
export function buildSkyline(cityId, { viewW = 1280, viewH = 800, time = "night", zone = 0 } = {}) {
  DAY = time === "day";
  DAY_LIFT = DAY ? 0.06 : 0;
  const k = viewH / VH_L;
  VW = viewW / k;
  seed = 5;
  const defs = CITIES[cityId] ?? CITIES.milano;
  const layers = defs.map(([f, draw], li) => {
    // livello 0 = cielo: di giorno quello chiaro, di notte quello della città (Delhi di notte usa la luna)
    const zones = ZONES[cityId] ?? ZONES.milano;
    const last = li === defs.length - 1;
    const fn = li === 0 ? (DAY ? daySky : cityId === "delhi" ? sky : draw) : last ? zones[zone % zones.length].near : draw;
    const wl = f ? VW + (W_L - VW) * f : VW;
    const c = document.createElement("canvas");
    c.width = Math.round(wl * k);
    c.height = viewH;
    X = c.getContext("2d", { willReadFrequently: true });
    X.save();
    X.scale(k, k);
    fn(wl);
    X.restore();
    quant(c, 2);
    return { f, canvas: c };
  });
  DAY = false;
  DAY_LIFT = 0;
  return { layers, k, groundY: Math.round(GY * k), worldW: Math.round(W_L * k) };
}

// giorno/notte per i disegni fatti con paint() (es. lo sfondo del menu)
export function setDayMode(day) {
  DAY = Boolean(day);
  DAY_LIFT = DAY ? 0.06 : 0;
}

// disegna una scena qualsiasi (interni, oggetti, personaggi) con gli stessi strumenti
// del concept e la converte in palette. draw riceve gli strumenti e lavora in
// coordinate logiche (alte 540): k scala alla risoluzione finale.
export function paint(width, height, k, draw, { cell = 2, seedValue = 7 } = {}) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  X = c.getContext("2d", { willReadFrequently: true });
  seed = seedValue;
  X.save();
  X.scale(k, k);
  draw({ X, G, rnd, rect, path, fillP, lgx, facade, stone, spire, dome, tree, lamp, ground, houses, skyG, nz, GY });
  X.restore();
  quant(c, cell);
  return c;
}
