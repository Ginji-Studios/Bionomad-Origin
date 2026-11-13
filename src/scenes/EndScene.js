import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { EVENTS } from "../config/events.js";
import { getOrigin } from "../config/origins.js";
import { animateWalker, faint, Player, turnTo } from "../entities/Player.js";
import { getRun, startRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { buildHouse, buildStreet } from "../world/locations.js";
import { brandMarks, ditherRect, addHud, addObjectiveBox, bodyText, burst, COLORS, drawPanel, dropShadow, fadeIn, goTo, pixelDisc, pixelText, textChip } from "../ui/theme.js";

// esito della run
export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create(data = {}) {
    this.indoor = false;
    this.win = data.result === "win";
    this.fainted = Boolean(data.fainted);
    this.run = getRun(this.registry);
    this.origin = getOrigin(this.registry);
    this.summaryShown = false;
    this.walking = false;
    this.walkSpeed = 0.8;
    this.bubbles = null;
    fadeIn(this, 500);

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bg).setDepth(-100);

    this.wait = (ms) => new Promise((resolve) => this.time.delayedCall(ms, resolve));
    this.walk = (x, duration) =>
      new Promise((resolve) => {
        this.player.facing = x >= this.player.x ? 1 : -1;
        this.walking = true;
        this.tweens.add({
          targets: this.player,
          x,
          duration,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.walking = false;
            resolve();
          }
        });
      });

    this.skip = textChip(this, width - 14, height - 30, "SPAZIO  salta", { size: 20, originX: 1, depth: 1500 });
    this.input.keyboard.on("keydown-SPACE", () => this.showSummary());

    if (this.win) this.playWin();
    else this.playLose();
  }

  update(time, delta) {
    if (!this.player) return;
    turnTo(this.player, this.player.facing, this.walking);
    this.player.setDepth(this.player.y);
    animateWalker(this.player, delta, this.walking ? this.walkSpeed : 0, time);
  }

  // fine giornata

  async playWin() {
    const world = buildHouse(this, { evening: true, originId: this.origin.id });
    setAmbient(null);
    this.indoor = true;
    this.hud = addHud(this, { oxygen: this.run?.oxygen ?? 0.5, location: this.origin.city, flag: this.origin.flag });
    const caption = addObjectiveBox(this, "20:30 · RITORNO A CASA");
    this.caption = caption;

    // home Hub accanto alla serra
    // l'Home Hub della casa: lo zaino si aggancia alla sua base
    const homeHub = world.hub;
    const hubX = homeHub.center;
    const glow = this.add
      .rectangle(homeHub.glass.x + homeHub.glass.w / 2, homeHub.glass.y + homeHub.glass.h / 2, homeHub.glass.w, homeHub.glass.h, 0x9fd4b0, 0)
      .setDepth(homeHub.graphics.depth + 1);

    // la porta è aperta
    const door = world.door;
    const opening = this.add.rectangle(door.x + 42, (door.top + 380) / 2, 72, 380 - door.top - 12, COLORS.inkDeep).setDepth(5);
    this.player = new Player(this, world.points.door.x, 440, { texture: characterTexture(this.origin.id, true), withPack: true, floor: world.floor });
    this.player.frozen = true;
    this.player.facing = -1;
    this.player.scaleX = -1;
    this.player.setAlpha(0);
    this.tweens.add({ targets: this.player, alpha: 1, duration: 400 });

    await this.wait(500);
    if (this.summaryShown) return;
    this.tweens.add({ targets: opening, scaleX: 0, duration: 300 });
    await this.walk(hubX + 150, 1800);
    if (this.summaryShown) return;
    await this.wait(300);

    // lo zaino viene agganciato all'Home Hub
    caption.setText("AGGANCIA LO ZAINO ALL'HOME HUB");
    this.player.act("act", 600, 0);
    const pack = this.add.image(this.player.x + 30, this.player.y - 24, "pack").setOrigin(0.5, 1).setScale(4).setDepth(450).setFlipX(true);
    this.player.pack.setVisible(false);
    this.tweens.add({ targets: pack, x: hubX + 60, y: homeHub.glass.y + homeHub.glass.h + 50, duration: 600, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: pack, scale: 2.5, alpha: 0, delay: 500, duration: 300 });
    await this.wait(800);
    if (this.summaryShown) return;
    this.player.setBaseTexture(characterTexture(this.origin.id, false));
    this.tweens.add({ targets: glow, fillAlpha: 0.35, duration: 400, yoyo: true, repeat: 2 });
    this.cameras.main.flash(200, 159, 212, 176);
    this.cameras.main.shake(160, 0.004);
    burst(this, hubX + 60, homeHub.glass.y + homeHub.glass.h, { colors: [0x9fd4b0, COLORS.paper, 0x7e9c8c], count: 18, spread: 90, gravity: -10 });

    // L'ossigeno si riempie, bollicine dalla serra
    caption.setText("L'OSSIGENO SI RIEMPIE");
    this.tweens.addCounter({ from: this.hud.oxygen, to: 1, duration: 1600, ease: "Cubic.easeOut", onUpdate: (t) => this.hud.setOxygen(t.getValue()) });
    this.bubbles = this.time.addEvent({ delay: 160, repeat: 18, callback: () => this.bubble(hubX + Phaser.Math.Between(-60, 60), homeHub.glass.y + 60) });
    await this.wait(1000);
    if (this.summaryShown) return;
    this.say("Che giornata... ma ce l'abbiamo fatta.");
    [0, 450, 900].forEach((delay) => this.time.delayedCall(delay, () => this.player.act("cheer", 400, 16)));
    // pioggia di foglie e scritta che rimbalza, lettera per lettera
    const { width, height } = this.scale;
    this.time.addEvent({
      delay: 70,
      repeat: 44,
      callback: () => {
        const leaf = this.add.rectangle(Phaser.Math.Between(20, width - 20), 40, 8, 4, Phaser.Utils.Array.GetRandom([0x7e9c8c, 0x5c7a6b, 0x9fd4b0, COLORS.paper])).setDepth(1250);
        this.tweens.add({ targets: leaf, y: height + 10, x: leaf.x + Phaser.Math.Between(-80, 80), duration: Phaser.Math.Between(1600, 2600), ease: "Sine.easeIn", onComplete: () => leaf.destroy() });
        this.tweens.add({ targets: leaf, scaleX: -1, duration: 260, yoyo: true, repeat: -1 });
      }
    });
    await this.wait(900);
    if (this.summaryShown) return;
    Sfx.win();
    const letters = "FINE GIORNATA".split("");
    const size = 40;
    const startX = width / 2 - (letters.length * size) / 2 + size / 2;
    // fascia scura dietro la scritta, così resta leggibile su qualsiasi sfondo
    const band = this.add.rectangle(width / 2, 168, width, 84, COLORS.inkDeep, 0.88).setDepth(1290);
    const line = this.add.rectangle(width / 2, 208, width, 4, COLORS.red).setDepth(1291);
    band.scaleY = 0;
    line.scaleX = 0;
    this.finaleTitle = [band, line];
    this.tweens.add({ targets: band, scaleY: 1, duration: 220, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: line, scaleX: 1, duration: 420, delay: 100, ease: "Cubic.easeOut" });
    letters.forEach((char, i) => {
      if (char === " ") return;
      const l = pixelText(this, startX + i * size, -60, char, { size: 32, color: COLORS.paper, origin: 0.5 }).setDepth(1300);
      l.setShadow(3, 3, "#2c566a", 0, false, true);
      this.finaleTitle.push(l);
      this.tweens.add({ targets: l, y: 166, duration: 600, delay: i * 70, ease: "Bounce.easeOut" });
      this.tweens.add({ targets: l, y: 162, duration: 400, delay: 1400 + i * 70, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    await this.wait(2600);
    this.showSummary();
  }

  // game over

  async playLose() {
    const { width, height } = this.scale;
    buildStreet(this, this.origin.id, { evening: true });
    setAmbient("night");
    this.hud = addHud(this, { oxygen: Math.max(0.2, this.run?.oxygen ?? 0.3), location: this.origin.city, flag: this.origin.flag });
    const caption = addObjectiveBox(this, "OSSIGENO IN ESAURIMENTO");
    this.caption = caption;

    this.player = new Player(this, 80, 450, { texture: characterTexture(this.origin.id, true), withPack: true, floor: [400, 482] });
    this.player.frozen = true;

    // allarme rosso a impulsi
    const alarm = this.add.rectangle(width / 2, height / 2, width, height, COLORS.red, 0).setDepth(900);

    if (this.fainted) {
      // è già svenuto nella scena precedente: resta a terra con la pianta rovesciata
      this.player.setPosition(width / 2 - 40, 456);
      this.hud.setOxygen(0);
      caption.setText("OSSIGENO ESAURITO");
      await faint(this.player, { instant: true });
    } else {
      this.tweens.add({ targets: alarm, fillAlpha: 0.22, duration: 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      // cammina sempre più lento mentre l'ossigeno scende
      this.tweens.add({ targets: this, walkSpeed: 0.2, duration: 2400 });
      this.tweens.addCounter({ from: this.hud.oxygen, to: 0, duration: 2600, ease: "Sine.easeIn", onUpdate: (t) => this.hud.setOxygen(t.getValue()) });
      await this.walk(width / 2, 2600);
      if (this.summaryShown) return;

      // il cittadino sviene e la pianta cade a terra
      caption.setText("OSSIGENO ESAURITO");
      this.tweens.killTweensOf(alarm);
      this.tweens.add({ targets: alarm, fillAlpha: 0, duration: 400 });
      await faint(this.player);
    }
    if (this.summaryShown) return;
    const dark = this.add.rectangle(width / 2, height / 2, width, height, COLORS.inkDeep, 0).setDepth(1200);
    this.tweens.add({ targets: dark, fillAlpha: 0.72, duration: 900, delay: 300 });
    await this.wait(1100);
    if (this.summaryShown) return;

    // "GAME OVER" lettera per lettera
    Sfx.gameOver();
    const letters = "GAME OVER".split("");
    const size = 48;
    const startX = width / 2 - (letters.length * size) / 2 + size / 2;
    letters.forEach((char, i) => {
      if (char === " ") return;
      const l = pixelText(this, startX + i * size, -60, char, { size, color: COLORS.paper, origin: 0.5 }).setDepth(1300);
      l.setShadow(4, 4, "#b4553f", 0, false, true);
      this.tweens.add({ targets: l, y: height / 2 - 40, duration: 700, delay: i * 90, ease: "Bounce.easeOut" });
    });
    await this.wait(900);
    const sub = pixelText(this, width / 2, height / 2 + 20, "FLUSSO INTERROTTO", { size: 16, color: COLORS.red, origin: 0.5 }).setDepth(1300).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 300 });
    this.tweens.add({ targets: sub, alpha: 0.4, duration: 500, delay: 300, yoyo: true, repeat: -1 });
    await this.wait(1800);
    this.showSummary();
  }

  // effetti

  bubble(x, y) {
    const b = this.add.graphics().setDepth(950);
    const r = Phaser.Math.Between(3, 6) * 2;
    pixelDisc(b, 0, 0, r, COLORS.ink, 1, 2);
    pixelDisc(b, 0, 0, r - 2, COLORS.paper, 1, 2);
    b.setPosition(x, y);
    this.tweens.add({ targets: b, y: y - Phaser.Math.Between(140, 220), alpha: 0, duration: 2200, ease: "Sine.easeOut", onComplete: () => b.destroy() });
    this.tweens.add({ targets: b, x: x + Phaser.Math.Between(-30, 30), duration: 1100, yoyo: true, ease: "Sine.easeInOut" });
  }

  say(text) {
    const bubble = this.add.container(this.player.x, this.player.y - 118).setDepth(980);
    const label = bodyText(this, 0, 0, text, { size: 22, color: COLORS.ink, origin: 0.5 });
    const w = label.width + 20;
    const g = drawPanel(this.add.graphics(), -w / 2, -15, w, 30, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(-4, 15, 8, 6);
    bubble.add([g, label]);
    bubble.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 220, ease: "Back.easeOut" });
    this.tweens.add({ targets: bubble, alpha: 0, duration: 250, delay: 1800, onComplete: () => bubble.destroy() });
  }

  // recap animato

  // testo che compare lettera per lettera
  typewrite(label, full, speed = 18) {
    label.setText("");
    let i = 0;
    return new Promise((resolve) => {
      this.time.addEvent({
        delay: speed,
        repeat: full.length - 1,
        callback: () => {
          i += 1;
          label.setText(full.slice(0, i));
          if (i >= full.length) resolve();
        }
      });
    });
  }

  async showSummary() {
    if (this.summaryShown) return;
    this.summaryShown = true;
    // la scritta "FINE GIORNATA" lascia spazio al recap
    (this.finaleTitle ?? []).forEach((o) => {
      this.tweens.killTweensOf(o);
      this.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() });
    });
    this.skip.g.destroy();
    this.skip.label.destroy();
    this.caption?.hide();

    const { width, height } = this.scale;
    const win = this.win;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, COLORS.inkDeep, 0).setDepth(1990);
    this.tweens.add({ targets: dim, fillAlpha: 0.4, duration: 400 });

    const w = 760;
    const h = 380;
    const x = width / 2 - w / 2;
    const y = 76;
    const box = this.add.container(0, 0).setDepth(2000);
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 30);
    box.add([brandMarks(this, x, y, w, h, { color: COLORS.paper, alpha: 0.8 }), g]);
    box.add(pixelText(this, x + 14, y + 11, "RECAP DELLA GIORNATA", { size: 8, color: COLORS.paper }));
    box.add(pixelText(this, x + w - 14, y + 11, this.origin.city, { size: 8, color: COLORS.steelLight, origin: [1, 0] }));

    // il pannello si "apre" dal centro
    box.setScale(1, 0.02).setY(y + h / 2 - (y + h / 2) * 0.02);
    await new Promise((resolve) => this.tweens.add({ targets: box, scaleY: 1, y: 0, duration: 380, ease: "Cubic.easeOut", onComplete: resolve }));

    // badge A / B che "timbra"
    const badge = this.add.container(x + 50, y + 70);
    const bg = pixelDisc(this.add.graphics(), 0, 0, 24, win ? 0x5c7a6b : COLORS.red, 1, 2);
    badge.add([bg, pixelText(this, 0, 0, win ? "A" : "B", { size: 16, color: COLORS.paper, origin: 0.5 })]);
    badge.setScale(3).setAlpha(0);
    box.add(badge);
    this.tweens.add({ targets: badge, scale: 1, alpha: 1, duration: 260, ease: "Back.easeOut" });
    this.cameras.main.shake(120, 0.003);

    const title = pixelText(this, x + 88, y + 56, "", { size: 16 });
    const text = bodyText(this, x + 88, y + 82, "", { size: 22, color: COLORS.steel, wrap: w - 110, lineSpacing: -2 });
    box.add([title, text]);
    await this.typewrite(title, win ? "FINE GIORNATA" : "TASK FALLITE · GAME OVER", 40);
    await this.typewrite(
      text,
      win
        ? "Le tre task sono risolte una dopo l'altra. L'ossigeno si riempie e il cittadino rientra a casa, lieto di aver concluso la sua routine nel migliore dei modi."
        : "Il cittadino non è riuscito a portare a termine una task: l'ossigeno è finito. Riprova, la tua pianta ti aspetta.",
      12
    );

    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + 24, y + 156, w - 48, 2);
    box.add(pixelText(this, x + 24, y + 172, "TAPPE DELLA RUN", { size: 8, color: COLORS.steel }));

    // le tappe compaiono una alla volta, con il timbro ✓ / ✗
    const events = this.run?.events ?? [];
    for (let i = 0; i < events.length; i += 1) {
      const id = events[i];
      const result = this.run.results[i];
      const rowY = y + 194 + i * 40;
      const ok = result === "ok";
      const rowColor = ok ? COLORS.ink : result === "fail" ? COLORS.red : COLORS.stone;
      const row = this.add.container(-30, 0).setAlpha(0);
      // linea tratteggiata che unisce le tappe, come una timeline
      if (i > 0) {
        const link = this.add.graphics();
        link.fillStyle(COLORS.panelLight, 1);
        for (let ly = rowY - 10; ly < rowY - 1; ly += 4) link.fillRect(x + 37, ly, 2, 2);
        box.add(link);
      }
      const cell = drawPanel(this.add.graphics(), x + 24, rowY, 28, 28, { fill: COLORS.paper, border: rowColor });
      const label = bodyText(this, x + 64, rowY + 2, `${EVENTS[id].time}  ${EVENTS[id].title}`, { size: 24, color: rowColor, fit: w - 340 });
      row.add([cell, label]);
      box.add(row);
      this.tweens.add({ targets: row, x: 0, alpha: 1, duration: 260, ease: "Cubic.easeOut" });
      await this.wait(300);
      if (result) {
        const stamp = this.add.container(x + 38, rowY + 14);
        const sbg = drawPanel(this.add.graphics(), -14, -14, 28, 28, { fill: ok ? COLORS.ink : COLORS.red, border: rowColor });
        stamp.add([sbg, this.add.image(0, 0, ok ? "check" : "cross").setScale(3)]);
        stamp.setScale(2.4).setAlpha(0);
        box.add(stamp);
        this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 200, ease: "Quad.easeIn" });
        await this.wait(160);
        this.cameras.main.shake(80, 0.002);
      }
      await this.wait(220);
    }

    // colonna destra: scheda con ossigeno, esito e cittadino
    const cx0 = x + w - 282;
    const card = this.add.graphics();
    card.fillStyle(0xe6e9e6, 1);
    card.fillRect(cx0, y + 164, 258, 206);
    card.fillStyle(COLORS.panelLight, 1);
    card.fillRect(cx0, y + 164, 258, 2);
    card.fillRect(cx0, y + 368, 258, 2);
    card.fillRect(cx0, y + 164, 2, 206);
    card.fillRect(cx0 + 256, y + 164, 2, 206);
    box.add(card);

    // barra O2 finale a segmenti, come quella del gioco, con percentuale che conta
    const o2 = { value: 0 };
    const bar = this.add.graphics();
    const percent = pixelText(this, cx0 + 244, y + 182, "0%", { size: 8, color: COLORS.ink, origin: [1, 0] });
    box.add([pixelText(this, cx0 + 14, y + 182, "OSSIGENO FINALE", { size: 8, color: COLORS.steel }), percent, bar]);
    const finalValue = win ? 1 : 0;
    const SEGS = 20;
    await new Promise((resolve) =>
      this.tweens.add({
        targets: o2,
        value: win ? 1 : 0.02,
        duration: 1000,
        ease: "Cubic.easeOut",
        onUpdate: () => {
          bar.clear();
          drawPanel(bar, cx0 + 14, y + 198, 230, 22, { fill: COLORS.paper, border: COLORS.ink });
          const lit = Math.max(win ? 0 : 1, Math.round(SEGS * o2.value));
          for (let k = 0; k < SEGS; k += 1) {
            bar.fillStyle(k < lit ? (win ? COLORS.steel : COLORS.red) : COLORS.panelLight, 1);
            bar.fillRect(cx0 + 18 + k * 11, y + 202, 9, 14);
          }
          percent.setText(`${Math.round(o2.value * 100 * (finalValue || 1))}%`);
        },
        onComplete: resolve
      })
    );
    if (!win) percent.setText("0%");

    // esito: etichetta piena (verde conforme, ruggine non conforme o con scostamenti)
    // il flusso interrotto (game over) rende l'operatore non conforme
    const status = win ? "OPERATORE CONFORME" : "OPERATORE NON CONFORME";
    const pillColor = win ? 0x5c7a6b : COLORS.red;
    const pillText = bodyText(this, 0, 0, status, { size: 20, color: COLORS.paper, fit: 200 });
    const pill = this.add.graphics();
    const pw = Math.round(pillText.width + 34);
    pill.fillStyle(pillColor, 1);
    pill.fillRect(cx0 + 14, y + 230, pw, 24);
    pill.fillStyle(COLORS.paper, 1);
    // spunta o croce a pixel prima del testo
    if (!win) {
      for (let k = 0; k < 4; k += 1) {
        pill.fillRect(cx0 + 22 + k * 2, y + 237 + k * 2, 2, 2);
        pill.fillRect(cx0 + 28 - k * 2, y + 237 + k * 2, 2, 2);
      }
    } else {
      [[0, 4], [2, 6], [4, 4], [6, 2], [8, 0]].forEach(([dx, dy]) => pill.fillRect(cx0 + 21 + dx, y + 237 + dy, 2, 2));
    }
    pillText.setPosition(cx0 + 38, y + 230 + Math.round((24 - pillText.height) / 2));
    const neglect = this.add.container(0, 0).setAlpha(0);
    neglect.add([pill, pillText]);
    box.add(neglect);
    this.tweens.add({ targets: neglect, alpha: 1, duration: 260 });

    // pedana a retino sotto il cittadino
    const ped = this.add.graphics();
    ped.fillStyle(COLORS.panelLight, 1);
    ped.fillRect(cx0 + 80, y + 362, 100, 3);
    ditherRect(ped, cx0 + 80, y + 365, 100, 3, COLORS.panelLight, 6, 2);
    box.add(ped);

    // il cittadino saluta (o resta a terra)
    const hero = this.add.image(cx0 + 130, y + 362, characterTexture(this.origin.id, !win)).setOrigin(0.5, 1).setScale(4).setAlpha(0);
    box.add(hero);
    this.tweens.add({ targets: hero, alpha: 1, duration: 300 });
    if (win) {
      const base = characterTexture(this.origin.id, false);
      this.time.addEvent({ delay: 420, loop: true, callback: () => hero.setTexture(hero.texture.key === base ? `${base}_cheer` : base) });
      this.tweens.add({ targets: hero, y: hero.y - 6, duration: 210, yoyo: true, repeat: -1, ease: "Quad.easeOut" });
    } else {
      hero.setTint(0x9fb4c2).setScale(4, 3.2);
    }
    await this.wait(400);

    const a = textChip(this, x, height - 36, "INVIO  nuova run", { size: 22, depth: 2001 });
    const b = textChip(this, x + a.w + 16, height - 36, "ESC  menu", { size: 22, depth: 2001 });
    [a.g, a.label, b.g, b.label].forEach((o) => {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 300 });
    });

    this.input.keyboard.once("keydown-ENTER", () => {
      startRun(this.registry, this.origin.id);
      goTo(this, "IntroScene");
    });
    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }
}
