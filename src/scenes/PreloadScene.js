import Phaser from "../phaser.js";
import { makeTexture, registerPixelTextures } from "../ui/pixelSprites.js";
import { registerTeamTextures } from "../ui/teamSprites.js";
import { loadPosters } from "../ui/posters.js";

// i font si caricano da js provando più cartelle (vite o server statico)
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
    // I testi Phaser vengono disegnati su canvas
    await Promise.all(FONTS.map(loadFont));
    registerPixelTextures(this);
    registerTeamTextures(this, makeTexture);
    await loadPosters(this);
    this.scene.start("MenuScene");
  }
}
