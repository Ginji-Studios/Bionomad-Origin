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
const SEAT = 44;
const NIGHT = 0x0e1626; // blu notte di bande e stanza al buio // altezza della seduta del divano = bacino nella posa seduta (px a schermo)

// cutscene di fine giornata: rientro a casa di notte, lo zaino torna sull'hub a ricaricarsi,
// le luci si abbassano. Inquadrature con bande da cinema e zoom lenti; didascalie battute a macchina.
// Tocca per saltare. Alla fine si passa al riepilogo (EndScene).
export class OutroScene extends Phaser.Scene {
  constructor() {
    super("OutroScene");
  }

  init(data) {
    // inside: si è già in casa (l'ultimo evento era a casa), niente rientro dalla porta.
    // night: il BIONOMAD ti aveva svegliato, si torna a dormire
    this.inside = Boolean(data?.inside);
    this.wasNight = Boolean(data?.night);
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
    this.night = this.add.rectangle(0, 0, VIEW.w, VIEW.h, NIGHT, 1).setAlpha(0).setOrigin(0).setScrollFactor(0).setDepth(800);

    // l'operatore rientra dalla porta, con lo zaino
    this.key = operatorKey(this, this.op, this.city);
    this.bare = holdFrames(this, operatorKey(this, this.op, this.city, { bare: true }));
    const startX = this.inside ? Math.min(this.points.door - 150, this.points.hub + 330) : this.points.door;
    this.walker = new Walker(this, this.key, startX, FEET, { sound: true, indoor: true, speed: 170 });
    [this.walker.img, this.walker.shadow].forEach((o) => o.setScrollFactor(0));
    this.walker.facing = -1;
    this.walker.img.setFlipX(true);
    this.walker.maxX = this.points.door + 10;
    if (!this.inside) {
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
    } else this.doorClosed = true;
    // di notte la stanza è già in penombra
    if (this.wasNight) this.night.setAlpha(0.35);
    // la luce della pianta: alone retinato che resta acceso quando la stanza si spegne
    this.glow = this.add.image(0, 0, glowTexture(this)).setScrollFactor(0).setDepth(810).setAlpha(0);

    this.buildUi();
    fadeIn(this, 700);
    this.ui.fadeIn(700, 14, 22, 38);
    this.phase = "in";
    this.target = this.points.hub + 70;
    // primo piano lento verso l'hub mentre entra
    cam.zoomTo(1.18, 3600, "Sine.easeInOut");
    this.caption(this.wasNight ? "03:20 · DI NUOVO A DORMIRE" : this.inside ? "21:40 · FINE SERATA" : "21:40 · RIENTRO A CASA");
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
    const top = this.ui$(this.add.rectangle(0, -VIEW.h / 2, VIEW.w, VIEW.h / 2, NIGHT, 1).setOrigin(0).setDepth(3000));
    const bot = this.ui$(this.add.rectangle(0, VIEW.h, VIEW.w, VIEW.h / 2, NIGHT, 1).setOrigin(0).setDepth(3000));
    this.barTop = top;
    this.barBot = bot;
    this.tweens.add({ targets: top, y: BAR - VIEW.h / 2, duration: 700, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: bot, y: VIEW.h - BAR, duration: 700, ease: "Cubic.easeOut" });
    const line = this.ui$(this.add.graphics().setDepth(3001));
    line.fillStyle(0xe2b33c, 1);
    line.fillRect(40, VIEW.h - BAR / 2 - 1, 6, 6);
    this.cap = this.ui$(txt(this, 60, VIEW.h - BAR / 2 + 2, "", { size: 24, color: "#F4F5F7", origin: [0, 0.5] }).setDepth(3001));
    this.ui$(txt(this, VIEW.w - 40, BAR / 2, "TOCCA PER SALTARE", { size: 16, color: "#9AA7BA", origin: [1, 0.5] }).setDepth(3001));
    this.ui$(txt(this, 40, BAR / 2, "FINE GIORNATA", { size: 16, color: "#9AA7BA", origin: [0, 0.5] }).setDepth(3001));
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
      if (!this.doorClosed && this.door && this.walker.x < this.points.door - 110) {
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
      const b = this.add.circle(this.hubAt.x + 8 + Math.random() * 12, this.hubAt.y + 10, 1.6 + Math.random() * 1.4, Math.random() < 0.7 ? 0xf1f0ed : 0xa9c6e0, 0.9).setScrollFactor(0).setDepth(820);
      const drift = (Math.random() - 0.5) * 24;
      this.tweens.add({ targets: b, y: b.y - 70 - Math.random() * 50, x: b.x + drift, alpha: 0, duration: 1600, ease: "Sine.easeOut", onComplete: () => b.destroy() });
    }
    if (this.charging && this.glow) {
      // l'alone respira lentamente
      this.glow.setPosition(this.hubAt.x + 14, this.hubAt.y + 26).setScale(1 + Math.sin(time / 520) * 0.05);
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
        // punto fisso dell'hub per alone e bollicine (lo zaino sparisce dentro l'hub)
        this.hubAt = { x: pack.x, y: pack.y };
        // il Bionomad si aggancia e scompare nell'hub: scende di poco e si dissolve
        this.tweens.add({ targets: pack, y: pack.y + 14, alpha: 0, duration: 520, delay: 180, ease: "Sine.easeIn", onComplete: () => pack.setVisible(false) });
        Sfx.attach();
        // impulso di ricarica: un anello che si allarga dallo zaino
        const ring = this.add.ellipse(pack.x + 14, pack.y + 29, 44, 70).setStrokeStyle(2, 0xa9c6e0, 1).setScrollFactor(0).setDepth(700);
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
      // spenta la luce, entra il chiaro di luna dalle finestre
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

  // fasci di luna: dalle finestre scendono obliqui fino al pavimento
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
    this.ui.fadeOut(260, 14, 22, 38);
    goTo(this, "EndScene", { result: "win", quiet: true });
  }
}

const GYK = (480 * 800) / 540;
// fascio di luna: parallelogramma che parte dalla finestra e scende a sinistra sul pavimento,
// sfumato in modo continuo (stile vettoriale, niente retino)
function beamTexture(scene, ww, wh, drop) {
  const key = `outro_beam2_${ww}_${wh}_${drop}`;
  if (scene.textures.exists(key)) return key;
  const slant = 0.55;
  const off = drop * slant;
  const W = Math.round(ww + off + 8);
  const H = Math.round(drop + 60);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const X = c.getContext("2d");
  const gr = X.createLinearGradient(0, 0, 0, drop);
  gr.addColorStop(0, "rgba(241,240,237,0.16)");
  gr.addColorStop(Math.min(0.95, wh / drop), "rgba(241,240,237,0.08)");
  gr.addColorStop(1, "rgba(241,240,237,0.03)");
  X.fillStyle = gr;
  X.beginPath();
  X.moveTo(off, 0);
  X.lineTo(off + ww, 0);
  X.lineTo(ww, drop);
  X.lineTo(0, drop);
  X.closePath();
  X.fill();
  // macchia di luce sul pavimento
  const pool = X.createRadialGradient(ww / 2, drop + 8, 4, ww / 2, drop + 8, ww * 0.75);
  pool.addColorStop(0, "rgba(241,240,237,0.22)");
  pool.addColorStop(1, "rgba(241,240,237,0)");
  X.fillStyle = pool;
  X.save();
  X.translate(0, drop + 8);
  X.scale(1, 0.25);
  X.translate(0, -(drop + 8));
  X.fillRect(-ww, 0, ww * 3, H * 4);
  X.restore();
  scene.textures.addCanvas(key, c);
  return key;
}

// alone della pianta: sfumatura radiale morbida nei blu del brand
function glowTexture(scene) {
  const key = "outro_glow2";
  if (scene.textures.exists(key)) return key;
  const R = 120;
  const c = document.createElement("canvas");
  c.width = R * 2;
  c.height = R * 2;
  const X = c.getContext("2d");
  const gr = X.createRadialGradient(R, R, 0, R, R, R);
  gr.addColorStop(0, "rgba(190,214,240,0.75)");
  gr.addColorStop(0.35, "rgba(127,166,227,0.38)");
  gr.addColorStop(1, "rgba(127,166,227,0)");
  X.fillStyle = gr;
  X.fillRect(0, 0, R * 2, R * 2);
  scene.textures.addCanvas(key, c);
  return key;
}
