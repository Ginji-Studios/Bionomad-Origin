// personaggi retinati nello stile delle skyline: sagome scure con la luce della luna
// sul bordo, ombre a retino, nessun contorno bianco. Abiti diversi per città
// (Milano trench, New Delhi kurta e dupatta, Reykjavík piumino e berretto),
// passanti tutti diversi e il team visto di fronte nei crediti.
import { paint, PALETTE } from "../world/skyline.js";
import { addHiRes } from "./hires.js";

export const K = 800 / 540;
const RGB = PALETTE.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const BW = 120;
const BH = 200;

// generatore ripetibile per le varianti
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------------------------------------------------------------- vista di lato


// zaino-serra compatto con la pianta luminosa; (px, py) = angolo in alto a sinistra
function drawPack(X, G, px, py, a = 0, walking = false, accent = false) {
  // capsula di vetro del BIONOMAD: base metallica con la terra, cupola trasparente con la
  // piantina e la lampada di crescita sul tappo. Nel passaggio "accent" il vetro e le foglie
  // si disegnano con colori-marcatore, poi diventano lilla e verde sopra il retino.
  const pw = 20;
  const ph = 44;
  const GLASS = accent ? "#ff0000" : G(0.6);
  const LEAF = accent ? "#00ff00" : G(0.9);
  const N = (v) => (accent ? "#000000" : G(v));
  // tappo con la lampada
  X.fillStyle = N(0.5);
  X.beginPath();
  X.moveTo(px + 3, py + 6);
  X.lineTo(px + 5, py);
  X.lineTo(px + pw - 5, py);
  X.lineTo(px + pw - 3, py + 6);
  X.fill();
  X.fillStyle = N(0.95);
  X.fillRect(px + 6, py + 5, pw - 12, 2);
  // cupola di vetro
  X.fillStyle = GLASS;
  X.beginPath();
  X.moveTo(px + 1, py + 34);
  X.lineTo(px + 1, py + 14);
  X.quadraticCurveTo(px + 1, py + 7, px + pw / 2, py + 7);
  X.quadraticCurveTo(px + pw - 1, py + 7, px + pw - 1, py + 14);
  X.lineTo(px + pw - 1, py + 34);
  X.fill();
  // cono di luce della lampada dentro al vetro
  if (!accent) {
    X.fillStyle = G(0.85, 0.5);
    X.beginPath();
    X.moveTo(px + 7, py + 8);
    X.lineTo(px + pw - 7, py + 8);
    X.lineTo(px + pw - 3, py + 22);
    X.lineTo(px + 3, py + 22);
    X.fill();
  }
  // piantina: stelo e due foglie che ondeggiano col passo
  const sway = walking ? Math.sin(a) * 1.2 : 0;
  X.strokeStyle = N(0.3);
  X.lineWidth = 1.4;
  X.beginPath();
  X.moveTo(px + pw / 2, py + 31);
  X.quadraticCurveTo(px + pw / 2 + sway, py + 26, px + pw / 2 + sway, py + 21);
  X.stroke();
  X.fillStyle = LEAF;
  [[-1, -0.5], [1, 0.5]].forEach(([d, r]) => {
    X.beginPath();
    X.ellipse(px + pw / 2 + sway + d * 4, py + 22 + (d > 0 ? 2 : 0), 4.5, 2.2, r, 0, 7);
    X.fill();
  });
  // terra e base metallica con la fascia
  X.fillStyle = N(0.12);
  X.fillRect(px + 2, py + 30, pw - 4, 4);
  X.fillStyle = N(0.4);
  X.beginPath();
  X.moveTo(px, py + 34);
  X.lineTo(px + pw, py + 34);
  X.lineTo(px + pw - 1, py + ph - 2);
  X.quadraticCurveTo(px + pw / 2, py + ph + 1, px + 1, py + ph - 2);
  X.fill();
  X.fillStyle = N(0.62);
  X.fillRect(px, py + 34, pw, 2);
  X.fillStyle = N(0.25);
  X.fillRect(px + 3, py + 39, pw - 6, 1);
  // riflesso sul vetro
  X.fillStyle = N(1);
  X.fillRect(px + 3, py + 12, 2, 14);
  X.fillRect(px + 6, py + 10, 3, 1);
}

