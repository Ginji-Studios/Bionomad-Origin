import Phaser from "./phaser.js";
import { toggleMute, unlockAudio } from "./systems/Sfx.js";
import { gameConfig } from "./config/gameConfig.js";
import { setupTouchControls } from "./input/TouchControls.js";

new Phaser.Game({
  ...gameConfig,
  parent: "game"
});

setupTouchControls();

// audio: si sblocca al primo tasto o clic; M lo attiva e disattiva
window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "KeyM") toggleMute();
});
window.addEventListener("pointerdown", () => unlockAudio());
