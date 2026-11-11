import Phaser from "../phaser.js";
import { ORIGINS } from "../config/origins.js";
import { startRun } from "../systems/RunManager.js";
import { characterTexture, getGender, setGender } from "../ui/pixelSprites.js";
import { animateImage } from "../entities/Player.js";
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

    // le carte entrano una alla volta dal basso
    this.cards.forEach((card, i) => {
      const y = card.container.y;
      card.container.y = y + 40;
      const alpha = card.container.alpha;
      card.container.alpha = 0;
      this.tweens.add({ targets: card.container, y, alpha, duration: 380, delay: 120 + i * 110, ease: "Back.easeOut" });
    });

    this.step = "origin";
    this.gender = getGender();
    const keys = this.input.keyboard;
    const side = (dir) => (this.step === "gender" ? this.pickGender(dir > 0 ? "f" : "m") : this.changeSelection(dir));
    ["LEFT", "A"].forEach((key) => keys.on(`keydown-${key}`, () => side(-1)));
    ["RIGHT", "D"].forEach((key) => keys.on(`keydown-${key}`, () => side(1)));
    ["ENTER", "SPACE"].forEach((key) => keys.on(`keydown-${key}`, () => (this.step === "gender" ? this.confirmGender() : this.confirmSelection())));
    keys.on("keydown-ESC", () => (this.step === "gender" ? this.closeGender() : goTo(this, "MenuScene")));
  }

  // secondo passo: uomo o donna
  openGender() {
    const { width, height } = this.scale;
    const origin = this.cards[this.selectedIndex].origin;
    this.step = "gender";
    const box = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, COLORS.inkDeep, 0.6).setInteractive();
    const w = 520;
    const h = 300;
    const x = width / 2 - w / 2;
    const y = 120;
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 28);
    box.add([dim, g, pixelText(this, x + 12, y + 10, `${origin.city} · CITTADINO`, { size: 8, color: COLORS.paper })]);

    this.genderSlots = [["m", "UOMO", -120], ["f", "DONNA", 120]].map(([id, label, dx]) => {
      const cx = width / 2 + dx;
      const frame = this.add.graphics();
      const floor = this.add.graphics();
      floor.fillStyle(COLORS.panelLight, 1);
      floor.fillRect(cx - 70, y + 220, 140, 4);
      const base = () => characterTexture(origin.id, false, id);
      const pack = this.add.image(cx - 44, y + 192, "pack").setOrigin(0.5, 1).setScale(6);
      const sprite = this.add.image(cx, y + 220, base()).setOrigin(0.5, 1).setScale(7);
      animateImage(this, sprite, base, () => (this.gender === id ? "walk" : "idle"));
      const text = pixelText(this, cx, y + 246, label, { size: 16, origin: 0.5 });
      const zone = this.add.zone(cx, y + 150, 200, 220).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => this.pickGender(id));
      zone.on("pointerdown", () => {
        this.pickGender(id);
        this.confirmGender();
      });
      box.add([frame, floor, pack, sprite, text, zone]);
      return { id, cx, frame, sprite, pack, text, top: y + 54 };
    });
    box.add(bodyText(this, width / 2, y + h - 18, "A / D scegli · INVIO conferma · ESC indietro", { size: 20, color: COLORS.steel, origin: 0.5 }));
    box.setAlpha(0);
    box.y = 20;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 240, ease: "Cubic.easeOut" });
    this.genderBox = box;
    this.pickGender(this.gender);
  }

  pickGender(id) {
    this.gender = id;
    this.genderSlots.forEach((slot) => {
      const on = slot.id === id;
      slot.frame.clear();
      drawPanel(slot.frame, slot.cx - 90, slot.top, 180, 210, { fill: on ? COLORS.bg : COLORS.paper, border: on ? COLORS.red : COLORS.panelLight, borderWidth: on ? 4 : 2 });
      slot.text.setColor(on ? "#b4553f" : "#1c2839");
      this.tweens.killTweensOf([slot.sprite, slot.pack]);
      slot.sprite.setAlpha(on ? 1 : 0.6).setScale(7);
      slot.pack.setAlpha(on ? 1 : 0.6);
      if (on) {
        slot.sprite.setScale(6.2, 7.8);
        this.tweens.add({ targets: slot.sprite, scaleX: 7, scaleY: 7, duration: 260, ease: "Back.easeOut" });
      }
    });
  }

  closeGender() {
    this.step = "origin";
    const box = this.genderBox;
    this.tweens.add({ targets: box, alpha: 0, duration: 160, onComplete: () => box.destroy() });
  }

  confirmGender() {
    if (this.transitioning || this.confirming) return;
    this.confirming = true;
    setGender(this.gender);
    this.registry.set("gender", this.gender);
    startRun(this.registry, this.cards[this.selectedIndex].origin.id);
    const slot = this.genderSlots.find((s) => s.id === this.gender);
    this.cameras.main.flash(160, 241, 240, 237);
    this.tweens.add({ targets: [slot.sprite, slot.pack], y: "-=24", duration: 160, yoyo: true, ease: "Quad.easeOut" });
    this.time.delayedCall(420, () => {
      this.confirming = false;
      goTo(this, this.next);
    });
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

    // il cittadino della carta scelta cammina sul posto, gli altri respirano
    animateImage(this, citizen, () => characterTexture(origin.id, true), () => (this.selectedIndex === index ? "walk" : "idle"));
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
        this.tweens.add({ targets: card.citizen, y: 124, duration: 180, yoyo: true, ease: "Quad.easeOut" });
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
    if (this.step !== "origin") return;
    const card = this.cards[this.selectedIndex];
    this.tweens.add({ targets: card.container, scale: 1.04, duration: 120, yoyo: true, ease: "Sine.easeOut" });
    this.openGender();
  }
}
