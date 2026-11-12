// arredi dell'ufficio: alcuni tipici del paese, altri pescati a caso a ogni visita,
// così lo stesso ufficio non è mai identico due volte
function decorateOffice(scene, originId, evening, { ac }) {
  const g = scene.add.graphics();
  const front = scene.add.graphics().setDepth(HORIZON + 1);
  const pick = (list, n) => Phaser.Utils.Array.Shuffle([...list]).slice(0, n);

  // tipici del paese
  if (originId === "delhi") {
    // ventilatore a soffitto che gira e ghirlanda di calendule sulla porta
    const fan = scene.add.container(480, 62);
    const hub = scene.add.rectangle(0, 0, 12, 8, COLORS.ink);
    const blades = scene.add.graphics();
    blades.fillStyle(0x6e5434, 1);
    blades.fillRect(-60, 2, 120, 4);
    fan.add([scene.add.rectangle(0, -8, 2, 10, COLORS.ink), blades, hub]);
    scene.tweens.add({ targets: blades, scaleX: { from: 1, to: -1 }, duration: 260, yoyo: true, repeat: -1 });
    for (let i = 0; i < 9; i += 1) pixelDisc(g, 34 + i * 10, 190 + Math.round(Math.sin((i / 8) * Math.PI) * 12), 4, i % 2 ? 0xe8a33d : 0xd9702b, 1, 2);
  } else if (originId === "reykjavik") {
    // lampada di design a sospensione e vaso con rami secchi
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(479, 50, 2, 40);
    pixelDisc(g, 480, 100, 18, 0xe8dccd, 1, 2);
    g.fillStyle(0xe8c66a, 0.6);
    g.fillRect(470, 112, 20, 4);
  } else {
    // macchina dell'espresso e lampada da tavolo
    drawPanel(front, 160, HORIZON - 64, 34, 36, { fill: COLORS.inkDeep, border: COLORS.ink });
    front.fillStyle(0xb4553f, 1);
    front.fillRect(168, HORIZON - 56, 18, 4);
    front.fillStyle(COLORS.paper, 1);
    front.fillRect(172, HORIZON - 40, 10, 8);
    front.fillStyle(COLORS.ink, 1);
    front.fillRect(840, HORIZON - 80, 4, 52);
    front.fillRect(820, HORIZON - 84, 30, 8);
    front.fillStyle(0xe8c66a, evening ? 0.8 : 0.4);
    front.fillRect(822, HORIZON - 76, 26, 4);
  }

  // a caso: due oggetti a parete e uno sul pavimento
  const wallSpots = [{ x: 180, y: 120 }, { x: 760, y: ac ? 140 : 110 }];
  const wallItems = {
    clock: (x, y) => {
      pixelDisc(g, x, y, 18, COLORS.ink, 1, 2);
      pixelDisc(g, x, y, 14, COLORS.paper, 1, 2);
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(x - 1, y - 10, 2, 10);
      g.fillRect(x, y - 1, 8, 2);
    },
    chart: (x, y) => {
      drawPanel(g, x - 44, y - 30, 88, 60, { fill: COLORS.paper, border: COLORS.ink });
      g.fillStyle(COLORS.steel, 1);
      [14, 24, 18, 34, 28, 40].forEach((h, i) => g.fillRect(x - 34 + i * 12, y + 22 - h, 8, h));
      g.fillStyle(COLORS.red, 1);
      g.fillRect(x - 36, y + 22, 72, 2);
    },
    shelf: (x, y) => {
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(x - 50, y + 20, 100, 4);
      [0xb4553f, 0x5e7f94, 0x7fae86, 0xdadfda, 0x163c4d, 0xe8c66a].forEach((c, i) => {
        g.fillStyle(c, 1);
        g.fillRect(x - 46 + i * 12, y - 4 + (i % 2) * 4, 10, 24 - (i % 2) * 4);
      });
    },
    frame: (x, y) => {
      drawPanel(g, x - 30, y - 34, 60, 68, { fill: 0xdfe7ea, border: COLORS.ink });
      scene.add.image(x, y + 26, "pot_plant").setOrigin(0.5, 1).setScale(3);
    }
  };
  pick(Object.keys(wallItems), wallSpots.length).forEach((name, i) => wallItems[name](wallSpots[i].x, wallSpots[i].y));

  const floorItems = {
    plant: () => scene.add.image(630, 440, "plant_tall").setOrigin(0.5, 1).setScale(4).setDepth(420),
    cooler: () => {
      const c = scene.add.graphics().setDepth(436);
      drawPanel(c, 600, 360, 40, 76, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 3 });
      drawPanel(c, 604, 320, 32, 42, { fill: 0x9fb4c2, border: COLORS.ink, borderWidth: 3 });
      c.fillStyle(COLORS.steel, 1);
      c.fillRect(610, 332, 20, 24);
    },
    bin: () => {
      const c = scene.add.graphics().setDepth(420);
      drawPanel(c, 610, 406, 28, 30, { fill: COLORS.steel, border: COLORS.ink, borderWidth: 3 });
    }
  };
  Phaser.Utils.Array.GetRandom(Object.values(floorItems))();
}

