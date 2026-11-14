import { careFrames, holdFrames } from "../art/people.js";
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
  const inHand = (v) => at(28 + 46 * v, 57 + 13 * v);
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
