import Phaser from "../phaser.js";
import { addSceneChrome } from "./SceneUi.js";
import { setupSceneNavigation } from "../systems/SceneNavigation.js";
import { getOrigin } from "../config/origins.js";
import { COLORS, ditherGradient, ditherRect, drawPanel, pixelArrow, showToast } from "../ui/theme.js";

export class HouseScene extends Phaser.Scene {
  constructor() {
    super("HouseScene");
  }

  create(data) {
    const { width } = this.scale;
    const hasPack = Boolean(this.registry.get("hasPack"));
    const { hud, objective } = addSceneChrome(this, {
      location: getOrigin(this.registry).country,
      flag: getOrigin(this.registry).flag,
      oxygen: hasPack ? 1 : 0.26,
      objective: hasPack ? "2 · ESCI DI CASA" : "1 · RACCOGLI LO ZAINO",
      background: 0xdadfda
    });

    this.drawRoom(width);
    this.drawGreenhouse(40, 104);
    this.drawDoor(820, 250);

    // Lo zaino BIONOMAD+ da raccogliere, segnalato dalla freccia gialla.
    this.packItem = this.add.image(700, 432, "plant_tall").setOrigin(0.5, 1).setScale(4).setDepth(430);
    const marker = this.add.graphics().setDepth(431);
    pixelArrow(marker, 700, 340, "down", COLORS.red, 5);
    this.tweens.add({ targets: marker, y: 8, duration: 360, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.packMarker = marker;
    if (hasPack) {
      this.packItem.setVisible(false);
      marker.setVisible(false);
    }

    this.navigation = setupSceneNavigation(this, data, {
      spawnX: 380,
      floor: [440, 480],
      right: { scene: "CityScene", label: "città" },
      onInteract: (player) => {
        const nearPack = Phaser.Math.Distance.Between(player.x, player.y, 700, 432) < 110;
        if (nearPack && !this.registry.get("hasPack")) {
          this.registry.set("hasPack", true);
          player.setPack(true);
          this.packItem.setVisible(false);
          this.packMarker.setVisible(false);
          this.tweens.addCounter({ from: hud.oxygen, to: 1, duration: 1200, ease: "Cubic.easeOut", onUpdate: (tween) => hud.setOxygen(tween.getValue()) });
          objective.setText("2 · ESCI DI CASA");
          showToast(this, "Hai indossato BIONOMAD+. Ora puoi respirare.", { color: COLORS.green });
          return;
        }
        const nearGreenhouse = player.x < 360;
        showToast(this, nearGreenhouse ? "Le piantine della serra crescono lente." : "Non c'è nulla da osservare qui.");
      }
    });
  }

  drawRoom(width) {
    const g = this.add.graphics();
    // Parete: carta con ombra a retino verso il basso
    ditherGradient(g, 0, 52, width, 366, COLORS.panelLight, 0, 8, 8);
    g.fillStyle(COLORS.panelLight, 1);
    for (let x = 0; x < width; x += 64) g.fillRect(x, 52, 2, 366);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(0, 418, width, 14);
    // Pavimento
    g.fillStyle(COLORS.stone, 1);
    g.fillRect(0, 432, width, 108);
    ditherRect(g, 0, 432, width, 108, COLORS.steel, 3);
    g.fillStyle(0x8e9693, 1);
    for (let y = 452; y < 540; y += 22) g.fillRect(0, y, width, 2);
  }

  drawGreenhouse(x, y) {
    const w = 300;
    const h = 326;
    const g = this.add.graphics();

    // Lampada sopra la serra
    g.fillStyle(COLORS.inkDeep, 1);
    g.fillRect(x + 100, y - 6, 100, 12);

    drawPanel(g, x, y + 8, w, h, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 4 });
    ditherRect(g, x + 4, y + 12, w - 8, h - 8, COLORS.steelLight, 2);
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x + w / 2 - 2, y + 8, 4, h);

    const shelves = [y + 96, y + 186, y + 276];
    shelves.forEach((shelfY, row) => {
      g.fillStyle(COLORS.steel, 1);
      g.fillRect(x + 4, shelfY, w - 8, 6);
      for (let i = 0; i < 8; i += 1) {
        const key = (i + row) % 3 === 0 ? "pot_flower" : "pot_plant";
        this.add.image(x + 26 + i * 35, shelfY, key).setOrigin(0.5, 1).setScale(2.5);
      }
    });

    // Riflessi sul vetro
    const glare = this.add.graphics();
    glare.fillStyle(COLORS.steelLight, 1);
    for (let i = 0; i < 10; i += 1) {
      glare.fillRect(x + 24 + i * 4, y + 30 + i * 4, 4, 4);
      glare.fillRect(x + 220 + i * 4, y + 200 + i * 4, 4, 4);
    }

  }

  drawDoor(x, y) {
    const g = this.add.graphics();
    drawPanel(g, x, y, 84, 182, { fill: COLORS.steel, border: COLORS.ink, borderWidth: 6 });
    g.fillStyle(0x4f6f84, 1);
    g.fillRect(x + 16, y + 20, 52, 60);
    g.fillRect(x + 16, y + 96, 52, 66);
    g.fillStyle(COLORS.paper, 1);
    g.fillRect(x + 64, y + 92, 6, 8);
  }

  update(time, delta) {
    this.navigation?.update(delta);
  }
}