// lampione: palo con braccio curvo e plafoniera; di sera un cono di luce a gradini
// (bande sempre più larghe e tenui) e una pozza di luce a retino sul marciapiede
export function drawStreetLamp(scene, x, { evening = true, top = 214, ground = 380 } = {}) {
  const l = scene.add.graphics();
  const light = 0xe8c66a;
  if (evening) {
    const cone = scene.add.graphics();
    const steps = Math.floor((ground - top - 16) / 8);
    for (let i = 0; i < steps; i += 1) {
      const y = top + 18 + i * 8;
      const half = 10 + i * 4;
      const alpha = 0.2 - (i / steps) * 0.12;
      cone.fillStyle(light, alpha);
      cone.fillRect(x + 14 - half, y, half * 2, 8);
    }
    // pozza di luce: ellisse a retino sul pavimento, più fitta al centro
    ditherRect(cone, x - 50, ground, 128, 14, light, 2, 2, 0.45);
    ditherRect(cone, x - 24, ground + 2, 76, 10, light, 4, 2, 0.55);
    // tremolio leggero della lampada
    scene.tweens.add({ targets: cone, alpha: 0.82, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2600, hold: 60 });
  }
  // palo con base e braccio curvo
  l.fillStyle(COLORS.inkDeep, 1);
  l.fillRect(x - 3, top, 6, ground - top);
  l.fillRect(x - 7, ground - 10, 14, 10);
  l.fillRect(x - 1, top - 6, 4, 6);
  l.fillRect(x + 2, top - 8, 12, 4);
  l.fillRect(x + 12, top - 6, 4, 6);
  // plafoniera
  l.fillRect(x + 4, top, 20, 6);
  l.fillStyle(evening ? light : 0xdadfda, 1);
  l.fillRect(x + 6, top + 6, 16, 4);
  if (evening) {
    l.fillStyle(0xfff4d0, 1);
    l.fillRect(x + 10, top + 6, 8, 2);
    // falene che girano attorno alla luce
    for (let i = 0; i < 2; i += 1) {
      const moth = scene.add.rectangle(x + 14, top + 18, 2, 2, 0xdadfda);
      scene.tweens.add({ targets: moth, x: { from: x + 2 + i * 10, to: x + 26 - i * 8 }, duration: 700 + i * 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      scene.tweens.add({ targets: moth, y: { from: top + 14, to: top + 26 }, duration: 480 + i * 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }
  return l;
}

// location del gioco: ognuna ritorna floor, obstacles, points e spawn
import Phaser from "../phaser.js";
import { COLORS, bandGradient, ditherRect, drawPanel, pixelDisc } from "../ui/theme.js";
import { drawCityscape } from "./cityscape.js";
import { drawNotice, drawPurifier, sealWindow } from "./pollution.js";

const W = 960;
const HORIZON = 380;
export const FLOOR = [400, 482];

// oggetto "in piedi" sul pavimento
function standing(scene, baseY) {
  return scene.add.graphics().setDepth(baseY);
}

// cielo e skyline per origine

const SKY = {
  delhi: [0xe2d6bd, 0xd8c9a9, 0xcdbb98],
  milano: [0xe6e9e5, 0xd9dfe0, 0xc9d3d8],
  reykjavik: [0xeaf0f2, 0xd8e5ec, 0xc4d8e4]
};
const SKY_EVENING = [0x2c3e52, 0x25354a, 0x1f2c40];

export function drawBackdrop(scene, originId, { evening = false, sun = true, zone = "centro" } = {}) {
  drawCityscape(scene, originId, { evening, sun, zone });
}

// pavimenti

export function drawStreetFloor(scene, evening, width = W) {
  const g = scene.add.graphics();
  let seed = 977 + width;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const base = evening ? 0x6e7673 : COLORS.stone;
  const joint = evening ? 0x5f6663 : 0x959c99;
  const dark = evening ? 0x59605d : 0x8d9491;
  // marciapiede a lastre, con qualche lastra di tono diverso (rattoppi e usura)
  g.fillStyle(base, 1);
  g.fillRect(0, HORIZON, width, 160);
  for (let y = HORIZON; y < 540; y += 40) {
    const offset = ((y - HORIZON) / 40) % 2 ? 32 : 0;
    for (let x = offset - 64; x < width; x += 64) {
      const roll = rand();
      if (roll < 0.12) {
        g.fillStyle(dark, 1);
        g.fillRect(x + 2, y + 2, 62, 38);
      } else if (roll < 0.2) {
        ditherRect(g, x + 2, y + 2, 62, 38, dark, 3, 2);
      }
      // crepe
      if (rand() < 0.1) {
        g.fillStyle(joint, 1);
        let cx = x + 10 + Math.floor(rand() * 40);
        for (let cy = y + 4; cy < y + 36; cy += 2) {
          g.fillRect(cx, cy, 2, 2);
          cx += rand() < 0.5 ? 2 : -2;
        }
      }
    }
  }
  g.fillStyle(joint, 1);
  for (let y = HORIZON + 40; y < 540; y += 40) g.fillRect(0, y, width, 2);
  for (let y = HORIZON; y < 540; y += 40) {
    const offset = ((y - HORIZON) / 40) % 2 ? 32 : 0;
    for (let x = offset; x < width; x += 64) g.fillRect(x, y, 2, 40);
  }
  // percorso tattile per i non vedenti, lungo il marciapiede
  const tactile = evening ? 0x8f8a6a : 0xc9b98a;
  g.fillStyle(tactile, 1);
  g.fillRect(0, HORIZON + 22, width, 12);
  g.fillStyle(evening ? 0x77735a : 0xb3a374, 1);
  for (let x = 0; x < width; x += 8) g.fillRect(x + 2, HORIZON + 24 + ((x / 8) % 2) * 4, 4, 2);
  // polvere e particolato accumulati lungo il cordolo
  ditherRect(g, 0, HORIZON + 10, width, 10, evening ? 0x4f5654 : 0x8a8273, 3, 2);
  // tombini rotondi e griglie di scolo
  for (let x = 140; x < width; x += 420) {
    g.fillStyle(evening ? 0x4f5654 : 0x7f8784, 1);
    g.fillRect(x, 500, 28, 12);
    g.fillStyle(base, 1);
    for (let i = 0; i < 3; i += 1) g.fillRect(x + 4, 502 + i * 4, 20, 2);
  }
  for (let x = 360; x < width; x += 620) {
    pixelDisc(g, x, 470, 16, evening ? 0x4f5654 : 0x7f8784, 1, 2);
    pixelDisc(g, x, 470, 12, evening ? 0x5f6663 : 0x959c99, 1, 2);
    g.fillStyle(evening ? 0x4f5654 : 0x7f8784, 1);
    for (let i = -8; i <= 8; i += 4) g.fillRect(x - 10, 470 + i, 20, 1);
  }
  // foglie secche e rifiuti del nuovo mondo: filtri usati e mascherine buttate
  for (let i = 0; i < width / 50; i += 1) {
    const lx = Math.floor(rand() * width);
    const ly = HORIZON + 40 + Math.floor(rand() * 110);
    const kind = rand();
    if (kind < 0.6) {
      g.fillStyle(rand() < 0.5 ? 0x8a7f66 : 0xa88a5a, 1);
      g.fillRect(lx, ly, 4, 2);
      g.fillRect(lx + 2, ly + 2, 2, 2);
    } else if (kind < 0.8) {
      // filtro usato: cilindretto grigio con la ghiera scura
      g.fillStyle(0x9aa3ad, 1);
      g.fillRect(lx, ly, 8, 4);
      g.fillStyle(0x3f5a6c, 1);
      g.fillRect(lx, ly, 2, 4);
    } else {
      // mascherina buttata
      g.fillStyle(evening ? 0xb9bdb8 : 0xe6e6e0, 1);
      g.fillRect(lx, ly, 8, 4);
      g.fillStyle(0x7f8784, 1);
      g.fillRect(lx - 2, ly + 1, 2, 1);
      g.fillRect(lx + 8, ly + 1, 2, 1);
    }
  }
  // cordolo e ombra all'orizzonte
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, HORIZON - 4, width, 4);
  ditherRect(g, 0, HORIZON, width, 10, COLORS.inkDeep, 4);
  return g;
}

// materiali degli uffici per paese (la casa ha i suoi in decorateHome)
const OFFICE_THEMES = {
  milano: { wall: COLORS.bgSoft, wallDark: COLORS.panelLight, floorA: COLORS.paper, floorB: COLORS.panelLight, floor: "check", desk: COLORS.steel },
  delhi: { wall: 0xeadfc6, wallDark: 0xd6c6a3, floorA: 0xd9b48c, floorB: 0xc4956a, floor: "check", desk: 0x8f6a3e },
  reykjavik: { wall: 0xe4dccd, wallDark: 0xcbbfa8, floorA: 0xc9a77c, floorB: 0xb38e62, floor: "planks", desk: 0x7d5f41 }
};

function drawRoom(scene, evening, theme = OFFICE_THEMES.milano, { lamps: withLamps = true } = {}) {
  const g = scene.add.graphics();
  const dim = (c, t) => {
    const r = ((c >> 16) & 255) * t, gg = ((c >> 8) & 255) * t, b = (c & 255) * t;
    return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b);
  };
  const ev = (c) => (evening ? dim(c, 0.8) : c);
  const wall = ev(theme.wall);
  const wallDark = ev(theme.wallDark);
  // parete: più chiara in alto, più scura verso il pavimento (retino)
  g.fillStyle(wall, 1);
  g.fillRect(0, 46, W, HORIZON - 46);
  ditherRect(g, 0, HORIZON - 120, W, 60, wallDark, 3, 2);
  ditherRect(g, 0, HORIZON - 60, W, 46, wallDark, 7, 2);
  // pannelli della parete con giunti in rilievo
  for (let x = 0; x < W; x += 96) {
    g.fillStyle(wallDark, 1);
    g.fillRect(x, 46, 2, HORIZON - 60);
    g.fillStyle(evening ? 0xc8d0d2 : COLORS.paper, 1);
    g.fillRect(x + 2, 46, 1, HORIZON - 60);
  }
  // cornice a soffitto
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, 46, W, 4);
  ditherRect(g, 0, 50, W, 6, COLORS.ink, 4, 2);
  // battiscopa con filetto
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(0, HORIZON - 14, W, 14);
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(0, HORIZON - 14, W, 2);
  // pavimento a scacchi con riflesso sfumato verso il fondo
  g.fillStyle(ev(theme.floorA), 1);
  g.fillRect(0, HORIZON, W, 160);
  g.fillStyle(ev(theme.floorB), 1);
  if (theme.floor === "planks") {
    // parquet a doghe sfalsate
    for (let y = HORIZON; y < 540; y += 16) {
      g.fillRect(0, y, W, 2);
      for (let x = ((y / 16) % 3) * 40; x < W; x += 120) g.fillRect(x, y, 2, 16);
    }
  } else {
    for (let x = 0; x < W; x += 48) for (let y = HORIZON; y < 540; y += 48) if (((x + y - HORIZON) / 48) % 2 === 0) g.fillRect(x, y, 48, 48);
  }
  ditherRect(g, 0, HORIZON, W, 8, COLORS.inkDeep, 4);
  ditherRect(g, 0, HORIZON + 8, W, 16, COLORS.inkDeep, 1, 2);

  // plafoniere con cono di luce a retino
  const lamps = scene.add.graphics();
  (withLamps ? [240, 720] : []).forEach((lx) => {
    lamps.fillStyle(COLORS.ink, 1);
    lamps.fillRect(lx - 30, 50, 60, 6);
    lamps.fillStyle(evening ? 0xe8c66a : COLORS.paper, 1);
    lamps.fillRect(lx - 26, 56, 52, 4);
    for (let i = 0; i < 6; i += 1) ditherRect(lamps, lx - 28 - i * 10, 60 + i * 16, 56 + i * 20, 16, evening ? 0xe8c66a : 0xffffff, evening ? 3 - (i >> 1) : 2 - (i >> 2), 2, evening ? 0.5 : 0.6);
  });
  // granelli di polvere che fluttuano nella luce
  for (let i = 0; i < 14; i += 1) {
    const mote = scene.add.rectangle(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(80, HORIZON - 30), 2, 2, evening ? 0xe8c66a : COLORS.paper, 0.8).setDepth(HORIZON + 200);
    scene.tweens.add({ targets: mote, y: mote.y - Phaser.Math.Between(20, 50), x: mote.x + Phaser.Math.Between(-20, 20), alpha: { from: 0, to: 0.8 }, duration: Phaser.Math.Between(3000, 6000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000), ease: "Sine.easeInOut" });
  }
  return g;
}

// vista dalla finestra: piccola città a livelli, ferma, con foschia e riflesso sul vetro
export function windowView(scene, originId, win, { evening = false } = {}) {
  const pad = 140;
  const inner = { x: win.x + 6, y: win.y + 6, w: win.w - 12, h: win.h - 12 };
  const sky = scene.add.graphics();
  bandGradient(sky, inner.x, inner.y, inner.w, inner.h, evening ? SKY_EVENING : SKY[originId] ?? SKY.milano);
  if (!evening) pixelDisc(sky, inner.x + inner.w - 50, inner.y + 34, 14, COLORS.paper, 1, 2);
  else {
    sky.fillStyle(COLORS.paper, 0.8);
    for (let i = 0; i < 12; i += 1) sky.fillRect(inner.x + ((i * 53) % inner.w), inner.y + 6 + ((i * 29) % 50), 2, 2);
  }
  let seed = originId.length * 31 + (evening ? 7 : 0);
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pal = {
    far: evening ? 0x3a4f66 : originId === "delhi" ? 0xc9b896 : 0xb3c4cf,
    mid: evening ? 0x26374c : originId === "delhi" ? 0x9e8e70 : 0x7d9aad,
    near: evening ? 0x172231 : originId === "delhi" ? 0x766953 : 0x4f6f84,
    light: evening ? 0xe8c66a : 0xdfe7ea
  };
  // ogni livello è disegnato una volta in una texture più larga del vetro;
  // a ogni frame se ne mostra solo la parte che sta dietro la finestra (setCrop)
  const tw = inner.w + pad * 2;
  const layer = (key, factor, color, minH, maxH, windows) => {
    const tkey = `win_${originId}_${evening ? "e" : "d"}_${key}`;
    if (!scene.textures.exists(tkey)) {
      const l = scene.make.graphics({ add: false });
      for (let x = 0; x < tw; ) {
        const w = 18 + Math.floor(rand() * 34);
        const h = minH + Math.floor(rand() * (maxH - minH));
        l.fillStyle(color, 1);
        l.fillRect(x, inner.h - h, w, h);
        if (rand() < 0.3) l.fillRect(x + Math.floor(w / 2), inner.h - h - 12, 2, 12);
        if (windows) {
          l.fillStyle(pal.light, evening ? 0.9 : 0.5);
          for (let wy = inner.h - h + 6; wy < inner.h - 6; wy += 10) {
            for (let wx = x + 3; wx < x + w - 4; wx += 6) if (rand() < (evening ? 0.35 : 0.5)) l.fillRect(wx, wy, 2, 4);
          }
        }
        x += w + 2 + Math.floor(rand() * 6);
      }
      l.generateTexture(tkey, tw, inner.h);
      l.destroy();
    }
    const img = scene.add.image(inner.x - pad, inner.y, tkey).setOrigin(0, 0);
    img.setCrop(pad, 0, inner.w, inner.h);
    return { img, factor };
  };
  const layers = [layer("far", 0.04, pal.far, 50, 120, false), layer("mid", 0.1, pal.mid, 30, 90, true), layer("near", 0.2, pal.near, 14, 46, true)];
  // foschia a retino davanti alla città (più fitta dove l'aria è peggiore)
  const haze = scene.add.graphics();
  // smog color ocra/grigio: la città fuori è velata, più fitta dove l'aria è peggiore
  const smog = evening ? 0x4b5664 : originId === "delhi" ? 0xb09872 : 0x9a9d96;
  haze.fillStyle(smog, originId === "delhi" ? 0.35 : originId === "milano" ? 0.22 : 0.12);
  haze.fillRect(inner.x, inner.y, inner.w, inner.h);
  ditherRect(haze, inner.x, inner.y + Math.round(inner.h * 0.4), inner.w, Math.round(inner.h * 0.6), smog, originId === "delhi" ? 6 : originId === "milano" ? 4 : 2, 2, 0.6);
  // finestra sigillata: nastro sugli angoli, non si apre più
  sealWindow(haze, inner.x, inner.y, inner.w, inner.h);
  // riflesso sul vetro
  const glare = scene.add.graphics();
  glare.fillStyle(0xffffff, 0.25);
  for (let i = 0; i < 4; i += 1) glare.fillRect(inner.x + 20 + i * 4, inner.y + 10 + i * 8, 4, inner.h - 40 - i * 16);
  const maxShift = pad - 2;
  const onUpdate = () => {
    const px = W / 2;
    layers.forEach(({ img, factor }) => {
      const off = Phaser.Math.Clamp(Math.round((W / 2 - px) * factor), -maxShift, maxShift);
      img.x = inner.x - pad + off;
      img.setCrop(pad - off, 0, inner.w, inner.h);
    });
  };
  // vista ferma: la città dalla finestra non si muove col personaggio
  onUpdate();
  return { sky, layers, haze };
}

// elementi

function drawHub(scene, x, baseY, evening) {
  // hub BIODOM d'ufficio: mobile tecnico con schermo, serra in vetro con la pianta,
  // tubi dell'acqua, prese d'aria e spie che lampeggiano
  const g = standing(scene, baseY);
  ditherRect(g, x - 78, baseY - 2, 156, 10, COLORS.inkDeep, 7, 2);
  // mobile
  drawPanel(g, x - 70, baseY - 72, 140, 72, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 3 });
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(x - 67, baseY - 69, 134, 8);
  g.fillStyle(0xffffff, 1);
  g.fillRect(x - 67, baseY - 61, 134, 2);
  ditherRect(g, x - 67, baseY - 18, 134, 15, COLORS.panelLight, 8, 2);
  // prese d'aria a lato
  g.fillStyle(COLORS.ink, 1);
  for (let i = 0; i < 4; i += 1) g.fillRect(x + 38, baseY - 50 + i * 7, 22, 2);
  // schermo (usato dalla modalità notte)
  drawPanel(g, x - 30, baseY - 52, 60, 34, { fill: evening ? 0x2c566a : COLORS.inkDeep, border: COLORS.ink });
  g.fillStyle(evening ? 0xe8c66a : 0x7fae86, 1);
  g.fillRect(x - 22, baseY - 44, 30, 4);
  g.fillRect(x - 22, baseY - 34, 18, 4);
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(x + 12, baseY - 44, 10, 14);
  // piedini
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x - 64, baseY, 10, 4);
  g.fillRect(x + 54, baseY, 10, 4);
  // serra in vetro sopra il mobile
  const gx = x - 54;
  const gy = baseY - 150;
  g.fillStyle(0xdfe7ea, 0.55);
  g.fillRect(gx, gy, 72, 78);
  g.lineStyle(3, COLORS.ink, 1);
  g.strokeRect(gx, gy, 72, 78);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(gx - 4, gy - 6, 80, 6);
  g.fillRect(gx + 34, gy, 2, 78);
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(gx + 6, gy + 6, 3, 50);
  g.fillRect(gx + 12, gy + 6, 2, 30);
  // tubo che scende dalla serra al mobile
  g.fillStyle(COLORS.steel, 1);
  g.fillRect(gx + 78, gy + 20, 4, 60);
  g.fillRect(gx + 66, gy + 20, 16, 4);
  const plant = scene.add.image(gx + 36, gy + 76, "plant_tall").setOrigin(0.5, 1).setScale(3).setDepth(baseY);
  // spie: verde fissa e blu che pulsa
  const ledA = scene.add.rectangle(x - 56, baseY - 52, 6, 6, 0x7fae86).setDepth(baseY + 1);
  const ledB = scene.add.rectangle(x - 56, baseY - 40, 6, 6, 0x9fb4c2).setDepth(baseY + 1);
  scene.tweens.add({ targets: ledB, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: ledA, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1 });
  // bollicine d'ossigeno nella serra
  scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => {
      const bub = scene.add.rectangle(gx + 14 + Math.random() * 44, gy + 60, 4, 4, COLORS.paper).setStrokeStyle(1, COLORS.steel).setDepth(baseY + 1);
      scene.tweens.add({ targets: bub, y: gy + 10, alpha: 0, duration: 1600, onComplete: () => bub.destroy() });
    }
  });
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

