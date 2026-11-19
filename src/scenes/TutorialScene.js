import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { ensureMenuBg } from "./MenuScene.js";
import { plantArt } from "../ui/PlantPanel.js";
import { bionomadArt } from "../ui/BioPanel.js";
import { dieFrames, operatorKey, WALK_FRAMES } from "../art/people.js";
import { addHiRes } from "../art/hires.js";
import { brackets, button, C, ditherBand, fadeIn, goTo, HEX, txt, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

// tutorial senza testo: quattro "schermate video" animate che scorrono da sole,
// come le storie sul telefono. Si capisce tutto dalle immagini:
// 1 · muoversi e agire   2 · gesti di cura (+O₂)   3 · negligenze (−O₂)   4 · il respiro finisce → svieni
const PAGE_MS = 6500;
// l'ultimo video è più lungo: deve mostrare tutto lo svenimento
const CTRL_MS = 2000; // ogni comando del BIONOMAD resta acceso 2 secondi
const pageMs = (i) => (i === 3 ? 8800 : i === 1 ? CTRL_MS * 5 + 400 : PAGE_MS);
const TILE_W = 270;
const TILE_H = 480;

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create(data) {
    this._leaving = false;
    this.next = data?.next ?? "MenuScene";
    fadeIn(this, 300);
    setAmbient(null);
    ensureMenuBg(this);
    this.add.image(0, 0, "menu_bg").setOrigin(0);
    this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.7).setOrigin(0);
    brackets(this);
    plantArt(this, "plant_small", 0.5);
    plantArt(this, "plant_mid", 1);
    plantArt(this, "plant_tile", 0.75);
    this.op = operatorKey(this, this.registry.get("operator") ?? "a", this.registry.get("origin") ?? "milano");
    this.page = 0;
    this.t = 0;
    this.layer = this.add.container(0, 0);
    this.fx = this.add.graphics().setDepth(10);
    this.bar = this.add.graphics().setDepth(20);
    // tocca a destra per andare avanti, a sinistra per rivedere il video precedente
    this.input.on("pointerup", (p) => {
      if (p.y >= 700) return;
      if (p.x < VIEW.w / 3) this.back();
      else this.advance();
    });
    this.input.keyboard.on("keydown-LEFT", () => this.back());
    this.input.keyboard.on("keydown-RIGHT", () => this.advance());
    // pianta: sinistra = video precedente, destra = avanti
    plantNav(this, { left: () => this.back(), right: () => this.advance() });
    // frecce ai lati: suggeriscono che si può tornare indietro o andare avanti
    this.navL = txt(this, 14, 400, "‹", { size: 54, color: HEX.c3, origin: [0, 0.5] }).setDepth(30);
    this.navR = txt(this, VIEW.w - 14, 400, "›", { size: 54, color: HEX.c3, origin: [1, 0.5] }).setDepth(30);
    this.input.keyboard.on("keydown-SPACE", () => this.advance());
    this.input.keyboard.on("keydown-ENTER", () => goTo(this, this.next));
    this.go = button(this, VIEW.w - 200, 716, 160, 56, "▶▶", () => goTo(this, this.next), { primary: true, size: 26 });
    this.showPage(0);
  }

  onStart() {
    goTo(this, this.next);
  }

  back() {
    this.showPage(Math.max(0, this.page - 1));
  }

  advance() {
    if (this.page < 3) this.showPage(this.page + 1);
    else goTo(this, this.next);
  }

  showPage(i) {
    this.page = i;
    this.t = 0;
    this.navL?.setAlpha(i === 0 ? 0.25 : 1);
    this.layer.removeAll(true);
    this.tiles = [];
    if (i === 0) this.pageMove();
    else if (i === 1) this.pageGestures(true);
    else if (i === 2) this.pageGestures(false);
    else this.pageBreath();
  }

  // ---------- elementi comuni

  frame(x, y, w, h, bright = false) {
    // fondo con la trama a retino (scuro in alto, più chiaro verso il basso) invece del pieno
    this.layer.add(ditherBand(this, x, y, w, h, { from: 0.0, to: 0.3, vertical: true }));
    const g = this.add.graphics();
    g.lineStyle(2, bright ? C.c4 : C.c3, 1);
    g.strokeRect(x, y, w, h);
    g.fillStyle(C.c4, 1);
    // (angoli a quadratino rimossi: stile vettoriale pulito)
    this.layer.add(g);
    return g;
  }

  // simbolo grande in alto: cosa insegna la pagina (+O₂ / −O₂ / ◀ ● ▶ / respiro)
  badge(label, caption) {
    this.layer.add(txt(this, VIEW.w / 2, 58, label, { size: 40, weight: "500", origin: 0.5 }));
    if (caption) this.layer.add(txt(this, VIEW.w / 2, 102, caption, { size: 20, color: HEX.c3, origin: 0.5 }));
  }

  // ---------- disegni: mano, torce, sensori del vaso vero

  // mano che indica: la punta del dito è in (x, y), il braccio arriva dal basso
  hand(g, x, y, { flat = false } = {}) {
    // pelle chiara, contorno scuro, manica del tutore (c2)
    g.lineStyle(2, C.c0, 1);
    if (flat) {
      // mano aperta di piatto, vista dall'alto: palmo + 4 dita + pollice
      g.fillStyle(C.c4, 1);
      g.fillRoundedRect(x - 26, y - 4, 52, 34, 8);
      g.strokeRoundedRect(x - 26, y - 4, 52, 34, 8);
      for (let i = 0; i < 4; i++) {
        g.fillRoundedRect(x - 25 + i * 13, y - 26 - (i === 1 || i === 2 ? 4 : 0), 11, 28, 5);
        g.strokeRoundedRect(x - 25 + i * 13, y - 26 - (i === 1 || i === 2 ? 4 : 0), 11, 28, 5);
      }
      g.fillRoundedRect(x + 22, y + 2, 20, 11, 5);
      g.strokeRoundedRect(x + 22, y + 2, 20, 11, 5);
      g.fillStyle(C.c2, 1);
      g.fillRect(x - 18, y + 30, 36, 60);
      g.strokeRect(x - 18, y + 30, 36, 60);
      g.fillStyle(C.c3, 1);
      g.fillRect(x - 18, y + 30, 36, 6);
      return;
    }
    // mano che indica: punta dell'indice in (x, y)
    g.fillStyle(C.c4, 1);
    g.fillRoundedRect(x - 6, y, 12, 34, 6);
    g.strokeRoundedRect(x - 6, y, 12, 34, 6);
    g.fillRoundedRect(x - 18, y + 24, 36, 34, 9);
    g.strokeRoundedRect(x - 18, y + 24, 36, 34, 9);
    g.lineStyle(1, C.c3, 1);
    g.lineBetween(x - 14, y + 36, x + 4, y + 36);
    g.lineBetween(x - 14, y + 45, x + 4, y + 45);
    g.lineStyle(2, C.c0, 1);
    g.fillStyle(C.c4, 1);
    g.fillRoundedRect(x - 26, y + 30, 14, 20, 6);
    g.strokeRoundedRect(x - 26, y + 30, 14, 20, 6);
    g.fillStyle(C.c2, 1);
    g.fillRect(x - 14, y + 56, 30, 54);
    g.strokeRect(x - 14, y + 56, 30, 54);
    g.fillStyle(C.c3, 1);
    g.fillRect(x - 14, y + 56, 30, 6);
  }

  // torcia tenuta in mano; termica = con le onde di calore
  torch(g, x, y, k, thermal) {
    g.fillStyle(C.c3, 1);
    g.fillRect(x, y, 54, 18);
    g.lineStyle(2, C.c0, 1);
    g.strokeRect(x, y, 54, 18);
    g.fillStyle(thermal ? C.c2 : C.c4, 1);
    g.fillRect(x + 54, y - 4, 12, 26);
    g.strokeRect(x + 54, y - 4, 12, 26);
    if (thermal) {
      g.lineStyle(2, C.c4, 1);
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(x + 8 + i * 14, y - 6);
        g.lineTo(x + 12 + i * 14, y - 12);
        g.lineTo(x + 8 + i * 14, y - 18);
        g.strokePath();
      }
    }
    // pugno che impugna la torcia
    g.fillStyle(C.c4, 1);
    g.lineStyle(2, C.c0, 1);
    g.fillRoundedRect(x + 10, y + 12, 32, 26, 8);
    g.strokeRoundedRect(x + 10, y + 12, 32, 26, 8);
    g.lineStyle(1, C.c3, 1);
    for (let i = 1; i < 4; i++) g.lineBetween(x + 10 + i * 8, y + 14, x + 10 + i * 8, y + 26);
    g.lineStyle(2, C.c0, 1);
    g.fillStyle(C.c2, 1);
    g.fillRect(x + 12, y + 38, 28, 56);
    g.strokeRect(x + 12, y + 38, 28, 56);
    g.fillStyle(C.c3, 1);
    g.fillRect(x + 12, y + 38, 28, 6);
  }

  // occhio del sensore di luce sul vaso
  eye(g, x, y, on) {
    g.fillStyle(C.c0, 1);
    g.fillCircle(x, y, 8);
    g.lineStyle(2, on ? C.c4 : C.c3, 1);
    g.strokeCircle(x, y, 10);
    if (on) {
      g.fillStyle(C.c4, 1);
      g.fillCircle(x, y, 3);
    }
  }

  // pozzetto con i due posti per le fiale, davanti al vaso
  slots(g, x, y) {
    g.fillStyle(C.c1, 1);
    g.fillRect(x - 26, y - 14, 52, 14);
    g.fillStyle(C.c0, 1);
    g.fillRect(x - 18, y - 12, 12, 10);
    g.fillRect(x + 6, y - 12, 12, 10);
  }

  // ---------- pagina 1: si cammina toccando le foglie del vaso vero (o con le frecce)

  pageMove() {
    this.badge("◀  TOCCA  ▶", "TOCCA UNA FOGLIA PER CAMMINARE · OPPURE USA LE FRECCE");
    this.frame(60, 130, 460, 520);
    this.frame(540, 130, 680, 520);
    this.layer.add(this.add.image(290, 600, "plant_mid").setOrigin(0.5, 1));
    // cartellino sotto il vaso: quale foglia si sta toccando
    this.leafTag = txt(this, 290, 626, "", { size: 20, origin: 0.5 });
    this.layer.add(this.leafTag);
    // la città scorre dietro l'operatore, come nel gioco (lui resta al centro)
    this.city = this.add.tileSprite(542, 560 - 380, 676, 380, "menu_bg").setOrigin(0).setTileScale(0.535);
    this.city.tilePositionX = 900;
    const street = this.add.graphics();
    street.fillStyle(C.c1, 1);
    street.fillRect(542, 560, 676, 88);
    street.fillStyle(C.c3, 1);
    street.fillRect(542, 560, 676, 2);
    this.layer.add([this.city, street]);
    this.dash = this.add.graphics();
    this.shadow = this.add.ellipse(880, 584, 64, 10, C.c0, 0.6);
    this.walker = this.add.image(880, 590, `${this.op}_idle`).setOrigin(0.5, 1);
    this.moveG = this.add.graphics();
    this.layer.add([this.dash, this.shadow, this.walker, this.moveG]);
    this.walkPhase = 0;
    this.walkV = 0;
  }

  updateMove(t, delta = 16.7) {
    const dt = Math.min(delta, 50) / 1000;
    // 0-3.2s foglia destra → cammina a destra; 3.2-6.4s foglia sinistra → a sinistra
    const right = t < PAGE_MS / 2;
    const tt = right ? t : t - PAGE_MS / 2;
    const touching = tt > 500 && tt < PAGE_MS / 2 - 400;
    const g = this.moveG;
    g.clear();
    const leaf = right ? [352, 380] : [224, 380];
    if (touching) {
      g.lineStyle(3, C.c4, 0.8);
      g.strokeCircle(leaf[0], leaf[1], 18 + (tt % 400) / 40);
    }
    // la mano arriva sulla foglia e poi si stacca
    const reach = Phaser.Math.Clamp(Math.min(tt / 400, (PAGE_MS / 2 - tt) / 300), 0, 1);
    this.hand(g, leaf[0], leaf[1] + (1 - reach) * 60);
    this.leafTag.setText(touching ? (right ? "FOGLIA DESTRA  ▶" : "◀  FOGLIA SINISTRA") : "");
    // passo con accelerazione e frenata morbide, la città scorre in senso opposto
    const target = touching ? (right ? 1 : -1) : 0;
    // tutto legato al tempo reale (non ai fotogrammi): stessa andatura a 60 o 120 Hz.
    // Passo normale: ~1,1 cicli di camminata al secondo, la città scorre a ~140 px/s
    this.walkV += (target - this.walkV) * Math.min(1, dt * 7);
    if (Math.abs(this.walkV) < 0.02 && !touching) this.walkV = 0;
    this.city.tilePositionX += this.walkV * 260 * dt;
    this.walkPhase = (this.walkPhase + Math.abs(this.walkV) * 1.1 * dt) % 1;
    if (Math.abs(this.walkV) > 0.08) this.walker.setTexture(`${this.op}_${Math.floor(this.walkPhase * WALK_FRAMES)}`);
    else this.walker.setTexture(`${this.op}_idle`);
    if (target) this.walker.setFlipX(!right);
    // strisce della strada che scorrono, per sentire il movimento
    const d = this.dash;
    d.clear();
    d.fillStyle(C.c3, 0.7);
    const off = ((this.city.tilePositionX * 1.6) % 80 + 80) % 80;
    for (let x = 542 - off; x < 1218; x += 80) if (x > 542) d.fillRect(x, 606, Math.min(40, 1218 - x), 3);
    // frecce del tablet sotto la strada, accese insieme alla foglia
    [[600, !right], [1110, right]].forEach(([bx, on]) => {
      const lit = on && touching;
      g.fillStyle(lit ? C.c4 : C.c0, lit ? 1 : 0.8);
      g.fillRect(bx - 30, 584, 60, 54);
      g.lineStyle(2, C.c3, 1);
      g.strokeRect(bx - 30, 584, 60, 54);
      g.fillStyle(lit ? C.c0 : C.c4, 1);
      if (bx > 900) g.fillTriangle(bx - 8, 596, bx - 8, 626, bx + 12, 611);
      else g.fillTriangle(bx + 8, 596, bx + 8, 626, bx - 12, 611);
    });
  }

  // ---------- pagine 2 e 3: gesti sul vaso vero, con l'effetto sull'ossigeno

  // pagina 2: i cinque comandi del BIONOMAD · pagina 3: notifiche e cure (+O₂ / −O₂)
  pageGestures(care) {
    if (care) return this.pageControls();
    return this.pageNotify();
  }

  card(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(C.c0, 0.95);
    g.fillRoundedRect(x, y, w, h, 18);
    this.layer.add(g);
    return g;
  }

  // la macchina BIONOMAD vera (il dispositivo fisico) e i suoi comandi: a turno ogni tasto
  // si illumina, la mano lo preme e la macchina reagisce
  pageControls() {
    this.badge("I COMANDI DEL BIONOMAD", "OGNI TASTO SI ILLUMINA QUANDO VA USATO");
    this.card(40, 140, VIEW.w - 80, 560);
    this.layer.add(this.add.image(70, 190, machineArt(this)).setOrigin(0));
    const g = this.add.graphics();
    const hand = this.add.graphics();
    this.layer.add([g, hand]);
    const name = txt(this, 900, 560, "", { size: 30, weight: "500", origin: 0.5 });
    const cap = txt(this, 900, 604, "", { size: 18, color: HEX.c3, origin: 0.5, align: "center", wrap: 520 });
    this.layer.add([name, cap]);
    // pillole con il nome sotto ogni tasto
    CTRL_ROW.forEach((k) => {
      const pg = this.add.graphics();
      pg.lineStyle(2, C.c4, 1);
      pg.strokeRoundedRect(k.x - 44, 470, 88, 30, 15);
      this.layer.add(pg);
      this.layer.add(txt(this, k.x, 485, k.label, { size: 14, origin: 0.5 }));
    });
    this.tiles.push({ kind: "machine", g, hand, name, cap, anim: true, delay: 0 });
  }

  pageNotify() {
    this.badge("✓ +O₂   ·   ✗ −O₂", "ARRIVA UNA NOTIFICA: CURA IL BIONOMAD IN TEMPO");
    const x = 140;
    const y = 160;
    this.card(x, y, VIEW.w - 280, 450);
    this.layer.add(this.add.image(x + 40, y + 420, bionomadArt(this)).setOrigin(0, 1).setScale(1.1));
    const g = this.add.graphics();
    this.layer.add(g);
    const note = txt(this, x + 460, y + 70, "! Il BIONOMAD ha bisogno di acqua", { size: 20, wrap: 480 });
    const ok = txt(this, x + 460, y + 330, "", { size: 34, weight: "500" });
    this.layer.add([note, ok]);
    this.tiles.push({ kind: "notify", x, y, g, note, ok, anim: true, delay: 0 });
  }

  // animazioni delle schede dei comandi (t in ms)
  animTile(tile, t) {
    const { kind, x, y, w, g } = tile;
    g.clear();
    if (kind === "machine") return this.animMachine(tile, t);
    const u = ((t - tile.delay) % 3000) / 3000;
    const on = u > 0 && u < 0.5;
    const cx = x + (w ?? 0) / 2;
    const cy = y + 190;
    if (kind === "start") {
      g.fillStyle(0xc9c6be, 1);
      g.fillCircle(cx, cy, 46);
      g.fillStyle(on ? 0x24344b : 0x3a4b63, 1);
      g.fillCircle(cx, cy + (on ? 3 : 0), 34);
      g.fillStyle(0xf4f5f7, 1);
      if (on) {
        g.fillRect(cx - 10, cy - 12, 7, 26);
        g.fillRect(cx + 3, cy - 12, 7, 26);
      } else g.fillTriangle(cx - 8, cy - 14, cx - 8, cy + 14, cx + 14, cy);
    } else if (kind === "light") {
      g.fillStyle(0xc9c6be, 1);
      g.fillRoundedRect(cx - 34, cy - 54, 68, 108, 12);
      g.fillStyle(on ? 0xe2b33c : 0x8a99b0, 1);
      g.fillRoundedRect(cx - 22, on ? cy - 44 : cy + 2, 44, 42, 8);
      if (on) {
        g.fillStyle(0xe2b33c, 0.25);
        g.fillCircle(cx, cy - 100, 40);
      }
    } else if (kind === "knob") {
      const ang = -2.4 + Math.sin(u * Math.PI * 2) * 1.6 + 1.6;
      g.fillStyle(0xc9c6be, 1);
      g.fillCircle(cx, cy, 48);
      g.fillStyle(0x24344b, 1);
      g.fillCircle(cx, cy, 36);
      g.lineStyle(6, 0xf4f5f7, 1);
      g.lineBetween(cx, cy, cx + Math.cos(ang) * 30, cy + Math.sin(ang) * 30);
      // display: zaino / esterno
      g.fillStyle(0x24344b, 1);
      g.fillRoundedRect(cx - 60, cy - 140, 120, 50, 8);
      g.fillStyle(0x8fd0a6, 1);
      g.fillRect(cx - 50, cy - 102, 40 + 60 * ((ang + 2.4) / 3.2), 4);
    } else if (kind === "water") {
      g.fillStyle(0xc9c6be, 1);
      g.fillCircle(cx, cy + 40, 40);
      g.fillStyle(0x3f67a8, 1);
      g.fillCircle(cx, cy + 40 + (on ? 3 : 0), 28);
      // livello dell'acqua con la fascia giusta
      g.fillStyle(0xe3e8ef, 1);
      g.fillRoundedRect(cx - 18, cy - 130, 36, 120, 8);
      g.fillStyle(0x8fd0a6, 0.6);
      g.fillRect(cx - 18, cy - 130 + 120 * 0.25, 36, 120 * 0.35);
      const lvl = Math.min(0.95, u < 0.5 ? u * 1.3 : 0.65);
      g.fillStyle(0x3f67a8, 1);
      g.fillRoundedRect(cx - 18, cy - 10 - 120 * lvl, 36, 120 * lvl, 8);
    } else if (kind === "air") {
      g.fillStyle(0xc9c6be, 1);
      g.fillCircle(cx, cy + 40, 40);
      g.fillStyle(0xf4f5f7, 1);
      g.fillCircle(cx, cy + 40 + (u < 0.8 ? 3 : 0), 28);
      g.fillStyle(0x8a99b0, 1);
      for (let i = 0; i < 5; i++) {
        const k = (u * 3 + i / 5) % 1;
        if (u < 0.8) g.fillCircle(cx - 30 + i * 15, cy - 20 - k * 120, 5 * (1 - k) + 2);
      }
      g.fillStyle(0xe3e8ef, 1);
      g.fillRoundedRect(cx - 50, cy - 160, 100, 10, 5);
      g.fillStyle(0x24344b, 1);
      g.fillRoundedRect(cx - 50, cy - 160, 100 * Math.min(1, u / 0.8), 10, 5);
    } else if (kind === "notify") {
      const { note, ok } = tile;
      const p = (t % 6000) / 6000;
      note.setAlpha(p > 0.05 ? 1 : 0);
      g.fillStyle(0xe2b33c, 1);
      if (p > 0.05) g.fillCircle(x + 440, y + 80, 12);
      // la mano preme l'irrigazione, la barra sale nella fascia giusta
      const lvl = Math.min(0.62, Math.max(0, (p - 0.2) * 1.4));
      g.fillStyle(0xe3e8ef, 1);
      g.fillRoundedRect(x + 460, y + 200, 360, 16, 8);
      g.fillStyle(0x8fd0a6, 0.6);
      g.fillRect(x + 460 + 360 * 0.4, y + 200, 360 * 0.35, 16);
      g.fillStyle(0x3f67a8, 1);
      g.fillRoundedRect(x + 460, y + 200, Math.max(10, 360 * lvl), 16, 8);
      if (p > 0.65) ok.setText("✓  +O₂").setColor(HEX.c4);
      else ok.setText("");
    }
  }

  // un comando alla volta: si illumina, la mano lo preme, la macchina reagisce
  animMachine(tile, t) {
    const { g, hand, name, cap } = tile;
    hand.clear();
    const idx = Math.floor(t / CTRL_MS) % CTRL_ROW.length;
    const u = (t % CTRL_MS) / CTRL_MS;
    const act = CTRL_ROW[idx];
    const press = u > 0.3 && u < 0.55;
    const after = u >= 0.3;
    name.setText(act.label === "PLAY" ? "START" : act.label === "TEMP" ? "TEMPERATURA" : act.label === "ACQUA" ? "IRRIGAZIONE" : act.label);
    cap.setText(act.cap);
    // --- reazione della macchina (sopra l'illustrazione)
    const M = MACHINE;
    if (act.id === "light" && after) {
      g.fillStyle(0xf6e7a8, 0.35);
      // luce interna: striscia LED sopra le agavi e cono caldo sulla terra
      g.fillTriangle(M.x + 300, M.y + 10, M.x + 160, M.y + 140, M.x + 440, M.y + 110);
      g.fillStyle(0xfff3c4, 0.95);
      g.fillRoundedRect(M.x + 250, M.y + 4, 100, 10, 5);
    }
    if (act.id === "water" && after) {
      g.fillStyle(0x5f8fd0, 0.9);
      for (let i = 0; i < 7; i++) {
        const k = ((u - 0.3) * 3 + i / 7) % 1;
        g.fillCircle(M.x + 190 + i * 34, M.y + 50 + k * 80, 4.5);
      }
    }
    if (act.id === "air" && after) {
      for (let i = 0; i < 5; i++) {
        const k = ((u - 0.3) * 2.5 + i / 5) % 1;
        g.lineStyle(4, 0x8a99b0, 1 - k);
        g.lineBetween(M.x + 120 + k * 280, M.y + 30 + i * 20, M.x + 170 + k * 280, M.y + 26 + i * 20);
      }
    }
    if (act.id === "play" && after) {
      g.fillStyle(0x8fd0a6, 1);
      g.fillTriangle(M.sx + 66, M.sy + 30, M.sx + 66, M.sy + 70, M.sx + 100, M.sy + 50);
    }
    // tasto illuminato anche sulla macchina
    const mk = M.btn[idx];
    g.fillStyle(act.glow, 0.25 + 0.2 * Math.sin(t / 120));
    g.fillCircle(mk.x, mk.y, 20);
    g.lineStyle(3, act.glow, 1);
    g.strokeCircle(mk.x, mk.y, 14);
    // --- fila dei comandi grandi (come sul dispositivo)
    CTRL_ROW.forEach((k, i) => {
      const on = i === idx;
      drawCtrl(g, k, on, on && press, t, on && act.id === "temp" ? Math.min(1, Math.max(0, (u - 0.25) / 0.6)) : 0.3);
    });
    // --- mano che preme il tasto acceso (o gira la manopola)
    const reach = Phaser.Math.Clamp(Math.min((u - 0.08) / 0.2, (0.95 - u) / 0.15), 0, 1);
    if (reach > 0) {
      const tx = act.x + 8;
      const ty = act.y + 14 + (press ? 6 : 0);
      drawHand(hand, tx + (1 - reach) * 160, ty + (1 - reach) * 220, act.id === "temp");
    }
  }

  updateTile(tile, t) {
    const { kind, x, y, plant, g, care } = tile;
    const TW = this.tileW;
    const k = Phaser.Math.Clamp((t - tile.delay) / 2600, 0, 1);
    const cx = x + TW / 2;
    const base = y + 352;
    const yy = y + 90;
    const eyeX = cx + 20;
    const eyeY = base - 40;
    g.clear();
    plant.setAngle(0).setAlpha(1);
    if (!care && k > 0.55) {
      const droop = (k - 0.55) / 0.45;
      plant.setAngle((kind === "shock" ? -1 : 1) * droop * 10).setAlpha(1 - droop * 0.35);
    }
    const covered = (kind === "cover" || kind === "dark") && k > 0.3;
    if (!["heat", "shock", "water", "flood", "vial", "wrong"].includes(kind)) this.eye(g, eyeX, eyeY, !covered);
    if (kind === "torch") {
      const on = k > 0.2;
      if (on) {
        g.fillStyle(C.c4, 0.35 + 0.12 * Math.sin(t / 120));
        g.fillTriangle(x + 76, yy + 120, eyeX, eyeY - 14, eyeX, eyeY + 14);
      }
      this.torch(g, x + 10, yy + 112, k, false);
    } else if (kind === "cover" || kind === "dark") {
      // la mano scende e si appoggia sul sensore
      const hy = eyeY - 10 - (1 - Math.min(1, k * 2.5)) * 90;
      this.hand(g, eyeX, hy, { flat: true });
      if (kind === "dark" && k > 0.5) {
        // clessidra: è passato troppo tempo
        g.lineStyle(3, C.c4, 1);
        g.strokeTriangle(x + 22, yy + 40, x + 46, yy + 40, x + 34, yy + 56);
        g.strokeTriangle(x + 22, yy + 72, x + 46, yy + 72, x + 34, yy + 56);
      }
    } else if (kind === "heat" || kind === "shock") {
      this.thermo(g, x + TW - 32, yy + 50, 0.3 + k * (kind === "shock" ? 0.7 : 0.35), 0.65);
      if (k > 0.15) {
        g.lineStyle(2, C.c4, 0.7);
        for (let i = 0; i < 4; i++) {
          const wx = x + 80 + ((t / 6 + i * 22) % 70);
          g.lineBetween(wx, base - 120 + i * 10, wx + 8, base - 126 + i * 10);
        }
      }
      this.torch(g, x + 10, yy + 112, k, true);
      if (kind === "shock" && k > 0.6 && Math.floor(t / 150) % 2) {
        g.fillStyle(C.c4, 1);
        g.fillTriangle(x + 18, yy + 64, x + 32, yy + 40, x + 46, yy + 64);
      }
    } else if (kind === "water" || kind === "flood") {
      const open = kind === "flood" ? k > 0.15 : k > 0.15 && k < 0.75;
      this.lever(g, cx - 66, base - 70, open);
      this.hand(g, cx - 66 + (open ? 24 : -14), base - 66);
      if (open) {
        g.fillStyle(C.c4, 1);
        for (let i = 0; i < 5; i++) g.fillRect(cx - 24 + i * 12, yy + 70 + ((t / 4 + i * 23) % 110), 3, 9);
      }
      if (kind === "flood") {
        const lvl = Math.min(1, k * 1.3);
        g.fillStyle(C.c3, 0.85);
        g.fillRect(cx - 50, base - 6 - lvl * 64, 100, lvl * 64 + 6);
      }
    } else if (kind === "vial" || kind === "wrong") {
      this.slots(g, cx + 46, base + 4);
      const vy = base - 110 + Math.min(1, k * 1.4) * 100;
      this.vial(g, cx + 34, vy, kind === "vial");
      this.hand(g, cx + 34, vy - 30);
    }
    if (care && k > 0.55) {
      for (let i = 0; i < 6; i++) {
        g.fillStyle(C.c4, 0.9);
        g.fillRect(cx - 34 + i * 13, base - 150 - ((t / 6 + i * 31) % 90), 4, 4);
      }
    }
    const v = care ? 0.4 + k * 0.5 : 0.8 - k * 0.6;
    this.miniBar(g, x + (TW - 216) / 2, y + TILE_H - 70, v);
    if (k >= 1) {
      g.fillStyle(care ? C.c4 : C.c0, 1);
      g.fillRect(x + TW - 50, y + 10, 40, 40);
      g.lineStyle(2, C.c4, 1);
      g.strokeRect(x + TW - 50, y + 10, 40, 40);
      g.lineStyle(5, care ? C.c0 : C.c4, 1);
      g.beginPath();
      if (care) {
        g.moveTo(x + TW - 42, y + 30);
        g.lineTo(x + TW - 34, y + 40);
        g.lineTo(x + TW - 18, y + 20);
      } else {
        g.moveTo(x + TW - 40, y + 20);
        g.lineTo(x + TW - 20, y + 40);
        g.moveTo(x + TW - 20, y + 20);
        g.lineTo(x + TW - 40, y + 40);
      }
      g.strokePath();
    }
  }

  // barretta ossigeno a 10 tacche
  miniBar(g, x, y, v) {
    const n = Math.round(Phaser.Math.Clamp(v, 0, 1) * 10);
    for (let i = 0; i < 10; i++) {
      const sx = x + i * 22;
      if (i < n) {
        g.fillStyle(C.c4, 1);
        g.fillRect(sx, y, 18, 14);
      } else {
        g.lineStyle(2, C.c3, 1);
        g.strokeRect(sx + 1, y + 1, 16, 12);
      }
    }
  }

  thermo(g, x, y, v, mark) {
    g.lineStyle(2, C.c4, 1);
    g.strokeRect(x, y, 16, 120);
    g.fillStyle(C.c4, 1);
    g.fillCircle(x + 8, y + 132, 12);
    g.fillRect(x + 4, y + 120 - v * 116, 8, v * 116 + 4);
    g.fillStyle(C.c3, 1);
    g.fillRect(x - 8, y + 120 - mark * 116, 32, 3);
  }

  lever(g, x, y, open) {
    g.fillStyle(C.c3, 1);
    g.fillRect(x, y, 20, 60);
    g.lineStyle(5, C.c4, 1);
    g.lineBetween(x + 10, y + 30, x + (open ? 34 : -14), y + (open ? 4 : 4));
    g.fillStyle(C.c4, 1);
    g.fillCircle(x + (open ? 34 : -14), y + 4, 6);
  }

  vial(g, x, y, ok) {
    g.fillStyle(C.c4, 1);
    g.fillRect(x - 8, y - 46, 16, 6);
    g.fillStyle(ok ? C.c3 : C.c1, 1);
    g.fillRect(x - 6, y - 40, 12, 40);
    g.lineStyle(2, C.c4, 1);
    g.strokeRect(x - 6, y - 40, 12, 40);
    if (!ok) {
      g.lineStyle(3, C.c4, 1);
      g.lineBetween(x - 4, y - 32, x + 4, y - 22);
      g.lineBetween(x + 4, y - 32, x - 4, y - 22);
    }
  }

  // ---------- pagina 4: il respiro cala da solo; curare lo riporta su; a zero si sviene

  pageBreath() {
    this.badge("O₂", "L'OSSIGENO CALA DA SOLO · A ZERO SVIENI");
    this.frame(140, 130, 1000, 520);
    const street = this.add.graphics();
    street.fillStyle(C.c1, 1);
    street.fillRect(142, 560, 996, 88);
    dieFrames(this, this.op);
    this.walker = this.add.image(640, 590, `${this.op}_idle`).setOrigin(0.5, 1);
    this.breathG = this.add.graphics();
    this.layer.add([street, this.walker, this.breathG]);
  }

  updateBreath(t) {
    // 0-2.5s cala, 2.5-3.5s gesto di cura e risale, 3.5-6s cala fino a zero e il personaggio sviene
    let v;
    if (t < 2500) v = 1 - (t / 2500) * 0.6;
    else if (t < 3500) v = 0.4 + ((t - 2500) / 1000) * 0.5;
    else v = Math.max(0, 0.9 - ((t - 3500) / 1500) * 0.9);
    const g = this.breathG;
    g.clear();
    const n = Math.ceil(v * 10 - 0.001);
    const blink = v < 0.3 && Math.floor(t / 200) % 2;
    for (let i = 0; i < 10; i++) {
      const sx = 640 - 10 * 34 / 2 + i * 34;
      if (i < n && !blink) {
        g.fillStyle(C.c4, 1);
        g.fillRect(sx, 200, 28, 32);
      } else {
        g.lineStyle(2, C.c3, 1);
        g.strokeRect(sx + 1, 201, 26, 30);
      }
    }
    // gesto di cura: bollicine dallo zaino
    if (t > 2500 && t < 3500) {
      for (let i = 0; i < 8; i++) {
        g.fillStyle(C.c4, 1);
        g.fillRect(610 + (i % 4) * 10, 430 - ((t / 5 + i * 20) % 120), 4, 4);
      }
    }
    // svenimento con la stessa animazione del gioco: mano alla maschera, ginocchia, caduta
    const tf = t - 5000; // istante in cui l'ossigeno arriva a zero
    const w = this.walker;
    if (tf < 0) w.setTexture(`${this.op}_idle`).setAngle(0).setX(640).setY(590).setAlpha(1).clearTint();
    else if (tf < 700) w.setTexture(`${this.op}_d0`).setX(640 + Math.sin(tf / 45) * 3);
    else if (tf < 900) w.setTexture(`${this.op}_d1`);
    else if (tf < 1100) w.setTexture(`${this.op}_d2`);
    else w.setTexture(`${this.op}_d3`);
    if (tf >= 1500) {
      const u = Math.min(1, (tf - 1500) / 520);
      w.setAngle(82 * u * u).setX(640 + 30 * u).setY(590 + 8 * u);
      if (u >= 1) w.setAlpha(0.75).setTint(0xb8bfcc);
    }
    const fainted = v <= 0 && tf > 2100;
    if (fainted) {
      g.lineStyle(6, C.c4, 1);
      g.lineBetween(600, 290, 680, 370);
      g.lineBetween(680, 290, 600, 370);
    }
  }

  // ---------- avanzamento come le storie: barra a segmenti in basso

  update(time, delta) {
    this.t += delta;
    if (this.page === 0) this.updateMove(this.t % PAGE_MS, delta);
    else if (this.page === 3) this.updateBreath(this.t % pageMs(3));
    else this.tiles.forEach((tile) => (tile.anim ? this.animTile(tile, this.t) : this.updateTile(tile, this.t % PAGE_MS)));
    const b = this.bar;
    b.clear();
    const segW = 180;
    const x0 = VIEW.w / 2 - (segW * 4 + 12 * 3) / 2;
    for (let i = 0; i < 4; i++) {
      const sx = x0 + i * (segW + 12);
      b.fillStyle(C.c3, 1);
      b.fillRect(sx, 740, segW, 6);
      const p = i < this.page ? 1 : i === this.page ? Math.min(1, this.t / pageMs(i)) : 0;
      b.fillStyle(C.c4, 1);
      b.fillRect(sx, 740, segW * p, 6);
    }
    if (this.t >= pageMs(this.page)) {
      // alla fine dell'ultimo video parte il gioco
      if (this.page < 3) this.showPage(this.page + 1);
      else goTo(this, this.next);
    }
  }
}

