import { addHiRes } from "../art/hires.js";
import { drawBiodomLogo, LOGO_H, LOGO_W } from "../art/logoPath.js";

// logotipo biodom+ vettoriale (bianco su trasparente: si colora con setTint), disegnato a
// risoluzione 4x così resta nitido anche ingrandito. Stesse dimensioni logiche di prima.
function drawLogo(w, h) {
  const S = 4;
  const c = document.createElement("canvas");
  c.width = w * S;
  c.height = h * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  // logo ufficiale, adattato al riquadro mantenendo le proporzioni
  const lh = Math.min(h, (w * LOGO_H) / LOGO_W);
  drawBiodomLogo(X, 0, (h - lh) / 2, lh, "#FFFFFF");
  return c;
}

export function loadLogos(scene) {
  [["logo_biodom", 92, 20], ["logo_biodom_l", 126, 28]].forEach(([key, w, h]) => {
    if (!scene.textures.exists(key)) addHiRes(scene, key, drawLogo(w, h), 4);
  });
  return Promise.resolve();
}
