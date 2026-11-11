import Phaser from "../phaser.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  create() {
    this.scene.start("MenuScene");
  }
}