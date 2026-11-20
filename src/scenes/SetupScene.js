import { addHiRes } from "../art/hires.js";
import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { ORIGINS } from "../config/origins.js";
import { startRun } from "../systems/RunManager.js";
import { OPERATORS, operatorKey } from "../art/people.js";
import { buildSkyline } from "../world/skyline.js";
import { ensureMenuBg } from "./MenuScene.js";
import { plantNav } from "../input/plantNav.js";
import { brackets, button, C, fadeIn, goTo, HEX, txt, VIEW } from "../ui/hud.js";

// scelta in due passi, impaginata come il fascicolo BIONOMAD SYSTEM:
// prima la città, poi l'operatore
const CITY_ORDER = ["reykjavik", "milano", "delhi"];
const NAME = { reykjavik: "REYKJAVÍK", milano: "MILANO", delhi: "NEW DELHI" };
const CODE = { reykjavik: "CT-01", milano: "CT-02", delhi: "CT-03" };
const LEVEL = { reykjavik: 1, milano: 2, delhi: 3 };
const AIR = { reykjavik: "BASSO", milano: "MEDIO", delhi: "ALTO" };
const DIFF = { reykjavik: "FACILE", milano: "MEDIA", delhi: "DIFFICILE" };
const FOCUS = { reykjavik: 520, milano: 520, delhi: 520 };
const CW = 384;
const GAP = 24;
const TOP = 112;
const CH = 568;
const IMG_H = 300;

// miniatura della città: ritaglio della skyline rimpicciolito di metà (retino a pixel pieni)
function cityThumb(scene, id) {
  const key = `thumb2_${id}`;
  if (scene.textures.exists(key)) return key;
  const s = buildSkyline(id, { viewW: VIEW.w, viewH: VIEW.h });
  const full = document.createElement("canvas");
  full.width = VIEW.w;
  full.height = VIEW.h;
  const g = full.getContext("2d", { willReadFrequently: true });
  s.layers.forEach(({ canvas }) => g.drawImage(canvas, 0, 0));
  const w = CW - 32;
  const h = IMG_H;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = Math.round(FOCUS[id] * s.k);
  const cg = c.getContext("2d", { willReadFrequently: true });
  cg.imageSmoothingEnabled = false;
  cg.drawImage(full, cx - w, s.groundY + 60 - h * 2, w * 2, h * 2, 0, 0, w, h);
  scene.textures.addCanvas(key, c);
  return key;
}

// fondo a griglia dei riquadri immagine, come nelle schede dei dispositivi
// sfondo della scheda operatore: una via in stile illustrato piatto (cielo chiaro, palazzi
// blu-grigi con le finestre, marciapiede), disegnata in vettoriale a risoluzione doppia
function gridBg(scene, h = IMG_H) {
  const key = `setup_street_${h}`;
  if (scene.textures.exists(key)) return key;
  const w = CW - 32;
  const S = 2;
  const c = document.createElement("canvas");
  c.width = w * S;
  c.height = h * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  const sky = X.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#B9C5D6");
  sky.addColorStop(1, "#E4E8EE");
  X.fillStyle = sky;
  X.fillRect(0, 0, w, h);
  X.fillStyle = "rgba(255,255,255,0.8)";
  X.beginPath();
  X.ellipse(w * 0.72, 70, 34, 10, 0, 0, 7);
  X.ellipse(w * 0.76, 62, 20, 10, 0, 0, 7);
  X.fill();
  const ground = h - 40;
  const row = (list, col, win) =>
    list.forEach(([x, bw, bh]) => {
      X.fillStyle = col;
      X.fillRect(x, ground - bh, bw, bh);
      if (!win) return;
      X.fillStyle = win;
      for (let y = ground - bh + 14; y < ground - 18; y += 22) for (let wx = x + 8; wx < x + bw - 10; wx += 16) X.fillRect(wx, y, 8, 10);
    });
  row([[-10, 90, 330], [86, 70, 260], [150, 110, 380], [256, 60, 290], [312, 80, 340]], "#A7B4C7");
  row([[0, 80, 200], [96, 64, 150], [200, 92, 230], [300, 60, 170]], "#8296B1", "rgba(228,233,240,0.55)");
  // marciapiede e strada
  X.fillStyle = "#6C7E98";
  X.fillRect(0, ground, w, 40);
  X.fillStyle = "#D7DDE6";
  X.fillRect(0, ground, w, 3);
  X.fillStyle = "rgba(255,255,255,0.5)";
  for (let x = 10; x < w; x += 70) X.fillRect(x, ground + 24, 36, 3);
  addHiRes(scene, key, c, S);
  return key;
}

