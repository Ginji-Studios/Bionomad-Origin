import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { EMERGENCY_ACTIONS } from "../config/events.js";
import { completeEvent, currentEvent, dayTime, failRun, getRun, cityZone } from "../systems/RunManager.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace, busSprite, OUTDOOR } from "../art/places.js";
import { snowfall } from "../world/snow.js";
import { Walker, smoothFollow } from "../entities/Walker.js";
import { npcKey, operatorKey } from "../art/people.js";
import { PlantPanel } from "../ui/PlantPanel.js";
import { box, brackets, cityHud, button, C, canvasImage, controls, fadeIn, goTo, HEX, marker, o2Hud, skylineLayers, taskPanel, toast, txt, VIEW } from "../ui/hud.js";

const NEAR = 80;
const STEP_BONUS = 0.04;
const EVENT_BONUS = 0.08;
const FEET = 764;
// dove guarda la città dalle finestre / all'aperto (frazione della strada)
const VIEWPOINT = { home: 0.1, office: 0.3, bus: 0.5, busstop: 0.62, foodtruck: 0.8 };
// passanti fermi nei luoghi
const EXTRAS = { busstop: [["man", 2]], bus: [[260, 1], [880, 3], [1060, 4]], office: [[230, 0]] };
// step che si fanno tenendo premuto ●
const HOLD_TYPES = new Set(["hold", "sit"]);
// step che si completano appena si arriva
const REACH_TYPES = new Set(["reach"]);

export class EventScene extends Phaser.Scene {
  constructor() {
    super("EventScene");
  }

