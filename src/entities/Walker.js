import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";
import { dieFrames } from "../art/people.js";

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
  // bollicine di ossigeno che escono dalla capsula: partono dal tappo con la lampada,
  // salgono ondeggiando e svaniscono (quadratini nei colori della palette)
  bubble(count = 1) {
    if (!this.pack || !this.img.active) return;
    const sf = this.img.scrollFactorX;
    const s = this.scale;
    for (let i = 0; i < count; i++) {
      const bx = this.img.x - this.facing * 26 * s + (Math.random() - 0.5) * 10 * s;
      const by = this.img.y - 138 * s;
      const size = Math.random() < 0.35 ? 5 : Math.random() < 0.6 ? 4 : 3;
      const col = Math.random() < 0.7 ? 0xf1f0ed : 0x5e6d88;
      const b = this.scene.add.rectangle(bx, by, size, size, col, 0.95).setDepth(this.depth + 1).setScrollFactor(sf);
      const drift = (Math.random() - 0.5) * 30;
      this.scene.tweens.add({ targets: b, y: by - 60 - Math.random() * 60, alpha: 0, duration: 1400 + Math.random() * 800, delay: i * 110, ease: "Sine.easeOut", onComplete: () => b.destroy() });
      this.scene.tweens.add({ targets: b, x: bx + drift, duration: 700, delay: i * 110, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
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
    // durante lo svenimento l'animazione la guida faint()
    if (this.dying || this.posing) return;
    const dt = delta / 1000;
    this.bubbleMs -= delta;
    if (this.bubbleMs <= 0) {
      this.bubble(Math.random() < 0.4 ? 2 : 1);
      this.bubbleMs = 450 + Math.random() * 650;
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
      this.moving = true;
    } else if (this.moving) {
      // fermata morbida: chiude il passo fino a riportare i piedi insieme (fase 0 o 0,5),
      // poi un piccolo assestamento del corpo, invece di scattare subito in posa ferma
      const goal = this.phase < 0.5 ? 0.5 : 1;
      this.phase = Math.min(goal, this.phase + dt * 1.6);
      if (this.phase >= goal - 0.001) {
        this.phase = goal % 1;
        this.moving = false;
        this.img.setTexture(`${this.key}_idle`);
        const sy = this.img.scaleY;
        this.scene.tweens.add({ targets: this.img, scaleY: sy * 0.975, duration: 110, yoyo: true, ease: "Sine.easeOut" });
      } else this.img.setTexture(`${this.key}_${Math.floor(this.phase * 8) % 8}`);
    } else {
      this.img.setTexture(`${this.key}_idle`);
    }
  }

  // piccolo saltello di soddisfazione
  cheer() {
    this.scene.tweens.add({ targets: this.img, y: this.img.y - 14, duration: 140, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
  }

  // svenimento quando l'ossigeno finisce: si porta la mano alla maschera, barcolla,
  // le ginocchia cedono e cade in avanti; la pianta dello zaino si spegne
  faint(onDone) {
    if (this.dying) return;
    this.dying = true;
    this.frozen = true;
    this.vx = 0;
    const sc = this.scene;
    dieFrames(sc, this.key);
    const img = this.img;
    const f = this.facing;
    const baseX = img.x;
    const tex = (n) => img.setTexture(`${this.key}_d${n}`);
    tex(0);
    // barcolla: piccoli scarti avanti e indietro
    sc.tweens.add({ targets: img, x: baseX + f * 4, duration: 140, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
    sc.time.delayedCall(700, () => tex(1));
    sc.time.delayedCall(900, () => tex(2));
    sc.time.delayedCall(1100, () => tex(3));
    sc.time.delayedCall(1500, () => {
      // cade in avanti, ruotando sulle ginocchia
      sc.tweens.add({
        targets: img,
        angle: f * 82,
        x: baseX + f * 30,
        y: img.y + 8,
        duration: 520,
        ease: "Quad.easeIn",
        onComplete: () => {
          sc.cameras.main.shake(140, 0.004);
          // polvere a terra
          for (let i = 0; i < 8; i++) {
            const d = sc.add.rectangle(baseX + f * (40 + Math.random() * 90), img.y - 4, 4, 4, 0x5e6d88).setDepth(this.depth + 1).setScrollFactor(img.scrollFactorX);
            sc.tweens.add({ targets: d, y: d.y - 10 - Math.random() * 14, x: d.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 600, onComplete: () => d.destroy() });
          }
          // la pianta si spegne
          sc.tweens.add({ targets: img, alpha: 0.75, duration: 600 });
          img.setTint(0xb8bfcc);
          onDone?.();
        }
      });
      sc.tweens.add({ targets: this.shadow, scaleX: 1.8, x: baseX + f * 60, duration: 520 });
    });
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
