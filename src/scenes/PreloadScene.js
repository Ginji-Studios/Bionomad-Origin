import Phaser from "../phaser.js";
import { loadLogos } from "../ui/logo.js";
import { registerPeople } from "../art/people.js";
import { FONT, HEX, txt } from "../ui/hud.js";

// il font Roboto Mono arriva da Google Fonts (index.html); se il tablet è offline
// si usa il monospace di sistema dopo al massimo 3 secondi
async function loadFont() {
  try {
    await Promise.race([document.fonts.load('400 24px "Roboto Mono"'), new Promise((r) => setTimeout(r, 3000))]);
  } catch (error) {
    console.warn("Font non caricato, uso il monospace di sistema", error);
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  async create() {
    const label = txt(this, 640, 400, "CARICAMENTO…", { size: 24, origin: 0.5, color: HEX.c3 });
    await loadFont();
    label.setFontFamily(FONT);
    // lascia disegnare la scritta prima dei calcoli pesanti
    await new Promise((r) => setTimeout(r, 30));
    registerPeople(this);
    await loadLogos(this);
    this.scene.start("MenuScene");
  }
}
