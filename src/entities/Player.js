import Phaser from "../phaser.js";

export const SPRITE_SCALE = 4;

// animazione condivisa da giocatore e NPC
function frameKey(walker, frame) {
  const key = frame ? `${walker.baseTexture}_${frame}` : walker.baseTexture;
  return walker.scene.textures.exists(key) ? key : walker.baseTexture;
}

export function animateWalker(walker, delta, speedRatio, time) {
  walker.blinkTimer = (walker.blinkTimer ?? 1500 + Math.random() * 2500) - delta;
  const hop = walker.hopY ?? 0;
  let frame = null;

  if (walker.actionUntil && time < walker.actionUntil) {
    frame = walker.actionFrame;
    walker.sprite.y = Phaser.Math.Linear(walker.sprite.y, hop, 0.4);
    walker.pack.y = -24 + hop;
  } else if (speedRatio > 0.05) {
    walker.walkPhase += delta * 0.013 * Math.max(0.6, speedRatio);
    // ciclo
    const step = Math.floor(walker.walkPhase / (Math.PI / 2)) % 4;
    frame = step === 0 ? "w1" : step === 2 ? "w2" : null;
    const bob = Math.abs(Math.sin(walker.walkPhase)) * 5 * speedRatio;
    walker.sprite.y = -bob + hop;
    walker.pack.y = -24 - Math.abs(Math.sin(walker.walkPhase - 0.5)) * 5 * speedRatio + hop;
  } else {
    const breath = Math.sin(time * 0.004) * 1.5;
    walker.sprite.y = Phaser.Math.Linear(walker.sprite.y, breath + hop, 0.2);
    walker.pack.y = Phaser.Math.Linear(walker.pack.y, -24 + breath * 0.6 + hop, 0.2);
  }

  if (!frame && walker.blinkTimer < 0) {
    frame = "blink";
    if (walker.blinkTimer < -130) walker.blinkTimer = 1800 + Math.random() * 2600;
  }
  const key = frameKey(walker, frame);
  if (walker.sprite.texture.key !== key) walker.sprite.setTexture(key);
}

// avvia un'azione
export function playAction(walker, frame = "act", duration = 420, hop = 8) {
  walker.actionFrame = frame;
  walker.actionUntil = walker.scene.time.now + duration;
  walker.hopY = 0;
  if (hop) {
    walker.scene.tweens.add({ targets: walker, hopY: -hop, duration: duration / 3, yoyo: true, ease: "Quad.easeOut", onComplete: () => (walker.hopY = 0) });
  }
}

// protagonista
export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { texture = "hero", withPack = false, floor = [430, 490], obstacles = [], worldWidth } = {}) {
    super(scene, x, y);
    this.pack = scene.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.sprite = scene.add.image(0, 0, texture).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.baseTexture = texture;
    // ombra a retino sotto i piedi
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x1c2839, 0.5);
    for (let i = 0; i < 12; i += 1) this.shadow.fillRect(-24 + i * 4 + ((i % 2) * 0), (i % 2) * 2 - 2, 4, 2);
    this.shadow.fillRect(-16, 0, 32, 2);
    this.add([this.shadow, this.pack, this.sprite]);
    this.pack.setVisible(withPack);
    scene.add.existing(this);

    this.speed = 190;
    this.floor = floor;
    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.walkPhase = 0;
    this.facing = 1;
    this.obstacles = obstacles;
    this.worldWidth = worldWidth ?? scene.scale.width;
    this.frozen = false;
  }

  // ingombro dei piedi sul pavimento (vista 2.5D)
  collides(x, y) {
    const left = x - 18;
    const right = x + 18;
    const top = y - 10;
    return this.obstacles.some((o) => left < o.x + o.w && right > o.x && top < o.y + o.h && y > o.y);
  }

  setBaseTexture(key) {
    this.baseTexture = key;
    this.sprite.setTexture(key);
  }

  act(frame = "act", duration = 420, hop = 8) {
    playAction(this, frame, duration, hop);
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

    // collisioni
    const nextX = Phaser.Math.Clamp(this.x + this.velocity.x * seconds, 20, this.worldWidth - 20);
    if (!this.collides(nextX, this.y)) this.x = nextX;
    else this.velocity.x = 0;
    const nextY = Phaser.Math.Clamp(this.y + this.velocity.y * seconds, this.floor[0], this.floor[1]);
    if (!this.collides(this.x, nextY)) this.y = nextY;
    else this.velocity.y = 0;

    // da fermo ogni tanto si gira a controllare la pianta nello zaino
    const moving = moveX !== 0 || moveY !== 0;
    this.idleTime = moving || this.frozen ? 0 : (this.idleTime ?? 0) + delta;
    if (this.idleTime > 3200 && !this.glancing) {
      this.glancing = true;
      const original = this.facing;
      this.facing = -original;
      this.scene.time.delayedCall(700, () => {
        if (this.glancing) this.facing = original;
        this.glancing = false;
        this.idleTime = -Math.random() * 2500;
      });
    }

    // girata morbida
    if (moveX !== 0) {
      this.facing = moveX > 0 ? 1 : -1;
      this.glancing = false;
    }
    this.scaleX = Phaser.Math.Linear(this.scaleX, this.facing, 1 - Math.exp(-delta / 45));

    const speedRatio = Math.min(1, this.velocity.length() / this.speed);
    animateWalker(this, delta, speedRatio, time);
    this.setDepth(this.y);
  }
}
