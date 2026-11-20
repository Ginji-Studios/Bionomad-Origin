// illustrazioni vettoriali dei crediti: i prodotti del BIONOMAD SYSTEM e i ritratti del team,
// nello stesso stile piatto del gioco (cielo blu-grigio chiaro, forme pulite, niente pixel)
import { addHiRes } from "./hires.js";
import { TEAM_LOOK } from "./people.js";
import { hub } from "./places.js";

const S = 2;
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w * S;
  c.height = h * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  X.lineCap = "round";
  X.lineJoin = "round";
  return [c, X];
}

// fondo comune: cielo chiaro con un accenno di città e il pavimento
function backdrop(X, w, h, floor = true) {
  const g = X.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#C3CDDA");
  g.addColorStop(1, "#E6E9EE");
  X.fillStyle = g;
  X.fillRect(0, 0, w, h);
  X.fillStyle = "rgba(122,142,169,0.35)";
  [[0.04, 0.42, 0.14], [0.2, 0.3, 0.1], [0.33, 0.5, 0.16], [0.6, 0.36, 0.12], [0.76, 0.46, 0.18]].forEach(([x, top, bw]) => X.fillRect(x * w, top * h, bw * w, h));
  if (floor) {
    X.fillStyle = "#D5DAE2";
    X.fillRect(0, h * 0.84, w, h * 0.16);
    X.fillStyle = "rgba(36,52,75,0.14)";
    X.beginPath();
    X.ellipse(w / 2, h * 0.86, w * 0.3, 14, 0, 0, 7);
    X.fill();
  }
}

function agave(X, cx, base, h, n, spread, cols = ["#5F8F62", "#76A574", "#4E7C55"]) {
  for (let i = 0; i < n; i++) {
    const lean = (i - (n - 1) / 2) * spread;
    const hh = h * (0.65 + ((i * 37) % 10) / 28);
    X.fillStyle = cols[i % cols.length];
    X.beginPath();
    X.moveTo(cx - 6 + i * 1.4 - n * 0.7, base);
    X.quadraticCurveTo(cx + lean * 0.3, base - hh * 0.6, cx + lean, base - hh);
    X.quadraticCurveTo(cx + lean * 0.3 + 7, base - hh * 0.6, cx + 6 + i * 1.4 - n * 0.7, base);
    X.fill();
  }
}

