import Phaser from "../phaser.js";
import { COLORS, drawPanel, bodyText, pixelText, keyLabel, brandMarks } from "../ui/theme.js";
import { setAudioPaused } from "../systems/Sfx.js";

// pausa per il team (tasto P): congela tutte le scene attive, audio compreso,
// e le fa ripartire esattamente da dove erano. Utile durante le presentazioni
const SKIP = ["BootScene", "PreloadScene", "PauseScene"];

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  static toggle(game) {
    const sm = game.scene;
    if (sm.isActive("PauseScene")) {
      sm.getScene("PauseScene").resumeGame();
      return;
    }
    const running = sm.getScenes(true).filter((sc) => !SKIP.includes(sc.scene.key));
    if (!running.length) return;
    const keys = running.map((sc) => sc.scene.key);
    running.forEach((sc) => sc.scene.pause());
    setAudioPaused(true);
    if (sm.getScene("PauseScene")) sm.run("PauseScene", { keys });
    else sm.start("PauseScene", { keys });
    sm.bringToTop("PauseScene");
  }

  init(data) {
    this.pausedKeys = data.keys ?? [];
  }

  create() {
    const { width, height } = this.scale;
    // velo blu: il gioco resta visibile sotto, fermo
    this.add.rectangle(0, 0, width, height, 0x1c2839, 0.62).setOrigin(0);
    const w = 380;
    const h = 150;
    const x = Math.round(width / 2 - w / 2);
    const y = Math.round(height / 2 - h / 2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(x + 6, y + 6, w, h);
    drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink, borderWidth: 3 });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, y, w, 34);
    // simbolo di pausa: due barre
    g.fillStyle(COLORS.red, 1);
    g.fillRect(x + 16, y + 10, 4, 14);
    g.fillRect(x + 24, y + 10, 4, 14);
    bodyText(this, x + 40, y + 6, "PAUSA", { size: 20, color: COLORS.paper });
    bodyText(this, x + w - 16, y + 6, "TEAM", { size: 20, color: COLORS.steelLight, origin: [1, 0] });
    pixelText(this, width / 2, y + 62, "GIOCO IN PAUSA", { size: 16, color: COLORS.ink, origin: 0.5 });
    const go = keyLabel(this, "P  riprendi", { size: 20 });
    go.label.setPosition(Math.round(width / 2 - go.width / 2), y + h - 24 - go.height);
    brandMarks(this, x, y, w, h, { color: COLORS.ink });
    this.tweens.add({ targets: go.label, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
  }

  resumeGame() {
    setAudioPaused(false);
    this.pausedKeys.forEach((key) => {
      const sc = this.scene.get(key);
      if (!sc) return;
      // i tasti premuti o rilasciati durante la pausa non restano "incastrati"
      sc.input?.keyboard?.resetKeys();
      this.scene.resume(key);
    });
    this.scene.stop();
  }
}
