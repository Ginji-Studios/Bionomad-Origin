import Phaser from "../phaser.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 60, "BIONOMAD ORIGIN", {
      color: "#d8f3dc",
      fontFamily: "Georgia",
      fontSize: "42px"
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 8, "INVIO  citta   2  casa   3  ufficio", {
      color: "#95d5b2",
      fontFamily: "Arial",
      fontSize: "18px"
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 48, "4  protagonista   6  selezione   T  tutorial", {
      color: "#74c69d",
      fontFamily: "Arial",
      fontSize: "18px"
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 88, "C  crediti", {
      color: "#52b788",
      fontFamily: "Arial",
      fontSize: "18px"
    }).setOrigin(0.5);

    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("CityScene"));
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("CityScene"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("HouseScene"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("OfficeScene"));
    this.input.keyboard.on("keydown-FOUR", () => this.scene.start("CharacterScene"));
    this.input.keyboard.on("keydown-SIX", () => this.scene.start("CharacterSelectScene"));
    this.input.keyboard.on("keydown-T", () => this.scene.start("TutorialScene"));
    this.input.keyboard.on("keydown-C", () => this.scene.start("CreditsScene"));
  }
}