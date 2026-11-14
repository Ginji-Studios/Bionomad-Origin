import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";

// personaggio retinato che cammina a sinistra / destra sulla strada
export class Walker {
  constructor(scene, key, x, feetY, { speed = 300, depth = 500, sound = false, indoor = false } = {}) {
    this.scene = scene;
    this.key = key;
    this.speed = speed;
    this.sound = sound;
    this.indoor = indoor;
    this.vx = 0;
    this.phase = 0;
    this.facing = 1;
    this.frozen = false;
    this.shadow = scene.add.ellipse(x, feetY - 6, 70, 12, 0x1c2839, 0.55).setDepth(depth - 1);
    this.img = scene.add.image(x, feetY, `${key}_idle`).setOrigin(0.5, 1).setDepth(depth);
    this.minX = 60;
    this.maxX = 1220;
    this.depth = depth;
    this.bubbleMs = Math.random() * 600;
    this.pack = true;
    this.scale = 1;
  }

  // bollicine di ossigeno che escono dal tappo dello zaino-serra
  bubble(count = 1) {
    if (!this.pack) return;
    const sf = this.img.scrollFactorX;
    for (let i = 0; i < count; i++) {
      const bx = this.img.x - this.facing * 22 * this.scale + (Math.random() - 0.5) * 8;
      const by = this.img.y - 150 * this.scale;
      const size = Math.random() < 0.3 ? 4 : 3;
      const b = this.scene.add.rectangle(bx, by, size, size, 0xf1f0ed, 0.9).setDepth(this.depth + 1).setScrollFactor(sf);
      this.scene.tweens.add({
        targets: b,
        y: by - 50 - Math.random() * 50,
        x: bx + (Math.random() - 0.5) * 24,
        alpha: 0,
        duration: 1100 + Math.random() * 700,
        delay: i * 90,
        ease: "Sine.easeOut",
        onComplete: () => b.destroy()
      });
    }
  }

  get x() {
    return this.img.x;
  }

  set x(v) {
    this.img.x = v;
    this.shadow.x = v;
  }

  update(dir, delta) {
    const dt = delta / 1000;
    this.bubbleMs -= delta;
    if (this.bubbleMs <= 0) {
      this.bubble(1);
      this.bubbleMs = 700 + Math.random() * 900;
    }
    const target = this.frozen ? 0 : dir * this.speed;
    this.vx += (target - this.vx) * Math.min(1, dt * 10);
    if (Math.abs(this.vx) < 4 && !dir) this.vx = 0;
    this.x = Phaser.Math.Clamp(this.x + this.vx * dt, this.minX, this.maxX);
    if (this.x <= this.minX || this.x >= this.maxX) this.vx = 0;
    if (dir && !this.frozen) this.facing = dir;
    this.img.setFlipX(this.facing < 0);
    if (Math.abs(this.vx) > 10) {
      const before = Math.floor(this.phase * 8);
      this.phase = (this.phase + Math.abs(this.vx) * dt * 0.0042) % 1;
      const f = Math.floor(this.phase * 8);
      this.img.setTexture(`${this.key}_${f}`);
      if (this.sound && f !== before && f % 4 === 0) Sfx.step(this.indoor);
    } else {
      this.img.setTexture(`${this.key}_idle`);
    }
  }

  // piccolo saltello di soddisfazione
  cheer() {
    this.scene.tweens.add({ targets: this.img, y: this.img.y - 14, duration: 140, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
  }

  faint(onDone) {
    this.frozen = true;
    this.scene.tweens.add({ targets: this.img, angle: this.facing * 85, y: this.img.y + 6, alpha: 0.7, duration: 900, ease: "Quad.easeIn", onComplete: onDone });
  }

  setDepth(d) {
    this.img.setDepth(d);
    this.shadow.setDepth(d - 1);
  }

  destroy() {
    this.img.destroy();
    this.shadow.destroy();
  }
}
