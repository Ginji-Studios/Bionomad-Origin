import Phaser from "../phaser.js";
import { Sfx } from "../systems/Sfx.js";

export const SPRITE_SCALE = 4;

// animazione condivisa da giocatore e NPC
function frameKey(walker, frame) {
  const key = frame ? `${walker.baseTexture}_${frame}` : walker.baseTexture;
  return walker.scene.textures.exists(key) ? key : walker.baseTexture;
}

export function animateWalker(walker, delta, speedRatio, time) {
  if (walker.fainted) return;
  walker.blinkTimer = (walker.blinkTimer ?? 1500 + Math.random() * 2500) - delta;
  const hop = walker.hopY ?? 0;
  let frame = null;

  if (walker.actionUntil && time < walker.actionUntil) {
    frame = walker.actionFrame;
    walker.sprite.y = Phaser.Math.Linear(walker.sprite.y, hop, 0.4);
    walker.pack.y = -24 + hop;
  } else if (speedRatio > 0.05) {
    walker.walkPhase += delta * 0.013 * Math.max(0.6, speedRatio);
    // ciclo a 4 frame: appoggio → passaggio → appoggio → passaggio
    const step = Math.floor(walker.walkPhase / (Math.PI / 2)) % 4;
    frame = ["w1", "p1", "w2", "p2"][step];
    // passi del protagonista: un tocco leggero a ogni appoggio
    if (walker.stepSound && step !== walker.lastStep && (step === 0 || step === 2)) Sfx.step(Boolean(walker.scene.indoor));
    walker.lastStep = step;
    const bob = Math.abs(Math.sin(walker.walkPhase)) * 4 * speedRatio;
    walker.sprite.y = Math.round(-bob + hop);
    // lo zaino segue con un po' di ritardo e ondeggia di lato
    walker.pack.y = Math.round(-24 - Math.abs(Math.sin(walker.walkPhase - 0.6)) * 5 * speedRatio + hop);
    walker.pack.x = -30 + Math.round(Math.sin(walker.walkPhase * 0.5) * 2 * speedRatio);
  } else {
    const breath = Math.sin(time * 0.004) * 1.5;
    walker.sprite.y = Phaser.Math.Linear(walker.sprite.y, breath + hop, 0.2);
    walker.pack.y = Phaser.Math.Linear(walker.pack.y, -24 + breath * 0.6 + hop, 0.2);
    walker.pack.x = Phaser.Math.Linear(walker.pack.x, -30, 0.2);
    // nel punto basso del respiro le spalle si abbassano
    if (breath < -1.1) frame = "idle";
  }

  if (!frame && walker.blinkTimer < 0) {
    frame = "blink";
    if (walker.blinkTimer < -130) walker.blinkTimer = 1800 + Math.random() * 2600;
  }
  const key = frameKey(walker, frame);
  if (walker.sprite.texture.key !== key) walker.sprite.setTexture(key);
  updateHose(walker, delta);
}