  create() {
    this.run = getRun(this.registry);
    this.event = currentEvent(this.registry);
    if (!this.run || !this.event) {
      this.scene.start("MenuScene");
      return;
    }
    this._leaving = false;
    this.origin = getOrigin(this.registry);
    this.mode = "play";
    this.stepIndex = 0;
    this.holdMs = 0;
    this.oxygen = this.run.oxygen ?? 1;
    this.simBase = 22;
    fadeIn(this);

    const loc = this.event.location;
    const outdoor = OUTDOOR.has(loc);
    this.indoor = !outdoor;
    this.time_ = dayTime(this.run);
    setAmbient(outdoor ? (this.time_ === "night" ? "night" : "city") : null);
    this.events.once("shutdown", () => PlantSensors.send("E0"));
    if (outdoor && this.origin.id === "reykjavik") snowfall(this, { intensity: 0.8 });

    // città sullo sfondo
    const sky = skylineLayers(this, this.origin.id, buildSkyline, { time: this.time_, zone: cityZone(this.run) });
    this.wide = loc === "street";
    const opKey = operatorKey(this, this.registry.get("operator") ?? "a", this.origin.id);
    if (this.wide) {
      // emergenza: strada lunga fino a casa
      this.worldW = sky.worldW;
      this.cameras.main.setBounds(0, 0, this.worldW, VIEW.h);
      this.points = { home: this.worldW - 160 };
    } else {
      this.worldW = VIEW.w;
      const cam = Math.round((sky.worldW - VIEW.w) * (VIEWPOINT[loc] ?? 0.4));
      this.cameras.main.setScroll(cam, 0);
      if (!outdoor) {
        // interno: il cielo resta fermo, la città si vede solo dalle finestre
      }
      const place = buildPlace(loc, this.origin.id);
      canvasImage(this, `place_${loc}_${this.origin.id}`, place.canvas).setScrollFactor(0).setDepth(0);
      this.points = place.points;
    }
    const sf = this.wide ? 1 : 0;

    (EXTRAS[loc] ?? []).forEach(([at, key]) => {
      const x = typeof at === "number" ? at : this.points[at];
      const npc = this.add.image(x, FEET, `${npcKey(this, this.origin.id, 6 + key)}_idle`).setOrigin(0.5, 1).setDepth(400).setScrollFactor(sf).setFlipX(true);
      this.add.ellipse(x, FEET - 6, 70, 12, C.c0, 0.55).setDepth(399).setScrollFactor(sf);
      if (at === "man") this.man = npc;
    });

    this.player = new Walker(this, opKey, 420, FEET, { sound: true, indoor: this.indoor, speed: 255 });
    this.player.img.setScrollFactor(sf);
    this.player.shadow.setScrollFactor(sf);
    this.player.maxX = this.worldW - 60;
    if (this.wide) smoothFollow(this, this.player, 480);

    // interfaccia
    brackets(this);
    // al food truck niente etichette dei monumenti: finirebbero sopra il furgone
    cityHud(this, this.origin.id, { labels: (outdoor || this.wide) && loc !== "foodtruck", zone: cityZone(this.run) });
    this.o2 = o2Hud(this);
    this.tasks = taskPanel(this);
    this.pad = controls(this);
    this.mark = marker(this, 0, "", { y: FEET - 230, h: 230 });
    this.mark.c.setScrollFactor(sf).setVisible(false);
    this.plantPanel = new PlantPanel(this);
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));

    this.stepLabels = this.event.steps.map((s) => s.text.replace(/^[+!]\s*/, ""));
    if (this.event.emergency) this.startEmergency();
    this.startStep();
  }

  get step() {
    return this.event.steps[this.stepIndex];
  }

  refreshTasks(progress = null) {
    const title = `EVENTO ${this.run.index + 1}/${this.run.events.length} · ${this.event.title}`;
    if (this.step?.type === "emergency") {
      const need = this.step.cures;
      const done = Math.min(this.cures ?? 0, need);
      this.tasks.set(title, [done < need ? `CURE ${done}/${need}` : "PIANTA STABILE", "TORNA A CASA"], done < need ? 0 : 1, { progress });
      return;
    }
    this.tasks.set(title, this.stepLabels, this.stepIndex, { progress });
  }

  startStep() {
    const step = this.step;
    this.holdMs = 0;
    this.refreshTasks();
    const target = step.target && this.points[step.target];
    this.mark.c.setVisible(Boolean(target));
    if (target) {
      this.mark.c.x = target;
      this.mark.setLabel(this.markLabel(step), step.target);
      this.mark.setActive(false);
    }
    if (step.type === "plant") this.openPlant(step);
    if (step.type === "prune") this.openPrune();
    if (step.type === "busLeaves") this.busLeaves();
    if (step.type === "emergency") {
      this.cures = 0;
      this.emTimer = 0;
      this.mark.c.x = this.points.home;
      this.mark.setLabel("CASA", "home");
      this.mark.c.setVisible(true);
      this.refreshTasks();
    }
  }

  markLabel(step) {
    const names = { can: "ANNAFFIATOIO", hub: "HUB", door: "USCITA", ac: "CONDIZIONATORE", counter: "FOOD TRUCK", charger: "COLONNINA", bench: "PANCHINA", man: "SIGNORE", home: "CASA" };
    return names[step.target] ?? "";
  }

  // ---------- pianta ----------

  openPlant(step, emergency = false) {
    this.mode = "plant";
    this.plantEmergency = emergency;
    this.simBase = step.baseTemperature ?? 22;
    const irrigation = PlantSensors.state.irrigation;
    PlantSensors.resetSimulation(this.simBase, { ambientLight: step.setup === "covered" ? 0.06 : 0.6 });
    if (step.sensor === "irrigation" && step.on === false) PlantSensors.state.irrigation = irrigation;
    if (step.sensor === "vials") {
      const colors = Phaser.Utils.Array.Shuffle([1, 2, 3]);
      step = { ...step, required: colors.slice(0, 2) };
      if (step.setup === "wrongVial" && !PlantSensors.state.connected) PlantSensors.state.slots = [colors[2], 0];
    }
    if (step.setup === "leverOpen" && !PlantSensors.state.connected) PlantSensors.state.irrigation = true;
    this.plantPanel.show(step, { timeoutMs: step.timeoutMs ?? 0, emergency });
    this.pad.setVisible(false);
  }

  closePlant(success) {
    this.plantPanel.close();
    this.pad.setVisible(true);
    if (success) PlantSensors.send("G");
    if (this.plantEmergency) {
      this.plantEmergency = false;
      this.mode = "play";
      this.emTimer = 0;
      if (success) {
        this.cures += 1;
        // in emergenza curare la pianta rende molto ossigeno: +14% a cura (uguale in ogni città),
        // e un premio di +20% quando la pianta è di nuovo stabile
        const left = this.step.cures - this.cures;
        const bonus = left > 0 ? 0.14 : 0.34;
        this.addOxygen(bonus, true);
        this.player.cheer();
        this.player.bubble?.(10);
        Sfx.o2Gain();
        toast(this, left > 0 ? `CURA RIUSCITA · +${Math.round(bonus * 100)}% O₂ · NE MANCANO ${left}` : `PIANTA STABILE · +${Math.round(bonus * 100)}% O₂ · VAI A CASA`, { duration: 1600 });
      } else {
        this.addOxygen(-0.15, true);
        Sfx.negligence();
        this.cameras.main.shake(200, 0.006);
        toast(this, "TROPPO TARDI · IL PARASSITA AVANZA", { duration: 1600 });
      }
      this.refreshTasks();
      return;
    }
    // chiuso il pannello si torna a giocare: senza questo il personaggio restava bloccato
    // ("freeze") sulla task successiva, ad esempio "ESCI DALL'UFFICIO"
    this.mode = "play";
    this.completeStep();
  }

  negligence(type) {
    const messages = { forgot: "NEGLIGENZA · NON L'HAI CURATA IN TEMPO", overheat: "NEGLIGENZA · TROPPO CALORE", flood: "NEGLIGENZA · LEVA DELL'ACQUA APERTA", wrongVial: "NEGLIGENZA · FIALA SBAGLIATA" };
    const cost = { forgot: 0.18, overheat: 0.12, flood: 0.2, wrongVial: 0.12 }[type] ?? 0.1;
    Sfx.negligence();
    this.addOxygen(-cost, true);
    this.cameras.main.shake(220, 0.006);
    toast(this, messages[type] ?? "NEGLIGENZA", { y: 620, duration: 2200 });
    this.run.negligence = (this.run.negligence ?? 0) + 1;
    this.registry.set("run", this.run);
  }

  // ---------- potatura: si toccano le foglie secche ----------

  openPrune() {
    this.mode = "prune";
    this.pad.setVisible(false);
    const c = this.add.container(0, 0).setDepth(1800).setScrollFactor(0);
    const X0 = 410;
    const Y0 = 110;
    c.add(box(this, X0, Y0, 830, 470, { alpha: 1 }));
    c.add(txt(this, X0 + 32, Y0 + 26, "POTA LE FOGLIE SECCHE", { size: 34, weight: "500" }));
    c.add(txt(this, X0 + 32, Y0 + 80, "TOCCA LE 3 FOGLIE SCURE", { size: 22, color: HEX.c3 }));
    const plant = this.add.image(X0 + 300, Y0 + 452, "plant_big").setOrigin(0, 1);
    c.add(plant);
    this.pruneLeft = 3;
    const spots = [[X0 + 350, Y0 + 230], [X0 + 430, Y0 + 180], [X0 + 470, Y0 + 270]];
    this.leaves = spots.map(([x, y], i) => {
      const leaf = this.add.ellipse(x, y, 54, 26, C.c0, 1).setStrokeStyle(3, C.c4).setAngle(-20 + i * 25).setScrollFactor(0);
      leaf.setInteractive({ useHandCursor: true }).on("pointerup", () => this.cutLeaf(leaf));
      this.tweens.add({ targets: leaf, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
      c.add(leaf);
      return leaf;
    });
    this.pruneBox = c;
  }

  cutLeaf(leaf) {
    if (!leaf?.active || !leaf.visible) return;
    leaf.setVisible(false);
    Sfx.blip();
    this.pruneLeft -= 1;
    if (this.pruneLeft <= 0) {
      this.time.delayedCall(300, () => {
        this.pruneBox.destroy();
        this.pad.setVisible(true);
        this.mode = "play";
        this.completeStep();
      });
    }
  }

  // ---------- bus che parte ----------

  // il bus arriva da sinistra, rallenta davanti alla fermata e riparte senza di te
  busLeaves() {
    this.mode = "busy";
    const key = busSprite(this, this.origin.id);
    const img = this.add.image(0, 0, key).setOrigin(0, 1);
    const w = img.width;
    const bus = this.add.container(-w - 40, FEET - 4, [img]).setScrollFactor(0).setDepth(450);
    // la carrozzeria vibra appena sulle sospensioni
    this.tweens.add({ targets: img, y: -2, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // fumo dello scarico: quadratini retinati che restano indietro e svaniscono
    const puff = this.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => {
        const p = this.add.rectangle(bus.x + 8, FEET + 8 - Math.random() * 6, 6, 6, Math.random() < 0.5 ? C.c3 : C.c2, 0.8).setScrollFactor(0).setDepth(449);
        this.tweens.add({ targets: p, x: p.x - 30 - Math.random() * 30, y: p.y - 14 - Math.random() * 14, alpha: 0, scale: 1.8, duration: 700, onComplete: () => p.destroy() });
      }
    });
    Sfx.whoosh?.();
    // entra, frena davanti alla pensilina, sbuffa e riparte accelerando
    this.tweens.chain({
      targets: bus,
      tweens: [
        { x: 300, duration: 1700, ease: "Quad.easeOut" },
        { x: 306, duration: 700, ease: "Sine.easeInOut" },
        { x: VIEW.w + 60, duration: 2200, ease: "Quad.easeIn" }
      ],
      onComplete: () => {
        puff.remove();
        bus.destroy();
        toast(this, "IL BUS È PARTITO · SI TORNA A PIEDI", { duration: 1800 });
        this.time.delayedCall(800, () => {
          this.mode = "play";
          this.completeStep();
        });
      }
    });
  }

  // ---------- emergenza ----------

  startEmergency() {
    PlantSensors.send("E1");
    const alarm = this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c4, 0).setOrigin(0).setScrollFactor(0).setDepth(1400);
    this.tweens.add({ targets: alarm, fillAlpha: 0.08, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.alarm = alarm;
    toast(this, "EMERGENZA · PARASSITA NEL BIONOMAD", { duration: 2600 });
  }

  // ---------- azioni ----------

  near() {
    const t = this.step?.target && this.points[this.step.target];
    return t !== undefined && t !== null && Math.abs(this.player.x - t) < NEAR;
  }

  onAction() {
    const step = this.step;
    if (this.mode !== "play" || !step || !this.near()) return;
    if (HOLD_TYPES.has(step.type) || REACH_TYPES.has(step.type)) return;
    if (step.line) toast(this, step.line, { duration: 1800 });
    if (step.type === "talk") {
      toast(this, step.line ?? "", { duration: 2400 });
      this.mode = "busy";
      this.time.delayedCall(1200, () => {
        this.mode = "play";
        this.completeStep();
      });
      return;
    }
    if (step.type === "exit") {
      this.completeStep();
      return;
    }
    Sfx.attach();
    this.completeStep();
  }

  completeStep() {
    Sfx.o2Gain();
    this.addOxygen(STEP_BONUS);
    this.player.cheer();
    this.stepIndex += 1;
    if (this.stepIndex >= this.event.steps.length) this.finishEvent();
    else this.startStep();
  }

  finishEvent() {
    this.mode = "done";
    this.mark.c.setVisible(false);
    this.tasks.set(`EVENTO ${this.run.index + 1}/${this.run.events.length} · ${this.event.title}`, ["EVENTO COMPLETATO"], 1);
    this.addOxygen(EVENT_BONUS);
    Sfx.task();
    toast(this, "EVENTO COMPLETATO", { duration: 1500 });
    PlantSensors.send("E0");
    this.time.delayedCall(1700, () => {
      completeEvent(this.registry, Math.min(1, this.oxygen));
      goTo(this, "TravelScene");
    });
  }

  addOxygen(amount, raw = false) {
    const gain = amount > 0 && !raw ? amount * (this.origin.regen ?? 1) : amount;
    this.oxygen = Phaser.Math.Clamp(this.oxygen + gain, 0, 1);
  }

  fail() {
    if (this.mode === "done") return;
    this.mode = "done";
    this.oxygen = 0;
    this.plantPanel.close();
    this.mark.c.setVisible(false);
    this.pad.setVisible(false);
    failRun(this.registry);
    Sfx.gameOver();
    toast(this, "OSSIGENO ESAURITO", { duration: 3000 });
    this.player.faint(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose" })));
  }

  update(time, delta) {
    if (!this.player || this.mode === "done") {
      this.o2?.set(this.oxygen ?? 0, time);
      return;
    }
    const input = this.pad.poll();
    this.player.frozen = this.mode !== "play";
    this.player.update(input.dir, delta);
    this.plantPanel.simulate(delta, this.simBase);

    let boost = this.event.drainMultiplier ?? 1;
    const step = this.step;
    if (this.mode === "plant") {
      const r = this.plantPanel.update(delta);
      if (r.satisfied && this.plantPanel.step?.drainBoost) boost *= this.plantPanel.step.drainBoost;
      if (r.negligence) this.negligence(r.negligence);
      if (r.done) this.closePlant(true);
      else if (r.timedOut && this.plantEmergency) this.closePlant(false);
      else if (r.timedOut) {
        this.negligence("forgot");
        this.plantPanel.elapsed = 0;
      }
    } else if (this.mode === "play" && step) {
      const near = this.near();
      this.mark.setActive(near);
      const needsButton = !REACH_TYPES.has(step.type) && step.type !== "emergency";
      this.pad.highlight(near && needsButton);
      if (input.action) this.onAction();
      if (near && REACH_TYPES.has(step.type)) this.completeStep();
      else if (near && HOLD_TYPES.has(step.type)) {
        // tieni premuto ●: la barra della task si riempie
        if (input.holding) this.holdMs += delta;
        else this.holdMs = Math.max(0, this.holdMs - delta);
        const p = Math.min(1, this.holdMs / (step.duration ?? 2000));
        if (Math.floor(p * 20) !== this.lastHoldStep) {
          this.lastHoldStep = Math.floor(p * 20);
          this.refreshTasks(p);
        }
        if (p >= 1) this.completeStep();
      }
      if (step.type === "emergency") this.updateEmergency(delta);
    }

    this.addOxygen(-(delta * boost) / (this.origin.drainSeconds * 1000), true);
    this.o2.set(this.oxygen, time);
    if (this.oxygen <= 0) this.fail();
  }

  updateEmergency(delta) {
    const step = this.step;
    this.emTimer += delta;
    const stable = this.cures >= step.cures;
    const atHome = this.player.x >= this.points.home - 40;
    if (!stable && this.emTimer > step.actionEveryMs) this.openPlant(Phaser.Utils.Array.GetRandom(EMERGENCY_ACTIONS), true);
    else if (atHome && !stable) {
      if (!this.blockToast || this.time.now - this.blockToast > 2500) {
        this.blockToast = this.time.now;
        toast(this, "PRIMA STABILIZZA LA PIANTA", { duration: 1600 });
      }
      this.emTimer = Math.max(this.emTimer, step.actionEveryMs - 900);
    } else if (atHome) {
      PlantSensors.send("E0");
      this.tweens.killTweensOf(this.alarm);
      this.alarm?.destroy();
      this.completeStep();
    }
  }
}
