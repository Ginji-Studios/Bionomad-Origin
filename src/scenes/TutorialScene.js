import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create() {
    const { width, height } = this.scale;
    addSceneChrome(this, "TUTORIAL", "Impara a leggere il mondo prima di cambiarlo.", 0x142536);

    this.add.grid(width / 2, height / 2 + 12, width - 58, height - 108, 16, 16, 0x142536, 1, 0x294052, 0.35);
    this.add.rectangle(width / 2, 94, width - 58, 2, 0x829ab1);
    addLabel(this, "WELCOME TO BIONOMAD", width / 2, 115, "#f1f5f9", "20px").setOrigin(0.5);

    this.createSidePanel(70, "MUOVITI", "A / D", "SPOSTATI", 0xe7a33e, false);
    this.createSidePanel(width - 70, "OSSERVA", "E", "INTERAGISCI", 0xe7a33e, true);

    addLabel(this, "GESTI DI CURA", width / 2, 142, "#5fe39a", "14px").setOrigin(0.5);
    addLabel(this, "GESTI DI ROTTURA", width / 2, 292, "#f06b6b", "14px").setOrigin(0.5);

    const goodCards = [
      ["ASCOLTA", "parla con gli NPC", "#5fe39a", 0],
      ["OSSERVA", "cerca i segnali", "#5fe39a", 1],
      ["COLTIVA", "cura la relazione", "#5fe39a", 2]
    ];
    const badCards = [
      ["IGNORA", "taglia il dialogo", "#f06b6b", 3],
      ["FORZA", "rompi l'equilibrio", "#f06b6b", 4],
      ["SCORDA", "perdi il contatto", "#f06b6b", 5]
    ];

    goodCards.forEach((card, index) => this.createTutorialCard(card, 200 + index * 190, 190));
    badCards.forEach((card, index) => this.createTutorialCard(card, 200 + index * 190, 340));

    addLabel(this, "Input attuale: tastiera", width / 2 - 240, height - 48, "#a8c0d4", "14px");
    addLabel(this, "Input futuro: pianta + ELEGoo UNO R3", width / 2 + 70, height - 48, "#a8c0d4", "14px");
  }

  createTutorialCard([title, description, color, icon], x, y) {
    const tint = color === "#5fe39a" ? 0x214f48 : 0x572d3b;
    const card = this.add.rectangle(x, y, 168, 112, 0x1d3444).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
    this.add.rectangle(x, y - 51, 168, 4, tint);
    this.createIcon(x, y - 10, icon, color);
    addLabel(this, title, x, y + 31, color, "14px").setOrigin(0.5);
    addLabel(this, description, x, y + 49, "#9fb5c7", "12px").setOrigin(0.5);
    card.setInteractive({ useHandCursor: true });
    card.on("pointerover", () => card.setStrokeStyle(3, 0xf4d35e));
    card.on("pointerout", () => card.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color));
  }

  createSidePanel(x, title, key, description, color, right) {
    this.add.rectangle(x, 270, 78, 260, 0x22394a).setStrokeStyle(2, 0x536d82);
    addLabel(this, title, x, 178, "#7d92a5", "11px").setOrigin(0.5);
    addLabel(this, key, x, 263, color, "18px").setOrigin(0.5);
    addLabel(this, description, x, 295, "#c2d2df", "11px").setOrigin(0.5);
    this.add.triangle(x + (right ? -30 : 30), 245, 0, 0, 0, 28, right ? 28 : 0, 14, color);
    this.add.triangle(x + (right ? -30 : 30), 340, 0, 0, 0, 28, right ? 28 : 0, 14, color);
  }

  createIcon(x, y, icon, color) {
    const iconColor = Phaser.Display.Color.HexStringToColor(color).color;

    if (icon === 0) {
      this.add.circle(x, y - 12, 12, iconColor);
      this.add.rectangle(x, y + 8, 24, 8, iconColor);
    } else if (icon === 1) {
      this.add.circle(x, y - 8, 13, iconColor, 0.25).setStrokeStyle(2, iconColor);
      this.add.circle(x, y - 8, 4, iconColor);
      this.add.line(x, y + 4, -15, 0, 15, 0, iconColor, 1).setLineWidth(2);
    } else if (icon === 2) {
      this.add.rectangle(x, y + 7, 28, 12, iconColor);
      this.add.line(x, y + 4, 0, 5, 0, -22, iconColor, 1).setLineWidth(3);
      this.add.ellipse(x - 9, y - 12, 17, 9, iconColor);
      this.add.ellipse(x + 9, y - 4, 17, 9, iconColor);
    } else {
      this.add.line(x - 12, y - 12, 0, 0, 24, 24, iconColor, 1).setLineWidth(3);
      this.add.line(x + 12, y - 12, 0, 0, -24, 24, iconColor, 1).setLineWidth(3);
    }
  }
}