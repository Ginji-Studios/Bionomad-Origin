import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { dayTime, failRun, getRun, nextDestination, cityZone, cityTemp, travelTask } from "../systems/RunManager.js";
import { Bionomad } from "../systems/Bionomad.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { BioPanel, bioKeys } from "../ui/BioPanel.js";
import { notification } from "./EventScene.js";
import { biodomPoster } from "../art/biodom.js";
import { buildSkyline } from "../world/skyline.js";
import { Walker, smoothFollow } from "../entities/Walker.js";
import { npcKey, operatorKey, warmBare } from "../art/people.js";
import { snowfall } from "../world/snow.js";
import { careWithPack } from "../entities/packGesture.js";
import { brackets, cityHud, controls, fadeIn, goTo, marker, o2Hud, statusChip, skylineLayers, taskPanel, toast, VIEW } from "../ui/hud.js";

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

    // fotogrammi della cura dello zaino dei passanti: preparati in sottofondo, uno per fotogramma,
    // così la prima volta che un passante si ferma il gioco non ha un piccolo scatto
    this.warm = this.passers.map((w) => warmBare(this, w.key));
    const opKey = operatorKey(this, this.registry.get("operator") ?? "a", this.origin.id);
    // a fine giornata si torna a casa: all'andata si esce verso destra, al ritorno si cammina
    // verso sinistra (e in casa si rientra dalla porta camminando ancora verso sinistra)
    this.back = this.finished;
    const startX = this.back ? this.worldW - 420 : 420;
    this.player = new Walker(this, opKey, startX, FEET, { sound: true, depth: 500, speed: 250 });
    this.player.maxX = this.worldW - 60;
    if (this.back) {
      this.player.facing = -1;
      this.player.img.setFlipX(true);
    }
    const screenX = this.back ? VIEW.w - 460 : 460;
    this.cameras.main.setScroll(Phaser.Math.Clamp(startX - screenX, 0, this.worldW - VIEW.w), 0);
    smoothFollow(this, this.player, screenX);

    this.goalX = this.back ? 170 : this.worldW - 170;
    this.mark = marker(this, this.goalX, PLACE_NAME[this.dest.location] ?? "ARRIVO", { y: FEET - 230, h: 230, icon: this.dest.location ?? "flag" });

    brackets(this);
    cityHud(this, this.origin.id, { zone: cityZone(this.run) });
    this.o2 = o2Hud(this);
    this.chip = statusChip(this);
    this.tasks = taskPanel(this);
    this.taskTitle = this.finished ? "FINE GIORNATA" : `VERSO L'EVENTO ${this.run.index + 1}/${this.run.events.length}`;
    this.goalLabel = `VAI A: ${PLACE_NAME[this.dest.location] ?? "ARRIVO"}`;
    this.tasks.set(this.taskTitle, [this.goalLabel], 0);
    // il BIONOMAD all'aperto: fuori fa più freddo, di sera ancora di più
    Bionomad.setOutside(cityTemp(this.run, this.time_ === "night" ? 8 : 13));
    this.bio = new BioPanel(this);
    this.bioContext = { kind: "street", night: this.time_ === "night" };
    this.tasks?.setDark(this.bioContext.night);
    this.bioKeys = bioKeys(this);
    this.mode = "play";
    // la cura del tragitto è decisa a inizio giornata (così non si ripete): arriva a metà strada
    this.travelCare = this.finished ? null : travelTask(this.run);
    this.taskAt = this.travelCare ? 0.32 + Math.random() * 0.22 : null;
    // anche in strada ci sono tutti e tre i tasti (◀ ▶ ●), come nelle stanze
    this.pad = controls(this);
    this.pad.highlight(false);
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


  // manifesti BIODOM nel nuovo stile: pochi, a un terzo e a due terzi del percorso
  addPosters() {
    const spots = [0.34, 0.68].map((f, i) => [Math.round(this.worldW * f), (this.run.index * 2 + i) % 4]);
    // i cartelloni stanno DIETRO al marciapiede su cui si cammina: i pali poggiano più indietro
    // (sopra i piedi del personaggio), così chi passa è sempre davanti, mai a metà
    for (const [x, v] of spots) this.add.image(x, FEET - 38, biodomPoster(this, v)).setOrigin(0.5, 1).setScale(0.88).setDepth(150);
  }

  // notifica del BIONOMAD durante il tragitto: ci si ferma e si fa la task
  travelTask() {
    const t = this.travelCare;
    // il personaggio rallenta da solo (niente stop secco) mentre arriva la notifica,
    // poi lo zaino si apre quasi subito
    this.mode = "busy";
    PlantSensors.send("N");
    Sfx.announce?.();
    notification(this, t.line);
    this.tasks.set(this.taskTitle, [t.text, this.goalLabel], 0);
    this.time.delayedCall(900, () => {
      this.mode = "bio";
      this.pad.setVisible(false);
      this.bio.show(t);
    });
  }

  closeTask(ok) {
    this.bio.close();
    this.pad.setVisible(true);
    this.mode = "play";
    this.tasks.set(this.taskTitle, [this.goalLabel], 0);
    if (ok) {
      PlantSensors.send("G");
      Sfx.o2Gain();
      this.oxygen = Math.min(1, this.oxygen + 0.1);
      this.player.o2Pop(1);
    } else {
      Sfx.negligence();
      this.oxygen = Math.max(0, this.oxygen - 0.12);
      this.player.o2Pop(-1);
    }
  }

  update(time, delta) {
    if (!this.player) return;
    // un fotogramma di preparazione per volta
    if (this.warm?.length) {
      const g = this.warm[0];
      if (g.next().done) this.warm.shift();
    }
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
    this.bioKeys(delta);
    Bionomad.update(delta);
    this.chip.update(time);
    const input = this.pad.poll();
    this.player.frozen = this.mode !== "play";
    this.player.update(input.dir, delta);
    if (this.mode === "bio") {
      const r = this.bio.update(delta);
      if (r.negligence === "flood") {
        Sfx.negligence();
        this.oxygen = Math.max(0, this.oxygen - 0.1);
      }
      if (r.done) this.closeTask(true);
      else if (r.failed) this.closeTask(false);
    }
    if (this.mode === "play" && this.taskAt != null) {
      const p = this.back ? (this.worldW - this.player.x) / this.worldW : this.player.x / this.worldW;
      if (p >= this.taskAt) {
        this.taskAt = null;
        this.travelTask();
      }
    }
    const drain = (this.origin.travelDrainSeconds ?? 300) * 1000;
    this.oxygen = Math.max(0, this.oxygen - (delta * Bionomad.stress()) / drain);
    this.o2.set(this.oxygen, time);
    // livello di ossigeno al dispositivo (buzzer quando è basso), solo quando cambia
    const o = Math.round(this.oxygen * 100);
    if (o !== this.lastO2) {
      this.lastO2 = o;
      PlantSensors.send(`O:${o}`);
    }
    const nearGoal = Math.abs(this.player.x - this.goalX) < 90;
    this.mark.setActive(nearGoal);
    this.pad.highlight(nearGoal);

    if (this.oxygen <= 0) {
      this.done = true;
      failRun(this.registry);
      PlantSensors.send("L"); // buzzer: partita persa
      Sfx.gameOver();
      toast(this, "OSSIGENO ESAURITO", { duration: 3000 });
      this.player.faint(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose" })));
      return;
    }
    if (this.mode === "play" && (this.back ? this.player.x <= this.goalX + 20 : this.player.x >= this.goalX - 20)) {
      this.done = true;
      this.run.oxygen = this.oxygen;
      this.run.lastLocation = this.dest.location;
      this.registry.set("run", this.run);
      Sfx.confirm();
      goTo(this, this.finished ? "OutroScene" : "EventScene");
    }
  }
}
