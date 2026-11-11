import Phaser from "../phaser.js";
import { addSceneChrome } from "./SceneUi.js";
import { setupSceneNavigation } from "../systems/SceneNavigation.js";
import { Npc } from "../entities/Npc.js";
import { getOrigin } from "../config/origins.js";
import { COLORS, ditherGradient, ditherRect, pixelDisc, showToast } from "../ui/theme.js";

const NPC_LINES = [
  "Senza zaino non si arriva a fine strada.",
  "La mia pianta oggi ha bisogno di luce.",
  "Hai sentito? Il filtro dell'aria in piazza è rotto.",
  "Ricordati di non scuoterla, poverina."
];

export class CityScene extends Phaser.Scene {
  constructor() {
    super("CityScene");
  }

  create(data) {
    const { width } = this.scale;
    this.hasPack = Boolean(this.registry.get("hasPack"));
    this.origin = getOrigin(this.registry);
    const { hud } = addSceneChrome(this, {
      location: this.origin.city,
      flag: this.origin.flag,
      oxygen: this.hasPack ? 1 : 0.45,
      objective: `${this.origin.city} · ${this.origin.country}`,
      background: 0xf1f0ed
    });
    this.hud = hud;

    this.drawSky(width);
    this.drawSkyline(width);
    this.drawStreet(width);

    this.walkers = [
      new Npc(this, 120, 452, "Ada", { texture: "npc_a_mask", speed: 38, direction: 1 }),
      new Npc(this, 300, 470, "Bruno", { texture: "hero_lio_mask", speed: 46, direction: -1 }),
      new Npc(this, 620, 446, "Carla", { texture: "npc_b_mask", speed: 32, direction: 1 }),
      new Npc(this, 860, 476, "Dario", { texture: "npc_c_mask", speed: 42, direction: -1 })
    ];

    this.navigation = setupSceneNavigation(this, data, {
      spawnX: 420,
      floor: [430, 482],
      masked: true, // all'aperto si indossa la mascherina
      left: { scene: "HouseScene", label: "casa" },
      right: { scene: "OfficeScene", label: "ufficio" },
      onInteract: (player) => {
        const near = this.walkers.find((npc) => Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 90);
        if (near) {
          near.setMood("happy");
          this.time.delayedCall(1500, () => near.setMood("calm"));
          showToast(this, `${near.name}: ${Phaser.Utils.Array.GetRandom(NPC_LINES)}`);
        } else {
          showToast(this, "Cammina verso qualcuno per parlare.");
        }
      }
    });

    if (!this.hasPack) {
      showToast(this, "L'aria è irrespirabile: torna a casa a prendere lo zaino!", { color: COLORS.red, duration: 3500 });
    }
  }

  drawSky(width) {
    const g = this.add.graphics();
    // cielo di smog
    ditherGradient(g, 0, 52, width, 332, COLORS.steelLight, 1, 11, 10);
    pixelDisc(g, 700, 150, 46, COLORS.paper, 1, 4);
    pixelDisc(g, 700, 150, 46, COLORS.steelLight, 0.35, 4);
  }

  drawSkyline(width) {
    const base = 384;
    const far = this.add.graphics();
    const farBlocks = [[0, 70, 150], [60, 90, 190], [160, 60, 120], [480, 80, 170], [600, 50, 230], [760, 110, 160], [880, 80, 200], [560, 44, 290]];
    farBlocks.forEach(([x, w, h]) => ditherRect(far, x, base - h, w, h, COLORS.steel, 7));

    const mid = this.add.graphics();
    const midColor = COLORS.steel;
    mid.fillStyle(midColor, 1);

    // galleria (arco)
    mid.fillRect(40, base - 110, 150, 110);
    pixelDisc(mid, 115, base - 110, 52, midColor, 1, 4);
    mid.fillStyle(COLORS.ink, 1);
    mid.fillRect(95, base - 80, 40, 80);

    // duomo con guglie
    mid.fillStyle(midColor, 1);
    mid.fillRect(220, base - 96, 190, 96);
    for (let x = 224; x < 410; x += 14) {
      const tall = (x - 224) % 42 === 0;
      mid.fillRect(x, base - 96 - (tall ? 54 : 30), 4, tall ? 54 : 30);
    }
    mid.fillRect(310, base - 186, 8, 90);
    mid.fillStyle(COLORS.paper, 1);
    mid.fillRect(310, base - 194, 8, 8);

    // torre Velasca (a fungo)
    mid.fillStyle(midColor, 1);
    mid.fillRect(452, base - 190, 56, 190);
    mid.fillRect(440, base - 250, 80, 60);
    mid.fillRect(446, base - 256, 68, 6);

    mid.fillRect(640, base - 150, 100, 150);
    mid.fillRect(800, base - 120, 120, 120);

    // finestre a "caratteri"
    mid.fillStyle(COLORS.steelLight, 1);
    for (let y = base - 140; y < base - 10; y += 18) {
      for (let x = 650; x < 730; x += 16) mid.fillRect(x, y, 6, 8);
    }
    for (let y = base - 110; y < base - 10; y += 18) {
      for (let x = 812; x < 910; x += 16) mid.fillRect(x, y, 6, 8);
    }
    for (let y = base - 240; y < base - 196; y += 14) {
      for (let x = 448; x < 514; x += 12) mid.fillRect(x, y, 6, 6);
    }
    for (let x = 228; x < 404; x += 20) mid.fillRect(x, base - 70, 8, 40);
    ditherRect(mid, 220, base - 24, 190, 24, COLORS.ink, 6);

    // lampioni
    const lamps = this.add.graphics();
    [150, 420, 690].forEach((x) => {
      lamps.fillStyle(COLORS.inkDeep, 1);
      lamps.fillRect(x, base - 140, 6, 140);
      lamps.fillRect(x - 14, base - 140, 34, 4);
      ditherRect(lamps, x - 14, base - 132, 34, 24, COLORS.paper, 5);
      lamps.fillStyle(COLORS.paper, 1);
      lamps.fillRect(x - 8, base - 136, 20, 8);
    });
  }

  drawStreet(width) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.stone, 1);
    g.fillRect(0, 384, width, 30);
    g.fillStyle(0x8e9693, 1);
    for (let x = 0; x < width; x += 48) g.fillRect(x, 384, 2, 30);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(0, 412, width, 4);
    g.fillStyle(0x3b4f5c, 1);
    g.fillRect(0, 416, width, 124);
    ditherRect(g, 0, 416, width, 124, COLORS.inkDeep, 4);
    g.fillStyle(COLORS.panelLight, 1);
    for (let x = 10; x < width; x += 90) g.fillRect(x, 470, 44, 6);
  }

  update(time, delta) {
    this.navigation?.update(delta);
    this.walkers?.forEach((npc) => {
      npc.update(delta, time);
      npc.setDepth(npc.y);
    });

    if (!this.hasPack && this.hud.oxygen > 0.05) {
      // più la città è inquinata, più in fretta finisce l'ossigeno senza zaino
      this.hud.setOxygen(this.hud.oxygen - delta / (this.origin.drainSeconds * 1000));
    }
  }
}
