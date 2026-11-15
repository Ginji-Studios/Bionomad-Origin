import { bareOf, careFrames, holdFrames } from "../art/people.js";
import { Sfx } from "../systems/Sfx.js";

// gesto continuo con lo zaino BIONOMAD, usato nella scena iniziale (lo prende dall'hub e lo indossa)
// e in quella finale (se lo sfila e lo appoggia sull'hub). Lo zaino segue sempre la mano:
// braccia che si alzano → presa davanti al petto → mano alla spalla → zaino sulla schiena (e al contrario).
//   mode "wear":   hub → mani → spalla → schiena      mode "unpack": schiena → spalla → mani → hub
export function packGesture(scene, walker, { bareKey, packedKey, hub, mode = "wear", onAttach, onDone }) {
  const img = walker.img;
  const k = img.scaleX;
  const f = walker.facing >= 0 ? 1 : -1;
  holdFrames(scene, bareKey);
  careFrames(scene, packedKey);
  // posizione a schermo dell'angolo dello zaino, dato il punto del disegno (120x200)
  const at = (cx, cy) => [f > 0 ? img.x + (cx - 60) * k : img.x - (cx - 60) * k - 28 * k, img.y - (200 - cy) * k];
  // lo zaino attaccato alla mano: v = 0 mano alla spalla (zaino sulla schiena), v = 1 mano davanti
  const inHand = (v) => at(20 + 54 * v, 55 + 15 * v);
  const pack = scene.add.image(0, 0, "pack_item").setOrigin(0).setScale(k).setFlipX(f < 0).setScrollFactor(img.scrollFactorX).setVisible(false);
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
  const lerp = (A, B, u, lift = 0) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - Math.sin(u * Math.PI) * lift];
  const step = (u, n) => Math.min(n - 1, Math.floor(u * n));
  const show = (pos, front) => pack.setVisible(true).setPosition(Math.round(pos[0]), Math.round(pos[1])).setDepth(front ? img.depth + 1 : img.depth - 1);
  const tex = (key, frame) => img.setTexture(`${key}_${frame}`);
  let attached = false;
  walker.posing = true; // l'animazione la guida questo gesto, non il passo
  // fermo davvero: senza azzerare la velocità, finito il gesto il personaggio "scivolava" qualche passo
  walker.vx = 0;
  const total = mode === "wear" ? 2100 : 2000;
  scene.tweens.addCounter({
    from: 0,
    to: total,
    duration: total,
    onUpdate: (tw) => {
      const t = tw.getValue();
      if (mode === "wear") {
        if (t < 360) {
          // le braccia si alzano verso l'hub
          tex(bareKey, ["b1", "b2", "b3"][step(t / 360, 3)]);
          show(hub, true);
        } else if (t < 900) {
          tex(bareKey, "h0");
          show(lerp(hub, inHand(1), ease((t - 360) / 540), 16), true);
        } else if (t < 1100) {
          tex(bareKey, "h0");
          show(inHand(1), true);
        } else if (t < 1750) {
          // la mano porta lo zaino sopra la spalla
          const v = 1 - ease((t - 1100) / 650);
          tex(bareKey, `m${Math.round(v * 4)}`);
          show(inHand(v), v > 0.45);
        } else {
          if (!attached) {
            attached = true;
            pack.setVisible(false);
            walker.key = packedKey;
            walker.pack = true;
            Sfx.attach();
            onAttach?.();
          }
          tex(packedKey, ["c2", "c1", "c0", "idle"][step((t - 1750) / 350, 4)]);
        }
      } else {
        if (t < 260) {
          // la mano va alla spalla
          tex(packedKey, ["c0", "c1", "c2"][step(t / 260, 3)]);
        } else if (t < 900) {
          if (!attached) {
            attached = true;
            walker.key = bareKey;
            walker.pack = false;
          }
          const v = ease((t - 260) / 640);
          tex(bareKey, `m${Math.round(v * 4)}`);
          show(inHand(v), v > 0.45);
        } else if (t < 1080) {
          tex(bareKey, "h0");
          show(inHand(1), true);
        } else if (t < 1620) {
          tex(bareKey, "h0");
          show(lerp(inHand(1), hub, ease((t - 1080) / 540), 16), true);
        } else {
          // posato: le braccia tornano giù, lo zaino resta sull'hub dietro di lui
          show(hub, false);
          tex(bareKey, ["b3", "b2", "b1", "idle"][step((t - 1620) / 380, 4)]);
        }
      }
    },
    onComplete: () => {
      walker.posing = false;
      img.setTexture(`${walker.key}_idle`);
      if (mode === "wear") pack.destroy();
      onDone?.(mode === "wear" ? null : pack);
    }
  });
  return pack;
}

// cura della capsula come il protagonista nel menu: la mano va alla spalla, sfila lo zaino e lo
// porta davanti (lo zaino segue la mano), picchietta la pianta, poi lo rimette. Dura ~4 s.
export function careWithPack(scene, walker, { onDone } = {}) {
  const packedKey = walker.key;
  const bareKey = bareOf(scene, packedKey);
  if (!bareKey) return onDone?.();
  const img = walker.img;
  const k = img.scaleX;
  const f = walker.facing >= 0 ? 1 : -1;
  const at = (cx, cy) => [f > 0 ? img.x + (cx - 60) * k : img.x - (cx - 60) * k - 28 * k, img.y - (200 - cy) * k];
  const inHand = (v) => at(20 + 54 * v, 55 + 15 * v);
  const pack = scene.add.image(0, 0, "pack_item").setOrigin(0).setScale(k).setFlipX(f < 0).setScrollFactor(img.scrollFactorX).setVisible(false);
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
  const T1 = 450, T2 = 1350, T3 = 3150, T4 = 4050, T5 = 4500;
  walker.posing = true;
  walker.vx = 0;
  let puffed = false;
  scene.tweens.addCounter({
    from: 0,
    to: T5,
    duration: T5,
    onUpdate: (tw) => {
      const t = tw.getValue();
      let v = -1;
      if (t < T1) img.setTexture(`${packedKey}_${["c0", "c1", "c2"][Math.min(2, Math.floor((t / T1) * 3))]}`);
      else if (t >= T4) img.setTexture(`${packedKey}_${["c2", "c1", "c0"][Math.min(2, Math.floor(((t - T4) / (T5 - T4)) * 3))]}`);
      else {
        if (t < T2) v = Math.round(ease((t - T1) / (T2 - T1)) * 4) / 4;
        else if (t >= T3) v = Math.round((1 - ease((t - T3) / (T4 - T3))) * 4) / 4;
        else v = 1;
        if (v === 1 && t >= T2 && t < T3) {
          const i = Math.floor((t - T2) / 110) % 8;
          img.setTexture(`${bareKey}_h${i}`);
          if (!puffed && t > (T2 + T3) / 2) {
            puffed = true;
            walker.bubble?.(8);
          }
        } else img.setTexture(`${bareKey}_m${Math.round(v * 4)}`);
      }
      if (v >= 0) {
        const p = inHand(v);
        pack.setVisible(true).setPosition(Math.round(p[0]), Math.round(p[1])).setDepth(v > 0.4 ? walker.depth + 1 : walker.depth - 1);
      } else pack.setVisible(false);
    },
    onComplete: () => {
      pack.destroy();
      walker.posing = false;
      if (img.active) img.setTexture(`${packedKey}_idle`);
      onDone?.();
    }
  });
}