function drawDesk(scene, x, evening, top = COLORS.steel) {
  const g = scene.add.graphics().setDepth(HORIZON);
  drawPanel(g, x + 60, HORIZON - 96, 100, 60, { fill: COLORS.inkDeep, border: COLORS.ink, borderWidth: 4 });
  g.fillStyle(evening ? 0x5e7f94 : COLORS.steelLight, 1);
  for (let i = 0; i < 3; i += 1) g.fillRect(x + 72, HORIZON - 84 + i * 12, 40 + ((i * 23) % 30), 4);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x + 104, HORIZON - 36, 12, 8);
  g.fillStyle(top, 1);
  g.fillRect(x, HORIZON - 28, 220, 16);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x, HORIZON - 12, 220, 4);
  g.fillRect(x + 8, HORIZON - 8, 10, 30);
  g.fillRect(x + 202, HORIZON - 8, 10, 30);
}

// location

export function buildOffice(scene, originId, { evening = false, ac = false } = {}) {
  const theme = OFFICE_THEMES[originId] ?? OFFICE_THEMES.milano;
  drawRoom(scene, evening, theme);
  const g = scene.add.graphics();

  // finestra sulla città
  const win = { x: 320, y: 80, w: 320, h: 170 };
  windowView(scene, originId, win, { evening });
  // telaio sopra la vista, davanzale e luce che entra sul pavimento
  const frame = scene.add.graphics();
  frame.lineStyle(6, COLORS.ink, 1);
  frame.strokeRect(win.x + 3, win.y + 3, win.w - 6, win.h - 6);
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(win.x + win.w / 2 - 2, win.y, 4, win.h);
  frame.fillRect(win.x - 10, win.y + win.h, win.w + 20, 8);
  frame.fillStyle(COLORS.steel, 1);
  frame.fillRect(win.x - 10, win.y + win.h, win.w + 20, 2);
  if (!evening) ditherRect(frame, win.x + 40, HORIZON + 10, win.w - 20, 60, 0xffffff, 3, 4, 0.6);

  drawDoor(g, 30, 196);
  // manifesto BIODOM appeso in ufficio
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(652, 128, 72, 98);
  scene.add.image(656, 132, "poster_2").setOrigin(0, 0);
  // purificatore d'aria sopra la porta e avviso del consorzio sulla conformità
  drawPurifier(scene, 40, 96, { evening });
  drawNotice(g, 246, 150, { evening });
  drawDesk(scene, 150, evening, theme.desk);
  drawDesk(scene, 690, evening, theme.desk);
  decorateOffice(scene, originId, evening, { ac });

  // archivio
  drawPanel(g, 900, 230, 52, HORIZON - 230, { fill: COLORS.stone, border: COLORS.ink, borderWidth: 3 });

  const hub = drawHub(scene, 480, 456, evening);

  // condizionatore a parete con aria fredda animata
  let acPoint = null;
  if (ac) {
    const a = scene.add.graphics().setDepth(HORIZON - 1);
    drawPanel(a, 740, 60, 150, 44, { fill: COLORS.paper, border: COLORS.ink });
    a.fillStyle(COLORS.steel, 1);
    for (let i = 0; i < 5; i += 1) a.fillRect(752 + i * 26, 92, 20, 4);
    for (let i = 0; i < 6; i += 1) {
      const wind = scene.add.rectangle(760 + i * 22, 112, 4, 14, COLORS.steelLight).setDepth(HORIZON);
      scene.tweens.add({ targets: wind, y: 190, alpha: 0, duration: 1100, delay: i * 180, repeat: -1 });
    }
    acPoint = { x: 815, y: 420 };
  }

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
      can: { x: 790, y: 450 },
      ...(acPoint ? { ac: acPoint } : {})
    }
  };
}

