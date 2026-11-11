import Phaser from "../phaser.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { CityScene } from "../scenes/CityScene.js";
import { HouseScene } from "../scenes/HouseScene.js";
import { OfficeScene } from "../scenes/OfficeScene.js";
import { CharacterScene } from "../scenes/CharacterScene.js";
import { CreditsScene } from "../scenes/CreditsScene.js";
import { TutorialScene } from "../scenes/TutorialScene.js";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: "#12261f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CityScene,
    HouseScene,
    OfficeScene,
    CharacterScene,
    CreditsScene,
    TutorialScene,
    CharacterSelectScene
  ]
};