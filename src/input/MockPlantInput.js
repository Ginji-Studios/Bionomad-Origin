import { InputProvider } from "./InputProvider.js";
import { PlantSensors } from "./PlantSensors.js";

// input del giocatore
export class MockPlantInput extends InputProvider {
  constructor(scene) {
    super();
    this.keys = scene.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,C,I,H,V,Q,E");
  }

  getState() {
    const sensors = PlantSensors.state;
    const leaf = Number(sensors.touchRight) - Number(sensors.touchLeft);
    const keyX = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
    return {
      ...sensors,
      movement: {
        x: keyX !== 0 ? keyX : sensors.connected ? leaf : 0,
        y: Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown)
      }
    };
  }
}
