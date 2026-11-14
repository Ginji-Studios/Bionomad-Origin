import Phaser from "./phaser.js";
import { toggleMute, unlockAudio } from "./systems/Sfx.js";
import { gameConfig } from "./config/gameConfig.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { setupTouchControls } from "./input/TouchControls.js";

const game = new Phaser.Game({
  ...gameConfig,
  parent: "game"
});
window.game = game;
setupTouchControls();

// audio: si sblocca al primo tocco; M lo attiva e disattiva
window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "KeyM") toggleMute();
  // P: pausa per il team
  if (e.code === "KeyP" && !e.repeat) PauseScene.toggle(game);
});
window.addEventListener("pointerdown", () => unlockAudio());
// sul tablet: tocco con tre dita = pausa per il team
window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 3) PauseScene.toggle(game);
});
