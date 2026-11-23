import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";
import { dieFrames, WALK_FRAMES } from "../art/people.js";

// personaggio retinato che cammina a sinistra / destra sulla strada
export class Walker {
  constructor(scene, key, x, feetY, { speed = 300, depth = 500, sound = false, indoor = false } = {}) {
    this.scene = scene;
    this.key = key;
    this.speed = speed;
    // lunghezza del passo: > 1 = passi più lunghi (andando di fretta le gambe non "frullano")
    this.stride = 1;
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
      const b = this.scene.add.circle(bx, by, size * 0.55, col, 0.95).setDepth(this.depth + 1).setScrollFactor(sf);
      b.isBubble = true;
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
    // delta livellato: un fotogramma lento non fa saltare avanti il personaggio
    this.dtS = this.dtS ? this.dtS + (Math.min(delta, 50) - this.dtS) * 0.25 : Math.min(delta, 50);
    const dt = this.dtS / 1000;
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
    const N = WALK_FRAMES;
    if (Math.abs(this.vx) > 10) {
      const before = Math.floor(this.phase * N);
      this.phase = (this.phase + (Math.abs(this.vx) * dt * 0.0042) / this.stride) % 1;
      const f = Math.floor(this.phase * N);
      this.img.setTexture(`${this.key}_${f}`);
      // un passo ogni mezzo ciclo (piede a terra)
      if (this.sound && f !== before && f % (N / 2) === 0) Sfx.step(this.indoor);
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
      } else this.img.setTexture(`${this.key}_${Math.floor(this.phase * N) % N}`);
    } else {
      this.img.setTexture(`${this.key}_idle`);
    }
  }

  // etichetta "O₂+" / "O₂−" che sale sopra la testa e svanisce (al posto del saltello)
  o2Pop(sign = 1) {
    const sc = this.scene;
    const img = this.img;
    const x = Math.round(img.x);
    const y = Math.round(img.y - img.displayHeight - 18);
    const label = sign >= 0 ? "O₂+" : "O₂−";
    const t = sc.add.text(0, 0, label, { fontFamily: '"Roboto Mono", monospace', fontSize: "22px", fontStyle: "500", color: sign >= 0 ? "#1C2839" : "#F1F0ED" }).setOrigin(0.5);
    const bg = sc.add.rectangle(0, 0, t.width + 16, t.height + 6, sign >= 0 ? 0xf1f0ed : 0x1c2839, 1).setStrokeStyle(2, 0xf1f0ed);
    const c = sc.add.container(x, y, [bg, t]).setDepth(1550).setScrollFactor(img.scrollFactorX).setAlpha(0);
    sc.tweens.add({ targets: c, alpha: 1, y: y - 10, duration: 220, ease: "Sine.easeOut" });
    sc.tweens.add({ targets: c, alpha: 0, y: y - 46, duration: 700, delay: 900, ease: "Sine.easeIn", onComplete: () => c.destroy() });
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
            const d = sc.add.circle(baseX + f * (40 + Math.random() * 90), img.y - 4, 2 + Math.random() * 2, 0x5e6d88, 0.8).setDepth(this.depth + 1).setScrollFactor(img.scrollFactorX);
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

// camera che segue il personaggio senza tremolii: invece di arrotondare separatamente
// la posizione del personaggio e quella della camera (che a turno saltano di un pixel),
// si fa scorrere in modo morbido la posizione del personaggio SULLO SCHERMO e la si
// arrotonda una volta sola; lo scorrimento della città ne deriva.
export function smoothFollow(scene, walker, screenX = 460) {
  const cam = scene.cameras.main;
  cam.stopFollow();
  let off = walker.x - cam.scrollX;
  const step = () => {
    if (!walker.img.active) return;
    const dt = Math.min(scene.game.loop.delta, 50) / 1000;
    const b = cam.getBounds();
    const maxS = Math.max(0, b.width - cam.width);
    // posizione sullo schermo desiderata, tenendo conto dei bordi del mondo
    const want = walker.x - Phaser.Math.Clamp(walker.x - screenX, b.x, b.x + maxS);
    off += (want - off) * (1 - Math.exp(-dt * 4));
    // niente arrotondamenti: con lo stile vettoriale (non pixel art) la camera scorre in modo
    // continuo; arrotondare la camera ma non il personaggio lo faceva tremolare di mezzo pixel
    cam.scrollX = Phaser.Math.Clamp(walker.x - off, b.x, b.x + maxS);
  };
  step();
  scene.events.on("postupdate", step);
  scene.events.once("shutdown", () => scene.events.off("postupdate", step));
}
