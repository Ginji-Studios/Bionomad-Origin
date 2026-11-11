import Phaser from "./phaser.js";
import { gameConfig } from "./config/gameConfig.js";
import { setupTouchControls } from "./input/TouchControls.js";

new Phaser.Game({
  ...gameConfig,
  parent: "game"
});

setupTouchControls();
