import Phaser from "./phaser.js";
import { toggleMute, unlockAudio } from "./systems/Sfx.js";
import { gameConfig } from "./config/gameConfig.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { setupTouchControls } from "./input/TouchControls.js";
import { PlantSensors } from "./input/PlantSensors.js";

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

// pulsante START del BIONOMAD: avvia (nei menu fa la scelta) e mette in pausa durante il gioco.
// Ogni scena può avere onStart(); se non ce l'ha, il pulsante mette in pausa / riprende.
game.events.on("poststep", () => {
  if (!PlantSensors.takeStart()) return;
  const sm = game.scene;
  if (sm.isActive("PauseScene")) return PauseScene.toggle(game);
  const top = sm.getScenes(true).filter((sc) => !["BootScene", "PreloadScene"].includes(sc.scene.key)).pop();
  if (top?.onStart) top.onStart();
  else PauseScene.toggle(game);
});
