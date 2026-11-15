// nevicata in stile retino: fiocchi a pixel della palette, su tre piani di profondità.
// Lontani piccoli e lenti dietro i passanti, vicini più grandi davanti al protagonista;
// il vento cambia piano piano a raffiche e i fiocchi seguono la parallasse della camera.
import { VIEW } from "../ui/hud.js";

// forme dei fiocchi su griglia: 1 = pixel pieno, 2 = pixel a metà (retino)
const SHAPES = [
  ["1"],
  ["11", "11"],
  ["020", "212", "020"],
  ["0120", "1111", "1111", "0210"],
  ["00200", "02120", "21112", "02120", "00200"]
];
const COLORS = ["#ffffff", "#dfe9f3", "#c4d6e8"];

function flakeTextures(scene) {
  SHAPES.forEach((rows, si) =>
    COLORS.forEach((col, ci) => {
      const key = `snow_${si}_${ci}`;
      if (scene.textures.exists(key)) return;
      const n = rows.length;
      const px = 2;
      const t = scene.textures.createCanvas(key, n * px, n * px);
      const X = t.getContext();
      rows.forEach((r, y) =>
        [...r].forEach((v, x) => {
          if (v === "0") return;
          X.globalAlpha = v === "1" ? 1 : 0.55;
          X.fillStyle = col;
          X.fillRect(x * px, y * px, px, px);
        })
      );
      t.refresh();
    })
  );
}

// piani: [quanti, forme possibili, velocità di caduta, parallasse, profondità, alpha]
const LAYERS = [
  { n: 70, shapes: [0, 1], vy: [26, 40], par: 0.35, depth: 120, alpha: 0.55 },
  { n: 45, shapes: [1, 2], vy: [45, 70], par: 0.75, depth: 420, alpha: 0.8 },
  { n: 14, shapes: [3, 4], vy: [80, 120], par: 1.15, depth: 900, alpha: 0.9 }
];

export function snowfall(scene, { intensity = 1 } = {}) {
  flakeTextures(scene);
  const cam = scene.cameras.main;
  const flakes = [];
  LAYERS.forEach((L, li) => {
    for (let i = 0; i < Math.round(L.n * intensity); i++) {
      const s = L.shapes[(Math.random() * L.shapes.length) | 0];
      const img = scene.add
        .image(0, 0, `snow_${s}_${(Math.random() * COLORS.length) | 0}`)
        .setScrollFactor(0)
        .setDepth(L.depth)
        ;
      flakes.push({
        img,
        a: L.alpha * (0.7 + Math.random() * 0.3),
        li,
        x: Math.random() * VIEW.w,
        y: Math.random() * VIEW.h,
        vy: L.vy[0] + Math.random() * (L.vy[1] - L.vy[0]),
        ph: Math.random() * 6.28,
        sw: 0.6 + Math.random() * 1.2,
        amp: 6 + Math.random() * (10 + li * 6),
        // i fiocchi lontani si posano più in alto, sulla strada sullo sfondo
        floor: li === 0 ? VIEW.h * (0.62 + Math.random() * 0.2) : VIEW.h * (0.9 + Math.random() * 0.1)
      });
    }
  });

  let t = 0;
  let wind = 0;
  let windTo = -12;
  let lastX = cam.scrollX;
  const onUpdate = (_time, delta) => {
    const dt = Math.min(delta, 50) / 1000;
    t += dt;
    // raffiche: ogni tanto il vento cambia direzione e forza, con calma
    if (Math.random() < dt * 0.25) windTo = -30 + Math.random() * 45;
    wind += (windTo - wind) * dt * 0.6;
    const dx = cam.scrollX - lastX;
    lastX = cam.scrollX;
    for (const f of flakes) {
      const L = LAYERS[f.li];
      f.y += f.vy * dt;
      f.x += (wind * (0.5 + f.li * 0.35)) * dt - dx * L.par;
      const sway = Math.sin(t * f.sw + f.ph) * f.amp;
      // arrivato a terra si dissolve e riparte dall'alto
      const fade = f.y > f.floor - 30 ? Math.max(0, (f.floor - f.y) / 30) : 1;
      if (f.y > f.floor) {
        f.y = -10 - Math.random() * 60;
        f.x = Math.random() * (VIEW.w + 80) - 40;
      }
      if (f.x < -40) f.x += VIEW.w + 80;
      else if (f.x > VIEW.w + 40) f.x -= VIEW.w + 80;
      // posizioni a pixel interi: il fiocco resta nitido come il resto del retino
      f.img.setPosition(Math.round(f.x + sway), Math.round(f.y));
      f.img.alpha = f.a * fade;
    }
  };
  scene.events.on("update", onUpdate);
  scene.events.once("shutdown", () => scene.events.off("update", onUpdate));
  return flakes;
}
