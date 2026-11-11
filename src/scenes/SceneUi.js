import { addCornerHints, addHud, addObjectiveBox, bodyText, COLORS, fadeIn, goTo, hex } from "../ui/theme.js";

// cornice comune delle scene di gioco
export function addSceneChrome(scene, { location = "ITALIA", flag = "flag_it", objective, oxygen = 1, background = COLORS.bg } = {}) {
  const { width, height } = scene.scale;
  fadeIn(scene);
  scene.add.rectangle(width / 2, height / 2, width, height, background);

  const hud = addHud(scene, { oxygen, location, flag });
  const objectiveBox = objective ? addObjectiveBox(scene, objective) : null;

  scene.input.keyboard.once("keydown-ESC", () => goTo(scene, "MenuScene"));
  return { hud, objective: objectiveBox };
}

// etichetta in VT323 (le vecchie dimensioni vengono ingrandite)
export function addLabel(scene, text, x, y, color = hex(COLORS.text), size = "18px") {
  const px = Math.round(parseInt(size, 10) * 1.4);
  return bodyText(scene, x, y, text, { size: px }).setColor(color);
}

export { addCornerHints };