// tubo che collega lo zaino BIONOMAD alla mascherina e spallacci dello zaino.
// tutto è disegnato sulla stessa griglia dei pixel dello sprite (4x4), così resta nello stile
const HOSE_DARK = 0x2c4556;
const HOSE_RIB = 0x5e7f94;
const STRAP = 0x163c4d;
const STRAP_LIGHT = 0x2c566a;
const BUCKLE = 0x9fb4c2;
export function updateHose(walker, delta = 16) {
  const pack = walker.pack;
  const parent = pack?.parentContainer;
  if (!parent || !walker.sprite) return;
  const masked = /_mask/.test(walker.baseTexture ?? "");
  if (!walker.hose) {
    walker.hose = walker.scene.add.graphics();
    parent.add(walker.hose);
  }
  const hose = walker.hose;
  hose.clear();
  const near = Math.abs(pack.x + 30) < 14 && Math.abs(pack.y + 24) < 14;
  const sitting = /_sit/.test(walker.sprite.texture.key);
  const show = pack.visible && !walker.fainted && near && !sitting && walker.sprite.angle === 0;
  hose.setVisible(show);
  if (!show) return;
  // angolo in alto a sinistra dello sprite, arrotondato alla griglia
  const P = 4;
  const gx = Math.round(walker.sprite.x - 28);
  const gy = Math.round(walker.sprite.y - 84);
  const cell = (c, r, color) => {
    hose.fillStyle(color, 1);
    hose.fillRect(gx + c * P, gy + r * P, P, P);
  };
  // spallacci: due cinghie dritte dalle spalle alla vita, con il regolatore chiaro a metà
  [11, 12, 13, 14].forEach((r) => {
    cell(3, r, r === 13 ? STRAP_LIGHT : STRAP);
    cell(10, r, r === 13 ? STRAP_LIGHT : STRAP);
  });
  hose.fillStyle(BUCKLE, 1);
  hose.fillRect(gx + 3 * P + 1, gy + 13 * P + 1, 2, 2);
  hose.fillRect(gx + 10 * P + 1, gy + 13 * P + 1, 2, 2);
  if (!masked) return;
  // tubo dalla valvola dello zaino alla mascherina: sale e entra di lato, senza curva a U
  const path = [[0, 10], [1, 10], [2, 10], [3, 10]];
  path.forEach(([c, r], i) => cell(c, r, i % 2 ? HOSE_RIB : HOSE_DARK));
  // valvola rossa sul bordo dello zaino (segue lo zaino) e innesto sulla maschera
  hose.fillStyle(0xb4553f, 1);
  hose.fillRect(Math.round(pack.x - 2), Math.round(pack.y - 20), P, P);
  cell(4, 10, HOSE_DARK);

  // l'ossigeno che esce lievemente dalla piantina dello zaino
  walker.o2Leak = (walker.o2Leak ?? Math.random() * 800) - delta;
  if (walker.o2Leak <= 0) {
    walker.o2Leak = 700 + Math.random() * 900;
    const scene = walker.scene;
    const size = Math.random() < 0.3 ? 4 : 2;
    const p = scene.add.rectangle(pack.x - 8 + Math.round(Math.random() * 16), pack.y - 48, size, size, Math.random() < 0.5 ? 0xdff2e4 : 0x9fd4b0, 0.9);
    parent.addAt(p, parent.getIndex(pack));
    scene.tweens.add({
      targets: p,
      y: p.y - 24 - Math.random() * 16,
      x: p.x + (Math.random() < 0.5 ? -4 : 4),
      alpha: 0,
      duration: 1200 + Math.random() * 600,
      ease: "Sine.easeOut",
      onComplete: () => p.destroy()
    });
  }
}

// girata con un po' di peso: cambio di verso immediato, schiacciamento elastico,
// lo zaino che arriva in ritardo e un filo di polvere se si stava camminando
export function turnTo(walker, facing, moving = false) {
  if (walker.fainted) return;
  if (Math.sign(walker.scaleX) === facing) return;
  const scene = walker.scene;
  walker.scaleX = facing;
  scene.tweens.killTweensOf(walker.sprite);
  scene.tweens.killTweensOf(walker.pack);
  walker.sprite.setScale(SPRITE_SCALE * 0.82, SPRITE_SCALE * 1.1);
  scene.tweens.add({ targets: walker.sprite, scaleX: SPRITE_SCALE, scaleY: SPRITE_SCALE, duration: 260, ease: "Back.easeOut" });
  walker.pack.x = -30 + 10;
  scene.tweens.add({ targets: walker.pack, x: -30, duration: 220, delay: 40, ease: "Back.easeOut" });
  if (!moving) return;
  for (let i = 0; i < 3; i += 1) {
    const dust = scene.add.rectangle(walker.x + facing * (8 + i * 6), walker.y - 2, 4, 4, 0xa3a9a6).setDepth(walker.depth - 1);
    scene.tweens.add({ targets: dust, x: dust.x + facing * (10 + i * 6), y: dust.y - 6 - i * 3, alpha: 0, duration: 380, onComplete: () => dust.destroy() });
  }
}

