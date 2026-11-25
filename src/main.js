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
// pagina ricaricata: se l'Arduino era già stato autorizzato, si ricollega da solo
PlantSensors.autoConnect();

// schermo sempre acceso finché il gioco è aperto (niente standby di PC / tablet durante la mostra).
// Il browser lo toglie quando la pagina va in secondo piano: lo si richiede appena torna visibile.
let wakeLock = null;
async function keepAwake() {
  try {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || wakeLock) return;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => (wakeLock = null));
  } catch {
    // non supportato o negato: si riprova al prossimo tocco
  }
}
keepAwake();
document.addEventListener("visibilitychange", keepAwake);
window.addEventListener("pointerdown", keepAwake);
window.addEventListener("keydown", keepAwake);

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

// pulsante START del BIONOMAD: premuto e lasciato = conferma (onStart() della scena),
// tenuto premuto = pausa / riprendi. In pausa anche una pressione breve riprende.
// luci dei tasti arcade: si accende il tasto di cui è il turno
//   ACQUA / ARIA  durante la task di irrigazione / ventilazione
//   START         quando premerlo fa qualcosa (scena con onStart() e, se la scena lo dice, startLit())
function lampsFor(sm) {
  const top = sm.getScenes(true).filter((sc) => !["BootScene", "PreloadScene"].includes(sc.scene.key)).pop();
  if (!top) return "";
  if (top.scene.key === "PauseScene") return "S";
  const goal = top.bio?.open && !top.bio.done ? top.bio.step?.goal : null;
  if (goal === "water") return "I";
  if (goal === "air") return "A";
  if (goal) return "";
  if (!top.onStart) return "";
  return !top.startLit || top.startLit() ? "S" : "";
}

game.events.on("poststep", () => {
  const sm = game.scene;
  PlantSensors.lamps(lampsFor(sm));
  if (PlantSensors.takePause()) return PauseScene.toggle(game);
  if (!PlantSensors.takeStart()) return;
  if (sm.isActive("PauseScene")) return PauseScene.toggle(game);
  const top = sm.getScenes(true).filter((sc) => !["BootScene", "PreloadScene"].includes(sc.scene.key)).pop();
  top?.onStart?.();
});
