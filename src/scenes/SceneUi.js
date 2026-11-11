import Phaser from "../phaser.js";

export function addSceneChrome(scene, title, subtitle, backgroundColor) {
  const { width, height } = scene.scale;

  scene.add.rectangle(width / 2, height / 2, width, height, backgroundColor);
  scene.add.text(28, 22, title, {
    color: "#d8f3dc",
    fontFamily: "Georgia",
    fontSize: "32px"
  });
  scene.add.text(30, 66, subtitle, {
    color: "#95d5b2",
    fontFamily: "Arial",
    fontSize: "16px"
  });
  scene.add.text(width - 28, height - 26, "ESC  torna al menu", {
    color: "#b7e4c7",
    fontFamily: "Arial",
    fontSize: "15px"
  }).setOrigin(1, 0.5);

  scene.input.keyboard.once("keydown-ESC", () => scene.scene.start("MenuScene"));
}

export function addLabel(scene, text, x, y, color = "#d8f3dc", size = "18px") {
  return scene.add.text(x, y, text, {
    color,
    fontFamily: "Arial",
    fontSize: size
  });
}