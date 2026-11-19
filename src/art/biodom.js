// manifesti BIODOM nel nuovo stile (illustrazione piatta): cartelloni su pali lungo la strada
// e quadri nelle stanze. Colori pieni, inchiostro blu notte, accento giallo, piante verdi.
import { grain } from "../world/city.js";
import { addHiRes } from "./hires.js";
import { drawBiodomLogo, LOGO_H, LOGO_W } from "./logoPath.js";

const INK = "#24344B";
const PAPER = "#F4F5F7";
const YEL = "#E2B33C";
const GREEN = ["#5F8F62", "#76A574", "#4E7C55"];

function agave(X, cx, base, h, n = 9) {
  for (let i = 0; i < n; i++) {
    const lean = (i - (n - 1) / 2) * (h / 9);
    const hh = h * (0.65 + ((i * 37) % 10) / 28);
    X.fillStyle = GREEN[i % 3];
    X.beginPath();
    X.moveTo(cx - 5 + i * 1.2 - n * 0.6, base);
    X.quadraticCurveTo(cx + lean * 0.3, base - hh * 0.6, cx + lean, base - hh);
    X.quadraticCurveTo(cx + lean * 0.3 + 6, base - hh * 0.6, cx + 5 + i * 1.2 - n * 0.6, base);
    X.fill();
  }
}

// ---- i manifesti VERI di biodom+, ridisegnati in vettoriale piatto
const SANS = '"Helvetica Neue", "Inter", Arial, sans-serif';
const DARK = "#1B2528";
const TEAL = ["#2F5A60", "#3E6E75", "#5A8E92", "#7FAAAA"];

// logotipo biodom+ (minuscolo tondo con il + in apice)
export function logoAt(X, x, y, hgt, col = "#E9ECEB", align = "left") {
  // y = linea di base del testo; il logo ufficiale è alto circa 1.25 volte l'altezza delle lettere
  const h = hgt * 1.25;
  const w = (LOGO_W * h) / LOGO_H;
  drawBiodomLogo(X, align === "center" ? x - w / 2 : x, y - h * 0.86, h, col);
}

// testo su più righe, alto "size", interlinea 1.05
function lines(X, list, x, y, size, { weight = 300, col, align = "left", track = 0 } = {}) {
  X.fillStyle = col;
  X.textAlign = align;
  list.forEach((l, i) => {
    X.font = `${weight} ${size}px ${SANS}`;
    if ("letterSpacing" in X) X.letterSpacing = `${track}px`;
    X.fillText(l, x, y + i * size * 1.05);
  });
  X.textAlign = "left";
  if ("letterSpacing" in X) X.letterSpacing = "0px";
}

// riga di testo piccolo "da colonna" (finte righe di testo)
function smallText(X, x, y, w, n, col) {
  X.fillStyle = col;
  for (let i = 0; i < n; i++) X.fillRect(x, y + i * 4, w * (i === n - 1 ? 0.55 : 0.85 + ((i * 7) % 3) * 0.05), 1.4);
}

// foglia di loto / ninfea: disco con l'intaglio e le nervature
function lotus(X, cx, cy, r, rot, col, vein) {
  X.save();
  X.translate(cx, cy);
  X.rotate(rot);
  X.scale(1, 0.62);
  X.fillStyle = col;
  X.beginPath();
  X.moveTo(0, 0);
  X.arc(0, 0, r, 0.18, Math.PI * 2 - 0.18);
  X.closePath();
  X.fill();
  X.strokeStyle = vein;
  X.lineWidth = Math.max(0.6, r * 0.03);
  for (let i = 1; i < 9; i++) {
    const a = 0.18 + (i / 9) * (Math.PI * 2 - 0.36);
    X.beginPath();
    X.moveTo(0, 0);
    X.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    X.stroke();
  }
  X.restore();
}

