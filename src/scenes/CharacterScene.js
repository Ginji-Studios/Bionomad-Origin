import Phaser from "../phaser.js";
import { addCornerHints, addTopBar, bodyText, COLORS, ditherRect, drawPanel, paperGrid, pixelText } from "../ui/theme.js";
import { characterTexture } from "../ui/pixelSprites.js";

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super("CharacterScene");
  }

  create() {
    const { width, height } = this.scale;
    const selectedName = this.registry.get("selectedCharacter") ?? "Da definire";
    paperGrid(this);
    addTopBar(this, "PROTAGONISTA", "BIODOM+");

    const g = this.add.graphics();
    drawPanel(g, 80, 80, 300, 380, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(130, 402, 200, 10);

    const container = this.add.container(230, 404);
    container.add([
      this.add.image(-60, -48, "pack").setOrigin(0.5, 1).setScale(8),
      this.add.image(0, 0, characterTexture(this.registry.get("selectedCharacter"))).setOrigin(0.5, 1).setScale(8)
    ]);
    this.tweens.add({ targets: container, y: 400, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    drawPanel(g, 420, 80, 460, 380, { fill: COLORS.paper, border: COLORS.ink });
    const row = (label, value, y, size = 28) => {
      pixelText(this, 450, y, label, { size: 8, color: COLORS.textDim });
      bodyText(this, 450, y + 16, value, { size, color: COLORS.text, wrap: 400 });
    };
    row("NOME", selectedName.toUpperCase(), 104, 40);
    row("TRATTO", "Osservatore del mondo naturale", 184);
    row("OBIETTIVO", "Capire cosa sta cambiando nella città", 258);
    row("EQUIPAGGIAMENTO", "Zaino BIONOMAD+ con ecosistema vegetale", 352);

    bodyText(this, width / 2, height - 54, "La scheda potrà diventare un menu di gioco.", { size: 22, color: COLORS.textMuted, origin: 0.5 });
    addCornerHints(this, null, "ESC  MENU");
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("MenuScene"));
  }
}