// ---------------------------------------------------------------- la macchina BIONOMAD
const MACHINE = { x: 70, y: 190, sx: 340, sy: 430 };
// tasti sul dispositivo (coordinate sullo schermo): luce, acqua, aria, play, manopola
MACHINE.btn = [
  { x: MACHINE.x + 210, y: MACHINE.y + 158 },
  { x: MACHINE.x + 250, y: MACHINE.y + 152 },
  { x: MACHINE.x + 290, y: MACHINE.y + 146 },
  { x: MACHINE.x + 330, y: MACHINE.y + 140 },
  { x: MACHINE.x + 378, y: MACHINE.y + 132 }
];
const CTRL_ROW = [
  { id: "light", label: "LUCE", x: 700, y: 360, glow: 0xe2b33c, cap: "Premi il tasto: accende la luce interna dello zaino." },
  { id: "water", label: "ACQUA", x: 810, y: 360, glow: 0x3f8fe0, cap: "Premi una volta, in tempo: parte l'irrigazione interna." },
  { id: "air", label: "ARIA", x: 920, y: 360, glow: 0x9aa7ba, cap: "Premi una volta, in tempo: soffia aria pulita." },
  { id: "play", label: "PLAY", x: 1030, y: 360, glow: 0x4cbf72, cap: "Avvia il gioco, mette in pausa." },
  { id: "temp", label: "TEMP", x: 1150, y: 360, glow: 0xd0864f, cap: "Gira la manopola: tra 18 e 24 °C." }
];