// "b+" fatto di muschio: tanti cerchi verde-acqua dentro la sagoma della b e del +
function mossLetter(X, x, y, s) {
  const shape = new Path2D();
  // asta della b
  shape.rect(x, y, s * 0.2, s);
  // pancia della b (anello)
  shape.moveTo(x + s * 0.74, y + s * 0.72);
  shape.arc(x + s * 0.42, y + s * 0.72, s * 0.32, 0, Math.PI * 2);
  shape.moveTo(x + s * 0.56, y + s * 0.72);
  shape.arc(x + s * 0.42, y + s * 0.72, s * 0.14, Math.PI * 2, 0, true);
  // il +
  shape.rect(x + s * 0.72, y + s * 0.02, s * 0.5, s * 0.16);
  shape.rect(x + s * 0.89, y - s * 0.15, s * 0.16, s * 0.5);
  X.save();
  X.clip(shape, "nonzero");
  X.fillStyle = TEAL[0];
  X.fillRect(x - 2, y - s * 0.2, s * 1.4, s * 1.3);
  let n = 0;
  for (let yy = y - s * 0.2; yy < y + s * 1.1; yy += s * 0.055)
    for (let xx = x - 2; xx < x + s * 1.3; xx += s * 0.055) {
      n++;
      const rr = s * (0.028 + ((n * 37) % 10) * 0.0025);
      X.fillStyle = TEAL[1 + (n * 13) % 3];
      X.beginPath();
      X.arc(xx + ((n * 17) % 5) * s * 0.006, yy + ((n * 29) % 5) * s * 0.006, rr, 0, 7);
      X.fill();
    }
  X.restore();
}

// fumo: onde morbide (poster "HAVE YOU CHECKED YOUR PLANTS TODAY?")
function smoke(X, w, h) {
  for (let i = 0; i < 9; i++) {
    X.strokeStyle = `rgba(150,175,178,${0.08 + (i % 3) * 0.04})`;
    X.lineWidth = h * (0.03 + (i % 4) * 0.012);
    X.beginPath();
    const y0 = h * (0.1 + i * 0.1);
    X.moveTo(-10, y0);
    X.bezierCurveTo(w * 0.3, y0 - h * 0.15, w * 0.5, y0 + h * 0.18, w + 10, y0 - h * 0.05 * (i % 3));
    X.stroke();
  }
}

// contenuto del manifesto in un riquadro w x h (v = 0..3)
export function posterBody(X, w, h, v) {
  const wide = w > h * 1.1;
  const m = Math.min(w, h);
  X.save();
  X.beginPath();
  X.rect(0, 0, w, h);
  X.clip();
  if (v === 0) {
    // HAVE YOU CHECKED YOUR PLANTS TODAY?
    X.fillStyle = DARK;
    X.fillRect(0, 0, w, h);
    smoke(X, w, h);
    logoAt(X, w / 2, m * 0.12, m * 0.07, "#DDE3E2", "center");
    const words = ["HAVE YOU", "CHECKED", "YOUR", "PLANTS", "TODAY?"];
    const size = wide ? h * 0.13 : w * 0.15;
    lines(X, words, w / 2, h * 0.3, size, { col: "#E3E7E6", align: "center", track: size * 0.04 });
    lines(X, ["EACH BREATH", "IS A CHOICE"], m * 0.07, h - m * 0.1, m * 0.035, { col: "#C9D1D0" });
  } else if (v === 1) {
    // EACH BREATH IS A CHOICE + b+ di muschio su carta chiara
    X.fillStyle = "#E7E6E1";
    X.fillRect(0, 0, w, h);
    X.fillStyle = "rgba(0,0,0,0.05)";
    X.beginPath();
    X.moveTo(w, 0);
    X.lineTo(w, h * 0.5);
    X.lineTo(w * 0.55, 0);
    X.fill();
    const size = m * 0.075;
    X.fillStyle = "#222A2C";
    X.font = `600 ${size}px ${SANS}`;
    X.fillText("EACH", m * 0.08, m * 0.14);
    const ew = X.measureText("EACH ").width;
    X.font = `300 ${size}px ${SANS}`;
    X.fillText("BREATH", m * 0.08 + ew, m * 0.14);
    X.font = `600 ${size}px ${SANS}`;
    X.fillText("IS A", m * 0.08, m * 0.14 + size * 1.05);
    const iw = X.measureText("IS A ").width;
    X.font = `300 ${size}px ${SANS}`;
    X.fillText("CHOICE", m * 0.08 + iw, m * 0.14 + size * 1.05);
    const s = wide ? h * 0.48 : w * 0.5;
    mossLetter(X, wide ? w * 0.52 : w * 0.24, wide ? h * 0.26 : h * 0.34, s);
    logoAt(X, m * 0.08, h - m * 0.07, m * 0.05, "#222A2C");
    smallText(X, w * 0.42, h - m * 0.16, w * 0.22, 6, "rgba(34,42,44,0.55)");
    smallText(X, w * 0.7, h - m * 0.16, w * 0.22, 6, "rgba(34,42,44,0.55)");
  } else if (v === 2) {
    // EACH BREATH IS A CHOICE gigante dietro le foglie di loto
    X.fillStyle = "#262C2F";
    X.fillRect(0, 0, w, h);
    const size = (wide ? h : w) * 0.22;
    lines(X, wide ? ["EACH BREATH", "IS A CHOICE"] : ["EACH", "BREATH", "IS A", "CHOICE"], m * 0.03, size * 0.95, size, { col: "rgba(226,230,229,0.82)" });
    X.strokeStyle = "#5C6E78";
    X.lineWidth = m * 0.012;
    X.beginPath();
    X.moveTo(w * 0.55, h);
    X.quadraticCurveTo(w * 0.5, h * 0.6, w * 0.6, h * 0.35);
    X.moveTo(w * 0.58, h);
    X.quadraticCurveTo(w * 0.66, h * 0.7, w * 0.4, h * 0.62);
    X.stroke();
    lotus(X, w * 0.6, h * 0.33, m * 0.34, -0.4, "#4F6370", "#6F8794");
    lotus(X, w * 0.4, h * 0.62, m * 0.26, 0.5, "#435662", "#647C88");
    lotus(X, w * 0.7, h * 0.72, m * 0.2, -0.9, "#5A6F7C", "#7890A0");
    logoAt(X, w / 2, h - m * 0.06, m * 0.05, "#DDE3E2", "center");
  } else {
    // logotipo biodom+ grande sulle foglie scure
    X.fillStyle = "#1F2A2B";
    X.fillRect(0, 0, w, h);
    lotus(X, w * 0.52, h * 0.3, m * 0.3, -0.3, "#3B4B55", "#566A76");
    lotus(X, w * 0.45, h * 0.72, m * 0.24, 0.6, "#344550", "#4F6470");
    X.strokeStyle = "#465A66";
    X.lineWidth = m * 0.01;
    X.beginPath();
    X.moveTo(w * 0.5, h);
    X.quadraticCurveTo(w * 0.48, h * 0.6, w * 0.52, h * 0.3);
    X.stroke();
    logoAt(X, w / 2, h * 0.58, (wide ? h : w) * 0.2, "#E6EAE9", "center");
  }
  X.restore();
}

