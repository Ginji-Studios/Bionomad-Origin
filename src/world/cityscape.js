// città disegnata a livelli, con parallasse quando la
import { COLORS, bandGradient, ditherRect, pixelDisc } from "../ui/theme.js";

const HORIZON = 380;
const VIEW_W = 960;

const PALETTES = {
  delhi: { sky: [0xe6dcc6, 0xdccfb2, 0xd0c09f, 0xc4b28e], far: 0xc4b596, mid: 0x9e8e70, near: 0x766953, window: 0xe2d6bd, tree: 0x7c8a5e },
  milano: { sky: [0xeceeea, 0xdfe4e3, 0xd2dadd, 0xc4d0d6], far: 0xb3c4cf, mid: 0x6f8ea2, near: 0x3f5a6c, window: 0xc9d6de, tree: 0x5c7a6b },
  reykjavik: { sky: [0xf0f4f5, 0xe1eaef, 0xd0dfe8, 0xbfd4e1], far: 0xb8cbd8, mid: 0x7495aa, near: 0x46627a, window: 0xd6e3eb, tree: 0x5c7a6b }
};
const EVENING = { sky: [0x34485e, 0x2c3e52, 0x25354a, 0x1f2c40], far: 0x3a4f66, mid: 0x26374c, near: 0x172231, window: 0xe8c66a, tree: 0x22324a };

// generatore pseudo-casuale con seme
function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function layer(scene, factor, parallax, depth) {
  const g = scene.add.graphics().setDepth(depth);
  if (parallax) g.setScrollFactor(factor, 1);
  return g;
}

// quartieri
export const ZONES = ["centro", "residenziale", "parco", "industriale"];

