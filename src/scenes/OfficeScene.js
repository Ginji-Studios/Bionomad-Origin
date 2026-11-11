import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";
import { setupSceneNavigation } from "../systems/SceneNavigation.js";

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super("OfficeScene");
  }

  create(data) {
    const { width, height } = this.scale;
    addSceneChrome(this, "Ufficio", "Il luogo del lavoro, delle routine e delle conversazioni sospese.", 0x293241);

    this.add.rectangle(width / 2, 330, width, 250, 0xc9ada7);
    this.add.rectangle(width / 2, 200, width, 170, 0xf2e9e4);
    this.add.rectangle(170, 360, 260, 48, 0x7f5539);
    this.add.rectangle(790, 360, 260, 48, 0x7f5539);
    this.add.rectangle(170, 430, 18, 100, 0x5e3b2b);
    this.add.rectangle(410, 430, 18, 100, 0x5e3b2b);
    this.add.rectangle(790, 430, 18, 100, 0x5e3b2b);
    this.add.rectangle(1030, 430, 18, 100, 0x5e3b2b);
    this.add.rectangle(170, 300, 110, 60, 0x33415c);
    this.add.rectangle(790, 300, 110, 60, 0x33415c);
    this.add.rectangle(480, 130, 170, 80, 0x577590);
    this.add.rectangle(480, 130, 140, 52, 0x90be6d);

    addLabel(this, "Postazione principale", 72, 488, "#4a2c2a");
    addLabel(this, "Archivio", 760, 488, "#4a2c2a");
    this.interactionText = addLabel(this, "Avvicinati alla postazione e premi SPAZIO", 520, 112, "#4a2c2a", "15px");
    this.navigation = setupSceneNavigation(this, data, {
      spawnX: 820,
      left: { scene: "CityScene", label: "citta" },
      onInteract: (player) => {
        const nearDesk = Phaser.Math.Distance.Between(player.x, player.y, 170, 360) < 150;
        this.interactionText.setText(nearDesk ? "Hai trovato una nota sul lavoro di oggi." : "L'ufficio e silenzioso.");
      }
    });
  }

  update(time, delta) {
    this.navigation?.update(delta);
  }
}