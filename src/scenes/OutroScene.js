import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { getRun } from "../systems/RunManager.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace } from "../art/places.js";
import { Walker } from "../entities/Walker.js";
import { holdFrames, operatorKey } from "../art/people.js";
import { C, canvasImage, fadeIn, goTo, HEX, skylineLayers, txt, VIEW } from "../ui/hud.js";

const FEET = 764;
const BAR = 84; // altezza delle bande nere da cinema

// cutscene di fine giornata: rientro a casa di notte, lo zaino torna sull'hub a ricaricarsi,
// le luci si abbassano. Inquadrature con bande da cinema e zoom lenti; didascalie battute a macchina.
// Tocca per saltare. Alla fine si passa al riepilogo (EndScene).
export class OutroScene extends Phaser.Scene {
  constructor() {
    super("OutroScene");
  }

  create() {
    this._leaving = false;
    this.done = false;
    setAmbient(null);
    const run = getRun(this.registry);
    this.o2 = run?.oxygen ?? 1;
    const origin = getOrigin(this.registry);
    this.city = origin.id;
    this.op = this.registry.get("operator") ?? "a";

    // due camere: la principale inquadra la casa (zoom), quella dell'interfaccia resta ferma
    const cam = this.cameras.main;
    this.ui = this.cameras.add(0, 0, VIEW.w, VIEW.h);
    this.uiObjs = new Set();
    this.events.on("addedtoscene", (go) => {
      if (this.uiObjs.has(go)) cam.ignore(go);
      else this.ui.ignore(go);
    });

    const sky = skylineLayers(this, origin.id, buildSkyline, { time: "night" });
    cam.setScroll(Math.round((sky.worldW - VIEW.w) * 0.1), 0);
    // lo zoom si stringe verso l'hub e il pavimento, così i piedi restano in quadro
    cam.setOrigin(0.68, 0.86);
    // inquadratura alzata: il pavimento resta sopra la banda nera in basso
    cam.setPosition(0, -(BAR - (VIEW.h - FEET) + 16));
    const place = buildPlace("home", origin.id);
    canvasImage(this, `place_home_${origin.id}`, place.canvas).setScrollFactor(0);
    this.points = place.points;
    this.night = this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0).setOrigin(0).setScrollFactor(0).setDepth(800);

    // l'operatore rientra dalla porta, con lo zaino
    this.key = operatorKey(this, this.op, this.city);
    this.bare = holdFrames(this, operatorKey(this, this.op, this.city, { bare: true }));
    this.walker = new Walker(this, this.key, this.points.door, FEET, { sound: true, indoor: true, speed: 170 });
    [this.walker.img, this.walker.shadow].forEach((o) => o.setScrollFactor(0));
    this.walker.facing = -1;