export function buildFoodTruck(scene, originId, { evening = false } = {}) {
  drawBackdrop(scene, originId, { evening, zone: "parco" });
  drawStreetFloor(scene, evening);

  // food truck BIODOM: carrozzeria a due toni con angoli arrotondati, tendalino a festoni,
  // bancone con bottiglie e tazze, menu, fari, paraurti, ruote con cerchi, luci a festone
  const t = standing(scene, 412);
  const tx = 540;
  const body = COLORS.paper;
  const lower = COLORS.steel;
  ditherRect(t, tx - 12, 402, 344, 14, COLORS.inkDeep, 7, 2);
  // carrozzeria
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx + 4, 224, 312, 176);
  t.fillRect(tx, 228, 320, 168);
  t.fillStyle(body, 1);
  t.fillRect(tx + 8, 230, 304, 110);
  t.fillRect(tx + 4, 234, 312, 104);
  t.fillStyle(lower, 1);
  t.fillRect(tx + 4, 340, 312, 52);
  // filetto ruggine e luce/ombra sulla lamiera
  t.fillStyle(COLORS.red, 1);
  t.fillRect(tx + 4, 336, 312, 4);
  t.fillStyle(0xffffff, 1);
  t.fillRect(tx + 10, 234, 296, 2);
  ditherRect(t, tx + 4, 372, 312, 20, COLORS.ink, 5, 2);
  // tetto: unità di raffreddamento e camino
  drawPanel(t, tx + 30, 206, 70, 20, { fill: COLORS.stone, border: COLORS.ink, borderWidth: 2 });
  t.fillStyle(COLORS.ink, 1);
  for (let i = 0; i < 6; i += 1) t.fillRect(tx + 36 + i * 10, 212, 6, 2);
  t.fillRect(tx + 250, 196, 10, 30);
  t.fillRect(tx + 246, 194, 18, 4);
  // insegna con logo
  drawPanel(t, tx + 116, 200, 120, 28, { fill: COLORS.ink, border: COLORS.inkDeep, borderWidth: 2 });
  // tendalino a strisce con festone
  for (let i = 0; i < 11; i += 1) {
    t.fillStyle(i % 2 ? COLORS.paper : COLORS.red, 1);
    t.fillRect(tx + 26 + i * 20, 240, 20, 18);
    pixelDisc(t, tx + 36 + i * 20, 258, 10, i % 2 ? COLORS.paper : COLORS.red, 1, 2);
  }
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx + 26, 238, 220, 2);
  // finestra di servizio con cornice e bancone
  drawPanel(t, tx + 36, 270, 208, 66, { fill: COLORS.inkDeep, border: COLORS.ink, borderWidth: 3 });
  ditherRect(t, tx + 40, 274, 200, 10, 0xe8c66a, evening ? 6 : 3, 2, 0.8);
  t.fillStyle(0xdadfda, 1);
  t.fillRect(tx + 28, 334, 224, 8);
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx + 28, 342, 224, 2);
  // bottiglie e tazze sul bancone
  [[52, 0x9fb4c2], [64, 0x9fb4c2], [210, 0xb4553f], [224, 0xf1f0ed]].forEach(([dx, c], i) => {
    t.fillStyle(c, 1);
    if (i < 2) {
      t.fillRect(tx + dx, 318, 6, 16);
      t.fillRect(tx + dx + 2, 314, 2, 4);
    } else {
      t.fillRect(tx + dx, 326, 8, 8);
      t.fillRect(tx + dx + 8, 328, 2, 4);
    }
  });
  // menu a lavagna sul lato
  drawPanel(t, tx + 258, 254, 44, 56, { fill: 0x2c3e52, border: COLORS.ink, borderWidth: 2 });
  t.fillStyle(COLORS.paper, 1);
  for (let i = 0; i < 5; i += 1) t.fillRect(tx + 264, 262 + i * 9, 20 + ((i * 7) % 12), 2);
  t.fillStyle(0xe8c66a, 1);
  t.fillRect(tx + 290, 262, 6, 2);
  // fari, frecce e paraurti
  t.fillStyle(0xe8c66a, 1);
  t.fillRect(tx + 306, 352, 8, 10);
  t.fillStyle(COLORS.red, 1);
  t.fillRect(tx + 6, 352, 6, 10);
  t.fillStyle(COLORS.ink, 1);
  t.fillRect(tx - 4, 386, 328, 6);
  // passaruota e ruote con cerchi
  [tx + 64, tx + 250].forEach((wx) => {
    pixelDisc(t, wx, 396, 28, COLORS.ink, 1, 2);
    pixelDisc(t, wx, 400, 22, 0x1c2028, 1, 2);
    pixelDisc(t, wx, 400, 12, COLORS.stone, 1, 2);
    pixelDisc(t, wx, 400, 6, COLORS.steel, 1, 2);
    t.fillStyle(0x1c2028, 1);
    t.fillRect(wx - 1, 392, 2, 16);
    t.fillRect(wx - 8, 399, 16, 2);
  });
  // colonnina di ricarica BIODOM con cavo e spia
  drawPanel(t, tx + 330, 296, 30, 104, { fill: COLORS.ink, border: COLORS.inkDeep, borderWidth: 2 });
  drawPanel(t, tx + 334, 306, 22, 20, { fill: 0x2c3e52, border: COLORS.inkDeep, borderWidth: 2 });
  t.fillStyle(COLORS.red, 1);
  t.fillRect(tx + 342, 294, 6, 2);
  t.fillStyle(COLORS.steel, 1);
  for (let i = 0; i < 6; i += 1) t.fillRect(tx + 326 - i * 2, 340 + i * 6, 2, 6);
  const led = scene.add.rectangle(tx + 345, 316, 10, 6, 0x7fae86).setDepth(413);
  scene.tweens.add({ targets: led, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  // luci a festone sopra il bancone
  for (let i = 0; i < 9; i += 1) {
    const bx = tx + 40 + i * 24;
    const by = 230 + Math.round(Math.sin((i / 8) * Math.PI) * 6);
    const bulb = scene.add.rectangle(bx, by, 4, 4, 0xe8c66a).setDepth(413);
    if (evening) scene.tweens.add({ targets: bulb, alpha: 0.5, duration: 400 + i * 90, yoyo: true, repeat: -1 });
  }
  // cartello a cavalletto davanti
  const sign = standing(scene, 430);
  sign.fillStyle(COLORS.ink, 1);
  sign.fillRect(tx - 40, 394, 4, 36);
  sign.fillRect(tx - 14, 394, 4, 36);
  drawPanel(sign, tx - 46, 380, 42, 36, { fill: 0x2c3e52, border: COLORS.ink, borderWidth: 2 });
  sign.fillStyle(COLORS.paper, 1);
  sign.fillRect(tx - 40, 388, 24, 2);
  sign.fillRect(tx - 40, 396, 18, 2);
  sign.fillStyle(0x7fae86, 1);
  sign.fillRect(tx - 40, 404, 12, 4);

  if (scene.textures.exists("logo_biodom")) scene.add.image(tx + 176, 214, "logo_biodom").setTint(COLORS.paper).setDepth(413);
  // anche dentro il truck c'è l'hub: la piantina che tiene respirabile l'aria del bancone
  const truckHub = scene.add.image(tx + 94, 334, "home_hub").setOrigin(0.5, 1).setScale(2).setDepth(412);
  const hubLed = scene.add.rectangle(tx + 118, 324, 4, 2, 0x9fd4b0).setDepth(412);
  scene.tweens.add({ targets: hubLed, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
  scene.time.addEvent({
    delay: 900,
    loop: true,
    callback: () => {
      const p = scene.add.rectangle(tx + 86 + Math.random() * 16, 304, 2, 2, 0xdff2e4, 0.9).setDepth(412);
      scene.tweens.add({ targets: p, y: 284, alpha: 0, duration: 1300, onComplete: () => p.destroy() });
    }
  });
  // il venditore lavora con la mascherina
  const vendor = scene.add.image(tx + 140, 338, "npc_vendor_mask").setOrigin(0.5, 1).setScale(3).setDepth(413);
  vendor.setCrop(0, 0, 14, 16);

  // panchina
  const b = standing(scene, 452);
  ditherRect(b, 106, 448, 168, 8, COLORS.inkDeep, 5);
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
      charger: { x: tx + 345, y: 430 },
      bench: { x: 190, y: 454 }
    },
    benchSeat: { x: 190, y: 430 }
  };
}

// strada generica (usata nella sequenza di game over)
export function buildStreet(scene, originId, { evening = false, sun = true, zone = "industriale" } = {}) {
  drawBackdrop(scene, originId, { evening, sun, zone });
  drawStreetFloor(scene, evening);
  return { floor: FLOOR, spawn: { x: 60, y: 450 }, obstacles: [], points: {} };
}

export function buildBusStop(scene, originId, { evening = true } = {}) {
  drawBackdrop(scene, originId, { evening, zone: "residenziale" });
  drawStreetFloor(scene, evening);

  // pensilina moderna: tetto piatto scuro su quattro montanti, tre pannelli pubblicitari
  // (due larghi e uno stretto con il manifesto BIODOM), due panchine in legno, marciapiede rialzato
  const s = standing(scene, 410);
  const steel = 0x2c3236;
  const L = 220;
  const R = 740;
  // marciapiede a cubetti con cordolo
  s.fillStyle(evening ? 0x9aa3ad : 0xcdd2ce, 1);
  s.fillRect(L - 30, 396, R - L + 60, 14);
  s.fillStyle(evening ? 0x7e8683 : 0xa3a9a6, 1);
  for (let x = L - 30; x < R + 30; x += 16) s.fillRect(x, 396, 2, 14);
  s.fillRect(L - 30, 408, R - L + 60, 2);
  // montanti
  s.fillStyle(steel, 1);
  [L + 10, 452, 548, R - 18].forEach((px) => s.fillRect(px, 228, 8, 170));
  // tetto con travetti e bordo
  s.fillStyle(steel, 1);
  s.fillRect(L - 20, 212, R - L + 40, 8);
  s.fillStyle(0x4a5257, 1);
  s.fillRect(L - 14, 220, R - L + 28, 6);
  s.fillStyle(steel, 1);
  for (let x = L; x < R; x += 70) s.fillRect(x, 220, 30, 4);
  s.fillRect(L + 10, 236, R - L - 20, 4); // traversa
  // pannelli: cornice scura, fondo chiaro retroilluminato
  const panels = [[L + 30, 246, 196, 108], [468, 246, 64, 108], [560, 246, 160, 108]];
  panels.forEach(([px, py, pw, ph]) => {
    s.fillStyle(steel, 1);
    s.fillRect(px - 4, py - 4, pw + 8, ph + 8);
    s.fillStyle(evening ? 0xe8e4d4 : COLORS.paper, 1);
    s.fillRect(px, py, pw, ph);
    ditherRect(s, px, py, pw, 12, 0xffffff, 6, 2, 0.6);
    ditherRect(s, px, py + ph - 14, pw, 14, COLORS.panelLight, 5, 2);
  });
  // contenuti: manifesto BIODOM al centro, logo e slogan nei pannelli larghi
  scene.add.image(500, 300, "poster_1").setDisplaySize(64, 100).setDepth(411);
  // manifesti delle tavole del progetto: "Each breath is a choice" e il diagramma Symbiosis
  scene.add.image(panels[0][0], panels[0][1], "poster_4").setOrigin(0, 0).setDisplaySize(panels[0][2], panels[0][3]).setDepth(411);
  scene.add.image(panels[2][0], panels[2][1], "poster_5").setOrigin(0, 0).setDisplaySize(panels[2][2], panels[2][3]).setDepth(411);
  // il diagramma viene ridisegnato sopra in pixel, così le scritte restano leggibili
  {
    const [px, py] = panels[2];
    const d = scene.add.graphics().setDepth(412);
    const lab = (tx, ty, text, size = 13, color = "#f1f0ed") =>
      scene.add.text(px + tx, py + ty, text, { fontFamily: '"VT323", monospace', fontSize: `${size}px`, color }).setDepth(413);
    // le linee passano sempre sotto o sopra le parole, mai attraverso
    const top = lab(30, 14, "Life preservation");
    const care = lab(8, 60, "Care");
    const commit = lab(100, 88, "Commitment");
    lab(4, 2, "[01]", 11, "#9fb4c2");
    const lineY = py + 14 + top.height + 3;
    const leftX = px + 18;
    const rightX = px + 124;
    d.fillStyle(COLORS.paper, 0.9);
    d.fillRect(leftX, lineY, rightX - leftX + 1, 1);
    d.fillRect(leftX, lineY, 1, care.y - lineY - 3);
    // chip SYMBIOSIS sul ramo destro (copre anche il residuo chiaro dello sfondo)
    const chipY = py + 44;
    d.fillRect(rightX, lineY, 1, chipY - lineY);
    d.fillStyle(0xdadfda, 1);
    d.fillRect(px + 94, chipY, 60, 12);
    lab(98, 44, "SYMBIOSIS", 11, "#163c4d");
    d.fillStyle(COLORS.paper, 0.9);
    d.fillRect(rightX, chipY + 12, 1, commit.y - (chipY + 12) - 3);
  }
  if (evening) {
    panels.forEach(([px, py, pw, ph]) => {
      const glow = scene.add.rectangle(px + pw / 2, py + ph / 2, pw + 16, ph + 16, 0xe8e4d4, 0.12).setDepth(409);
      scene.tweens.add({ targets: glow, alpha: 0.5, duration: 1600, yoyo: true, repeat: -1 });
    });
  }
  // panchine: seduta in legno e gambe in metallo
  const bench = standing(scene, 412);
  [[300, 120], [575, 120]].forEach(([bx, bw]) => {
    bench.fillStyle(0xb39572, 1);
    bench.fillRect(bx, 372, bw, 8);
    bench.fillStyle(0x8f775b, 1);
    bench.fillRect(bx, 378, bw, 2);
    bench.fillStyle(0x9aa3ad, 1);
    bench.fillRect(bx + 6, 380, 4, 18);
    bench.fillRect(bx + bw - 10, 380, 4, 18);
  });
  // palina con il numero della linea, piccola e accanto alla pensilina
  const pole = standing(scene, 432);
  pole.fillStyle(steel, 1);
  pole.fillRect(R + 40, 250, 4, 180);
  drawPanel(pole, R + 24, 230, 36, 36, { fill: COLORS.ink, border: steel, borderWidth: 2 });
  scene.add.text(R + 42, 248, "92", { fontFamily: '"VT323", monospace', fontSize: "22px", color: "#f1f0ed" }).setOrigin(0.5).setDepth(433);

  // lampione acceso
  drawStreetLamp(scene, 153, { evening });

  return {
    floor: FLOOR,
    spawn: { x: 60, y: 450 },
    obstacles: [
      { x: 300, y: 396, w: 120, h: 14 }, // panchine
      { x: 575, y: 396, w: 120, h: 14 },
      { x: 778, y: 420, w: 10, h: 12 } // palina
    ],
    points: {
      man: { x: 760, y: 450 }
    },
    busLabel: { x: 782, y: 248 }
  };
}

export function buildHouse(scene, { evening = false, originId = "milano" } = {}) {
  // in casa niente plafoniere da ufficio: ogni casa ha la sua luce (lampadario, ventilatore, sospensione)
  drawRoom(scene, evening, undefined, { lamps: false });
  decorateHome(scene, originId, evening);
  // purificatore d'aria: in casa si respira solo grazie ai filtri
  const pur = { milano: [540, 104], delhi: [540, 104], reykjavik: [270, 96] }[originId] ?? [540, 104];
  drawPurifier(scene, pur[0], pur[1], { evening });
  const hub = drawHomeHub(scene, 60, 396, originId, evening);
  const g = scene.add.graphics();
  drawHomeDoor(g, originId);
  const packY = furnishHome(scene, g, originId, evening);

  return {
    floor: FLOOR,
    spawn: { x: 420, y: 440 },
    hub,
    obstacles: [{ x: hub.x, y: 380, w: hub.w, h: 24 }, { x: 606, y: 384, w: 108, h: 20 }],
    points: {
      pack: { x: 660, y: packY },
      door: { x: 882, y: 410 },
      hub: { x: hub.center, y: 432 }
    },
    door: { x: 840, top: 196 }
  };
}

// porta di casa diversa per paese (stessa posizione: 840, alta da 196 al pavimento)
function drawHomeDoor(g, originId) {
  const x = 840;
  const top = 196;
  const h = HORIZON - top;
  if (originId === "delhi") {
    // doppia porta in legno intagliato con arco, borchie d'ottone e toran sopra
    g.fillStyle(0x4a3826, 1);
    g.fillRect(x - 6, top - 10, 96, h + 10);
    pixelDisc(g, x + 42, top - 6, 48, 0x4a3826, 1, 2);
    g.fillStyle(0x7a5532, 1);
    g.fillRect(x, top, 84, h);
    pixelDisc(g, x + 42, top + 2, 40, 0x7a5532, 1, 2);
    g.fillStyle(0x5a3a20, 1);
    g.fillRect(x + 41, top - 30, 2, h + 30);
    g.fillStyle(0xc9a24a, 1);
    for (let yy = top + 10; yy < HORIZON - 10; yy += 18) [x + 10, x + 30, x + 54, x + 74].forEach((bx) => g.fillRect(bx, yy, 3, 3));
    g.fillRect(x + 34, top + 90, 4, 8);
    g.fillRect(x + 46, top + 90, 4, 8);
    for (let i = 0; i < 8; i += 1) pixelDisc(g, x - 2 + i * 13, top - 46 + Math.round(Math.sin((i / 7) * Math.PI) * 6), 4, i % 2 ? 0x5c8a4e : 0xe8a33d, 1, 2);
    return;
  }
  if (originId === "reykjavik") {
    // porta dipinta di blu con oblò e cornice bianca, come le case islandesi
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(x - 6, top - 6, 96, h + 6);
    g.fillStyle(0x3b6fb0, 1);
    g.fillRect(x, top, 84, h);
    g.fillStyle(0x2a5590, 1);
    g.fillRect(x + 10, top + 76, 64, 2);
    g.fillRect(x + 10, top + 120, 64, 2);
    pixelDisc(g, x + 42, top + 36, 18, COLORS.paper, 1, 2);
    pixelDisc(g, x + 42, top + 36, 14, 0x9fb4c2, 1, 2);
    g.fillStyle(0xe8c66a, 1);
    g.fillRect(x + 70, top + 96, 6, 6);
    return;
  }
  // milano: portoncino blindato in noce a pannelli con maniglia d'ottone e spioncino
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x - 6, top - 6, 96, h + 6);
  g.fillStyle(0x6e5434, 1);
  g.fillRect(x, top, 84, h);
  g.fillStyle(0x5a4430, 1);
  [[x + 10, top + 12, 64, 64], [x + 10, top + 88, 64, 82]].forEach(([px, py, pw, ph]) => {
    g.fillRect(px, py, pw, ph);
    g.fillStyle(0x7e6040, 1);
    g.fillRect(px + 4, py + 4, pw - 8, ph - 8);
    g.fillStyle(0x5a4430, 1);
  });
  g.fillStyle(0xc9a24a, 1);
  g.fillRect(x + 66, top + 92, 10, 4);
  g.fillRect(x + 40, top + 40, 4, 4);
}

