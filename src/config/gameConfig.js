import Phaser from "../phaser.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene.js";
import { IntroScene } from "../scenes/IntroScene.js";
import { EventScene } from "../scenes/EventScene.js";
import { TravelScene } from "../scenes/TravelScene.js";
import { EndScene } from "../scenes/EndScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { CreditsScene } from "../scenes/CreditsScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: "#1c2839",
  // stile pixel-art
  pixelArt: true,
  roundPixels: true,
  // si adatta a qualsiasi schermo mantenendo il 16:9; il resto è la trama ai lati
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 3
  },
  scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, IntroScene, TravelScene, EventScene, EndScene, TutorialScene, CreditsScene]
};