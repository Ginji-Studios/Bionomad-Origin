import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class CityScene extends Phaser.Scene {
  constructor() {
    super("CityScene");
  }

  create() {
    const { width, height } = this.scale;
    addSceneChrome(this, "Citta di Bionomad", "Un primo sguardo al luogo in cui vive il protagonista.", 0x16324f);

    this.add.rectangle(width / 2, height - 88, width, 155, 0x30343b);
    this.add.rectangle(width / 2, height - 164, width, 5, 0xf4d35e);

    const buildings = [
      [80, 260, 120, 250, 0x3d5a80],
      [250, 220, 150, 290, 0x526d82],
      [450, 280, 180, 230, 0x415a77],
      [690, 190, 160, 320, 0x4f6d7a],
      [875, 245, 120, 265, 0x355070]
    ];

    for (const [x, y, buildingWidth, buildingHeight, color] of buildings) {
      this.add.rectangle(x, y, buildingWidth, buildingHeight, color);
      for (let windowY = y - buildingHeight / 2 + 32; windowY < y + buildingHeight / 2 - 20; windowY += 42) {
        this.add.rectangle(x - 30, windowY, 16, 20, 0xf4d35e);
        this.add.rectangle(x + 30, windowY, 16, 20, 0xf4d35e);
      }
    }

    addLabel(this, "CENTRO", 415, 126, "#f4d35e", "20px");
    addLabel(this, "Piazza centrale", 30, height - 54, "#f1faee");
  }
}