// illustrazione vettoriale del dispositivo: scatola bianca con le agavi, vasi laterali, display e tasti
export function machineArt(scene) {
  const key = "tut_machine";
  if (scene.textures.exists(key)) return key;
  const S = 2;
  const W = 560;
  const H = 480;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  X.lineJoin = "round";
  const agave = (cx, base, h, n, spread) => {
    for (let i = 0; i < n; i++) {
      const lean = (i - (n - 1) / 2) * spread;
      const hh = h * (0.7 + ((i * 37) % 10) / 30);
      X.fillStyle = ["#2F5A48", "#3C6B55", "#28503F"][i % 3];
      X.strokeStyle = "#C9B98A";
      X.lineWidth = 1.5;
      X.beginPath();
      X.moveTo(cx - 9 + i * 2 - n, base);
      X.quadraticCurveTo(cx + lean * 0.3 - 8, base - hh * 0.6, cx + lean, base - hh);
      X.quadraticCurveTo(cx + lean * 0.3 + 10, base - hh * 0.6, cx + 9 + i * 2 - n, base);
      X.closePath();
      X.fill();
      X.stroke();
      X.strokeStyle = "rgba(201,185,138,0.5)";
      X.beginPath();
      X.moveTo(cx + i * 2 - n, base);
      X.quadraticCurveTo(cx + lean * 0.3, base - hh * 0.6, cx + lean, base - hh + 6);
      X.stroke();
    }
  };
  const pot = (x, y, w, h, plants) => {
    agave(x + w / 2, y + 6, plants, 6, 7);
    X.fillStyle = "#E9E6DE";
    X.fillRect(x, y, w, h);
    X.beginPath();
    X.ellipse(x + w / 2, y + h, w / 2, 10, 0, 0, 7);
    X.fill();
    X.fillStyle = "#D7D3CA";
    X.fillRect(x + w - 16, y, 16, h);
    X.fillStyle = "#4E3E33";
    X.beginPath();
    X.ellipse(x + w / 2, y, w / 2, 9, 0, 0, 7);
    X.fill();
    X.fillStyle = "#F2F0EA";
    X.beginPath();
    X.ellipse(x + w / 2, y, w / 2, 9, 0, Math.PI, 0);
    X.lineTo(x + w, y);
    X.fill();
  };
  // ombra a terra
  X.fillStyle = "rgba(36,52,75,0.16)";
  X.beginPath();
  X.ellipse(290, 440, 250, 34, 0, 0, 7);
  X.fill();
  // vaso a sinistra (dietro)
  pot(20, 300, 96, 110, 110);
  // corpo: faccia superiore, faccia frontale, fianco
  X.fillStyle = "#F4F2EC";
  X.beginPath();
  X.moveTo(110, 120);
  X.lineTo(420, 80);
  X.lineTo(500, 130);
  X.lineTo(190, 172);
  X.closePath();
  X.fill();
  // apertura con la terra e le agavi
  X.fillStyle = "#4E3E33";
  X.beginPath();
  X.moveTo(150, 124);
  X.lineTo(400, 92);
  X.lineTo(452, 124);
  X.lineTo(200, 158);
  X.closePath();
  X.fill();
  agave(300, 140, 150, 14, 12);
  X.fillStyle = "#ECEAE4";
  X.beginPath();
  X.moveTo(110, 120);
  X.lineTo(190, 172);
  X.lineTo(204, 420);
  X.quadraticCurveTo(140, 400, 112, 380);
  X.closePath();
  X.fill();
  X.fillStyle = "#E4E1D9";
  X.beginPath();
  X.moveTo(190, 172);
  X.lineTo(500, 130);
  X.lineTo(492, 372);
  X.quadraticCurveTo(470, 392, 204, 420);
  X.closePath();
  X.fill();
  // display sulla faccia frontale
  X.fillStyle = "#22324A";
  X.beginPath();
  X.moveTo(250, 220);
  X.lineTo(460, 196);
  X.lineTo(456, 330);
  X.lineTo(248, 356);
  X.closePath();
  X.fill();
  X.fillStyle = "#3F5677";
  X.fillRect(266, 300, 176, 30);
  X.fillStyle = "#E9ECEF";
  X.font = "bold 18px monospace";
  X.fillText("O₂RIGIN", 268, 252);
  X.fillStyle = "#C9D3E0";
  X.beginPath();
  X.arc(420, 230, 7, 0, 7);
  X.fill();
  // tasti sul bordo (vuoti: si accendono nell'animazione)
  [[210, 158], [250, 152], [290, 146], [330, 140]].forEach(([bx, by]) => {
    X.fillStyle = "#D9D5CC";
    X.beginPath();
    X.arc(bx, by + 2, 12, 0, 7);
    X.fill();
    X.fillStyle = "#F7F6F2";
    X.beginPath();
    X.arc(bx, by, 11, 0, 7);
    X.fill();
  });
  X.fillStyle = "#24344B";
  X.beginPath();
  X.arc(378, 132, 13, 0, 7);
  X.fill();
  // vaso a destra (davanti)
  pot(440, 220, 90, 100, 100);
  addHiRes(scene, key, c, S);
  return key;
}

