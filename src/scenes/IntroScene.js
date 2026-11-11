import Phaser from "../phaser.js";
import { animateWalker, Player } from "../entities/Player.js";
import { getOrigin } from "../config/origins.js";
import { getRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { buildHouse } from "../world/locations.js";
import { addHud, addObjectiveBox, bodyText, COLORS, drawPanel, fadeIn, goTo, textChip } from "../ui/theme.js";

// Cutscene di inizio run: il cittadino indossa BIONOMAD+ ed esce di casa.
export class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    const { width, height } = this.scale;
    const run = getRun(this.registry);
    if (!run) {
      this.scene.start("MenuScene");
      return;
    }
    this.origin = getOrigin(this.registry);
    this.done = false;
    this.walking = false;
    fadeIn(this, 500);

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bg);
    this.world = buildHouse(this);
    const hud = addHud(this, { oxygen: 0.3, location: this.origin.city, flag: this.origin.flag });
    const caption = addObjectiveBox(this, "07:30 · CASA");
    textChip(this, width - 14, height - 30, "SPAZIO  salta", { size: 20, originX: 1 });

    // Lo zaino BIONOMAD+ appoggiato a terra
    const pack = this.add.image(this.world.points.pack.x, 432, "pack").setOrigin(0.5, 1).setScale(4).setDepth(431);
    this.tweens.add({ targets: pack, y: 426, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const player = new Player(this, 420, 440, { texture: characterTexture(this.origin.id), withPack: false, floor: this.world.floor });
    player.frozen = true;
    this.player = player;
    this.walk = (x, y, duration) =>
      new Promise((resolve) => {
        player.facing = x >= player.x ? 1 : -1;
        this.walking = true;
        this.tweens.add({ targets: player, x, y, duration, ease: "Sine.easeInOut", onComplete: () => { this.walking = false; resolve(); } });
      });
    this.wait = (ms) => new Promise((resolve) => this.time.delayedCall(ms, resolve));
    // Fumetto sopra la testa
    this.say = (text) => {
      const bubble = this.add.container(player.x, player.y - 118).setDepth(980);
      const label = bodyText(this, 0, 0, text, { size: 22, color: COLORS.ink, origin: 0.5 });
      const w = label.width + 20;
      const g = drawPanel(this.add.graphics(), -w / 2, -15, w, 30, { fill: COLORS.paper, border: COLORS.ink });
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(-4, 15, 8, 6);
      bubble.add([g, label]);
      bubble.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 220, ease: "Back.easeOut" });
      this.tweens.add({ targets: bubble, alpha: 0, y: bubble.y - 8, duration: 250, delay: 1500, onComplete: () => bubble.destroy() });
    };

    this.input.keyboard.once("keydown-SPACE", () => this.finish());
    this.input.keyboard.once("keydown-ENTER", () => this.finish());

    this.play(pack, hud, caption);
  }

  async play(pack, hud, caption) {
    const player = this.player;
    await this.wait(600);
    this.say("Uff... l'aria è pesante.");
    await this.wait(1200);
    caption.setText("INDOSSA BIONOMAD+");
    await this.walk(this.world.points.pack.x - 50, 440, 1100);
    await this.wait(300);
    player.act("act", 500, 0);
    this.tweens.killTweensOf(pack);
    this.tweens.add({ targets: pack, x: player.x - 30, y: player.y - 24, alpha: 0, duration: 400, ease: "Sine.easeIn" });
    await this.wait(380);
    player.setPack(true);
    player.setBaseTexture(characterTexture(this.origin.id, true));
    this.tweens.addCounter({ from: 0.3, to: 1, duration: 1000, ease: "Cubic.easeOut", onUpdate: (t) => hud.setOxygen(t.getValue()) });
    this.say("Ah, si respira!");
    player.act("cheer", 700, 12);
    await this.wait(1300);
    caption.setText("ESCI DI CASA");
    await this.walk(this.world.points.door.x, 410, 1300);
    // La porta si apre e il cittadino esce
    const opening = this.add.rectangle(this.world.door.x + 42, (this.world.door.top + 380) / 2, 72, 380 - this.world.door.top - 12, COLORS.inkDeep).setDepth(5);
    opening.setScale(0, 1);
    this.tweens.add({ targets: opening, scaleX: 1, duration: 300 });
    await this.wait(300);
    this.tweens.add({ targets: player, alpha: 0, duration: 400 });
    await this.wait(500);
    this.finish();
  }

  update(time, delta) {
    if (!this.player) return;
    // Camminata "pilotata" dalla cutscene: stessa animazione del gioco, senza input.
    this.player.scaleX = Phaser.Math.Linear(this.player.scaleX, this.player.facing, 0.25);
    this.player.setDepth(this.player.y);
    animateWalker(this.player, delta, this.walking ? 0.8 : 0, time);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    goTo(this, "TravelScene");
  }
}