// arredi dell'ingresso diversi per ogni paese (niente oggetti ripetuti tra le case).
// Ritorna l'altezza del piano su cui è appoggiato lo zaino
function furnishHome(scene, g, originId, evening) {
  const front = (y) => standing(scene, y);
  if (originId === "delhi") {
    // chowki: panca bassa in legno intagliato con la lota d'ottone; sandali lasciati all'ingresso;
    // vaso di tulsi; calendario appeso; cuscini a terra
    const c = front(404);
    ditherRect(c, 606, 398, 112, 6, COLORS.inkDeep, 6, 2);
    c.fillStyle(0x5a3a20, 1);
    c.fillRect(606, 370, 108, 8);
    c.fillStyle(0x7a5532, 1);
    c.fillRect(608, 366, 104, 6);
    for (let lx = 612; lx < 712; lx += 24) c.fillRect(lx, 378, 6, 22);
    c.fillStyle(0xc9a24a, 1);
    for (let lx = 620; lx < 708; lx += 12) c.fillRect(lx, 380, 4, 2);
    pixelDisc(c, 700, 358, 7, 0xc9a24a, 1, 2);
    c.fillRect(697, 348, 6, 4);
    const shoes = front(428);
    shoes.fillStyle(0x6e4a2a, 1);
    [[852, 420], [870, 424], [892, 418]].forEach(([sx, sy]) => shoes.fillRect(sx, sy, 14, 6));
    shoes.fillStyle(0xb4553f, 1);
    [[854, 418], [872, 422], [894, 416]].forEach(([sx, sy]) => shoes.fillRect(sx + 4, sy, 6, 2));
    const tulsi = front(430);
    tulsi.fillStyle(0xc98552, 1);
    tulsi.fillRect(752, 400, 30, 30);
    tulsi.fillStyle(0xb06a35, 1);
    tulsi.fillRect(748, 396, 38, 6);
    for (let i = 0; i < 9; i += 1) pixelDisc(tulsi, 756 + (i % 3) * 10, 372 + Math.floor(i / 3) * 8, 5, i % 2 ? 0x5c8a4e : 0x2f5e4a, 1, 2);
    // calendario a muro
    drawPanel(g, 284, 100, 36, 46, { fill: COLORS.paper, border: 0x6e4a2a, borderWidth: 2 });
    g.fillStyle(0xb4553f, 1);
    g.fillRect(286, 102, 32, 12);
    g.fillStyle(0x6e4a2a, 1);
    for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) g.fillRect(290 + k * 7, 120 + r * 6, 3, 2);
    // cuscini a terra
    const cushions = front(470);
    [[300, 0xb4553f], [340, 0xe8c66a]].forEach(([cx, col]) => {
      cushions.fillStyle(col, 1);
      cushions.fillRect(cx, 452, 34, 16);
      cushions.fillStyle(0x6e2a26, 1);
      cushions.fillRect(cx, 466, 34, 2);
    });
    return 366;
  }
  if (originId === "reykjavik") {
    // panca per le scarpe in legno chiaro con gli scarponi, ganci a muro con parka e berretto di lana,
    // candele alla finestra, lampada scandinava a sospensione
    const c = front(404);
    ditherRect(c, 606, 398, 112, 6, COLORS.inkDeep, 6, 2);
    c.fillStyle(0x8f775b, 1);
    c.fillRect(606, 356, 108, 6);
    c.fillStyle(0xc8b089, 1);
    c.fillRect(608, 352, 104, 6);
    c.fillRect(612, 362, 6, 38);
    c.fillRect(702, 362, 6, 38);
    c.fillRect(612, 380, 96, 4);
    c.fillStyle(0x3a2a20, 1);
    c.fillRect(630, 388, 16, 12);
    c.fillRect(650, 388, 16, 12);
    c.fillStyle(0xf1f0ed, 1);
    c.fillRect(630, 386, 16, 2);
    c.fillRect(650, 386, 16, 2);
    // ganci con parka e berretto
    g.fillStyle(0x8f775b, 1);
    g.fillRect(780, 236, 56, 6);
    g.fillStyle(0xb4553f, 1);
    g.fillRect(786, 242, 20, 56);
    g.fillStyle(0x8a3e2e, 1);
    g.fillRect(786, 290, 20, 8);
    g.fillStyle(0xdadfda, 1);
    g.fillRect(814, 242, 16, 12);
    g.fillStyle(0x5e7f94, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(816 + i * 4, 246, 2, 6);
    // candele sul davanzale
    [410, 420, 470].forEach((cx, i) => {
      g.fillStyle(0xf1f0ed, 1);
      g.fillRect(cx, 222 - i * 2, 6, 10 + i * 2);
      const f = scene.add.rectangle(cx + 3, 218 - i * 2, 2, 4, 0xe8c66a);
      scene.tweens.add({ targets: f, alpha: 0.5, duration: 260 + i * 70, yoyo: true, repeat: -1 });
    });
    // lampada a sospensione a petali
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(299, 46, 2, 70);
    for (let i = 0; i < 4; i += 1) {
      g.fillStyle(i % 2 ? 0xf1f0ed : 0xdadfda, 1);
      g.fillRect(284 + i * 2, 116 + i * 6, 32 - i * 4, 6);
    }
    if (evening) ditherRect(g, 270, 140, 60, 120, 0xe8c66a, 2, 2, 0.6);
    return 352;
  }
  // milano: consolle in noce con svuotatasche, lampada ad arco, citofono, ficus in vaso
  const c = front(404);
  ditherRect(c, 606, 398, 112, 6, COLORS.inkDeep, 6, 2);
  c.fillStyle(0x4a3826, 1);
  c.fillRect(606, 352, 108, 8);
  c.fillStyle(0x6e5434, 1);
  c.fillRect(608, 348, 104, 6);
  c.fillRect(614, 360, 6, 40);
  c.fillRect(700, 360, 6, 40);
  c.fillRect(618, 380, 84, 4);
  c.fillStyle(COLORS.stone, 1);
  c.fillRect(690, 342, 16, 6);
  c.fillStyle(0xe8c66a, 1);
  c.fillRect(694, 340, 6, 2);
  // lampada da terra classica: base tonda in ottone, stelo dritto, paralume a tamburo in tessuto
  const lamp = front(402);
  lamp.fillStyle(0x9a7a3a, 1);
  lamp.fillRect(320, 394, 28, 6);
  lamp.fillRect(326, 390, 16, 4);
  lamp.fillStyle(0xc9a24a, 1);
  lamp.fillRect(332, 250, 4, 140);
  lamp.fillRect(330, 300, 8, 4);
  // paralume: trapezio a gradini con bordo
  for (let i = 0; i < 9; i += 1) {
    lamp.fillStyle(evening ? 0xf0dca0 : 0xe8dccd, 1);
    lamp.fillRect(316 - i, 214 + i * 4, 36 + i * 2, 4);
  }
  lamp.fillStyle(evening ? 0xd8bc78 : 0xcdbfae, 1);
  lamp.fillRect(307, 250, 54, 2);
  lamp.fillRect(316, 214, 36, 2);
  if (evening) {
    ditherRect(lamp, 300, 252, 68, 140, 0xe8c66a, 2, 2, 0.6);
    ditherRect(lamp, 310, 190, 48, 24, 0xe8c66a, 3, 2, 0.6);
  }
  // citofono accanto alla porta
  drawPanel(g, 812, 250, 18, 30, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 2 });
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(816, 256, 10, 6);
  g.fillRect(816, 268, 4, 4);
  // ficus in vaso di terracotta
  const ficus = front(430);
  ficus.fillStyle(0xb06a35, 1);
  ficus.fillRect(750, 404, 28, 26);
  ficus.fillStyle(0x6e4a2a, 1);
  ficus.fillRect(763, 368, 2, 36);
  for (let i = 0; i < 10; i += 1) pixelDisc(ficus, 752 + (i % 4) * 8, 344 + Math.floor(i / 4) * 10, 7, i % 3 ? 0x2f5e4a : 0x5c8a4e, 1, 2);
  return 348;
}

