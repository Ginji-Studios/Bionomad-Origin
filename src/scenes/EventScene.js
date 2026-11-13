import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { faint, Player } from "../entities/Player.js";
import { Npc } from "../entities/Npc.js";
import { crowdTexture } from "../ui/pixelSprites.js";
const HORIZON_SEAT = 378;
import { MockPlantInput } from "../input/MockPlantInput.js";
import { getOrigin } from "../config/origins.js";
import { completeEvent, currentEvent, failRun, getRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { buildBus, buildBusStop, buildFoodTruck, buildHome, buildOffice, buildRunHome } from "../world/locations.js";
import { EMERGENCY_ACTIONS } from "../config/events.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { PlantPanel } from "../ui/PlantPanel.js";
import { brandMarks, burst, addHud, addObjectiveBox, bodyText, o2Label, COLORS, drawPanel, dropShadow, fadeIn, goTo, hex, keyLabel, pixelArrow, pixelDisc, pixelText, showToast, targetMarker, textChip } from "../ui/theme.js";

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
    this.indoor = !outdoor; // in casa e in ufficio i passi suonano sul pavimento
    // sottofondo: il vento e le torri di filtraggio solo in città, al chiuso silenzio
    setAmbient(outdoor ? (this.event.evening ? "night" : "city") : null);
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
    textChip(this, 14, 72, this.event.title, { size: 20, tag: `EVENTO ${this.run.index + 1}/${this.run.events.length}` });
    textChip(this, width - 14, 72, this.event.time, { size: 20, originX: 1, tag: "ORE" });

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
    [["ONE", 1], ["TWO", 2], ["THREE", 3], ["NUMPAD_ONE", 1], ["NUMPAD_TWO", 2], ["NUMPAD_THREE", 3]].forEach(([key, color]) =>
      keys.on(`keydown-${key}`, () => {
        if (!plantStep("vials")) return;
        PlantSensors.insertVial(color, this.plantPanel.step?.required);
        this.player.act("act", 300, 0);
      })
    );
    ["ZERO", "NUMPAD_ZERO", "BACKSPACE"].forEach((key) => keys.on(`keydown-${key}`, () => plantStep("vials") && PlantSensors.removeVial()));
    textChip(this, 14, height - 30, PlantSensors.state.connected ? "COLLEGATA" : "SIMULATA", { size: 18, tag: "PIANTA", dot: PlantSensors.state.connected ? 0x7fae86 : COLORS.steel });

    this.showIntroCard();
  }

  // setup

  createNpcs() {
    this.npcs = [];
    // bus affollato
    (this.world.crowd ?? []).forEach((p, i) => {
      const pos = typeof p === "number" ? { x: p, y: 440 + (i % 2) * 14 } : p;
      const npc = new Npc(this, pos.x, pos.y, "", { texture: "npc_a_mask", withPack: i % 3 !== 0 });
      npc.scaleX = i % 2 ? -1 : 1;
      npc.setDepth(pos.y);
      // tutti oscillano insieme con le curve del bus, ognuno con un piccolo ritardo
      this.tweens.add({ targets: npc, x: pos.x + 5, duration: 1600, delay: (i % 5) * 70, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.npcs.push(npc);
    });
    // passeggeri seduti: busto dietro lo schienale
    (this.world.seated ?? []).forEach((p) => {
      const img = this.add.image(p.x, p.y, crowdTexture(this, true)).setOrigin(0.5, 1).setScale(3).setDepth(HORIZON_SEAT);
      img.setCrop(0, 0, 14, 13);
      this.tweens.add({ targets: img, y: p.y + 1, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: Math.random() * 600 });
    });
    // scossoni del bus: ogni tanto una buca fa sobbalzare tutti
    if (this.world.crowd?.length) {
      this.time.addEvent({
        delay: 4200,
        loop: true,
        callback: () => {
          this.cameras.main.shake(140, 0.003);
          this.npcs.forEach((n, i) => this.time.delayedCall(i * 15, () => n.active && this.tweens.add({ targets: n.sprite, y: -4, duration: 90, yoyo: true })));
        }
      });
    }
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
    const w = 620;
    const pad = 22;
    const x = Math.round(width / 2 - w / 2);
    const headH = 34;
    // prima si creano i testi, poi la scheda prende l'altezza che serve: niente sovrapposizioni
    const title = pixelText(this, 0, 0, this.event.title, { size: 16, fit: w - pad * 2 });
    const desc = bodyText(this, 0, 0, this.event.description, { size: 22, color: COLORS.ink, wrap: w - pad * 2, lineSpacing: -2 });
    const taskLabel = bodyText(this, 0, 0, "TASK DA COMPLETARE", { size: 18, color: COLORS.steel });
    // ogni task è una riga con la sua etichetta: numero, + cura in più, ! negligenza da sistemare
    const rows = this.event.steps.map((st, i) => {
      const raw = st.text;
      const kind = raw.startsWith("+ ") ? "care" : raw.startsWith("! ") ? "fix" : "main";
      const clean = kind === "main" ? raw : raw.slice(2);
      const text = bodyText(this, 0, 0, clean, { size: 22, color: COLORS.ink, wrap: w - pad * 2 - 110 });
      const tagText = kind === "care" ? "CURA +" : kind === "fix" ? "NEGLIGENZA" : null;
      const tag = tagText ? bodyText(this, 0, 0, tagText, { size: 16, color: COLORS.paper }) : null;
      return { i, kind, text, tag };
    });
    const go = keyLabel(this, "SPAZIO  inizia la task", { size: 20 });
    const rowsH = rows.reduce((sum, r) => sum + Math.max(26, r.text.height) + 8, 0);
    const h = Math.min(height - 70, headH + 18 + 26 + 10 + desc.height + 18 + 24 + rowsH + 12 + go.height + 22);
    const y = Math.round(Math.max(56, height / 2 - h / 2));
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(x + 6, y + 6, w, h);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 3 });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, headH);
    // intestazione: pallini dell'avanzamento della giornata, evento e ora
    const head = bodyText(this, x + 16, y + 6, `EVENTO ${this.run.index + 1} DI ${this.run.events.length}`, { size: 20, color: COLORS.paper });
    for (let k = 0; k < this.run.events.length; k += 1) {
      g.fillStyle(k < this.run.index ? COLORS.steelLight : k === this.run.index ? COLORS.red : COLORS.steel, 1);
      g.fillRect(x + 28 + head.width + k * 14, y + 13, 8, 8);
    }
    const time = bodyText(this, x + w - 16, y + 6, this.event.time, { size: 20, color: COLORS.steelLight, origin: [1, 0] });
    let cy = y + headH + 18;
    title.setPosition(x + pad, cy);
    cy += 26 + 10;
    desc.setPosition(x + pad, cy);
    cy += desc.height + 18;
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + pad, cy - 9, w - pad * 2, 2);
    taskLabel.setPosition(x + pad, cy);
    cy += 24;
    const rowItems = [];
    rows.forEach((r) => {
      const rh = Math.max(26, r.text.height);
      // quadratino con il numero (o il simbolo) della task
      const colorBox = r.kind === "care" ? 0x5c7a6b : r.kind === "fix" ? COLORS.red : COLORS.ink;
      g.fillStyle(colorBox, 1);
      g.fillRect(x + pad, cy + 1, 24, 24);
      const num = bodyText(this, x + pad + 12, cy + 1, r.kind === "care" ? "+" : r.kind === "fix" ? "!" : `${r.i + 1}`, { size: 20, color: COLORS.paper, origin: [0.5, 0] });
      rowItems.push(num);
      r.text.setPosition(x + pad + 36, cy);
      rowItems.push(r.text);
      if (r.tag) {
        const tw = Math.round(r.tag.width + 12);
        const tx = x + w - pad - tw;
        g.fillStyle(colorBox, 1);
        g.fillRect(tx, cy + 4, tw, 18);
        r.tag.setPosition(tx + 6, cy + 4 + Math.round((18 - r.tag.height) / 2));
        rowItems.push(r.tag);
      }
      cy += rh + 8;
    });
    // piè di pagina: tasto per iniziare, lampeggia piano
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + pad, y + h - go.height - 22, w - pad * 2, 2);
    go.label.setPosition(x + w - pad - go.width, y + h - go.height - 12);
    this.tweens.add({ targets: go.label, alpha: 0.45, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    card.add([dim, brandMarks(this, x, y, w, h, { color: COLORS.paper, alpha: 0.8 }), g, head, time, title, desc, taskLabel, ...rowItems, go.label]);
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
    if (step.type === "emergency") {
      this.emergencyTimer = 0;
      this.emergencyCures = 0;
      this.updateEmergencyObjective();
    }
  }

  updateEmergencyObjective() {
    const need = this.step?.cures ?? 0;
    const done = Math.min(this.emergencyCures ?? 0, need);
    this.objective.setText(done < need ? `CURE ${done}/${need} · STABILIZZA LA PIANTA` : "PIANTA STABILE · TORNA A CASA!");
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
        this.emergencyCures = (this.emergencyCures ?? 0) + 1;
        this.updateEmergencyObjective();
        this.addOxygen(0.05);
        this.player.act("cheer", 420, 10);
        const left = (this.step?.cures ?? 0) - this.emergencyCures;
        showToast(this, left > 0 ? `Cura riuscita! Ne mancano ${left}.` : "Pianta stabile! Corri a casa.", { duration: 1400 });
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
    Sfx.negligence();
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
    Sfx.o2Gain();
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
      // timbro "TASK COMPLETATA": cala dall'alto, schiaccia e rimbalza, poi scivola via
      const banner = this.add.container(width / 2 + 120, 200).setDepth(1500);
      const label = pixelText(this, 14, 0, "TASK COMPLETATA", { size: 16, color: COLORS.paper, origin: 0.5 });
      const bw = label.width + 64;
      const bg = this.add.graphics();
      drawPanel(bg, -bw / 2, -22, bw, 44, { fill: COLORS.ink, border: COLORS.inkDeep });
      bg.fillStyle(0x5c7a6b, 1);
      bg.fillRect(-bw / 2 + 2, -20, 30, 40);
      const tick = this.add.image(-bw / 2 + 17, 0, "check").setScale(2);
      const marks = brandMarks(this, -bw / 2, -22, bw, 44, { color: COLORS.ink, gap: 7, lines: false });
      banner.add([marks, bg, tick, label]);
      banner.setScale(1.8).setAlpha(0);
      this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 180, ease: "Quad.easeIn", onComplete: () => {
        this.cameras.main.shake(90, 0.003);
        burst(this, banner.x, banner.y, { colors: [0x9fd4b0, COLORS.paper, 0x5c7a6b], count: 14, spread: bw / 2 + 20, gravity: 0, depth: 1499, duration: 450 });
        this.tweens.add({ targets: banner, scaleX: 1.08, scaleY: 0.9, duration: 70, yoyo: true });
      } });
      this.tweens.add({ targets: banner, alpha: 0, x: banner.x + 60, duration: 260, delay: 1400, ease: "Cubic.easeIn", onComplete: () => banner.destroy() });
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
      // casella che si riempie dal basso, spunta che "cade" con rimbalzo
      const fill = this.add.graphics();
      c.add(fill);
      const fillP = { t: 0 };
      this.tweens.add({
        targets: fillP,
        t: 1,
        duration: 160,
        onUpdate: () => {
          fill.clear();
          fill.fillStyle(0x5c7a6b, 1);
          const hh = Math.round(18 * fillP.t / 2) * 2;
          fill.fillRect(x + 14, target.ry + 20 - hh, 18, hh);
        }
      });
      const check = this.add.image(x + 23, target.ry - 14, "check").setScale(2).setAlpha(0);
      c.add(check);
      this.tweens.add({ targets: check, y: target.ry + 11, alpha: 1, duration: 260, delay: 120, ease: "Bounce.easeOut" });
      this.time.delayedCall(260, () => burst(this, x + 23, target.ry + 11, { colors: [0x9fd4b0, 0x5c7a6b], count: 8, spread: 18, gravity: 0, depth: 1501, size: 2, duration: 300 }));

      // matita in pixel art inclinata a 45°: punta di grafite, legno, corpo giallo, ghiera, gomma
      const strike = this.add.graphics();
      const pencil = this.add.graphics();
      const px = (i, color, size = 2) => {
        pencil.fillStyle(color, 1);
        pencil.fillRect(i * 2, -i * 2 - size, size, size);
      };
      px(0, COLORS.inkDeep);
      px(1, 0x3a3633);
      for (let i = 2; i < 4; i += 1) { px(i, 0xd9b48c, 2); pencil.fillStyle(0xd9b48c, 1); pencil.fillRect(i * 2 - 2, -i * 2 - 2, 2, 2); }
      for (let i = 4; i < 12; i += 1) {
        pencil.fillStyle(0xe8c66a, 1);
        pencil.fillRect(i * 2 - 2, -i * 2 - 2, 4, 4);
        pencil.fillStyle(0xc9a23d, 1);
        pencil.fillRect(i * 2, -i * 2, 2, 2);
      }
      pencil.fillStyle(COLORS.stone, 1);
      pencil.fillRect(22, -26, 4, 4);
      pencil.fillRect(24, -28, 4, 4);
      pencil.fillStyle(0xd98a9a, 1);
      pencil.fillRect(26, -32, 5, 5);
      // ombra della matita sul foglio
      const shadow = this.add.graphics();
      shadow.fillStyle(COLORS.inkDeep, 0.15);
      for (let i = 2; i < 14; i += 1) shadow.fillRect(i * 2 + 4, -i * 2 + 4, 2, 2);
      c.add([strike, shadow, pencil]);

      const startX = x + 42;
      const lineY = target.ry + 11;
      const length = target.label.width + 4;
      pencil.setPosition(startX - 6, lineY - 16).setAlpha(0);
      shadow.setPosition(startX, lineY).setAlpha(0);
      // la matita arriva dall'alto e si appoggia
      this.tweens.add({ targets: pencil, alpha: 1, x: startX, y: lineY + 1, duration: 200, delay: 300, ease: "Quad.easeOut" });
      this.tweens.add({ targets: shadow, alpha: 1, duration: 200, delay: 300 });
      const progress = { t: 0 };
      // tratto a mano: piccole oscillazioni di 1 px lungo la riga
      const wobble = Array.from({ length: Math.ceil(length / 4) + 1 }, (_, i) => (i % 5 === 2 ? 1 : i % 7 === 4 ? -1 : 0));
      this.tweens.add({
        targets: progress,
        t: 1,
        delay: 520,
        duration: 620,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          const len = Math.round(length * progress.t);
          strike.clear();
          strike.fillStyle(COLORS.ink, 1);
          for (let sx = 0; sx < len; sx += 4) strike.fillRect(startX + sx, lineY + wobble[sx >> 2], Math.min(4, len - sx), 2);
          const jitter = Math.round(Math.sin(progress.t * 40));
          pencil.setPosition(startX + len, lineY + 1 + jitter);
          shadow.setPosition(startX + len, lineY + 1);
          // polvere di grafite
          if (Math.random() < 0.35) {
            const dust = this.add.rectangle(startX + len, lineY + 2, 2, 2, COLORS.stone).setDepth(1501);
            c.add(dust);
            this.tweens.add({ targets: dust, y: dust.y + 6, x: dust.x - 4, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
          }
        },
        onComplete: () => {
          target.label.setColor(hex(COLORS.stone));
          // doppio colpetto finale e via
          this.tweens.add({ targets: pencil, y: pencil.y - 4, duration: 70, yoyo: true, repeat: 1, onComplete: () => {
            this.tweens.add({ targets: [pencil, shadow], alpha: 0, x: "+=14", y: "-=14", duration: 220, ease: "Quad.easeIn" });
          } });
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
      const stable = (this.emergencyCures ?? 0) >= (step.cures ?? 0);
      const atHome = this.player.x >= this.world.points.home.x - 30;
      if (!stable && this.emergencyTimer > step.actionEveryMs) {
        this.openPlant(Phaser.Utils.Array.GetRandom(EMERGENCY_ACTIONS), true);
      } else if (atHome && !stable) {
        // a casa non si entra con la pianta ancora infestata: la cura successiva arriva subito
        if (!this.homeBlockedToast || this.time.now - this.homeBlockedToast > 2500) {
          this.homeBlockedToast = this.time.now;
          showToast(this, "La pianta non è stabile: completa le cure!", { color: COLORS.red, duration: 1600 });
        }
        this.emergencyTimer = Math.max(this.emergencyTimer, step.actionEveryMs - 900);
      } else if (atHome) {
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
    const player = this.player;
    player.velocity.set(0, 0);
    // va alla panchina, si gira verso il pubblico e si siede con un piccolo rimbalzo
    this.tweens.add({
      targets: player,
      x: seat.x,
      y: seat.y,
      duration: 420,
      ease: "Sine.easeInOut",
      onComplete: () => {
        player.setDepth(460);
        const now = this.time.now;
        player.actionFrame = "sit";
        player.actionUntil = now + duration + 200;
        player.sprite.setScale(4.4, 3.4);
        this.tweens.add({ targets: player.sprite, scaleX: 4, scaleY: 4, duration: 260, ease: "Back.easeOut" });

        // panino in pixel art: pane, insalata e pomodoro
        const food = this.add.graphics().setDepth(470);
        food.fillStyle(0xd9a75a, 1);
        food.fillRect(-8, -6, 16, 4);
        food.fillStyle(0x7fae86, 1);
        food.fillRect(-9, -2, 18, 2);
        food.fillStyle(0xb4553f, 1);
        food.fillRect(-8, 0, 16, 2);
        food.fillStyle(0xc98a42, 1);
        food.fillRect(-8, 2, 16, 4);
        const hand = { x: player.x + 18 * player.facing, y: player.y - 40 };
        const mouth = { x: player.x + 6 * player.facing, y: player.y - 58 };
        food.setPosition(hand.x, hand.y);

        // morsi: il braccio porta il panino alla bocca, briciole che cadono, il panino si accorcia
        const bites = Math.max(3, Math.floor((duration - 600) / 650));
        let left = 1;
        for (let i = 0; i < bites; i += 1) {
          this.time.delayedCall(300 + i * 650, () => {
            if (!food.active) return;
            player.actionFrame = "sitEat";
            this.tweens.add({
              targets: food,
              x: mouth.x,
              y: mouth.y,
              duration: 160,
              ease: "Quad.easeOut",
              yoyo: true,
              hold: 120,
              onYoyo: () => {
                left = Math.max(0.25, left - 0.75 / bites);
                food.setScale(left, 1);
                for (let k = 0; k < 3; k += 1) {
                  const crumb = this.add.rectangle(mouth.x + Phaser.Math.Between(-6, 6), mouth.y + 4, 2, 2, 0xd9a75a).setDepth(471);
                  this.tweens.add({ targets: crumb, y: player.y - 4, x: crumb.x + Phaser.Math.Between(-8, 8), alpha: 0, duration: 500, ease: "Quad.easeIn", onComplete: () => crumb.destroy() });
                }
              },
              onComplete: () => {
                player.actionFrame = "sit";
              }
            });
          });
        }
        ["gnam", "gnam!", "o2"].forEach((word, i) => {
          this.time.delayedCall(600 + i * 700, () => {
            const x = player.x + Phaser.Math.Between(-30, 30);
            const t = (word === "o2"
              ? o2Label(this, x, player.y - 110, { px: 22, color: COLORS.ink, prefix: "+" })
              : bodyText(this, x, player.y - 110, word, { size: 22, color: COLORS.ink, origin: 0.5 })
            ).setDepth(980);
            this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
          });
        });
        // si alza, si stiracchia ed esulta
        this.time.delayedCall(duration, () => {
          food.destroy();
          player.actionUntil = 0;
          player.sprite.setScale(3.6, 4.6);
          this.tweens.add({ targets: player.sprite, scaleX: 4, scaleY: 4, duration: 260, ease: "Back.easeOut" });
          this.tweens.add({ targets: player, y: this.world.points.bench.y, duration: 300, ease: "Sine.easeOut" });
          this.time.delayedCall(260, () => player.act("cheer", 500, 10));
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
    this.banner("TASK COMPLETATA!", COLORS.ink);
    Sfx.task();
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
