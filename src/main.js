import Phaser from "./phaser.js";
import { toggleMute, unlockAudio } from "./systems/Sfx.js";
import { gameConfig } from "./config/gameConfig.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { setupTouchControls } from "./input/TouchControls.js";
import { PlantSensors } from "./input/PlantSensors.js";
import { filmOverlay, bandBackdrop } from "./ui/film.js";
import { filmLook } from "./art/filmLook.js";

// stile del riferimento OVUNQUE: ogni disegno che diventa texture (personaggi, zaino, oggetti,
// illustrazioni, crediti, tutorial) passa dalla palette smorzata + grana prima di entrare nel gioco.
// Escluse le texture interne di Phaser ("__…") e i canvas marcati _noFilm (logo del brand).
const addCanvas0 = Phaser.Textures.TextureManager.prototype.addCanvas;
Phaser.Textures.TextureManager.prototype.addCanvas = function (key, source, skipCache) {
  // escluse anche le strisce sottili (sfumature allungate a tutto schermo): la grana stirata
  // diventerebbe righe; la pellicola sopra il gioco le copre già
  const thin = source && (source.width < 48 || source.height < 48);
  if (source && !thin && !String(key).startsWith("__") && !source._noFilm) filmLook(source, source._filmOpts);
  return addCanvas0.call(this, key, source, skipCache);
};

const game = new Phaser.Game({
  ...gameConfig,
  parent: "game"
});
window.game = game;
// grana e bande di luce sopra tutto il gioco (stile del riferimento)
game.events.once("ready", () => filmOverlay(game.canvas));
// trama sfocata nelle bande ai lati del gioco
bandBackdrop();
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
//   START         solo quando serve per la task (la scena lo dice con startLit())
//   nel tutorial  il tasto che la mano sta mostrando
function lampsFor(sm) {
  const top = sm.getScenes(true).filter((sc) => !["BootScene", "PreloadScene"].includes(sc.scene.key)).pop();
  if (!top) return "";
  // tutorial: si accende il tasto che la mano sta mostrando (ACQUA, START, ARIA)
  if (top.scene.key === "TutorialScene") return top.lampNow ?? "";
  // task dello zaino: il tasto da premere
  const goal = top.bio?.open && !top.bio.done ? top.bio.step?.goal : null;
  if (goal === "water") return "I";
  if (goal === "air") return "A";
  if (goal) return "";
  // START solo quando serve per la task (posare, prendere, parlare, dormire, riprovare)
  return top.startLit && top.startLit() ? "S" : "";
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