// materiali dell'Home Hub in base al paese
const HUB_MATERIALS = {
  delhi: { frame: 0x7a5532, trim: 0xc9a24a, base: 0x6e4a2a, panel: 0x5a3a20 },
  milano: { frame: 0x5d6d7e, trim: 0xc9d6de, base: 0x3f5a6c, panel: 0x2c3e52 },
  reykjavik: { frame: 0xc8b089, trim: 0xf1f0ed, base: 0x9e8e70, panel: 0x7e8683 }
};

// home Hub: vetrina con il bonsai, luce in alto e base con display, manopole e pozzetto
export function drawHomeHub(scene, x, bottom, originId = "milano", evening = false) {
  const m = HUB_MATERIALS[originId] ?? HUB_MATERIALS.milano;
  const w = 200;
  const baseH = 70;
  const glassH = 196;
  const top = bottom - baseH - glassH - 10;
  const g = scene.add.graphics().setDepth(bottom - 10);

  ditherRect(g, x - 6, bottom - 4, w + 12, 10, COLORS.inkDeep, 6);

  // luce in alto
  g.fillStyle(m.frame, 1);
  g.fillRect(x, top, w, 10);
  g.fillStyle(m.trim, 1);
  g.fillRect(x + 4, top + 8, w - 8, 2);

  // vetrina con il cono di luce
  const glass = { x: x + 6, y: top + 16, w: w - 12, h: glassH - 12 };
  g.fillStyle(m.frame, 1);
  g.fillRect(x, top + 10, w, glassH);
  g.fillStyle(evening ? 0x2c3e52 : 0xdfe7ea, 1);
  g.fillRect(glass.x, glass.y, glass.w, glass.h);
  for (let i = 0; i < 10; i += 1) {
    g.fillStyle(0xf1f0ed, evening ? 0.12 : 0.35);
    g.fillRect(x + 70 - i * 3, glass.y + i * 12, 60 + i * 6, 12);
  }

  // bonsai
  const cx = x + w / 2;
  const potY = glass.y + glass.h - 26;
  g.fillStyle(COLORS.stone, 1);
  g.fillRect(cx - 34, potY, 68, 12);
  g.fillStyle(0x6e7673, 1);
  g.fillRect(cx - 30, potY + 12, 60, 6);
  g.fillStyle(0x6e5434, 1);
  [[0, 0], [-2, -6], [-4, -12], [-3, -18], [0, -24], [4, -30], [6, -36], [3, -42]].forEach(([dx, dy]) => g.fillRect(cx + dx - 4, potY + dy - 6, 8, 6));
  g.fillRect(cx - 18, potY - 34, 18, 4);
  g.fillRect(cx + 6, potY - 22, 16, 4);
  [[cx - 4, potY - 66, 26], [cx - 34, potY - 46, 18], [cx + 28, potY - 40, 18], [cx + 16, potY - 70, 16]].forEach(([px, py, r]) => {
    pixelDisc(g, px, py, r, 0x5c7a6b, 1, 2);
    ditherRect(g, px - r, py + r / 3, r * 2, r / 2, 0x3f6560, 6);
    pixelDisc(g, px - r / 3, py - r / 3, r / 3, 0x7e9c8c, 1, 2);
  });

  // riflessi sul vetro e montanti
  g.fillStyle(0xf1f0ed, evening ? 0.25 : 0.7);
  for (let i = 0; i < 12; i += 1) g.fillRect(glass.x + 10 + i * 2, glass.y + 8 + i * 4, 2, 4);
  g.fillRect(glass.x + glass.w - 14, glass.y + 10, 2, 60);
  g.fillStyle(m.trim, 1);
  g.fillRect(x, top + 10, 2, glassH);
  g.fillRect(x + w - 2, top + 10, 2, glassH);

  // base con display, manopole, pozzetto fiale e griglia
  const by = top + 10 + glassH;
  g.fillStyle(m.base, 1);
  g.fillRect(x, by, w, baseH);
  g.fillStyle(m.trim, 1);
  g.fillRect(x, by, w, 3);
  g.fillStyle(m.panel, 1);
  g.fillRect(x + 10, by + 12, w - 20, 40);
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x + 18, by + 18, 48, 26);
  g.fillStyle(0x9fd4b0, 1);
  g.fillRect(x + 22, by + 22, 30, 3);
  g.fillRect(x + 22, by + 28, 20, 3);
  g.fillRect(x + 22, by + 34, 36, 3);
  [x + 84, x + 106].forEach((kx) => {
    pixelDisc(g, kx, by + 32, 8, m.trim, 1, 2);
    g.fillStyle(COLORS.inkDeep, 1);
    g.fillRect(kx - 1, by + 25, 2, 6);
  });
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x + 128, by + 20, 12, 24);
  g.fillRect(x + 146, by + 20, 12, 24);
  g.fillStyle(COLORS.red, 1);
  g.fillRect(x + 172, by + 22, 6, 6);
  g.fillStyle(m.panel, 1);
  for (let i = 0; i < 6; i += 1) g.fillRect(x + 20 + i * 28, by + 58, 20, 3);
  g.fillStyle(COLORS.inkDeep, 1);
  g.fillRect(x + 8, bottom - 4, 14, 4);
  g.fillRect(x + w - 22, bottom - 4, 14, 4);

  return { x, w, top, center: cx, glass, graphics: g };
}

// location per gli eventi sulla pianta

// interno del bus
export function buildBus(scene, originId, { evening = false } = {}) {
  // interno di un autobus urbano: soffitto con luci e corrimano, maniglie a cinghia,
  // pali gialli, finestrini arrotondati con pubblicità sopra, display di linea, porte a soffietto
  const wall = evening ? 0xaab3b6 : 0xdfe3e1;
  const g = scene.add.graphics();
  g.fillStyle(wall, 1);
  g.fillRect(0, 46, W, HORIZON - 46);

  // città che scorre fuori dai finestrini
  const outside = scene.add.container(0, 0);
  const strip = scene.add.graphics();
  bandGradient(strip, 0, 120, W * 2, 150, evening ? SKY_EVENING : SKY[originId] ?? SKY.milano);
  strip.fillStyle(evening ? 0x34485e : COLORS.steelLight, 1);
  for (let x = 0; x < W * 2; x += 70) strip.fillRect(x, 270 - ((x * 37) % 90) - 40, 56, 140);
  strip.fillStyle(evening ? 0x1c2839 : COLORS.steel, 1);
  for (let x = 30; x < W * 2; x += 110) strip.fillRect(x, 270 - ((x * 53) % 60) - 20, 70, 140);
  if (evening) {
    strip.fillStyle(0xe8c66a, 1);
    for (let x = 10; x < W * 2; x += 23) strip.fillRect(x, 200 + ((x * 31) % 60), 3, 4);
  }
  outside.add(strip);
  scene.tweens.add({ targets: outside, x: -W, duration: 7000, repeat: -1 });

  const frame = scene.add.graphics();
  // pareti tra i finestrini
  frame.fillStyle(wall, 1);
  frame.fillRect(0, 46, W, 74);
  frame.fillRect(0, 270, W, HORIZON - 270);
  const wins = [];
  for (let x = 20; x < W; x += 230) wins.push(x);
  for (let x = 0; x < W; x += 230) frame.fillRect(x, 120, 20, 150);
  // finestrini con bordo in gomma e angoli arrotondati
  frame.fillStyle(COLORS.ink, 1);
  wins.forEach((x) => {
    frame.fillRect(x + 4, 118, 202, 4);
    frame.fillRect(x + 4, 268, 202, 4);
    frame.fillRect(x, 122, 4, 146);
    frame.fillRect(x + 206, 122, 4, 146);
    frame.fillStyle(wall, 1);
    [[x, 118], [x + 206, 118], [x, 268], [x + 206, 268]].forEach(([cx, cy]) => frame.fillRect(cx, cy, 4, 4));
    frame.fillStyle(COLORS.ink, 1);
    frame.fillRect(x + 4, 190, 202, 2); // vetro scorrevole
  });
  // pannelli pubblicitari sopra i finestrini (uno BIODOM)
  wins.forEach((x, i) => {
    drawPanel(frame, x + 20, 86, 170, 26, { fill: i === 1 ? COLORS.ink : COLORS.paper, border: COLORS.ink, borderWidth: 2 });
    frame.fillStyle(i === 1 ? COLORS.red : COLORS.steel, 1);
    frame.fillRect(x + 28, 94, 30, 10);
    frame.fillStyle(i === 1 ? COLORS.paper : COLORS.ink, 1);
    frame.fillRect(x + 66, 96, 90 - (i % 2) * 20, 2);
    frame.fillRect(x + 66, 102, 60, 2);
  });
  if (scene.textures.exists("logo_biodom")) scene.add.image(wins[1] + 150, 99, "logo_biodom").setTint(COLORS.paper).setScale(0.5).setDepth(1);
  // soffitto con luci e corrimano
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(0, 46, W, 6);
  frame.fillStyle(evening ? 0xe8c66a : COLORS.paper, 1);
  for (let x = 40; x < W; x += 160) frame.fillRect(x, 52, 100, 4);
  frame.fillStyle(0xc9a23d, 1);
  frame.fillRect(0, 66, W, 4);
  // display di linea
  drawPanel(frame, 380, 56, 200, 24, { fill: 0x1c2028, border: COLORS.ink, borderWidth: 2 });
  const stops = { milano: "DUOMO", delhi: "RAJIV CHOWK", reykjavik: "HLEMMUR" };
  const line = scene.add.text(480, 68, `92 → ${stops[originId] ?? "CENTRO"}`, { fontFamily: '"VT323", monospace', fontSize: "18px", color: "#e8a33d" }).setOrigin(0.5).setDepth(2);
  // il display lampeggia come i LED veri
  scene.tweens.add({ targets: line, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [2] });
  // porte a soffietto con vetri
  const door = { x: 620 };
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(door.x - 4, 110, 128, HORIZON - 110);
  frame.fillStyle(0x6e7673, 1);
  frame.fillRect(door.x, 114, 58, HORIZON - 114);
  frame.fillRect(door.x + 62, 114, 58, HORIZON - 114);
  frame.fillStyle(0x9fb4c2, 0.6);
  frame.fillRect(door.x + 6, 124, 46, 150);
  frame.fillRect(door.x + 68, 124, 46, 150);
  frame.fillStyle(COLORS.red, 1);
  frame.fillRect(door.x + 50, 290, 20, 10); // pulsante apertura
  // obliteratrice
  drawPanel(frame, 560, 250, 26, 34, { fill: 0xe8c66a, border: COLORS.ink, borderWidth: 2 });
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(566, 258, 14, 4);
  frame.fillRect(571, 284, 4, 96);
  // sedili con passeggeri seduti (si vedono testa e spalle sopra lo schienale)
  const seats = [40, 270, 830];
  const seated = [];
  seats.forEach((sx) => {
    for (let k = 0; k < 2; k += 1) seated.push({ x: sx + 18 + k * 48, y: 332 });
  });
  const seatFront = scene.add.graphics().setDepth(HORIZON - 1);
  seats.forEach((sx) => {
    drawPanel(seatFront, sx, 300, 104, 48, { fill: 0x3b6fb0, border: COLORS.ink });
    seatFront.fillStyle(0x2a5590, 1);
    for (let k = 0; k < 104; k += 8) seatFront.fillRect(sx + 4 + k, 304, 4, 40);
    seatFront.fillStyle(COLORS.ink, 1);
    seatFront.fillRect(sx + 10, 348, 6, 32);
    seatFront.fillRect(sx + 88, 348, 6, 32);
  });
  // pali gialli e maniglie a cinghia che dondolano
  const poles = scene.add.graphics().setDepth(HORIZON);
  poles.fillStyle(0xe8c66a, 1);
  [200, 470, 780].forEach((px) => poles.fillRect(px, 70, 6, HORIZON - 70));
  for (let hx = 30; hx < W; hx += 46) {
    const strap = scene.add.graphics().setDepth(HORIZON).setPosition(hx, 70);
    strap.fillStyle(COLORS.ink, 1);
    strap.fillRect(-1, 0, 2, 22);
    strap.lineStyle(2, COLORS.ink, 1);
    strap.strokeRect(-5, 22, 10, 10);
    scene.tweens.add({ targets: strap, x: hx + 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: (hx % 5) * 60 });
  }
  frame.fillStyle(COLORS.ink, 1);
  frame.fillRect(0, HORIZON - 4, W, 4);

  // pavimento antiscivolo con la linea gialla delle porte
  const floor = scene.add.graphics();
  floor.fillStyle(evening ? 0x5f6663 : 0x7e8683, 1);
  floor.fillRect(0, HORIZON, W, 160);
  floor.fillStyle(evening ? 0x4f5653 : 0x6e7673, 1);
  for (let y = HORIZON + 6; y < 540; y += 10) for (let x = (y % 20) / 2; x < W; x += 10) floor.fillRect(x, y, 4, 2);
  floor.fillStyle(0xe8c66a, 1);
  floor.fillRect(door.x - 4, HORIZON + 4, 128, 4);
  ditherRect(floor, 0, HORIZON, W, 8, COLORS.inkDeep, 4);

  // folla: due file di persone in piedi, molto fitte (lo spazio libero è solo attorno al giocatore)
  const crowd = [];
  for (let x = 24; x < W; x += 44) crowd.push({ x: x + ((x * 7) % 9), y: 424 });
  for (let x = 50; x < W; x += 62) if (Math.abs(x - 480) > 46) crowd.push({ x: x + ((x * 13) % 11), y: 486 });
  return {
    floor: [440, 470],
    spawn: { x: 480, y: 456 },
    crowd,
    seated,
    obstacles: [],
    points: {}
  };
}

