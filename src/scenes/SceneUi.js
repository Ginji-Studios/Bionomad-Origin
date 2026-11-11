import { addCornerHints, addHud, addObjectiveBox, bodyText, COLORS, fadeIn, goTo, hex } from "../ui/theme.js";

// Cornice comune delle scene di gioco: sfondo, HUD ossigeno, obiettivo in basso, ESC per il menu.
export function addSceneChrome(scene, { location = "ITALIA", flag = "flag_it", objective, oxygen = 1, background = COLORS.bg } = {}) {
  const { width, height } = scene.scale;
  fadeIn(scene);
  scene.add.rectangle(width / 2, height / 2, width, height, background);

  const hud = addHud(scene, { oxygen, location, flag });
  const objectiveBox = objective ? addObjectiveBox(scene, objective) : null;

  scene.input.keyboard.once("keydown-ESC", () => goTo(scene, "MenuScene"));
  return { hud, objective: objectiveBox };
}

// Etichetta con il font pixel "VT323" (le dimensioni vecchie vengono ingrandite per restare leggibili).
export function addLabel(scene, text, x, y, color = hex(COLORS.text), size = "18px") {
  const px = Math.round(parseInt(size, 10) * 1.4);
  return bodyText(scene, x, y, text, { size: px }).setColor(color);
}

export { addCornerHints };
