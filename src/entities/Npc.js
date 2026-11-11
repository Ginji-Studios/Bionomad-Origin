import Phaser from "../phaser.js";

export class Npc extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, name) {
    super(scene, x, y, 34, 48, 0xffc857);
    scene.add.existing(this);
    this.name = name;
    this.mood = "calm";
    this.dialogue = scene.add.text(x, y - 55, name, {
      color: "#fff3b0",
      fontFamily: "Arial",
      fontSize: "16px"
    }).setOrigin(0.5);
  }

  setMood(mood) {
    this.mood = mood;
    this.fillColor = mood === "happy" ? 0xffe066 : 0xffc857;
  }
}