// casa con l'Home Hub (stazione di ricarica e fertilizzazione)
export function buildHome(scene, originId, { evening = true } = {}) {
  const world = buildHouse(scene, { evening, originId });
  return { ...world, spawn: { x: 880, y: 450 } };
}

// strada di corsa verso casa (emergenza)
export function buildRunHome(scene, originId, { evening = true } = {}) {
  const world = buildStreet(scene, originId, { evening });
  drawSign(scene, 870, "CASA", { dir: "right", sub: "50 m" });
  return { ...world, points: { home: { x: 910, y: 450 } } };
}

// cartello stradale a freccia (stile segnaletica)
export function drawSign(scene, x, label, { dir = null, sub = null, depth = 390, top = 236, ground = 392 } = {}) {
  const text = scene.add.text(0, 0, label, { fontFamily: '"VT323", monospace', fontSize: "30px", color: "#f1f0ed", letterSpacing: 2 }).setDepth(depth + 1);
  const subText = sub ? scene.add.text(0, 0, sub, { fontFamily: '"VT323", monospace', fontSize: "18px", color: "#9fb4c2" }).setDepth(depth + 1) : null;
  const w = Math.max(text.width, subText?.width ?? 0) + 36;
  const h = sub ? 58 : 44;
  const tip = dir ? 22 : 0;
  const left = Math.round(x - w / 2 - (dir === "left" ? tip / 2 : 0) + (dir === "right" ? -tip / 2 : 0));
  const g = scene.add.graphics().setDepth(depth);

  // palo e base
  g.fillStyle(0x1c2839, 1);
  g.fillRect(x - 3, top + h, 6, ground - top - h);
  g.fillRect(x - 12, ground - 4, 24, 4);
  ditherRect(g, x - 16, ground, 32, 4, 0x1c2839, 6);

  // targa con punta a freccia
  g.fillStyle(0x163c4d, 1);
  const bodyX = dir === "left" ? left + tip : left;
  g.fillRect(bodyX, top, w, h);
  if (dir) {
    for (let i = 0; i < h / 2; i += 2) {
      const len = Math.round(tip * (1 - i / (h / 2)));
      const ty1 = top + h / 2 - i - 2;
      const ty2 = top + h / 2 + i;
      if (dir === "right") {
        g.fillRect(bodyX + w, ty1, len, 2);
        g.fillRect(bodyX + w, ty2, len, 2);
      } else {
        g.fillRect(bodyX - len, ty1, len, 2);
        g.fillRect(bodyX - len, ty2, len, 2);
      }
    }
  }
  // filetto interno chiaro
  g.lineStyle(2, 0xf1f0ed, 1);
  g.strokeRect(bodyX + 4, top + 4, w - 8, h - 8);

  text.setPosition(Math.round(bodyX + w / 2 - text.width / 2), top + (sub ? 6 : Math.round(h / 2 - text.height / 2)));
  subText?.setPosition(Math.round(bodyX + w / 2 - subText.width / 2), top + 34);
  return g;
}

// arredi tipici della casa in base al paese
// quadro con il monumento della città: cornice in legno, passe-partout e dipinto in pixel art
function drawMonumentPainting(g, x, y, kind, evening) {
  const W2 = 112;
  const H2 = 88;
  // cornice e passe-partout
  g.fillStyle(0x4a3826, 1);
  g.fillRect(x - 2, y - 2, W2 + 4, H2 + 4);
  g.fillStyle(0x8f6a3e, 1);
  g.fillRect(x, y, W2, H2);
  g.fillStyle(0xc9a26a, 1);
  g.fillRect(x + 2, y + 2, W2 - 4, 2);
  g.fillStyle(0xf1ebdc, 1);
  g.fillRect(x + 6, y + 6, W2 - 12, H2 - 12);
  const ix = x + 12;
  const iy = y + 12;
  const iw = W2 - 24;
  const ih = H2 - 24;
  const ground = iy + ih;
  const px = (cx, cy, w, h, color) => {
    g.fillStyle(color, 1);
    g.fillRect(cx, cy, w, h);
  };
  if (kind === "milano") {
    // cielo pallido, Duomo in marmo rosato con guglie, rosone, portali e la Madonnina dorata
    bandGradient(g, ix, iy, iw, ih, evening ? [0x34485e, 0x2c3e52, 0x25354a] : [0xe6e9e5, 0xd9dfe0, 0xc9d3d8]);
    const marble = evening ? 0xb9b2aa : 0xece2d6;
    const shade = evening ? 0x8f8880 : 0xc9bcab;
    const cx = ix + iw / 2;
    px(ix + 6, ground - 26, iw - 12, 26, marble); // corpo
    // facciata a capanna, a gradini
    for (let i = 0; i < 8; i += 1) px(cx - 26 + i * 2, ground - 26 - i * 2, 52 - i * 4, 2, marble);
    // guglie a intervalli, con la punta
    [ix + 6, ix + 14, ix + 22, cx - 24, cx + 22, ix + iw - 24, ix + iw - 16, ix + iw - 8].forEach((sx, i) => {
      const h = 10 + (i % 2) * 6;
      px(sx, ground - 26 - h, 2, h, marble);
      px(sx, ground - 28 - h, 2, 2, shade);
    });
    // tiburio e guglia maggiore con la Madonnina
    px(cx - 4, ground - 52, 8, 10, marble);
    px(cx - 1, ground - 62, 2, 10, marble);
    px(cx - 1, ground - 66, 2, 4, 0xe8c66a);
    // contrafforti, rosone e portali
    [ix + 10, ix + 26, cx - 10, cx + 8, ix + iw - 28, ix + iw - 12].forEach((bx) => px(bx, ground - 24, 2, 24, shade));
    px(cx - 3, ground - 30, 6, 6, shade);
    px(cx - 1, ground - 28, 2, 2, marble);
    [cx - 16, cx - 3, cx + 10].forEach((dx, i) => px(dx, ground - (i === 1 ? 12 : 8), i === 1 ? 6 : 6, i === 1 ? 12 : 8, evening ? 0x3a3633 : 0x6e5434));
    px(ix, ground - 2, iw, 2, evening ? 0x4b4440 : 0xb3aa9c);
  } else if (kind === "delhi") {
    // India Gate al tramonto: arco in arenaria, cornicione, cupoletta, prato e fiamma
    bandGradient(g, ix, iy, iw, ih, evening ? [0x34485e, 0x5c4a5e, 0x8f5a4e] : [0xf0d9b0, 0xe8b880, 0xd98a4b]);
    const sand = evening ? 0x9e6e52 : 0xc98552;
    const shade = evening ? 0x7a5240 : 0xa86a3e;
    const cx = ix + iw / 2;
    px(ix, ground - 8, iw, 8, evening ? 0x2e4a3a : 0x5c8a4e); // prato
    px(cx - 22, ground - 44, 44, 36, sand);
    px(cx - 24, ground - 48, 48, 4, shade); // cornicione
    px(cx - 14, ground - 54, 28, 6, sand);
    px(cx - 8, ground - 58, 16, 4, sand);
    px(cx - 4, ground - 62, 8, 4, shade); // cupoletta
    // arco centrale
    px(cx - 8, ground - 34, 16, 26, evening ? 0x25354a : 0xf0d9b0);
    px(cx - 6, ground - 36, 12, 2, evening ? 0x25354a : 0xf0d9b0);
    px(cx - 22, ground - 44, 2, 36, shade);
    px(cx + 20, ground - 44, 2, 36, shade);
    // fiamma del milite ignoto
    px(cx - 1, ground - 12, 2, 4, 0xe8c66a);
    // stormo di aquiloni
    [[ix + 14, iy + 10, 0xb4553f], [ix + iw - 20, iy + 16, 0x2e7d4f]].forEach(([kx, ky, kc]) => {
      px(kx, ky, 4, 4, kc);
      px(kx + 2, ky + 4, 1, 6, 0x3f3a33);
    });
  } else {
    // Hallgrímskirkja: torre a gradoni bianca tra montagne innevate, aurora di sera
    bandGradient(g, ix, iy, iw, ih, evening ? [0x1f2c40, 0x25354a, 0x2c3e52] : [0xeaf0f2, 0xd8e5ec, 0xc4d8e4]);
    if (evening) {
      g.fillStyle(0x7fd6a0, 0.6);
      for (let ax = ix; ax < ix + iw; ax += 2) g.fillRect(ax, iy + 6 + Math.round(Math.sin(ax / 7) * 3), 2, 8);
    }
    const snow = 0xf1f0ed;
    const rock = evening ? 0x3a4f66 : 0x7d9aad;
    [[ix + 16, 26], [ix + iw - 16, 30]].forEach(([mx, mh]) => {
      for (let i = 0; i < mh; i += 2) px(mx - i, ground - mh + i, i * 2, 2, i < 8 ? snow : rock);
    });
    const cx = ix + iw / 2;
    const white = evening ? 0xcdd2ce : 0xf6f6f2;
    const shade = evening ? 0x9aa5aa : 0xc4ccd0;
    [[24, 12], [20, 18], [16, 26], [12, 34], [8, 44]].forEach(([half, h]) => px(cx - half, ground - h, half * 2, h, white));
    [[24, 12], [20, 18], [16, 26], [12, 34]].forEach(([half, h]) => px(cx + half - 2, ground - h, 2, h, shade));
    px(cx - 2, ground - 56, 4, 12, white); // guglia
    px(cx - 1, ground - 60, 2, 4, shade);
    px(cx - 3, ground - 24, 6, 8, evening ? 0xe8c66a : 0x5e7f94); // finestra
    px(ix, ground - 2, iw, 2, snow);
  }
  // riflesso sul vetro del quadro
  g.fillStyle(0xffffff, 0.25);
  g.fillRect(ix + 4, iy + 4, 2, 18);
  g.fillRect(ix + 8, iy + 4, 2, 10);
}

