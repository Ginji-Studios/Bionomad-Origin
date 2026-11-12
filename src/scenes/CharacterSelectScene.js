import Phaser from "../phaser.js";
import { ORIGINS } from "../config/origins.js";
import { startRun } from "../systems/RunManager.js";
import { characterTexture, getGender, setGender } from "../ui/pixelSprites.js";
import { animateImage } from "../entities/Player.js";
import { addTopBar, bandGradient, bodyText, brandMarks, COLORS, ditherRect, dropShadow, drawPanel, goTo, paperGrid, pixelDisc, pixelText, textChip } from "../ui/theme.js";

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
    addTopBar(this, "PERSONAGGIO");

    pixelText(this, width / 2, 70, "SCEGLI LA TUA ORIGINE", { size: 24, origin: 0.5, shadow: true, fit: 760 });
    pixelText(this, width / 2, 106, "SELEZIONANE UNA SOLA", { size: 8, color: COLORS.steel, origin: 0.5 });

    const startX = width / 2 - (ORIGINS.length * CARD_W + (ORIGINS.length - 1) * GAP) / 2;
    ORIGINS.forEach((origin, index) => this.createCard(origin, index, startX + index * (CARD_W + GAP), 140));

    // segni del brand attorno alla fila di carte
    brandMarks(this, startX, 134, ORIGINS.length * CARD_W + (ORIGINS.length - 1) * GAP, CARD_H + 6, { color: COLORS.steel, gap: 18 });

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
    const w = 540;
    const h = 330;
    const x = width / 2 - w / 2;
    const y = 104;
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 28);
    box.add([dim, brandMarks(this, x, y, w, h, { color: COLORS.paper, alpha: 0.8 }), g, pixelText(this, x + 12, y + 10, `${origin.city} · CITTADINO`, { size: 8, color: COLORS.paper })]);

    // due "foto" come le carte delle città: sfondo urbano a retino, cittadino con lo zaino,
    // riquadro di messa a fuoco su chi è scelto
    const PW = 200;
    const PH = 190;
    const top = y + 44;
    this.genderSlots = [["m", "UOMO", "A", -116], ["f", "DONNA", "B", 116]].map(([id, label, letter, dx], idx) => {
      const cx = width / 2 + dx;
      const px = cx - PW / 2;
      const photo = this.add.graphics();
      bandGradient(photo, px, top, PW, PH, [0x9fb4c2, 0x86a0b2, 0x6f8ea2, 0x5e7f94]);
      for (let i = 0, bx = px; bx < px + PW; i += 1) {
        const bw = 14 + ((idx * 31 + i * 17) % 20);
        const bh = 40 + ((idx * 13 + i * 29) % 70);
        ditherRect(photo, bx, top + PH - 26 - bh, Math.min(bw, px + PW - bx), bh, 0x3f5a6c, 10, 2);
        bx += bw + 2;
      }
      photo.fillStyle(0x2c3e52, 1);
      photo.fillRect(px, top + PH - 26, PW, 26);
      ditherRect(photo, px, top + PH - 32, PW, 6, 0x2c3e52, 8, 2);
      ditherRect(photo, px, top, PW, PH, COLORS.paper, 2, 2, 0.5);
      const frame = this.add.graphics();
      const base = () => characterTexture(origin.id, true, id);
      const feet = top + PH - 12;
      const pack = this.add.image(cx - 38, feet - 30, "pack").setOrigin(0.5, 1).setScale(5);
      const sprite = this.add.image(cx, feet, base()).setOrigin(0.5, 1).setScale(6);
      animateImage(this, sprite, base, () => (this.gender === id ? "walk" : "idle"));
      // inquadratura su testa e busto
      const focus = this.add.graphics();
      focus.lineStyle(2, COLORS.paper, 1);
      focus.strokeRect(cx - 52, feet - 126 - 6, 104, 108);
      const number = pixelText(this, px + 8, top + PH - 18, `[${letter}]`, { size: 8, color: COLORS.paper });
      // targhetta col nome sotto la foto
      const chip = this.add.graphics();
      const text = pixelText(this, cx, top + PH + 22, label, { size: 16, origin: 0.5 });
      const zone = this.add.zone(cx, top + PH / 2 + 10, PW, PH + 40).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => this.pickGender(id));
      zone.on("pointerdown", () => {
        this.pickGender(id);
        this.confirmGender();
      });
      box.add([photo, pack, sprite, focus, number, frame, chip, text, zone]);
      return { id, cx, px, frame, chip, sprite, pack, focus, text, top };
    });
    box.add(bodyText(this, width / 2, y + h - 18, "A / D scegli · INVIO conferma · ESC indietro", { size: 20, color: COLORS.steel, origin: 0.5 }));
    box.setAlpha(0);
    box.y = 20;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 240, ease: "Cubic.easeOut" });
    this.genderBox = box;
    this.pickGender(this.gender);
  }

  pickGender(id) {
    const changed = this.gender !== id;
    this.gender = id;
    this.genderSlots.forEach((slot) => {
      const on = slot.id === id;
      slot.frame.clear();
      slot.frame.lineStyle(on ? 4 : 2, on ? COLORS.red : COLORS.ink, 1);
      slot.frame.strokeRect(slot.px - (on ? 4 : 1), slot.top - (on ? 4 : 1), 200 + (on ? 8 : 2), 190 + (on ? 8 : 2));
      slot.chip.clear();
      drawPanel(slot.chip, slot.cx - 56, slot.top + 190 + 8, 112, 28, { fill: on ? COLORS.ink : COLORS.paper, border: COLORS.ink, borderWidth: 2 });
      if (on) {
        slot.chip.fillStyle(COLORS.red, 1);
        slot.chip.fillRect(slot.cx - 54, slot.top + 200, 6, 24);
      }
      slot.text.setColor(on ? "#f1f0ed" : "#1c2839");
      this.tweens.killTweensOf([slot.sprite, slot.pack, slot.focus]);
      slot.sprite.setTint(on ? 0xffffff : 0xb8c6d0).setScale(6);
      slot.pack.setTint(on ? 0xffffff : 0xb8c6d0);
      slot.focus.setVisible(on).setAlpha(1);
      if (on && changed) {
        slot.focus.setAlpha(0);
        this.tweens.add({ targets: slot.focus, alpha: { from: 0, to: 1 }, duration: 90, repeat: 2, yoyo: true, onComplete: () => slot.focus.setAlpha(1) });
        slot.sprite.setScale(5.4, 6.6);
        this.tweens.add({ targets: slot.sprite, scaleX: 6, scaleY: 6, duration: 260, ease: "Back.easeOut" });
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

    // "foto" in blu acciaio come le immagini del progetto: città a retino, cittadino al centro,
    // riquadro bianco di messa a fuoco sulla mascherina e numero [0n]
    const px = 14;
    const py = 14;
    const pw = CARD_W - 28;
    const ph = 120;
    const photo = this.add.graphics();
    bandGradient(photo, px, py, pw, ph, [0x9fb4c2, 0x86a0b2, 0x6f8ea2, 0x5e7f94]);
    const seed = index * 97 + 13;
    for (let i = 0, bx = px; bx < px + pw; i += 1) {
      const bw = 12 + ((seed * (i + 3)) % 18);
      const bh = 30 + ((seed * (i + 7)) % 50);
      ditherRect(photo, bx, py + ph - 18 - bh, Math.min(bw, px + pw - bx), bh, 0x3f5a6c, 10, 2);
      bx += bw + 2;
    }
    photo.fillStyle(0x2c3e52, 1);
    photo.fillRect(px, py + ph - 18, pw, 18);
    ditherRect(photo, px, py + ph - 24, pw, 6, 0x2c3e52, 8, 2);
    ditherRect(photo, px, py, pw, ph, COLORS.paper, 2, 2, 0.5);
    photo.lineStyle(2, COLORS.ink, 1);
    photo.strokeRect(px, py, pw, ph);
    const citizen = this.add.image(cx, py + ph - 6, characterTexture(origin.id, true)).setOrigin(0.5, 1).setScale(4).setTint(0xdfe7ea);
    const focus = this.add.graphics();
    focus.lineStyle(2, COLORS.paper, 1);
    // inquadra testa e busto, fino a sopra le gambe
    focus.strokeRect(cx - 36, py + ph - 6 - 84 - 6, 72, 72);
    const number = pixelText(this, px + 6, py + ph - 14, `[${String(index + 1).padStart(2, "0")}]`, { size: 8, color: COLORS.paper });
    const flag = this.add.image(px + pw - 8, py + 8, origin.flag).setOrigin(1, 0).setScale(3);
    const flagFrame = this.add.graphics();
    flagFrame.fillStyle(COLORS.paper, 1);
    flagFrame.fillRect(px + pw - 8 - 38, py + 6, 40, 31);

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
    container.add([shadow, bg, frame, photo, citizen, focus, number, flagFrame, flag, city, country, info, pm, difficulty, radio]);

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
    this.cards.push({ container, frame, radio, flag, citizen, focus, baseY: y, origin });
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

      this.tweens.killTweensOf([card.flag, card.citizen, card.focus]);
      card.citizen.y = 128;
      card.citizen.setTint(selected ? 0xffffff : 0xb8c6d0);
      card.focus.setVisible(selected).setAlpha(1).setScale(1);
      if (selected && !instant) {
        // messa a fuoco: il riquadro si stringe e lampeggia due volte
        card.focus.setAlpha(0);
        this.tweens.add({ targets: card.focus, alpha: { from: 0, to: 1 }, duration: 90, repeat: 2, yoyo: true, onComplete: () => card.focus.setAlpha(1) });
        this.tweens.add({ targets: card.citizen, y: 120, duration: 160, yoyo: true, ease: "Quad.easeOut" });
      }
    });
  }

  confirmSelection() {
    if (this.transitioning || this.confirming) return;
    if (this.step !== "origin") return;
    const card = this.cards[this.selectedIndex];
    this.tweens.add({ targets: card.container, scale: 1.04, duration: 120, yoyo: true, ease: "Sine.easeOut" });
    this.openGender();
  }
}
