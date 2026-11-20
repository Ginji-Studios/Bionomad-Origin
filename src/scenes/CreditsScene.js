import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { TEAM_LOOK } from "../art/people.js";
import { productArt, teamBust } from "../art/creditsArt.js";
import { ensureMenuBg } from "./MenuScene.js";
import { brackets, button, C, fadeIn, goTo, HEX, txt, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

// crediti come un fascicolo BIODOM: riquadri con i nodi agli incroci, immagini retinate,
// righe dati etichetta / valore e il grafico dell'ossigeno
const PRODUCTS = [
  {
    code: "BN-01",
    name: "BIONOMAD BACKPACK",
    art: "backpack",
    rows: [["FUNZIONE", "OSSIGENO PERSONALE"], ["SUBSTRATO", "BIOMASSA VEGETALE"], ["COLLEGAMENTO", "TUBO · MASCHERA"], ["MANUTENZIONE", "CONTINUA"]]
  },
  {
    code: "BN-02",
    name: "ACTIVE PACK",
    art: "active",
    rows: [["FUNZIONE", "RISERVA SGANCIABILE"], ["SUBSTRATO", "MICRO-ALGHE"], ["AUTONOMIA", "1-2 ORE"], ["AGGANCIO", "RAPIDO"]]
  },
  {
    code: "BN-03",
    name: "HOME HUB",
    art: "hub",
    rows: [["FUNZIONE", "ARIA DOMESTICA"], ["SUBSTRATO", "SERRA D'INTERNO"], ["RICARICA", "MODULI INDOSSABILI"], ["UTENZA", "FAMIGLIA"]]
  }
];

// sansevieria: foglie a spada con le bande ondulate (come la pianta del gioco)
function sansevieria(X, G, bx, by, s, n = 5) {
  const leaves = [[-12, 0.78, -0.3, 0.5], [-4, 0.95, -0.1, 0.62], [4, 1, 0.04, 0.72], [12, 0.85, 0.2, 0.58], [18, 0.66, 0.38, 0.5], [-8, 0.6, -0.22, 0.8], [8, 0.66, 0.26, 0.82]].slice(0, n + 2);
  leaves.forEach(([dx, hh, tilt, tone], i) => {
    const h = hh * 100 * s;
    const w = 7 * s;
    const x0 = bx + dx * s;
    const tx = x0 + Math.sin(tilt) * h;
    const ty = by - Math.cos(tilt) * h;
    const nx = Math.cos(tilt);
    const ny = Math.sin(tilt);
    X.save();
    X.beginPath();
    X.moveTo(x0 - w * nx, by - w * ny);
    X.quadraticCurveTo(x0 - w * 1.4 * nx + (tx - x0) * 0.5, by - w * 1.4 * ny + (ty - by) * 0.5, tx, ty);
    X.quadraticCurveTo(x0 + w * 1.4 * nx + (tx - x0) * 0.5, by + w * 1.4 * ny + (ty - by) * 0.5, x0 + w * nx, by + w * ny);
    X.closePath();
    const g = X.createLinearGradient(x0 - w, 0, x0 + w, 0);
    g.addColorStop(0, G(tone + 0.18));
    g.addColorStop(1, G(tone - 0.18));
    X.fillStyle = g;
    X.fill();
    X.clip();
    X.strokeStyle = G(tone - 0.35);
    X.lineWidth = 1.6;
    for (let k = 8; k < h; k += 7 + (i % 3)) {
      const cx = x0 + Math.sin(tilt) * k;
      const cy = by - Math.cos(tilt) * k;
      X.beginPath();
      for (let t = -w * 1.4; t <= w * 1.4; t += 2) {
        const px = cx + t * nx;
        const py = cy + t * ny + Math.sin(t + k) * 1.2;
        if (t === -w * 1.4) X.moveTo(px, py);
        else X.lineTo(px, py);
      }
      X.stroke();
    }
    X.restore();
  });
}

// nomi del team, nello stesso ordine dei ritratti
const TEAM_NAMES = ["CLAUDIA", "FEDERICO", "ANOUK", "SERENA", "FRANCESCA", "MARTA"];

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }

  create() {
    this._leaving = false;
    fadeIn(this, 300);
    setAmbient(null);
    ensureMenuBg(this);
    this.add.image(0, 0, "menu_bg").setOrigin(0);
    this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.55).setOrigin(0);
    brackets(this);
    this.page = this.add.container(0, 0);
    this.tabs = ["BIONOMAD SYSTEM", "TEAM"].map((label, i) => button(this, VIEW.w - 600 + i * 280, 716, 260, 56, label, () => this.show(i), { size: 22 }));
    button(this, 40, 716, 180, 56, "◀ MENU", () => goTo(this, "MenuScene"), { size: 22 });
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));
    this.input.keyboard.on("keydown-LEFT", () => this.show(0));
    this.input.keyboard.on("keydown-RIGHT", () => this.show(1));
    plantNav(this, { left: () => this.show(0), right: () => this.show(1) });
    this.show(0);
  }

  // riquadro del fascicolo: linee sottili e un nodo a ogni angolo
  // scheda piatta: carta chiara con angoli arrotondati e ombra leggera
  frame(x, y, w, h, { fill = 0.96 } = {}) {
    const g = this.add.graphics();
    if (fill) {
      g.fillStyle(C.c4, 0.1);
      g.fillRoundedRect(x, y + 4, w, h, 18);
      g.fillStyle(C.c0, fill);
      g.fillRoundedRect(x, y, w, h, 18);
    }
    this.page.add(g);
    return g;
  }

  rows(x, y, w, list, { size = 18, step = 34 } = {}) {
    const g = this.add.graphics();
    g.lineStyle(1, C.c3, 1);
    list.forEach(([label, value], i) => {
      const ry = y + i * step;
      this.page.add(txt(this, x + 10, ry + 7, label, { size, color: HEX.c3 }));
      this.page.add(txt(this, x + w - 10, ry + 7, value, { size, origin: [1, 0] }));
      if (i < list.length - 1) g.lineBetween(x, ry + step, x + w, ry + step);
    });
    this.page.add(g);
  }

  header(code, title) {
    this.frame(40, 34, VIEW.w - 80, 56);
    this.page.add(txt(this, 60, 62, title, { size: 28, weight: "500", origin: [0, 0.5] }));
    this.page.add(txt(this, VIEW.w - 220, 62, code, { size: 20, color: HEX.c3, origin: [1, 0.5] }));
    this.page.add(this.add.image(VIEW.w - 60, 62, "logo_biodom").setOrigin(1, 0.5).setTint(C.c4));
  }

  show(i) {
    this.tabs.forEach((t, k) => t.setSelected(k === i));
    this.page.removeAll(true);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.crew = null;
    if (i === 0) this.ecosystem();
    else this.team();
  }

  ecosystem() {
    this.header("DOSSIER · BN-SYS", "BIONOMAD SYSTEM");
    const cw = 384;
    PRODUCTS.forEach((p, k) => {
      const x = 40 + k * (cw + 24);
      const y = 110;
      this.frame(x, y, cw, 582);
      this.page.add(txt(this, x + 16, y + 14, p.code, { size: 16, color: HEX.c3 }));
      this.page.add(txt(this, x + cw - 16, y + 14, p.name, { size: 18, weight: "500", origin: [1, 0] }));
      const img = this.add.image(x + 16, y + 44, productArt(this, p.art, cw - 32, 340)).setOrigin(0);
      this.page.add(img);
      // angoli arrotondati dell'illustrazione
      const m = this.make.graphics({ add: false });
      m.fillStyle(0xffffff, 1);
      m.fillRoundedRect(x + 16, y + 44, cw - 32, 340, 12);
      img.setMask(m.createGeometryMask());
      this.rows(x + 16, y + 400, cw - 32, p.rows, { size: 18, step: 42 });
    });
  }

  team() {
    this.header("DOSSIER · TEAM", "IL TEAM");
    const n = TEAM_LOOK.length;
    const cw = 176;
    const gap = (VIEW.w - 80 - n * cw) / (n - 1);
    this.crew = [];
    TEAM_LOOK.forEach((_, k) => {
      const x = Math.round(40 + k * (cw + gap));
      const y = 130;
      const g = this.add.graphics();
      this.page.add(g);
      const img = this.add.image(x + cw / 2, y + 186, teamBust(this, k, cw, 186)).setOrigin(0.5, 1);
      const m = this.make.graphics({ add: false });
      m.fillStyle(0xffffff, 1);
      m.fillRoundedRect(x, y, cw, 186, { tl: 16, tr: 16, bl: 0, br: 0 });
      img.setMask(m.createGeometryMask());
      const label = txt(this, x + cw / 2, y + 205, TEAM_NAMES[k], { size: 18, weight: "500", origin: 0.5 });
      this.page.add([img, label]);
      this.crew.push({ g, img, label, x, y, cw });
    });
    // schede tutte uguali: il team non si seleziona
    this.crew.forEach((c) => this.drawCrew(c));
    // scheda del progetto
    this.frame(40, 400, VIEW.w - 80, 292);
    this.rows(56, 416, VIEW.w - 112, [
      ["PROGETTO", "O₂RIGIN · MACCHINA COMUNICATIVA"],
      ["COMMITTENTE", "BIODOM+"],
      ["CONTESTO", "LABORATORIO DI SINTESI · POLITECNICO DI MILANO"],
      ["TECNOLOGIA", "PHASER · ARDUINO UNO R4 WIFI"],
      ["STATO", "OPERATIVO"],
      ["", "GRAZIE PER AVER GIOCATO"]
    ], { size: 20, step: 42 });
  }

  drawCrew({ g, x, y, cw, label }) {
    g.fillStyle(C.c4, 0.1);
    g.fillRoundedRect(x, y + 4, cw, 222, 16);
    g.fillStyle(C.c0, 0.97);
    g.fillRoundedRect(x, y, cw, 222, 16);
    label.setColor(HEX.c4);
  }
}
