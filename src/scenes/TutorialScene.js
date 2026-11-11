import Phaser from "../phaser.js";
import { addTopBar, goTo, textChip, bodyText, COLORS, dropShadow, drawPanel, paperGrid, pixelArrow, pixelDisc, pixelText } from "../ui/theme.js";

// gesti che i sensori della pianta riconoscono
const CARE_GESTURES = [
  { title: "ILLUMINALA", description: "luce e crescita", art: "light" },
  { title: "SOFFIACI SOPRA", description: "aria dolce", art: "blow" },
  { title: "SCALDALA", description: "torcia termica", art: "heat" }
];

const NEGLECT_GESTURES = [
  { title: "COPRILA", description: "toglie la luce", art: "cover" },
  { title: "SCUOTILA", description: "la fa soffrire", art: "shake" },
  { title: "SOLLEVALA", description: "senza sottovaso", art: "lift" }
];

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create() {
    const { width, height } = this.scale;
    paperGrid(this);
    addTopBar(this, "TUTORIAL", "BIODOM+");

    pixelText(this, width / 2, 64, "WELCOME TO BIODOM+", { size: 24, origin: 0.5, shadow: true, fit: 700 });
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
    const start = textChip(this, width - 14, height - 30, "INVIO  inizia la giornata", { size: 20, originX: 1 });
    this.tweens.add({ targets: [start.g, start.label], alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    textChip(this, 14, height - 30, "ESC  menu", { size: 20 });
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

    g.fillStyle(color, 1);
    const label = pixelText(this, x + w / 2, y, title, { size: 8, color: COLORS.paper, origin: 0.5 });
    g.fillRect(label.x - label.width / 2 - 8, y - 6, label.width + 16, 14);

    gestures.forEach((gesture, index) => {
      this.createCard(x + 18 + index * 230, y + 18, gesture, color, good);
    });
  }

  createCard(x, y, gesture, color, good) {
    const w = 212;
    const h = 84;
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h, { fill: good ? COLORS.bg : 0x24344a, border: color, borderWidth: 2 });
    g.fillStyle(good ? COLORS.panelLight : 0x2c3e52, 1);
    g.fillRect(x + 2, y + h - 18, w - 4, 16);

    // badge ✓ / ✗ nell'angolo
    g.fillStyle(color, 1);
    g.fillRect(x + w - 24, y + 4, 20, 20);
    this.add.image(x + w - 14, y + 14, good ? "check" : "cross").setScale(2);

    this.drawGestureArt(gesture.art, x + w / 2, y + h - 8);

    bodyText(this, x + w / 2, y + h + 6, gesture.title, { size: 22, color: good ? COLORS.ink : COLORS.paper, origin: [0.5, 0], fit: w - 8 });
    bodyText(this, x + w / 2, y + h + 28, gesture.description, { size: 18, color: good ? COLORS.steel : COLORS.steelLight, origin: [0.5, 0], fit: w - 8 });

  }

  // piccole illustrazioni animate, disegnate con rettangoli "a pixel"
  drawGestureArt(type, cx, baseY) {
    const plant = this.add.image(cx, baseY, "pot_plant").setOrigin(0.5, 1).setScale(4);
    const fx = this.add.graphics();
    const loop = (delay, callback) => this.time.addEvent({ delay, loop: true, callback });

    if (type === "light") {
      // sole che pulsa e raggi che viaggiano verso la pianta
      const sun = this.add.container(cx - 62, baseY - 60);
      const disc = this.add.graphics();
      pixelDisc(disc, 0, 0, 14, COLORS.ink, 1, 2);
      pixelDisc(disc, 0, 0, 9, COLORS.paper, 1, 2);
      sun.add(disc);
      this.tweens.add({ targets: sun, scale: 1.15, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      loop(260, () => {
        const ray = this.add.rectangle(cx - 46, baseY - 48, 6, 4, COLORS.ink);
        this.tweens.add({ targets: ray, x: cx - 14, y: baseY - 32, alpha: 0.2, duration: 600, onComplete: () => ray.destroy() });
      });
      this.tweens.add({ targets: plant, scaleY: 4.3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (type === "blow") {
      // faccia che soffia
      const face = this.add.graphics();
      face.fillStyle(0xe8dccd, 1);
      face.fillRect(cx - 86, baseY - 58, 26, 30);
      face.fillStyle(COLORS.inkDeep, 1);
      face.fillRect(cx - 70, baseY - 50, 4, 4);
      const mouth = this.add.rectangle(cx - 60, baseY - 38, 6, 6, COLORS.inkDeep);
      this.tweens.add({ targets: mouth, scaleX: 1.6, scaleY: 0.6, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      loop(320, () => {
        const puff = this.add.rectangle(cx - 52, baseY - 40 + Phaser.Math.Between(-4, 4), 8, 4, COLORS.steel);
        this.tweens.add({ targets: puff, x: cx - 10, alpha: 0, scaleX: 0.4, duration: 650, ease: "Sine.easeOut", onComplete: () => puff.destroy() });
      });
      this.tweens.add({ targets: plant, x: cx + 4, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
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
      loop(300, () => {
        const wave = this.add.rectangle(cx + Phaser.Math.Between(-20, 20), baseY - 20, 4, 6, COLORS.red, 0.7);
        this.tweens.add({ targets: wave, y: baseY - 62, alpha: 0, x: wave.x + Phaser.Math.Between(-6, 6), duration: 900, onComplete: () => wave.destroy() });
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

    if (type === "shake") {
      // scossa a raffiche
      const lines = this.add.graphics();
      lines.fillStyle(COLORS.red, 1);
      [-1, 1].forEach((side) => {
        lines.fillRect(cx + side * 46 - 2, baseY - 56, 4, 10);
        lines.fillRect(cx + side * 54 - 2, baseY - 46, 4, 14);
        lines.fillRect(cx + side * 46 - 2, baseY - 30, 4, 10);
      });
      const burst = () => {
        lines.setVisible(true);
        this.tweens.add({ targets: plant, x: { from: cx - 6, to: cx + 6 }, duration: 60, yoyo: true, repeat: 6, onComplete: () => {
          plant.x = cx;
          lines.setVisible(false);
        } });
        for (let i = 0; i < 2; i += 1) {
          const leaf = this.add.image(cx + Phaser.Math.Between(-14, 14), baseY - 44, "leaf_bad").setScale(3);
          this.tweens.add({ targets: leaf, y: baseY - 10, x: leaf.x + Phaser.Math.Between(-16, 16), alpha: 0, duration: 900, delay: i * 120, ease: "Quad.easeIn", onComplete: () => leaf.destroy() });
        }
      };
      burst();
      loop(1500, burst);
    }

    if (type === "lift") {
      // il vaso si alza, il sottovaso resta giù e l'acqua gocciola via
      fx.fillStyle(COLORS.steelLight, 1);
      fx.fillRect(cx + 44, baseY - 8, 36, 6);
      fx.fillStyle(COLORS.stone, 1);
      fx.fillRect(cx + 48, baseY - 12, 28, 4);
      pixelArrow(fx, cx - 64, baseY - 64, "up", COLORS.paper, 3);
      this.tweens.add({ targets: plant, y: baseY - 12, duration: 600, yoyo: true, hold: 600, repeat: -1, ease: "Back.easeOut" });
      loop(240, () => {
        if (plant.y > baseY - 8) return;
        const drop = this.add.rectangle(cx + Phaser.Math.Between(-10, 10), plant.y, 4, 6, COLORS.steelLight);
        this.tweens.add({ targets: drop, y: baseY, alpha: 0, duration: 400, onComplete: () => drop.destroy() });
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