function side(T, ph, o) {
  const { X, G } = T;
  X.lineCap = "round";
  X.lineJoin = "round";
  const style = o.style ?? "milano";
  const top = o.top ?? 0.32; // tono dell'abito
  const legsT = o.legs ?? 0.16;
  const hairT = o.hairTone ?? 0.12;
  const skin = o.skin ?? 0.62;
  const a = ph * Math.PI * 2;
  const walking = o.walking;
  const bob = walking ? Math.abs(Math.cos(a)) * 2 : 0;
  const shade = (x0, x1, l, r) => {
    const g = X.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, G(l));
    g.addColorStop(1, G(r));
    return g;
  };
  const poly = (pts, fill) => {
    X.beginPath();
    pts.forEach(([x, y], i) => (i ? X.lineTo(x, y) : X.moveTo(x, y)));
    X.closePath();
    X.fillStyle = fill;
    X.fill();
  };
  let hip = [60, 118 - bob];
  const sh = [62, 70 - bob];
  const long = style === "delhi" ? 34 : style === "milano" ? 24 : 0; // quanto scende l'abito sotto l'anca

  // gamba: la parte che avanza è quella sollevata (niente passo all'indietro)
  const crouch = o.crouch ?? 0;
  const sit = o.sit ?? 0;
  const hip0 = [...hip];
  const leg = (s, k) => {
    hip = [...hip0];
    let th = walking ? Math.sin(a + s) * 0.48 : s ? -0.05 : 0.07;
    const lift = walking ? Math.max(0, Math.cos(a + s)) * 0.75 : 0;
    let kx = hip[0] + Math.sin(th) * 37;
    let ky = hip[1] + Math.cos(th) * 37;
    let t2 = th - lift;
    let fx = kx + Math.sin(t2) * 36;
    let fy = ky + Math.cos(t2) * 36;
    if (crouch) {
      // piegato sulle ginocchia: l'anca scende, i piedi restano a terra, il ginocchio va avanti
      const hpx = hip[0] + 4 * crouch;
      const hpy = hip[1] + 40 * crouch;
      fx = 60 + (s ? -8 : 6) - 10 * crouch;
      fy = 191;
      const dx = fx - hpx;
      const dy = fy - hpy;
      const d = Math.min(72, Math.hypot(dx, dy));
      const h = Math.sqrt(Math.max(0, 36.5 * 36.5 - (d / 2) * (d / 2)));
      kx = hpx + dx / 2 + (-dy / Math.hypot(dx, dy)) * -h * (s ? 0.8 : 1);
      ky = hpy + dy / 2 + (dx / Math.hypot(dx, dy)) * -h * (s ? 0.8 : 1);
      if (kx < hpx) {
        kx = hpx + dx / 2 + (dy / Math.hypot(dx, dy)) * h;
        ky = hpy + dy / 2 - (dx / Math.hypot(dx, dy)) * h;
      }
      hip[0] = hpx;
      hip[1] = hpy;
      th = Math.atan2(kx - hpx, ky - hpy);
      t2 = Math.atan2(fx - kx, fy - ky);
    }
    if (sit) {
      // seduto: l'anca scende fino alla seduta, i piedi restano a terra un po' più avanti
      // e il ginocchio si piega in alto e in avanti (cinematica a due segmenti)
      // seduta vera: l'anca scende di una coscia, così a fine movimento la coscia è
      // orizzontale sulla seduta e lo stinco scende dritto fino al piede a terra
      const hpx = hip0[0] - 4 * sit;
      const hpy = hip0[1] + 36 * sit;
      fx = hip0[0] + (s ? 30 : 36) * sit + (1 - sit) * (s ? -2 : 4);
      fy = 191;
      const dx = fx - hpx;
      const dy = fy - hpy;
      const d = Math.min(72, Math.hypot(dx, dy));
      const h = Math.sqrt(Math.max(0, 36.5 * 36.5 - (d / 2) * (d / 2)));
      const nx = -dy / Math.hypot(dx, dy);
      const ny = dx / Math.hypot(dx, dy);
      const c1 = [hpx + dx / 2 + nx * h, hpy + dy / 2 + ny * h];
      const c2 = [hpx + dx / 2 - nx * h, hpy + dy / 2 - ny * h];
      [kx, ky] = c1[0] > c2[0] ? c1 : c2;
      hip[0] = hpx;
      hip[1] = hpy;
      th = Math.atan2(kx - hpx, ky - hpy);
      t2 = Math.atan2(fx - kx, fy - ky);
    }
    const tone = legsT + 0.08 * k;
    // coscia più piena e polpaccio più sottile, con un ginocchio morbido
    const wTop = style === "delhi" ? 14 : 13;
    X.strokeStyle = G(tone);
    X.lineWidth = wTop;
    X.beginPath();
    X.moveTo(hip[0], hip[1]);
    X.lineTo(kx, ky);
    X.stroke();
    X.lineWidth = wTop - 3;
    X.beginPath();
    X.moveTo(kx, ky);
    X.lineTo(fx, fy - 3);
    X.stroke();
    X.fillStyle = G(tone);
    X.beginPath();
    X.arc(kx, ky, (wTop - 1) / 2, 0, 7);
    X.fill();
    // piega di luce sul davanti della gamba
    X.strokeStyle = G(tone + 0.12);
    X.lineWidth = 1.5;
    X.beginPath();
    X.moveTo(hip[0] + Math.cos(th) * 4, hip[1] + 4);
    X.lineTo(kx + Math.cos(th) * 4, ky);
    X.lineTo(fx + Math.cos(t2) * 3, fy - 6);
    X.stroke();
    // scarpa
    if (style === "reykjavik") {
      poly([[fx - 9, fy - 12], [fx + 7, fy - 12], [fx + 16, fy - 2], [fx + 17, fy + 5], [fx - 10, fy + 5]], G(0.18 + 0.1 * k));
      X.fillStyle = G(0.75);
      X.fillRect(fx - 10, fy - 14, 17, 4); // bordo di pelo
    } else if (style === "delhi") {
      X.fillStyle = G(skin * 0.8);
      X.fillRect(fx - 5, fy - 4, 18, 6);
      X.fillStyle = G(0.12);
      X.fillRect(fx - 7, fy + 2, 22, 3);
    } else {
      // scarpa con la punta arrotondata, suola chiara e un riflesso sulla tomaia
      X.fillStyle = G(0.08 + 0.06 * k);
      X.beginPath();
      X.moveTo(fx - 8, fy + 4);
      X.lineTo(fx - 7, fy - 7);
      X.quadraticCurveTo(fx + 4, fy - 9, fx + 9, fy - 3);
      X.quadraticCurveTo(fx + 17, fy - 1, fx + 16, fy + 4);
      X.closePath();
      X.fill();
      X.fillStyle = G(0.45);
      X.fillRect(fx - 8, fy + 3, 24, 2);
      X.fillStyle = G(0.4);
      X.fillRect(fx + 5, fy - 4, 4, 1);
    }
  };
  // braccio con manica e mano
  const arm = (s, k) => {
    // oscillazione naturale: il braccio va in controfase alla gamba dello stesso lato,
    // il gomito si piega di più quando il braccio va avanti, quasi dritto quando va indietro
    const sw = walking ? -Math.sin(a + s) : 0;
    const th = walking ? sw * 0.5 : s ? 0.08 : -0.03;
    let ex = sh[0] + Math.sin(th) * 27;
    let ey = sh[1] + Math.cos(th) * 27;
    const t2 = th + (walking ? 0.18 + Math.max(0, sw) * 0.55 : 0.12);
    let hx = ex + Math.sin(t2) * 25;
    let hy = ey + Math.cos(t2) * 25;
    // posa "zaino in mano": il braccio dietro lo sorregge da sotto, quello davanti cura la pianta
    if (o.blend != null) {
      // passaggio continuo: la mano davanti va dalla spalla (dove ha preso lo zaino) alla presa
      // davanti al petto; il braccio dietro sale da riposo a sorreggere lo zaino
      const v = o.blend;
      const lerp4 = (A, B) => A.map((a, i) => a + (B[i] - a) * v);
      if (s === 0) [ex, ey, hx, hy] = lerp4([74, 94, 38, 68], [80, 96, 89, 79]);
      else [ex, ey, hx, hy] = lerp4([ex, ey, hx, hy], [70, 100, 84, 116]);
    } else if (o.hold) {
      // o.hold da 0 a 1: dalle braccia a riposo alla presa sullo zaino (per le transizioni)
      const hb = o.hold === true ? 1 : o.hold;
      const tap = o.tap ?? 0;
      const [tex, tey, thx, thy] = s === 0 ? [80, 96, 89 + tap * 0.4, 79 + tap] : [70, 100, 84, 116];
      ex += (tex - ex) * hb;
      ey += (tey - ey) * hb;
      hx += (thx - hx) * hb;
      hy += (thy - hy) * hb;
    }
    // si porta la mano alla maschera: manca l'aria
    if (o.clutch) {
      const c = o.clutch;
      const [tex, tey, thx, thy] = s === 0 ? [82, 88, 74, 54] : [52, 92, 66, 104];
      ex += (tex - ex) * c;
      ey += (tey - ey) * c;
      hx += (thx - hx) * c;
      hy += (thy - hy) * c;
    }
    // posa "cura": il braccio davanti va all'indietro a toccare la pianta dello zaino
    if (s === 0 && o.reach) {
      const r = o.reach;
      const tap = o.tap ?? 0;
      const tx = 44 + tap * 0.5;
      const ty = 70 + tap - bob;
      const rex = 80;
      const rey = 90 - bob;
      ex += (rex - ex) * r;
      ey += (rey - ey) * r;
      hx += (tx - hx) * r;
      hy += (ty - hy) * r;
    }
    const tone = top * (0.6 + 0.4 * k);
    // il braccio davanti è sempre un filo più chiaro del busto, in ogni posa: si legge senza cambiare colore
    X.strokeStyle = G(s === 0 ? tone + 0.08 : tone);
    X.lineWidth = style === "reykjavik" ? 13 : 10;
    X.beginPath();
    X.moveTo(sh[0], sh[1]);
    X.lineTo(ex, ey);
    X.lineTo(hx, hy);
    X.stroke();
    // polsino della manica
    const ang = Math.atan2(hy - ey, hx - ex);
    X.strokeStyle = G(tone - 0.08);
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(hx - Math.cos(ang) * 5 - Math.sin(ang) * 5, hy - Math.sin(ang) * 5 + Math.cos(ang) * 5);
    X.lineTo(hx - Math.cos(ang) * 5 + Math.sin(ang) * 5, hy - Math.sin(ang) * 5 - Math.cos(ang) * 5);
    X.stroke();
    // mano a mezzaluna con il pollice, un tono più chiaro sul dorso
    const hand = style === "reykjavik" ? 0.15 : skin * (0.7 + 0.3 * k);
    X.fillStyle = G(hand);
    X.beginPath();
    X.ellipse(hx + 1, hy + 2, 5, 6, ang - Math.PI / 2, 0, 7);
    X.fill();
    X.fillStyle = G(hand + 0.1);
    X.beginPath();
    X.ellipse(hx + 3, hy, 2, 2.5, 0, 0, 7);
    X.fill();
  };

  // dupatta che sventola dietro (New Delhi); da accasciato si disegna dopo, insieme al busto
  const dupatta = () => {
    if (!(style === "delhi" && o.scarf !== false)) return;
    const sw = walking ? Math.sin(a) * 4 : 0;
    poly([[56, 62 - bob], [44, 70 - bob], [36 + sw, 110], [42 + sw, 114], [52, 80 - bob], [60, 68 - bob]], shade(36, 60, (o.scarfT ?? 0.7), (o.scarfT ?? 0.7) - 0.25));
  };
  if (!crouch) dupatta();

  // camminando il corpo si inclina appena in avanti, come un passo vero
  if (walking) {
    X.translate(60, 196);
    X.rotate(0.045);
    X.translate(-60, -196);
  }
  if (crouch) {
    // gambe piegate, poi tutto il busto si abbassa e si sbilancia in avanti
    leg(Math.PI, 0);
    leg(0, 1);
    X.translate(4 * crouch, 40 * crouch);
    X.translate(60, 118);
    X.rotate(0.22 * crouch);
    X.translate(-60, -118);
    dupatta();
  } else if (sit) {
    // seduto: prima le gambe, poi il busto scende dritto sulla seduta
    leg(Math.PI, 0);
    leg(0, 1);
    X.translate(-4 * sit, 36 * sit);
  } else leg(Math.PI, 0);
  arm(Math.PI, 0.6);
  // con trench e kurta lunghi la gamba davanti sta sotto l'abito, non sopra
  if (long > 0 && !crouch && !sit) leg(0, 1);

  // zaino-serra compatto con la pianta luminosa
  // capsula ben visibile dietro la schiena (sporge oltre il busto)
  if (o.pack !== false) drawPack(X, G, 24, 64 - bob, a, walking, o.accentPass);
  // abito
  const cy = 66 - bob;
  if (style === "reykjavik") {
    // piumino imbottito con le cuciture orizzontali
    poly([[46, cy - 2], [76, cy - 2], [84, cy + 8], [86, cy + 52], [82, cy + 58], [42, cy + 58], [40, cy + 52], [42, cy + 8]], shade(40, 86, top + 0.14, top - 0.1));
    X.fillStyle = G(Math.max(0, top - 0.16));
    for (let y = cy + 10; y < cy + 56; y += 10) X.fillRect(42, y, 43, 2);
    // cappuccio di pelo dietro la testa
    X.fillStyle = G(0.7);
    X.beginPath();
    X.ellipse(56, cy - 4, 12, 7, -0.3, 0, 7);
    X.fill();
  } else if (style === "delhi") {
    // kurta lunga fino al ginocchio, con lo spacco laterale
    poly([[48, cy - 2], [72, cy - 2], [78, cy + 10], [84, cy + 52 + long], [42, cy + 52 + long], [44, cy + 10]], shade(42, 84, top + 0.12, top - 0.12));
    X.fillStyle = G(Math.max(0, top - 0.2));
    X.fillRect(70, cy + 56, 2, long);
    X.fillRect(58, cy + 2, 8, 2);
    X.fillStyle = G(top + 0.25);
    for (let y = cy + 6; y < cy + 30; y += 6) X.fillRect(62, y, 2, 2);
  } else {
    // trench con cintura, collo e tasca
    X.fillStyle = shade(42, 84, top + 0.14, top - 0.12);
    X.beginPath();
    X.moveTo(48, cy - 2);
    X.lineTo(70, cy - 2);
    X.quadraticCurveTo(79, cy - 1, 79, cy + 10);
    X.lineTo(83, cy + 50 + long);
    X.quadraticCurveTo(82, cy + 56 + long, 78, cy + 56 + long);
    X.lineTo(46, cy + 56 + long);
    X.quadraticCurveTo(42, cy + 56 + long, 42, cy + 50 + long);
    X.lineTo(44, cy + 10);
    X.quadraticCurveTo(44, cy - 1, 48, cy - 2);
    X.fill();
    // piega del tessuto
    X.fillStyle = G(top + 0.06);
    X.fillRect(50, cy + 44, 2, 10 + long);
    X.fillStyle = G(0.08);
    X.fillRect(43, cy + 38, 39, 4);
    X.fillStyle = G(0.6);
    X.fillRect(64, cy + 38, 4, 4);
    X.fillStyle = G(Math.max(0, top - 0.18));
    X.fillRect(64, cy + 44, 2, 30 + long - 14);
    X.fillStyle = G(top + 0.2);
    poly([[52, cy - 6], [70, cy - 4], [72, cy + 8], [56, cy + 12]], G(top + 0.18));
  }
  if (o.pack !== false) {
    // spallaccio sottile con fibbia
    X.strokeStyle = G(0.08);
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(50, cy + 2);
    X.quadraticCurveTo(58, cy + 14, 55, cy + 36);
    X.stroke();
    X.fillStyle = G(0.75);
    X.fillRect(55, cy + 16, 3, 2);
  }

  if (long === 0 && !crouch && !sit) leg(0, 1);
  arm(0, 1);

  // testa di profilo, un po' più grande (proporzioni più simpatiche, come nel riferimento)
  const hx = 64;
  const hy = 38 - bob;
  X.save();
  X.translate(hx, hy + 22);
  X.scale(1.18, 1.18);
  X.translate(-hx, -(hy + 22));
  X.fillStyle = G(skin * 0.7);
  X.fillRect(hx - 6, hy + 12, 10, 12);
  X.beginPath();
  X.moveTo(hx - 12, hy - 4);
  X.quadraticCurveTo(hx - 12, hy - 18, hx + 2, hy - 18);
  X.quadraticCurveTo(hx + 14, hy - 17, hx + 15, hy - 4);
  X.lineTo(hx + 18, hy + 3);
  X.lineTo(hx + 15, hy + 5);
  X.quadraticCurveTo(hx + 15, hy + 16, hx + 4, hy + 17);
  X.quadraticCurveTo(hx - 10, hy + 16, hx - 12, hy + 4);
  X.closePath();
  X.fillStyle = shade(hx - 12, hx + 16, skin + 0.12, skin - 0.12);
  X.fill();
  // capelli e copricapo
  X.fillStyle = G(hairT);
  const hair = o.hair ?? "short";
  const cap = () => {
    X.beginPath();
    X.moveTo(hx - 13, hy + 2);
    X.quadraticCurveTo(hx - 12, hy - 20, hx + 4, hy - 19);
    X.quadraticCurveTo(hx + 15, hy - 17, hx + 14, hy - 8);
    X.lineTo(hx - 1, hy - 8);
    X.lineTo(hx - 5, hy + 3);
    X.closePath();
    X.fill();
  };
  if (hair === "long") {
    cap();
    X.beginPath();
    X.moveTo(hx - 13, hy - 2);
    X.lineTo(hx - 4, hy);
    X.lineTo(hx - 6, hy + 28);
    X.lineTo(hx - 17, hy + 30);
    X.closePath();
    X.fill();
  } else if (hair === "bun") {
    cap();
    X.beginPath();
    X.arc(hx - 12, hy - 14, 6, 0, 7);
    X.fill();
  } else if (hair === "braid") {
    cap();
    for (let i = 0; i < 5; i++) {
      X.beginPath();
      X.arc(hx - 12 - i * 0.5, hy + 4 + i * 6, 3.5, 0, 7);
      X.fill();
    }
  } else cap();
  if (o.hat === "beanie") {
    X.fillStyle = G(o.hatT ?? 0.55);
    X.beginPath();
    X.moveTo(hx - 14, hy - 4);
    X.quadraticCurveTo(hx - 13, hy - 24, hx + 2, hy - 23);
    X.quadraticCurveTo(hx + 15, hy - 21, hx + 15, hy - 6);
    X.closePath();
    X.fill();
    X.fillStyle = G((o.hatT ?? 0.55) - 0.2);
    X.fillRect(hx - 14, hy - 8, 29, 5);
    X.fillStyle = G(0.85);
    X.beginPath();
    X.arc(hx - 1, hy - 25, 4.5, 0, 7);
    X.fill();
  } else if (o.hat === "cap") {
    X.fillStyle = G(o.hatT ?? 0.4);
    X.beginPath();
    X.moveTo(hx - 14, hy - 4);
    X.quadraticCurveTo(hx - 13, hy - 23, hx + 3, hy - 21);
    X.quadraticCurveTo(hx + 15, hy - 19, hx + 15, hy - 8);
    X.closePath();
    X.fill();
    X.fillStyle = G(0.1);
    X.fillRect(hx + 8, hy - 9, 15, 3);
  } else if (o.hat === "scarf") {
    // velo sul capo (New Delhi)
    X.fillStyle = G(o.scarfT ?? 0.7);
    X.beginPath();
    X.moveTo(hx - 16, hy + 14);
    X.quadraticCurveTo(hx - 16, hy - 22, hx + 4, hy - 21);
    X.quadraticCurveTo(hx + 16, hy - 19, hx + 15, hy - 6);
    X.lineTo(hx + 4, hy - 10);
    X.lineTo(hx - 4, hy + 16);
    X.closePath();
    X.fill();
  }
  // tratti del viso come nei ritratti del team: orecchio, occhio scuro col riflesso,
  // sopracciglio, bocca (sotto la maschera restano coperti)
  X.fillStyle = G(skin - 0.12);
  X.beginPath();
  X.ellipse(hx - 1, hy + 3, 3, 4.5, 0, 0, 7);
  X.fill();
  X.fillStyle = G(skin - 0.28);
  X.fillRect(hx - 1, hy + 1, 1, 4);
  X.fillStyle = G(0.05);
  X.fillRect(hx + 8, hy - 2, 4, 4);
  X.fillStyle = G(1);
  X.fillRect(hx + 9, hy - 2, 2, 2);
  X.fillStyle = G(hairT);
  X.fillRect(hx + 7, hy - 6, 7, 2);
  X.fillStyle = G(0.25);
  X.fillRect(hx + 11, hy + 10, 4, 1.5);
  X.fillStyle = G(skin - 0.2);
  X.fillRect(hx + 15, hy + 2, 2, 2);
  if (o.mask === false) return;
  // occhiali e respiratore con il filtro rotondo
  X.fillStyle = G(0.12);
  X.fillRect(hx - 10, hy - 4, 18, 2);
  X.fillStyle = G(0.82);
  X.beginPath();
  X.ellipse(hx + 10, hy - 1, 4.5, 3.5, 0, 0, 7);
  X.fill();
  X.fillStyle = shade(hx + 2, hx + 18, 0.6, 0.3);
  X.beginPath();
  X.moveTo(hx + 3, hy + 4);
  X.quadraticCurveTo(hx + 12, hy + 2, hx + 18, hy + 6);
  X.quadraticCurveTo(hx + 19, hy + 15, hx + 10, hy + 17);
  X.quadraticCurveTo(hx + 3, hy + 16, hx + 3, hy + 4);
  X.fill();
  X.fillStyle = G(0.18);
  X.beginPath();
  X.arc(hx + 19, hy + 12, 5, 0, 7);
  X.fill();
  X.fillStyle = G(0.6);
  X.fillRect(hx + 17, hy + 10, 4, 1);
  X.fillRect(hx + 17, hy + 13, 4, 1);
  if (o.pack !== false) {
    // tubo sottile dal tappo al filtro, sopra la spalla
    // tubo corrugato dal tappo della capsula alla maschera, sopra la spalla
    const hose = () => {
      X.beginPath();
      X.moveTo(34, 65 - bob);
      X.bezierCurveTo(30, 40 - bob, 56, 50 - bob, hx + 10, hy + 17);
    };
    X.strokeStyle = G(0.4);
    X.lineWidth = 4.5;
    hose();
    X.stroke();
    X.strokeStyle = G(0.75);
    X.lineWidth = 1.2;
    X.setLineDash([1.5, 2]);
    hose();
    X.stroke();
    X.setLineDash([]);
  }
  X.restore();
}


