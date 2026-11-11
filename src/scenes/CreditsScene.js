import Phaser from "../phaser.js";
import { addCornerHints, addTopBar, goTo, bodyText, COLORS, dropShadow, drawPanel, paperGrid, pixelText } from "../ui/theme.js";

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }

  create() {
    const { width, height } = this.scale;
    paperGrid(this);
    addTopBar(this, "CREDITI", "BIODOM+");

    drawPanel(this.add.graphics(), width / 2 - 260, 90, 520, 330, { fill: COLORS.paper, border: COLORS.ink });
    pixelText(this, width / 2, 130, "BIONOMAD ORIGIN", { size: 24, color: COLORS.ink, origin: 0.5, shadow: true });

    pixelText(this, width / 2, 196, "GAME DESIGN", { size: 8, color: COLORS.textDim, origin: 0.5 });
    bodyText(this, width / 2, 222, "Ginji Studios", { size: 32, origin: 0.5 });
    pixelText(this, width / 2, 280, "SVILUPPO", { size: 8, color: COLORS.textDim, origin: 0.5 });
    bodyText(this, width / 2, 306, "Phaser + Elegoo Uno R3", { size: 32, origin: 0.5 });
    pixelText(this, width / 2, 360, "FONT", { size: 8, color: COLORS.textDim, origin: 0.5 });
    bodyText(this, width / 2, 384, "Press Start 2P · VT323 (SIL OFL)", { size: 24, color: COLORS.textDim, origin: 0.5 });

    this.add.image(width / 2 - 200, 412, "pot_flower").setOrigin(0.5, 1).setScale(4);
    this.add.image(width / 2 + 200, 412, "pot_plant").setOrigin(0.5, 1).setScale(4);

    bodyText(this, width / 2, height - 72, "Grazie per aver visitato questo prototipo.", { size: 26, color: COLORS.steel, origin: 0.5 });
    addCornerHints(this, null, "ESC  MENU");
    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }
}