// svenimento per mancanza d'ossigeno: barcolla, cede sulle ginocchia e cade in avanti;
// lo zaino vola all'indietro e il vaso della pianta si rovescia per terra.
// instant = true mette subito tutto nella posa finale (per la scena successiva)
export function faint(walker, { instant = false } = {}) {
  const scene = walker.scene;
  // cade in avanti (circa 100 px) e la pianta finisce dietro (circa 130 px):
  // se vicino al bordo dello schermo si gira o barcolla verso il centro
  const cam = scene.cameras.main;
  const view = { x: cam.scrollX, right: cam.scrollX + cam.width };
  const fits = (d) => (d > 0 ? view.right - walker.x >= 120 && walker.x - view.x >= 140 : walker.x - view.x >= 120 && view.right - walker.x >= 140);
  let dir = Math.sign(walker.scaleX) || 1;
  if (!fits(dir) && fits(-dir)) dir = -dir;
  walker.scaleX = dir;
  walker.facing = dir;
  const safeX = Phaser.Math.Clamp(walker.x, view.x + (dir > 0 ? 140 : 120), view.right - (dir > 0 ? 120 : 140));
  if (instant) walker.x = safeX;
  else if (safeX !== walker.x) scene.tweens.add({ targets: walker, x: safeX, duration: 900, ease: "Sine.easeInOut" });
  const sprite = walker.sprite;
  const pack = walker.pack;
  const tween = (config) => new Promise((resolve) => (instant ? resolve() : scene.tweens.add({ ...config, onComplete: resolve })));
  const wait = (ms) => new Promise((resolve) => (instant ? resolve() : scene.time.delayedCall(ms, resolve)));
  walker.fainted = true;
  if (walker.hose) walker.hose.clear().setVisible(false);
  walker.frozen = true;
  walker.velocity?.set(0, 0);
  scene.tweens.killTweensOf([sprite, pack]);
  sprite.setTexture(walker.baseTexture);
  sprite.setPosition(0, 0).setScale(SPRITE_SCALE).setAngle(0);

  // pose finali
  const lie = () => {
    sprite.setAngle(90).setY(-28).setX(0).setScale(SPRITE_SCALE);
    sprite.setTint(0xb8c6d0);
    walker.shadow.setScale(2.4, 1).setX(42);
  };
  const spill = () => {
    if (!pack.visible) return null;
    pack.setVisible(false);
    // zaino e vaso diventano oggetti del mondo, così non si specchiano col personaggio
    const groundY = walker.y;
    const packX = walker.x - 70 * dir;
    const fallenPack = scene.add.image(packX, groundY + 2, "pack").setOrigin(0.5, 1).setScale(SPRITE_SCALE).setAngle(-90 * dir).setDepth(walker.y - 1);
    fallenPack.setTint(0xc7cfcc);
    const potX = packX - 46 * dir;
    const pot = scene.add.image(potX, groundY + 4, "pot_plant").setOrigin(0.5, 0.5).setScale(SPRITE_SCALE).setAngle(-90 * dir).setDepth(walker.y - 1);
    pot.y -= 22;
    // terra rovesciata
    const soil = scene.add.graphics().setDepth(walker.y - 2);
    soil.fillStyle(0x5a4636, 1);
    for (let i = 0; i < 9; i += 1) soil.fillRect(potX - (24 + i * 6) * dir - 2, groundY - 2 - (i % 3) * 2, 6, 4);
    return { fallenPack, pot, soil, packX, potX, groundY };
  };

  if (instant) {
    lie();
    spill();
    return Promise.resolve();
  }

  return (async () => {
    // fiato corto: bollicine sempre più piccole
    for (let i = 0; i < 3; i += 1) {
      const b = scene.add.rectangle(walker.x + 16 * dir, walker.y - 88, 6 - i * 2, 6 - i * 2, 0xf1f0ed).setDepth(walker.depth + 1);
      scene.tweens.add({ targets: b, y: b.y - 30, alpha: 0, duration: 600, delay: i * 180, onComplete: () => b.destroy() });
    }
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      onUpdate: (t) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor({ r: 255, g: 255, b: 255 }, { r: 184, g: 198, b: 208 }, 1, t.getValue());
        sprite.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      }
    });
    // barcolla
    await tween({ targets: sprite, x: { from: -5, to: 5 }, duration: 170, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
    sprite.x = 0;
    // le ginocchia cedono
    await tween({ targets: sprite, scaleY: SPRITE_SCALE * 0.84, scaleX: SPRITE_SCALE * 1.08, duration: 280, ease: "Quad.easeOut" });
    await wait(180);
    // cade in avanti, lo zaino scivola via all'indietro
    scene.tweens.add({ targets: pack, x: -64, y: -6, angle: -40, duration: 260, ease: "Quad.easeIn" });
    await tween({ targets: sprite, angle: 90, y: -28, scaleX: SPRITE_SCALE, scaleY: SPRITE_SCALE, duration: 300, ease: "Quad.easeIn" });
    scene.cameras.main.shake(180, 0.008);
    walker.shadow.setScale(2.4, 1).setX(42);
    // piccolo rimbalzo all'impatto
    await tween({ targets: sprite, y: -34, duration: 90, yoyo: true, ease: "Quad.easeOut" });
    for (let i = 0; i < 6; i += 1) {
      const dust = scene.add.rectangle(walker.x + (Phaser.Math.Between(-10, 90)) * dir, walker.y - 2, 4, 4, 0xa3a9a6).setDepth(walker.depth + 1);
      scene.tweens.add({ targets: dust, y: dust.y - Phaser.Math.Between(6, 16), x: dust.x + Phaser.Math.Between(-12, 12), alpha: 0, duration: 420, onComplete: () => dust.destroy() });
    }
    pack.setAngle(0).setPosition(-30, -24);
    const fallen = spill();
    if (fallen) {
      // il vaso rotola fuori dallo zaino e la terra si sparge
      const { pot, soil, fallenPack } = fallen;
      const potEndX = pot.x;
      pot.x = fallenPack.x;
      pot.y -= 30;
      pot.setAngle(0);
      soil.setAlpha(0);
      scene.tweens.add({ targets: pot, x: potEndX, y: pot.y + 30, angle: -90 * dir, duration: 420, ease: "Bounce.easeOut" });
      scene.tweens.add({ targets: soil, alpha: 1, duration: 200, delay: 260 });
      // foglie che volano via
      for (let i = 0; i < 4; i += 1) {
        const leaf = scene.add.rectangle(potEndX, pot.y, 6, 4, 0x5c7a6b).setDepth(walker.depth + 1);
        scene.tweens.add({
          targets: leaf,
          x: potEndX - Phaser.Math.Between(10, 60) * dir,
          y: walker.y - Phaser.Math.Between(0, 8),
          duration: 700 + i * 120,
          delay: 200,
          ease: "Sine.easeOut",
          onComplete: () => leaf.setFillStyle(0x7a6a4a)
        });
      }
    }
    await wait(400);
  })();
}

// anima un'immagine semplice (menu, carte) con i frame dello spritesheet.
// mode() ritorna "walk", "idle" o "cheer"; base() la texture di partenza
export function animateImage(scene, image, base, mode = () => "idle") {
  const cycles = {
    walk: ["w1", "p1", "w2", "p2"],
    idle: [null, null, null, "idle", "idle", null, null, "blink"],
    cheer: ["cheer", null]
  };
  let tick = 0;
  return scene.time.addEvent({
    delay: 150,
    loop: true,
    callback: () => {
      if (!image.active) return;
      tick += 1;
      const m = mode();
      const cycle = cycles[m] ?? cycles.idle;
      const frame = cycle[(m === "idle" ? Math.floor(tick / 2) : tick) % cycle.length];
      const key = frame ? `${base()}_${frame}` : base();
      image.setTexture(scene.textures.exists(key) ? key : base());
    }
  });
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
    this.stepSound = true;
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
    if (this.fainted) return;
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
    turnTo(this, this.facing, this.velocity.length() > 40);

    const speedRatio = Math.min(1, this.velocity.length() / this.speed);
    animateWalker(this, delta, speedRatio, time);
    this.setDepth(this.y);
  }
}
