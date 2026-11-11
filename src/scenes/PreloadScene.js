import Phaser from "../phaser.js";
import { registerPixelTextures } from "../ui/pixelSprites.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  async create() {
    // I testi Phaser vengono disegnati su canvas: il font deve essere pronto prima.
    try {
      await Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('24px "VT323"')]);
    } catch (error) {
      console.warn("Font pixel non caricati, uso il fallback", error);
    }

    registerPixelTextures(this);
    this.scene.start("MenuScene");
  }
}
