import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { paint, quant } from "../world/skyline.js";
import { K, operatorKey, careFrames, holdFrames } from "../art/people.js";
import { brackets, button, C, canvasImage, fadeIn, goTo, HEX, toast, txt, VIEW } from "../ui/hud.js";

// titolo retinato: lettere grandi con sfumatura dall'alto e ombra, poi il retino del gioco
function titleCanvas() {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 170;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.font = 'bold 132px "Roboto Mono", ui-monospace, monospace';
  x.textBaseline = "alphabetic";
  const draw = (dx, dy, fill) => {
    x.fillStyle = fill;
    x.fillText("O", dx, 130 + dy);
    const ow = x.measureText("O").width;
    x.font = 'bold 66px "Roboto Mono", ui-monospace, monospace';
    x.fillText("2", dx + ow + 2, 150 + dy);
    const tw = x.measureText("2").width;
    x.font = 'bold 132px "Roboto Mono", ui-monospace, monospace';
    x.fillText("RIGIN", dx + ow + tw + 8, 130 + dy);
  };
  draw(8, 8, "rgb(60,60,60)");
  const g = x.createLinearGradient(0, 20, 0, 150);
  g.addColorStop(0, "rgb(255,255,255)");
  g.addColorStop(0.55, "rgb(225,225,225)");
  g.addColorStop(1, "rgb(120,120,120)");
  draw(0, 0, g);
  // righe di scansione sottili dentro le lettere
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < c.height; y += 6) x.fillRect(0, y, c.width, 2);
  x.globalCompositeOperation = "source-over";
  quant(c, 2);
  return c;
}

export function ensureMenuBg(scene) {
  if (!scene.textures.exists("menu_bg")) scene.textures.addCanvas("menu_bg", menuBackdrop());
}

// sfondo del menu: una città qualunque, senza monumenti (le città si scoprono giocando)
export function menuBackdrop() {
  const LW = 2560 / K;
  return paint(2560, 800, K, (T) => {
    const { X, G, rnd, facade, skyG, ground, GY } = T;
    skyG(LW, [[0, 0.03], [0.5, 0.14], [0.85, 0.34], [1, 0.5]]);
    for (let i = 0; i < 140; i++) {
      X.fillStyle = G(0.9, 0.3 + rnd() * 0.6);
      X.fillRect(rnd() * LW, rnd() * 300, 2, 2);
    }
    // due file di palazzi anonimi, la seconda più vicina e più scura
    for (let x = -10; x < LW; ) {
      const bw = (26 + rnd() * 40) | 0;
      const bh = (90 + rnd() * 150) | 0;
      facade([[x, GY], [x, GY - bh], [x + bw, GY - bh], [x + bw, GY]], 0.4, 0.3, { gx: 6, gy: 8, lit: 0.04, glass: 0.85 });
      x += bw + ((rnd() * 6) | 0);
    }
    for (let x = -20; x < LW; ) {
      const bw = (40 + rnd() * 50) | 0;
      const bh = (50 + rnd() * 90) | 0;
      facade([[x, GY], [x, GY - bh], [x + bw, GY - bh], [x + bw, GY]], 0.26, 0.18, { gx: 7, gy: 9, lit: 0.07 });
      x += bw + ((rnd() * 10) | 0);
    }
    ground(LW, 0);
  }, { seedValue: 99 });
}

