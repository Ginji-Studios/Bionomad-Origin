import { crowdTexture } from "../ui/pixelSprites.js";
import Phaser from "../phaser.js";
import { COLORS, drawPanel, o2Label } from "../ui/theme.js";
import { animateWalker, playAction, SPRITE_SCALE } from "./Player.js";

// gesti che i cittadini fanno da soli sul proprio BIONOMAD:
// cura → guadagnano ossigeno (O₂+), negligenza → lo perdono (O₂−)
const CARE = ["water", "torch", "vial", "touch"];
const NEGLECT = ["cover", "flood", "wrongVial", "forget"];

// passante che attraversa la scena in loop
export class Npc extends Phaser.GameObjects.Container {
  constructor(scene, x, y, name, { texture = "npc_a", withPack = true, speed = 0, direction = 1, child = false, lively = false } = {}) {
    super(scene, x, y);
    this.name = name;
    this.mood = "calm";
    this.speed = speed;
    this.direction = direction;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.child = child;
    this.lively = lively;
    // il primo gesto arriva dopo qualche secondo, poi a intervalli casuali
    this.careTimer = 2500 + Math.random() * 7000;
    this.busy = false;

    // corpo: per i bambini è tutto più piccolo (zainetto compreso)
    this.figure = scene.add.container(0, 0).setScale(child ? 0.62 : 1);
    this.pack = scene.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(SPRITE_SCALE).setVisible(withPack);
    // i passanti senza nome prendono un aspetto a caso, sempre diverso nella stessa scena
    if (!name && !/npc_(old|vendor)/.test(texture)) texture = crowdTexture(scene, texture.endsWith("_mask"));
    this.sprite = scene.add.image(0, 0, texture).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.baseTexture = texture;
    // durante un gesto lo zaino è a terra: l'animazione della camminata non deve spostarlo
    this.packImg = this.pack;
    this.dummyPack = { x: -30, y: -24 };
    this.moodIcon = scene.add.image(0, -100, "heart").setScale(3).setVisible(false);
    this.figure.add([this.pack, this.sprite, this.moodIcon]);
    this.add(this.figure);
    this.scaleX = direction;
    this.setDepth(y);
    scene.add.existing(this);
  }

