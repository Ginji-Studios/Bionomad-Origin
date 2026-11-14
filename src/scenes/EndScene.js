import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { dayTime, getRun } from "../systems/RunManager.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace } from "../art/places.js";
import { operatorKey } from "../art/people.js";
import { box, brackets, button, C, canvasImage, ditherBand, ditherTitle, fadeIn, goTo, HEX, skylineLayers, txt, VIEW } from "../ui/hud.js";

// fine giornata: esito, ossigeno finale, due pulsanti
export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create(data) {
    this._leaving = false;
    fadeIn(this, 400);
    setAmbient(null);
    const run = getRun(this.registry);
    const win = data?.result !== "lose" && !run?.failed;
    const origin = getOrigin(this.registry);
    const sky = skylineLayers(this, origin.id, buildSkyline, { time: dayTime(run) });
    this.cameras.main.setScroll(Math.round((sky.worldW - VIEW.w) * 0.1), 0);
    if (win) canvasImage(this, "place_home", buildPlace("home").canvas).setScrollFactor(0);
    const op = this.registry.get("operator") ?? "a";
    const hero = this.add.image(300, 764, `${operatorKey(this, op, origin.id)}_idle`).setOrigin(0.5, 1).setScrollFactor(0);
    if (!win) hero.setAngle(85).setY(770).setAlpha(0.8);
    brackets(this);
    if (win) {
      this.playFinalCutscene(run, hero);
      return;
    }
    this.showResult(run, false);
  }

  playFinalCutscene(run, hero) {
    this.inCutscene = true;
    const w = 820;
    const h = 300;
    const x = (VIEW.w - w) / 2;
    const y = (VIEW.h - h) / 2;
    const c = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.7).setOrigin(0);
    const panel = box(this, x, y, w, h, { alpha: 0.98, border: C.c4 });
    const band = ditherBand(this, x + 2, y + 2, w - 4, 70, { from: 0.06, to: 0.4 });
    const title = ditherTitle(this, x + 36, y + 22, "RITORNO A CASA", { size: 40 });
    const body = txt(this, x + 36, y + 120, "", { size: 23, wrap: w - 72 });
    const prompt = txt(this, x + w - 36, y + h - 30, "TOCCA O PREMI INVIO", { size: 16, color: HEX.c3, origin: [1, 1] });
    c.add([dim, panel, band, title, body, prompt]);
    prompt.setAlpha(0);

    this.tweens.add({ targets: hero, x: 540, duration: 2200, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: hero, y: 758, duration: 360, yoyo: true, repeat: 5, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });

    const message = "L'operatore rientra con la pianta stabile.\nL'aria di casa torna a essere respirabile.";
    let i = 0;
    this.time.addEvent({
      delay: 28,
      repeat: message.length - 1,
      callback: () => {
        i += 1;
        body.setText(message.slice(0, i));
        if (i === message.length) {
          this.tweens.add({ targets: prompt, alpha: 1, duration: 240 });
        }
      }
    });
    this.time.delayedCall(5600, () => this.finishFinalCutscene(run, c, hero));
    this.input.once("pointerup", () => this.finishFinalCutscene(run, c, hero));
    this.input.keyboard.once("keydown-ENTER", () => this.finishFinalCutscene(run, c, hero));
    this.input.keyboard.once("keydown-SPACE", () => this.finishFinalCutscene(run, c, hero));
  }

  finishFinalCutscene(run, cutscene, hero) {
    if (!this.inCutscene) return;
    this.inCutscene = false;
    this.tweens.killTweensOf(hero);
    hero.setPosition(540, 764);
    cutscene.destroy();
    this.showResult(run, true);
  }

  showResult(run, win) {
    const x = 420;
    const y = 110;
    const w = 800;
    box(this, x, y, w, 470, { alpha: 0.94, border: C.c4 }).setScrollFactor(0);
    ditherBand(this, x + 2, y + 2, w - 4, 96, { from: 0.06, to: 0.4 }).setScrollFactor(0);
    ditherTitle(this, x + 40, y + 26, win ? "GIORNATA COMPLETATA" : "OSSIGENO ESAURITO", { size: 44 }).setScrollFactor(0);

    // esito di conformità
    const pill = this.add.graphics().setScrollFactor(0);
    pill.fillStyle(win ? C.c4 : C.c0, 1);
    pill.fillRect(x + 40, y + 120, 420, 56);
    pill.lineStyle(2, C.c4, 1);
    pill.strokeRect(x + 41, y + 121, 418, 54);
    txt(this, x + 60, y + 148, win ? "✓ OPERATORE CONFORME" : "✗ OPERATORE NON CONFORME", { size: 26, color: win ? HEX.c0 : HEX.c4, origin: [0, 0.5] }).setScrollFactor(0);

    const done = run?.results?.filter((r) => r === "ok").length ?? 0;
    const total = run?.events?.length ?? 0;
    txt(this, x + 40, y + 210, `EVENTI COMPLETATI  ${done}/${total}`, { size: 24 }).setScrollFactor(0);
    const o2 = win ? run?.oxygen ?? 0 : 0;
    txt(this, x + 40, y + 256, "OSSIGENO FINALE", { size: 20, color: HEX.c3 }).setScrollFactor(0);
    const g = this.add.graphics().setScrollFactor(0);
    const n = Math.ceil(o2 * 20);
    for (let i = 0; i < 20; i += 1) {
      if (i < n) {
        g.fillStyle(C.c4, 1);
        g.fillRect(x + 40 + i * 34, y + 290, 28, 26);
      } else {
        g.lineStyle(2, C.c3, 1);
        g.strokeRect(x + 41 + i * 34, y + 291, 26, 24);
      }
    }
    button(this, x + 40, y + 360, 340, 76, "RIGIOCA ▶", () => goTo(this, "SetupScene"), { primary: true, size: 28 });
    button(this, x + 410, y + 360, 220, 76, "MENU", () => goTo(this, "MenuScene"), { size: 26 });
    this.input.keyboard.on("keydown-ENTER", () => goTo(this, "SetupScene"));
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));
    win ? Sfx.win() : Sfx.gameOver();
  }
}