// ---------------------------------------------------------------- nuovo stile (illustrazione piatta)
// Figure sottili e allungate come nel riferimento: cappotto lungo, gambe sottili scure,
// testa piccola, sciarpa gialla, colori pieni senza retino. Stessa cinematica di prima
// (passo, presa dello zaino, cura, svenimento, seduta) così tutte le scene restano uguali.
const COATS = ["#2F3D52", "#46566E", "#6E7B8E", "#9AA3AF", "#C3C6CA", "#DEDAD1", "#ECE8DF", "#BCA88A"];
const SKINS = { light: ["#EED9C6", "#E2C4AA"], mid: ["#C99A76", "#B4835F"], dark: ["#93684A", "#7C553A"] };
const HAIRS = ["#24252B", "#3B2E28", "#6A4C38", "#D9C597", "#E6E1D6"];
const YELLOW = "#E2B33C";
const YELLOW_D = "#C99A27";
const SHOE = "#1F2733";
const darker = (h, k = 0.18) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return "#" + c.map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, "0")).join("");
};
// zaino BIONOMAD: capsula bianca con la cupola di vetro azzurro e la piantina verde (agave)
function packFlat(X, px, py, a = 0, walking = false) {
  const pw = 22;
  const ph = 48;
  const sway = walking ? Math.sin(a) * 1 : 0;
  // corpo bianco arrotondato
  X.fillStyle = "#E9E7E1";
  X.beginPath();
  X.moveTo(px + 2, py + 12);
  X.quadraticCurveTo(px + 2, py + 4, px + pw / 2, py + 4);
  X.quadraticCurveTo(px + pw - 2, py + 4, px + pw - 2, py + 12);
  X.lineTo(px + pw, py + ph - 6);
  X.quadraticCurveTo(px + pw, py + ph, px + pw - 6, py + ph);
  X.lineTo(px + 6, py + ph);
  X.quadraticCurveTo(px, py + ph, px, py + ph - 6);
  X.closePath();
  X.fill();
  // lato in ombra
  X.fillStyle = "#CFCCC4";
  X.fillRect(px + pw - 6, py + 12, 4, ph - 16);
  // finestra di vetro con la piantina
  X.fillStyle = "#B9D0EA";
  X.beginPath();
  X.moveTo(px + 5, py + 34);
  X.lineTo(px + 5, py + 15);
  X.quadraticCurveTo(px + 5, py + 9, px + pw / 2, py + 9);
  X.quadraticCurveTo(px + pw - 5, py + 9, px + pw - 5, py + 15);
  X.lineTo(px + pw - 5, py + 34);
  X.closePath();
  X.fill();
  X.fillStyle = "#6FA06B";
  [[-4, 14], [-1, 10], [2, 12], [5, 16]].forEach(([dx, h]) => {
    X.beginPath();
    X.moveTo(px + pw / 2 + dx - 2, py + 33);
    X.lineTo(px + pw / 2 + dx + sway * (h / 14), py + 33 - h);
    X.lineTo(px + pw / 2 + dx + 2, py + 33);
    X.fill();
  });
  X.fillStyle = "rgba(255,255,255,0.55)";
  X.fillRect(px + 7, py + 14, 2, 14);
  // anello luminoso (ossigeno) e base
  X.fillStyle = "#8FD0A6";
  X.fillRect(px + 3, py + 37, pw - 6, 2);
  X.fillStyle = "#BDBAB2";
  X.fillRect(px + 2, py + ph - 4, pw - 4, 3);
  // tappo
  X.fillStyle = "#C9CDD3";
  X.fillRect(px + 6, py + 1, pw - 12, 4);
}
function figure(T, ph, o) {
  const { X } = T;
  X.lineCap = "round";
  X.lineJoin = "round";
  const style = o.style ?? "milano";
  const ci = Math.max(0, Math.min(COATS.length - 1, Math.floor((o.top ?? 0.4) * COATS.length)));
  const coat = o.coat ?? COATS[ci];
  const legC = o.legC ?? ((o.legs ?? 0.16) > 0.4 ? "#5D6778" : "#27303D");
  const sk = style === "delhi" ? SKINS[(o.skin ?? 0.6) > 0.6 ? "mid" : "dark"] : SKINS[(o.skin ?? 0.6) > 0.62 ? "light" : (o.skin ?? 0.6) > 0.55 ? "light" : "mid"];
  const hairC = o.hairC ?? HAIRS[(o.hairTone ?? 0.1) > 0.75 ? 3 : (o.hairTone ?? 0.1) > 0.5 ? 4 : (o.hairTone ?? 0.1) > 0.25 ? 2 : (o.hairTone ?? 0.1) > 0.15 ? 1 : 0];
  const scarf = o.scarf !== false;
  const a = ph * Math.PI * 2;
  const walking = o.walking;
  const bob = walking ? Math.abs(Math.cos(a)) * 1.6 : 0;
  const poly = (pts, fillC) => {
    X.beginPath();
    pts.forEach(([x, y], i) => (i ? X.lineTo(x, y) : X.moveTo(x, y)));
    X.closePath();
    X.fillStyle = fillC;
    X.fill();
  };
  let hip = [60, 118 - bob];
  const sh = [62, 72 - bob];
  const crouch = o.crouch ?? 0;
  const sit = o.sit ?? 0;
  const hip0 = [...hip];
  const leg = (s, front) => {
    hip = [...hip0];
    let th = walking ? Math.sin(a + s) * 0.46 : s ? -0.04 : 0.06;
    const lift = walking ? Math.max(0, Math.cos(a + s)) * 0.72 : 0;
    let kx = hip[0] + Math.sin(th) * 37;
    let ky = hip[1] + Math.cos(th) * 37;
    let t2 = th - lift;
    let fx = kx + Math.sin(t2) * 36;
    let fy = ky + Math.cos(t2) * 36;
    const solve = (hpx, hpy, footX) => {
      fx = footX;
      fy = 191;
      const dx = fx - hpx;
      const dy = fy - hpy;
      const d = Math.min(72, Math.hypot(dx, dy));
      const h = Math.sqrt(Math.max(0, 36.5 * 36.5 - (d / 2) * (d / 2)));
      const nx = -dy / Math.hypot(dx, dy);
      const ny = dx / Math.hypot(dx, dy);
      const c1 = [hpx + dx / 2 + nx * h, hpy + dy / 2 + ny * h];
      const c2 = [hpx + dx / 2 - nx * h, hpy + dy / 2 - ny * h];
      [kx, ky] = c1[0] > c2[0] ? c1 : c2;
      hip[0] = hpx;
      hip[1] = hpy;
    };
    if (crouch) solve(hip[0] + 4 * crouch, hip[1] + 40 * crouch, 60 + (s ? -8 : 6) - 10 * crouch);
    if (sit) solve(hip0[0] - 4 * sit, hip0[1] + 36 * sit, hip0[0] + (s ? 30 : 36) * sit + (1 - sit) * (s ? -2 : 4));
    const c = front ? legC : darker(legC, 0.25);
    X.strokeStyle = c;
    X.lineWidth = 7;
    X.beginPath();
    X.moveTo(hip[0], hip[1]);
    X.lineTo(kx, ky);
    X.lineTo(fx, fy - 3);
    X.stroke();
    // scarpa a punta arrotondata
    X.fillStyle = front ? SHOE : darker(SHOE, 0.2);
    X.beginPath();
    X.moveTo(fx - 5, fy + 3);
    X.lineTo(fx - 5, fy - 5);
    X.quadraticCurveTo(fx + 6, fy - 6, fx + 12, fy);
    X.lineTo(fx + 12, fy + 3);
    X.closePath();
    X.fill();
  };
  const arm = (s, front) => {
    const sw = walking ? -Math.sin(a + s) : 0;
    const th = walking ? sw * 0.48 : s ? 0.06 : -0.03;
    let ex = sh[0] + Math.sin(th) * 27;
    let ey = sh[1] + Math.cos(th) * 27;
    const t2 = th + (walking ? 0.16 + Math.max(0, sw) * 0.5 : 0.1);
    let hx = ex + Math.sin(t2) * 25;
    let hy = ey + Math.cos(t2) * 25;
    if (o.blend != null) {
      const v = o.blend;
      const lerp4 = (A, B) => A.map((q, i) => q + (B[i] - q) * v);
      if (s === 0) [ex, ey, hx, hy] = lerp4([74, 94, 38, 68], [80, 96, 89, 79]);
      else [ex, ey, hx, hy] = lerp4([ex, ey, hx, hy], [70, 100, 84, 116]);
    } else if (o.hold) {
      const hb = o.hold === true ? 1 : o.hold;
      const tap = o.tap ?? 0;
      const [tex, tey, thx, thy] = s === 0 ? [80, 96, 89 + tap * 0.4, 79 + tap] : [70, 100, 84, 116];
      ex += (tex - ex) * hb;
      ey += (tey - ey) * hb;
      hx += (thx - hx) * hb;
      hy += (thy - hy) * hb;
    }
    if (o.clutch) {
      const c = o.clutch;
      const [tex, tey, thx, thy] = s === 0 ? [82, 88, 74, 54] : [52, 92, 66, 104];
      ex += (tex - ex) * c;
      ey += (tey - ey) * c;
      hx += (thx - hx) * c;
      hy += (thy - hy) * c;
    }
    if (s === 0 && o.reach) {
      const r = o.reach;
      const tap = o.tap ?? 0;
      ex += (80 - ex) * r;
      ey += (90 - bob - ey) * r;
      hx += (44 + tap * 0.5 - hx) * r;
      hy += (70 + tap - bob - hy) * r;
    }
    X.strokeStyle = front ? coat : darker(coat, 0.2);
    X.lineWidth = o.garment === "parka" ? 9 : o.garment === "kurta" ? 6 : 7;
    X.beginPath();
    X.moveTo(sh[0], sh[1]);
    X.lineTo(ex, ey);
    X.lineTo(hx, hy);
    X.stroke();
    X.fillStyle = front ? sk[0] : sk[1];
    X.beginPath();
    X.arc(hx, hy + 1, 3.6, 0, 7);
    X.fill();
  };
  if (walking) {
    X.translate(60, 196);
    X.rotate(0.04);
    X.translate(-60, -196);
  }
  if (crouch) {
    leg(Math.PI, false);
    leg(0, true);
    X.translate(4 * crouch, 40 * crouch);
    X.translate(60, 118);
    X.rotate(0.22 * crouch);
    X.translate(-60, -118);
  } else if (sit) {
    leg(Math.PI, false);
    leg(0, true);
    X.translate(-4 * sit, 36 * sit);
  } else {
    leg(Math.PI, false);
    leg(0, true);
  }
  arm(Math.PI, false);
  // coda della sciarpa che scende dietro
  if (scarf) {
    const fl = walking ? Math.sin(a) * 3 : 0;
    poly([[54, 66 - bob], [48, 70 - bob], [44 + fl, 96], [50 + fl, 97], [57, 72 - bob]], YELLOW_D);
  }
  // zaino BIONOMAD sulla schiena
  if (o.pack !== false) packFlat(X, 26, 66 - bob, a, walking);
  // cappotto lungo, appena svasato in fondo
  const cy = 66 - bob;
  const garment = o.garment ?? "trench";
  // lunghezza e volume dell'abito: trench lungo, kurta al ginocchio, piumino imbottito
  const long = sit ? (garment === "kurta" ? 18 : 26) : garment === "kurta" ? 34 : garment === "parka" ? 40 : 52;
  const puff = garment === "parka" ? 3 : 0;
  X.fillStyle = coat;
  X.beginPath();
  X.moveTo(52 - puff, cy);
  X.lineTo(70 + puff, cy);
  X.quadraticCurveTo(77 + puff, cy + 2, 76 + puff, cy + 14);
  X.lineTo(78 + puff + (walking ? 1 : 0), cy + 40 + long * 0.6);
  X.lineTo(80 + puff, cy + 40 + long);
  X.lineTo(46 - puff, cy + 40 + long);
  X.lineTo(48 - puff, cy + 40 + long * 0.6);
  X.lineTo(47 - puff, cy + 12);
  X.quadraticCurveTo(47 - puff, cy + 1, 52 - puff, cy);
  X.fill();
  // piega d'ombra sul retro
  X.fillStyle = darker(coat, 0.12);
  X.fillRect(47 - puff, cy + 14, 6, 26 + long);
  if (garment === "trench") {
    // cintura annodata e revers
    X.fillStyle = darker(coat, 0.2);
    X.fillRect(47, cy + 34, 33, 4);
    X.fillRect(70, cy + 36, 3, 9);
    X.strokeStyle = darker(coat, 0.16);
    X.lineWidth = 1.2;
    X.beginPath();
    X.moveTo(70, cy + 2);
    X.lineTo(74, cy + 30);
    X.stroke();
  } else if (garment === "kurta") {
    // spacco laterale e bordo ricamato
    X.strokeStyle = darker(coat, 0.18);
    X.lineWidth = 1.2;
    X.beginPath();
    X.moveTo(78, cy + 40 + long);
    X.lineTo(77, cy + 40 + long - 14);
    X.stroke();
    X.fillStyle = darker(coat, 0.1);
    X.fillRect(46, cy + 37 + long, 34, 3);
  } else if (garment === "parka") {
    // cuciture orizzontali del piumino
    X.strokeStyle = darker(coat, 0.18);
    X.lineWidth = 1.4;
    for (let y = cy + 12; y < cy + 36 + long; y += 11) {
      X.beginPath();
      X.moveTo(50, y);
      X.quadraticCurveTo(63, y + 2, 77 + (y > cy + 40 ? 2 : 0), y);
      X.stroke();
    }
  }
  if (o.pack !== false) {
    X.strokeStyle = "#3A4558";
    X.lineWidth = 2.5;
    X.beginPath();
    X.moveTo(52, cy + 2);
    X.quadraticCurveTo(58, cy + 16, 54, cy + 34);
    X.stroke();
  }
  arm(0, true);
  // sciarpa gialla al collo
  if (scarf) {
    X.fillStyle = YELLOW;
    X.beginPath();
    X.ellipse(63, cy - 1, 10, 5, -0.1, 0, 7);
    X.fill();
    poly([[66, cy + 2], [72, cy + 2], [74, cy + 22], [69, cy + 22]], YELLOW);
  }
  // testa piccola di profilo, collo sottile
  const hx = 64;
  const hy = 44 - bob;
  if ((o.garment ?? "") === "parka") {
    // cappuccio abbassato con il bordo di pelo, dietro la nuca
    X.fillStyle = darker(coat, 0.08);
    X.beginPath();
    X.ellipse(hx - 9, hy + 14, 9, 7, -0.3, 0, 7);
    X.fill();
    X.fillStyle = "#D8D2C4";
    X.beginPath();
    X.ellipse(hx - 4, hy + 16, 7, 4, 0, 0, 7);
    X.fill();
  }
  X.fillStyle = sk[1];
  X.fillRect(hx - 3, hy + 6, 6, 9);
  X.fillStyle = sk[0];
  X.beginPath();
  X.ellipse(hx, hy, 9, 10.5, 0, 0, 7);
  X.fill();
  X.beginPath();
  X.moveTo(hx + 7, hy - 2);
  X.lineTo(hx + 11, hy + 2);
  X.lineTo(hx + 7, hy + 4);
  X.fill();
  // capelli
  X.fillStyle = hairC;
  const hair = o.hair ?? "short";
  X.beginPath();
  X.moveTo(hx - 10, hy + 3);
  X.quadraticCurveTo(hx - 11, hy - 12, hx + 1, hy - 11);
  X.quadraticCurveTo(hx + 10, hy - 10, hx + 9, hy - 3);
  X.lineTo(hx - 2, hy - 4);
  X.lineTo(hx - 4, hy + 4);
  X.closePath();
  X.fill();
  if (hair === "long") poly([[hx - 10, hy - 2], [hx - 3, hy], [hx - 4, hy + 18], [hx - 13, hy + 18]], hairC);
  if (hair === "bun") {
    X.beginPath();
    X.arc(hx - 9, hy - 9, 4.5, 0, 7);
    X.fill();
  }
  if (hair === "braid") for (let i = 0; i < 4; i++) {
    X.beginPath();
    X.arc(hx - 9, hy + 4 + i * 5, 2.8, 0, 7);
    X.fill();
  }
  // copricapo
  if (o.hat === "cap" || o.hat === "fedora") {
    X.fillStyle = "#2A2F3A";
    X.fillRect(hx - 13, hy - 9, 26, 3);
    X.beginPath();
    X.moveTo(hx - 8, hy - 9);
    X.lineTo(hx - 7, hy - 18);
    X.lineTo(hx + 7, hy - 18);
    X.lineTo(hx + 8, hy - 9);
    X.fill();
    X.fillStyle = YELLOW;
    X.fillRect(hx - 8, hy - 11, 16, 2);
  } else if (o.hat === "beanie") {
    X.fillStyle = o.hatT && o.hatT > 0.5 ? "#E9E7E1" : "#4A5A72";
    X.beginPath();
    X.moveTo(hx - 11, hy - 2);
    X.quadraticCurveTo(hx - 11, hy - 17, hx, hy - 16);
    X.quadraticCurveTo(hx + 11, hy - 15, hx + 10, hy - 3);
    X.closePath();
    X.fill();
    X.beginPath();
    X.arc(hx, hy - 17, 3.5, 0, 7);
    X.fill();
  } else if (o.hat === "scarf") {
    X.fillStyle = YELLOW;
    X.beginPath();
    X.moveTo(hx - 12, hy + 12);
    X.quadraticCurveTo(hx - 13, hy - 14, hx + 1, hy - 13);
    X.quadraticCurveTo(hx + 11, hy - 12, hx + 10, hy - 4);
    X.lineTo(hx + 2, hy - 6);
    X.lineTo(hx - 4, hy + 12);
    X.closePath();
    X.fill();
  }
  // occhio
  X.fillStyle = "#1E2430";
  X.fillRect(hx + 4, hy - 2, 2, 2);
  if (o.mask === false) return;
  // respiratore: mascherina chiara con il filtro, tubo sopra la spalla fino allo zaino
  X.fillStyle = "#D6DAE0";
  X.beginPath();
  X.moveTo(hx + 2, hy + 2);
  X.quadraticCurveTo(hx + 10, hy, hx + 13, hy + 4);
  X.quadraticCurveTo(hx + 13, hy + 10, hx + 6, hy + 11);
  X.quadraticCurveTo(hx + 1, hy + 10, hx + 2, hy + 2);
  X.fill();
  X.fillStyle = "#8D99AA";
  X.beginPath();
  X.arc(hx + 12, hy + 7, 3, 0, 7);
  X.fill();
  if (o.pack !== false) {
    X.strokeStyle = "#AEB6C2";
    X.lineWidth = 2.5;
    X.beginPath();
    X.moveTo(37, 69 - bob);
    X.bezierCurveTo(34, 50 - bob, 54, 56 - bob, hx + 6, hy + 11);
    X.stroke();
  }
}

