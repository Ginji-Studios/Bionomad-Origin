import Phaser from "../phaser.js";
import { addSceneChrome } from "./SceneUi.js";
import { setupSceneNavigation } from "../systems/SceneNavigation.js";
import { getOrigin } from "../config/origins.js";
import { COLORS, ditherGradient, ditherRect, drawPanel, pixelDisc, showToast } from "../ui/theme.js";

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super("OfficeScene");
  }

  create(data) {
    const { width } = this.scale;
    addSceneChrome(this, {
      location: "UFFICIO",
      flag: getOrigin(this.registry).flag,
      oxygen: this.registry.get("hasPack") ? 0.9 : 0.4,
      objective: "3 · TROVA LA NOTA DI LAVORO",
      background: 0xdadfda
    });

    const g = this.add.graphics();
    // Parete a pannelli e pavimento
    ditherGradient(g, 0, 52, width, 362, COLORS.panelLight, 0, 8, 8);
    g.fillStyle(COLORS.panelLight, 1);
    for (let x = 0; x < width; x += 96) g.fillRect(x, 52, 2, 362);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(0, 414, width, 14);
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(0, 428, width, 112);
    g.fillStyle(COLORS.stone, 1);
    for (let col = 0; col * 32 < width; col += 1) for (let row = 0; row * 32 < 112; row += 1) if ((col + row) % 2 === 0) g.fillRect(col * 32, 428 + row * 32, 32, 32);

    // Finestra sulla città nello smog
    drawPanel(g, 330, 84, 300, 150, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 6 });
    ditherGradient(g, 336, 90, 288, 138, COLORS.steelLight, 2, 10, 6);
    pixelDisc(g, 560, 130, 22, COLORS.paper, 1, 4);
    g.fillStyle(COLORS.steel, 1);
    [[336, 40, 60], [380, 30, 90], [416, 50, 50], [470, 26, 110], [500, 60, 70], [566, 58, 80]].forEach(([x, w, h]) => g.fillRect(x, 228 - h, w, h));
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(478, 84, 4, 150);

    this.drawDesk(g, 60, 330);
    this.drawDesk(g, 690, 330);

    // Archivio
    drawPanel(g, 880, 236, 64, 180, { fill: COLORS.stone, border: COLORS.ink, borderWidth: 3 });
    g.fillStyle(COLORS.ink, 1);
    for (let y = 280; y < 416; y += 44) g.fillRect(884, y, 56, 3);
    g.fillStyle(COLORS.paper, 1);
    for (let y = 252; y < 416; y += 44) g.fillRect(906, y, 12, 4);

    this.add.image(300, 420, "plant_tall").setOrigin(0.5, 1).setScale(4);

    this.navigation = setupSceneNavigation(this, data, {
      spawnX: 820,
      floor: [436, 486],
      left: { scene: "CityScene", label: "città" },
      onInteract: (player) => {
        const nearDesk = Phaser.Math.Distance.Between(player.x, player.y, 170, 440) < 160;
        showToast(this, nearDesk ? "Hai trovato una nota sul lavoro di oggi." : "L'ufficio è silenzioso.");
      }
    });
  }

  drawDesk(g, x, y) {
    // Monitor con schermo verde
    drawPanel(g, x + 60, y - 70, 100, 64, { fill: COLORS.inkDeep, border: COLORS.ink, borderWidth: 4 });
    g.fillStyle(COLORS.steelLight, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(x + 72, y - 58 + i * 10, 40 + ((i * 23) % 30), 4);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x + 104, y - 6, 12, 8);
    // Piano e gambe
    g.fillStyle(COLORS.steel, 1);
    g.fillRect(x, y, 220, 18);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y + 18, 220, 6);
    g.fillRect(x + 8, y + 24, 12, 74);
    g.fillRect(x + 200, y + 24, 12, 74);
  }

  update(time, delta) {
    this.navigation?.update(delta);
  }
}
