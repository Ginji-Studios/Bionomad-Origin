import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
    this.selectedIndex = 0;
    this.cards = [];
  }

  create() {
    const { width, height } = this.scale;
    addSceneChrome(this, "Scegli il protagonista", "Seleziona il personaggio con cui iniziare il viaggio.", 0x16213e);

    this.add.text(width / 2, 112, "A / D oppure frecce   |   INVIO per confermare", {
      color: "#a8dadc",
      fontFamily: "Arial",
      fontSize: "17px"
    }).setOrigin(0.5);

    const characters = [
      { name: "Nara", trait: "La curiosa", color: 0xe9c46a, detail: "Osserva ogni dettaglio del mondo." },
      { name: "Lio", trait: "Il sensibile", color: 0x90be6d, detail: "Sente i cambiamenti prima degli altri." },
      { name: "Sela", trait: "La pratica", color: 0xf4a261, detail: "Trasforma i problemi in percorsi." }
    ];

    characters.forEach((character, index) => this.createCard(character, index));
    this.selectionText = addLabel(this, "", width / 2, height - 72, "#f4d35e", "18px").setOrigin(0.5);
    this.updateSelection();

    this.input.keyboard.on("keydown-LEFT", () => this.changeSelection(-1));
    this.input.keyboard.on("keydown-A", () => this.changeSelection(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeSelection(1));
    this.input.keyboard.on("keydown-D", () => this.changeSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.confirmSelection());
  }

  createCard(character, index) {
    const x = 210 + index * 270;
    const y = 300;
    const container = this.add.container(x, y);
    const panel = this.add.rectangle(0, 0, 220, 270, 0x213a5a);
    const frame = this.add.rectangle(0, 0, 230, 280, 0xf4d35e, 0).setStrokeStyle(3, 0xf4d35e);
    const head = this.add.circle(0, -72, 44, 0xf2c6a0);
    const body = this.add.rectangle(0, 15, 88, 110, character.color);
    const name = this.add.text(0, 82, character.name, {
      color: "#f1faee",
      fontFamily: "Georgia",
      fontSize: "26px"
    }).setOrigin(0.5);
    const trait = this.add.text(0, 112, character.trait, {
      color: "#a8dadc",
      fontFamily: "Arial",
      fontSize: "16px"
    }).setOrigin(0.5);

    container.add([panel, frame, head, body, name, trait]);
    this.cards.push({ container, frame, character });
  }

  changeSelection(direction) {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.cards.length);
    this.updateSelection();
  }

  updateSelection() {
    this.cards.forEach((card, index) => {
      const selected = index === this.selectedIndex;
      card.frame.setAlpha(selected ? 1 : 0);
      this.tweens.add({
        targets: card.container,
        scale: selected ? 1.08 : 1,
        duration: 220,
        ease: "Sine.easeOut"
      });
    });

    const selected = this.cards[this.selectedIndex].character;
    this.selectionText?.setText(`${selected.name}: ${selected.detail}`);
  }

  confirmSelection() {
    const selected = this.cards[this.selectedIndex].character;
    this.registry.set("selectedCharacter", selected.name);
    this.scene.start("CharacterScene");
  }
}