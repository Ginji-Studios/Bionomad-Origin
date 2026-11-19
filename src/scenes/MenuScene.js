import Phaser from "../phaser.js";
import { addHiRes } from "../art/hires.js";
import { setAmbient } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { paint, setDayMode } from "../world/skyline.js";
import { buildCity } from "../world/city.js";
import { K, operatorKey, careFrames, holdFrames } from "../art/people.js";
import { brackets, button, C, canvasImage, fadeIn, goTo, HEX, toast, txt, VIEW, Y_ACCENT } from "../ui/hud.js";
import { Sfx } from "../systems/Sfx.js";
import { plantNav } from "../input/plantNav.js";

// titolo pulito, inchiostro blu notte (nessun retino)
function titleCanvas() {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 170;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.textBaseline = "alphabetic";
  x.fillStyle = "#24344B";
  x.font = 'bold 132px "Roboto Mono", ui-monospace, monospace';
  x.fillText("O", 0, 130);
  const ow = x.measureText("O").width;
  x.font = 'bold 66px "Roboto Mono", ui-monospace, monospace';
  x.fillStyle = "#E2B33C";
  x.fillText("2", ow + 2, 150);
  const tw = x.measureText("2").width;
  x.fillStyle = "#24344B";
  x.font = 'bold 132px "Roboto Mono", ui-monospace, monospace';
  x.fillText("RIGIN", ow + tw + 8, 130);
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

// sfondo del menu: la città nel nuovo stile, tutti i livelli composti in un'unica immagine larga
export function menuBackdrop(day = false) {
  const W = 2560;
  const compose = (time) => {
    const b = buildCity("milano", { viewW: W, viewH: VIEW.h, time, zone: 1 });
    const c = document.createElement("canvas");
    c.width = W;
    c.height = VIEW.h;
    const x = c.getContext("2d", { willReadFrequently: true });
    b.layers.forEach(({ canvas }) => x.drawImage(canvas, Math.round(-(canvas.width - W) / 2), 0));
    return c;
  };
  if (day === "dusk") {
    const c = compose("night");
    const d = compose("day");
    const x = c.getContext("2d", { willReadFrequently: true });
    x.globalAlpha = 0.5;
    x.drawImage(d, 0, 0);
    x.globalAlpha = 0.18;
    x.fillStyle = "#E2B33C";
    x.fillRect(0, 0, W, VIEW.h);
    return c;
  }
  return compose(day ? "day" : "night");
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
      const disc = (key, col, halo) => {
        const c = document.createElement("canvas");
        c.width = c.height = 200;
        const x = c.getContext("2d", { willReadFrequently: true });
        const g = x.createRadialGradient(100, 100, 30, 100, 100, 100);
        g.addColorStop(0, halo);
        g.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, 200, 200);
        x.fillStyle = col;
        x.beginPath();
        x.arc(100, 100, 34, 0, 7);
        x.fill();
        this.textures.addCanvas(key, c);
      };
      disc("menu_sun", "#F6F3EA", "rgba(246,243,234,0.45)");
      disc("menu_moon", "#E9ECF2", "rgba(233,236,242,0.18)");
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
    this.glow = this.add.ellipse(0, 0, 52, 34, 0x8fd0a6, 0.25).setDepth(12).setVisible(false);
    // ciclo: respira → si sfila lo zaino e lo porta davanti → cura la pianta (bollicine di O₂) → lo rimette
    this.cycle = 0;
    brackets(this);

    // colonna a sinistra: velo crema che sfuma verso la città (niente blocco grigio)
    // velo freddo (stesso tono della città, niente stacco caldo/freddo) e sfumatura lunga e
    // morbida: pieno fino a dopo il titolo, poi scende con una curva dolce fino a sparire.
    // Due versioni (giorno chiara, notte più scura) che si incrociano con il ciclo giorno/notte
    // un solo velo, sempre uguale di giorno e di notte (nessun cambio di colore del menu).
    // Il velo cambia colore e trasparenza insieme: parte chiaro dietro al testo e mentre
    // svanisce prende il colore del cielo, così si fonde con la città senza bordo visibile
    const veil = (key, from, to) => {
      if (this.textures.exists(key)) return;
      const W = 1280;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = 8;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, W, 0);
      const ease = (u) => u * u * (3 - 2 * u);
      for (let i = 0; i <= 48; i++) {
        const u = i / 48;
        // pieno fino a ~400 px, poi cala dolcemente fino a ~1150 px
        const k = u < 0.32 ? 1 : Math.max(0, 1 - (u - 0.32) / 0.58);
        const a = 0.96 * (0.5 * k + 0.5 * ease(k));
        const m = ease(Math.min(1, Math.max(0, (u - 0.28) / 0.4)));
        const col = from.map((v, j) => Math.round(v + (to[j] - v) * m));
        g.addColorStop(u, `rgba(${col.join(",")},${a.toFixed(3)})`);
      }
      x.fillStyle = g;
      x.fillRect(0, 0, W, 8);
      this.textures.addCanvas(key, c);
    };
    veil("menu_veil2", [236, 239, 244], [212, 218, 228]);
    this.veilDay = this.add.image(0, 0, "menu_veil2").setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setDepth(20);
    // logo biodom+ vettoriale e firma
    this.add.image(72, 78, "logo_biodom_l").setOrigin(0, 0.5).setTint(0x24344b).setDepth(21);
    txt(this, 72, 112, "PRESENTA", { size: 12, color: HEX.c3 }).setDepth(21).setLetterSpacing?.(4);
    // titolo vettoriale
    if (!this.textures.exists("menu_title2")) addHiRes(this, "menu_title2", titleVector(), 3);
    this.add.image(68, 158, "menu_title2").setOrigin(0).setScale(0.8).setDepth(21);
    txt(this, 72, 268, "Respira con la tua pianta.", { size: 19, color: HEX.c4 }).setDepth(21);
    this.add.rectangle(72, 306, 46, 4, Y_ACCENT).setOrigin(0, 0.5).setDepth(21);

    // voci del menu: numero, nome grande, freccia; la voce attiva ha la pillola scura
    const items = [
      ["GIOCA", () => goTo(this, "SetupScene")],
      [PlantSensors.state.connected ? "PIANTA COLLEGATA" : "COLLEGA LA PIANTA", () => this.connect()],
      ["CREDITI", () => goTo(this, "CreditsScene")]
    ];
    this.sel = 0;
    this.buttons = items.map(([label, fn], i) => {
      const y = 400 + i * 80;
      const pill = this.add.graphics().setDepth(21);
      const num = txt(this, 96, y, `0${i + 1}`, { size: 14, color: HEX.c3, origin: [0, 0.5] }).setDepth(22);
      const t = txt(this, 140, y, label, { size: i === 0 ? 30 : 22, weight: "500", origin: [0, 0.5], color: HEX.c4 }).setDepth(22);
      const arrow = this.add.graphics().setDepth(22);
      const z = this.add.zone(72, y - 34, 470, 68).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(23);
      const draw = (on) => {
        pill.clear();
        arrow.clear();
        if (on) {
          pill.fillStyle(0x24344b, 1);
          pill.fillRoundedRect(72, y - 32, Math.max(330, t.width + 150), 64, 32);
          arrow.fillStyle(Y_ACCENT, 1);
          const ax = 72 + Math.max(330, t.width + 150) - 44;
          arrow.fillTriangle(ax, y - 9, ax, y + 9, ax + 14, y);
        }
        t.setColor(on ? "#F4F5F7" : HEX.c4);
        num.setColor(on ? "#E2B33C" : HEX.c3);
      };
      const press = () => {
        Sfx.blip?.();
        fn();
      };
      z.on("pointerover", () => this.select(i));
      z.on("pointerup", press);
      return { press, draw, setLabel: (l) => t.setText(l) };
    });
    this.select = (i) => {
      this.sel = i;
      this.buttons.forEach((b, k) => b.draw(k === i));
    };
    this.select(0);
    // piè di pagina: il tasto START del dispositivo
    const foot = this.add.graphics().setDepth(21);
    foot.lineStyle(2, 0x24344b, 1);
    foot.strokeCircle(92, VIEW.h - 70, 18);
    foot.fillStyle(Y_ACCENT, 1);
    foot.fillTriangle(86, VIEW.h - 80, 86, VIEW.h - 60, 102, VIEW.h - 70);
    txt(this, 124, VIEW.h - 70, "Premi START o tocca una foglia", { size: 15, color: HEX.c4, origin: [0, 0.5] }).setDepth(21);
    this.plantBtn = this.buttons[1];
    this.plantLabel = (s) => this.plantBtn.setLabel(s);
    this.input.keyboard.on("keydown-UP", () => this.select((this.sel + 2) % 3));
    this.input.keyboard.on("keydown-DOWN", () => this.select((this.sel + 1) % 3));

    this.input.keyboard.on("keydown-ENTER", () => this.buttons[this.sel].press());
    // pianta: destra = GIOCA
    plantNav(this, { right: () => this.buttons[0].press() });
  }

  // pulsante START del dispositivo = GIOCA
  onStart() {
    this.buttons?.[0]?.press();
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
      const b = this.add.circle(px + (Math.random() - 0.5) * 30, py, size / 2 + 1, 0xf4f5f7).setAlpha(0).setDepth(13);
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
      this.plantLabel("Pianta collegata ✓");
      toast(this, "Pianta collegata");
    } catch (error) {
      toast(this, error?.message ?? "Collegamento non riuscito", { duration: 3200 });
    }
  }
}

// titolo O₂RIGIN vettoriale (canvas 3x): lettere grandi blu notte, il 2 in giallo
function titleVector() {
  const S = 3;
  const W = 460;
  const H = 120;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  X.fillStyle = "#24344B";
  X.font = '800 104px "Helvetica Neue", "Inter", Arial, sans-serif';
  X.textBaseline = "alphabetic";
  X.fillText("O", 0, 100);
  const ow = X.measureText("O").width;
  X.fillStyle = "#E2B33C";
  X.font = '800 52px "Helvetica Neue", "Inter", Arial, sans-serif';
  X.fillText("2", ow + 2, 116);
  const tw = X.measureText("2").width;
  X.fillStyle = "#24344B";
  X.font = '800 104px "Helvetica Neue", "Inter", Arial, sans-serif';
  if ("letterSpacing" in X) X.letterSpacing = "-2px";
  X.fillText("RIGIN", ow + tw + 6, 100);
  return c;
}