export function drawCityscape(scene, originId, { evening = false, width = VIEW_W, parallax = false, sun = true, zone = "centro" } = {}) {
  const pal = evening ? { ...PALETTES[originId] ?? PALETTES.milano, ...EVENING } : PALETTES[originId] ?? PALETTES.milano;
  const rand = seeded(originId.length * 7919 + (evening ? 13 : 0) + ZONES.indexOf(zone) * 1031);
  const span = (f) => (parallax ? Math.ceil(VIEW_W + (width - VIEW_W) * f) + 80 : width);

  // cielo
  const sky = layer(scene, 0, parallax, -10);
  bandGradient(sky, 0, 46, VIEW_W, HORIZON - 46, pal.sky);
  if (evening) {
    sky.fillStyle(COLORS.paper, 0.8);
    for (let i = 0; i < 40; i += 1) sky.fillRect(Math.floor(rand() * VIEW_W), 50 + Math.floor(rand() * 150), 2, 2);
  }
  if (sun) {
    const sunColor = evening ? 0xdadfda : COLORS.paper;
    pixelDisc(sky, 760, 132, evening ? 24 : 40, sunColor, 1, 2);
    if (!evening) ditherRect(sky, 720, 100, 80, 64, pal.sky[1], 2);
  }

  // nuvole a retino che scorrono piano
  for (let i = 0; i < 4; i += 1) {
    const cloud = layer(scene, 0.03, parallax, -9);
    const cw = 80 + Math.floor(rand() * 90);
    const color = evening ? 0x3a4f66 : COLORS.paper;
    for (let k = 0; k < 4; k += 1) pixelDisc(cloud, Math.floor((k * cw) / 4), Math.floor(rand() * 10), 14 + Math.floor(rand() * 12), color, 1, 2);
    cloud.fillStyle(color, 1);
    cloud.fillRect(-10, 6, cw + 10, 14);
    ditherRect(cloud, -10, 16, cw + 10, 8, evening ? 0x2c3e52 : pal.sky[2], 6);
    cloud.setPosition(Math.floor(rand() * VIEW_W), 70 + Math.floor(rand() * 90));
    scene.tweens.add({ targets: cloud, x: cloud.x + 200, duration: 40000 + rand() * 20000, yoyo: true, repeat: -1 });
  }

  // skyline lontano
  const far = layer(scene, 0.15, parallax, -8);
  for (let x = -20; x < span(0.15); ) {
    const w = 26 + Math.floor(rand() * 54);
    const h = 90 + Math.floor(rand() * 150);
    far.fillStyle(pal.far, 1);
    far.fillRect(x, HORIZON - h, w, h);
    if (rand() < 0.35) far.fillRect(x + Math.floor(w / 2), HORIZON - h - 24, 2, 24); // antenna
    ditherRect(far, x + w - 8, HORIZON - h, 8, h, pal.mid, 4);
    far.fillStyle(pal.window, 0.7);
    for (let wy = HORIZON - h + 10; wy < HORIZON - 30; wy += 14) {
      for (let wx = x + 4; wx < x + w - 10; wx += 8) if (rand() < 0.25) far.fillRect(wx, wy, 2, 4);
    }
    x += w + Math.floor(rand() * 10);
  }
  ditherRect(far, 0, HORIZON - 70, span(0.15), 70, pal.sky[3], 4);

  // edifici e monumenti
  const mid = layer(scene, 0.4, parallax, -7);
  const midSpan = span(0.4);
  const landmarkEvery = 1300;
  if (zone === "centro") {
    for (let x = -20; x < midSpan; ) {
      // ogni tanto lascia spazio a un monumento
      if (Math.floor(x / landmarkEvery) !== Math.floor((x - 1) / landmarkEvery) && x > 0) x += 340;
      const w = 60 + Math.floor(rand() * 80);
      const h = 90 + Math.floor(rand() * 120);
      drawBuilding(mid, x, w, h, pal, rand, evening);
      x += w + 6 + Math.floor(rand() * 30);
    }
    for (let lx = 140; lx < midSpan; lx += landmarkEvery) {
      const g = layer(scene, 0.4, parallax, -7);
      g.fillStyle(pal.mid, 1);
      drawLandmark(g, originId, lx, pal);
    }
  } else if (zone === "residenziale") {
    for (let x = -20; x < midSpan; ) {
      const w = 70 + Math.floor(rand() * 50);
      drawHouseBlock(mid, x, w, 50 + Math.floor(rand() * 60), pal, rand, evening);
      x += w + 10 + Math.floor(rand() * 20);
    }
  } else if (zone === "parco") {
    // colline morbide e qualche palazzo lontano tra gli alberi
    for (let x = 0; x < midSpan; x += 160) pixelDisc(mid, x, HORIZON, 70 + Math.floor(rand() * 40), pal.tree, 1, 2);
    ditherRect(mid, 0, HORIZON - 60, midSpan, 60, pal.near, 2);
    for (let x = 40; x < midSpan; x += 90 + Math.floor(rand() * 60)) drawTree(mid, x, pal, rand);
  } else {
    // zona industriale
    for (let x = -20; x < midSpan; ) {
      const w = 120 + Math.floor(rand() * 80);
      drawShed(mid, x, w, pal);
      if (rand() < 0.6) drawChimney(scene, mid, x + 30, pal, rand, parallax);
      x += w + 20;
    }
    for (let tx = 260; tx < midSpan; tx += 520) drawAirTower(scene, mid, tx, pal, parallax);
  }
  ditherRect(mid, 0, HORIZON - 26, midSpan, 26, pal.near, 3);

  // alberi e cartelloni
  const near = layer(scene, 0.75, parallax, -6);
  const nearSpan = span(0.75);
  const gap = zone === "parco" ? 90 : zone === "residenziale" ? 150 : 200;
  for (let x = 60; x < nearSpan; x += gap + Math.floor(rand() * 140)) {
    if (zone !== "parco" && rand() < 0.3) drawBillboard(scene, near, x, pal, parallax);
    else drawTree(near, x, pal, rand);
  }

  addLife(scene, pal, { evening, parallax, rand });
}

// vita in città

