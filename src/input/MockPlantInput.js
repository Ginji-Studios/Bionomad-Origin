import { InputProvider } from "./InputProvider.js";

export class MockPlantInput extends InputProvider {
  constructor(scene) {
    super();
    this.keys = scene.input.keyboard.addKeys("W,A,S,D,SPACE");
  }

  getState() {
    return {
      moisture: this.keys.D.isDown ? 0.8 : 0.35,
      touch: this.keys.SPACE.isDown,
      light: this.keys.W.isDown ? 0.9 : 0.5,
      connected: false,
      movement: {
        x: Number(this.keys.D.isDown) - Number(this.keys.A.isDown),
        y: Number(this.keys.S.isDown) - Number(this.keys.W.isDown)
      }
    };
  }
}