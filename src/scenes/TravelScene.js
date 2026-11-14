import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { dayTime, failRun, getRun, nextDestination } from "../systems/RunManager.js";
import { buildSkyline } from "../world/skyline.js";
import { Walker } from "../entities/Walker.js";
import { npcKey, operatorKey } from "../art/people.js";
import { brackets, cityHud, C, controls, fadeIn, goTo, marker, o2Hud, skylineLayers, taskPanel, toast, VIEW } from "../ui/hud.js";

const FEET = 764;
const PLACE_NAME = { home: "CASA", office: "UFFICIO", bus: "FERMATA DEL BUS", busstop: "FERMATA DEL BUS", foodtruck: "FOOD TRUCK", street: "STRADA" };

// tragitto a piedi tra un evento e l'altro: si cammina verso destra fino al riquadro
export class TravelScene extends Phaser.Scene {
  constructor() {
    super("TravelScene");
  }

  create() {
    this.run = getRun(this.registry);
    if (!this.run) {
      this.scene.start("MenuScene");
      return;
    }
    this._leaving = false;
    this.origin = getOrigin(this.registry);
    this.dest = nextDestination(this.registry);
    this.finished = this.run.index >= this.run.events.length;
    this.oxygen = this.run.oxygen ?? 1;
    this.done = false;
    this.indoor = false;
    fadeIn(this);
    this.time_ = dayTime(this.run);
    setAmbient(this.time_ === "night" ? "night" : "city");

    const sky = skylineLayers(this, this.origin.id, buildSkyline, { time: this.time_ });
    this.worldW = sky.worldW;
    this.cameras.main.setBounds(0, 0, this.worldW, VIEW.h);

    // qualche passante con il suo zaino, a passo lento
    this.passers = [0, 1, 2, 3, 4, 5].map((i) => {
      const w = new Walker(this, npcKey(this, this.origin.id, i + (this.run.index % 2) * 6), 500 + i * 620 + Math.random() * 200, FEET - (i % 2) * 6, { speed: 70 + Math.random() * 40, depth: 300 + i });
      w.dir = Math.random() < 0.5 ? -1 : 1;
      w.scale = (i % 4 === 3) ? 0.68 : 1;
      w.careIn = 3000 + Math.random() * 6000;
      w.caring = 0;
      w.minX = 40;
      w.maxX = this.worldW - 40;
      return w;
    });

    const opKey = operatorKey(this, this.registry.get("operator") ?? "a", this.origin.id);
    this.player = new Walker(this, opKey, 420, FEET, { sound: true, depth: 500 });
    this.player.maxX = this.worldW - 60;
    this.cameras.main.startFollow(this.player.img, true, 0.08, 0.08, -180, 0);

    this.goalX = this.worldW - 170;
    this.mark = marker(this, this.goalX, PLACE_NAME[this.dest.location] ?? "ARRIVO", { y: FEET - 230, h: 230, icon: this.dest.location ?? "flag" });

    brackets(this);
    cityHud(this, this.origin.id);
    this.o2 = o2Hud(this);
    this.tasks = taskPanel(this);
    this.tasks.set(this.finished ? "FINE GIORNATA" : `VERSO L'EVENTO ${this.run.index + 1}/${this.run.events.length}`, [`VAI A: ${PLACE_NAME[this.dest.location] ?? "ARRIVO"}`], 0);
    this.pad = controls(this, { action: false });
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  // il passante si ferma, si gira verso lo zaino, lo annaffia e la pianta rilascia ossigeno
  care(w) {
    w.caring = 2600;
    w.update(0, 16);
    w.facing = -w.dir;
    w.img.setFlipX(w.facing < 0);
    const s = w.scale;
    const px = w.x + w.dir * 22 * s;
    const top = w.img.y - 150 * s;
    // gocce d'acqua sulla pianta
    for (let i = 0; i < 6; i++) {
      const d = this.add.rectangle(px + (Math.random() - 0.5) * 14, top - 20, 2, 5, 0x5e6d88).setDepth(w.depth + 2);
      this.tweens.add({ targets: d, y: top + 10, alpha: 0, duration: 500, delay: 300 + i * 150, onComplete: () => d.destroy() });
    }
    this.tweens.add({ targets: w.img, scaleY: 0.97, duration: 260, yoyo: true, repeat: 3 });
    this.time.delayedCall(1200, () => w.img.active && w.bubble(8));
  }

  update(time, delta) {
    if (!this.player) return;
    this.passers.forEach((w) => {
      if (w.x <= w.minX + 5) w.dir = 1;
      if (w.x >= w.maxX - 5) w.dir = -1;
      // ogni tanto un passante si ferma a curare il suo zaino-serra
      if (w.caring > 0) {
        w.caring -= delta;
        w.update(0, delta);
        if (w.caring <= 0) {
          w.facing = w.dir;
          w.careIn = 5000 + Math.random() * 8000;
        }
        return;
      }
      w.careIn -= delta;
      if (w.careIn <= 0) this.care(w);
      w.update(w.dir, delta);
    });
    if (this.done) {
      this.o2.set(this.oxygen, time);
      return;
    }
    const input = this.pad.poll();
    this.player.update(input.dir, delta);
    const drain = (this.origin.travelDrainSeconds ?? 300) * 1000;
    this.oxygen = Math.max(0, this.oxygen - delta / drain);
    this.o2.set(this.oxygen, time);
    this.mark.setActive(Math.abs(this.player.x - this.goalX) < 90);

    if (this.oxygen <= 0) {
      this.done = true;
      failRun(this.registry);
      Sfx.gameOver();
      toast(this, "OSSIGENO ESAURITO", { duration: 3000 });
      this.player.faint(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose" })));
      return;
    }
    if (this.player.x >= this.goalX - 20) {
      this.done = true;
      this.run.oxygen = this.oxygen;
      this.run.lastLocation = this.dest.location;
      this.registry.set("run", this.run);
      Sfx.confirm();
      goTo(this, this.finished ? "OutroScene" : "EventScene");
    }
  }
}
