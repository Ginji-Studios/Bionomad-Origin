import Phaser from "../phaser.js";
import { addCornerHints, addTopBar, goTo, bodyText, COLORS, dropShadow, drawPanel, paperGrid, pixelArrow, pixelDisc, pixelText } from "../ui/theme.js";

// Gesti che i sensori della pianta riconosceranno (luce, soffio, calore / buio, scossa, sollevamento).
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

    pixelText(this, width / 2, 66, "WELCOME TO BIODOM+", { size: 24, origin: 0.5, shadow: true });
    bodyText(
      this,
      126,
      88,
      "Durante l'emergenza sanitaria, l'aria è irrespirabile. Per sopravvivere, il cittadino deve usare BIONOMAD+, lo zaino multifunzione contenente un ecosistema vegetale che produca aria respirabile.",
      { size: 22, color: COLORS.text, wrap: 708, lineSpacing: -2 }
    );

    this.createSection(126, 156, "GESTI DI CURA", CARE_GESTURES, COLORS.green, true);
    this.createSection(126, 334, "GESTI DI NEGLIGENZA", NEGLECT_GESTURES, COLORS.red, false);

    this.createSidePanel(16, "left");
    this.createSidePanel(width - 16 - 96, "right");

    addCornerHints(this, null, "ESC  MENU");
    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  createSection(x, y, title, gestures, color, good) {
    const w = 708;
    const h = 166;
    const g = this.add.graphics();
    // Cura = carta con inchiostro; negligenza = schermo scuro "di errore" con bordo ruggine.
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
    const h = 96;
    const g = this.add.graphics();
    drawPanel(g, x, y, w, h, { fill: good ? COLORS.bg : 0x24344a, border: color, borderWidth: 2 });
    g.fillStyle(good ? COLORS.panelLight : 0x2c3e52, 1);
    g.fillRect(x + 2, y + h - 18, w - 4, 16);

    // Badge ✓ / ✗ nell'angolo
    g.fillStyle(color, 1);
    g.fillRect(x + w - 24, y + 4, 20, 20);
    this.add.image(x + w - 14, y + 14, good ? "check" : "cross").setScale(2);

    this.drawGestureArt(gesture.art, x + w / 2, y + h - 8);

    bodyText(this, x + w / 2, y + h + 4, gesture.title, { size: 24, color: good ? COLORS.ink : COLORS.paper, origin: [0.5, 0] });
    bodyText(this, x + w / 2, y + h + 24, gesture.description, { size: 20, color: good ? COLORS.steel : COLORS.steelLight, origin: [0.5, 0] });

    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    const hover = this.add.graphics();
    hit.on("pointerover", () => drawPanel(hover.clear(), x - 4, y - 4, w + 8, h + 8, { fillAlpha: 0, border: COLORS.steel, borderWidth: 2 }));
    hit.on("pointerout", () => hover.clear());
  }

  // Piccole illustrazioni animate, disegnate con rettangoli "a pixel".
  drawGestureArt(type, cx, baseY) {
    const plant = this.add.image(cx, baseY, "pot_plant").setOrigin(0.5, 1).setScale(5);
    const fx = this.add.graphics();

    if (type === "light") {
      pixelDisc(fx, cx - 60, baseY - 62, 14, COLORS.ink, 1, 4);
      pixelDisc(fx, cx - 60, baseY - 62, 8, COLORS.paper, 1, 4);
      fx.fillStyle(COLORS.ink, 0.8);
      for (let i = 0; i < 5; i += 1) fx.fillRect(cx - 42 + i * 8, baseY - 46 + i * 6, 4, 4);
      this.tweens.add({ targets: fx, alpha: 0.45, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (type === "blow") {
      fx.fillStyle(0xe8dccd, 1);
      fx.fillRect(cx - 82, baseY - 56, 24, 28);
      fx.fillStyle(COLORS.inkDeep, 1);
      fx.fillRect(cx - 66, baseY - 48, 4, 4);
      fx.fillRect(cx - 62, baseY - 38, 6, 4);
      const puff = this.add.graphics();
      puff.fillStyle(COLORS.steel, 1);
      [0, 1, 2].forEach((i) => puff.fillRect(cx - 50 + i * 10, baseY - 40 + (i % 2) * 6, 6, 4));
      this.tweens.add({ targets: puff, x: 10, alpha: 0.2, duration: 700, repeat: -1 });
    }

    if (type === "heat") {
      fx.fillStyle(COLORS.stone, 1);
      fx.fillRect(cx + 46, baseY - 50, 30, 12);
      fx.fillRect(cx + 66, baseY - 40, 8, 16);
      fx.fillStyle(COLORS.steel, 1);
      fx.fillRect(cx + 40, baseY - 48, 6, 8);
      const flame = this.add.graphics();
      flame.fillStyle(COLORS.red, 1);
      flame.fillRect(cx + 28, baseY - 50, 10, 8);
      flame.fillStyle(0xe8b04a, 1);
      flame.fillRect(cx + 22, baseY - 48, 6, 4);
      this.tweens.add({ targets: flame, alpha: 0.4, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (type === "cover") {
      const cover = this.add.graphics();
      drawPanel(cover, cx - 34, baseY - 78, 68, 70, { fill: COLORS.paper, fillAlpha: 1, border: COLORS.steelLight, borderWidth: 2 });
      this.tweens.add({ targets: cover, y: -6, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    if (type === "shake") {
      plant.setOrigin(0.5, 1);
      this.tweens.add({ targets: plant, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      fx.fillStyle(COLORS.red, 1);
      [-1, 1].forEach((side) => {
        fx.fillRect(cx + side * 46 - 2, baseY - 56, 4, 10);
        fx.fillRect(cx + side * 54 - 2, baseY - 46, 4, 14);
        fx.fillRect(cx + side * 46 - 2, baseY - 30, 4, 10);
      });
    }

    if (type === "lift") {
      plant.y -= 8;
      this.tweens.add({ targets: plant, y: baseY - 18, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      pixelArrow(fx, cx - 64, baseY - 64, "up", COLORS.paper, 3);
      fx.fillStyle(COLORS.steelLight, 1);
      fx.fillRect(cx + 44, baseY - 8, 36, 6);
      fx.fillStyle(COLORS.stone, 1);
      fx.fillRect(cx + 48, baseY - 12, 28, 4);
    }
  }

  createSidePanel(x, side) {
    const y = 156;
    const w = 96;
    const h = 344;
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
    this.tweens.add({ targets: plant, angle: side === "left" ? -6 : 6, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const arrow = this.add.graphics();
    pixelArrow(arrow, side === "left" ? cx - 22 : cx + 22, y + 210, side, COLORS.ink, 6);

    bodyText(this, cx, y + 252, "TOCCA LA\nFOGLIA A", { size: 22, color: COLORS.text, align: "center", origin: [0.5, 0] });
    bodyText(this, cx, y + 296, side === "left" ? "SINISTRA" : "DESTRA", { size: 22, color: COLORS.red, origin: [0.5, 0] });
  }
}