function addLife(scene, pal, { evening, parallax, rand }) {
  // strada dietro il marciapiede con il traffico
  const road = layer(scene, 0.85, parallax, -5);
  road.fillStyle(evening ? 0x1c2839 : 0x5d6d7e, 1);
  road.fillRect(-100, HORIZON - 16, 6000, 12);
  road.fillStyle(evening ? 0x3a4f66 : 0x9aa6ae, 1);
  for (let x = -100; x < 6000; x += 40) road.fillRect(x, HORIZON - 11, 16, 2);

  const spawnCar = () => {
    const dir = rand() < 0.5 ? 1 : -1;
    const car = scene.add.container(dir > 0 ? -80 : VIEW_W + 80, HORIZON - 8).setDepth(-4);
    if (parallax) car.setScrollFactor(0);
    const g = scene.add.graphics();
    const body = [0x5e7f94, 0xdadfda, 0xb4553f, 0x163c4d, 0x7e9c8c][Math.floor(rand() * 5)];
    g.fillStyle(body, 1);
    g.fillRect(-26, -14, 52, 10);
    g.fillRect(-14, -22, 28, 8);
    g.fillStyle(evening ? 0xe8c66a : 0xc9d6de, 1);
    g.fillRect(-10, -20, 8, 5);
    g.fillRect(2, -20, 8, 5);
    if (evening) g.fillRect(dir > 0 ? 24 : -28, -12, 4, 4);
    g.fillStyle(0x16202e, 1);
    g.fillRect(-20, -4, 10, 4);
    g.fillRect(10, -4, 10, 4);
    car.add(g);
    if (dir < 0) car.setScale(-1, 1);
    scene.tweens.add({
      targets: car,
      x: dir > 0 ? VIEW_W + 80 : -80,
      duration: 3500 + rand() * 3000,
      onComplete: () => car.destroy()
    });
  };
  scene.time.addEvent({ delay: 1800, loop: true, callback: () => rand() < 0.75 && spawnCar() });
  spawnCar();

  // stormo di uccelli (solo di giorno)
  if (!evening) {
    scene.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        const flock = scene.add.graphics().setDepth(-9);
        if (parallax) flock.setScrollFactor(0);
        flock.fillStyle(0x3f5a6c, 1);
        for (let i = 0; i < 4; i += 1) {
          const bx = i * 18 + (i % 2) * 6;
          const by = (i % 2) * 8;
          flock.fillRect(bx, by, 4, 2);
          flock.fillRect(bx + 4, by + 2, 2, 2);
          flock.fillRect(bx + 6, by, 4, 2);
        }
        flock.setPosition(-80, 80 + rand() * 80);
        scene.tweens.add({ targets: flock, x: VIEW_W + 80, y: flock.y - 30, duration: 9000, onComplete: () => flock.destroy() });
        scene.tweens.add({ targets: flock, scaleY: 0.5, duration: 200, yoyo: true, repeat: 22 });
      }
    });
  }
}

function drawHouseBlock(g, x, w, h, pal, rand, evening) {
  const top = HORIZON - h;
  g.fillStyle(pal.mid, 1);
  g.fillRect(x, top, w, h);
  ditherRect(g, x + w - 10, top, 10, h, pal.near, 6);
  // tetto a punta
  g.fillStyle(rand() < 0.3 ? 0xb4553f : pal.near, 1);
  for (let i = 0; i < 6; i += 1) g.fillRect(x - 4 + i * (w / 12), top - 6 - i * 5, w + 8 - i * (w / 6), 6);
  for (let wy = top + 10; wy < HORIZON - 18; wy += 20) {
    for (let wx = x + 10; wx < x + w - 18; wx += 18) {
      g.fillStyle(evening && rand() < 0.4 ? pal.window : evening ? pal.near : pal.window, 1);
      g.fillRect(wx, wy, 8, 10);
    }
  }
  g.fillStyle(pal.near, 1);
  g.fillRect(x + w / 2 - 6, HORIZON - 18, 12, 18);
}

