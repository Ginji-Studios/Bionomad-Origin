import Phaser from "../phaser.js";
import { addTopBar, brandMarks, ditherRect, goTo, textChip, bodyText, COLORS, dropShadow, drawPanel, paperGrid, pixelArrow, pixelDisc, pixelText } from "../ui/theme.js";

// le azioni vere sulla pianta, lette dai sensori dell'arduino
const CARE_GESTURES = [
  { title: "ILLUMINAZIONE", description: "punta la torcia", art: "light", key: "I" },
  { title: "TERMOREGOLAZIONE", description: "torcia termica ± °C", art: "heat", key: "H/F" },
  { title: "IDRATAZIONE", description: "pulsante irrigazione", art: "irrigate", key: "R" },
  { title: "NUTRIZIONE", description: "fiale nel pozzetto", art: "vials", key: "1/2/3" }
];

// errori da evitare: ognuno costa ossigeno
const NEGLECT_GESTURES = [
  { title: "PRIVAZIONE DI LUCE", description: "coperta troppo a lungo", art: "cover" },
  { title: "SHOCK TERMICO", description: "troppo caldo o freddo", art: "forgot" },
  { title: "IPER-IDRATAZIONE", description: "leva dell'acqua aperta", art: "flood" },
  { title: "INTOSSICAZIONE", description: "fiala del colore sbagliato", art: "wrongVial" }
];

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create() {
    const { width, height } = this.scale;
    paperGrid(this);
    addTopBar(this, "TUTORIAL", "BIODOM+");

    // il "what if" del progetto al posto del titolo
    pixelText(this, width / 2, 64, "E SE DOVESSIMO COLTIVARE L'ARIA CHE RESPIRIAMO?", { size: 16, origin: 0.5, shadow: true, fit: 760 });

    bodyText(
      this,
      width / 2,
      88,
      "Durante l'emergenza sanitaria l'aria è irrespirabile: per sopravvivere il cittadino usa BIONOMAD+, lo zaino con un ecosistema vegetale che produce aria respirabile.",
      { size: 20, color: COLORS.steel, wrap: 700, lineSpacing: -2, align: "center", origin: [0.5, 0] }
    );

    this.createSection(126, 162, "GESTI DI CURA", CARE_GESTURES, COLORS.green, true);
    this.createSection(126, 338, "GESTI DI NEGLIGENZA", NEGLECT_GESTURES, COLORS.red, false);

    this.createSidePanel(16, "left");
    this.createSidePanel(width - 16 - 96, "right");

    // dopo la scelta dell'origine si parte da qui
    const start = textChip(this, width - 14, height - 15, "INVIO  inizia la giornata", { size: 20, originX: 1 });
    this.tweens.add({ targets: [start.g, start.label], alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    textChip(this, 14, height - 15, "ESC  menu", { size: 20 });
    const play = () => goTo(this, this.registry.get("run") ? "IntroScene" : "MenuScene");
    this.input.keyboard.once("keydown-ENTER", play);
    this.input.keyboard.once("keydown-SPACE", play);
    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  createSection(x, y, title, gestures, color, good) {
    const w = 708;
    const h = 156;
    const g = this.add.graphics();
    // cura = carta con inchiostro
    dropShadow(g, x, y, w, h);
    drawPanel(g, x, y, w, h, { fill: good ? COLORS.paper : COLORS.inkDeep, border: color, borderWidth: 2 });

    brandMarks(this, x, y, w, h, { color: good ? COLORS.steel : COLORS.red, gap: 8, lines: false });
    g.fillStyle(color, 1);
    const label = pixelText(this, x + w / 2, y, title, { size: 8, color: COLORS.paper, origin: 0.5 });
    g.fillRect(label.x - label.width / 2 - 8, y - 6, label.width + 16, 14);

    gestures.forEach((gesture, index) => this.createCard(x + 18 + index * 172, y + 18, gesture, color, good, 160, index));
  }

  createCard(x, y, gesture, color, good, w = 212, index = 0) {
    const h = 84;
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h, { fill: good ? COLORS.bg : 0x24344a, border: color, borderWidth: 2 });
    g.fillStyle(good ? COLORS.panelLight : 0x2c3e52, 1);
    g.fillRect(x + 2, y + h - 18, w - 4, 16);

    // badge ✓ / ✗ nell'angolo
    g.fillStyle(color, 1);
    g.fillRect(x + w - 24, y + 4, 20, 20);
    this.add.image(x + w - 14, y + 14, good ? "check" : "cross").setScale(2);

    // retino leggero come le foto del progetto, numero [0n] e tasto da tastiera
    ditherRect(g, x + 2, y + 2, w - 4, h - 20, good ? COLORS.paper : 0x2c3e52, 3, 2, 0.6);
    this.drawGestureArt(gesture.art, x + w / 2, y + h - 8);
    pixelText(this, x + 6, y + h - 14, `[0${index + 1}]`, { size: 8, color: good ? COLORS.steel : COLORS.steelLight });
    if (gesture.key) {
      const keyLabel = pixelText(this, x + w - 8, y + h - 14, gesture.key, { size: 8, color: COLORS.paper, origin: [1, 0] });
      const kg = this.add.graphics();
      drawPanel(kg, keyLabel.x - keyLabel.width - 6, y + h - 17, keyLabel.width + 10, 14, { fill: COLORS.ink, border: COLORS.ink, borderWidth: 1 });
      keyLabel.setDepth(1);
    }

    bodyText(this, x + w / 2, y + h + 6, gesture.title, { size: 22, color: good ? COLORS.ink : COLORS.paper, origin: [0.5, 0], fit: w - 8 });
    bodyText(this, x + w / 2, y + h + 28, gesture.description, { size: 18, color: good ? COLORS.steel : COLORS.steelLight, origin: [0.5, 0], fit: w - 8 });

  }

  // piccole illustrazioni animate, disegnate con rettangoli "a pixel"
  drawGestureArt(type, cx, baseY) {
    const plant = this.add.image(cx, baseY, "pot_plant").setOrigin(0.5, 1).setScale(4);
    const fx = this.add.graphics();
    const loop = (delay, callback) => this.time.addEvent({ delay, loop: true, callback });

    if (type === "light") {
      // torcia che si accende e punta il fascio sulla pianta
      fx.fillStyle(COLORS.steel, 1);
      fx.fillRect(cx - 74, baseY - 50, 18, 10);
      fx.fillStyle(COLORS.ink, 1);
      fx.fillRect(cx - 56, baseY - 54, 6, 18);
      const beam = this.add.graphics();
      for (let i = 0; i < 8; i += 1) {
        beam.fillStyle(0xe8c66a, 0.55);
        beam.fillRect(cx - 50 + i * 4, baseY - 48 - i * 2, 4, 6 + i * 4);
      }
      this.tweens.add({ targets: beam, alpha: { from: 0, to: 1 }, duration: 160, yoyo: true, hold: 1200, repeat: -1, repeatDelay: 600 });
      this.tweens.add({ targets: plant, scaleY: 4.3, duration: 500, yoyo: true, hold: 800, repeat: -1, repeatDelay: 700, ease: "Sine.easeInOut" });
    }

    if (type === "irrigate") {
      // pulsante sul vaso: si preme, l'acqua scende, si ripreme e si ferma
      const button = this.add.graphics();
      button.fillStyle(COLORS.ink, 1);
      button.fillRect(cx - 52, baseY - 16, 16, 8);
      const cap = this.add.rectangle(cx - 44, baseY - 20, 10, 6, COLORS.red);
      fx.fillStyle(COLORS.steel, 1);
      fx.fillRect(cx - 4, baseY - 72, 8, 6);
      let on = false;
      loop(1600, () => {
        on = !on;
        this.tweens.add({ targets: cap, y: baseY - 16, duration: 90, yoyo: true });
        cap.setFillStyle(on ? 0x5c7a6b : COLORS.red);
      });
      loop(110, () => {
        if (!on) return;
        const drop = this.add.rectangle(cx + Phaser.Math.Between(-6, 6), baseY - 64, 3, 6, COLORS.steel);
        this.tweens.add({ targets: drop, y: baseY - 30, alpha: 0, duration: 380, onComplete: () => drop.destroy() });
      });
    }

    if (type === "vials") {
      // pozzetto accanto al vaso: la fiala scende e si incastra
      fx.fillStyle(COLORS.ink, 1);
      fx.fillRect(cx + 36, baseY - 30, 20, 4);
      fx.fillRect(cx + 36, baseY - 30, 4, 22);
      fx.fillRect(cx + 52, baseY - 30, 4, 22);
      fx.fillRect(cx + 36, baseY - 10, 20, 4);
      const vial = this.add.container(cx + 46, baseY - 70);
      const glass = this.add.rectangle(0, 0, 8, 22, 0xdfe7ea).setStrokeStyle(2, COLORS.ink);
      const liquid = this.add.rectangle(0, 5, 6, 10, 0x7e9c8c);
      vial.add([glass, liquid]);
      this.tweens.add({ targets: vial, y: baseY - 22, duration: 700, hold: 700, yoyo: true, repeat: -1, repeatDelay: 300, ease: "Quad.easeIn" });
    }

    if (type === "heat") {
      // torcia termica con fiamma tremolante e onde di calore che salgono
      fx.fillStyle(COLORS.stone, 1);
      fx.fillRect(cx + 46, baseY - 50, 30, 12);
      fx.fillRect(cx + 66, baseY - 40, 8, 16);
      fx.fillStyle(COLORS.steel, 1);
      fx.fillRect(cx + 40, baseY - 48, 6, 8);
      const flame = this.add.container(cx + 34, baseY - 44);
      const outer = this.add.rectangle(0, 0, 12, 8, COLORS.red);
      const inner = this.add.rectangle(-4, 0, 6, 4, 0xe8b04a);
      flame.add([outer, inner]);
      this.tweens.add({ targets: outer, scaleX: 1.5, duration: 90, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: inner, x: -7, duration: 120, yoyo: true, repeat: -1 });
      // alterna caldo (onde rosse) e freddo (aria azzurra)
      let warm = true;
      loop(2400, () => {
        warm = !warm;
        outer.setFillStyle(warm ? COLORS.red : COLORS.steelLight);
        inner.setFillStyle(warm ? 0xe8b04a : COLORS.paper);
      });
      loop(300, () => {
        const wave = this.add.rectangle(cx + Phaser.Math.Between(-20, 20), baseY - 20, 4, 6, warm ? COLORS.red : COLORS.steelLight, 0.7);
        this.tweens.add({ targets: wave, y: baseY - 62, alpha: 0, x: wave.x + Phaser.Math.Between(-6, 6), duration: 900, onComplete: () => wave.destroy() });
      });
    }

    if (type === "forgot") {
      // clessidra che scorre: la pianta si affloscia tra gelo e calore eccessivo
      fx.fillStyle(COLORS.steelLight, 1);
      fx.fillRect(cx - 62, baseY - 62, 18, 4);
      fx.fillRect(cx - 62, baseY - 30, 18, 4);
      fx.fillRect(cx - 60, baseY - 58, 4, 8);
      fx.fillRect(cx - 50, baseY - 58, 4, 8);
      fx.fillRect(cx - 56, baseY - 50, 6, 4);
      fx.fillRect(cx - 60, baseY - 46, 4, 8);
      fx.fillRect(cx - 50, baseY - 46, 4, 8);
      const sand = this.add.rectangle(cx - 53, baseY - 38, 6, 8, 0xe8c66a).setOrigin(0.5, 1);
      this.tweens.add({ targets: sand, scaleY: { from: 0.1, to: 1 }, duration: 2000, repeat: -1, repeatDelay: 400 });
      this.tweens.add({ targets: plant, scaleY: 3.2, scaleX: 4.3, duration: 1200, hold: 700, yoyo: true, repeat: -1, ease: "Sine.easeIn" });
      // alterna gelo (fiocchi che cadono) e calore eccessivo (onde rosse che salgono)
      let cold = true;
      const glow = this.add.rectangle(cx, baseY - 36, 140, 72, COLORS.red, 0);
      loop(2400, () => {
        cold = !cold;
        this.tweens.add({ targets: glow, fillAlpha: cold ? 0 : 0.18, duration: 300 });
      });
      loop(240, () => {
        const x = cx + Phaser.Math.Between(-30, 60);
        if (cold) {
          const flake = this.add.rectangle(x, baseY - 70, 4, 4, COLORS.paper, 0.9);
          this.tweens.add({ targets: flake, y: baseY - 10, alpha: 0, duration: 1300, onComplete: () => flake.destroy() });
        } else {
          const wave = this.add.rectangle(x, baseY - 12, 4, 6, COLORS.red, 0.8);
          this.tweens.add({ targets: wave, y: baseY - 68, alpha: 0, x: x + Phaser.Math.Between(-6, 6), duration: 1000, onComplete: () => wave.destroy() });
        }
      });
    }

    if (type === "flood") {
      // leva aperta: l'acqua sale fino a sommergere il vaso
      fx.fillStyle(COLORS.steel, 1);
      fx.fillRect(cx - 4, baseY - 72, 8, 6);
      fx.fillStyle(COLORS.ink, 1);
      fx.fillRect(cx + 44, baseY - 14, 18, 6);
      fx.fillStyle(0x5c7a6b, 1);
      fx.fillRect(cx + 52, baseY - 34, 4, 22);
      fx.fillRect(cx + 50, baseY - 38, 8, 6);
      const water = this.add.rectangle(cx, baseY, 136, 44, COLORS.steel, 0.55).setOrigin(0.5, 1);
      this.tweens.add({ targets: water, scaleY: { from: 0, to: 1 }, duration: 2200, hold: 600, repeat: -1, ease: "Sine.easeIn" });
      this.tweens.add({ targets: plant, angle: 0, scaleY: 3.4, duration: 2200, hold: 600, repeat: -1, ease: "Sine.easeIn" });
      loop(90, () => {
        const drop = this.add.rectangle(cx + Phaser.Math.Between(-5, 5), baseY - 64, 3, 6, COLORS.steelLight);
        this.tweens.add({ targets: drop, y: baseY - 34, alpha: 0, duration: 340, onComplete: () => drop.destroy() });
      });
    }

    if (type === "wrongVial") {
      // pozzetto che chiede il verde: entra la fiala rossa, X lampeggiante, la fiala risale
      fx.fillStyle(0x5c9a6b, 1);
      fx.fillRect(cx + 36, baseY - 30, 20, 4);
      fx.fillRect(cx + 36, baseY - 30, 4, 22);
      fx.fillRect(cx + 52, baseY - 30, 4, 22);
      fx.fillRect(cx + 36, baseY - 10, 20, 4);
      const vial = this.add.container(cx + 46, baseY - 70);
      vial.add([this.add.rectangle(0, 0, 8, 22, 0xdfe7ea).setStrokeStyle(2, COLORS.ink), this.add.rectangle(0, 5, 6, 10, COLORS.red)]);
      const wrong = this.add.image(cx + 46, baseY - 52, "cross").setScale(2).setAlpha(0);
      this.tweens.chain({
        loop: -1,
        tweens: [
          { targets: vial, y: baseY - 22, duration: 600, ease: "Quad.easeIn", delay: 300 },
          { targets: wrong, alpha: { from: 1, to: 0 }, duration: 140, repeat: 3, yoyo: true },
          { targets: vial, y: baseY - 70, duration: 500, ease: "Back.easeOut" }
        ]
      });
    }

    if (type === "cover") {
      // tapparella che scende dal bordo della card e "spegne" la pianta
      const top = baseY - 72;
      const shutter = this.add.graphics().setPosition(cx - 40, top);
      for (let y = 0; y < 64; y += 6) {
        shutter.fillStyle(COLORS.steel, 1);
        shutter.fillRect(0, y, 80, 4);
        shutter.fillStyle(COLORS.inkDeep, 1);
        shutter.fillRect(0, y + 4, 80, 2);
      }
      shutter.fillStyle(COLORS.paper, 1);
      shutter.fillRect(0, 64, 80, 4);
      shutter.fillRect(36, 68, 8, 2);
      shutter.scaleY = 0;
      const dark = this.add.rectangle(cx, baseY - 36, 80, 72, COLORS.inkDeep, 0);
      this.tweens.chain({
        loop: -1,
        tweens: [
          { targets: shutter, scaleY: 1, duration: 700, ease: "Bounce.easeOut", delay: 400 },
          { targets: [plant, dark], alpha: { from: 1, to: 0.3 }, duration: 300, hold: 900, yoyo: true, offset: 0 },
          { targets: shutter, scaleY: 0, duration: 450, ease: "Quad.easeIn" }
        ]
      });
    }

  }

  createSidePanel(x, side) {
    const y = 162;
    const w = 96;
    const h = 332;
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.line, borderWidth: 2 });
    const cx = x + w / 2;

    pixelText(this, cx, y + 16, "MUOVITI", { size: 8, color: COLORS.textDim, origin: 0.5 });

    const plant = this.add.image(cx, y + 150, "plant_tall").setOrigin(0.5, 1).setScale(4);
    const hand = this.add.graphics();
    hand.fillStyle(0xe8dccd, 1);
    const handX = side === "left" ? cx - 36 : cx + 20;
    hand.fillRect(handX, y + 74, 16, 10);
    hand.fillRect(side === "left" ? handX + 14 : handX - 6, y + 76, 8, 4);
    this.tweens.add({ targets: hand, x: side === "left" ? 4 : -4, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: plant, x: cx + (side === "left" ? -4 : 4), duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const arrow = this.add.graphics();
    pixelArrow(arrow, side === "left" ? cx - 22 : cx + 22, y + 210, side, COLORS.ink, 6);

    bodyText(this, cx, y + 248, "TOCCA LA\nFOGLIA A", { size: 20, color: COLORS.text, align: "center", origin: [0.5, 0], fit: w - 12, lineSpacing: 2 });
    bodyText(this, cx, y + 296, side === "left" ? "SINISTRA" : "DESTRA", { size: 20, color: COLORS.red, origin: [0.5, 0], fit: w - 12 });
  }
}
