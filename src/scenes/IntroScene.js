import Phaser from "../phaser.js";
import { animateWalker, Player, turnTo } from "../entities/Player.js";
import { getOrigin } from "../config/origins.js";
import { getRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { buildHouse } from "../world/locations.js";
import { addHud, addObjectiveBox, bodyText, burst, COLORS, drawPanel, fadeIn, goTo, textChip, titleCard } from "../ui/theme.js";

// cutscene di inizio run
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

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bg).setDepth(-100);
    this.world = buildHouse(this, { originId: this.origin.id });
    const hud = addHud(this, { oxygen: 0.3, location: this.origin.city, flag: this.origin.flag });
    const caption = addObjectiveBox(this, "07:30 · CASA");
    textChip(this, width - 14, height - 30, "SPAZIO  salta", { size: 20, originX: 1 });

    // lo zaino BIONOMAD+ appoggiato a terra
    // lo zaino è appoggiato sulla consolle; la pianta "respira" con un leggero bagliore
    const pack = this.add.image(this.world.points.pack.x - 20, this.world.points.pack.y, "pack").setOrigin(0.5, 1).setScale(4).setDepth(405);
    this.tweens.add({ targets: pack, scaleY: 4.12, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

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
    // fumetto sopra la testa
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
    // cartello d'apertura, poi il cittadino si sveglia stiracchiandosi
    await this.wait(300);
    await titleCard(this, this.origin.city, `07:30 · PM2.5 ${this.origin.pm25.toFixed(1)} · ${this.origin.difficulty}`);
    if (this.done) return;
    player.act("cheer", 500, 6);
    await this.wait(700);
    this.say("Uff... l'aria è pesante.");
    // tossisce: due scossoni e una nuvoletta
    [0, 260].forEach((d) => this.time.delayedCall(d + 500, () => {
      this.tweens.add({ targets: player.sprite, x: 3, duration: 50, yoyo: true, repeat: 1 });
      const puff = this.add.rectangle(player.x + 22 * player.facing, player.y - 56, 6, 6, COLORS.stone).setDepth(990);
      this.tweens.add({ targets: puff, x: puff.x + 20 * player.facing, y: puff.y - 10, alpha: 0, scale: 2, duration: 500, onComplete: () => puff.destroy() });
    }));
    await this.wait(1400);
    caption.setText("INDOSSA BIONOMAD+");
    await this.walk(this.world.points.pack.x - 60, 418, 1100);
    await this.wait(300);
    player.act("act", 500, 0);
    this.tweens.killTweensOf(pack);
    this.tweens.add({ targets: pack, x: player.x - 30, y: player.y - 24, alpha: 0, duration: 400, ease: "Sine.easeIn" });
    await this.wait(380);
    player.setPack(true);
    player.setBaseTexture(characterTexture(this.origin.id, true));
    // lo zaino si aggancia: lampo, scintille e bollicine d'ossigeno
    this.cameras.main.flash(180, 159, 212, 176);
    this.cameras.main.shake(140, 0.004);
    burst(this, player.x - 30 * player.facing, player.y - 50, { colors: [0x9fd4b0, COLORS.paper, 0x7e9c8c], count: 16, spread: 70, gravity: -20 });
    for (let i = 0; i < 8; i += 1) {
      this.time.delayedCall(i * 110, () => {
        const b = this.add.rectangle(player.x + Phaser.Math.Between(-40, 20), player.y - 60, 6, 6, COLORS.paper).setStrokeStyle(2, COLORS.ink).setDepth(990);
        this.tweens.add({ targets: b, y: b.y - Phaser.Math.Between(60, 120), x: b.x + Phaser.Math.Between(-16, 16), alpha: 0, duration: 900, ease: "Sine.easeOut", onComplete: () => b.destroy() });
      });
    }
    this.tweens.addCounter({ from: 0.3, to: 1, duration: 1000, ease: "Cubic.easeOut", onUpdate: (t) => hud.setOxygen(t.getValue()) });
    this.say("Ah, si respira!");
    player.act("cheer", 700, 12);
    await this.wait(1300);
    caption.setText("ESCI DI CASA");
    await this.walk(this.world.points.door.x, 410, 1300);
    // la porta si apre e il cittadino esce
    const opening = this.add.rectangle(this.world.door.x + 42, (this.world.door.top + 380) / 2, 72, 380 - this.world.door.top - 12, COLORS.inkDeep).setDepth(5);
    opening.setScale(0, 1);
    this.tweens.add({ targets: opening, scaleX: 1, duration: 300 });
    // dalla porta entra la luce (velata dallo smog) e si allunga sul pavimento
    const light = this.add.graphics().setDepth(6).setAlpha(0);
    light.fillStyle(COLORS.paper, 0.35);
    for (let i = 0; i < 10; i += 1) light.fillRect(this.world.door.x + 6 - i * 8, 380 + i * 8, 72 + i * 16, 8);
    this.tweens.add({ targets: light, alpha: 1, duration: 400 });
    await this.wait(400);
    // ultimo sguardo alla casa, poi esce rimpicciolendo
    player.facing = -1;
    await this.wait(450);
    player.facing = 1;
    player.act("cheer", 300, 8);
    await this.wait(350);
    this.walking = true;
    this.tweens.add({ targets: player, alpha: 0, scale: 0.8, y: player.y - 14, duration: 500, ease: "Sine.easeIn" });
    await this.wait(600);
    this.finish();
  }

  update(time, delta) {
    if (!this.player) return;
    // camminata "pilotata" dalla cutscene
    turnTo(this.player, this.player.facing, this.walking);
    this.player.setDepth(this.player.y);
    animateWalker(this.player, delta, this.walking ? 0.8 : 0, time);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    goTo(this, "TravelScene");
  }
}

