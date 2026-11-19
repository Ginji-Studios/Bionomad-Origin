import Phaser from "../phaser.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { SetupScene } from "../scenes/SetupScene.js";
import { IntroScene } from "../scenes/IntroScene.js";
import { EventScene } from "../scenes/EventScene.js";
import { TravelScene } from "../scenes/TravelScene.js";
import { EndScene } from "../scenes/EndScene.js";
import { OutroScene } from "../scenes/OutroScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { CreditsScene } from "../scenes/CreditsScene.js";
import { PauseScene } from "../scenes/PauseScene.js";

// 1280x800 = 16:10 come il Redmi Pad 2 (2560x1600): ogni pixel diventa 2x2
export const gameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 800,
  backgroundColor: "#1C2839",
  // stile illustrato vettoriale: niente pixel art, bordi smussati
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 4
  },
  scene: [BootScene, PreloadScene, MenuScene, SetupScene, IntroScene, TravelScene, EventScene, EndScene, OutroScene, TutorialScene, CreditsScene, PauseScene]
};
