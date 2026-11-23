import Phaser from "../phaser.js";
import { setAudioPaused } from "../systems/Sfx.js";
import { box, button, C, ditherTitle, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

// pausa per il team (tasto P o doppio tocco con due dita): congela tutto, audio compreso
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
    sm.run("PauseScene", { keys });
    sm.bringToTop("PauseScene");
  }

  init(data) {
    this.pausedKeys = data.keys ?? [];
  }

  create() {
    this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.7).setOrigin(0);
    box(this, VIEW.w / 2 - 260, VIEW.h / 2 - 140, 520, 280, { alpha: 0.96, border: C.c4 });
    ditherTitle(this, VIEW.w / 2, VIEW.h / 2 - 70, "PAUSA", { size: 52, origin: 0.5 });
    button(this, VIEW.w / 2 - 150, VIEW.h / 2 + 10, 300, 76, "RIPRENDI ▶", () => this.resumeGame(), { primary: true, size: 28 });
    // si riprende con il tasto START
  }

  resumeGame() {
    setAudioPaused(false);
    this.pausedKeys.forEach((key) => {
      this.scene.get(key)?.input?.keyboard?.resetKeys();
      this.scene.resume(key);
    });
    this.scene.stop();
  }
}
