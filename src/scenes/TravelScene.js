import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { dayTime, failRun, getRun, nextDestination, cityZone } from "../systems/RunManager.js";
import { buildSkyline, paint } from "../world/skyline.js";
import { posterArt } from "../art/places.js";
import { Walker, smoothFollow } from "../entities/Walker.js";
import { npcKey, operatorKey } from "../art/people.js";
import { snowfall } from "../world/snow.js";
import { careWithPack } from "../entities/packGesture.js";
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

    const sky = skylineLayers(this, this.origin.id, buildSkyline, { time: this.time_, zone: cityZone(this.run) });
    this.worldW = sky.worldW;
    this.cameras.main.setBounds(0, 0, this.worldW, VIEW.h);

    // manifesti BIODOM lungo la strada: pannelli su pali e cartelloni, nel retino della palette
    this.addPosters();
    // a Reykjavík nevica
    if (this.origin.id === "reykjavik") snowfall(this);

    // qualche passante con il suo zaino, a passo lento
    this.passers = [0, 1, 2, 3, 4, 5].map((i) => {
      const w = new Walker(this, npcKey(this, this.origin.id, i + (this.run.index % 2) * 6), 500 + i * 620 + Math.random() * 200, FEET - (i % 2) * 6, { speed: 130 + Math.random() * 30, depth: 300 + i });
      w.dir = Math.random() < 0.5 ? -1 : 1;
      w.scale = (i % 4 === 3) ? 0.68 : 1;
      w.careIn = 3000 + Math.random() * 6000;
      w.caring = 0;
      w.minX = 40;
      w.maxX = this.worldW - 40;
      return w;
    });

    const opKey = operatorKey(this, this.registry.get("operator") ?? "a", this.origin.id);
    this.player = new Walker(this, opKey, 420, FEET, { sound: true, depth: 500, speed: 255 });
    this.player.maxX = this.worldW - 60;
    smoothFollow(this, this.player, 460);

    this.goalX = this.worldW - 170;
    this.mark = marker(this, this.goalX, PLACE_NAME[this.dest.location] ?? "ARRIVO", { y: FEET - 230, h: 230, icon: this.dest.location ?? "flag" });

    brackets(this);
    cityHud(this, this.origin.id, { zone: cityZone(this.run) });
    this.o2 = o2Hud(this);
    this.tasks = taskPanel(this);
    this.tasks.set(this.finished ? "FINE GIORNATA" : `VERSO L'EVENTO ${this.run.index + 1}/${this.run.events.length}`, [`VAI A: ${PLACE_NAME[this.dest.location] ?? "ARRIVO"}`], 0);
    this.pad = controls(this, { action: false });
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  // il passante si ferma, si gira verso lo zaino, lo annaffia e la pianta rilascia ossigeno
  care(w) {
    // si ferma e cura la capsula esattamente come il protagonista nel menu
    w.caring = 4600;
    w.update(0, 16);
    w.vx = 0;
    careWithPack(this, w);
  }


  addPosters() {
    const kinds = [
      { key: "poster_1", w: 64, h: 90, tall: true },
      { key: "poster_4", w: 196, h: 108 },
      { key: "poster_2", w: 64, h: 90, tall: true },
      { key: "poster_5", w: 160, h: 108 },
      { key: "poster_3", w: 64, h: 90, tall: true }
    ];
    const S = 1.25;
    // pochi e messi apposta: un cartellone a un terzo del percorso e un pannello
    // verticale a due terzi, lontani dalla partenza e dall'arrivo
    const spots = [
      [Math.round(this.worldW * 0.34), kinds[[1, 3][this.run.index % 2]]],
      [Math.round(this.worldW * 0.68), kinds[[0, 2, 4][this.run.index % 3]]]
    ];
    for (const [x, k] of spots) {
      const tex = `street_${k.key}`;
      const legs = k.tall ? 70 : 96;
      const W = Math.round((k.w + 16) * S);
      const H = Math.round((k.h + 16 + legs) * S);
      if (!this.textures.exists(tex))
        this.textures.addCanvas(
          tex,
          paint(W, H, S, (T) => {
            const { X, G } = T;
            // pali
            X.fillStyle = G(0.14);
            if (k.tall) X.fillRect(k.w / 2 + 5, k.h + 8, 6, legs + 8);
            else {
              X.fillRect(18, k.h + 8, 6, legs + 8);
              X.fillRect(k.w - 8, k.h + 8, 6, legs + 8);
            }
            // cornice del pannello
            X.fillStyle = G(0.22);
            X.fillRect(0, 0, k.w + 16, k.h + 16);
            posterArt(T, k.key, 8, 8, k.w, k.h);
            // lampadina che illumina il pannello
            X.fillStyle = G(0.95);
            X.fillRect((k.w + 16) / 2 - 6, 0, 12, 3);
          }, { cell: 1, seedValue: 5 })
        );
      this.add.image(x, FEET + 4, tex).setOrigin(0.5, 1).setDepth(150);
    }
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
