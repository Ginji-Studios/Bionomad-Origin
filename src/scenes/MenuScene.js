import Phaser from "../phaser.js";
import { bodyText, COLORS, drawPanel, dropShadow, fadeIn, goTo, hex, paperGrid, pixelDisc, pixelText } from "../ui/theme.js";

// Menu principale in stile "schermata di avvio": voci navigabili con W/S, frecce o mouse.
const MENU_ITEMS = [
  { label: "GIOCA", hint: "Scegli l'origine e affronta una giornata.", target: "CharacterSelectScene" },
  { label: "TUTORIAL", hint: "Impara i gesti di cura (e quelli da evitare).", target: "TutorialScene" },
  { label: "CREDITI", hint: "Chi ha costruito BIODOM+.", target: "CreditsScene" }
];

const PANEL = { x: 70, y: 230, w: 380, h: 214 };
const ROW_H = 44;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    this.selectedIndex = 0;
    this.rows = [];
    fadeIn(this, 400);

    // Sfondo a quadretti che scorre lentamente
    const grid = paperGrid(this, { step: 48 });
    grid.setScale(1.12).setPosition(-48, -48);
    this.tweens.add({ targets: grid, x: 0, y: 0, duration: 7000, repeat: -1 });

    this.createStage(width, height);
    this.createTitle();
    this.createMenuPanel();

    const keys = this.input.keyboard;
    ["UP", "W"].forEach((key) => keys.on(`keydown-${key}`, () => this.move(-1)));
    ["DOWN", "S"].forEach((key) => keys.on(`keydown-${key}`, () => this.move(1)));
    ["ENTER", "SPACE"].forEach((key) => keys.on(`keydown-${key}`, () => this.confirm()));

    this.select(0, true);
  }

  createTitle() {
    const title = this.add.container(PANEL.x, 76);
    const o = pixelText(this, 0, 0, "O", { size: 48, color: COLORS.ink, shadow: true });
    const two = pixelText(this, 48, 32, "2", { size: 16, color: COLORS.red });
    const rigin = pixelText(this, 68, 0, "RIGIN", { size: 48, color: COLORS.ink, shadow: true });
    const sub = bodyText(this, 2, 62, "BIONOMAD+  ·  simulatore di sopravvivenza", { size: 24, color: COLORS.steel });
    title.add([o, two, rigin, sub]);

    title.setAlpha(0).y = 46;
    this.tweens.add({ targets: title, y: 76, alpha: 1, duration: 650, ease: "Back.easeOut" });
    this.tweens.add({ targets: two, y: 26, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  createMenuPanel() {
    const { x, y, w, h } = PANEL;
    const panel = this.add.container(0, 0);
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 30);
    const head = pixelText(this, x + 14, y + 11, "MENU PRINCIPALE", { size: 8, color: COLORS.paper });

    // Cursore lampeggiante stile terminale
    const cursor = this.add.rectangle(x + 150, y + 15, 8, 10, COLORS.paper);
    this.tweens.add({ targets: cursor, alpha: 0, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.highlight = this.add.graphics();
    drawPanel(this.highlight, 0, 0, w - 28, ROW_H - 8, { fill: COLORS.ink, border: COLORS.ink });
    this.highlight.setPosition(x + 14, y + 44);

    this.leaf = this.add.image(x + 32, y + 44, "pot_plant").setScale(2);
    this.tweens.add({ targets: this.leaf, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    panel.add([g, head, cursor, this.highlight, this.leaf]);

    MENU_ITEMS.forEach((item, index) => {
      const rowY = y + 44 + index * ROW_H;
      const label = pixelText(this, x + 58, rowY + 10, item.label, { size: 16, color: COLORS.ink });
      const zone = this.add.zone(x + w / 2, rowY + ROW_H / 2 - 4, w - 28, ROW_H).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => this.select(index));
      zone.on("pointerdown", () => {
        this.select(index);
        this.confirm();
      });
      panel.add(label);
      this.rows.push({ label, rowY });
    });

    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + 14, y + h - 44, w - 28, 2);
    this.hint = bodyText(this, x + 16, y + h - 34, "", { size: 22, color: COLORS.steel });
    panel.add(this.hint);

    panel.setAlpha(0).x = -30;
    this.tweens.add({ targets: panel, x: 0, alpha: 1, duration: 500, delay: 200, ease: "Cubic.easeOut" });
  }

  createStage(width, height) {
    // Sole velato, città in silhouette e il cittadino con lo zaino che respira
    const g = this.add.graphics();
    pixelDisc(g, 700, 250, 110, COLORS.panelLight, 1, 6);
    pixelDisc(g, 700, 250, 86, COLORS.bgSoft, 1, 6);
    [[500, 80, 150], [575, 50, 230], [630, 110, 120], [745, 60, 200], [805, 90, 140], [895, 80, 180]].forEach(([x, w, h], i) => {
      g.fillStyle(i % 2 ? COLORS.steelLight : COLORS.steel, 1);
      g.fillRect(x, height - 54 - h, w, h);
    });
    g.fillStyle(COLORS.inkDeep, 1);
    g.fillRect(0, height - 54, width, 54);

    const hero = this.add.container(700, height - 54);
    const pack = this.add.image(-45, -36, "pack").setOrigin(0.5, 1).setScale(6);
    const body = this.add.image(0, 0, "hero_milano_mask").setOrigin(0.5, 1).setScale(6);
    hero.add([pack, body]);
    this.tweens.add({ targets: body, y: -4, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: pack, y: -40, angle: -3, duration: 1100, delay: 150, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Bollicine di ossigeno che escono dalle piante dello zaino
    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const bubble = this.add.graphics();
        const size = Phaser.Math.Between(3, 6) * 2;
        pixelDisc(bubble, 0, 0, size, COLORS.ink, 1, 2);
        pixelDisc(bubble, 0, 0, size - 2, COLORS.paper, 1, 2);
        bubble.setPosition(655 + Phaser.Math.Between(-12, 12), height - 150);
        this.tweens.add({ targets: bubble, y: bubble.y - Phaser.Math.Between(120, 200), alpha: 0, duration: 2600, ease: "Sine.easeOut", onComplete: () => bubble.destroy() });
        this.tweens.add({ targets: bubble, x: bubble.x + Phaser.Math.Between(-30, 30), duration: 1300, yoyo: true, ease: "Sine.easeInOut" });
      }
    });

    // Etichetta "O2+" fluttuante
    const tag = this.add.container(800, 170);
    const tagBg = drawPanel(this.add.graphics(), -34, -16, 68, 32, { fill: COLORS.paper, border: COLORS.ink });
    tag.add([tagBg, pixelText(this, 0, 0, "O2+", { size: 8, color: COLORS.ink, origin: 0.5 })]);
    this.tweens.add({ targets: tag, y: 156, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    pixelText(this, 18, height - 31, "W/S  SCEGLI    INVIO  CONFERMA", { size: 8, color: COLORS.steelLight });
    pixelText(this, width - 18, height - 31, "BIODOM+ · GINJI STUDIOS", { size: 8, color: COLORS.paper, origin: [1, 0] });
  }

  move(step) {
    this.select(Phaser.Math.Wrap(this.selectedIndex + step, 0, MENU_ITEMS.length));
  }

  select(index, instant = false) {
    this.selectedIndex = index;
    const row = this.rows[index];
    const duration = instant ? 0 : 180;
    this.tweens.killTweensOf(this.highlight);
    this.tweens.add({ targets: this.highlight, y: row.rowY, duration, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: this.leaf, y: row.rowY + ROW_H / 2 - 4, duration, ease: "Cubic.easeOut" });
    this.rows.forEach((r, i) => {
      r.label.setColor(hex(i === index ? COLORS.paper : COLORS.ink));
      this.tweens.add({ targets: r.label, x: PANEL.x + (i === index ? 66 : 58), duration, ease: "Cubic.easeOut" });
    });
    this.leaf.setTexture(index === 0 ? "pot_flower" : "pot_plant");
    this.hint.setText(MENU_ITEMS[index].hint);
  }

  confirm() {
    const item = MENU_ITEMS[this.selectedIndex];
    this.tweens.add({ targets: this.rows[this.selectedIndex].label, scale: 1.08, duration: 90, yoyo: true });
    goTo(this, item.target, item.target === "CharacterSelectScene" ? { next: "IntroScene" } : undefined);
  }
}
