import { MockPlantInput } from "../input/MockPlantInput.js";
import { Player } from "../entities/Player.js";
import { characterTexture } from "../ui/pixelSprites.js";
import { addCornerHints, COLORS, drawPanel, goTo, pixelArrow, textChip } from "../ui/theme.js";

export function setupSceneNavigation(scene, data = {}, options = {}) {
  const { width, height } = scene.scale;
  const floor = options.floor ?? [430, 490];
  const player = new Player(scene, data.spawnX ?? options.spawnX ?? width / 2, data.spawnY ?? floor[1] - 10, {
    texture: characterTexture(scene.registry.get("selectedCharacter"), Boolean(options.masked)),
    withPack: Boolean(scene.registry.get("hasPack")),
    floor
  });
  const inputProvider = new MockPlantInput(scene);

  addCornerHints(scene, "WASD muovi · SPAZIO");

  const plates = scene.add.graphics().setDepth(900);
  const arrows = scene.add.graphics().setDepth(901);
  scene.tweens.add({ targets: arrows, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  const midY = (floor[0] + floor[1]) / 2 - 40;
  if (options.left) {
    textChip(scene, 14, midY + 36, options.left.label.toUpperCase(), { size: 20, depth: 900 });
    drawPanel(plates, 14, midY - 20, 50, 40, { fill: COLORS.paper, border: COLORS.ink });
    pixelArrow(arrows, 22, midY, "left", COLORS.ink, 4);
  }
  if (options.right) {
    textChip(scene, width - 14, midY + 36, options.right.label.toUpperCase(), { size: 20, originX: 1, depth: 900 });
    drawPanel(plates, width - 64, midY - 20, 50, 40, { fill: COLORS.paper, border: COLORS.ink });
    pixelArrow(arrows, width - 22, midY, "right", COLORS.ink, 4);
  }

  scene.input.keyboard.on("keydown-SPACE", () => options.onInteract?.(player));

  return {
    player,
    update(delta) {
      const input = inputProvider.getState();
      player.update(input, delta, scene.time.now);

      if (player.x <= 24 && options.left) {
        goTo(scene, options.left.scene, { spawnX: width - 70, spawnY: player.y });
      }

      if (player.x >= width - 24 && options.right) {
        goTo(scene, options.right.scene, { spawnX: 70, spawnY: player.y });
      }
    }
  };
}