// ---------------------------------------------------------------- prodotti
export function productArt(scene, kind, w, h) {
  const key = `cr_prod_${kind}_${w}_${h}`;
  if (scene.textures.exists(key)) return key;
  const [c, X] = canvas(w, h);
  backdrop(X, w, h);
  const cx = w / 2;
  const base = h * 0.86;
  if (kind === "backpack") {
    // zaino BIONOMAD: guscio bianco, cupola di vetro con le agavi, spallacci, tubo e maschera
    const pw = 150;
    const ph = 230;
    const top = base - ph;
    X.fillStyle = "#2F3D52";
    [-1, 1].forEach((d) => {
      X.beginPath();
      X.moveTo(cx + d * 60, top + 50);
      X.quadraticCurveTo(cx + d * 100, top + 140, cx + d * 86, base);
      X.lineTo(cx + d * 70, base);
      X.quadraticCurveTo(cx + d * 82, top + 140, cx + d * 48, top + 50);
      X.fill();
    });
    X.fillStyle = "#ECEAE4";
    X.beginPath();
    X.moveTo(cx - pw / 2, top + 70);
    X.quadraticCurveTo(cx - pw / 2, top, cx, top);
    X.quadraticCurveTo(cx + pw / 2, top, cx + pw / 2, top + 70);
    X.lineTo(cx + pw / 2, base - 10);
    X.quadraticCurveTo(cx + pw / 2, base, cx + pw / 2 - 10, base);
    X.lineTo(cx - pw / 2 + 10, base);
    X.quadraticCurveTo(cx - pw / 2, base, cx - pw / 2, base - 10);
    X.closePath();
    X.fill();
    X.fillStyle = "#D8D5CD";
    X.fillRect(cx + pw / 2 - 18, top + 40, 18, ph - 50);
    // vetro
    X.fillStyle = "#C6D6EA";
    X.beginPath();
    X.moveTo(cx - 52, top + 150);
    X.lineTo(cx - 52, top + 60);
    X.quadraticCurveTo(cx - 52, top + 18, cx, top + 18);
    X.quadraticCurveTo(cx + 52, top + 18, cx + 52, top + 60);
    X.lineTo(cx + 52, top + 150);
    X.closePath();
    X.fill();
    X.save();
    X.clip();
    agave(X, cx, top + 150, 110, 11, 8);
    X.fillStyle = "#8C7A68";
    X.fillRect(cx - 52, top + 140, 104, 12);
    X.restore();
    X.fillStyle = "rgba(255,255,255,0.5)";
    X.fillRect(cx - 42, top + 50, 5, 70);
    // display e tasti
    X.fillStyle = "#24344B";
    X.beginPath();
    X.roundRect(cx - 52, top + 166, 62, 30, 6);
    X.fill();
    X.fillStyle = "#8FD0A6";
    X.fillRect(cx - 44, top + 186, 30, 3);
    [["#E2B33C", 26], ["#3F8FE0", 46]].forEach(([col, dx]) => {
      X.fillStyle = "#F7F6F2";
      X.beginPath();
      X.arc(cx + dx, top + 181, 9, 0, 7);
      X.fill();
      X.fillStyle = col;
      X.beginPath();
      X.arc(cx + dx, top + 181, 4, 0, 7);
      X.fill();
    });
    // tubo verso la maschera
    X.strokeStyle = "#AEB6C2";
    X.lineWidth = 7;
    X.beginPath();
    X.moveTo(cx, top);
    X.bezierCurveTo(cx + 10, top - 50, cx + 120, top - 40, cx + 120, top + 30);
    X.stroke();
    X.fillStyle = "#D6DAE0";
    X.beginPath();
    X.ellipse(cx + 120, top + 50, 24, 28, 0, 0, 7);
    X.fill();
    X.fillStyle = "#8D99AA";
    X.beginPath();
    X.arc(cx + 120, top + 54, 9, 0, 7);
    X.fill();
  } else if (kind === "active") {
    // ACTIVE PACK: modulo sganciabile con le micro-alghe che fanno bolle
    const mw = 170;
    const mh = 130;
    const y0 = base - mh - 30;
    X.fillStyle = "#ECEAE4";
    X.beginPath();
    X.roundRect(cx - mw / 2, y0, mw, mh, 26);
    X.fill();
    X.fillStyle = "#D8D5CD";
    X.beginPath();
    X.roundRect(cx + mw / 2 - 24, y0 + 10, 18, mh - 20, 8);
    X.fill();
    X.fillStyle = "#7FB07E";
    X.beginPath();
    X.roundRect(cx - mw / 2 + 18, y0 + 18, mw - 56, mh - 36, 14);
    X.fill();
    X.fillStyle = "#5E9563";
    X.fillRect(cx - mw / 2 + 18, y0 + mh - 50, mw - 56, 32);
    X.fillStyle = "rgba(255,255,255,0.75)";
    [[20, 30, 5], [44, 50, 3.5], [70, 26, 4], [90, 60, 6], [36, 72, 3], [64, 80, 4.5], [100, 36, 3]].forEach(([dx, dy, r]) => {
      X.beginPath();
      X.arc(cx - mw / 2 + 18 + dx, y0 + 18 + dy, r, 0, 7);
      X.fill();
    });
    // aggancio rapido
    X.fillStyle = "#2F3D52";
    X.beginPath();
    X.roundRect(cx - 30, y0 + mh - 4, 60, 22, 6);
    X.fill();
    X.fillStyle = "#E2B33C";
    X.fillRect(cx - 18, y0 + mh + 4, 36, 5);
  } else if (kind === "hub") {
    // HOME HUB: la stessa teca con il bonsai che si vede nel gioco, più grande
    hub({ X }, cx, base, Math.min(1.25, (h * 0.78) / 218));
  }
  addHiRes(scene, key, c, S);
  return key;
}

