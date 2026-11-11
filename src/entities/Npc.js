import Phaser from "../phaser.js";
import { animateWalker, playAction, SPRITE_SCALE } from "./Player.js";

// Cittadino che cammina in loop da un lato all'altro della scena (opzionalmente con zaino).
export class Npc extends Phaser.GameObjects.Container {
  constructor(scene, x, y, name, { texture = "npc_a", withPack = true, speed = 0, direction = 1 } = {}) {
    super(scene, x, y);
    this.name = name;
    this.mood = "calm";
    this.speed = speed;
    this.direction = direction;
    this.walkPhase = Math.random() * Math.PI * 2;

    this.pack = scene.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(SPRITE_SCALE).setVisible(withPack);
    this.sprite = scene.add.image(0, 0, texture).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.baseTexture = texture;
    this.moodIcon = scene.add.image(0, -100, "heart").setScale(3).setVisible(false);
    this.add([this.pack, this.sprite, this.moodIcon]);
    this.scaleX = direction;
    this.setDepth(y);
    scene.add.existing(this);
  }

  update(delta, time = 0) {
    const width = this.worldWidth ?? this.scene.scale.width;
    if (this.speed) {
      this.x += this.direction * this.speed * (delta / 1000);
      if (this.x > width + 60) this.x = -60;
      if (this.x < -60) this.x = width + 60;
    }
    animateWalker(this, delta, this.speed ? 0.7 : 0, time);
  }

  setMood(mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.moodIcon.setVisible(mood === "happy");
    if (mood === "happy") {
      playAction(this, "cheer", 600, 10);
      this.moodIcon.setScale(0).y = -90;
      this.scene.tweens.add({ targets: this.moodIcon, scale: 3, y: -104, duration: 300, ease: "Back.easeOut" });
    }
  }
}
