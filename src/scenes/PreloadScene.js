import Phaser from "../phaser.js";
import { registerPixelTextures } from "../ui/pixelSprites.js";

// I font pixel vengono caricati da JS provando più percorsi, così funzionano sia con
// "npm run dev" (Vite serve /public alla radice) sia con un server statico sulla cartella del progetto.
const FONTS = [
  { family: "Press Start 2P", file: "PressStart2P.woff2" },
  { family: "VT323", file: "VT323.woff2" }
];
const FONT_DIRS = ["fonts/", "public/fonts/", "/fonts/", "/public/fonts/"];

async function loadFont({ family, file }) {
  for (const dir of FONT_DIRS) {
    try {
      const face = new FontFace(family, `url("${dir}${file}")`);
      await face.load();
      document.fonts.add(face);
      return true;
    } catch (error) {
      // prova il percorso successivo
    }
  }
  console.warn(`Font "${family}" non trovato: controlla la cartella public/fonts`);
  return false;
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  async create() {
    // I testi Phaser vengono disegnati su canvas: i font devono essere pronti prima.
    await Promise.all(FONTS.map(loadFont));
    registerPixelTextures(this);
    this.scene.start("MenuScene");
  }
}
