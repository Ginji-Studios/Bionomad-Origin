import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";
import { setupSceneNavigation } from "../systems/SceneNavigation.js";

export class HouseScene extends Phaser.Scene {
  constructor() {
    super("HouseScene");
  }

  create(data) {
    const { width, height } = this.scale;
    addSceneChrome(this, "Casa del protagonista", "Un rifugio semplice, pieno di tracce della sua storia.", 0x3a2e39);

    this.add.rectangle(width / 2, 330, 820, 280, 0xb08968);
    this.add.rectangle(width / 2, 170, 820, 45, 0x6d597a);
    this.add.rectangle(190, 365, 180, 70, 0x6f4e37);
    this.add.rectangle(190, 320, 145, 35, 0x8c6a4d);
    this.add.rectangle(750, 360, 140, 180, 0x386641);
    this.add.rectangle(750, 250, 110, 75, 0x52b788);
    this.add.rectangle(750, 220, 80, 75, 0x74c69d);
    this.add.rectangle(480, 405, 190, 35, 0x9c6644);
    this.add.rectangle(480, 450, 14, 80, 0x7f5539);
    this.add.rectangle(650, 450, 14, 80, 0x7f5539);

    addLabel(this, "Il soggiorno", 52, 488, "#fff3b0");
    addLabel(this, "La pianta di casa", 675, 488, "#fff3b0");
    this.interactionText = addLabel(this, "Avvicinati alla pianta e premi SPAZIO", 560, 112, "#b7e4c7", "15px");
    this.navigation = setupSceneNavigation(this, data, {
      spawnX: 140,
      right: { scene: "CityScene", label: "citta" },
      onInteract: (player) => {
        const nearPlant = Phaser.Math.Distance.Between(player.x, player.y, 750, 360) < 150;
        this.interactionText.setText(nearPlant ? "La pianta risponde al tuo tocco." : "Non c'e nulla da osservare qui.");
      }
    });
  }

  update(time, delta) {
    this.navigation?.update(delta);
  }
}