function drawShed(g, x, w, pal) {
  const top = HORIZON - 70;
  g.fillStyle(pal.mid, 1);
  g.fillRect(x, top, w, 70);
  // tetto a shed (denti di sega)
  for (let sx = x; sx < x + w; sx += 30) {
    for (let i = 0; i < 6; i += 1) g.fillRect(sx, top - 18 + i * 3, 30 - i * 5, 3);
  }
  g.fillStyle(pal.window, 0.8);
  for (let wx = x + 10; wx < x + w - 10; wx += 16) g.fillRect(wx, top + 16, 10, 6);
  ditherRect(g, x, top + 40, w, 30, pal.near, 4);
}

function drawChimney(scene, g, x, pal, rand, parallax) {
  const h = 120 + Math.floor(rand() * 60);
  g.fillStyle(pal.near, 1);
  g.fillRect(x, HORIZON - h, 14, h);
  g.fillStyle(0xb4553f, 1);
  g.fillRect(x, HORIZON - h + 10, 14, 4);
  // fumo a sbuffi
  scene.time.addEvent({
    delay: 700,
    loop: true,
    callback: () => {
      const puff = scene.add.graphics().setDepth(-7);
      if (parallax) puff.setScrollFactor(0.4, 1);
      pixelDisc(puff, 0, 0, 8, pal.sky[2], 1, 2);
      ditherRect(puff, -8, 0, 16, 8, pal.far, 6);
      puff.setPosition(x + 7, HORIZON - h - 6);
      scene.tweens.add({ targets: puff, y: puff.y - 70, x: puff.x + 30, scale: 2, alpha: 0, duration: 3200, onComplete: () => puff.destroy() });
    }
  });
}

function drawAirTower(scene, g, x, pal, parallax) {
  // torre BIODOM di purificazione
  g.fillStyle(pal.near, 1);
  g.fillRect(x, HORIZON - 230, 30, 230);
  for (let y = HORIZON - 220; y < HORIZON - 20; y += 40) g.fillRect(x - 6, y, 42, 6);
  pixelDisc(g, x + 15, HORIZON - 236, 20, pal.near, 1, 2);
  const light = scene.add.rectangle(x + 15, HORIZON - 240, 10, 6, 0x9fd4b0).setDepth(-7);
  if (parallax) light.setScrollFactor(0.4, 1);
  scene.tweens.add({ targets: light, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });
}

function drawBuilding(g, x, w, h, pal, rand, evening) {
  const top = HORIZON - h;
  g.fillStyle(pal.mid, 1);
  g.fillRect(x, top, w, h);
  // lato in ombra a retino
  ditherRect(g, x + w - 12, top, 12, h, pal.near, 6);
  // cornicione e dettagli sul tetto
  g.fillStyle(pal.near, 1);
  g.fillRect(x - 2, top, w + 4, 4);
  if (rand() < 0.5) {
    g.fillRect(x + 8, top - 14, 18, 14); // serbatoio / condizionatore
    g.fillRect(x + 10, top - 18, 2, 4);
  }
  if (rand() < 0.3) g.fillRect(x + w - 20, top - 30, 2, 30);
  // finestre a griglia
  for (let wy = top + 12; wy < HORIZON - 14; wy += 16) {
    for (let wx = x + 8; wx < x + w - 16; wx += 12) {
      const lit = evening ? rand() < 0.18 : true;
      g.fillStyle(lit ? pal.window : pal.near, evening ? 1 : 0.8);
      g.fillRect(wx, wy, 6, 8);
    }
  }
  // balconi
  if (rand() < 0.4) {
    g.fillStyle(pal.near, 1);
    for (let by = top + 26; by < HORIZON - 20; by += 32) g.fillRect(x + 4, by, w - 16, 2);
  }
}

