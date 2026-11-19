import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { paint } from "../world/skyline.js";
import { crewBust, TEAM_LOOK } from "../art/people.js";
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

// illustrazioni dei dispositivi, disegnate con gli strumenti del concept
function deviceArt(scene, kind, w, h) {
  const key = `dev_${kind}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const c = paint(w, h, 1, (T) => {
    const { X, G, fillP, lgx, stone } = T;
    const bg = X.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, G(0.18));
    bg.addColorStop(1, G(0.06));
    X.fillStyle = bg;
    X.fillRect(0, 0, w, h);
    X.fillStyle = G(0.3, 0.5);
    for (let x = 0; x < w; x += 16) X.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 16) X.fillRect(0, y, w, 1);
    const cx = w / 2;
    const cy = h / 2 + 10;
    if (kind === "backpack") {
      // capsula di vetro con le sansevierie, tappo e tubo verso il respiratore
      const pw = 120;
      const ph = 220;
      const x0 = cx - pw / 2 - 20;
      const y0 = cy - ph / 2;
      const pk = [[x0 + 14, y0], [x0 + pw - 14, y0], [x0 + pw, y0 + 16], [x0 + pw, y0 + ph - 16], [x0 + pw - 14, y0 + ph], [x0 + 14, y0 + ph], [x0, y0 + ph - 16], [x0, y0 + 16]];
      fillP(pk, G(0.2, 0.95));
      X.save();
      T.path(pk);
      X.clip();
      X.fillStyle = G(0.1);
      X.fillRect(x0, y0 + ph - 34, pw, 34);
      sansevieria(X, G, x0 + pw / 2, y0 + ph - 30, 1.7, 5);
      X.fillStyle = G(1, 0.9);
      X.fillRect(x0 + 8, y0 + 22, 4, 70);
      X.restore();
      X.strokeStyle = G(0.95);
      X.lineWidth = 2;
      T.path(pk);
      X.stroke();
      [y0 + 70, y0 + 150].forEach((ry) => {
        X.fillStyle = G(0.6);
        X.fillRect(x0 - 3, ry, pw + 6, 6);
      });
      X.fillStyle = lgx(x0 + 20, x0 + pw - 20, 0.75, 0.4);
      X.fillRect(x0 + 24, y0 - 14, pw - 48, 14);
      X.strokeStyle = G(0.75);
      X.lineWidth = 5;
      X.beginPath();
      X.moveTo(x0 + pw / 2 + 10, y0 - 14);
      X.bezierCurveTo(x0 + pw / 2 + 30, y0 - 60, w - 30, y0 - 50, w - 40, y0 + 30);
      X.stroke();
      X.fillStyle = G(0.85);
      X.beginPath();
      X.ellipse(w - 40, y0 + 46, 22, 17, 0, 0, 7);
      X.fill();
      X.fillStyle = G(0.25);
      X.beginPath();
      X.arc(w - 40, y0 + 46, 9, 0, 7);
      X.fill();
    } else if (kind === "active") {
      // modulo quadrato: guscio con gli angoli smussati, finestra con le micro-alghe e le bollicine
      const m = 180;
      const x0 = cx - m / 2;
      const y0 = cy - m / 2;
      const r = 18;
      const shell = [[x0 + r, y0], [x0 + m - r, y0], [x0 + m, y0 + r], [x0 + m, y0 + m - r], [x0 + m - r, y0 + m], [x0 + r, y0 + m], [x0, y0 + m - r], [x0, y0 + r]];
      fillP(shell, lgx(x0, x0 + m, 0.62, 0.32));
      X.strokeStyle = G(0.92);
      X.lineWidth = 2;
      T.path(shell);
      X.stroke();
      // finestra
      const wx = x0 + 26;
      const wy = y0 + 26;
      const ws = m - 52;
      X.fillStyle = G(0.15);
      X.fillRect(wx - 4, wy - 4, ws + 8, ws + 8);
      const al = X.createLinearGradient(0, wy, 0, wy + ws);
      al.addColorStop(0, G(0.4));
      al.addColorStop(1, G(0.88));
      X.fillStyle = al;
      X.fillRect(wx, wy + 14, ws, ws - 14);
      for (let i = 0; i < 18; i++) {
        X.fillStyle = G(0.98);
        X.beginPath();
        X.arc(wx + 8 + ((i * 23) % (ws - 16)), wy + 22 + ((i * 31) % (ws - 30)), 2 + (i % 3), 0, 7);
        X.fill();
      }
      X.fillStyle = G(1, 0.8);
      X.fillRect(wx + 6, wy + 6, 4, 36);
      // viti agli angoli e led di stato
      X.fillStyle = G(0.9);
      [[x0 + 12, y0 + 12], [x0 + m - 12, y0 + 12], [x0 + 12, y0 + m - 12], [x0 + m - 12, y0 + m - 12]].forEach(([vx, vy]) => {
        X.beginPath();
        X.arc(vx, vy, 3, 0, 7);
        X.fill();
      });
      X.fillRect(x0 + m - 46, y0 + m - 16, 8, 4);
      X.fillRect(x0 + m - 34, y0 + m - 16, 8, 4);
      // aggancio rapido sul lato
      X.fillStyle = lgx(x0 + m, x0 + m + 24, 0.85, 0.5);
      X.fillRect(x0 + m, cy - 26, 18, 52);
      X.fillStyle = G(0.2);
      X.fillRect(x0 + m + 6, cy - 16, 6, 32);
    } else {
      // serra domestica: base con il pannello e vasca di vetro con le piante
      const tw = 220;
      const x0 = cx - tw / 2;
      const base = cy + 110;
      stone([[x0 + 30, base], [x0 + 30, base - 80], [x0 + tw - 30, base - 80], [x0 + tw - 30, base]], 0.5, 0.28, { rib: 8 });
      X.fillStyle = G(0.95);
      X.fillRect(cx - 30, base - 56, 60, 14);
      const top = base - 250;
      fillP([[x0, base - 80], [x0, top], [x0 + tw, top], [x0 + tw, base - 80]], G(0.22, 0.9));
      X.save();
      X.beginPath();
      X.rect(x0, top, tw, 170);
      X.clip();
      X.fillStyle = G(0.1);
      X.fillRect(x0, base - 104, tw, 24);
      sansevieria(X, G, cx - 50, base - 100, 1.25, 4);
      sansevieria(X, G, cx + 50, base - 100, 1.25, 4);
      X.restore();
      X.strokeStyle = G(0.95);
      X.lineWidth = 2;
      X.strokeRect(x0, top, tw, 170);
      X.fillStyle = lgx(x0 - 8, x0 + tw + 8, 0.75, 0.4);
      X.fillRect(x0 - 8, top - 14, tw + 16, 14);
    }
  }, { seedValue: 5 });
  scene.textures.addCanvas(key, c);
  return key;
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
  frame(x, y, w, h, { fill = 0.86 } = {}) {
    const g = this.add.graphics();
    g.fillStyle(C.c0, fill);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, C.c3, 1);
    g.strokeRect(x, y, w, h);
    g.fillStyle(C.c4, 1);
    // (angoli a quadratino rimossi: stile vettoriale pulito)
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
      g.strokeRect(x, ry, w, step);
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
      const img = this.add.image(x + 16, y + 44, deviceArt(this, p.art, cw - 32, 340)).setOrigin(0);
      this.page.add(img);
      this.frame(x + 16, y + 44, cw - 32, 340, { fill: 0 });
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
      // numero sopra la scheda, come le schede del personale
      this.page.add(txt(this, x + cw / 2, y - 12, `+_0${k + 1}`, { size: 16, color: HEX.c3, origin: 0.5 }));
      const g = this.add.graphics();
      this.page.add(g);
      const img = this.add.image(x + cw / 2, y + 184, crewBust(this, k)).setOrigin(0.5, 1);
      const label = txt(this, x + cw / 2, y + 204, TEAM_NAMES[k], { size: 18, origin: 0.5 });
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
    g.fillStyle(C.c0, 0.88);
    g.fillRect(x, y, cw, 220);
    g.lineStyle(2, C.c3, 1);
    g.strokeRect(x + 1, y + 1, cw - 2, 218);
    g.lineBetween(x, y + 188, x + cw, y + 188);
    g.fillStyle(C.c4, 1);
    // (angoli a quadratino rimossi: stile vettoriale pulito)
    label.setColor(HEX.c4);
  }
}