  update(delta, time = 0) {
    const width = this.worldWidth ?? this.scene.scale.width;
    // chi cammina in coppia (genitore e bambino) aspetta l'altro
    const halted = this.busy || this.partner?.busy;
    if (this.speed && !halted) {
      this.x += this.direction * this.speed * (delta / 1000);
      if (this.x > width + 60) this.x = -60;
      if (this.x < -60) this.x = width + 60;
    }
    if (this.lively && !halted && this.packImg.visible) {
      this.careTimer -= delta;
      // solo quando è ben dentro lo schermo, così il gesto si vede
      const cam = this.scene.cameras.main;
      const sx = this.x - cam.scrollX;
      if (this.careTimer <= 0 && sx > 120 && sx < cam.width - 120) this.tendPlant();
    }
    if (this.busy) this.pack = this.dummyPack;
    animateWalker(this, delta, this.speed && !halted ? 0.7 : 0, time);
    this.pack = this.packImg;
    if (this.busy && this.hose) this.hose.setVisible(false);
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

  // si ferma, appoggia lo zaino davanti a sé e fa un gesto di cura (o di negligenza)
  async tendPlant() {
    const scene = this.scene;
    this.busy = true;
    const careful = Math.random() < 0.68;
    const kind = Phaser.Utils.Array.GetRandom(careful ? CARE : NEGLECT);
    // se la scena si chiude a metà gesto, le promesse restano semplicemente in sospeso
    const alive = () => this.active && scene.sys && scene.sys.isActive();
    const wait = (ms) => new Promise((r) => alive() && scene.time.delayedCall(ms, r));
    const tween = (cfg) => new Promise((r) => alive() && scene.tweens.add({ ...cfg, onComplete: r }));
    const fx = []; // oggetti temporanei del gesto, dentro il corpo (si specchiano con lui)
    const add = (obj) => {
      this.figure.add(obj);
      fx.push(obj);
      return obj;
    };

    // lo zaino passa davanti, a terra
    await tween({ targets: this.packImg, x: 46, y: 0, duration: 380, ease: "Quad.easeInOut" });
    if (!this.active) return;
    const plantTop = -48; // cima della piantina con lo zaino a terra
    playAction(this, "act", 1800, 0);

    if (kind === "water") {
      const can = add(scene.add.graphics());
      can.fillStyle(COLORS.steel, 1);
      can.fillRect(0, 0, 18, 12);
      can.fillRect(18, 2, 10, 3);
      can.fillStyle(COLORS.steelLight, 1);
      can.fillRect(2, -4, 12, 4);
      can.setPosition(26, plantTop - 34).setAngle(20);
      for (let i = 0; i < 8; i += 1) {
        scene.time.delayedCall(200 + i * 140, () => {
          if (!alive()) return;
          const d = scene.add.rectangle(52 + (i % 3) * 4, plantTop - 18, 3, 5, 0x6e96be);
          this.figure.add(d);
          scene.tweens.add({ targets: d, y: plantTop + 4, duration: 320, onComplete: () => d.destroy() });
        });
      }
    } else if (kind === "torch") {
      const torch = add(scene.add.rectangle(20, plantTop - 40, 14, 6, COLORS.inkDeep));
      for (let i = 0; i < 4; i += 1) add(scene.add.rectangle(32 + i * 6, plantTop - 34 + i * 6, 6 + i * 4, 4, 0xe8c66a, 0.85));
      scene.tweens.add({ targets: torch, alpha: 0.6, duration: 160, yoyo: true, repeat: 4 });
    } else if (kind === "vial") {
      const vial = add(scene.add.rectangle(50, plantTop - 50, 6, 14, 0x7fae86).setStrokeStyle(2, COLORS.paper));
      scene.tweens.add({ targets: vial, y: plantTop - 6, duration: 700, ease: "Quad.easeIn", onComplete: () => vial.setVisible(false) });
    } else if (kind === "touch") {
      playAction(this, "cheer", 1400, 6);
      for (let i = 0; i < 3; i += 1) {
        const leaf = add(scene.add.rectangle(40 + i * 8, plantTop - 4, 4, 4, 0x9fd4b0));
        scene.tweens.add({ targets: leaf, y: plantTop - 26 - i * 6, alpha: 0, duration: 900, delay: i * 220 });
      }
    } else if (kind === "cover") {
      const cloth = add(scene.add.rectangle(46, plantTop - 30, 40, 8, COLORS.inkDeep));
      scene.tweens.add({ targets: cloth, y: plantTop + 6, scaleY: 3, duration: 500, ease: "Quad.easeIn" });
    } else if (kind === "flood") {
      // la leva resta aperta: l'acqua trabocca e fa una pozza
      const puddle = add(scene.add.rectangle(46, 2, 10, 4, 0x6e96be));
      scene.tweens.add({ targets: puddle, scaleX: 7, duration: 1400 });
      for (let i = 0; i < 6; i += 1) {
        const d = add(scene.add.rectangle(30 + i * 6, plantTop + 10, 3, 3, 0x6e96be));
        scene.tweens.add({ targets: d, y: 0, duration: 500, delay: i * 120, repeat: 2 });
      }
    } else if (kind === "wrongVial") {
      const vial = add(scene.add.rectangle(50, plantTop - 50, 6, 14, 0x9a5a8c).setStrokeStyle(2, COLORS.paper));
      scene.tweens.add({ targets: vial, y: plantTop - 6, duration: 700, ease: "Quad.easeIn", onComplete: () => vial.setVisible(false) });
    } else {
      // si dimentica della pianta: guarda il telefono e tossisce
      const phone = add(scene.add.rectangle(16, -84, 8, 12, COLORS.inkDeep).setStrokeStyle(2, COLORS.steelLight));
      scene.tweens.add({ targets: phone, alpha: 0.7, duration: 200, yoyo: true, repeat: 4 });
      [700, 1100].forEach((d) =>
        scene.time.delayedCall(d, () => {
          if (!alive()) return;
          const puff = scene.add.rectangle(24, -96, 6, 6, COLORS.stone);
          this.figure.add(puff);
          scene.tweens.add({ targets: puff, x: 44, y: -104, alpha: 0, scale: 2, duration: 500, onComplete: () => puff.destroy() });
        })
      );
    }

    await wait(1100);
    if (!this.active) return;
    // la pianta reagisce e compare l'icona dell'ossigeno
    this.packImg.setTint(careful ? 0xbfe6c8 : 0xd98a7a);
    this.showO2(careful);
    await wait(700);
    if (!this.active) return;
    this.packImg.clearTint();
    fx.forEach((o) => o.destroy());

    // si rimette lo zaino e riparte
    await tween({ targets: this.packImg, x: -30, y: -24, duration: 380, ease: "Quad.easeInOut" });
    if (!this.active) return;
    this.busy = false;
    this.careTimer = 7000 + Math.random() * 9000;
  }

  // piccola etichetta O₂+ / O₂− che sale sopra la testa
  showO2(gain) {
    const scene = this.scene;
    if (!scene?.sys?.isActive()) return;
    const color = gain ? 0x2f5e4a : COLORS.red;
    const top = this.y - (this.child ? 92 : 140);
    const tag = scene.add.container(this.x, top).setDepth(this.y + 400);
    const label = o2Label(scene, 0, 0, { px: 26, color: COLORS.paper, suffix: gain ? "+" : "−" });
    const w = label.width + 14;
    const bg = drawPanel(scene.add.graphics(), -w / 2, -17, w, 34, { fill: color, border: COLORS.paper });
    tag.add([bg, label]);
    tag.setScale(0.4).setAlpha(0);
    scene.tweens.add({ targets: tag, scale: 1, alpha: 1, duration: 220, ease: "Back.easeOut" });
    scene.tweens.add({ targets: tag, y: top - 30, alpha: 0, duration: 600, delay: 1100, ease: "Sine.easeIn", onComplete: () => tag.destroy() });
  }
}