function decorateHome(scene, originId, evening) {
  const g = scene.add.graphics();
  if (originId === "delhi") {
    // pareti calde, finestra ad arco con grata jali, ventilatore, lumini diya, tappeto
    g.fillStyle(evening ? 0xcdbb98 : 0xe6d6b8, 1);
    g.fillRect(0, 46, W, HORIZON - 60);
    // fregio dipinto in alto: fascia ocra con motivo a fiori stilizzati
    g.fillStyle(0xc98552, 1);
    g.fillRect(0, 62, W, 14);
    for (let fx = 8; fx < W; fx += 24) {
      g.fillStyle(0xb4553f, 1);
      g.fillRect(fx, 66, 6, 6);
      g.fillStyle(0xe8c66a, 1);
      g.fillRect(fx + 2, 68, 2, 2);
    }
    // pavimento in marmo chiaro con venature e cornice intarsiata
    const floorD = scene.add.graphics().setDepth(0);
    floorD.fillStyle(evening ? 0xcfc8b8 : 0xeee6d6, 1);
    floorD.fillRect(0, HORIZON + 8, W, 160);
    floorD.fillStyle(evening ? 0xb8b0a0 : 0xd6ccb8, 1);
    for (let vx = 0; vx < W; vx += 60) for (let i = 0; i < 6; i += 1) floorD.fillRect(vx + i * 6, HORIZON + 20 + i * 4 + (vx % 120 ? 30 : 0), 6, 2);
    floorD.fillStyle(0x8f6a3e, 1);
    floorD.fillRect(0, HORIZON + 14, W, 4);
    floorD.fillStyle(0x2e5a3a, 1);
    for (let bx = 4; bx < W; bx += 16) floorD.fillRect(bx, HORIZON + 15, 4, 2);
    g.fillStyle(0xd8c49c, 1);
    for (let x = 0; x < W; x += 96) g.fillRect(x, 46, 2, HORIZON - 60);
    g.fillStyle(0x8f6a3e, 1);
    g.fillRect(392, 150, 96, 110);
    pixelDisc(g, 440, 150, 48, 0x8f6a3e, 1, 2);
    g.fillStyle(evening ? 0x2c3e52 : 0xf1e6cc, 1);
    g.fillRect(400, 154, 80, 100);
    pixelDisc(g, 440, 154, 40, evening ? 0x2c3e52 : 0xf1e6cc, 1, 2);
    g.fillStyle(0x8f6a3e, 1);
    for (let y = 120; y < 254; y += 12) for (let x = 404; x < 478; x += 12) g.fillRect(x + ((y / 12) % 2) * 6, y, 4, 4);
    g.fillStyle(0x3f3a33, 1);
    g.fillRect(598, 46, 4, 26);
    g.fillRect(560, 72, 80, 4);
    pixelDisc(g, 600, 74, 6, 0x3f3a33, 1, 2);
    drawMonumentPainting(g, 684, 120, "delhi", evening);
    g.fillStyle(0x8f6a3e, 1);
    g.fillRect(680, 250, 120, 8);
    [700, 740, 780].forEach((dx) => {
      g.fillStyle(0xc98552, 1);
      g.fillRect(dx - 6, 242, 12, 8);
      const flame = scene.add.rectangle(dx, 238, 4, 6, 0xe8c66a);
      scene.tweens.add({ targets: flame, scaleY: 1.5, alpha: 0.7, duration: 200 + dx, yoyo: true, repeat: -1 });
    });
    const rug = scene.add.graphics().setDepth(1);
    rug.fillStyle(0xb4553f, 1);
    rug.fillRect(380, 440, 400, 44);
    rug.fillStyle(0xe8c66a, 1);
    for (let x = 388; x < 772; x += 16) rug.fillRect(x, 444, 8, 4);
    for (let x = 388; x < 772; x += 16) rug.fillRect(x + 8, 476, 8, 4);
    rug.fillStyle(0x2e7d4f, 1);
    for (let x = 404; x < 760; x += 48) rug.fillRect(x, 456, 16, 12);
  } else if (originId === "reykjavik") {
    // pareti in legno, finestra sulle montagne, stufa con il fuoco, pelliccia
    g.fillStyle(evening ? 0xa38a6c : 0xc9ad88, 1);
    g.fillRect(0, 46, W, HORIZON - 60);
    // travi chiare a soffitto
    g.fillStyle(evening ? 0x8f775b : 0xb39572, 1);
    g.fillRect(0, 46, W, 10);
    for (let bx = 60; bx < W; bx += 200) g.fillRect(bx, 46, 22, 18);
    // pavimento a doghe larghe di pino
    const floorR = scene.add.graphics().setDepth(0);
    floorR.fillStyle(evening ? 0xb8a07c : 0xdcc6a0, 1);
    floorR.fillRect(0, HORIZON + 8, W, 160);
    floorR.fillStyle(evening ? 0x9e8662 : 0xc4ab82, 1);
    for (let y = HORIZON + 8; y < 540; y += 22) {
      floorR.fillRect(0, y, W, 2);
      for (let x = ((y / 22) % 2) * 90; x < W; x += 180) floorR.fillRect(x, y, 2, 22);
    }
    floorR.fillStyle(evening ? 0x8f775b : 0xb39572, 1);
    for (let k = 0; k < 30; k += 1) floorR.fillRect((k * 97) % W, HORIZON + 14 + ((k * 53) % 140), 4, 2);
    g.fillStyle(evening ? 0x8f775b : 0xb39572, 1);
    for (let y = 60; y < HORIZON - 14; y += 18) g.fillRect(0, y, W, 2);
    drawPanel(g, 392, 140, 100, 90, { fill: evening ? 0x1f2c40 : 0xd8e5ec, border: 0x6e5434, borderWidth: 6 });
    g.fillStyle(evening ? 0x3a4f66 : 0x9fb4c2, 1);
    for (let i = 0; i < 6; i += 1) g.fillRect(398 + i * 8, 200 - i * 8, 88 - i * 16, 8);
    g.fillStyle(0xf1f0ed, 1);
    g.fillRect(398 + 40, 160, 8, 4);
    if (evening) {
      g.fillStyle(0x7fd6a0, 0.5);
      for (let x = 398; x < 486; x += 4) g.fillRect(x, 156 + Math.round(Math.sin(x / 9) * 4), 4, 12);
    }
    g.fillStyle(0x6e5434, 1);
    g.fillRect(442, 140, 4, 90);
    drawMonumentPainting(g, 544, 130, "reykjavik", evening);
    g.fillStyle(0x1c2028, 1);
    g.fillRect(700, 280, 70, 100);
    g.fillRect(726, 46, 18, 234);
    const fire = scene.add.rectangle(735, 340, 30, 18, 0xe08a2e);
    scene.tweens.add({ targets: fire, scaleY: 1.3, alpha: 0.75, duration: 180, yoyo: true, repeat: -1 });
    const rug = scene.add.graphics().setDepth(1);
    pixelDisc(rug, 600, 462, 40, 0xf1f0ed, 1, 2);
    rug.fillStyle(0xdadfda, 1);
    rug.fillRect(560, 460, 80, 4);
  } else {
    // milano: boiserie bianca, lampadario, parquet a spina, quadro del Duomo, libreria, termosifone
    g.fillStyle(evening ? 0xc8ccc8 : 0xf1f0ed, 1);
    g.fillRect(0, HORIZON - 104, W, 90);
    g.fillStyle(evening ? 0xaab0ae : 0xdadfda, 1);
    g.fillRect(0, HORIZON - 106, W, 4);
    for (let px = 12; px < W - 40; px += 96) {
      g.fillRect(px, HORIZON - 94, 76, 2);
      g.fillRect(px, HORIZON - 30, 76, 2);
      g.fillRect(px, HORIZON - 94, 2, 66);
      g.fillRect(px + 74, HORIZON - 94, 2, 66);
    }
    // lampadario a bracci con le lampadine
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(479, 46, 2, 30);
    g.fillRect(450, 76, 60, 3);
    [450, 466, 494, 508].forEach((lx) => {
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(lx, 70, 2, 8);
      g.fillStyle(evening ? 0xe8c66a : COLORS.paper, 1);
      g.fillRect(lx - 2, 64, 6, 6);
    });
    if (evening) ditherRect(g, 420, 84, 120, 160, 0xe8c66a, 2, 2, 0.5);
    const floor = scene.add.graphics().setDepth(0);
    floor.fillStyle(evening ? 0xb39572 : 0xc9ad88, 1);
    floor.fillRect(0, HORIZON + 8, W, 160);
    floor.fillStyle(evening ? 0x8f775b : 0xa38a6c, 1);
    for (let y = HORIZON + 8; y < 540; y += 16) {
      for (let x = ((y / 16) % 2) * 24; x < W; x += 48) floor.fillRect(x, y, 24, 2);
    }
    drawMonumentPainting(g, 390, 118, "milano", evening);
    g.fillStyle(0x6e5434, 1);
    g.fillRect(680, 200, 130, 6);
    g.fillRect(680, 270, 130, 6);
    const books = [0xb4553f, 0x5e7f94, 0x7e9c8c, 0xe8c66a, 0x163c4d];
    for (let i = 0; i < 11; i += 1) {
      g.fillStyle(books[i % books.length], 1);
      g.fillRect(684 + i * 11, 240 + (i % 3) * 4, 9, 30 - (i % 3) * 4);
    }
    g.fillStyle(0x9aa3ad, 1);
    g.fillRect(700, 186, 12, 14);
    g.fillRect(696, 194, 4, 4);
    g.fillStyle(0x1c2028, 1);
    g.fillRect(698, 182, 16, 4);
    g.fillStyle(0xdadfda, 1);
    for (let x = 400; x < 480; x += 10) g.fillRect(x, 300, 6, 50);
    g.fillRect(398, 298, 84, 4);
  }
}
