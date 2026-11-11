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
  // Stile pixel-art: niente sfocature quando il canvas viene scalato
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, IntroScene, TravelScene, EventScene, EndScene, TutorialScene, CreditsScene]
};