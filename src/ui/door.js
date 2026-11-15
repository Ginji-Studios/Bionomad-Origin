// porta di casa che si apre su una vista della strada, retinata come il resto del gioco:
// vano con la città fuori, fascio di luce sul pavimento e anta che ruota.
// Usata dall'intro (si esce) e dalla cutscene finale (si rientra).
import { paint, setDayMode } from "../world/skyline.js";
import { K } from "../art/people.js";
import { Sfx } from "../systems/Sfx.js";

export function doorway(scene, doorX, { night = true, depth = 500, scrollFactor = 0 } = {}) {
  const k = K;
  const dx = Math.round(doorX - 41 * k); // bordo sinistro del vano (vedi door() in places.js)
  const dy = Math.round((480 - 190) * k);
  const dw = Math.round(82 * k);
  const dh = Math.round(190 * k);
  // vano aperto: si vede la strada fuori, disegnata e retinata come il resto del gioco
  const key = `door_view_${night ? "n" : "d"}`;
  if (!scene.textures.exists(key)) {
    setDayMode(!night);
    scene.textures.addCanvas(key, paint(dw, dh, k, (T) => {
      const { X, G, rnd, facade, skyG } = T;
      const W = dw / k;
      const H = dh / k;
      skyG(W, night ? [[0, 0.1], [0.6, 0.3], [1, 0.45]] : [[0, 0.5], [0.6, 0.68], [1, 0.8]]);
      for (let x = -6; x < W; ) {
        const bw = 18 + rnd() * 22;
        const bh = 60 + rnd() * 70;
        facade([[x, H - 24], [x, H - 24 - bh], [x + bw, H - 24 - bh], [x + bw, H - 24]], night ? 0.34 : 0.3, night ? 0.22 : 0.2, { gx: 5, gy: 7, lit: 0.22, glass: 0.9 });
        x += bw + 2;
      }
      X.fillStyle = G(0.3);
      X.fillRect(0, H - 24, W, 24);
      X.fillStyle = G(0.8);
      X.fillRect(0, H - 24, W, 1.5);
      X.fillStyle = G(0.12);
      X.fillRect(W * 0.6, H - 120, 3, 96);
      X.fillStyle = G(0.95);
      X.fillRect(W * 0.6 - 6, H - 124, 15, 4);
    }, { cell: 2, seedValue: 77 }));
    // fascio di luce che entra sul pavimento, a retino
    scene.textures.addCanvas(`${key}_spill`, paint(dw * 2, 70, 1, (T) => {
      const { X, G } = T;
      const g = X.createLinearGradient(0, 0, 0, 70);
      g.addColorStop(0, G(0.62));
      g.addColorStop(1, G(0.3));
      X.fillStyle = g;
      X.beginPath();
      X.moveTo(dw * 0.5, 0);
      X.lineTo(dw * 1.5, 0);
      X.lineTo(dw * 2, 70);
      X.lineTo(0, 70);
      X.fill();
    }, { cell: 2, seedValue: 78 }));
    setDayMode(false);
  }
  const light = scene.add.image(dx, dy, key).setOrigin(0).setScrollFactor(0).setDepth(depth - 2).setAlpha(0);
  const spill = scene.add.image(dx + dw / 2, dy + dh, `${key}_spill`).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth - 3).setAlpha(0);
  // anta della porta che ruota verso l'esterno (si stringe di lato)
  // anta retinata come la porta disegnata nella casa: due specchiature e la maniglia
  if (!scene.textures.exists("door_leaf")) {
    scene.textures.addCanvas("door_leaf", paint(dw, dh, k, (T) => {
      const { X, G, stone } = T;
      const W = dw / k;
      const H = dh / k;
      stone([[0, 0], [W, 0], [W, H], [0, H]], 0.26, 0.14, { rib: 41 });
      stone([[8, 10], [W - 8, 10], [W - 8, 80], [8, 80]], 0.34, 0.2, { rib: 12 });
      stone([[8, 90], [W - 8, 90], [W - 8, H - 8], [8, H - 8]], 0.34, 0.2, { rib: 12 });
      X.fillStyle = G(0.9);
      X.fillRect(W - 16, 90, 8, 4);
      X.fillStyle = G(0.08);
      X.fillRect(0, 0, 2, H);
    }, { cell: 2, seedValue: 79 }));
  }
  const leaf = scene.add.image(dx, dy, "door_leaf").setOrigin(0).setScrollFactor(scrollFactor).setDepth(depth - 1);
  [light, spill].forEach((o) => o.setScrollFactor(scrollFactor));
  return {
    // apre la porta: luce, fascio sul pavimento e anta che si stringe
    open() {
      Sfx.blip?.();
      scene.tweens.add({ targets: spill, alpha: 1, duration: 380 });
      scene.tweens.add({ targets: light, alpha: 1, duration: 260 });
      scene.tweens.add({ targets: leaf, scaleX: 0.12, duration: 380, ease: "Quad.easeOut" });
    },
    close(onDone) {
      scene.tweens.add({ targets: leaf, scaleX: 1, duration: 300, ease: "Quad.easeIn", onComplete: () => onDone?.() });
      scene.tweens.add({ targets: [light, spill], alpha: 0, duration: 300 });
    },
    leaf,
    light,
    spill
  };
}
