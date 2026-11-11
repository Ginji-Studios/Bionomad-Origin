import Phaser from "../phaser.js";
import { Player } from "../entities/Player.js";
import { Npc } from "../entities/Npc.js";
import { MockPlantInput } from "../input/MockPlantInput.js";
import { getOrigin } from "../config/origins.js";
import { failRun, getRun, nextDestination } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { drawSign, drawStreetFloor } from "../world/locations.js";
import { drawCityscape, ZONES } from "../world/cityscape.js";
import { addHud, addObjectiveBox, bodyText, COLORS, ditherRect, drawPanel, fadeIn, goTo, pixelArrow, pixelDisc, pixelText, textChip } from "../ui/theme.js";

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
    this.zone = ZONES[(this.run.index + 1) % ZONES.length];
    this.add.rectangle(WORLD_W / 2, height / 2, WORLD_W, height, COLORS.bg).setDepth(-20);
    drawCityscape(this, this.origin.id, { evening, width: WORLD_W, parallax: true, zone: this.zone });
    drawStreetFloor(this, evening, WORLD_W);

    this.drawProps(evening, from, to);

    // passanti con zaino e mascherina
    const textures = this.origin.id === "delhi" ? ["npc_d_mask", "npc_a_mask", "npc_b_mask"] : ["npc_a_mask", "npc_b_mask", "npc_c_mask"];
    this.npcs = [300, 820, 1300, 1700].map((x, i) => {
      const npc = new Npc(this, x, 440 + (i % 3) * 18, "", { texture: textures[i % 3], speed: 28 + i * 6, direction: i % 2 ? -1 : 1 });
      npc.worldWidth = WORLD_W;
      return npc;
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

    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  drawProps(evening, from, to) {
    const g = this.add.graphics().setDepth(380);
    // lampioni lungo la strada
    for (let x = 240; x < WORLD_W; x += 360) {
      g.fillStyle(COLORS.inkDeep, 1);
      g.fillRect(x, 230, 6, 150);
      g.fillRect(x - 14, 230, 34, 4);
      g.fillStyle(evening ? 0xe8c66a : COLORS.paper, 1);
      g.fillRect(x - 8, 234, 20, 8);
      if (evening) {
        g.fillStyle(0xe8c66a, 0.16);
        g.fillRect(x - 36, 242, 78, 138);
      }
    }
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
    this.goal = this.add.graphics().setDepth(900);
    pixelArrow(this.goal, WORLD_W - 40, 440, "right", COLORS.red, 5);
    this.tweens.add({ targets: this.goal, x: 8, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  createRouteBar(from, to) {
    const { width } = this.scale;
    const x0 = width / 2 - 180;
    const x1 = width / 2 + 180;
    const y = 74;
    const g = this.add.graphics().setDepth(1000).setScrollFactor(0);
    drawPanel(g, x0 - 120, y - 18, 600, 36, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x0, y - 2, x1 - x0, 4);
    bodyText(this, x0 - 10, y, from, { size: 20, color: COLORS.steel, origin: [1, 0.5] }).setDepth(1001).setScrollFactor(0);
    bodyText(this, x1 + 10, y, to, { size: 20, color: COLORS.ink, origin: [0, 0.5] }).setDepth(1001).setScrollFactor(0);
    this.routeFill = this.add.graphics().setDepth(1001).setScrollFactor(0);
    this.routeDot = this.add.image(x0, y - 2, "heart").setScale(2).setDepth(1002).setScrollFactor(0);
    this.route = { x0, x1, y };
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
    this.hud.setOxygen(this.hud.oxygen - delta / (this.origin.drainSeconds * 2000));
    if (this.hud.oxygen <= 0) {
      this.arrived = true;
      failRun(this.registry);
      goTo(this, "EndScene", { result: "lose" });
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
