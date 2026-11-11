import Phaser from "../phaser.js";
import { EVENTS } from "../config/events.js";
import { getOrigin } from "../config/origins.js";
import { getRun, startRun } from "../systems/RunManager.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { addTopBar, bodyText, COLORS, drawPanel, dropShadow, goTo, paperGrid, pixelDisc, pixelText, textChip } from "../ui/theme.js";

// Esito della run: A = Fine giornata (vittoria), B = Task fallite · Game over.
export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create(data = {}) {
    const { width, height } = this.scale;
    const win = data.result === "win";
    const run = getRun(this.registry);
    const origin = getOrigin(this.registry);

    paperGrid(this);
    addTopBar(this, win ? "FINE GIORNATA" : "GAME OVER", origin.city);

    // Badge A / B
    const color = win ? 0x5c7a6b : COLORS.red;
    const g = this.add.graphics();
    pixelDisc(g, 110, 128, 26, color, 1, 2);
    pixelText(this, 110, 128, win ? "A" : "B", { size: 16, color: COLORS.paper, origin: 0.5 });
    pixelText(this, 150, 116, win ? "FINE GIORNATA" : "TASK FALLITE · GAME OVER", { size: 16, color: COLORS.ink });
    bodyText(
      this,
      150,
      140,
      win
        ? "Le tre task sono risolte una dopo l'altra. L'O2 si riempie e il cittadino rientra a casa, lieto di aver concluso la sua routine nel migliore dei modi."
        : "Non sei riuscito a portare a termine una task: l'ossigeno è finito. Riprova, la tua pianta ti aspetta.",
      { size: 24, color: COLORS.steel, wrap: 700, lineSpacing: -2 }
    );

    // Riepilogo eventi
    const panelX = 84;
    const panelY = 236;
    const p = this.add.graphics();
    dropShadow(p, panelX, panelY, 440, 200, 8);
    drawPanel(p, panelX, panelY, 440, 200, { fill: COLORS.paper, border: COLORS.ink });
    p.fillStyle(COLORS.ink, 1);
    p.fillRect(panelX, panelY, 440, 26);
    pixelText(this, panelX + 12, panelY + 9, "RIEPILOGO DELLA RUN", { size: 8, color: COLORS.paper });
    (run?.events ?? []).forEach((id, i) => {
      const result = run.results[i];
      const y = panelY + 46 + i * 44;
      const ok = result === "ok";
      const rowColor = ok ? COLORS.ink : result === "fail" ? COLORS.red : COLORS.stone;
      drawPanel(p, panelX + 16, y, 28, 28, { fill: ok ? COLORS.ink : result === "fail" ? COLORS.red : COLORS.paper, border: rowColor });
      if (result) this.add.image(panelX + 30, y + 14, ok ? "check" : "cross").setScale(3);
      bodyText(this, panelX + 56, y + 2, `${EVENTS[id].time}  ${EVENTS[id].title}`, { size: 24, color: rowColor });
    });

    // Il cittadino: festeggia o si accascia
    const hero = this.add.container(720, 430);
    const pack = this.add.image(-45, -36, "pack").setOrigin(0.5, 1).setScale(6);
    const body = this.add.image(0, 0, characterTexture(origin.id, !win)).setOrigin(0.5, 1).setScale(6);
    hero.add([pack, body]);
    const ground = this.add.graphics();
    ground.fillStyle(COLORS.panelLight, 1);
    ground.fillRect(600, 430, 240, 10);
    if (win) {
      this.tweens.add({ targets: hero, y: 400, duration: 360, yoyo: true, repeat: -1, ease: "Quad.easeOut" });
      this.time.addEvent({
        delay: 300,
        loop: true,
        callback: () => {
          const b = this.add.graphics();
          pixelDisc(b, 0, 0, 8, COLORS.ink, 1, 2);
          pixelDisc(b, 0, 0, 6, COLORS.paper, 1, 2);
          b.setPosition(675 + Phaser.Math.Between(-10, 10), 330);
          this.tweens.add({ targets: b, y: 180, alpha: 0, x: b.x + Phaser.Math.Between(-40, 40), duration: 2200, ease: "Sine.easeOut", onComplete: () => b.destroy() });
        }
      });
    } else {
      // Senza ossigeno: il cittadino si accascia e perde colore
      body.setTint(0x9fb4c2);
      pack.setTint(0x9fb4c2);
      this.tweens.add({ targets: hero, scaleY: 0.82, duration: 700, ease: "Bounce.easeOut" });
    }

    // O2 finale
    const bar = this.add.graphics();
    const o2 = { value: win ? 0 : run?.oxygen ?? 0.3 };
    const target = win ? 1 : 0;
    pixelText(this, 600, 466, "O2", { size: 8, color: COLORS.ink });
    this.tweens.add({
      targets: o2,
      value: target,
      duration: 1400,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        bar.clear();
        drawPanel(bar, 624, 460, 216, 20, { fill: COLORS.paper, border: COLORS.ink });
        bar.fillStyle(win ? COLORS.steel : COLORS.red, 1);
        bar.fillRect(628, 464, Math.round(208 * o2.value), 12);
      }
    });

    textChip(this, 84, height - 40, "INVIO  nuova run", { size: 22 });
    textChip(this, 260, height - 40, "ESC  menu", { size: 22 });
    this.input.keyboard.once("keydown-ENTER", () => {
      startRun(this.registry, origin.id);
      goTo(this, "IntroScene");
    });
    this.input.keyboard.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }
}