function drawLandmark(g, originId, ox, pal) {
  const b = HORIZON;
  if (originId === "delhi") {
    // india Gate
    g.fillRect(ox, b - 160, 40, 160);
    g.fillRect(ox + 110, b - 160, 40, 160);
    g.fillRect(ox - 8, b - 188, 166, 32);
    g.fillRect(ox + 16, b - 204, 118, 16);
    ditherRect(g, ox + 40, b - 156, 70, 30, pal.near, 4);
    // cupola
    g.fillStyle(pal.mid, 1);
    g.fillRect(ox + 180, b - 70, 120, 70);
    pixelDisc(g, ox + 240, b - 70, 40, pal.mid, 1, 2);
    g.fillRect(ox + 238, b - 126, 4, 18);
  } else if (originId === "reykjavik") {
    // hallgrímskirkja a gradoni
    for (let i = 0; i < 7; i += 1) {
      const w = 150 - i * 20;
      g.fillRect(ox + 80 - w / 2, b - 70 - i * 18, w, 18);
    }
    g.fillRect(ox + 70, b - 260, 20, 136);
    g.fillRect(ox + 77, b - 280, 6, 20);
    ditherRect(g, ox + 80, b - 190, 10, 190, pal.near, 5);
    // casette colorate con tetto a punta
    [[ox + 190, 0xb4553f], [ox + 270, COLORS.paper]].forEach(([hx, roof]) => {
      g.fillStyle(pal.mid, 1);
      g.fillRect(hx, b - 64, 70, 64);
      g.fillStyle(roof, 1);
      for (let i = 0; i < 5; i += 1) g.fillRect(hx + i * 7, b - 68 - i * 6, 70 - i * 14, 6);
    });
  } else {
    // duomo con guglie
    g.fillRect(ox, b - 96, 200, 96);
    for (let x = ox + 4; x < ox + 200; x += 12) {
      const tall = (x - ox) % 36 === 4;
      g.fillRect(x, b - 96 - (tall ? 56 : 30), 4, tall ? 56 : 30);
    }
    g.fillRect(ox + 96, b - 190, 8, 94);
    g.fillStyle(0xe8c66a, 1);
    g.fillRect(ox + 96, b - 198, 8, 8);
    ditherRect(g, ox + 20, b - 70, 160, 40, pal.near, 4);
    // torre Velasca
    g.fillStyle(pal.mid, 1);
    g.fillRect(ox + 250, b - 190, 54, 190);
    g.fillRect(ox + 238, b - 246, 78, 56);
    ditherRect(g, ox + 290, b - 246, 26, 246, pal.near, 5);
  }
}

function drawTree(g, x, pal, rand) {
  const h = 40 + Math.floor(rand() * 30);
  g.fillStyle(pal.near, 1);
  g.fillRect(x - 3, HORIZON - h, 6, h);
  const r = 22 + Math.floor(rand() * 12);
  pixelDisc(g, x, HORIZON - h - r / 2, r, pal.tree, 1, 2);
  pixelDisc(g, x - r / 2, HORIZON - h - 4, r * 0.7, pal.tree, 1, 2);
  ditherRect(g, x - r, HORIZON - h - 6, r * 2, 12, pal.near, 6);
}

function drawBillboard(scene, g, x, pal, parallax) {
  const top = HORIZON - 120;
  g.fillStyle(pal.near, 1);
  g.fillRect(x + 20, top + 50, 4, 70);
  g.fillRect(x + 96, top + 50, 4, 70);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(x, top, 120, 54);
  g.fillStyle(COLORS.paper, 1);
  g.fillRect(x + 4, top + 4, 112, 46);
  g.fillStyle(0x7e9c8c, 1);
  pixelDisc(g, x + 22, top + 27, 10, 0x7e9c8c, 1, 2);
  const lines = ["BIONOMAD+", "respira", "meglio"];
  lines.forEach((line, i) => {
    const t = scene.add
      .text(x + 38, top + 6 + i * 14, line, { fontFamily: '"VT323", monospace', fontSize: i === 0 ? "16px" : "14px", color: i === 0 ? "#163c4d" : "#5e7f94" })
      .setDepth(-6);
    if (parallax) t.setScrollFactor(0.75, 1);
  });
}
