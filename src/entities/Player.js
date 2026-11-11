import Phaser from "../phaser.js";

export const SPRITE_SCALE = 4;

// Animazione di camminata fluida condivisa da giocatore e NPC:
// rimbalzo sinusoidale (niente rotazioni: il pixel-art ruotato si "sgrana"), zaino che segue con un piccolo ritardo.
export function animateWalker(walker, delta, speedRatio, time) {
  if (speedRatio > 0.05) {
    walker.walkPhase += delta * 0.014 * Math.max(0.6, speedRatio);
    const bob = Math.abs(Math.sin(walker.walkPhase)) * 6 * speedRatio;
    walker.sprite.y = -bob;
    walker.pack.y = -24 - Math.abs(Math.sin(walker.walkPhase - 0.5)) * 6 * speedRatio;
  } else {
    // Respiro da fermo
    const breath = Math.sin(time * 0.004) * 1.5;
    walker.sprite.y = Phaser.Math.Linear(walker.sprite.y, breath, 0.2);
    walker.pack.y = Phaser.Math.Linear(walker.pack.y, -24 + breath * 0.6, 0.2);
  }
}

// Protagonista: sprite + zaino BIONOMAD+ opzionale, movimento con accelerazione.
export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { texture = "hero", withPack = false, floor = [430, 490], obstacles = [] } = {}) {
    super(scene, x, y);
    this.pack = scene.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.sprite = scene.add.image(0, 0, texture).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.add([this.pack, this.sprite]);
    this.pack.setVisible(withPack);
    scene.add.existing(this);

    this.speed = 190;
    this.floor = floor;
    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.walkPhase = 0;
    this.facing = 1;
    this.obstacles = obstacles;
    this.frozen = false;
  }

  // Ingombro dei piedi sul pavimento (vista 2.5D): largo come il corpo, basso.
  collides(x, y) {
    const left = x - 18;
    const right = x + 18;
    const top = y - 10;
    return this.obstacles.some((o) => left < o.x + o.w && right > o.x && top < o.y + o.h && y > o.y);
  }

  setPack(visible) {
    this.pack.setVisible(visible);
    if (visible) {
      this.pack.setScale(0);
      this.scene.tweens.add({ targets: this.pack, scale: SPRITE_SCALE, duration: 400, ease: "Back.easeOut" });
    }
  }

  update(input, delta, time = 0) {
    const seconds = delta / 1000;
    const { x: moveX, y: moveY } = this.frozen ? { x: 0, y: 0 } : input.movement;
    const smoothing = 1 - Math.exp(-delta / 70);
    this.velocity.x += (moveX * this.speed - this.velocity.x) * smoothing;
    this.velocity.y += (moveY * this.speed * 0.6 - this.velocity.y) * smoothing;

    // Collisioni: si prova a muoversi su X e su Y separatamente, così si "scivola" lungo gli ostacoli.
    const nextX = Phaser.Math.Clamp(this.x + this.velocity.x * seconds, 20, this.scene.scale.width - 20);
    if (!this.collides(nextX, this.y)) this.x = nextX;
    else this.velocity.x = 0;
    const nextY = Phaser.Math.Clamp(this.y + this.velocity.y * seconds, this.floor[0], this.floor[1]);
    if (!this.collides(this.x, nextY)) this.y = nextY;
    else this.velocity.y = 0;

    // Girata morbida: lo sprite si "schiaccia" e si riapre dall'altro lato.
    if (moveX !== 0) this.facing = moveX > 0 ? 1 : -1;
    this.scaleX = Phaser.Math.Linear(this.scaleX, this.facing, 1 - Math.exp(-delta / 45));

    const speedRatio = Math.min(1, this.velocity.length() / this.speed);
    animateWalker(this, delta, speedRatio, time);
    this.setDepth(this.y);
  }
}
