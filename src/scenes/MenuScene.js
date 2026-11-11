import Phaser from "../phaser.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { animateImage } from "../entities/Player.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { TITLE_WORD } from "../ui/pixelSprites.js";
import { o2Label, bodyText, COLORS, showToast, drawPanel, dropShadow, fadeIn, goTo, hex, paperGrid, pixelDisc, pixelText } from "../ui/theme.js";

// menu principale in stile "schermata di avvio"
const MENU_ITEMS = [
  { label: "GIOCA", hint: "Indossa BIONOMAD+ e sopravvivi alla giornata.", target: "CharacterSelectScene", cursor: "pot_flower", scale: 2 },
  { label: "CREDITI", hint: "Scopri BIODOM e i suoi dispositivi.", target: "CreditsScene", cursor: "pot_plant", scale: 2 },
  { label: "COLLEGA PIANTA", hint: "Collega l'Elegoo via USB (Chrome o Edge).", action: "plant", cursor: "active_pack", scale: 2.4 }
];

const PANEL = { x: 70, y: 210, w: 380, h: 218 };
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

    // sfondo a quadretti che scorre lentamente
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
    const x0 = PANEL.x;
    const scale = 7;
    const baseY = 54;

    // etichetta "bionomad" con filetto, come una testata
    const brand = pixelText(this, x0 + 2, baseY - 10, "B I O N O M A D", { size: 16, color: COLORS.steel });
    brand.setAlpha(0);
    this.tweens.add({ targets: brand, alpha: 1, duration: 400 });

    // lettere del logotipo
    let x = x0;
    const top = baseY + 18;
    this.titleLetters = [];
    TITLE_WORD.forEach((name, i) => {
      const tex = this.textures.get(`title_${name}`).getSourceImage();
      const shadow = this.add.image(x + scale, top + scale, `title_${name}_sh`).setOrigin(0, 0).setScale(scale);
      const letter = this.add.image(x, top, `title_${name}`).setOrigin(0, 0).setScale(scale);
      [shadow, letter].forEach((img) => {
        img.y -= 60;
        img.setAlpha(0);
        this.tweens.add({ targets: img, y: img.y + 60, alpha: 1, duration: 520, delay: 200 + i * 90, ease: "Bounce.easeOut" });
      });
      this.titleLetters.push({ letter, shadow, baseY: top, phase: i * 0.7 });
      x += (tex.width + (name === "two" ? 1 : 2)) * scale;
    });

    this.titleWaveStart = this.time.now + 200 + TITLE_WORD.length * 90 + 600;
  }

  update(time) {
    // onda leggera sulle lettere del titolo (un "respiro" di 1 pixel)
    if (!this.titleLetters || time < this.titleWaveStart) return;
    this.titleLetters.forEach(({ letter, shadow, baseY, phase }) => {
      const offset = Math.round(Math.sin(time * 0.003 + phase) * 1.5) * 2;
      letter.y = baseY + offset;
      shadow.y = baseY + 7 + offset / 2;
    });
  }

  createMenuPanel() {
    const { x, y, w, h } = PANEL;
    const panel = this.add.container(0, 0);
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });

    this.highlight = this.add.graphics();
    drawPanel(this.highlight, 0, 0, w - 28, ROW_H - 8, { fill: COLORS.ink, border: COLORS.ink });
    this.highlight.setPosition(x + 14, y + 18);

    this.leaf = this.add.image(x + 32, y + 18, "pot_plant").setScale(2);

    panel.add([g, this.highlight, this.leaf]);

    MENU_ITEMS.forEach((item, index) => {
      const rowY = y + 18 + index * ROW_H;
      const text = item.action === "plant" && PlantSensors.state.connected ? "PIANTA OK" : item.label;
      const label = pixelText(this, x + 58, rowY + 10, text, { size: 16, color: COLORS.ink });
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
    g.fillRect(x + 14, y + h - 62, w - 28, 2);
    // il suggerimento va a capo dentro al riquadro
    this.hint = bodyText(this, x + 16, y + h - 54, "", { size: 22, color: COLORS.steel, wrap: w - 32, lineSpacing: -4 });
    panel.add(this.hint);

    panel.setAlpha(0).x = -30;
    this.tweens.add({ targets: panel, x: 0, alpha: 1, duration: 500, delay: 200, ease: "Cubic.easeOut" });
  }

  createStage(width, height) {
    // sole velato, skyline e il cittadino con lo zaino
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
    const heroKey = () => characterTexture(this.registry.get("origin") ?? "milano", true);
    const body = this.add.image(0, 0, heroKey()).setOrigin(0.5, 1).setScale(6);
    hero.add([pack, body]);
    this.hero = hero;
    // passeggia avanti e indietro, ogni tanto si ferma e saluta
    let mode = "idle";
    animateImage(this, body, heroKey, () => mode);
    const stroll = () => {
      const targetX = Phaser.Math.Between(600, 840);
      const dir = targetX >= hero.x ? 1 : -1;
      hero.scaleX = dir;
      mode = "walk";
      this.tweens.add({
        targets: hero,
        x: targetX,
        duration: Math.abs(targetX - hero.x) * 14 + 200,
        onUpdate: () => {
          body.y = -Math.round(Math.abs(Math.sin(this.time.now * 0.012)) * 4);
          pack.y = -36 - Math.round(Math.abs(Math.sin(this.time.now * 0.012 - 0.6)) * 5);
        },
        onComplete: () => {
          body.y = 0;
          pack.y = -36;
          mode = Math.random() < 0.4 ? "cheer" : "idle";
          if (mode === "cheer") this.tweens.add({ targets: hero, y: hero.y - 18, duration: 180, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
          this.time.delayedCall(Phaser.Math.Between(1400, 2600), () => {
            mode = "idle";
            this.time.delayedCall(500, stroll);
          });
        }
      });
    };
    this.time.delayedCall(1200, stroll);

    // bollicine di ossigeno che escono dalle piante dello zaino
    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const bubble = this.add.graphics();
        const size = Phaser.Math.Between(3, 6) * 2;
        pixelDisc(bubble, 0, 0, size, COLORS.ink, 1, 2);
        pixelDisc(bubble, 0, 0, size - 2, COLORS.paper, 1, 2);
        bubble.setPosition(hero.x - 45 * hero.scaleX + Phaser.Math.Between(-12, 12), height - 150);
        this.tweens.add({ targets: bubble, y: bubble.y - Phaser.Math.Between(120, 200), alpha: 0, duration: 2600, ease: "Sine.easeOut", onComplete: () => bubble.destroy() });
        this.tweens.add({ targets: bubble, x: bubble.x + Phaser.Math.Between(-30, 30), duration: 1300, yoyo: true, ease: "Sine.easeInOut" });
      }
    });

    // etichetta "O2+" fluttuante
    const tag = this.add.container(800, 170);
    const tagBg = drawPanel(this.add.graphics(), -34, -16, 68, 32, { fill: COLORS.paper, border: COLORS.ink });
    tag.add([tagBg, o2Label(this, 0, -1, { px: 22, color: COLORS.ink, suffix: "+" })]);
    this.tweens.add({ targets: tag, y: 156, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    pixelText(this, 18, height - 31, "W/S  SCEGLI    INVIO  CONFERMA", { size: 8, color: COLORS.steelLight });
    pixelText(this, width - 18, height - 31, "© BIODOM · BIOSICUREZZA ATMOSFERICA", { size: 8, color: COLORS.paper, origin: [1, 0] });
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
    // ogni voce ha la sua piantina-cursore, che "spunta" quando cambia
    const item = MENU_ITEMS[index];
    if (this.leaf.texture.key !== item.cursor || instant) {
      this.leaf.setTexture(item.cursor);
      this.leaf.setScale(instant ? item.scale : 0.4);
      this.tweens.add({ targets: this.leaf, scale: item.scale, duration: 260, ease: "Back.easeOut" });
    }
    // il suggerimento deve stare nel riquadro
    this.hint.setFontSize(22).setText(MENU_ITEMS[index].hint);
    let size = 22;
    while (this.hint.height > 44 && size > 14) {
      size -= 2;
      this.hint.setFontSize(size);
    }
  }

  async connectPlant() {
    const row = this.rows[MENU_ITEMS.findIndex((item) => item.action === "plant")];
    if (PlantSensors.state.connected) {
      showToast(this, "La pianta è già collegata.");
      return;
    }
    try {
      await PlantSensors.connect();
      row.label.setText("PIANTA OK");
      showToast(this, "Pianta collegata! I sensori sono attivi.", { color: 0x5c7a6b });
      PlantSensors.send("G");
    } catch (error) {
      showToast(this, PlantSensors.supported ? "Collegamento annullato o porta occupata." : "Serve Chrome o Edge su localhost.", { color: COLORS.red });
    }
  }

  confirm() {
    const item = MENU_ITEMS[this.selectedIndex];
    if (item.action === "plant") {
      this.connectPlant();
      return;
    }
    this.tweens.add({ targets: this.rows[this.selectedIndex].label, scale: 1.08, duration: 90, yoyo: true });
    goTo(this, item.target);
  }
}