export class SetupScene extends Phaser.Scene {
  constructor() {
    super("SetupScene");
  }

  create() {
    this._leaving = false;
    fadeIn(this, 300);
    setAmbient(null);
    ensureMenuBg(this);
    this.add.image(0, 0, "menu_bg").setOrigin(0);
    this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.55).setOrigin(0);
    brackets(this);
    this.city = this.registry.get("origin") ?? "milano";
    this.op = this.registry.get("operator") ?? "a";
    // pianta: destra / sinistra scorre le scelte, tenendola inclinata si conferma
    plantNav(this, { left: () => this.move(-1), right: () => this.move(1), hold: () => this.confirm() });
    this.layer = this.add.container(0, 0);
    this.back = button(this, 40, 716, 200, 56, "◀ INDIETRO", () => this.goBack(), { size: 22 });
    this.next = button(this, VIEW.w - 300, 716, 260, 56, "AVANTI ▶", () => this.confirm(), { primary: true, size: 24 });
    const kb = this.input.keyboard;
    kb.on("keydown-LEFT", () => this.move(-1));
    kb.on("keydown-A", () => this.move(-1));
    kb.on("keydown-RIGHT", () => this.move(1));
    kb.on("keydown-D", () => this.move(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-ESC", () => this.goBack());
    this.showCities();
  }



  // ---- elementi del fascicolo

  frame(x, y, w, h, { fill = 0.88, bright = false } = {}) {
    const g = this.add.graphics();
    if (fill) {
      g.fillStyle(C.c0, fill);
      g.fillRect(x, y, w, h);
    }
    g.lineStyle(bright ? 3 : 2, bright ? C.c4 : C.c3, 1);
    g.strokeRect(x, y, w, h);
    g.fillStyle(C.c4, 1);
    // (angoli a quadratino rimossi: stile vettoriale pulito)
    this.layer.add(g);
    return g;
  }

  rows(x, y, w, list, sel) {
    const g = this.add.graphics();
    g.lineStyle(1, C.c3, 1);
    list.forEach(([label, value], i) => {
      const ry = y + i * 42;
      g.strokeRect(x, ry, w, 42);
      this.layer.add(txt(this, x + 12, ry + 10, label, { size: 18, color: HEX.c3 }));
      if (typeof value === "number") {
        // tacche di difficoltà
        for (let k = 0; k < 3; k++) {
          const bx = x + w - 12 - (3 - k) * 34;
          if (k < value) {
            g.fillStyle(sel ? C.c4 : C.c3, 1);
            g.fillRect(bx, ry + 13, 28, 16);
          } else g.strokeRect(bx + 0.5, ry + 13.5, 27, 15);
        }
      } else this.layer.add(txt(this, x + w - 12, ry + 10, value, { size: 18, origin: [1, 0], color: sel ? HEX.c4 : HEX.c3 }));
    });
    this.layer.add(g);
  }

  header(step, title) {
    this.frame(40, 34, VIEW.w - 80, 56);
    this.layer.add(txt(this, 60, 62, title, { size: 28, weight: "500", origin: [0, 0.5] }));
    this.layer.add(this.add.image(VIEW.w - 60, 62, "logo_biodom").setOrigin(1, 0.5).setTint(C.c4));
  }

  // barra in fondo alla scheda: piena quando è la scelta attuale
  tag(x, y, sel, text) {
    const g = this.add.graphics();
    g.fillStyle(sel ? C.c4 : C.c0, sel ? 1 : 0.6);
    g.fillRect(x + 16, y + CH - 56, CW - 32, 40);
    g.lineStyle(1, sel ? C.c4 : C.c3, 1);
    g.strokeRect(x + 16, y + CH - 56, CW - 32, 40);
    this.layer.add(g);
    this.layer.add(txt(this, x + CW / 2, y + CH - 36, text, { size: 20, origin: 0.5, color: sel ? HEX.c0 : HEX.c3 }));
  }

  hit(x, y, fn) {
    const z = this.add.zone(x, y, CW, CH).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on("pointerup", fn);
    this.layer.add(z);
  }

  // ---- passo 1: la città

  showCities() {
    this.step = "city";
    this.layer.removeAll(true);
    this.tweens.killAll();
    this.header(1, "SCEGLI LA CITTÀ");
    this.next.setLabel("AVANTI ▶");
    CITY_ORDER.forEach((id, i) => {
      const x = 40 + i * (CW + GAP);
      const y = TOP;
      const sel = id === this.city;
      const o = ORIGINS.find((v) => v.id === id);
      this.frame(x, y, CW, CH, { bright: sel });
      this.layer.add(txt(this, x + 16, y + 14, CODE[id], { size: 16, color: HEX.c3 }));
      this.layer.add(txt(this, x + CW - 16, y + 12, NAME[id], { size: 22, weight: "500", origin: [1, 0], color: sel ? HEX.c4 : HEX.c3 }));
      const img = this.add.image(x + 16, y + 44, cityThumb(this, id)).setOrigin(0).setAlpha(sel ? 1 : 0.55);
      this.layer.add(img);
      this.frame(x + 16, y + 44, CW - 32, IMG_H, { fill: 0 });
      this.rows(x + 16, y + 44 + IMG_H + 14, CW - 32, [["PM2.5", `${o.pm25} µg/m³`], ["INQUINAMENTO", AIR[id]], ["DIFFICOLTÀ", LEVEL[id]]], sel);
      this.tag(x, y, sel, DIFF[id]);
      this.hit(x, y, () => (this.city === id ? this.confirm() : this.pickCity(id)));
    });
  }

  // ---- passo 2: l'operatore, già vestito per la città scelta

  showOperators() {
    this.step = "op";
    this.layer.removeAll(true);
    this.tweens.killAll();
    this.header(2, "SCEGLI L'OPERATORE");
    this.next.setLabel("INIZIA ▶");
    const x0 = (VIEW.w - (CW * 2 + GAP)) / 2;
    OPERATORS.forEach((op, i) => {
      const x = x0 + i * (CW + GAP);
      const y = TOP;
      const sel = op.id === this.op;
      this.frame(x, y, CW, CH, { bright: sel });
      this.layer.add(txt(this, x + 16, y + 14, `OP-${op.id.toUpperCase()}`, { size: 16, color: HEX.c3 }));
      this.layer.add(txt(this, x + CW - 16, y + 12, op.label, { size: 22, weight: "500", origin: [1, 0], color: sel ? HEX.c4 : HEX.c3 }));
      // solo la figura, grande, a pixel doppi
      const ih = CH - 44 - 16;
      this.layer.add(this.add.image(x + 16, y + 44, gridBg(this, ih)).setOrigin(0));
      const fig = this.add.image(x + CW / 2, y + 44 + ih - 22, `${operatorKey(this, op.id, this.city)}_idle`).setOrigin(0.5, 1).setScale(2).setAlpha(sel ? 1 : 0.55);
      this.layer.add(fig);
      this.frame(x + 16, y + 44, CW - 32, ih, { fill: 0 });
      
      this.hit(x, y, () => (this.op === op.id ? this.confirm() : this.pickOp(op.id)));
    });
  }

  pickCity(id) {
    Sfx.blip();
    this.city = id;
    this.showCities();
  }

  pickOp(id) {
    Sfx.blip();
    this.op = id;
    this.showOperators();
  }

  onStart() {
    this.confirm();
  }

  move(dir) {
    if (this.step === "city") {
      const i = Phaser.Math.Wrap(CITY_ORDER.indexOf(this.city) + dir, 0, CITY_ORDER.length);
      this.pickCity(CITY_ORDER[i]);
    } else {
      const i = Phaser.Math.Wrap(OPERATORS.findIndex((o) => o.id === this.op) + dir, 0, OPERATORS.length);
      this.pickOp(OPERATORS[i].id);
    }
  }

  confirm() {
    if (this.step === "city") {
      Sfx.confirm();
      this.showOperators();
      return;
    }
    this.registry.set("operator", this.op);
    startRun(this.registry, this.city);
    goTo(this, "IntroScene");
  }

  goBack() {
    if (this.step === "op") this.showCities();
    else goTo(this, "MenuScene");
  }
}
