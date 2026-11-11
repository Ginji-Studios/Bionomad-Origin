import Phaser from "../phaser.js";
import { addLabel, addSceneChrome } from "./SceneUi.js";

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create() {
    const { width } = this.scale;
    addSceneChrome(this, "Tutorial", "Le regole di base per muovere i primi passi nel mondo.", 0x102a43);

    const panels = [
      ["01", "Esplora", "Visita la citta, la casa e l'ufficio per scoprire il contesto."],
      ["02", "Ascolta", "Avvicinati agli NPC e osserva come reagiscono alle tue scelte."],
      ["03", "Interagisci", "La pianta fornira input fisici che potranno cambiare il mondo di gioco."],
      ["04", "Conosci", "Parla con i personaggi e ricostruisci la storia di Bionomad."]
    ];

    panels.forEach(([number, title, description], index) => {
      const x = 70 + (index % 2) * 430;
      const y = 145 + Math.floor(index / 2) * 155;
      this.add.rectangle(x + 190, y + 48, 370, 120, 0x1c4966);
      addLabel(this, number, x + 24, y + 20, "#f4d35e", "24px");
      addLabel(this, title, x + 82, y + 20, "#d8f3dc", "22px");
      addLabel(this, description, x + 24, y + 62, "#bde0fe", "16px").setWordWrapWidth(320);
    });

    addLabel(this, "Input attuale: tastiera   |   Input futuro: pianta + Elegoo Uno R3", width / 2 - 300, 478, "#8ecae6", "16px");
  }
}