// ---------------------------------------------------------------- vista frontale (crediti)

// ciocche davanti (coordinate del disegno frontale, cx = 60): dalla tempia alle spalle
const FRONT_LOCKS = [
  [[42, 22], [36, 46], [38, 64], [40, 80], [36, 90], [44, 90], [47, 76], [44, 56], [46, 26]],
  [[78, 22], [84, 46], [82, 64], [80, 80], [84, 90], [76, 90], [73, 76], [76, 56], [74, 26]]
];

function front(T, o) {
  const { X, G } = T;
  const cx = 60;
  const skin = o.skin ?? 0.8;
  const hairT = o.hairTone ?? 0.2;
  const topT = o.top ?? 0.4;
  const legsT = o.legs ?? 0.15;
  const ell = (x, y, rx, ry, fill) => {
    X.fillStyle = fill;
    X.beginPath();
    X.ellipse(x, y, rx, ry, 0, 0, 7);
    X.fill();
  };
  const shade = (x0, x1, l, r) => {
    const g = X.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, G(l));
    g.addColorStop(1, G(r));
    return g;
  };
  // capelli lunghi dietro le spalle
  if (o.hair === "long") {
    X.fillStyle = G(hairT);
    X.beginPath();
    X.moveTo(cx - 22, 30);
    X.quadraticCurveTo(cx - 26, 70, cx - 20, 96);
    X.lineTo(cx + 20, 96);
    X.quadraticCurveTo(cx + 26, 70, cx + 22, 30);
    X.closePath();
    X.fill();
  }
  // gambe e scarpe
  X.fillStyle = shade(cx - 16, cx + 16, legsT + 0.1, legsT - 0.05);
  if (o.skirt) {
    X.beginPath();
    X.moveTo(cx - 20, 128);
    X.lineTo(cx + 20, 128);
    X.lineTo(cx + 26, 160);
    X.lineTo(cx - 26, 160);
    X.closePath();
    X.fill();
    X.fillStyle = G(skin * 0.8);
    X.fillRect(cx - 14, 160, 9, 26);
    X.fillRect(cx + 5, 160, 9, 26);
  } else {
    X.fillRect(cx - 17, 126, 15, 62);
    X.fillRect(cx + 2, 126, 15, 62);
  }
  X.fillStyle = G(0.08);
  X.fillRect(cx - 19, 186, 18, 8);
  X.fillRect(cx + 1, 186, 18, 8);
  X.fillStyle = G(0.6);
  X.fillRect(cx - 19, 193, 18, 2);
  X.fillRect(cx + 1, 193, 18, 2);
  // busto
  X.fillStyle = o.sweaterColor ?? (o.jacket ? shade(cx - 24, cx + 24, 0.34, 0.2) : shade(cx - 24, cx + 24, topT + 0.14, topT - 0.12));
  X.beginPath();
  X.moveTo(cx - 18, 64);
  X.lineTo(cx + 18, 64);
  X.lineTo(cx + 24, 74);
  X.lineTo(cx + 21, 130);
  X.lineTo(cx - 21, 130);
  X.lineTo(cx - 24, 74);
  X.closePath();
  X.fill();
  if (o.stripes) {
    X.fillStyle = G(0.85);
    for (let y = 72; y < 128; y += 8) X.fillRect(cx - 22, y, 44, 3);
  }
  if (o.overalls) {
    X.fillStyle = shade(cx - 20, cx + 20, 0.42, 0.28);
    X.fillRect(cx - 16, 92, 32, 38);
    X.fillRect(cx - 14, 64, 5, 30);
    X.fillRect(cx + 9, 64, 5, 30);
    X.fillStyle = G(0.85);
    X.fillRect(cx - 13, 92, 3, 3);
    X.fillRect(cx + 10, 92, 3, 3);
  }
  if (o.vest) {
    X.fillStyle = G(0.1);
    X.fillRect(cx - 22, 70, 14, 58);
    X.fillRect(cx + 8, 70, 14, 58);
  }
  // braccia lungo i fianchi
  X.fillStyle = o.sweaterColor ?? (o.jacket ? shade(cx - 34, cx - 20, 0.3, 0.16) : shade(cx - 34, cx - 20, topT + 0.1, topT - 0.05));
  X.fillRect(cx - 32, 70, 10, 50);
  X.fillStyle = o.sweaterColor ?? (o.jacket ? shade(cx + 20, cx + 34, 0.24, 0.12) : shade(cx + 20, cx + 34, topT, topT - 0.15));
  X.fillRect(cx + 22, 70, 10, 50);
  ell(cx - 27, 124, 5.5, 6, G(skin));
  ell(cx + 27, 124, 5.5, 6, G(skin - 0.1));
  if (o.jacket) {
    // giacca corta con reversi, cucitura centrale e taschini
    X.fillStyle = G(0.48);
    X.beginPath();
    X.moveTo(cx - 15, 65);
    X.lineTo(cx - 3, 74);
    X.lineTo(cx - 10, 88);
    X.lineTo(cx - 20, 76);
    X.closePath();
    X.fill();
    X.beginPath();
    X.moveTo(cx + 15, 65);
    X.lineTo(cx + 3, 74);
    X.lineTo(cx + 10, 88);
    X.lineTo(cx + 20, 76);
    X.closePath();
    X.fill();
    X.strokeStyle = G(0.08);
    X.lineWidth = 1.5;
    X.beginPath();
    X.moveTo(cx, 74);
    X.lineTo(cx, 130);
    X.stroke();
    X.fillStyle = G(0.72);
    X.fillRect(cx - 15, 108, 8, 2);
    X.fillRect(cx + 7, 108, 8, 2);
    X.fillStyle = G(0.9);
    X.beginPath();
    X.arc(cx, 91, 1.8, 0, 7);
    X.arc(cx, 101, 1.8, 0, 7);
    X.fill();
  }
  // collo e testa
  X.fillStyle = G(skin - 0.15);
  X.fillRect(cx - 6, 52, 12, 14);
  ell(cx, 36, 17, 21, shade(cx - 17, cx + 17, skin + 0.1, skin - 0.12));
  // orecchie e orecchini
  ell(cx - 17, 38, 3, 5, G(skin - 0.1));
  ell(cx + 17, 38, 3, 5, G(skin - 0.15));
  if (o.earrings) {
    ell(cx - 17, 46, 2, 2, G(0.95));
    ell(cx + 17, 46, 2, 2, G(0.95));
  }
  // occhi, sopracciglia, naso, bocca
  X.fillStyle = G(0.05);
  X.fillRect(cx - 9, 34, 5, 5);
  X.fillRect(cx + 4, 34, 5, 5);
  X.fillStyle = G(1);
  X.fillRect(cx - 8, 34, 2, 2);
  X.fillRect(cx + 5, 34, 2, 2);
  X.fillStyle = G(hairT);
  X.fillRect(cx - 11, 29, 8, 2);
  X.fillRect(cx + 3, 29, 8, 2);
  if (o.glasses) {
    // montatura scura con il ponte sul naso e un riflesso chiaro sulla lente
    X.strokeStyle = G(0.06);
    X.lineWidth = 1.5;
    [-1, 1].forEach((d) => {
      const ex = cx + d * 6.5;
      X.beginPath();
      if (o.glasses === "round") X.ellipse(ex, 36.5, 5.5, 5, 0, 0, 7);
      else X.rect(ex - 5.5, 32, 11, 9);
      X.stroke();
      X.fillStyle = G(0.95, 0.5);
      X.fillRect(ex + 1, 33.5, 2, 1.5);
    });
    X.beginPath();
    X.moveTo(cx - 1, 35);
    X.lineTo(cx + 1, 35);
    X.stroke();
    X.beginPath();
    X.moveTo(cx - 12, 35);
    X.lineTo(cx - 17, 36);
    X.moveTo(cx + 12, 35);
    X.lineTo(cx + 17, 36);
    X.stroke();
  }
  X.fillStyle = G(skin - 0.22);
  X.fillRect(cx - 1, 40, 3, 6);
  X.fillStyle = G(0.25);
  X.fillRect(cx - 4, 49, 8, 2);
  if (o.beard) {
    X.fillStyle = G(hairT);
    X.beginPath();
    X.moveTo(cx - 17, 36);
    X.quadraticCurveTo(cx - 16, 60, cx, 60);
    X.quadraticCurveTo(cx + 16, 60, cx + 17, 36);
    X.lineTo(cx + 12, 44);
    X.quadraticCurveTo(cx, 50, cx - 12, 44);
    X.closePath();
    X.fill();
    // baffi sopra la bocca, labbra chiare ben visibili nella barba
    X.fillStyle = G(hairT);
    X.fillRect(cx - 7, 45, 14, 3);
    X.fillStyle = G(skin - 0.05);
    X.fillRect(cx - 5, 48, 10, 3);
    X.fillStyle = G(0.12);
    X.fillRect(cx - 3, 49, 6, 2);
  }
  // capelli sopra
  X.fillStyle = G(hairT);
  X.beginPath();
  X.moveTo(cx - 19, 34);
  X.quadraticCurveTo(cx - 20, 12, cx, 13);
  X.quadraticCurveTo(cx + 20, 12, cx + 19, 34);
  X.quadraticCurveTo(cx + 12, 22, cx + (o.hair === "long" ? 2 : 6), 22);
  X.quadraticCurveTo(cx - 10, 22, cx - 19, 34);
  X.fill();
  if (o.hair === "manbun") {
    ell(cx, 10, 8, 7, G(hairT));
  }
  if (o.earLocks) {
    // ciocche che scendono ai lati del viso e coprono le orecchie
    [-1, 1].forEach((d) => {
      X.fillStyle = G(hairT);
      X.beginPath();
      X.moveTo(cx + d * 12, 18);
      X.quadraticCurveTo(cx + d * 22, 22, cx + d * 22, 34);
      X.lineTo(cx + d * 21, 50);
      X.quadraticCurveTo(cx + d * 16, 52, cx + d * 14, 46);
      X.quadraticCurveTo(cx + d * 15, 30, cx + d * 12, 18);
      X.fill();
      X.fillStyle = G(hairT + 0.1);
      X.fillRect(cx + d * 18 - 1, 28, 2, 16);
    });
  }
  if (o.frontLocks) {
    // ciocche davanti alle spalle, dello stesso tono dei capelli (le punte si colorano dopo)
    FRONT_LOCKS.forEach((pts) => {
      X.fillStyle = G(hairT);
      X.beginPath();
      X.moveTo(...pts[0]);
      for (let i = 1; i < pts.length; i += 2) X.quadraticCurveTo(...pts[i], ...pts[i + 1]);
      X.closePath();
      X.fill();
    });
    X.strokeStyle = G(hairT - 0.2);
    X.lineWidth = 1;
    FRONT_LOCKS.forEach((pts) => {
      X.beginPath();
      X.moveTo(...pts[0]);
      for (let i = 1; i < pts.length; i += 2) X.quadraticCurveTo(...pts[i], ...pts[i + 1]);
      X.stroke();
    });
  }
  if (o.hat === "cap") {
    X.fillStyle = shade(cx - 20, cx + 20, 0.2, 0.06);
    X.beginPath();
    X.moveTo(cx - 20, 26);
    X.quadraticCurveTo(cx - 20, 6, cx, 7);
    X.quadraticCurveTo(cx + 20, 6, cx + 20, 26);
    X.closePath();
    X.fill();
    X.fillStyle = G(0.05);
    X.fillRect(cx - 22, 24, 44, 5);
  }
}