// cartellone su pali (v = variante 0..3); ritorna la chiave della texture
export function biodomPoster(scene, v = 0) {
  const key = `biodom_poster_${v}`;
  if (scene.textures.exists(key)) return key;
  const tall = v % 2 === 1;
  const w = tall ? 130 : 250;
  const h = tall ? 180 : 150;
  const legs = tall ? 110 : 130;
  const S = 2;
  const c = document.createElement("canvas");
  c.width = (w + 20) * S;
  c.height = (h + 20 + legs) * S;
  const X = c.getContext("2d", { willReadFrequently: true });
  X.scale(S, S);
  const cw = w + 20;
  X.fillStyle = "#3A4B63";
  if (tall) X.fillRect(cw / 2 - 4, h + 10, 8, legs + 10);
  else {
    X.fillRect(30, h + 10, 7, legs + 10);
    X.fillRect(cw - 37, h + 10, 7, legs + 10);
  }
  X.fillStyle = "#3A4B63";
  X.fillRect(0, 0, w + 20, h + 20);
  X.save();
  X.translate(10, 10);
  posterBody(X, w, h, v);
  X.restore();
  grain(c, 4, 9 + v);
  addHiRes(scene, key, c, S);
  return key;
}

// quadro da appendere in casa / in ufficio (senza pali)
export function biodomFrame(scene, v = 0, w = 120, h = 160) {
  const key = `biodom_frame_${v}_${w}_${h}`;
  if (scene.textures.exists(key)) return key;
  const S = 2;
  const c = document.createElement("canvas");
  c.width = (w + 12) * S;
  c.height = (h + 12) * S;
  const X = c.getContext("2d", { willReadFrequently: true });
  X.scale(S, S);
  X.fillStyle = "#2B3A50";
  X.fillRect(0, 0, w + 12, h + 12);
  X.save();
  X.translate(6, 6);
  posterBody(X, w, h, v);
  X.restore();
  grain(c, 4, 3 + v);
  addHiRes(scene, key, c, S);
  return key;
}
