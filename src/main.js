import Phaser from "./phaser.js";
import { gameConfig } from "./config/gameConfig.js";

new Phaser.Game({
  ...gameConfig,
  parent: "game"
});