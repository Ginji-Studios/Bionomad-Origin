import Phaser from "../phaser.js";
import { addHiRes } from "../art/hires.js";
import { setAmbient } from "../systems/Sfx.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { setDayMode } from "../world/skyline.js";
import { buildCity } from "../world/city.js";
import { operatorKey, careFrames, holdFrames } from "../art/people.js";
import { brackets, fadeIn, goTo, HEX, toast, txt, VIEW, Y_ACCENT } from "../ui/hud.js";
import { Sfx } from "../systems/Sfx.js";
import { plantNav } from "../input/plantNav.js";

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
    const b = buildCity("milano", { viewW: W, viewH: VIEW.h, time, zone: 0 });
    const c = document.createElement("canvas");
    c.width = W;
    c.height = VIEW.h;
    const x = c.getContext("2d", { willReadFrequently: true });
    b.layers.forEach(({ canvas, f }) => {
      if (f !== 1) return x.drawImage(canvas, Math.round(-(canvas.width - W) / 2), 0);
      // primo piano: il Duomo (x logico 520) al centro della parte libera dello schermo,
      // la strada continua a sinistra con la coda dello stesso livello
      const off = Math.round(1500 - 520 * b.k);
      x.drawImage(canvas, off, 0);
      x.drawImage(canvas, off - canvas.width, 0);
    });
    c._film = true; // i livelli hanno già palette e grana: niente secondo passaggio
    return c;
  };
  if (day === "dusk") {
    const c = compose("night");
    const d = compose("day");
    const x = c.getContext("2d", { willReadFrequently: true });
    x.globalAlpha = 0.5;
    x.drawImage(d, 0, 0);
    x.globalAlpha = 0.18;
    x.fillStyle = "#7D909F";
    x.fillRect(0, 0, W, VIEW.h);
    c._film = true;
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
    PlantSensors.send("X"); // menu / nuova partita: buzzer spento
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
    // Milano di giorno, come nel riferimento: cielo grigio-salvia granuloso, niente ciclo notte
    ensureMenuDayBg(this);
    bg.setTexture("menu_bg_day").setDepth(-3);
    // l'operatore con il suo BIONOMAD, in grande sulla strada
    // l'operatore cammina sul posto mentre la città gli scorre dietro
    this.opKey = operatorKey(this, "a", "milano");
    careFrames(this, this.opKey);
    this.bareKey = holdFrames(this, operatorKey(this, "a", "milano", { bare: true, mask: true }));
    this.opImg = this.add.image(1120, 776, `${this.opKey}_idle`).setOrigin(0.5, 1).setScale(2);
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
        const k = u < 0.3 ? 1 : Math.max(0, 1 - (u - 0.3) / 0.32);
        const a = 0.5 * k + 0.5 * ease(k);
        const m = ease(Math.min(1, Math.max(0, (u - 0.28) / 0.4)));
        const col = from.map((v, j) => Math.round(v + (to[j] - v) * m));
        g.addColorStop(u, `rgba(${col.join(",")},${a.toFixed(3)})`);
      }
      x.fillStyle = g;
      x.fillRect(0, 0, W, 8);
      this.textures.addCanvas(key, c);
    };
    // velo carta → cielo (palette del riferimento), sparisce prima dell'operatore
    veil("menu_veil4", [230, 233, 229], [198, 204, 198]);
    this.veilDay = this.add.image(0, 0, "menu_veil4").setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setDepth(20);
    // logo biodom+ vettoriale e firma
    this.add.image(72, 78, "logo_biodom_l").setOrigin(0, 0.5).setTint(0x2e4350).setDepth(21);
    txt(this, 72, 112, "PRESENTA", { size: 12, color: HEX.c3 }).setDepth(21).setLetterSpacing?.(4);
    // titolo vettoriale
    if (!this.textures.exists("menu_title2")) addHiRes(this, "menu_title2", titleVector(), 3);
    this.add.image(68, 158, "menu_title2").setOrigin(0).setScale(0.8).setDepth(21);
    txt(this, 72, 268, "Each breath is a choice.", { size: 19, color: HEX.c4 }).setDepth(21);
    this.add.rectangle(72, 306, 46, 4, Y_ACCENT).setOrigin(0, 0.5).setDepth(21);

    // voci del menu: numero, nome grande, freccia; la voce attiva ha la pillola scura
    const items = [
      ["GIOCA", () => goTo(this, "TutorialScene", { next: "SetupScene" })],
      [plantText(), () => this.connect()],
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
          pill.fillStyle(0x2e4350, 1);
          pill.fillRoundedRect(72, y - 32, Math.max(330, t.width + 150), 64, 6);
          arrow.fillStyle(Y_ACCENT, 1);
          const ax = 72 + Math.max(330, t.width + 150) - 44;
          arrow.fillTriangle(ax, y - 9, ax, y + 9, ax + 14, y);
        }
        t.setColor(on ? "#E6E9E5" : HEX.c4);
        num.setColor(on ? "#7D909F" : HEX.c3);
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
    foot.lineStyle(2, 0x2e4350, 1);
    foot.strokeCircle(92, VIEW.h - 70, 18);
    foot.fillStyle(Y_ACCENT, 1);
    foot.fillTriangle(86, VIEW.h - 80, 86, VIEW.h - 60, 102, VIEW.h - 70);
    txt(this, 124, VIEW.h - 70, "Premi START per iniziare", { size: 15, color: HEX.c4, origin: [0, 0.5] }).setDepth(21);
    this.plantBtn = this.buttons[1];
    this.plantLabel = (s) => this.plantBtn.setLabel(s);
    // la voce segue lo stato vero della pianta (anche se si collega da sola dopo un ricaricamento)
    const off = PlantSensors.onChange(() => this.plantLabel(plantText()));
    this.events.once("shutdown", off);
    this.plantLabel(plantText());
    this.input.keyboard.on("keydown-UP", () => this.select((this.sel + 2) % 3));
    this.input.keyboard.on("keydown-DOWN", () => this.select((this.sel + 1) % 3));

    this.input.keyboard.on("keydown-ENTER", () => this.buttons[this.sel].press());
    // conferma con il tasto START (onStart), non con la foglia
  }

  // pulsante START del dispositivo = GIOCA
  onStart() {
    this.buttons?.[0]?.press();
  }

  update(time, delta) {
    if (!this.bg) return;
    // sfondo fermo (la deriva lenta sembrava uno scatto)
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

  // bollicine di O₂ che salgono dallo zaino (pixel quadrati, nei colori del gioco)
  bubbles(n = 9) {
    const px = this.packImg.x + 28;
    const py = this.packImg.y + 14;
    for (let i = 0; i < n; i++) {
      const size = 4 + (i % 3) * 2;
      const b = this.add.circle(px + (Math.random() - 0.5) * 30, py, size / 2 + 1, 0xe6e9e5).setAlpha(0).setDepth(13);
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
      this.plantLabel(plantText());
      toast(this, "Pianta collegata");
    } catch (error) {
      toast(this, error?.message ?? "Collegamento non riuscito", { duration: 3200 });
    }
  }
}

// voce del menu per la pianta: con la spunta finché l'Arduino è collegato
function plantText() {
  return PlantSensors.state.connected ? "PIANTA COLLEGATA ✓" : "COLLEGA LA PIANTA";
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
  X.fillStyle = "#2E4350";
  X.font = '800 104px "Helvetica Neue", "Inter", Arial, sans-serif';
  X.textBaseline = "alphabetic";
  X.fillText("O", 0, 100);
  const ow = X.measureText("O").width;
  X.fillStyle = "#7D909F";
  X.font = '800 52px "Helvetica Neue", "Inter", Arial, sans-serif';
  X.fillText("2", ow + 2, 116);
  const tw = X.measureText("2").width;
  X.fillStyle = "#2E4350";
  X.font = '800 104px "Helvetica Neue", "Inter", Arial, sans-serif';
  if ("letterSpacing" in X) X.letterSpacing = "-2px";
  X.fillText("RIGIN", ow + tw + 6, 100);
  return c;
}
