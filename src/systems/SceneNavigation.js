import { MockPlantInput } from "../input/MockPlantInput.js";
import { Player } from "../entities/Player.js";
import { addLabel } from "../scenes/SceneUi.js";

export function setupSceneNavigation(scene, data = {}, options = {}) {
  const { width, height } = scene.scale;
  const player = new Player(scene, data.spawnX ?? options.spawnX ?? width / 2, data.spawnY ?? height - 140);
  const inputProvider = new MockPlantInput(scene);

  addLabel(scene, "WASD / frecce: muovi   SPAZIO: interagisci", 28, height - 26, "#d8f3dc", "14px");

  if (options.left) {
    addLabel(scene, `< ${options.left.label}`, 34, height / 2 + 24, "#f4d35e", "15px");
  }

  if (options.right) {
    addLabel(scene, `${options.right.label} >`, width - 34, height / 2 + 24, "#f4d35e", "15px").setOrigin(1, 0);
  }

  scene.input.keyboard.on("keydown-SPACE", () => options.onInteract?.(player));

  return {
    player,
    update(delta) {
      const input = inputProvider.getState();
      player.update(input, delta);

      if (player.x <= 24 && options.left) {
        scene.scene.start(options.left.scene, { spawnX: width - 70 });
      }

      if (player.x >= width - 24 && options.right) {
        scene.scene.start(options.right.scene, { spawnX: 70 });
      }
    }
  };
}