// ---------------------------------------------------------------- rifinitura

// SS: i personaggi si disegnano 2 volte più grandi (vettoriale nitido), senza retino né grana
export const SS = 2;
function sideFrame(w, h, k, ph, o) {
  return finish(paint(w * SS, h * SS, k * SS, (T) => figure(T, ph, o), { seedValue: 11, cell: 1, raw: true }), { rim: false, outline: false, pad: 3 * SS });
}
const addHi = (scene, key, canvas) => addHiRes(scene, key, canvas, SS);

function finish(c, { rim = true, outline = true, pad = 3 } = {}) {
  const out = document.createElement("canvas");
  out.width = c.width + pad * 2;
  out.height = c.height + pad * 2;
  const ox = out.getContext("2d", { willReadFrequently: true });
  ox.drawImage(c, pad, pad);
  const img = ox.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const W = out.width;
  const H = out.height;
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 128;
  const edge = [];
  const ring = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (op(x, y)) {
        if (rim && (!op(x - 1, y) || !op(x, y - 1))) edge.push((y * W + x) * 4);
      } else if (outline && (op(x + 1, y) || op(x - 1, y) || op(x, y + 1) || op(x, y - 1))) ring.push((y * W + x) * 4);
    }
  edge.forEach((p) => {
    // il bordo illuminato è un tono più chiaro, mai bianco pieno
    const lum = d[p];
    const c3 = lum < RGB[3][0] ? RGB[3] : RGB[4];
    d[p] = c3[0];
    d[p + 1] = c3[1];
    d[p + 2] = c3[2];
  });
  ring.forEach((p) => {
    d[p] = RGB[0][0];
    d[p + 1] = RGB[0][1];
    d[p + 2] = RGB[0][2];
    d[p + 3] = 255;
  });
  ox.putImageData(img, 0, 0);
  return out;
}