// ---------------------------------------------------------------- ritratti del team
const HAIR = (t) => (t > 0.8 ? "#D9CBA6" : t > 0.5 ? "#7A5A44" : t > 0.33 ? "#5B4334" : t > 0.2 ? "#4A372C" : "#24252B");
const TOP = (t) => ["#2F3D52", "#46566E", "#6E7B8E", "#9AA3AF", "#C3C6CA", "#DEDAD1"][Math.min(5, Math.floor((1 - t) * 6))];

export function teamBust(scene, i, w = 176, h = 186) {
  const key = `cr_team_${i}_${w}_${h}`;
  if (scene.textures.exists(key)) return key;
  const o = TEAM_LOOK[i];
  const [c, X] = canvas(w, h);
  backdrop(X, w, h, false);
  const cx = w / 2;
  const hy = h * 0.42; // centro della testa
  // Francesca (shatush): castano un po' più chiaro
  const hair = o.balayage ? "#9A7559" : HAIR(o.hairTone ?? 0.3);
  const skin = "#EBD3BF";
  const skinD = "#D9BBA3";
  const top = o.sweaterColor ?? TOP(o.top ?? 0.4);
  // capelli dietro (lunghi)
  if (o.hair === "long") {
    X.fillStyle = hair;
    X.beginPath();
    X.moveTo(cx - 40, hy - 10);
    X.quadraticCurveTo(cx - 46, hy + 60, cx - 36, hy + 78);
    X.lineTo(cx + 36, hy + 78);
    X.quadraticCurveTo(cx + 46, hy + 60, cx + 40, hy - 10);
    X.closePath();
    X.fill();
    if (o.balayage) {
      const g = X.createLinearGradient(0, hy + 30, 0, hy + 78);
      g.addColorStop(0, "rgba(217,79,154,0)");
      g.addColorStop(1, "#D94F9A");
      X.fillStyle = g;
      X.fill();
    }
  }
  // busto
  X.fillStyle = top;
  X.beginPath();
  X.moveTo(cx - 70, h);
  X.quadraticCurveTo(cx - 66, hy + 62, cx - 20, hy + 56);
  X.lineTo(cx + 20, hy + 56);
  X.quadraticCurveTo(cx + 66, hy + 62, cx + 70, h);
  X.closePath();
  X.fill();
  if (o.stripes) {
    X.save();
    X.clip();
    X.fillStyle = "#F4F5F7";
    for (let y = hy + 66; y < h; y += 14) X.fillRect(0, y, w, 6);
    X.restore();
  }
  if (o.overalls) {
    X.fillStyle = "#4C6787";
    X.fillRect(cx - 28, hy + 74, 56, h);
    X.fillRect(cx - 34, hy + 56, 10, 30);
    X.fillRect(cx + 24, hy + 56, 10, 30);
  }
  if (o.vest) {
    X.fillStyle = "#2F3D52";
    X.fillRect(cx - 62, hy + 70, 30, h);
    X.fillRect(cx + 32, hy + 70, 30, h);
  }
  // collo e sciarpa gialla (il segno del gioco)
  X.fillStyle = skinD;
  X.fillRect(cx - 9, hy + 30, 18, 28);
  X.fillStyle = "#E2B33C";
  X.beginPath();
  X.ellipse(cx, hy + 58, 30, 9, 0, 0, 7);
  X.fill();
  // testa
  X.fillStyle = skin;
  X.beginPath();
  X.ellipse(cx, hy, 30, 36, 0, 0, 7);
  X.fill();
  X.fillStyle = skinD;
  X.beginPath();
  X.ellipse(cx - 30, hy + 4, 6, 9, 0, 0, 7);
  X.ellipse(cx + 30, hy + 4, 6, 9, 0, 0, 7);
  X.fill();
  if (o.earrings) {
    X.fillStyle = "#E2B33C";
    X.beginPath();
    X.arc(cx - 31, hy + 15, 3, 0, 7);
    X.arc(cx + 31, hy + 15, 3, 0, 7);
    X.fill();
  }
  if (o.beard) {
    X.fillStyle = hair;
    X.beginPath();
    X.moveTo(cx - 28, hy + 4);
    X.quadraticCurveTo(cx - 26, hy + 40, cx, hy + 40);
    X.quadraticCurveTo(cx + 26, hy + 40, cx + 28, hy + 4);
    X.quadraticCurveTo(cx, hy + 22, cx - 28, hy + 4);
    X.fill();
  }
  // capelli sopra
  X.fillStyle = hair;
  X.beginPath();
  X.moveTo(cx - 32, hy + 2);
  X.quadraticCurveTo(cx - 36, hy - 42, cx, hy - 40);
  X.quadraticCurveTo(cx + 36, hy - 42, cx + 32, hy + 2);
  X.quadraticCurveTo(cx + 18, hy - 22, cx - 4, hy - 20);
  X.quadraticCurveTo(cx - 22, hy - 18, cx - 32, hy + 2);
  X.fill();
  if (o.hair === "manbun") {
    X.beginPath();
    X.arc(cx, hy - 44, 12, 0, 7);
    X.fill();
  }
  if (o.frontLocks || o.earLocks) {
    X.beginPath();
    X.moveTo(cx - 30, hy - 6);
    X.quadraticCurveTo(cx - 36, hy + 20, cx - 28, hy + 34);
    X.lineTo(cx - 24, hy + 4);
    X.fill();
    X.beginPath();
    X.moveTo(cx + 30, hy - 6);
    X.quadraticCurveTo(cx + 36, hy + 20, cx + 28, hy + 34);
    X.lineTo(cx + 24, hy + 4);
    X.fill();
  }
  if (o.hat === "cap") {
    X.fillStyle = "#2F3D52";
    X.beginPath();
    X.moveTo(cx - 34, hy - 12);
    X.quadraticCurveTo(cx - 34, hy - 48, cx, hy - 48);
    X.quadraticCurveTo(cx + 34, hy - 48, cx + 34, hy - 12);
    X.closePath();
    X.fill();
    X.fillRect(cx - 40, hy - 16, 80, 7);
    if (o.tuft) {
      X.fillStyle = "#B4553F";
      X.beginPath();
      X.moveTo(cx - 30, hy - 10);
      X.quadraticCurveTo(cx - 14, hy - 14, cx - 4, hy - 6);
      X.quadraticCurveTo(cx - 18, hy - 4, cx - 24, hy + 4);
      X.fill();
    }
  }
  // viso: occhi, sopracciglia, naso, bocca
  X.fillStyle = "#24344B";
  X.beginPath();
  X.ellipse(cx - 11, hy + 2, 3, 3.6, 0, 0, 7);
  X.ellipse(cx + 11, hy + 2, 3, 3.6, 0, 0, 7);
  X.fill();
  X.strokeStyle = o.hairTone > 0.8 ? "#9A8A6A" : hair;
  X.lineWidth = 2.5;
  X.beginPath();
  X.moveTo(cx - 17, hy - 8);
  X.lineTo(cx - 6, hy - 9);
  X.moveTo(cx + 6, hy - 9);
  X.lineTo(cx + 17, hy - 8);
  X.stroke();
  X.strokeStyle = skinD;
  X.lineWidth = 2;
  X.beginPath();
  X.moveTo(cx, hy + 4);
  X.quadraticCurveTo(cx + 4, hy + 12, cx - 1, hy + 13);
  X.stroke();
  if (o.beard) {
    // bocca che si vede tra i baffi e la barba
    X.fillStyle = "#C98A76";
    X.beginPath();
    X.moveTo(cx - 8, hy + 20);
    X.quadraticCurveTo(cx, hy + 18, cx + 8, hy + 20);
    X.quadraticCurveTo(cx, hy + 27, cx - 8, hy + 20);
    X.fill();
  } else {
    X.strokeStyle = "#B97E6A";
    X.lineWidth = 2.5;
    X.beginPath();
    X.moveTo(cx - 7, hy + 21);
    X.quadraticCurveTo(cx, hy + 25, cx + 7, hy + 21);
    X.stroke();
  }
  if (o.glasses) {
    X.strokeStyle = "#24344B";
    X.lineWidth = 2.5;
    X.beginPath();
    X.arc(cx - 11, hy + 2, 9, 0, 7);
    X.moveTo(cx + 20, hy + 2);
    X.arc(cx + 11, hy + 2, 9, 0, 7);
    X.moveTo(cx - 2, hy + 1);
    X.lineTo(cx + 2, hy + 1);
    X.stroke();
  }
  addHiRes(scene, key, c, S);
  return key;
}
