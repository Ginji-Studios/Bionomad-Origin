import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { getRun, cityZone } from "../systems/RunManager.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace, sofaSprite } from "../art/places.js";
import { Walker } from "../entities/Walker.js";
import { holdFrames, operatorKey, sitFrames } from "../art/people.js";
import { packGesture } from "../entities/packGesture.js";
import { doorway } from "../ui/door.js";
import { C, canvasImage, fadeIn, goTo, HEX, skylineLayers, txt, VIEW } from "../ui/hud.js";

const FEET = 764;
const BAR = 84; // altezza delle bande nere da cinema
const SEAT = 44; // altezza della seduta del divano = bacino nella posa seduta (px a schermo)

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

    const sky = skylineLayers(this, origin.id, buildSkyline, { time: "night", zone: cityZone(getRun(this.registry)) });
    cam.setScroll(Math.round((sky.worldW - VIEW.w) * 0.1), 0);
    // lo zoom si stringe verso l'hub e il pavimento, così i piedi restano in quadro
    cam.setOrigin(0.68, 0.86);
    // inquadratura alzata: il pavimento resta sopra la banda nera in basso
    cam.setPosition(0, -(BAR - (VIEW.h - FEET) + 16));
    // la stanza senza divano: il divano è uno sprite nel piano del personaggio (vedi sotto)
    const place = buildPlace("home", origin.id, { sofa: false });
    const room = canvasImage(this, `place_home_${origin.id}`, place.canvas).setScrollFactor(0);
    this.points = place.points;
    // divano nello stesso piano in cui cammina il personaggio: ci passa davanti camminando
    // e poi si siede sopra la seduta, con le gambe davanti e i piedi a terra
    this.sofaX = this.points.sofa ?? 222;
    this.add.image(this.sofaX, FEET + 2, sofaSprite(this, origin.id, SEAT)).setOrigin(0.5, 1).setScrollFactor(0).setDepth(480);
    this.night = this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 1).setAlpha(0).setOrigin(0).setScrollFactor(0).setDepth(800);

    // l'operatore rientra dalla porta, con lo zaino
    this.key = operatorKey(this, this.op, this.city);
    this.bare = holdFrames(this, operatorKey(this, this.op, this.city, { bare: true }));
    this.walker = new Walker(this, this.key, this.points.door, FEET, { sound: true, indoor: true, speed: 170 });
    [this.walker.img, this.walker.shadow].forEach((o) => o.setScrollFactor(0));
    this.walker.facing = -1;
    this.walker.img.setFlipX(true);
    this.walker.maxX = this.points.door + 10;
    // entra dalla porta: il vano si apre sulla strada di notte e lui sbuca dalla luce
    this.door = doorway(this, this.points.door, { night: true, depth: this.walker.img.depth });
    [this.walker.img, this.walker.shadow].forEach((o) => o.setAlpha(0));
    this.walker.img.setScale(0.92);
    this.walker.frozen = true;
    this.time.delayedCall(500, () => {
      this.door.open();
      this.time.delayedCall(320, () => {
        this.walker.frozen = false;
        this.tweens.add({ targets: [this.walker.img, this.walker.shadow], alpha: 1, duration: 420 });
        this.tweens.add({ targets: this.walker.img, scaleX: 1, scaleY: 1, duration: 520, ease: "Sine.easeOut" });
      });
    });
    // la luce della pianta: alone retinato che resta acceso quando la stanza si spegne
    this.glow = this.add.image(0, 0, glowTexture(this)).setScrollFactor(0).setDepth(810).setAlpha(0);

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
    // bande alte quanto metà schermo: entrano per BAR px, alla fine si chiudono del tutto
    const top = this.ui$(this.add.rectangle(0, -VIEW.h / 2, VIEW.w, VIEW.h / 2, C.c0, 1).setOrigin(0).setDepth(3000));
    const bot = this.ui$(this.add.rectangle(0, VIEW.h, VIEW.w, VIEW.h / 2, C.c0, 1).setOrigin(0).setDepth(3000));
    this.barTop = top;
    this.barBot = bot;
    this.tweens.add({ targets: top, y: BAR - VIEW.h / 2, duration: 700, ease: "Cubic.easeOut" });
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
      }
    });
  }

  update(time, delta) {
    if (!this.walker) return;
    if (this.phase === "in") {
      this.walker.update(-1, delta);
      // passato il vano, la porta si richiude alle sue spalle
      if (!this.doorClosed && this.walker.x < this.points.door - 110) {
        this.doorClosed = true;
        this.door.close();
      }
      if (this.walker.x <= this.target) this.unpack();
    } else if (this.phase === "sofa") {
      this.walker.update(-1, delta);
      if (this.walker.x <= this.sofaX) this.phase = "stop";
    } else if (this.phase === "stop") {
      // si ferma del tutto prima di girarsi (niente scivolate all'indietro)
      this.walker.update(0, delta);
      if (!this.walker.moving && Math.abs(this.walker.vx) < 1) this.sitDown();
    } else if (this.phase !== "sit") this.walker.update(0, delta);
    // mentre è in carica, la pianta sull'hub rilascia ossigeno
    if (this.charging && (this.chargeMs -= delta) <= 0) {
      this.chargeMs = 380;
      const b = this.add.rectangle(this.hubPack.x + 8 + Math.random() * 12, this.hubPack.y + 10, 3 + (Math.random() < 0.3 ? 1 : 0), 3, Math.random() < 0.7 ? 0xf1f0ed : C.c4).setScrollFactor(0).setDepth(820);
      const drift = (Math.random() - 0.5) * 24;
      this.tweens.add({ targets: b, y: b.y - 70 - Math.random() * 50, x: b.x + drift, alpha: 0, duration: 1600, ease: "Sine.easeOut", onComplete: () => b.destroy() });
    }
    if (this.charging && this.glow) {
      // l'alone respira lentamente
      this.glow.setPosition(this.hubPack.x + 14, this.hubPack.y + 26).setScale(1 + Math.sin(time / 520) * 0.05);
    }
  }

  // si toglie lo zaino: dalla schiena, sopra la spalla, davanti, poi lo appoggia sull'hub
  unpack() {
    this.phase = "unpack";
    this.walker.frozen = true;
    this.walker.update(0, 16);
    const hub = [this.points.hub - 14, FEET - 250];
    this.caption("BIONOMAD SULL'HUB · IN RICARICA");
    packGesture(this, this.walker, {
      bareKey: this.bare,
      packedKey: this.key,
      hub,
      mode: "unpack",
      onDone: (pack) => {
        this.hubPack = pack;
        Sfx.attach();
        // impulso di ricarica: un anello che si allarga dallo zaino
        const ring = this.add.rectangle(pack.x + 14, pack.y + 29, 40, 70).setStrokeStyle(2, C.c4, 1).setScrollFactor(0).setDepth(700);
        this.tweens.add({ targets: ring, scaleX: 1.8, scaleY: 1.5, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
        this.charging = true;
        this.chargeMs = 0;
        this.tweens.add({ targets: this.glow, alpha: 0.75, duration: 900 });
        // controcampo: si allarga l'inquadratura e lui va verso il divano
        this.cameras.main.zoomTo(1, 1800, "Sine.easeInOut");
        this.time.delayedCall(1100, () => {
          this.walker.frozen = false;
          this.walker.facing = -1;
          
          this.phase = "sofa";
          const pct = Math.round(this.o2 * 100);
          this.caption(`OSSIGENO A FINE GIORNATA · ${pct}%`);
        });
      }
    });
  }

  // si gira verso la stanza e si siede sul divano, guardando la pianta in carica
  sitDown() {
    this.phase = "sit";
    const w = this.walker;
    const img = w.img;
    w.posing = true;
    w.moving = false;
    w.phase = 0;
    w.vx = 0;
    sitFrames(this, w.key);
    // 1) si gira verso la stanza: mezzo giro con un piccolo schiacciamento, i piedi restano fermi
    this.tweens.add({
      targets: img,
      scaleX: 0.86,
      duration: 110,
      ease: "Sine.easeIn",
      onComplete: () => {
        w.facing = 1;
        img.setFlipX(false).setTexture(`${w.key}_idle`);
        this.tweens.add({ targets: img, scaleX: 1, duration: 130, ease: "Sine.easeOut" });
      }
    });
    // 2) si siede: 8 pose che piegano le ginocchia e portano il bacino sulla seduta,
    //    più lente all'inizio e alla fine (il corpo accompagna, non cade)
    const t0 = 330;
    const gaps = [0, 85, 75, 70, 70, 75, 90, 110];
    let t = t0;
    gaps.forEach((g, i) => {
      t += g;
      this.time.delayedCall(t, () => img.setTexture(`${w.key}_s${i}`));
    });
    // 3) il cuscino cede appena sotto il peso, poi il respiro da seduto
    this.time.delayedCall(t + 60, () => {
      this.tweens.add({ targets: img, y: img.y + 2, duration: 140, yoyo: true, ease: "Sine.easeOut" });
    });
    this.tweens.add({ targets: w.shadow, alpha: 0.25, scaleX: 1.2, duration: 500, delay: t0 });
    this.time.delayedCall(t + 450, () => {
      const sy = img.scaleY;
      this.tweens.add({ targets: img, scaleY: sy * 0.988, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.lightsOut();
    });
  }


  // le luci si abbassano, resta accesa solo la pianta; poi il riepilogo
  lightsOut() {
    this.phase = "sit";
    this.time.delayedCall(500, () => {
      Sfx.blip?.();
      this.caption("BUONANOTTE. DOMANI SI RIPARTE.");
      Sfx.win?.();
      this.tweens.add({ targets: this.night, alpha: 0.62, duration: 1800, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: this.glow, alpha: 1, duration: 1800 });
      // spenta la luce, entra il chiaro di luna dalle finestre: fasci retinati sul pavimento
      this.moonBeams();
      this.cameras.main.zoomTo(1.1, 3400, "Sine.easeInOut");
      // chiusura: le bande da cinema si stringono sulla scena, poi il riepilogo
      this.time.delayedCall(3600, () => {
        this.caption("O₂RIGIN · GIORNATA COMPLETATA");
        this.tweens.add({ targets: this.barTop, y: -40, duration: 1400, ease: "Cubic.easeInOut" });
        this.tweens.add({ targets: this.barBot, y: VIEW.h / 2 + 40, duration: 1400, ease: "Cubic.easeInOut" });
      });
      this.time.delayedCall(5400, () => this.finish());
    });
  }

  // fasci di luna: dalle finestre scendono obliqui fino al pavimento, nel retino della palette
  moonBeams() {
    const p = this.points;
    const floor = Math.round(GYK);
    [0, 1].forEach((i) => {
      const wx = p[`w${i}x`];
      const wy = p[`w${i}y`];
      const ww = p[`w${i}w`];
      const wh = p[`w${i}h`];
      if (wx == null) return;
      const key = beamTexture(this, ww, wh, floor - wy);
      const img = this.add.image(wx - Math.round((floor - wy) * 0.55), wy, key).setOrigin(0, 0).setScrollFactor(0).setDepth(805).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 0.7, duration: 2200, delay: 600, ease: "Sine.easeInOut" });
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

const GYK = (480 * 800) / 540;
// fascio di luna: parallelogramma che parte dalla finestra e scende a sinistra sul pavimento,
// più denso in alto e sfumato in basso; retino Bayer 4x4 a celle di 3 px
function beamTexture(scene, ww, wh, drop) {
  const key = `outro_beam_${ww}_${wh}_${drop}`;
  if (scene.textures.exists(key)) return key;
  const slant = 0.55;
  const W = Math.round(ww + drop * slant + 8);
  const H = Math.round(drop + 60);
  const t = scene.textures.createCanvas(key, W, H);
  const X = t.getContext();
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const cell = 3;
  const off = drop * slant;
  for (let y = 0; y < H; y += cell) {
    const sh = Math.min(y, drop) * slant;
    for (let x = 0; x < W; x += cell) {
      // il fascio: tra i bordi della finestra spostati verso sinistra
      const lx = x - (off - sh);
      if (lx < 0 || lx > ww) continue;
      let v;
      if (y <= drop) v = y < wh ? 0.12 : 0.03 + 0.09 * (1 - (y - wh) / Math.max(1, drop - wh));
      else v = 0.24 * (1 - (y - drop) / 60); // macchia di luce sul pavimento
      const edge = Math.min(lx, ww - lx) / 14;
      v *= Math.min(1, edge);
      const th = (B[((y / cell) & 3) * 4 + ((x / cell) & 3)] + 0.5) / 16;
      if (v > th) {
        X.fillStyle = "#f1f0ed";
        X.globalAlpha = 0.5;
        X.fillRect(x, y, cell, cell);
      }
    }
  }
  t.refresh();
  return key;
}

// alone retinato della pianta: dischi concentrici a retino Bayer nel colore della lampada
function glowTexture(scene) {
  const key = "outro_glow";
  if (scene.textures.exists(key)) return key;
  const R = 120;
  const t = scene.textures.createCanvas(key, R * 2, R * 2);
  const X = t.getContext();
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const cell = 3;
  for (let y = 0; y < R * 2; y += cell)
    for (let x = 0; x < R * 2; x += cell) {
      const d = Math.hypot(x - R, y - R) / R;
      if (d >= 1) continue;
      const v = Math.pow(1 - d, 1.6);
      const th = (B[((y / cell) & 3) * 4 + ((x / cell) & 3)] + 0.5) / 16;
      if (v * 0.9 > th) {
        X.fillStyle = v > 0.55 ? "#A3BDF0" : "#7FA6E3";
        X.globalAlpha = 0.35 + v * 0.4;
        X.fillRect(x, y, cell, cell);
      }
    }
  t.refresh();
  return key;
}