// un comando grande nello stile del dispositivo: cerchio chiaro, icona, alone colorato se acceso
function drawCtrl(g, k, on, pressed, t, knob) {
  const { x, y, glow } = k;
  if (on) {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(glow, 0.08 * (5 - i) + (pressed ? 0.06 : 0));
      g.fillCircle(x, y, 44 + i * 9 + Math.sin(t / 160) * 2);
    }
  }
  if (k.id === "temp") {
    // anello di puntini: freddo (blu) → caldo (arancio), si accendono fino alla posizione
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * 1.25 + (i / 15) * Math.PI * 1.5;
      const u = i / 15;
      const col = Phaser.Display.Color.GetColor(Math.round(0x5f + (0xd0 - 0x5f) * u), Math.round(0x8f + (0x86 - 0x8f) * u), Math.round(0xd0 + (0x4f - 0xd0) * u));
      g.fillStyle(u <= knob ? col : 0xd3dbe6, 1);
      g.fillCircle(x + Math.cos(a) * 60, y + Math.sin(a) * 60, 5);
    }
    g.fillStyle(0xd9d5cc, 1);
    g.fillCircle(x, y, 46);
    g.fillStyle(0x24344b, 1);
    g.fillCircle(x, y, 38);
    const a = -Math.PI * 1.25 + knob * Math.PI * 1.5;
    g.lineStyle(6, 0xd0864f, 1);
    g.lineBetween(x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a) * 32, y + Math.sin(a) * 32);
    return;
  }
  g.fillStyle(0x24344b, 0.12);
  g.fillCircle(x, y + 4, 44);
  g.fillStyle(pressed ? 0xe4e1d9 : 0xf4f2ec, 1);
  g.fillCircle(x, y + (pressed ? 3 : 0), 44);
  g.lineStyle(on ? 4 : 2, on ? glow : 0xd3dbe6, 1);
  g.strokeCircle(x, y + (pressed ? 3 : 0), 44);
  const col = on ? glow : 0x9aa7ba;
  const cy = y + (pressed ? 3 : 0);
  if (k.id === "light") {
    g.fillStyle(col, 1);
    g.fillCircle(x, cy, 12);
    g.lineStyle(5, col, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 18, cy + Math.sin(a) * 18, x + Math.cos(a) * 26, cy + Math.sin(a) * 26);
    }
  } else if (k.id === "water") {
    g.lineStyle(5, col, 1);
    g.beginPath();
    g.arc(x, cy + 6, 13, -0.2, Math.PI + 0.2, false);
    g.lineTo(x, cy - 22);
    g.closePath();
    g.strokePath();
  } else if (k.id === "air") {
    g.lineStyle(5, col, 1);
    g.lineBetween(x - 20, cy - 10, x + 12, cy - 10);
    g.lineBetween(x - 20, cy, x + 18, cy);
    g.lineBetween(x - 20, cy + 10, x + 8, cy + 10);
    g.beginPath();
    g.arc(x + 12, cy - 16, 6, Math.PI / 2, -Math.PI / 2 - 1.2, true);
    g.strokePath();
  } else if (k.id === "play") {
    g.lineStyle(5, col, 1);
    g.strokeTriangle(x - 9, cy - 15, x - 9, cy + 15, x + 16, cy);
  }
}

// mano del tutorial: indice teso (punta in x,y), manica del cappotto dal basso a destra
function drawHand(h, x, y, grip) {
  h.fillStyle(0x9aa3af, 1);
  h.fillPoints([{ x: x + 26, y: y + 40 }, { x: x + 110, y: y + 150 }, { x: x + 62, y: y + 178 }, { x: x - 6, y: y + 66 }], true);
  h.fillStyle(0xe2b33c, 1);
  h.fillPoints([{ x: x + 20, y: y + 50 }, { x: x + 36, y: y + 78 }, { x: x + 4, y: y + 92 }, { x: x - 8, y: y + 64 }], true);
  h.fillStyle(0xe8cfb8, 1);
  h.fillEllipse(x + 12, y + 40, 46, 38);
  if (grip) {
    h.fillStyle(0xd6b89e, 1);
    h.fillEllipse(x - 4, y + 22, 18, 26);
    h.fillEllipse(x + 22, y + 18, 18, 26);
  } else {
    h.lineStyle(13, 0xe8cfb8, 1);
    h.lineBetween(x + 4, y + 26, x, y);
    h.fillStyle(0xf3dfcd, 1);
    h.fillCircle(x, y + 2, 4);
  }
}
