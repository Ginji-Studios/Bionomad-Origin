import Phaser from "../phaser.js";

export class Player extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, 34, 48, 0x74c69d);
    scene.add.existing(this);
    this.speed = 180;
  }

  update(input, delta) {
    const seconds = delta / 1000;
    this.x += input.movement.x * this.speed * seconds;
    this.y += input.movement.y * this.speed * seconds;
    this.x = Phaser.Math.Clamp(this.x, 20, this.scene.scale.width - 20);
    this.y = Phaser.Math.Clamp(this.y, 100, this.scene.scale.height - 110);
  }
}