    this.buildUi();
    fadeIn(this, 700);
    this.ui.fadeIn(700, 28, 40, 57);
    this.phase = "in";
    this.target = this.points.hub + 70;
    // primo piano lento verso l'hub mentre entra
    cam.zoomTo(1.18, 3600, "Sine.easeInOut");
    this.caption("21:40 · RIENTRO A CASA");
    this.input.on("pointerup", () => this.finish());
    this.input.keyboard.on("keydown-ENTER", () => this.finish());
    this.input.keyboard.on("keydown-ESC", () => this.finish());
  }

  // bande nere che entrano dall'alto e dal basso, didascalia e "tocca per saltare"
  ui$(go) {
    this.uiObjs.add(go);
    // visibile solo nella camera dell'interfaccia
    go.cameraFilter = (go.cameraFilter & ~this.ui.id) | this.cameras.main.id;
    return go;
  }

  buildUi() {
    const top = this.ui$(this.add.rectangle(0, -BAR, VIEW.w, BAR, C.c0, 1).setOrigin(0).setDepth(3000));
    const bot = this.ui$(this.add.rectangle(0, VIEW.h, VIEW.w, BAR, C.c0, 1).setOrigin(0).setDepth(3000));
    this.tweens.add({ targets: top, y: 0, duration: 700, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: bot, y: VIEW.h - BAR, duration: 700, ease: "Cubic.easeOut" });
    const line = this.ui$(this.add.graphics().setDepth(3001));
    line.fillStyle(C.c4, 1);
    line.fillRect(40, VIEW.h - BAR / 2 - 1, 6, 6);
    this.cap = this.ui$(txt(this, 60, VIEW.h - BAR / 2 + 2, "", { size: 24, origin: [0, 0.5] }).setDepth(3001));
    this.ui$(txt(this, VIEW.w - 40, BAR / 2, "TOCCA PER SALTARE", { size: 16, color: HEX.c3, origin: [1, 0.5] }).setDepth(3001));
    this.ui$(txt(this, 40, BAR / 2, "FINE GIORNATA", { size: 16, color: HEX.c3, origin: [0, 0.5] }).setDepth(3001));
  }

  caption(text) {
    this.capEv?.remove();
    let i = 0;
    this.cap.setText("");
    this.capEv = this.time.addEvent({
      delay: 32,
      repeat: text.length - 1,
      callback: () => {
        i++;
        this.cap.setText(text.slice(0, i));
        if (i % 3 === 0) Sfx.tick?.();
      }
    });
  }

  update(time, delta) {
    if (!this.walker) return;
    if (this.phase === "in") {
      this.walker.update(-1, delta);
      if (this.walker.x <= this.target) this.unpack();
    } else if (this.phase === "sofa") {
      this.walker.update(-1, delta);
      if (this.walker.x <= this.sofaX) this.lightsOut();
    } else this.walker.update(0, delta);
    // mentre è in carica, la pianta sull'hub rilascia ossigeno
    if (this.charging && (this.chargeMs -= delta) <= 0) {
      this.chargeMs = 420;
      const b = this.add.rectangle(this.hubPack.x + 6 + Math.random() * 16, this.hubPack.y + 8, 3, 3, C.c4).setScrollFactor(0).setDepth(700);
      this.tweens.add({ targets: b, y: b.y - 60 - Math.random() * 40, alpha: 0, duration: 1400, onComplete: () => b.destroy() });
    }
  }

  // si toglie lo zaino: dalla schiena, sopra la spalla, davanti, poi lo appoggia sull'hub
  unpack() {
    this.phase = "unpack";
    this.walker.frozen = true;
    this.walker.update(0, 16);
    const img = this.walker.img;
    // rivolto a sinistra lo sprite è specchiato: le x del disegno si invertono
    const at = (cx, cy) => [img.x - (cx - 60) - 28, FEET - (200 - cy)];
    const BACK = at(28, 57);
    const FRONT = at(74, 70);
    const HUB = [this.points.hub - 14, FEET - 250];
    img.setTexture(`${this.bare}_idle`);
    this.walker.key = this.bare;
    this.walker.pack = false;
    const pack = this.add.image(BACK[0], BACK[1], "pack_item").setOrigin(0).setFlipX(true).setScrollFactor(0).setDepth(img.depth - 1);
    this.hubPack = pack;
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
    const lerp = (A, B, u, lift) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - Math.sin(u * Math.PI) * lift];
    this.caption("BIONOMAD SULL'HUB · IN RICARICA");
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1500,
      onUpdate: (tw) => {
        const t = tw.getValue();
        let p;
        if (t < 0.45) p = lerp(BACK, FRONT, ease(t / 0.45), 60);
        else {
          pack.setDepth(img.depth + 1);
          img.setTexture(`${this.bare}_h0`);
          p = t < 0.6 ? FRONT : lerp(FRONT, HUB, ease((t - 0.6) / 0.4), 18);
        }
        pack.setPosition(Math.round(p[0]), Math.round(p[1]));
      },
      onComplete: () => {
        img.setTexture(`${this.bare}_idle`);
        pack.setDepth(img.depth - 1);
        Sfx.attach();
        // impulso di ricarica: un anello che si allarga dallo zaino
        const ring = this.add.rectangle(pack.x + 14, pack.y + 29, 40, 70).setStrokeStyle(2, C.c4, 1).setScrollFactor(0).setDepth(700);
        this.tweens.add({ targets: ring, scaleX: 1.8, scaleY: 1.5, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
        this.charging = true;
        this.chargeMs = 0;
        // controcampo: si allarga l'inquadratura e lui va verso il divano
        this.cameras.main.zoomTo(1, 1800, "Sine.easeInOut");
        this.time.delayedCall(1300, () => {
          this.walker.frozen = false;
          this.sofaX = Math.max(220, this.points.hub - 520);
          this.phase = "sofa";
          const pct = Math.round(this.o2 * 100);
          this.caption(`OSSIGENO A FINE GIORNATA · ${pct}%`);
        });
      }
    });
  }

  // le luci si abbassano, resta la pianta accesa; poi il riepilogo
  lightsOut() {
    this.phase = "rest";
    this.walker.facing = 1;
    this.walker.update(0, 16);
    this.time.delayedCall(700, () => {
      this.caption("BUONANOTTE. DOMANI SI RIPARTE.");
      Sfx.win?.();
      this.tweens.add({ targets: this.night, alpha: 0.55, duration: 1600, ease: "Sine.easeInOut" });
      this.cameras.main.zoomTo(1.08, 3000, "Sine.easeInOut");
      this.time.delayedCall(3300, () => this.finish());
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.charging = false;
    this.ui.fadeOut(260, 28, 40, 57);
    goTo(this, "EndScene", { result: "win", quiet: true });
  }
}
