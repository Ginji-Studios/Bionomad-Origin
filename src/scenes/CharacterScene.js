import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super("CharacterScene");
  }

  create() {
    const { width, height } = this.scale;
    const selectedName = this.registry.get("selectedCharacter") ?? "Da definire";
    addSceneChrome(this, "Il protagonista", "Una prima scheda per definire identita, desideri e relazioni.", 0x1d3557);

    this.add.circle(250, 285, 88, 0xf2c6a0);
    this.add.rectangle(250, 430, 150, 170, 0x457b9d);
    this.add.circle(215, 270, 9, 0x1d3557);
    this.add.circle(285, 270, 9, 0x1d3557);
    this.add.arc(250, 300, 35, 15, 165, false, 0x1d3557);

    this.add.rectangle(620, 280, 420, 300, 0x274c77, 0.8);
    addLabel(this, "Nome", 450, 205, "#a8dadc", "16px");
    addLabel(this, selectedName, 450, 235, "#f1faee", "28px");
    addLabel(this, "Tratto", 450, 300, "#a8dadc", "16px");
    addLabel(this, "Osservatore del mondo naturale", 450, 330, "#f1faee", "22px");
    addLabel(this, "Obiettivo", 450, 395, "#a8dadc", "16px");
    addLabel(this, "Capire cosa sta cambiando nella citta", 450, 425, "#f1faee", "20px");
    addLabel(this, "La scheda potra diventare un menu di gioco.", 450, height - 78, "#a8dadc", "16px");
  }
}