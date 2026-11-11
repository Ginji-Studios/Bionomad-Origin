import Phaser from "../phaser.js";
import { faint, Player } from "../entities/Player.js";
import { Npc } from "../entities/Npc.js";
import { MockPlantInput } from "../input/MockPlantInput.js";
import { getOrigin } from "../config/origins.js";
import { completeEvent, currentEvent, failRun, getRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { buildBus, buildBusStop, buildFoodTruck, buildHome, buildOffice, buildRunHome } from "../world/locations.js";
import { EMERGENCY_ACTIONS } from "../config/events.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { PlantPanel } from "../ui/PlantPanel.js";
import { addHud, addObjectiveBox, bodyText, o2Label, COLORS, drawPanel, dropShadow, fadeIn, goTo, hex, pixelArrow, pixelDisc, pixelText, showToast, targetMarker, textChip } from "../ui/theme.js";

const BUILDERS = { office: buildOffice, foodtruck: buildFoodTruck, busstop: buildBusStop, bus: buildBus, home: buildHome, street: buildRunHome };
const MASKED = ["foodtruck", "busstop", "bus", "street"];
const WALKERS = ["foodtruck", "busstop", "street"];
const NEAR = 76;
const STEP_BONUS = 0.08;
const EVENT_BONUS = 0.3;

// scena generica di un evento
export class EventScene extends Phaser.Scene {
  constructor() {
    super("EventScene");
  }

  create() {
    const { width, height } = this.scale;
    this.run = getRun(this.registry);
    this.event = currentEvent(this.registry);
    if (!this.run || !this.event) {
      this.scene.start("MenuScene");
      return;
    }
    this.origin = getOrigin(this.registry);
    this.mode = "intro";
    this.failed = false;
    this.stepIndex = 0;
    this.inventory = new Set();
    this.holdProgress = 0;
    this.carried = null;
    fadeIn(this);

    this.add.rectangle(width / 2, height / 2, width, height, COLORS.bg).setDepth(-100);
    const outdoor = MASKED.includes(this.event.location);
    this.world = BUILDERS[this.event.location](this, this.origin.id, { evening: Boolean(this.event.evening), ac: Boolean(this.event.ac) });
    this.plantPanel = new PlantPanel(this);
    this.emergencyTimer = 0;
    this.simBase = 22;
    this.events.once("shutdown", () => {
      PlantSensors.send("E0");
      this.clearPlantClasses();
    });

    this.createNpcs();
    this.createItems();

    this.player = new Player(this, this.world.spawn.x, this.world.spawn.y, {
      texture: characterTexture(this.origin.id, outdoor),
      withPack: !this.event.noPack,
      floor: this.world.floor,
      obstacles: this.world.obstacles
    });
    this.inputProvider = new MockPlantInput(this);

    this.hud = addHud(this, { oxygen: this.run.oxygen, location: this.origin.city, flag: this.origin.flag });
    this.objective = addObjectiveBox(this, this.event.title);
    textChip(this, 14, 72, `EVENTO ${this.run.index + 1}/${this.run.events.length} · ${this.event.title}`, { size: 20 });
    textChip(this, width - 14, 72, this.event.time, { size: 20, originX: 1 });

    this.marker = targetMarker(this);
    this.holdBar = this.add.graphics().setDepth(960);
    this.createPrompt();

    const keys = this.input.keyboard;
    ["SPACE", "ENTER"].forEach((key) => keys.on(`keydown-${key}`, () => this.onAction()));
    ["LEFT", "A"].forEach((key) => keys.on(`keydown-${key}`, () => this.onDirection(-1)));
    ["RIGHT", "D"].forEach((key) => keys.on(`keydown-${key}`, () => this.onDirection(1)));
    keys.once("keydown-ESC", () => goTo(this, "MenuScene"));
    // simulazione da tastiera delle azioni discrete sulla pianta
    const plantStep = (sensor) => this.mode === "plant" && this.plantPanel.step?.sensor === sensor && !PlantSensors.state.connected;
    keys.on("keydown-R", () => {
      if (PlantSensors.state.connected) return;
      PlantSensors.state.irrigation = !PlantSensors.state.irrigation;
      this.player.act("act", 300, 0);
    });
    [["ONE", 1], ["TWO", 2], ["THREE", 3]].forEach(([key, color]) =>
      keys.on(`keydown-${key}`, () => {
        if (!plantStep("vials")) return;
        PlantSensors.insertVial(color);
        this.player.act("act", 300, 0);
      })
    );
    keys.on("keydown-ZERO", () => plantStep("vials") && PlantSensors.removeVial());
    textChip(this, 14, height - 30, PlantSensors.state.connected ? "PIANTA: COLLEGATA" : "PIANTA: SIMULATA", { size: 18 });

    this.showIntroCard();
  }

  // setup

  createNpcs() {
    this.npcs = [];
    // bus affollato
    (this.world.crowd ?? []).forEach((x, i) => {
      const textures = ["npc_a_mask", "npc_b_mask", "npc_c_mask", "npc_d_mask", "npc_old_mask"];
      const npc = new Npc(this, x, 440 + (i % 2) * 14, "", { texture: textures[i % textures.length], withPack: i % 3 !== 0 });
      npc.scaleX = i % 2 ? -1 : 1;
      this.tweens.add({ targets: npc, x: x + 6, duration: 1400 + i * 90, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.npcs.push(npc);
    });
    if (this.event.location === "busstop") {
      const p = this.world.points.man;
      this.man = new Npc(this, p.x + 20, p.y - 6, "Signore", { texture: "npc_old_mask", withPack: true });
      this.man.scaleX = -1;
      this.npcs.push(this.man);
    }
    if (WALKERS.includes(this.event.location)) {
      const texture = this.origin.id === "delhi" ? "npc_d_mask" : "npc_a_mask";
      this.npcs.push(new Npc(this, -60, 478, "", { texture, speed: 34, direction: 1 }));
      this.npcs.push(new Npc(this, 700, 482, "", { texture: "npc_b_mask", speed: 26, direction: -1 }));
    }
  }

  createItems() {
    this.itemSprites = {};
    this.event.steps.forEach((step) => {
      if (step.type === "pickup" && step.item === "can") {
        const p = this.world.points[step.target];
        const sprite = this.add.image(p.x, p.y, "can").setOrigin(0.5, 1).setScale(4).setDepth(p.y - 1);
        this.tweens.add({ targets: sprite, y: p.y - 6, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.itemSprites.can = sprite;
      }
      if (step.type === "pickup" && step.item === "pack") {
        // lo zaino dimenticato, coperto di brina
        const p = this.world.points[step.target];
        const sprite = this.add.image(p.x, p.y, "pack").setOrigin(0.5, 1).setScale(4).setDepth(p.y - 1).setTint(0xcfe0ea);
        this.tweens.add({ targets: sprite, x: p.x + 2, duration: 90, yoyo: true, repeat: -1 });
        this.itemSprites.pack = sprite;
      }
    });
  }

  createPrompt() {
    this.prompt = this.add.container(0, 0).setDepth(970).setVisible(false);
    this.promptBg = this.add.graphics();
    this.promptText = bodyText(this, 0, 0, "", { size: 20, color: COLORS.paper, origin: 0.5 });
    this.prompt.add([this.promptBg, this.promptText]);
  }

  setPrompt(text) {
    if (this.promptText.text === text) return;
    this.promptText.setText(text);
    const w = this.promptText.width + 14;
    this.promptBg.clear();
    drawPanel(this.promptBg, -w / 2, -12, w, 24, { fill: COLORS.ink, border: COLORS.inkDeep });
  }

  // overlay iniziale

  showIntroCard() {
    const { width, height } = this.scale;
    const card = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, COLORS.inkDeep, 0.55);
    const w = 580;
    const h = 260;
    const x = width / 2 - w / 2;
    const y = height / 2 - h / 2;
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 30);
    const head = pixelText(this, x + 14, y + 11, `EVENTO ${this.run.index + 1}/${this.run.events.length}`, { size: 8, color: COLORS.paper });
    const time = pixelText(this, x + w - 14, y + 11, this.event.time, { size: 8, color: COLORS.steelLight, origin: [1, 0] });
    const title = pixelText(this, x + 20, y + 46, this.event.title, { size: 16, fit: w - 40 });
    const desc = bodyText(this, x + 20, y + 76, this.event.description, { size: 24, color: COLORS.ink, wrap: w - 40, lineSpacing: -2 });
    const list = bodyText(this, x + 20, y + 150, this.event.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n"), { size: 20, color: COLORS.steel });
    const go = pixelText(this, width / 2, y + h - 22, "SPAZIO PER INIZIARE", { size: 8, color: COLORS.red, origin: 0.5 });
    this.tweens.add({ targets: go, alpha: 0.3, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    card.add([dim, g, head, time, title, desc, list, go]);
    card.setAlpha(0).y = 16;
    this.tweens.add({ targets: card, alpha: 1, y: 0, duration: 300, ease: "Cubic.easeOut" });
    this.introCard = card;
  }

  // step

  get step() {
    return this.event.steps[this.stepIndex];
  }

  startStep() {
    const step = this.step;
    this.holdProgress = 0;
    this.objective.setText(`${this.stepIndex + 1}/${this.event.steps.length} · ${step.text}`);
    if (step.type === "prune") this.openPrune();
    if (step.type === "plant") this.openPlant(step);
    if (step.type === "busLeaves") this.playBusLeaves();
    if (step.type === "emergency") this.emergencyTimer = 0;
  }

  // azioni sulla pianta vera

  openPlant(step, emergency = false) {
    this.mode = "plant";
    this.plantEmergency = emergency;
    this.simBase = step.baseTemperature ?? 22;
    const irrigation = PlantSensors.state.irrigation;
    PlantSensors.resetSimulation(this.simBase, { ambientLight: step.setup === "covered" ? 0.06 : 0.6 });
    if (step.sensor === "irrigation" && step.on === false) PlantSensors.state.irrigation = irrigation;
    this.player.velocity.set(0, 0);
    if (step.sensor === "vials") {
      const colors = Phaser.Utils.Array.Shuffle([1, 2, 3]);
      step = { ...step, required: colors.slice(0, 2) };
      // negligenza già fatta: nel pozzetto c'è la fiala del terzo colore
      if (step.setup === "wrongVial" && !PlantSensors.state.connected) PlantSensors.state.slots = [colors[2], 0];
    }
    if (step.setup === "leverOpen" && !PlantSensors.state.connected) PlantSensors.state.irrigation = true;
    this.plantPanel.show(step, { timeoutMs: step.timeoutMs ?? 0, emergency });
    document.body.classList.add("plant-active", `plant-${step.sensor}`);
  }

  closePlant(success) {
    this.plantPanel.close();
    this.clearPlantClasses();
    if (success) PlantSensors.send("G");
    if (this.plantEmergency) {
      this.plantEmergency = false;
      this.mode = "play";
      this.emergencyTimer = 0;
      if (success) {
        this.addOxygen(0.06);
        this.player.act("cheer", 420, 10);
        showToast(this, "Cura riuscita! Continua verso casa.", { duration: 1400 });
      } else {
        this.hud.setOxygen(this.hud.oxygen - 0.15);
        this.cameras.main.shake(200, 0.006);
        showToast(this, "Troppo tardi: il parassita avanza!", { color: COLORS.red, duration: 1600 });
      }
      return;
    }
    this.completeStep();
  }

  clearPlantClasses() {
    document.body.classList.remove("plant-active", "plant-light", "plant-temperature", "plant-irrigation", "plant-vials");
  }

  // gesti di negligenza: costano ossigeno e vengono contati nel recap
  negligence(type) {
    const messages = {
      forgot: "SHOCK TERMICO · non l'hai curata in tempo!",
      overheat: "SHOCK TERMICO · troppo calore, l'hai scottata!",
      flood: "IPER-IDRATAZIONE · leva dell'acqua aperta!",
      wrongVial: "INTOSSICAZIONE · fiala sbagliata, toglila!"
    };
    const cost = { forgot: 0.18, overheat: 0.12, flood: 0.2, wrongVial: 0.12 }[type] ?? 0.1;
    this.hud.setOxygen(this.hud.oxygen - cost);
    this.cameras.main.shake(220, 0.006);
    this.cameras.main.flash(160, 180, 85, 63);
    // sotto il pannello della pianta, sopra a tutto
    const y = this.mode === "plant" ? 420 : 116;
    showToast(this, messages[type] ?? "NEGLIGENZA · la pianta soffre", { color: COLORS.red, duration: 2400, y, depth: 2100 });
    this.run.negligence = (this.run.negligence ?? 0) + 1;
    this.registry.set("run", this.run);
  }

  playBusLeaves() {
    this.mode = "busy";
    const bus = this.add.container(-320, 400).setDepth(405);
    const g = this.add.graphics();
    drawPanel(g, 0, -150, 300, 136, { fill: COLORS.steel, border: COLORS.ink, borderWidth: 4 });
    g.fillStyle(COLORS.inkDeep, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(16 + i * 66, -132, 54, 44);
    g.fillStyle(0xe8c66a, 1);
    g.fillRect(286, -40, 10, 10);
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(4, -76, 292, 6);
    [60, 240].forEach((wx) => {
      pixelDisc(g, wx, -8, 20, COLORS.inkDeep, 1, 4);
      pixelDisc(g, wx, -8, 8, COLORS.stone, 1, 4);
    });
    bus.add(g);
    this.player.facing = 1;
    this.tweens.add({
      targets: bus,
      x: 1100,
      duration: 3000,
      ease: "Quad.easeIn",
      onUpdate: () => {
        if (bus.x > 300 && !this.busShouted) {
          this.busShouted = true;
          this.player.act("cheer", 600, 14);
          showToast(this, "Aspetta!! ... il bus è partito senza di te.", { duration: 2200 });
        }
      },
      onComplete: () => {
        bus.destroy();
        this.busShouted = false;
        showToast(this, "Si torna a piedi. Fa freddo!", { duration: 1800 });
        this.completeStep();
      }
    });
  }

  startEmergency() {
    PlantSensors.send("E1");
    const { width, height } = this.scale;
    const alarm = this.add.rectangle(width / 2, height / 2, width, height, COLORS.red, 0).setDepth(940);
    this.tweens.add({ targets: alarm, fillAlpha: 0.14, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const led = this.add.container(width / 2, 116).setDepth(1001);
    const lg = drawPanel(this.add.graphics(), -120, -16, 240, 32, { fill: COLORS.red, border: COLORS.inkDeep });
    led.add([lg, pixelText(this, 0, 0, "LED ROSSI · PARASSITA", { size: 8, color: COLORS.paper, origin: 0.5 })]);
    this.tweens.add({ targets: led, alpha: 0.4, duration: 300, yoyo: true, repeat: -1 });
    this.alarm = alarm;
  }

  targetPoint() {
    const step = this.step;
    if (!step || !step.target) return null;
    return this.world.points[step.target];
  }

  isNear(point) {
    return point && Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) < NEAR;
  }

  onAction() {
    if (this.mode === "intro") {
      this.mode = "play";
      this.tweens.add({ targets: this.introCard, alpha: 0, y: -16, duration: 220, onComplete: () => this.introCard.destroy() });
      if (this.event.emergency) this.startEmergency();
      this.startStep();
      return;
    }
    if (this.mode === "confirm") return this.resolveConfirm();
    if (this.mode === "prune") return this.cutLeaf();
    if (this.mode !== "play") return;

    const step = this.step;
    const point = this.targetPoint();
    const near = this.isNear(point);

    if (step.type === "useSelf") {
      this.mode = "busy";
      this.player.act("act", 900, 0);
      this.dropCarried();
      this.waterEffect(this.player.x - 30 * this.player.facing, this.player.y - 96);
      this.time.delayedCall(900, () => this.completeStep());
      return;
    }
    if (!near) {
      if (step.type !== "hold") showToast(this, "Raggiungi la freccia per completare la task.", { duration: 1400 });
      return;
    }

    switch (step.type) {
      case "pickup":
        this.player.act("act", 380, 6);
        this.itemSprites[step.item]?.destroy();
        this.inventory.add(step.item);
        if (step.item === "pack") this.player.setPack(true);
        else this.carry(step.item);
        showToast(this, step.line ?? "Raccolto!");
        this.completeStep();
        break;
      case "use":
        if (!this.inventory.has(step.item)) {
          showToast(this, "Ti manca qualcosa...", { color: COLORS.red });
          return;
        }
        this.mode = "busy";
        this.player.facing = point.x >= this.player.x ? 1 : -1;
        this.player.act("act", 1000, 0);
        this.dropCarried();
        this.waterEffect(point.x, point.y - 110);
        if (this.world.hub) this.tweens.add({ targets: this.world.hub.plant, scaleY: 3.4, duration: 300, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
        this.time.delayedCall(1000, () => this.completeStep());
        break;
      case "talk":
        this.player.act("act", 400, 0);
        this.man?.setMood("happy");
        showToast(this, `Signore: ${step.line}`, { duration: 3200 });
        this.completeStep();
        break;
      case "confirm":
        this.player.act("act", 400, 0);
        this.openConfirm(step.question);
        break;
      case "sit":
        this.sitAndEat(step.duration);
        break;
      case "reach":
        this.player.act("act", 400, 0);
        this.completeStep();
        break;
      case "exit":
        this.mode = "busy";
        this.tweens.add({ targets: this.player, alpha: 0, duration: 300 });
        this.completeStep();
        break;
      default:
        break;
    }
  }

  onDirection(step) {
    if (this.mode === "confirm") {
      this.confirmChoice = Phaser.Math.Wrap(this.confirmChoice + step, 0, 2);
      this.drawConfirmButtons();
    }
    if (this.mode === "prune") {
      this.movePruneCursor(step);
    }
  }

  completeStep() {
    this.stepIndex += 1;
    this.showChecklist(this.stepIndex - 1, this.stepIndex < this.event.steps.length);
    this.time.delayedCall(250, () => this.player?.act("cheer", 450, 10));
    this.addOxygen(STEP_BONUS);
    this.popCheck(this.player.x, this.player.y - 110);
    if (this.stepIndex >= this.event.steps.length) {
      this.finishEvent();
    } else {
      this.mode = "play";
      this.startStep();
    }
  }

  // lista task con spunta e matita

  showChecklist(doneIndex, withBanner) {
    const steps = this.event.steps;
    this.checklist?.destroy();
    if (withBanner) {
      const { width } = this.scale;
      const banner = this.add.container(width / 2 + 120, 200).setDepth(1500);
      const label = pixelText(this, 0, 0, "TASK COMPLETATA", { size: 16, color: COLORS.paper, origin: 0.5 });
      const bg = drawPanel(this.add.graphics(), -label.width / 2 - 18, -20, label.width + 36, 40, { fill: 0x5c7a6b, border: COLORS.inkDeep });
      banner.add([bg, label]);
      banner.setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 240, ease: "Back.easeOut" });
      this.tweens.add({ targets: banner, alpha: 0, y: 180, duration: 300, delay: 1300, onComplete: () => banner.destroy() });
    }

    const x = 14;
    const y = 100;
    const w = 300;
    const rowH = 32;
    const h = 44 + steps.length * rowH;
    const c = this.add.container(-w - 30, 0).setDepth(1500);
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 6);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 26);
    c.add([g, pixelText(this, x + 10, y + 8, "LISTA TASK", { size: 8, color: COLORS.paper })]);

    let target = null;
    steps.forEach((step, i) => {
      const ry = y + 38 + i * rowH;
      const done = i < doneIndex;
      const box = drawPanel(this.add.graphics(), x + 12, ry, 22, 22, { fill: done ? 0x5c7a6b : COLORS.paper, border: COLORS.ink });
      const label = bodyText(this, x + 44, ry + 1, step.text, { size: 20, color: done ? COLORS.stone : step.extra === "fix" ? COLORS.red : COLORS.ink, fit: w - 56 });
      c.add([box, label]);
      if (done) {
        c.add(this.add.image(x + 23, ry + 11, "check").setScale(2));
        const strike = this.add.graphics();
        strike.fillStyle(COLORS.ink, 1);
        strike.fillRect(x + 42, ry + 11, label.width + 4, 2);
        c.add(strike);
      }
      if (i === doneIndex) target = { ry, label, box };
    });

    this.tweens.add({ targets: c, x: 0, duration: 300, ease: "Cubic.easeOut" });
    this.checklist = c;
    if (!target) return;

    // prima la spunta verde, poi la matita che cancella la riga
    this.time.delayedCall(350, () => {
      if (!c.active) return;
      drawPanel(target.box.clear(), x + 12, target.ry, 22, 22, { fill: 0x5c7a6b, border: COLORS.ink });
      const check = this.add.image(x + 23, target.ry + 11, "check").setScale(5).setAlpha(0);
      c.add(check);
      this.tweens.add({ targets: check, scale: 2, alpha: 1, duration: 220, ease: "Quad.easeIn" });

      const strike = this.add.graphics();
      const pencil = this.add.graphics();
      pencil.fillStyle(COLORS.inkDeep, 1);
      pencil.fillRect(0, -2, 2, 2);
      pencil.fillStyle(0xe8c66a, 1);
      for (let i = 1; i < 8; i += 1) pencil.fillRect(i * 2, -i * 2 - 2, 4, 4);
      pencil.fillStyle(COLORS.stone, 1);
      pencil.fillRect(16, -18, 4, 4);
      pencil.fillStyle(COLORS.red, 1);
      pencil.fillRect(18, -22, 5, 5);
      c.add([strike, pencil]);
      const startX = x + 42;
      const lineY = target.ry + 11;
      const length = target.label.width + 4;
      pencil.setPosition(startX, lineY + 1).setAlpha(0);
      const progress = { t: 0 };
      this.tweens.add({ targets: pencil, alpha: 1, duration: 120, delay: 250 });
      this.tweens.add({
        targets: progress,
        t: 1,
        delay: 350,
        duration: 650,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          const len = Math.round(length * progress.t);
          strike.clear();
          strike.fillStyle(COLORS.ink, 1);
          strike.fillRect(startX, lineY, len, 2);
          pencil.setPosition(startX + len, lineY + 1 + Math.sin(progress.t * 20));
        },
        onComplete: () => {
          target.label.setColor(hex(COLORS.stone));
          this.tweens.add({ targets: pencil, alpha: 0, y: pencil.y - 10, duration: 200 });
        }
      });
      // esce dopo qualche secondo
      this.tweens.add({ targets: c, x: -w - 30, duration: 300, delay: 2600, ease: "Cubic.easeIn", onComplete: () => c.destroy() });
    });
  }

  // update

  update(time, delta) {
    if (!this.player || this.failed) return;
    this.player.frozen = this.mode !== "play";
    this.player.update(this.inputProvider.getState(), delta, time);
    this.npcs.forEach((npc) => {
      npc.update(delta, time);
      npc.setDepth(npc.y);
    });

    if (this.carried) {
      this.carried.setPosition(this.player.x + 26 * this.player.facing, this.player.y - 30 + this.player.sprite.y);
      this.carried.setDepth(this.player.depth + 1).setFlipX(this.player.facing < 0);
    }

    PlantSensors.simulate(this.inputProvider.keys, delta, this.simBase);
    let boost = this.event.drainMultiplier ?? 1;
    if (this.mode === "plant") {
      const result = this.plantPanel.update(delta);
      if (result.satisfied && this.plantPanel.step?.drainBoost) boost *= this.plantPanel.step.drainBoost;
      if (result.satisfied && Math.random() < 0.02) this.player.act("act", 200, 0);
      if (result.negligence) this.negligence(result.negligence);
      if (result.done) this.closePlant(true);
      else if (result.timedOut && this.plantEmergency) this.closePlant(false);
      else if (result.timedOut) {
        // se ne è dimenticato: la pianta soffre e la richiesta resta
        this.negligence("forgot");
        this.plantPanel.elapsed = 0;
      }
    }

    // emergenza
    const step = this.step;
    if (this.mode === "play" && step?.type === "emergency") {
      this.emergencyTimer += delta;
      if (this.emergencyTimer > step.actionEveryMs) {
        this.openPlant(Phaser.Utils.Array.GetRandom(EMERGENCY_ACTIONS), true);
      } else if (this.player.x >= this.world.points.home.x - 30) {
        PlantSensors.send("E0");
        this.tweens.killTweensOf(this.alarm);
        this.alarm?.setFillStyle(COLORS.red, 0);
        this.completeStep();
      }
    }

    if (["play", "busy", "confirm", "prune", "plant"].includes(this.mode)) {
      this.hud.setOxygen(this.hud.oxygen - (delta * boost) / (this.origin.drainSeconds * 1000));
      if (this.hud.oxygen <= 0) {
        this.fail();
        return;
      }
    }

    this.updateMarker(time);
    this.updateHold(delta);
  }

  updateMarker(time) {
    const step = this.step;
    const playing = this.mode === "play" && step;
    let point = playing && step.type !== "plant" ? this.targetPoint() : null;
    if (playing && step.type === "useSelf") point = { x: this.player.x, y: this.player.y };

    this.marker.setVisible(Boolean(point));
    if (point) {
      this.marker.setPosition(point.x, point.y - 120);
      this.marker.bob(Math.sin(time * 0.006) * 6);
    }

    const near = playing && step.type !== "emergency" && (step.type === "useSelf" || this.isNear(point));
    this.prompt.setVisible(Boolean(near));
    if (near) {
      this.setPrompt(step.type === "hold" ? "RESTA QUI..." : "SPAZIO");
      this.prompt.setPosition(this.player.x, this.player.y - 104 + this.player.sprite.y);
    }
  }

  updateHold(delta) {
    this.holdBar.clear();
    const step = this.step;
    if (this.mode !== "play" || !step || step.type !== "hold") return;
    const point = this.targetPoint();
    if (this.isNear(point)) {
      this.holdProgress += delta;
      // mentre carica, il cittadino "lavora" sull'hub / colonnina
      if (Math.floor(this.holdProgress / 450) % 2 === 0) this.player.act("act", 120, 0);
    }
    if (this.holdProgress <= 0) return;
    const ratio = Math.min(1, this.holdProgress / step.duration);
    const x = point.x - 60;
    const y = point.y - 150;
    drawPanel(this.holdBar, x, y, 120, 18, { fill: COLORS.paper, border: COLORS.ink });
    this.holdBar.fillStyle(COLORS.steel, 1);
    this.holdBar.fillRect(x + 4, y + 4, Math.round(112 * ratio), 10);
    if (ratio >= 1) {
      this.holdBar.clear();
      showToast(this, step.target === "charger" ? "Active Pack carico!" : "Caricamento completato.");
      this.completeStep();
    }
  }

  // oggetti in mano ed effetti

  carry(item) {
    this.carried?.destroy();
    this.carried = this.add.image(this.player.x, this.player.y, item).setOrigin(0.5, 1).setScale(3);
    this.carried.setScale(0);
    this.tweens.add({ targets: this.carried, scale: 3, duration: 260, ease: "Back.easeOut" });
  }

  dropCarried() {
    if (!this.carried) return;
    const item = this.carried;
    this.carried = null;
    this.tweens.add({ targets: item, alpha: 0, scale: 2, duration: 900, delay: 400, onComplete: () => item.destroy() });
  }

  waterEffect(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const drop = this.add.rectangle(x + Phaser.Math.Between(-18, 18), y, 4, 8, COLORS.steel).setDepth(990);
      this.tweens.add({ targets: drop, y: y + Phaser.Math.Between(50, 80), alpha: 0, duration: 520, delay: i * 70, ease: "Quad.easeIn", onComplete: () => drop.destroy() });
    }
  }

  popCheck(x, y) {
    const badge = this.add.container(x, y).setDepth(990);
    const bg = this.add.graphics();
    drawPanel(bg, -14, -14, 28, 28, { fill: COLORS.ink, border: COLORS.inkDeep });
    badge.add([bg, this.add.image(0, 0, "check").setScale(3)]);
    badge.setScale(0);
    this.tweens.add({ targets: badge, scale: 1, y: y - 20, duration: 300, ease: "Back.easeOut" });
    this.tweens.add({ targets: badge, alpha: 0, duration: 300, delay: 700, onComplete: () => badge.destroy() });
  }

  // con l'aria più inquinata l'ossigeno si ricarica più lentamente
  addOxygen(amount) {
    const from = this.hud.oxygen;
    const to = Math.min(1, from + amount * (this.origin.regen ?? 1));
    this.tweens.addCounter({ from, to, duration: 500, ease: "Cubic.easeOut", onUpdate: (tween) => this.hud.setOxygen(tween.getValue()) });
  }

  // domanda sì / no

  openConfirm(question) {
    const { width, height } = this.scale;
    this.mode = "confirm";
    this.confirmChoice = 0;
    const box = this.add.container(0, 0).setDepth(2000);
    const g = this.add.graphics();
    const w = 440;
    const h = 150;
    const x = width / 2 - w / 2;
    const y = height / 2 - h / 2 - 20;
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 26);
    const head = pixelText(this, x + 12, y + 9, "HUB BIODOM", { size: 8, color: COLORS.paper });
    const text = bodyText(this, width / 2, y + 52, question, { size: 28, color: COLORS.ink, origin: 0.5 });
    this.confirmButtons = this.add.graphics();
    this.confirmLabels = [
      pixelText(this, width / 2 - 70, y + 108, "SÌ", { size: 16, origin: 0.5 }),
      pixelText(this, width / 2 + 70, y + 108, "NO", { size: 16, origin: 0.5 })
    ];
    box.add([g, head, text, this.confirmButtons, ...this.confirmLabels]);
    box.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: "Back.easeOut" });
    this.confirmBox = box;
    this.drawConfirmButtons();
  }

  drawConfirmButtons() {
    const { width, height } = this.scale;
    const y = height / 2 - 75 - 20 + 92;
    this.confirmButtons.clear();
    [-70, 70].forEach((dx, i) => {
      const selected = i === this.confirmChoice;
      drawPanel(this.confirmButtons, width / 2 + dx - 50, y, 100, 32, { fill: selected ? COLORS.ink : COLORS.paper, border: COLORS.ink });
      this.confirmLabels[i].setColor(hex(selected ? COLORS.paper : COLORS.ink));
    });
  }

  resolveConfirm() {
    const yes = this.confirmChoice === 0;
    const box = this.confirmBox;
    this.tweens.add({ targets: box, alpha: 0, duration: 160, onComplete: () => box.destroy() });
    if (yes) {
      // lo schermo dell'hub passa in modalità notturna
      const s = this.world.hub?.screen;
      if (s) {
        const night = this.add.graphics().setDepth(this.world.hub.g.depth + 1);
        drawPanel(night, s.x, s.y, 60, 34, { fill: COLORS.inkDeep, border: COLORS.ink });
        night.fillStyle(0xe8c66a, 1);
        night.fillRect(s.x + 24, s.y + 8, 12, 12);
        night.fillStyle(COLORS.inkDeep, 1);
        night.fillRect(s.x + 30, s.y + 6, 10, 10);
      }
      this.completeStep();
    } else {
      this.mode = "play";
      showToast(this, "L'hub resta in modalità giorno... consuma energia!", { color: COLORS.red });
    }
  }

  // minigioco potatura

  openPrune() {
    const { width, height } = this.scale;
    this.mode = "prune";
    const overlay = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, COLORS.inkDeep, 0.55);
    const w = 420;
    const h = 330;
    const x = width / 2 - w / 2;
    const y = 96;
    const g = this.add.graphics();
    dropShadow(g, x, y, w, h, 8);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 26);
    const head = pixelText(this, x + 12, y + 9, "POTATURA", { size: 8, color: COLORS.paper });
    const help = bodyText(this, width / 2, y + h - 22, "A / D scegli · SPAZIO taglia le foglie marroni", { size: 20, color: COLORS.steel, origin: 0.5 });

    // vaso e fusto
    const cx = width / 2;
    g.fillStyle(COLORS.stone, 1);
    g.fillRect(cx - 50, y + 230, 100, 60);
    g.fillStyle(0x6e7673, 1);
    g.fillRect(cx - 56, y + 224, 112, 12);
    g.fillStyle(0x3f6560, 1);
    g.fillRect(cx - 4, y + 70, 8, 160);

    const spots = [
      [-70, 80], [70, 90], [-90, 130], [90, 140], [-60, 180], [60, 190], [-30, 60], [30, 120]
    ];
    const bad = Phaser.Utils.Array.Shuffle([...spots.keys()]).slice(0, 3);
    this.leaves = spots.map(([dx, dy], i) => {
      const isBad = bad.includes(i);
      const leaf = this.add.image(cx + dx, y + dy, isBad ? "leaf_bad" : "leaf_good").setScale(7).setFlipX(dx < 0);
      g.fillStyle(0x3f6560, 1);
      g.fillRect(dx < 0 ? cx + dx + 16 : cx, y + dy, Math.abs(dx) - 16, 4);
      this.tweens.add({ targets: leaf, y: leaf.y - 3, duration: 800 + i * 60, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      return { sprite: leaf, bad: isBad, cut: false };
    });
    this.pruneCursor = this.add.graphics();
    overlay.add([dim, g, head, help, ...this.leaves.map((l) => l.sprite), this.pruneCursor]);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 220 });
    this.pruneOverlay = overlay;
    this.pruneIndex = 0;
    this.drawPruneCursor();
  }

  movePruneCursor(step) {
    const order = this.leaves.map((l, i) => i).filter((i) => !this.leaves[i].cut).sort((a, b) => this.leaves[a].sprite.x - this.leaves[b].sprite.x || this.leaves[a].sprite.y - this.leaves[b].sprite.y);
    const pos = order.indexOf(this.pruneIndex);
    this.pruneIndex = order[Phaser.Math.Wrap(pos + step, 0, order.length)];
    this.drawPruneCursor();
  }

  drawPruneCursor() {
    const leaf = this.leaves[this.pruneIndex].sprite;
    this.pruneCursor.clear();
    drawPanel(this.pruneCursor, leaf.x - 30, leaf.y - 22, 60, 44, { fillAlpha: 0, border: COLORS.red, borderWidth: 3 });
  }

  cutLeaf() {
    const leaf = this.leaves[this.pruneIndex];
    if (leaf.cut) return;
    if (!leaf.bad) {
      this.cameras.main.shake(120, 0.004);
      this.hud.setOxygen(this.hud.oxygen - 0.08);
      showToast(this, "Era una foglia sana! La pianta soffre.", { color: COLORS.red, duration: 1500 });
      return;
    }
    leaf.cut = true;
    this.player.act("act", 300, 0);
    this.tweens.killTweensOf(leaf.sprite);
    this.tweens.add({ targets: leaf.sprite, y: leaf.sprite.y + 140, angle: 120, alpha: 0, duration: 700, ease: "Quad.easeIn" });
    if (this.leaves.every((l) => !l.bad || l.cut)) {
      this.pruneCursor.clear();
      this.time.delayedCall(500, () => {
        this.tweens.add({ targets: this.pruneOverlay, alpha: 0, duration: 220, onComplete: () => this.pruneOverlay.destroy() });
        showToast(this, "Signore: Così va molto meglio!");
        this.completeStep();
      });
      this.mode = "busy";
    } else {
      this.movePruneCursor(1);
    }
  }

  // pausa pranzo

  sitAndEat(duration) {
    this.mode = "busy";
    const seat = this.world.benchSeat;
    this.player.velocity.set(0, 0);
    this.tweens.add({
      targets: this.player,
      x: seat.x,
      y: seat.y,
      duration: 400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.player.setDepth(460);
        // mangia
        this.time.addEvent({ delay: 500, repeat: Math.floor(duration / 500) - 2, callback: () => this.player.act("act", 220, 0) });
        const food = this.add.rectangle(this.player.x + 20 * this.player.facing, this.player.y - 46, 14, 10, 0xd98a4b).setDepth(470);
        this.tweens.add({ targets: food, scaleX: 0.2, duration: duration - 400, ease: "Stepped", easeParams: [4] });
        ["gnam", "gnam!", "o2"].forEach((word, i) => {
          this.time.delayedCall(400 + i * 650, () => {
            const x = this.player.x + Phaser.Math.Between(-30, 30);
            const t = (word === "o2"
              ? o2Label(this, x, this.player.y - 110, { px: 22, color: COLORS.ink, prefix: "+" })
              : bodyText(this, x, this.player.y - 110, word, { size: 22, color: COLORS.ink, origin: 0.5 })
            ).setDepth(980);
            this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
          });
        });
        this.time.delayedCall(duration, () => {
          food.destroy();
          this.tweens.add({ targets: this.player, y: this.world.points.bench.y, duration: 300, ease: "Sine.easeOut" });
          this.completeStep();
        });
      }
    });
  }

  // esito

  banner(text, color) {
    const { width, height } = this.scale;
    const box = this.add.container(width / 2, height / 2 - 20).setDepth(2100);
    const label = pixelText(this, 0, 0, text, { size: 24, color: COLORS.paper, origin: 0.5 });
    const w = label.width + 60;
    const g = this.add.graphics();
    dropShadow(g, -w / 2, -30, w, 60, 8);
    drawPanel(g, -w / 2, -30, w, 60, { fill: color, border: COLORS.inkDeep });
    box.add([g, label]);
    box.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 280, ease: "Back.easeOut" });
  }

  finishEvent() {
    this.mode = "done";
    this.marker.setVisible(false);
    this.prompt.setVisible(false);
    this.objective.setText("EVENTO COMPLETATO");
    this.addOxygen(EVENT_BONUS);
    this.banner("TASK COMPLETATE!", COLORS.ink);
    [0, 500, 1000].forEach((delay) => this.time.delayedCall(delay, () => this.player.act("cheer", 420, 14)));
    this.time.delayedCall(1800, () => {
      // niente teletrasporto
      completeEvent(this.registry, Math.min(1, this.hud.oxygen));
      goTo(this, "TravelScene");
    });
  }

  fail() {
    if (this.mode === "done") return;
    this.mode = "done";
    this.failed = true;
    this.hud.setOxygen(0);
    this.marker.setVisible(false);
    this.prompt.setVisible(false);
    failRun(this.registry);
    this.plantPanel?.close();
    this.clearPlantClasses();
    this.banner("OSSIGENO ESAURITO", COLORS.red);
    // sviene dove si trova, poi la scena del game over
    faint(this.player).then(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose", fainted: true })));
  }
}