const SIDE_OPTS = new Map();

// versione "senza zaino" (con la maschera) di qualunque personaggio di profilo, con i fotogrammi
// per tenere la capsula in mano: serve a far curare la pianta ai passanti come al protagonista
// fotogrammi per la cura dello zaino dei passanti: generati uno alla volta (generatore), così la
// scena può prepararli in sottofondo un fotogramma per volta invece di bloccarsi al primo uso.
// Servono solo: h0-h7 (picchietta), m0-m4 (zaino dalla spalla alla mano) e c0-c5 (braccio indietro).
function* bareGen(scene, key) {
  const opts = SIDE_OPTS.get(key);
  if (!opts) return null;
  const bare = `${key}_bareM`;
  const bopts = { ...opts, pack: false };
  SIDE_OPTS.set(bare, bopts);
  const k = opts.scale ?? 1;
  const w = Math.round(BW * k);
  const h = Math.round(BH * k);
  const add = function* (name, o) {
    if (scene.textures.exists(name)) return;
    addHi(scene, name, sideFrame(w, h, k, 0, o));
    yield name;
  };
  for (let i = 0; i < 8; i++) yield* add(`${bare}_h${i}`, { ...bopts, walking: false, pack: false, hold: 1, tap: -2.5 + 2.5 * Math.cos((i / 8) * Math.PI * 2) });
  const blends = [0, 0.25, 0.5, 0.75, 1];
  for (let i = 0; i < 5; i++) yield* add(`${bare}_m${i}`, { ...bopts, walking: false, pack: false, blend: blends[i], tap: 0 });
  const poses = [[0.35, 0], [0.7, 0], [1, 0], [1, -3], [1, -5], [1, -2]];
  for (let i = 0; i < 6; i++) yield* add(`${key}_c${i}`, { ...opts, walking: false, reach: poses[i][0], tap: poses[i][1] });
  if (!scene.textures.exists("pack_item")) {
    addHi(scene, 
      "pack_item",
      finish(paint(30 * SS, 60 * SS, SS, (T) => packFlat(T.X, 4, 6), { seedValue: 11, cell: 1, raw: true }), { rim: false, outline: false, pad: 3 * SS })
    );
    yield "pack_item";
  }
  return bare;
}
export function bareOf(scene, key) {
  const g = bareGen(scene, key);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
// preparazione in sottofondo: ogni next() crea al massimo un fotogramma
export function warmBare(scene, key) {
  return bareGen(scene, key);
}

// fotogrammi "cura dello zaino": c0-c1 il braccio va indietro, c2-c5 picchietta la pianta
export function careFrames(scene, key) {
  const opts = SIDE_OPTS.get(key);
  if (!opts || scene.textures.exists(`${key}_c0`)) return key;
  const k = opts.scale ?? 1;
  const w = Math.round(BW * k);
  const h = Math.round(BH * k);
  const poses = [[0.35, 0], [0.7, 0], [1, 0], [1, -3], [1, -5], [1, -2]];
  poses.forEach(([reach, tap], i) => addHi(scene, `${key}_c${i}`, sideFrame(w, h, k, 0, { ...opts, walking: false, reach, tap })));
  return key;
}

// fotogrammi dello svenimento: d0 mano alla maschera, d1-d3 le ginocchia cedono
export function dieFrames(scene, key) {
  const opts = SIDE_OPTS.get(key);
  if (!opts || scene.textures.exists(`${key}_d0`)) return key;
  const k = opts.scale ?? 1;
  [[1, 0], [1, 0.35], [1, 0.7], [0.6, 1]].forEach(([clutch, crouch], i) =>
    addHi(scene, `${key}_d${i}`, sideFrame(Math.round(BW * k), Math.round(BH * k), k, 0, { ...opts, walking: false, clutch, crouch }))
  );
  return key;
}

// seduto sul divano (cutscene finale): s0-s3 = da in piedi a seduto
export const SIT_STEPS = [0.06, 0.17, 0.32, 0.5, 0.67, 0.81, 0.92, 1];
export function sitFrames(scene, key) {
  const opts = SIDE_OPTS.get(key);
  if (!opts || scene.textures.exists(`${key}_s0`)) return key;
  const k = opts.scale ?? 1;
  // 8 pose intermedie con andamento morbido (lento all'inizio e all'arrivo sulla seduta)
  SIT_STEPS.forEach((sit, i) =>
    addHi(scene, `${key}_s${i}`, sideFrame(Math.round(BW * k), Math.round(BH * k), k, 0, { ...opts, walking: false, sit }))
  );
  return key;
}

// zaino tolto e tenuto in mano davanti: fotogrammi h0-h3 (senza zaino addosso, la mano davanti
// picchietta la pianta) + l'immagine dello zaino da sola, da muovere a parte ("pack_item")
export function holdFrames(scene, bareKey) {
  const opts = SIDE_OPTS.get(bareKey);
  if (!opts) return bareKey;
  if (!scene.textures.exists(`${bareKey}_h0`)) {
    const k = opts.scale ?? 1;
    const make = (name, o) => addHi(scene, `${bareKey}_${name}`, sideFrame(Math.round(BW * k), Math.round(BH * k), k, 0, { ...opts, walking: false, pack: false, ...o }));
    // h0-h7: la mano picchietta la pianta con un ritmo morbido (seno)
    for (let i = 0; i < 8; i++) make(`h${i}`, { hold: 1, tap: -2.5 + 2.5 * Math.cos((i / 8) * Math.PI * 2) });
    // m0-m4: dalla mano sulla spalla alla presa davanti (lo zaino segue la mano)
    [0, 0.25, 0.5, 0.75, 1].forEach((v, i) => make(`m${i}`, { blend: v, tap: 0 }));
    // b1-b3: dalle braccia a riposo alla presa davanti (per prendere / posare lo zaino)
    [0.25, 0.5, 0.75].forEach((v, i) => make(`b${i + 1}`, { hold: v, tap: 0 }));
  }
  if (!scene.textures.exists("pack_item")) addHi(scene, 
      "pack_item",
      finish(paint(30 * SS, 60 * SS, SS, (T) => packFlat(T.X, 4, 6), { seedValue: 11, cell: 1, raw: true }), { rim: false, outline: false, pad: 3 * SS })
    );
  return bareKey;
}

// fotogrammi del ciclo di camminata: 12 invece di 8 per un passo più fluido
export const WALK_FRAMES = 12;
function makeSide(scene, key, opts) {
  SIDE_OPTS.set(key, opts);
  if (scene.textures.exists(`${key}_idle`)) return key;
  const k = opts.scale ?? 1;
  const w = Math.round(BW * k);
  const h = Math.round(BH * k);
  const make = (ph, walking) => sideFrame(w, h, k, ph, { ...opts, walking });
  for (let i = 0; i < WALK_FRAMES; i++) addHi(scene, `${key}_${i}`, make(i / WALK_FRAMES, true));
  addHi(scene, `${key}_idle`, make(0, false));
  return key;
}

// ---------------------------------------------------------------- catalogo

export const OPERATORS = [
  { id: "a", label: "OPERATORE A" },
  { id: "b", label: "OPERATRICE B" }
];

// abiti degli operatori per città
const OP_LOOK = {
  // MILANO: trench lungo da città (grigio-blu / cammello) con la cintura, cappello
  milano: { a: { hair: "short", hat: "cap", top: 0.42, hairTone: 0.1, garment: "trench" }, b: { hair: "long", top: 0.55, hairTone: 0.12, garment: "trench", coat: "#BCA88A" } },
  // NEW DELHI: caldo e smog: kurta di lino chiaro più corta, pantaloni leggeri, dupatta gialla
  delhi: { a: { hair: "short", top: 0.62, legs: 0.5, hairTone: 0.06, scarfT: 0.35, garment: "kurta", coat: "#DCE3EA", legC: "#8C96A6" }, b: { hair: "braid", hat: "scarf", top: 0.4, legs: 0.6, hairTone: 0.06, scarfT: 0.75, garment: "kurta", coat: "#E6DCCB", legC: "#5D6778" } },
  // REYKJAVÍK: freddo: piumino imbottito con le cuciture, cappuccio col pelo, berretto
  reykjavik: { a: { hair: "short", hat: "beanie", top: 0.38, hairTone: 0.7, hatT: 0.7, garment: "parka", coat: "#2F5A60" }, b: { hair: "long", hat: "beanie", top: 0.6, hairTone: 0.85, hatT: 0.3, garment: "parka", coat: "#E9E7E1" } }
};

// chiave delle texture dell'operatore nella città (bare = senza zaino, per la scena iniziale).
// Senza zaino, di default è anche senza maschera: la indossa solo con il BIONOMAD addosso
export function operatorKey(scene, id, city = "milano", { bare = false, mask = !bare } = {}) {
  const key = `op_${id}_${city}${bare ? "_bare" : ""}${bare && mask ? "_m" : ""}`;
  const look = OP_LOOK[city]?.[id] ?? OP_LOOK.milano.a;
  return makeSide(scene, key, { ...look, style: city, pack: !bare, ...(mask ? {} : { mask: false }) });
}

// passanti: ognuno diverso, con l'abito della città; alcuni bambini
export function npcKey(scene, city, i) {
  const r = rng(1000 + i * 97 + city.length * 13);
  const hairs = ["short", "long", "bun", "braid"];
  const hats = city === "reykjavik" ? ["beanie", "beanie", null] : city === "delhi" ? ["scarf", null, null] : ["cap", null, null];
  const opts = {
    style: city,
    hair: hairs[Math.floor(r() * hairs.length)],
    hat: hats[Math.floor(r() * hats.length)],
    top: 0.2 + r() * 0.5,
    legs: city === "delhi" ? 0.35 + r() * 0.35 : 0.1 + r() * 0.2,
    hairTone: r() < 0.25 && city === "reykjavik" ? 0.8 : 0.05 + r() * 0.3,
    hatT: 0.25 + r() * 0.5,
    scarfT: 0.4 + r() * 0.45,
    skin: 0.5 + r() * 0.2,
    scale: i % 4 === 3 ? 0.68 : 0.92 + r() * 0.1,
    pack: r() > 0.1
  };
  return makeSide(scene, `npc_${city}_${i}`, opts);
}

// il team nei crediti, di fronte
export const TEAM_LOOK = [
  { hair: "long", hairTone: 0.86, sweaterColor: "#8FB8D4", top: 0.3, legs: 0.08, earrings: true },
  { hair: "manbun", hairTone: 0.3, top: 0.9, legs: 0.75, beard: true, glasses: "round" },
  { hair: "long", hairTone: 0.3, hat: "cap", jacket: true, top: 0.35, legs: 0.08, tuft: true },
  { hair: "long", hairTone: 0.36, top: 0.12, legs: 0.3, skirt: true, earLocks: true, glasses: "round" },
  { hair: "long", hairTone: 0.55, balayage: true, frontLocks: true, glasses: "round", top: 0.2, stripes: true, legs: 0.3 },
  { hair: "long", hairTone: 0.14, top: 0.78, legs: 0.4, overalls: true }
];
const RUST = "#B4553F";
// ciuffo rosso morbido (curve, non blocchi di pixel)
function tuft(x, P) {
  x.fillStyle = RUST;
  x.beginPath();
  x.moveTo(...P(43, 24));
  x.quadraticCurveTo(...P(52, 18), ...P(63, 23));
  x.quadraticCurveTo(...P(56, 25), ...P(51, 30));
  x.quadraticCurveTo(...P(47, 26), ...P(43, 24));
  x.fill();
}

export function registerPeople(scene) {
  // solo l'operatore del menu: il resto si crea quando serve
  operatorKey(scene, "a", "milano");
}
