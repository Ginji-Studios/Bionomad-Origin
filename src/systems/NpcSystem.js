export class NpcSystem {
  constructor(scene, npcs) {
    this.scene = scene;
    this.npcs = npcs;
  }

  update(input, player) {
    for (const npc of this.npcs) {
      const distance = this.scene.physics?.world
        ? this.scene.physics.world.distanceBetween(player, npc)
        : Math.hypot(player.x - npc.x, player.y - npc.y);

      npc.setMood(input.touch && distance < 100 ? "happy" : "calm");
    }
  }
}