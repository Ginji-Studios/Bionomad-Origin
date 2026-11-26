// "Pellicola" del riferimento applicata a qualunque disegno (personaggi, zaino, oggetti,
// illustrazioni del tutorial, crediti, interfacce disegnate): i colori vengono smorzati e
// spinti verso la palette grigio-salvia / blu petrolio / ardesia, poi si aggiunge la grana
// monocroma. Solo colori della palette del brand: i gialli tornano sulla rampa, gli incarnati
// restano riconoscibili (smorzati di meno), il verde della pianta diventa salvia.

// rampa per luminosità: antracite → blu petrolio → ardesia → grigio-salvia → bianco caldo
const RAMP = [
  [0, [38, 43, 44]],
  [0.22, [46, 67, 80]],
  [0.42, [78, 104, 120]],
  [0.62, [125, 144, 159]],
  [0.8, [179, 188, 183]],
  [1, [228, 232, 227]]
];
function ramp(v) {
  for (let i = 1; i < RAMP.length; i++)
    if (v <= RAMP[i][0]) {
      const [t0, a] = RAMP[i - 1];
      const [t1, b] = RAMP[i];
      const u = (v - t0) / (t1 - t0);
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    }
  return RAMP[RAMP.length - 1][1];
}

export function filmLook(c, { grain = 10, seed = 9, keep, mix, protect = [], keepHue = null } = {}) {
  if (!c || c._film || !c.getContext) return c;
  const w = c.width;
  const h = c.height;
  if (!w || !h) return c;
  const x = c.getContext("2d", { willReadFrequently: true });
  let img;
  try {
    img = x.getImageData(0, 0, w, h);
  } catch {
    return c;
  }
  const d = img.data;
  let s = seed * 7919 + 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const L = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const sat = mx ? (mx - mn) / mx : 0;
    // tinta approssimata (0-360)
    let hue = 0;
    if (mx !== mn) {
      if (mx === r) hue = (60 * ((g - b) / (mx - mn)) + 360) % 360;
      else if (mx === g) hue = 60 * ((b - r) / (mx - mn)) + 120;
      else hue = 60 * ((r - g) / (mx - mn)) + 240;
    }
    // colori protetti (tratti distintivi delle persone del team): restano veri, solo la grana
    s = (s * 16807) % 2147483647;
    const n0 = (s / 2147483647 - 0.5) * grain;
    const hues = keepHue ? (Array.isArray(keepHue[0]) ? keepHue : [keepHue]) : [];
    if ((sat > 0.2 && hues.some(([lo, hi]) => hue >= lo && hue <= hi)) || protect.some(([pr, pg, pb, tol = 26]) => Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb) < tol)) {
      d[i] = r + n0;
      d[i + 1] = g + n0;
      d[i + 2] = b + n0;
      continue;
    }
    // quanto colore tenere e quanto spingere verso la rampa della palette
    let k = 0.3;
    let t = 0.5;
    if (sat > 0.2 && hue >= 30 && hue <= 62) {
      k = 0; // niente gialli: tutto quello che è giallo torna sulla rampa della palette
      t = 0.85;
    } else if (hue >= 8 && hue < 30 && sat > 0.12) {
      k = 0.72; // incarnati, capelli castani, cammello
      t = 0.18;
    } else if (hue > 70 && hue < 170 && sat > 0.2) {
      k = 0.5; // verde della pianta → salvia
      t = 0.3;
    } else if ((hue < 8 || hue > 330) && sat > 0.4) {
      k = 0.15; // rossi: solo un'ombra di colore
      t = 0.6;
    }
    if (keep != null) k = keep;
    if (mix != null) t = mix;
    const grey = L * 255;
    const pr = ramp(L);
    s = (s * 16807) % 2147483647;
    const n = (s / 2147483647 - 0.5) * grain;
    d[i] = (grey + (r - grey) * k) * (1 - t) + pr[0] * t + n;
    d[i + 1] = (grey + (g - grey) * k) * (1 - t) + pr[1] * t + n;
    d[i + 2] = (grey + (b - grey) * k) * (1 - t) + pr[2] * t + n;
  }
  x.putImageData(img, 0, 0);
  c._film = true;
  return c;
}
