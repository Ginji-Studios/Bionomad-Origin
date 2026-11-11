export class InputProvider {
  getState() {
    return {
      moisture: 0,
      touch: false,
      light: 0,
      connected: false
    };
  }
}