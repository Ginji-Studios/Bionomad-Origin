import Phaser from "./phaser.js";
import { toggleMute, unlockAudio } from "./systems/Sfx.js";
import { gameConfig } from "./config/gameConfig.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { setupTouchControls } from "./input/TouchControls.js";

const game = new Phaser.Game({
  ...gameConfig,
  parent: "game"
});

setupTouchControls();

// audio: si sblocca al primo tasto o clic; M lo attiva e disattiva
window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "KeyM") toggleMute();
  // P: pausa per il team, ferma e fa ripartire tutto il gioco
  if (e.code === "KeyP" && !e.repeat) PauseScene.toggle(game);
});
window.addEventListener("pointerdown", () => unlockAudio());
