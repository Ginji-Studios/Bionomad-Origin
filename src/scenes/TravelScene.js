import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { faint, Player } from "../entities/Player.js";
import { Npc } from "../entities/Npc.js";
import { MockPlantInput } from "../input/MockPlantInput.js";
import { getOrigin } from "../config/origins.js";
import { failRun, getRun, nextDestination } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { drawSign, drawStreetFloor } from "../world/locations.js";
import { drawCityscape, ZONES } from "../world/cityscape.js";
import { addHud, addObjectiveBox, bodyText, COLORS, ditherRect, drawPanel, dropShadow, fadeIn, goTo, pixelArrow, pixelDisc, pixelText, showToast, targetMarker, textChip } from "../ui/theme.js";

const WORLD_W = 1920;
const NAMES = { home: "CASA", office: "UFFICIO", foodtruck: "FOOD TRUCK", busstop: "FERMATA BUS", bus: "FERMATA BUS", street: "CITTÀ" };

// tragitto a piedi tra una tappa e l'altra
export class TravelScene extends Phaser.Scene {
  constructor() {
    super("TravelScene");
  }

  create() {
    const { width, height } = this.scale;
    this.run = getRun(this.registry);
    if (!this.run) {
      this.scene.start("MenuScene");
      return;
    }
    this.origin = getOrigin(this.registry);
    this.destination = nextDestination(this.registry);
    this.arrived = false;

    // già a casa e la prossima tappa è casa
    if (this.destination.location === "home" && this.run.lastLocation === "home") {
      const finished = this.run.index >= this.run.events.length;
      this.scene.start(finished ? "EndScene" : "EventScene", finished ? { result: "win" } : undefined);
      return;
    }
    fadeIn(this, 350);

    const from = NAMES[this.run.lastLocation] ?? "CASA";
    const to = NAMES[this.destination.location];
    const evening = this.destination.evening;

    // città a livelli con parallasse
    // i quartieri cambiano ordine a ogni run (zoneOffset estratto all'inizio)
    this.zone = ZONES[(this.run.index + 1 + (this.run.zoneOffset ?? 0)) % ZONES.length];
    this.add.rectangle(WORLD_W / 2, height / 2, WORLD_W, height, COLORS.bg).setDepth(-20);
    drawCityscape(this, this.origin.id, { evening, width: WORLD_W, parallax: true, zone: this.zone });
    drawStreetFloor(this, evening, WORLD_W);

    this.drawProps(evening, from, to);

    // passanti con zaino e mascherina, anche famiglie con i bambini (zainetto e maschera piccoli);
    // ognuno ogni tanto si ferma a curare il proprio BIONOMAD (o lo trascura)
    const textures = this.origin.id === "delhi" ? ["npc_d_mask", "npc_a_mask", "npc_b_mask"] : ["npc_a_mask", "npc_b_mask", "npc_c_mask"];
    this.npcs = [];
    [260, 700, 1100, 1500, 1820].forEach((x, i) => {
      const speed = 28 + i * 6;
      const direction = i % 2 ? -1 : 1;
      const y = 440 + (i % 3) * 18;
      const npc = new Npc(this, x, y, "", { texture: textures[i % 3], speed, direction, lively: true });
      npc.worldWidth = WORLD_W;
      this.npcs.push(npc);
      // genitore con il figlio per mano
      if (i % 2 === 0) {
        const kid = new Npc(this, x + 44 * direction, y + 8, "", { texture: textures[(i + 1) % 3], speed, direction, child: true, lively: true });
        kid.worldWidth = WORLD_W;
        npc.partner = kid;
        kid.partner = npc;
        this.npcs.push(kid);
      }
    });

    this.player = new Player(this, 70, 456, {
      texture: characterTexture(this.origin.id, true),
      withPack: true,
      floor: [404, 482],
      worldWidth: WORLD_W
    });
    this.inputProvider = new MockPlantInput(this);

    this.cameras.main.setBounds(0, 0, WORLD_W, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, 0, 60);

    this.hud = addHud(this, { oxygen: this.run.oxygen, location: this.origin.city, flag: this.origin.flag });
    addObjectiveBox(this, `RAGGIUNGI: ${to}`);
    textChip(this, 14, height - 30, `QUARTIERE ${this.zone.toUpperCase()}`, { size: 18 });
    textChip(this, width - 14, height - 30, "D / →  cammina", { size: 20, originX: 1 });
    this.createRouteBar(from, to);
    setAmbient(evening ? "night" : "city");
    this.setupSmogPeaks();

    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  drawProps(evening, from, to) {
    const g = this.add.graphics().setDepth(380);
    // aiuole con piante filtranti
    [520, 1120, 1560].forEach((x) => {
      this.add.image(x, 404, "plant_tall").setOrigin(0.5, 1).setScale(3).setDepth(404);
    });

    // cartelli di partenza e arrivo
    drawSign(this, 150, from, { dir: "left", sub: "da qui" });
    drawSign(this, WORLD_W / 2, to, { dir: "right", sub: "900 m" });
    drawSign(this, WORLD_W - 150, to, { dir: "right", sub: "arrivo" });

    // primo piano
    const front = this.add.graphics().setDepth(700).setScrollFactor(1.3, 1);
    for (let x = 300; x < WORLD_W * 1.3; x += 520) {
      front.fillStyle(0x3f6560, 1);
      for (let i = 0; i < 4; i += 1) pixelDisc(front, x + i * 22, 524, 18, 0x3f6560, 1, 2);
      ditherRect(front, x - 18, 520, 100, 20, 0x1c2839, 5);
    }

    // freccia di arrivo che pulsa
    this.goal = targetMarker(this, { depth: 900 }).setPosition(WORLD_W - 60, 336);
    this.tweens.addCounter({ from: -6, to: 6, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut", onUpdate: (t) => this.goal.bob(t.getValue()) });
  }

  // percorso in alto: una linea "della metro" tra partenza e arrivo
  createRouteBar(from, to) {
    const { width } = this.scale;
    const x0 = width / 2 - 170;
    const x1 = width / 2 + 170;
    const y = 76;
    const fix = (obj, depth = 1001) => obj.setDepth(depth).setScrollFactor(0);
    const g = fix(this.add.graphics(), 1000);
    dropShadow(g, x0 - 150, y - 20, 640, 40, 4);
    drawPanel(g, x0 - 150, y - 20, 640, 40, { fill: COLORS.paper, border: COLORS.ink });
    // testate: partenza (blu) e arrivo (ruggine)
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x0 - 150, y - 20, 132, 40);
    g.fillStyle(COLORS.red, 1);
    g.fillRect(x1 + 18, y - 20, 132, 40);
    fix(pixelText(this, x0 - 84, y - 12, "DA", { size: 8, color: COLORS.steelLight, origin: [0.5, 0] }));
    fix(bodyText(this, x0 - 84, y + 6, from, { size: 20, color: COLORS.paper, origin: 0.5, fit: 120 }));
    fix(pixelText(this, x1 + 84, y - 12, "VERSO", { size: 8, color: COLORS.paper, origin: [0.5, 0] }));
    fix(bodyText(this, x1 + 84, y + 6, to, { size: 20, color: COLORS.paper, origin: 0.5, fit: 120 }));
    // binario tratteggiato con tacche
    g.fillStyle(COLORS.panelLight, 1);
    for (let x = x0; x < x1; x += 12) g.fillRect(x, y - 2, 8, 4);
    g.fillStyle(COLORS.steel, 1);
    [0.25, 0.5, 0.75].forEach((t) => g.fillRect(Math.round(x0 + (x1 - x0) * t) - 1, y + 6, 2, 6));
    this.routeFill = fix(this.add.graphics());
    // stazioni alle estremità
    const stations = fix(this.add.graphics(), 1002);
    [[x0, COLORS.ink], [x1, COLORS.red]].forEach(([x, color]) => {
      stations.fillStyle(color, 1);
      stations.fillRect(x - 7, y - 7, 14, 14);
      stations.fillStyle(COLORS.paper, 1);
      stations.fillRect(x - 3, y - 3, 6, 6);
    });
    // il cittadino in miniatura cammina lungo la linea
    const base = this.player.baseTexture;
    this.routeDot = fix(this.add.image(x0, y + 8, base).setOrigin(0.5, 1).setScale(1.5), 1003);
    this.time.addEvent({ delay: 180, loop: true, callback: () => this.routeDot.setTexture(this.routeDot.texture.key === base ? `${base}_w1` : base) });
    this.route = { x0, x1, y };
  }

  // picco di inquinamento: ogni tanto l'aria peggiora di colpo. Suona la sirena, il cielo
  // si scurisce e tutti i passanti si fermano a curare il proprio BIONOMAD
  setupSmogPeaks() {
    const { width, height } = this.scale;
    const level = this.origin.smog ?? 0;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, level >= 2 ? 0x8a6a3a : 0x6e6a60, 0).setScrollFactor(0).setDepth(600);
    const peak = () => {
      if (this.arrived) return;
      Sfx.siren();
      showToast(this, "PICCO DI PM2.5 · CURA IL TUO PRESIDIO", { color: COLORS.red, y: 150, duration: 3200 });
      this.tweens.add({ targets: veil, fillAlpha: 0.16 + level * 0.06, duration: 900, yoyo: true, hold: 3200, ease: "Sine.easeInOut" });
      this.cameras.main.shake(300, 0.002);
      // i cittadini rispondono: si fermano e si prendono cura della pianta
      this.npcs.forEach((npc, i) => {
        if (!npc.busy) npc.careTimer = 200 + i * 260;
      });
      // l'ossigeno cala un po' più in fretta finché dura il picco
      this.peakUntil = this.time.now + 4500;
    };
    this.time.addEvent({ delay: 26000 - level * 4000, loop: true, callback: peak });
    this.time.delayedCall(9000, peak);
  }

  update(time, delta) {
    if (!this.player || this.arrived) return;
    this.player.update(this.inputProvider.getState(), delta, time);
    this.npcs.forEach((npc) => {
      npc.update(delta, time);
      npc.setDepth(npc.y);
    });

    // avanzamento sulla barra del percorso
    const progress = Phaser.Math.Clamp((this.player.x - 70) / (WORLD_W - 110), 0, 1);
    const { x0, x1, y } = this.route;
    this.routeFill.clear();
    this.routeFill.fillStyle(COLORS.ink, 1);
    this.routeFill.fillRect(x0, y - 2, (x1 - x0) * progress, 4);
    this.routeDot.setX(x0 + (x1 - x0) * progress);

    // in strada l'ossigeno scende, ma a metà velocità rispetto agli eventi
    const peakFactor = this.peakUntil && this.time.now < this.peakUntil ? 1.6 : 1;
    this.hud.setOxygen(this.hud.oxygen - (delta * peakFactor) / (this.origin.drainSeconds * 2000));
    if (this.hud.oxygen <= 0) {
      this.arrived = true;
      this.hud.setOxygen(0);
      failRun(this.registry);
      faint(this.player).then(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose", fainted: true })));
      return;
    }

    if (this.player.x >= WORLD_W - 40) {
      this.arrived = true;
      this.run.oxygen = this.hud.oxygen;
      this.registry.set("run", this.run);
      const home = this.destination.location === "home";
      goTo(this, home ? "EndScene" : "EventScene", home ? { result: "win" } : undefined);
    }
  }
}