// menu: Milano di notte, il titolo e quattro pulsanti grandi
export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    fadeIn(this, 500);
    this._leaving = false;
    setAmbient(null);
    ensureMenuBg(this);
    const bg = this.add.image(0, 0, "menu_bg").setOrigin(0);
    // la città scorre lentamente dietro al menu
    // la città scorre a velocità costante (1 pixel per fotogramma: niente scatti) e torna indietro dolcemente
    // la città resta quasi ferma: una deriva lentissima, appena percepibile
    this.bg = bg;
    this.bgX = -(2560 - VIEW.w) / 2;
    bg.x = Math.round(this.bgX);
    // l'operatore con il suo BIONOMAD, in grande sulla strada
    // l'operatore cammina sul posto mentre la città gli scorre dietro
    this.opKey = operatorKey(this, "a", "milano");
    careFrames(this, this.opKey);
    this.bareKey = holdFrames(this, operatorKey(this, "a", "milano", { bare: true }));
    this.opImg = this.add.image(940, 776, `${this.opKey}_idle`).setOrigin(0.5, 1).setScale(2);
    this.packImg = this.add.image(0, 0, "pack_item").setOrigin(0).setScale(2).setVisible(false);
    // ciclo: respira → si sfila lo zaino e lo porta davanti → cura la pianta (bollicine di O₂) → lo rimette
    this.cycle = 0;
    brackets(this);

    txt(this, 64, 64, "B I O N O M A D", { size: 22, color: HEX.c3 }).setScrollFactor(0);
    if (!this.textures.exists("menu_title")) this.textures.addCanvas("menu_title", titleCanvas());
    this.add.image(56, 98, "menu_title").setOrigin(0);

    // voci del menu come le etichette del concept: numerate, bordo sottile; si accendono al passaggio
    const items = [
      ["GIOCA", () => goTo(this, "SetupScene")],
      [PlantSensors.state.connected ? "PIANTA COLLEGATA ✓" : "COLLEGA PIANTA", () => this.connect()],
      ["CREDITI", () => goTo(this, "CreditsScene")]
    ];
    this.buttons = items.map(([label, fn, primary], i) => button(this, 64, 310 + i * 80, 420, 60, `[0${i + 1}]  ${label}`, fn, { primary, left: true, size: 24 }));
    this.plantBtn = this.buttons[1];
    this.plantLabel = (s) => this.plantBtn.setLabel(`[02]  ${s}`);

    // logo piccolo, allineato al margine destro (stesso margine dei pulsanti a sinistra)
    this.add.image(VIEW.w - 64, VIEW.h - 34, "logo_biodom").setOrigin(1, 1).setScale(2).setTint(C.c4).setDepth(1500);

    this.input.keyboard.on("keydown-ENTER", () => this.buttons[0].press());
  }

  update(time, delta) {
    if (!this.bg) return;
    // deriva di 4 px al secondo, avanti e indietro in 80 s
    this.bgX = -(2560 - VIEW.w) / 2 + Math.sin(time / 12700) * 160;
    this.bg.x = Math.round(this.bgX);
    const CYCLE = 7600;
    const prev = this.cycle;
    this.cycle = (this.cycle + delta) % CYCLE;
    const t = this.cycle;
    const op = this.opImg;
    // posizioni dello zaino (coordinate del disegno 120x200): sulla schiena e tenuto davanti
    const at = (cx, cy) => [op.x + (cx - 60) * 2, op.y - (200 - cy) * 2];
    const BACK = at(28, 57);
    const FRONT = at(74, 70);
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
    let key = this.opKey;
    let frame = "idle";
    let pack = null; // null = zaino addosso (disegnato nel personaggio)
    if (t >= 1400 && t < 1600) frame = "c0";
    else if (t >= 1600 && t < 1800) frame = "c1";
    else if (t >= 1800 && t < 5600) {
      key = this.bareKey;
      const u = t < 2300 ? ease((t - 1800) / 500) : t >= 5100 ? 1 - ease((t - 5100) / 500) : 1;
      pack = [BACK[0] + (FRONT[0] - BACK[0]) * u, BACK[1] + (FRONT[1] - BACK[1]) * u - Math.sin(u * Math.PI) * 24];
      frame = u < 0.5 ? "idle" : t >= 2400 && t < 5000 ? `h${Math.floor((t - 2400) / 170) % 4}` : "h0";
    } else if (t >= 5600 && t < 5800) frame = "c1";
    else if (t >= 5800 && t < 6000) frame = "c0";
    op.setTexture(`${key}_${frame}`);
    this.packImg.setVisible(!!pack);
    if (pack) this.packImg.setPosition(Math.round(pack[0]), Math.round(pack[1]));
    // respiro: un leggerissimo su e giù quando è fermo
    op.setScale(2, 2 * (1 + 0.006 * Math.sin(time / 520)));
    // a metà della cura la pianta rilascia ossigeno
    if ((prev < 3100 && t >= 3100) || (prev < 4300 && t >= 4300)) this.bubbles();
  }

  // bollicine di O₂ che salgono dallo zaino (pixel quadrati, nei colori del gioco)
  bubbles() {
    const op = this.opImg;
    const px = op.x + (88 - 60) * 2;
    const py = op.y - (200 - 76) * 2;
    for (let i = 0; i < 9; i++) {
      const size = 4 + (i % 3) * 2;
      const b = this.add.rectangle(px + (Math.random() - 0.5) * 30, py, size, size, C.c4).setAlpha(0);
      this.tweens.add({
        targets: b,
        y: py - 120 - Math.random() * 90,
        x: b.x + (Math.random() - 0.5) * 50,
        alpha: { from: 0.9, to: 0 },
        duration: 1600 + Math.random() * 900,
        delay: i * 140,
        ease: "Sine.easeOut",
        onComplete: () => b.destroy()
      });
    }
  }

  async connect() {
    if (PlantSensors.state.connected) return;
    try {
      await PlantSensors.connect();
      this.plantLabel("PIANTA COLLEGATA ✓");
      toast(this, "Pianta collegata");
    } catch (error) {
      toast(this, error?.message ?? "Collegamento non riuscito", { duration: 3200 });
    }
  }
}
