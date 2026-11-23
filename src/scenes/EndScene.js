import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { dayTime, getRun, cityZone } from "../systems/RunManager.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace } from "../art/places.js";
import { dieFrames, operatorKey } from "../art/people.js";
import { brackets, button, C, canvasImage, fadeIn, goTo, HEX, skylineLayers, txt, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

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
    const sky = skylineLayers(this, origin.id, buildSkyline, { time: dayTime(run), zone: cityZone(run) });
    this.cameras.main.setScroll(Math.round((sky.worldW - VIEW.w) * 0.1), 0);
    if (win) canvasImage(this, `place_home_${origin.id}`, buildPlace("home", origin.id).canvas).setScrollFactor(0);
    const op = this.registry.get("operator") ?? "a";
    const key = operatorKey(this, op, origin.id);
    // personaggio: in piedi a casa se ce l'ha fatta, a terra (svenuto) se no
    const hero = this.add.image(win ? 250 : 230, 764, `${key}_idle`).setOrigin(0.5, 1).setScrollFactor(0);
    if (!win) {
      dieFrames(this, key);
      hero.setTexture(`${key}_d3`).setAngle(82).setPosition(250, 752).setTint(0xb8bfcc).setAlpha(0.85);
    }
    this.add.ellipse(hero.x + (win ? 0 : 50), 758, win ? 80 : 150, 14, 0x1c2839, 0.35).setScrollFactor(0).setDepth(-0.5);
    // velo morbido a destra: la card si legge su qualsiasi sfondo
    const veil = this.add.graphics().setScrollFactor(0);
    veil.fillGradientStyle(0x0e1626, 0x0e1626, 0x0e1626, 0x0e1626, 0, 0.42, 0, 0.42);
    veil.fillRect(380, 0, VIEW.w - 380, VIEW.h);
    brackets(this);

    // card dell'esito: bianco ghiaccio arrotondato, ombra morbida, palette del brand
    const x = 520;
    const y = 150;
    const w = 640;
    const h = 500;
    const card = this.add.graphics().setScrollFactor(0);
    for (let i = 6; i >= 1; i--) {
      card.fillStyle(0x0e1626, 0.05);
      card.fillRoundedRect(x - i * 2, y + 10 - i, w + i * 4, h + i * 3, 28 + i);
    }
    card.fillStyle(0xf4f5f7, 0.97);
    card.fillRoundedRect(x, y, w, h, 28);

    const city = origin.city ?? origin.label ?? "";
    txt(this, x + 48, y + 46, `${city} · FINE GIORNATA`, { size: 16, color: HEX.c3 }).setScrollFactor(0);
    txt(this, x + 48, y + 74, win ? "Giornata completata" : "Ossigeno esaurito", { size: 42, weight: "700" }).setScrollFactor(0);
    const acc = this.add.graphics().setScrollFactor(0);
    acc.fillStyle(0xe2b33c, 1);
    acc.fillRoundedRect(x + 48, y + 138, 46, 5, 2.5);

    // esito: pill arrotondata
    const pill = this.add.graphics().setScrollFactor(0);
    const pw = 330;
    if (win) {
      pill.fillStyle(C.c4, 1);
      pill.fillRoundedRect(x + 48, y + 168, pw, 48, 24);
    } else {
      pill.lineStyle(2, C.c4, 1);
      pill.strokeRoundedRect(x + 49, y + 169, pw - 2, 46, 23);
    }
    txt(this, x + 48 + pw / 2, y + 192, win ? "✓  OPERATORE CONFORME" : "✗  OPERATORE NON CONFORME", { size: 18, weight: "700", color: win ? HEX.c0 : HEX.c4, origin: 0.5 }).setScrollFactor(0);

    // numeri della giornata
    const done = run?.results?.filter((r) => r === "ok").length ?? 0;
    const total = run?.events?.length ?? 0;
    const o2 = win ? run?.oxygen ?? 0 : 0;
    const stat = (sx, label, value) => {
      txt(this, sx, y + 252, label, { size: 15, color: HEX.c3 }).setScrollFactor(0);
      txt(this, sx, y + 274, value, { size: 30, weight: "700" }).setScrollFactor(0);
    };
    stat(x + 48, "TAPPE", `${done}/${total}`);
    stat(x + 210, "OSSIGENO FINALE", `${Math.round(o2 * 100)}%`);
    stat(x + 410, "DIFFICOLTÀ", origin.difficulty ?? "");
    // barra dell'ossigeno: traccia chiara e riempimento blu notte che cresce
    const bar = this.add.graphics().setScrollFactor(0);
    const bx = x + 48;
    const by = y + 334;
    const bw = w - 96;
    bar.fillStyle(C.c2, 1);
    bar.fillRoundedRect(bx, by, bw, 12, 6);
    const fill = this.add.graphics().setScrollFactor(0);
    const fillTo = (p) => {
      fill.clear();
      if (p <= 0.01) return;
      fill.fillStyle(C.c4, 1);
      fill.fillRoundedRect(bx, by, Math.max(12, bw * p), 12, 6);
    };
    const prog = { p: 0 };
    this.tweens.add({ targets: prog, p: o2, duration: 900, delay: 350, ease: "Cubic.easeOut", onUpdate: () => fillTo(prog.p) });
    button(this, x + 48, y + 392, 300, 68, "RIGIOCA ▶", () => goTo(this, "SetupScene"), { primary: true, size: 24 });
    button(this, x + 368, y + 392, 224, 68, "MENU", () => goTo(this, "MenuScene"), { size: 22 });
    this.input.keyboard.on("keydown-ENTER", () => goTo(this, "SetupScene"));
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));
    // START = rigioca (onStart)
    win ? Sfx.win() : Sfx.gameOver();
  }

  onStart() {
    goTo(this, "SetupScene");
  }
}
