import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { paint, quant, setDayMode } from "../world/skyline.js";
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

// versione di giorno dello stesso sfondo (finestre spente, cielo chiaro): serve al ciclo del menu
export function ensureMenuDayBg(scene) {
  if (!scene.textures.exists("menu_bg_day")) {
    setDayMode(true);
    scene.textures.addCanvas("menu_bg_day", menuBackdrop(true));
    setDayMode(false);
    // alba e tramonto: un passaggio intermedio tra notte e giorno
    scene.textures.addCanvas("menu_bg_dusk", menuBackdrop("dusk"));
  }
}

// sfondo del menu: una città qualunque, senza monumenti (le città si scoprono giocando)
export function menuBackdrop(day = false) {
  const LW = 2560 / K;
  return paint(2560, 800, K, (T) => {
    const { X, G, rnd, facade, skyG, ground, GY } = T;
    const dusk = day === "dusk";
    if (dusk) day = false;
    skyG(LW, dusk ? [[0, 0.1], [0.45, 0.26], [0.8, 0.6], [1, 0.84]] : day ? [[0, 0.32], [0.5, 0.48], [0.85, 0.64], [1, 0.74]] : [[0, 0.03], [0.5, 0.14], [0.85, 0.34], [1, 0.5]]);
    if (dusk) {
      // alba / tramonto: bagliore basso sull'orizzonte, dalla parte del sole
      const r = X.createRadialGradient(LW * 0.62, GY, 20, LW * 0.62, GY, 520);
      r.addColorStop(0, G(1, 0.55));
      r.addColorStop(1, G(1, 0));
      X.fillStyle = r;
      X.fillRect(0, 0, LW, GY);
    }
    for (let i = 0; i < 140; i++) {
      // stelle solo di notte; di giorno cielo pulito
      const sx = rnd() * LW;
      const sy = rnd() * 300;
      const sa = 0.3 + rnd() * 0.6;
      if (!day && !dusk) {
        X.fillStyle = G(0.9, sa);
        X.fillRect(sx, sy, 2, 2);
      }
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
    // ciclo giorno/notte: la versione di giorno sfuma sopra quella di notte,
    // il sole e la luna attraversano il cielo sopra i tetti
    ensureMenuDayBg(this);
    bg.setDepth(-3);
    this.bgDay = this.add.image(bg.x, 0, "menu_bg_day").setOrigin(0).setAlpha(0).setDepth(-2.5);
    this.bgDusk = this.add.image(bg.x, 0, "menu_bg_dusk").setOrigin(0).setAlpha(0).setDepth(-2);
    // sole e luna retinati come il resto della città (stesso retino a 5 colori)
    if (!this.textures.exists("menu_sun")) {
      // stesso sole del cielo di giorno in gioco: disco pieno e alone largo a retino.
      // L'alone è fatto a mano con la matrice di Bayer (puntini chiari opachi, sempre più radi),
      // così si vede su qualsiasi cielo senza trasparenze sfumate
      const sunC = document.createElement("canvas");
      sunC.width = sunC.height = 260;
      const sx = sunC.getContext("2d", { willReadFrequently: true });
      const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < 260; y += 2)
        for (let x = 0; x < 260; x += 2) {
          const d = Math.hypot(x - 130, y - 130);
          if (d <= 46) {
            sx.fillStyle = "#F1F0ED";
            sx.fillRect(x, y, 2, 2);
            continue;
          }
          const f = Math.max(0, 1 - (d - 46) / 84) * 0.75;
          const t = (B4[((y >> 1) % 4) * 4 + ((x >> 1) % 4)] + 0.5) / 16;
          if (t < f) {
            sx.fillStyle = t < f * 0.45 ? "#F1F0ED" : "#5E6D88";
            sx.fillRect(x, y, 2, 2);
          }
        }
      this.textures.addCanvas("menu_sun", sunC);
      this.textures.addCanvas("menu_moon", paint(110, 110, 1, ({ X, G }) => {
        const h = X.createRadialGradient(55, 55, 22, 55, 55, 55);
        h.addColorStop(0, G(0.9, 0.35));
        h.addColorStop(1, G(0.9, 0));
        X.fillStyle = h;
        X.fillRect(0, 0, 110, 110);
        const d = X.createRadialGradient(46, 46, 4, 55, 55, 28);
        d.addColorStop(0, G(1));
        d.addColorStop(1, G(0.78));
        X.fillStyle = d;
        X.beginPath();
        X.arc(55, 55, 28, 0, 7);
        X.fill();
        X.fillStyle = G(0.55);
        [[46, 48, 6], [64, 62, 4], [60, 44, 3], [48, 66, 3]].forEach(([x, y, r]) => {
          X.beginPath();
          X.arc(x, y, r, 0, 7);
          X.fill();
        });
      }, { cell: 2, seedValue: 13 }));
    }
    this.sun = this.add.image(0, 0, "menu_sun").setDepth(-1);
    this.moon = this.add.image(0, 0, "menu_moon").setDepth(-1);
    this.dayT = 0.62; // si parte di notte
    // l'operatore con il suo BIONOMAD, in grande sulla strada
    // l'operatore cammina sul posto mentre la città gli scorre dietro
    this.opKey = operatorKey(this, "a", "milano");
    careFrames(this, this.opKey);
    this.bareKey = holdFrames(this, operatorKey(this, "a", "milano", { bare: true, mask: true }));
    this.opImg = this.add.image(940, 776, `${this.opKey}_idle`).setOrigin(0.5, 1).setScale(2);
    this.packImg = this.add.image(0, 0, "pack_item").setOrigin(0).setScale(2).setVisible(false);
    this.opImg.setDepth(10);
    this.glow = this.add.ellipse(0, 0, 52, 34, C.c4, 0.2).setDepth(12).setVisible(false);
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
    this.dayNight(delta);
    const CYCLE = 9200;
    const prev = this.cycle;
    this.cycle = (this.cycle + delta) % CYCLE;
    const t = this.cycle;
    const op = this.opImg;
    // posizioni dello zaino (coordinate del disegno 120x200): sulla schiena e tenuto davanti
    const at = (cx, cy) => [op.x + (cx - 60) * 2, op.y - (200 - cy) * 2];
    const span = (a, b) => Phaser.Math.Clamp((t - a) / (b - a), 0, 1);
    // un solo gesto continuo: la mano va alla spalla, sfila lo zaino e lo porta davanti
    // (lo zaino resta attaccato alla mano), lo cura, poi lo rimette con il gesto inverso
    const T1 = 1800, T2 = 2250, T3 = 3150, T4 = 6450, T5 = 7350, T6 = 7800;
    let key = this.opKey;
    let frame = "idle";
    let v = -1; // posizione del gesto con lo zaino in mano (0 = mano alla spalla, 1 = davanti)
    let tapY = 0;
    if (t >= T1 && t < T2) frame = ["c0", "c1", "c2"][Math.min(2, Math.floor(span(T1, T2) * 3))];
    else if (t >= T5 && t < T6) frame = ["c2", "c1", "c0"][Math.min(2, Math.floor(span(T5, T6) * 3))];
    else if (t >= T2 && t < T5) {
      key = this.bareKey;
      if (t < T3) v = Math.min(4, Math.floor(span(T2, T3) * 5)) / 4;
      else if (t >= T4) v = 1 - Math.min(4, Math.floor(span(T4, T5) * 5)) / 4;
      else v = 1;
      if (v < 1 || t < T3 || t >= T4) frame = `m${Math.round(v * 4)}`;
      else {
        const i = Math.floor((t - T3) / 110) % 8;
        frame = `h${i}`;
        tapY = -2.5 + 2.5 * Math.cos((i / 8) * Math.PI * 2);
      }
    }
    // lo zaino segue la mano: angolo in alto a sinistra = mano + scostamento
    let pack = null;
    if (v >= 0) {
      // zaino in mano: da sulla schiena (20,55) a davanti al petto (74,70)
      pack = at(20 + 54 * v, 55 + 15 * v);
    }
    const front = v > 0.4;
    op.setTexture(`${key}_${frame}`);
    this.packImg.setVisible(!!pack).setDepth(front ? op.depth + 1 : op.depth - 1);
    if (pack) this.packImg.setPosition(Math.round(pack[0]), Math.round(pack[1] + (tapY < -3 ? 2 : 0)));
    // la pianta si accende mentre la cura: un alone che pulsa
    const caring = t >= T3 && t < T4 && v === 1;
    this.glow.setVisible(caring);
    if (caring) {
      this.glow.setPosition(this.packImg.x + 28, this.packImg.y + 26).setAlpha(0.18 + 0.12 * Math.sin(t / 160));
      // ogni tanto un piccolo sbuffo di ossigeno
      if (Math.floor(prev / 520) !== Math.floor(t / 520)) this.bubbles(3);
    }
    // respiro: un leggerissimo su e giù quando è fermo
    op.setScale(2, 2 * (1 + 0.006 * Math.sin(time / 520)));
    // a metà della cura la pianta rilascia ossigeno
  }

  // ciclo di 24 s: metà giorno, metà notte, con alba e tramonto sfumati
  dayNight(delta) {
    this.dayT = (this.dayT + delta / 24000) % 1;
    const p = this.dayT;
    const smooth = (u) => u * u * (3 - 2 * u);
    const edge = 0.1;
    let day;
    if (p < edge) day = smooth(0.5 + p / (2 * edge));
    else if (p < 0.5 - edge) day = 1;
    else if (p < 0.5 + edge) day = smooth(1 - (p - (0.5 - edge)) / (2 * edge));
    else if (p < 1 - edge) day = 0;
    else day = smooth((p - (1 - edge)) / (2 * edge) * 0.5);
    // passaggio in tre tempi: la luce dell'alba/tramonto sale a metà della transizione e poi svanisce
    this.bgDay.setAlpha(day).setX(this.bg.x);
    this.bgDusk.setAlpha(Math.sin(Math.PI * day) * 0.9).setX(this.bg.x);
    // arco solo sulla metà destra del cielo, lontano dal titolo
    const arc = (u) => [740 + u * 440, 300 - Math.sin(Math.PI * u) * 190];
    const su = (p + edge) / (0.5 + 2 * edge);
    const mu = (p - 0.5 + edge + (p < 0.5 - edge ? 1 : 0)) / (0.5 + 2 * edge);
    if (su >= 0 && su <= 1) this.sun.setVisible(true).setPosition(...arc(su).map(Math.round)).setAlpha(Math.min(1, Math.sin(Math.PI * su) * 3));
    else this.sun.setVisible(false);
    if (mu >= 0 && mu <= 1) this.moon.setVisible(true).setPosition(...arc(mu).map(Math.round)).setAlpha(Math.min(1, Math.sin(Math.PI * mu) * 3));
    else this.moon.setVisible(false);
  }

  // bollicine di O₂ che salgono dallo zaino (pixel quadrati, nei colori del gioco)
  bubbles(n = 9) {
    const px = this.packImg.x + 28;
    const py = this.packImg.y + 14;
    for (let i = 0; i < n; i++) {
      const size = 4 + (i % 3) * 2;
      const b = this.add.rectangle(px + (Math.random() - 0.5) * 30, py, size, size, C.c4).setAlpha(0).setDepth(13);
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
