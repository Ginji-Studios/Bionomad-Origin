import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }

  create() {
    const { width, height } = this.scale;
    addSceneChrome(this, "Crediti", "Bionomad Origin e un progetto in evoluzione.", 0x0b132b);

    addLabel(this, "BIONOMAD ORIGIN", width / 2 - 190, 165, "#f4d35e", "30px");
    addLabel(this, "Game design", width / 2 - 190, 245, "#8ecae6", "16px");
    addLabel(this, "Ginji Studios", width / 2 - 190, 272, "#f1faee", "24px");
    addLabel(this, "Sviluppo", width / 2 - 190, 335, "#8ecae6", "16px");
    addLabel(this, "Phaser + Elegoo Uno R3", width / 2 - 190, 362, "#f1faee", "24px");
    addLabel(this, "Grazie per aver visitato questo prototipo.", width / 2, height - 110, "#bde0fe", "18px").setOrigin(0.5);
  }
}