import { InputProvider } from "./InputProvider.js";
import { inputConfig } from "../config/inputConfig.js";

export class SerialPlantInput extends InputProvider {
  constructor() {
    super();
    this.state = this.getState();
  }

  updateFromSerial(data) {
    this.state = {
      ...this.state,
      moisture: this.normalize(data.moisture, inputConfig.moistureMin, inputConfig.moistureMax),
      light: this.normalize(data.light, inputConfig.lightMin, inputConfig.lightMax),
      touch: data.touch >= inputConfig.touchThreshold,
      connected: true
    };
  }

  getState() {
    return this.state ?? super.getState();
  }

  normalize(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
}