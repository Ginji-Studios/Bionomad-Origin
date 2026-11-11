import Phaser from "../phaser.js";
import { makeTexture, registerPixelTextures } from "../ui/pixelSprites.js";
import { registerTeamTextures } from "../ui/teamSprites.js";
import { loadPosters } from "../ui/posters.js";
import { loadLogos } from "../ui/logo.js";
import { VT323_WOFF2 } from "../ui/fontData.js";

// il font è incorporato nel codice (fontData.js): nessun percorso da indovinare,
// quindi nessun errore 404 qualunque server si usi
async function loadFont() {
  try {
    const face = new FontFace("VT323", `url("${VT323_WOFF2}")`);
    await face.load();
    document.fonts.add(face);
  } catch (error) {
    console.warn("Font VT323 non caricato, uso il monospace di sistema", error);
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  async create() {
    // I testi Phaser vengono disegnati su canvas
    await loadFont();
    registerPixelTextures(this);
    registerTeamTextures(this, makeTexture);
    await loadPosters(this);
    await loadLogos(this);
    this.scene.start("MenuScene");
  }
}
