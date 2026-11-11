import Phaser from "../phaser.js";
import { ORIGINS } from "../config/origins.js";
import { startRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { addTopBar, bodyText, COLORS, dropShadow, drawPanel, goTo, paperGrid, pixelArrow, pixelDisc, pixelText, textChip } from "../ui/theme.js";

const CARD_W = 210;
const CARD_H = 296;
const GAP = 34;

// selezione dell'origine
export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
  }

  create(data = {}) {
    const { width, height } = this.scale;
    this.next = data.next ?? "TutorialScene";
    this.cards = [];
    this.confirming = false;
    const saved = ORIGINS.findIndex((origin) => origin.id === this.registry.get("origin"));
    this.selectedIndex = saved >= 0 ? saved : 1;

    paperGrid(this);
    addTopBar(this, "ORIGINE", "GIOCATORE 1");

    pixelText(this, width / 2, 70, "SCEGLI LA TUA ORIGINE", { size: 24, origin: 0.5, shadow: true, fit: 760 });
    pixelText(this, width / 2, 106, "SELEZIONANE UNA SOLA", { size: 8, color: COLORS.steel, origin: 0.5 });

    const startX = width / 2 - (ORIGINS.length * CARD_W + (ORIGINS.length - 1) * GAP) / 2;
    ORIGINS.forEach((origin, index) => this.createCard(origin, index, startX + index * (CARD_W + GAP), 140));

    // indicatore sopra la carta scelta
    this.pointer = this.add.graphics();
    this.pointer.fillStyle(COLORS.red, 1);
    this.pointer.fillRect(-12, -12, 24, 4);
    this.pointer.fillRect(-8, -8, 16, 4);
    this.pointer.fillRect(-4, -4, 8, 4);

    this.createSideArrow(56, "left", -1);
    this.createSideArrow(width - 56, "right", 1);

    bodyText(this, width / 2, height - 62, "DIFFICOLTÀ = INQUINAMENTO DELL'ARIA (PM2.5 µg/m³, media annua)", { size: 22, color: COLORS.ink, origin: 0.5, fit: 760 });
    bodyText(this, width / 2, height - 40, "FONTE: IQAir 2024 · LIMITE OMS: 5 µg/m³", { size: 20, color: COLORS.steel, origin: 0.5, fit: 600 });
    textChip(this, 14, height - 16, "A / D scegli · INVIO conferma", { size: 18 });
    textChip(this, width - 14, height - 16, "ESC  MENU", { size: 18, originX: 1 });

    this.updateSelection(true);

    const keys = this.input.keyboard;
    ["LEFT", "A"].forEach((key) => keys.on(`keydown-${key}`, () => this.changeSelection(-1)));
    ["RIGHT", "D"].forEach((key) => keys.on(`keydown-${key}`, () => this.changeSelection(1)));
    ["ENTER", "SPACE"].forEach((key) => keys.on(`keydown-${key}`, () => this.confirmSelection()));
    keys.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  createCard(origin, index, x, y) {
    const container = this.add.container(x, y);
    const shadow = dropShadow(this.add.graphics(), 0, 0, CARD_W, CARD_H, 8);
    const bg = drawPanel(this.add.graphics(), 0, 0, CARD_W, CARD_H, { fill: COLORS.paper, border: COLORS.ink });
    const frame = drawPanel(this.add.graphics(), -6, -6, CARD_W + 12, CARD_H + 12, { fillAlpha: 0, border: COLORS.red, borderWidth: 4 });
    const cx = CARD_W / 2;

    const number = pixelText(this, 12, 12, `[#${String(index + 1).padStart(2, "0")}]`, { size: 8, color: COLORS.steel });
    const flagFrame = drawPanel(this.add.graphics(), cx - 64, 34, 128, 98, { fill: COLORS.bg, border: COLORS.ink });
    const flag = this.add.image(cx, 83, origin.flag).setScale(10);
    // il cittadino di quella città (cambia aspetto in base all'origine)
    const citizen = this.add.image(CARD_W - 30, 136, characterTexture(origin.id, true)).setOrigin(0.5, 1).setScale(2.5);

    const city = pixelText(this, cx, 152, origin.city, { size: 16, origin: 0.5, fit: CARD_W - 20 });
    const country = bodyText(this, cx, 174, origin.country, { size: 22, color: COLORS.steel, origin: 0.5 });

    const info = this.add.graphics();
    info.fillStyle(COLORS.panelLight, 1);
    info.fillRect(14, 192, CARD_W - 28, 2);
    const pm = bodyText(this, cx, 212, `PM2.5  ${origin.pm25.toFixed(1)}`, { size: 26, color: COLORS.ink, origin: 0.5 });

    // barra di difficoltà a 3 tacche
    for (let i = 0; i < 3; i += 1) {
      drawPanel(info, cx - 52 + i * 36, 230, 32, 18, { fill: i < origin.level ? origin.color : COLORS.paper, border: COLORS.ink, borderWidth: 2 });
    }
    const difficulty = pixelText(this, cx, 262, `${origin.difficulty} · ${origin.tasks}`, { size: 8, color: origin.color, origin: 0.5, fit: CARD_W - 20 });

    const radio = this.add.graphics();
    container.add([shadow, bg, frame, number, flagFrame, flag, citizen, city, country, info, pm, difficulty, radio]);

    const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => {
      if (this.selectedIndex !== index) {
        this.selectedIndex = index;
        this.updateSelection();
      }
    });
    zone.on("pointerdown", () => this.confirmSelection());

    this.cards.push({ container, frame, radio, flag, citizen, baseY: y, origin });
  }

  createSideArrow(x, direction, step) {
    const g = this.add.graphics();
    pixelArrow(g, x + (direction === "left" ? -14 : 14), 286, direction, COLORS.ink, 7);
    this.tweens.add({ targets: g, x: step * 6, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const zone = this.add.zone(x, 286, 70, 90).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.changeSelection(step));
  }

  changeSelection(direction) {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.cards.length);
    this.updateSelection();
  }

  updateSelection(instant = false) {
    this.cards.forEach((card, index) => {
      const selected = index === this.selectedIndex;
      card.frame.setVisible(selected);
      card.radio.clear();
      pixelDisc(card.radio, CARD_W / 2, 282, 10, COLORS.ink, 1, 2);
      pixelDisc(card.radio, CARD_W / 2, 282, 7, COLORS.paper, 1, 2);
      if (selected) pixelDisc(card.radio, CARD_W / 2, 282, 4, COLORS.red, 1, 2);

      this.tweens.killTweensOf(card.container);
      const target = { y: card.baseY - (selected ? 10 : 0), alpha: selected ? 1 : 0.72 };
      if (instant) {
        card.container.setPosition(card.container.x, target.y).setAlpha(target.alpha);
      } else {
        this.tweens.add({ targets: card.container, ...target, duration: 260, ease: "Back.easeOut" });
      }

      this.tweens.killTweensOf([card.flag, card.citizen]);
      card.flag.setScale(10);
      card.citizen.y = 136;
      if (selected) {
        this.tweens.add({ targets: card.citizen, y: 128, duration: 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: card.flag, scaleY: 10.6, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    });

    const card = this.cards[this.selectedIndex];
    const targetX = card.container.x + CARD_W / 2;
    this.tweens.killTweensOf(this.pointer);
    if (instant) {
      this.pointer.setPosition(targetX, 124);
    } else {
      this.tweens.add({ targets: this.pointer, x: targetX, duration: 240, ease: "Cubic.easeOut" });
    }
    this.tweens.add({ targets: this.pointer, y: { from: 122, to: 128 }, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  confirmSelection() {
    if (this.transitioning || this.confirming) return;
    this.confirming = true;
    const card = this.cards[this.selectedIndex];
    startRun(this.registry, card.origin.id);
    this.cameras.main.flash(160, 241, 240, 237);
    this.tweens.add({ targets: card.container, scale: 1.04, duration: 120, yoyo: true, ease: "Sine.easeOut" });
    this.time.delayedCall(240, () => {
      this.confirming = false;
      goTo(this, this.next);
    });
  }
}
