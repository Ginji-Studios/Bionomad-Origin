import Phaser from "../phaser.js";
import { setAmbient } from "../systems/Sfx.js";
import { ensureMenuBg } from "./MenuScene.js";
import { plantArt } from "../ui/PlantPanel.js";
import { careFrames, dieFrames, operatorKey, WALK_FRAMES } from "../art/people.js";
import { addHiRes } from "../art/hires.js";
import { brackets, button, C, fadeIn, goTo, HEX, o2Hud, txt, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

// tutorial senza testo: quattro "schermate video" animate che scorrono da sole,
// come le storie sul telefono. Si capisce tutto dalle immagini:
// 1 · muoversi e agire   2 · gesti di cura (+O₂)   3 · negligenze (−O₂)   4 · il respiro finisce → svieni
const PAGE_MS = 6500;
// l'ultimo video è più lungo: deve mostrare tutto lo svenimento
const CTRL_MS = 2000; // ogni comando del BIONOMAD resta acceso 2 secondi
// pagine: 0 movimento · 1 comandi del BIONOMAD · 2 respiro (la pagina delle notifiche è stata tolta)
const LAST = 2;
const pageMs = (i) => (i === LAST ? 8800 : i === 1 ? CTRL_MS * 5 + 400 : PAGE_MS);
const TILE_H = 480;

// Il tutorial arriva subito dopo GIOCA: niente città o personaggi del gioco (niente spoiler).
// Lo sfondo delle schede è uno "studio" astratto nei colori del brand e il personaggio
// è un manichino neutro in duotono blu.
function backdropTex(scene) {
  const key = "tut_backdrop";
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 800;
  const X = c.getContext("2d");
  const gr = X.createLinearGradient(0, 0, 0, 800);
  gr.addColorStop(0, "#1B2A3D");
  gr.addColorStop(0.55, "#16233A");
  gr.addColorStop(1, "#0F1828");
  X.fillStyle = gr;
  X.fillRect(0, 0, 1280, 800);
  // vignetta morbida ai bordi
  const v = X.createRadialGradient(640, 380, 260, 640, 400, 860);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(4,8,16,0.45)");
  X.fillStyle = v;
  X.fillRect(0, 0, 1280, 800);
  scene.textures.addCanvas(key, c);
  return key;
}

function orbTex(scene) {
  const key = "tut_orb";
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const X = c.getContext("2d");
  const g = X.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  X.fillStyle = g;
  X.fillRect(0, 0, 256, 256);
  scene.textures.addCanvas(key, c);
  return key;
}

function studioTex(scene) {
  const key = "tut_studio";
  if (scene.textures.exists(key)) return key;
  const W = 480, H = 420;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const X = c.getContext("2d");
  const gr = X.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#C6D6E6");
  gr.addColorStop(0.65, "#DCE5EE");
  gr.addColorStop(1, "#E6EAF0");
  X.fillStyle = gr;
  X.fillRect(0, 0, W, H);
  // forme morbide che si ripetono senza giunture (disegnate anche a ±W)
  const shapes = (dx) => {
    X.fillStyle = "rgba(140,172,204,0.30)";
    X.beginPath(); X.arc(90 + dx, 120, 70, 0, Math.PI * 2); X.fill();
    X.fillStyle = "rgba(100,140,184,0.20)";
    X.beginPath(); X.arc(330 + dx, 90, 46, 0, Math.PI * 2); X.fill();
    // colonne arrotondate come pannelli astratti
    X.fillStyle = "rgba(74,110,156,0.20)";
    [[40, 250, 54, 170], [150, 300, 40, 120], [250, 210, 64, 210], [380, 280, 46, 140]].forEach(([x, y, w, h]) => {
      X.beginPath(); X.roundRect(x + dx, y, w, h, [w / 2, w / 2, 0, 0]); X.fill();
    });
    X.fillStyle = "rgba(52,80,120,0.14)";
    [[100, 340, 70, 80], [320, 330, 60, 90]].forEach(([x, y, w, h]) => {
      X.beginPath(); X.roundRect(x + dx, y, w, h, [w / 2, w / 2, 0, 0]); X.fill();
    });
  };
  [-W, 0, W].forEach(shapes);
  scene.textures.addCanvas(key, c);
  return key;
}

function silKey(scene, key) {
  const out = `${key}_duo`;
  if (scene.textures.exists(out)) return out;
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  const fw = tex.get().width;
  const ss = src.width / fw || 1;
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const X = c.getContext("2d");
  X.drawImage(src, 0, 0);
  // duotono blu: le zone chiare (maschera, tubo) restano chiare, il resto va sui blu.
  // Così si legge la maschera ma non i colori veri del personaggio.
  const img = X.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const lo = [0x24, 0x34, 0x4b], hi = [0xd4, 0xe4, 0xf2];
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
    l = Math.pow(Math.min(1, Math.max(0, (l - 0.12) / 0.8)), 1.5);
    // pelle (toni caldi) → blu medio, così la maschera chiara si stacca dal viso
    if (d[i] - d[i + 2] > 28 && d[i] > 140 && d[i + 1] < d[i] - 8) l = 0.38;
    for (let k = 0; k < 3; k++) d[i + k] = lo[k] + (hi[k] - lo[k]) * l;
  }
  X.putImageData(img, 0, 0);
  addHiRes(scene, out, c, ss);
  return out;
}

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super("TutorialScene");
  }

  create(data) {
    this._leaving = false;
    this.next = data?.next ?? "MenuScene";
    fadeIn(this, 300);
    setAmbient(null);
    // sfondo da "sala proiezione": blu notte del brand con luci morbide che respirano piano,
    // così le schede chiare risaltano come schermi
    // la stessa città del menu (come nella scelta della città), velata di blu notte del brand:
    // si intravede lo skyline e le schede chiare risaltano come schermi
    ensureMenuBg(this);
    this.add.image(0, 0, "menu_bg").setOrigin(0);
    this.add.image(0, 0, backdropTex(this)).setOrigin(0).setAlpha(0.72);
    this.orbs = [
      [180, 160, 260, 0x2f5a60, 0.55],
      [1090, 620, 300, 0x3e6e75, 0.45],
      [980, 120, 180, 0x5a8e92, 0.3],
      [300, 700, 200, 0x24344b, 0.6]
    ].map(([x, y, r, col, a], i) => {
      const o = this.add.image(x, y, orbTex(this)).setTint(col).setAlpha(a).setScale(r / 128);
      this.tweens.add({ targets: o, x: x + (i % 2 ? -40 : 40), y: y + (i < 2 ? 24 : -24), scale: (r / 128) * 1.12, duration: 7000 + i * 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      return o;
    });
    brackets(this);
    plantArt(this, "plant_small", 0.5);
    plantArt(this, "plant_mid", 1);
    plantArt(this, "plant_tile", 0.75);
    // manichino neutro: il personaggio e la città si scelgono dopo il tutorial
    this.op = operatorKey(this, "a", "milano");
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
    this.navL = txt(this, 14, 400, "‹", { size: 54, color: "#9FB3C8", origin: [0, 0.5] }).setDepth(30);
    this.navR = txt(this, VIEW.w - 14, 400, "›", { size: 54, color: "#9FB3C8", origin: [1, 0.5] }).setDepth(30);
    this.tweens.add({ targets: this.navR, x: VIEW.w - 6, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.input.keyboard.on("keydown-SPACE", () => this.advance());
    this.input.keyboard.on("keydown-ENTER", () => goTo(this, this.next));
    this.go = button(this, VIEW.w - 220, 716, 180, 52, "SALTA ▶▶", () => goTo(this, this.next), { size: 20 });
    this.showPage(0);
  }

  onStart() {
    goTo(this, this.next);
  }

  back() {
    this.showPage(Math.max(0, this.page - 1));
  }

  advance() {
    if (this.page < LAST) this.showPage(this.page + 1);
    else goTo(this, this.next);
  }

  showPage(i) {
    const dir = i >= (this.page ?? 0) ? 1 : -1;
    this.page = i;
    this.t = 0;
    this.navL?.setAlpha(i === 0 ? 0.25 : 1);
    this.layer.removeAll(true);
    this.tiles = [];
    if (i === 0) this.pageMove();
    else if (i === 1) this.pageControls();
    else this.pageBreath();
    // entrata della pagina: scivola dal lato da cui si arriva e si accende
    this.tweens.killTweensOf(this.layer);
    this.layer.setAlpha(0).setX(48 * dir);
    this.tweens.add({ targets: this.layer, alpha: 1, x: 0, duration: 420, ease: "Cubic.easeOut" });
  }

  // ---------- elementi comuni

  // scheda chiara con gli angoli arrotondati e un'ombra leggera (stile del gioco)
  frame(x, y, w, h) {
    const g = this.add.graphics();
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(0x060b14, 0.07);
      g.fillRoundedRect(x - i * 2, y + 6 + i * 2, w + i * 4, h, 18 + i * 2);
    }
    g.fillStyle(C.c0, 1);
    g.fillRoundedRect(x, y, w, h, 18);
    this.layer.add(g);
    return g;
  }

  // simbolo grande in alto: cosa insegna la pagina (+O₂ / −O₂ / ◀ ● ▶ / respiro)
  badge(label, caption) {
    // capitolo · titolo · spiegazione, come il menu: piccolo numero giallo, titolo chiaro
    const kick = txt(this, VIEW.w / 2, 30, `TUTORIAL · ${String(this.page + 1).padStart(2, "0")} / ${String(LAST + 1).padStart(2, "0")}`, { size: 14, color: "#E2B33C", origin: 0.5 });
    const title = txt(this, VIEW.w / 2, 66, label, { size: 36, weight: "700", color: "#F4F5F7", origin: 0.5 });
    this.layer.add([kick, title]);
    if (caption) this.layer.add(txt(this, VIEW.w / 2, 104, caption, { size: 17, color: "#B8C6D6", origin: 0.5 }));
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
    this.badge("MUOVITI", "TOCCA LA PIANTA DI SINISTRA O DI DESTRA PER MUOVERTI");
    this.frame(60, 130, 460, 520);
    this.frame(540, 130, 680, 520);
    // due piante vere: toccare quella di sinistra fa andare a sinistra, quella di destra a destra
    this.plantL = this.add.image(180, 590, potPlantArt(this)).setOrigin(0.5, 1).setScale(0.66);
    this.plantR = this.add.image(400, 590, potPlantArt(this)).setOrigin(0.5, 1).setScale(0.66);
    this.layer.add([this.plantL, this.plantR]);
    this.layer.add(txt(this, 180, 330, "◀ SINISTRA", { size: 15, color: HEX.c3, origin: 0.5 }));
    this.layer.add(txt(this, 400, 330, "DESTRA ▶", { size: 15, color: HEX.c3, origin: 0.5 }));
    // cartellino sotto il vaso: quale foglia si sta toccando
    this.leafTag = txt(this, 290, 626, "", { size: 20, origin: 0.5 });
    this.layer.add(this.leafTag);
    // la città scorre dietro l'operatore, come nel gioco (lui resta al centro)
    // la città riempie la scheda fino in alto (niente fascia bianca), angoli arrotondati
    this.city = this.add.tileSprite(550, 140, 660, 420, studioTex(this)).setOrigin(0);
    const cm = this.make.graphics({ add: false });
    cm.fillStyle(0xffffff, 1);
    cm.fillRoundedRect(550, 140, 660, 500, 12);
    this.city.setMask(cm.createGeometryMask());
    const street = this.add.graphics();
    street.fillStyle(0xd5dae2, 1);
    street.fillRoundedRect(550, 560, 660, 80, { tl: 0, tr: 0, bl: 12, br: 12 });
    street.fillStyle(C.c3, 1);
    street.fillRect(550, 560, 660, 2);
    this.layer.add([this.city, street]);
    this.dash = this.add.graphics();
    this.shadow = this.add.ellipse(880, 584, 64, 10, C.c0, 0.6);
    this.walker = this.add.image(880, 590, silKey(this, `${this.op}_idle`)).setOrigin(0.5, 1);
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
    const leaf = right ? [406, 420] : [186, 420];
    // la pianta toccata si piega un poco e si illumina
    const pressed = right ? this.plantR : this.plantL;
    const other = right ? this.plantL : this.plantR;
    pressed.setAngle(touching ? Math.sin(tt / 120) * 1.5 : 0).setAlpha(1);
    other.setAngle(0).setAlpha(touching ? 0.6 : 1);
    if (touching) {
      g.lineStyle(4, 0xe2b33c, 0.9);
      g.strokeCircle(leaf[0], leaf[1], 18 + (tt % 400) / 40);
    }
    // la mano arriva sulla foglia e poi si stacca
    const reach = Phaser.Math.Clamp(Math.min(tt / 400, (PAGE_MS / 2 - tt) / 300), 0, 1);
    if (reach > 0) drawHand(g, leaf[0], leaf[1] + 4 + (1 - reach) * 60, false);
    this.leafTag.setText(touching ? (right ? "PIANTA DESTRA  ▶" : "◀  PIANTA SINISTRA") : "");
    // passo con accelerazione e frenata morbide, la città scorre in senso opposto
    const target = touching ? (right ? 1 : -1) : 0;
    // tutto legato al tempo reale (non ai fotogrammi): stessa andatura a 60 o 120 Hz.
    // Passo normale: ~1,1 cicli di camminata al secondo, la città scorre a ~140 px/s
    this.walkV += (target - this.walkV) * Math.min(1, dt * 7);
    if (Math.abs(this.walkV) < 0.02 && !touching) this.walkV = 0;
    this.city.tilePositionX += this.walkV * 260 * dt;
    this.walkPhase = (this.walkPhase + Math.abs(this.walkV) * 1.1 * dt) % 1;
    if (Math.abs(this.walkV) > 0.08) this.walker.setTexture(silKey(this, `${this.op}_${Math.floor(this.walkPhase * WALK_FRAMES)}`));
    else this.walker.setTexture(silKey(this, `${this.op}_idle`));
    if (target) this.walker.setFlipX(!right);
    // strisce della strada che scorrono, per sentire il movimento
    const d = this.dash;
    d.clear();
    d.fillStyle(C.c3, 0.7);
    const off = ((this.city.tilePositionX * 1.6) % 80 + 80) % 80;
    for (let x = 552 - off; x < 1208; x += 80) if (x > 552) d.fillRect(x, 606, Math.min(40, 1208 - x), 3);
    // frecce del tablet sotto la strada, accese insieme alla foglia
    [[600, !right], [1110, right]].forEach(([bx, on]) => {
      // frecce tonde come i comandi del gioco: cerchio chiaro, bordo blu notte
      const lit = on && touching;
      g.fillStyle(C.c4, 0.12);
      g.fillCircle(bx, 614, 30);
      g.fillStyle(lit ? C.c4 : C.c0, 1);
      g.fillCircle(bx, 611, 29);
      g.lineStyle(3, C.c4, 1);
      g.strokeCircle(bx, 611, 28);
      g.fillStyle(lit ? C.c0 : C.c4, 1);
      if (bx > 900) g.fillTriangle(bx + 12, 611, bx - 8, 599, bx - 8, 623);
      else g.fillTriangle(bx - 12, 611, bx + 8, 599, bx + 8, 623);
    });
  }

  // ---------- pagine 2 e 3: gesti sul vaso vero, con l'effetto sull'ossigeno

  card(x, y, w, h) {
    const g = this.add.graphics();
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(0x060b14, 0.07);
      g.fillRoundedRect(x - i * 2, y + 6 + i * 2, w + i * 4, h, 18 + i * 2);
    }
    g.fillStyle(C.c0, 1);
    g.fillRoundedRect(x, y, w, h, 18);
    this.layer.add(g);
    return g;
  }

  // la macchina BIONOMAD vera (il dispositivo fisico) e i suoi comandi: a turno ogni tasto
  // si illumina, la mano lo preme e la macchina reagisce
  pageControls() {
    this.badge("I COMANDI DEL BIONOMAD", "OGNI TASTO SI ILLUMINA QUANDO VA USATO");
    this.card(40, 140, VIEW.w - 80, 560);
    this.layer.add(this.add.image(MG.ox, MG.oy, machineArt(this)).setOrigin(0).setScale(MG.k));
    // lo schermo della macchina reagisce al comando usato (una schermata per comando)
    this.screens = {};
    CTRL_ROW.forEach((k) => {
      const im = this.add.image(MG.ox, MG.oy, screenArt(this, k.id)).setOrigin(0).setScale(MG.k).setVisible(false);
      this.screens[k.id] = im;
      this.layer.add(im);
    });
    const g = this.add.graphics();
    const hand = this.add.graphics();
    this.layer.add([g, hand]);
    // nome del comando SOPRA i tasti, descrizione SOTTO
    const name = txt(this, 925, 250, "", { size: 34, weight: "500", origin: 0.5 });
    const cap = txt(this, 925, 560, "", { size: 19, color: HEX.c3, origin: 0.5, align: "center", wrap: 520 });
    this.layer.add([name, cap]);
    this.tiles.push({ kind: "machine", g, hand, name, cap, anim: true, delay: 0 });
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
    // passaggio morbido: tempo reale tra un fotogramma e l'altro per le dissolvenze
    const dt = this.mLast == null || t < this.mLast ? 16 : Math.min(50, t - this.mLast);
    this.mLast = t;
    const ease = (a, b, ms) => a + (b - a) * Math.min(1, dt / ms);
    // nome e descrizione sfumano tra un comando e l'altro (escono, cambiano, rientrano)
    const label = act.label === "PLAY" ? "START" : act.label === "TEMP" ? "TEMPERATURA" : act.label === "ACQUA" ? "IRRIGAZIONE" : act.label;
    if (name.text !== label) {
      name.setText(label);
      cap.setText(act.cap);
    }
    const ta = Phaser.Math.Clamp(Math.min(u / 0.08, (1 - u) / 0.08), 0, 1);
    name.setAlpha(ta).setY(250 + (1 - ta) * 8);
    cap.setAlpha(ta).setY(560 + (1 - ta) * 8);
    // --- reazione della macchina (sopra l'illustrazione)
    const M = MACHINE;
    // le schermate del display si incrociano in dissolvenza
    Object.entries(this.screens ?? {}).forEach(([id, im]) => {
      const target = after && id === act.id && u < 0.97 ? 1 : 0;
      const a = ease(im.alpha * (im.visible ? 1 : 0), target, 160);
      im.setVisible(a > 0.01).setAlpha(a);
    });
    // intensità dell'alone di ogni tasto (sale e scende piano, niente on/off secco)
    this.glowK = this.glowK ?? CTRL_ROW.map(() => 0);
    this.glowK = this.glowK.map((v, i) => ease(v, i === idx && u < 0.94 ? 1 : 0, 140));
    // LED ad anello attorno alla vaschetta centrale: premendo un tasto si accende del suo colore
    // (luce giallo, acqua azzurro, aria bianco-grigio, temperatura il colore scelto con la manopola)
    const isKnob = act.id === "temp" || act.id === "light";
    const kv = isKnob ? Math.min(1, Math.max(0, (u - 0.25) / 0.6)) : 0;
    // a riposo (e con PLAY) il LED resta bianco; con gli altri tasti prende il colore del comando
    const WHITE = 0xf4f5f7;
    const ledCol = after && u < 0.95 ? { light: mixCol(WHITE, 0xf6c94c, 0.25 + kv * 0.75), water: 0x6fc3ff, air: 0xd9dee6, temp: mixCol(0x5f8fd0, 0xd0864f, kv), play: WHITE }[act.id] : WHITE;
    const lit = after && u < 0.95 && act.id !== "play";
    this.ledK = ease(this.ledK ?? 0.55, lit ? 1 : 0.55, 150);
    this.ledC = this.ledC == null ? ledCol : mixCol(this.ledC, ledCol, Math.min(1, dt / 120));
    {
      const H0 = MG.H + 1;
      // anello rotondo sul coperchio, attorno alla vaschetta (in prospettiva diventa un'ellisse);
      // la metà dietro le piante è coperta dalle foglie, quindi appena accennata
      // il LED corre lungo il bordo che circonda la terra (rettangolo dagli angoli tondi)
      const a0 = 69;
      const a1 = MG.L - 29;
      const b0 = 43;
      const b1 = MG.Sd - 27;
      const rr = 16;
      const outline = [];
      const arc = (ca2, cb2, from) => {
        for (let j = 0; j <= 6; j++) {
          const t2 = from + (j / 6) * (Math.PI / 2);
          outline.push([ca2 + Math.cos(t2) * rr, cb2 + Math.sin(t2) * rr]);
        }
      };
      // ordine: angolo davanti-sinistra → davanti → davanti-destra → dietro
      arc(a0 + rr, b1 - rr, Math.PI / 2);
      arc(a0 + rr, b0 + rr, Math.PI);
      arc(a1 - rr, b0 + rr, -Math.PI / 2);
      arc(a1 - rr, b1 - rr, 0);
      const pts2 = outline.map(([a2, b2]) => ms(a2, b2, H0));
      // davanti: i due lati vicini a chi guarda (primi tre angoli); dietro: il resto, coperto dalle foglie
      const front = pts2.slice(0, 21);
      const back = [pts2[20], ...pts2.slice(21), pts2[0]];
      const k = this.ledK * (lit ? 0.85 + 0.15 * Math.sin(t / 140) : 1);
      const draw = (pts, alpha) => {
        if (pts.length < 2) return;
        const sorted = pts;
        [[16, 0.08], [10, 0.16], [5, 0.5], [2.5, 1]].forEach(([w2, a2]) => {
          g.lineStyle(w2, this.ledC, a2 * k * alpha);
          g.strokePoints(sorted, false);
        });
      };
      // scanalatura del LED (si vede anche quando è bianco sul coperchio chiaro)
      [[back, 0.35], [front, 1]].forEach(([pts, al]) => {
        if (pts.length < 2) return;
        g.lineStyle(5, 0xc9c4b9, al);
        g.strokePoints(pts, false);
      });
      draw(back, 0.25);
      draw(front, 1);
    }
    // tasto illuminato anche sulla macchina
    // i tasti della macchina: chiari, quello attivo acceso col suo colore
    M.btn.forEach((b, i) => {
      const k = CTRL_ROW[i];
      const on = i === idx;
      const gk = this.glowK[i];
      if (gk > 0.02) {
        g.fillStyle(k.glow, gk * (0.25 + 0.15 * Math.sin(t / 120)));
        g.fillCircle(b.x, b.y, 20);
      }
      // tasto sul piano del lato: ellisse in prospettiva, con un bordino e la luce in alto
      // luce e temperatura sono manopole (scure, con la tacca), gli altri tasti
      const knobI = i === 0 || i === 4;
      const r = knobI ? 13 : 10.5;
      const down = on && press && !knobI ? -1.5 : 0;
      const disc = (rr, dz = 0) => {
        const pts = [];
        for (let j = 0; j < 28; j++) {
          const t2 = (j / 28) * Math.PI * 2;
          pts.push(ms(BTN_A[i] + Math.cos(t2) * rr, -down, BTN_Z + dz + Math.sin(t2) * rr));
        }
        return pts;
      };
      g.fillStyle(0xb9b4aa, 1);
      g.fillPoints(disc(r + 1, -1.5), true);
      g.fillStyle(knobI ? 0x24344b : on && press ? 0xe4e1d9 : 0xf9f8f4, 1);
      g.fillPoints(disc(r), true);
      if (!knobI) {
        g.fillStyle(0xffffff, 0.8);
        g.fillPoints(disc(r * 0.55, r * 0.35), true);
      }
      g.lineStyle(on ? 2.5 : 1.5, on ? k.glow : 0xc9c5bb, 1);
      g.strokePoints(disc(r + 0.5), true);
      // simbolo del comando sul tasto (e tacca sulla manopola)
      miniIcon(g, knobI ? "knob" + k.id : k.id, b.x, b.y, on ? k.glow : 0x8a99b0, on && knobI ? kv : 0.3);
    });
    // --- fila dei comandi grandi (come sul dispositivo)
    CTRL_ROW.forEach((k, i) => {
      const on = i === idx;
      drawCtrl(g, k, this.glowK[i], on && press, t, on && isKnob ? kv : 0.3);
    });
    // --- mano che preme il tasto acceso (o gira la manopola)
    // la mano scivola dal tasto precedente a quello nuovo, senza sparire
    const tx = act.x + 8;
    const ty = act.y + 14 + (press ? 6 : 0) + (u < 0.2 ? 18 * (1 - u / 0.2) : u > 0.8 ? 18 * ((u - 0.8) / 0.2) : 0);
    this.handPos = this.handPos ?? { x: tx, y: ty + 60 };
    this.handPos.x = ease(this.handPos.x, tx, 170);
    this.handPos.y = ease(this.handPos.y, ty, 120);
    drawHand(hand, this.handPos.x, this.handPos.y, isKnob);
    hand.setAlpha(1);
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
    this.badge("IL TUO RESPIRO", "L'OSSIGENO CALA DA SOLO · CURA IL BIONOMAD · A ZERO SVIENI");
    this.frame(140, 130, 1000, 520);
    // sfondo: la città del gioco (come nella pagina del movimento), dentro la scheda
    const city = this.add.tileSprite(150, 140, 980, 420, studioTex(this)).setOrigin(0);
    this.bCity = city;
    this.bPhase = 0;
    this.bLast = null;
    careFrames(this, this.op);
    const m = this.make.graphics({ add: false });
    m.fillStyle(0xffffff, 1);
    m.fillRoundedRect(150, 140, 980, 500, 14);
    city.setMask(m.createGeometryMask());
    const street = this.add.graphics();
    street.fillStyle(0xd5dae2, 1);
    street.fillRoundedRect(150, 560, 980, 80, { tl: 0, tr: 0, bl: 14, br: 14 });
    this.bDash = this.add.graphics();
    dieFrames(this, this.op);
    this.walker = this.add.image(640, 590, silKey(this, `${this.op}_idle`)).setOrigin(0.5, 1);
    this.breathG = this.add.graphics();
    // l'indicatore del respiro vero del gioco (pillola in alto)
    this.o2 = o2Hud(this);
    this.o2.c.setPosition(640 - 150, 166).setDepth(0);
    this.faintTxt = txt(this, 640, 362, "SVENUTO · O₂ 0%", { size: 20, weight: "500", origin: 0.5 }).setVisible(false);
    this.layer.add([city, street, this.bDash, this.walker, this.breathG, this.o2.c, this.faintTxt]);
  }

  updateBreath(t) {
    // 0-2.5s cala, 2.5-3.5s gesto di cura e risale, 3.5-6s cala fino a zero e il personaggio sviene
    let v;
    if (t < 2500) v = 1 - (t / 2500) * 0.6;
    else if (t < 3500) v = 0.4 + ((t - 2500) / 1000) * 0.5;
    else v = Math.max(0, 0.9 - ((t - 3500) / 1500) * 0.9);
    const g = this.breathG;
    g.clear();
    this.o2?.set(v, t);
    // gesto di cura: bollicine di ossigeno tonde che salgono dallo zaino
    if (t > 2500 && t < 3500) {
      for (let i = 0; i < 8; i++) {
        g.fillStyle(0xffffff, 0.85);
        g.fillCircle(614 + (i % 4) * 10, 470 - ((t / 5 + i * 20) % 120), 3 + (i % 3));
      }
    }
    // svenimento con la stessa animazione del gioco: mano alla maschera, ginocchia, caduta
    const tf = t - 5000; // istante in cui l'ossigeno arriva a zero
    const w = this.walker;
    // il personaggio cammina per la città; si ferma a curare la pianta; poi con poco ossigeno
    // rallenta, barcolla e infine sviene
    const dt = this.bLast == null || t < this.bLast ? 16 : Math.min(50, t - this.bLast);
    this.bLast = t;
    let speed = 0;
    if (t < 2500) speed = 1;
    else if (t >= 3500 && tf < 0) speed = Math.max(0.25, v * 1.1);
    if (this.bCity) this.bCity.tilePositionX += speed * 240 * (dt / 1000);
    this.bPhase = (this.bPhase + speed * 1.1 * (dt / 1000)) % 1;
    const d = this.bDash;
    if (d) {
      d.clear();
      d.fillStyle(0xffffff, 0.6);
      const off = (((this.bCity?.tilePositionX ?? 0) * 1.7) % 90 + 90) % 90;
      for (let x = 170 - off; x < 1110; x += 90) if (x > 152) d.fillRect(x, 600, Math.min(44, 1128 - x), 3);
    }
    if (tf < 0) {
      w.setAngle(0).setY(590).setAlpha(1).clearTint();
      if (t >= 2500 && t < 3500) {
        // cura: la mano va allo zaino e picchietta
        const ct = t - 2500;
        const f = ct < 300 ? Math.min(2, Math.floor(ct / 100)) : 3 + (Math.floor(ct / 120) % 3);
        w.setTexture(silKey(this, `${this.op}_c${f}`)).setX(640);
      } else {
        w.setTexture(silKey(this, `${this.op}_${Math.floor(this.bPhase * WALK_FRAMES) % WALK_FRAMES}`));
        // con poco ossigeno barcolla
        w.setX(640 + (v < 0.3 ? Math.sin(t / 140) * 4 : 0)).setAngle(v < 0.3 ? Math.sin(t / 190) * 3 : 0);
      }
    } else if (tf < 700) w.setTexture(silKey(this, `${this.op}_d0`)).setX(640 + Math.sin(tf / 45) * 3);
    else if (tf < 900) w.setTexture(silKey(this, `${this.op}_d1`));
    else if (tf < 1100) w.setTexture(silKey(this, `${this.op}_d2`));
    else w.setTexture(silKey(this, `${this.op}_d3`));
    if (tf >= 1500) {
      const u = Math.min(1, (tf - 1500) / 520);
      w.setAngle(82 * u * u).setX(640 + 30 * u).setY(590 + 8 * u);
      if (u >= 1) w.setAlpha(0.75).setTint(0xb8bfcc);
    }
    const fainted = v <= 0 && tf > 2100;
    if (fainted) {
      // velo scuro e scritta, come il game over del gioco
      g.fillStyle(0x1c2839, 0.45);
      g.fillRoundedRect(150, 140, 980, 500, 14);
      g.fillStyle(0xf4f5f7, 1);
      g.fillRoundedRect(640 - 150, 330, 300, 64, 32);
    }
    this.faintTxt.setVisible(fainted);
  }

  // ---------- avanzamento come le storie: barra a segmenti in basso

  update(time, delta) {
    this.t += delta;
    if (this.page === 0) this.updateMove(this.t % PAGE_MS, delta);
    else if (this.page === LAST) this.updateBreath(this.t % pageMs(LAST));
    else this.tiles.forEach((tile) => (tile.anim ? this.animTile(tile, this.t) : this.updateTile(tile, this.t % PAGE_MS)));
    const b = this.bar;
    b.clear();
    const segW = 180;
    const x0 = VIEW.w / 2 - (segW * (LAST + 1) + 12 * LAST) / 2;
    for (let i = 0; i <= LAST; i++) {
      const sx = x0 + i * (segW + 12);
      b.fillStyle(0xf4f5f7, 0.18);
      b.fillRoundedRect(sx, 740, segW, 6, 3);
      const p = i < this.page ? 1 : i === this.page ? Math.min(1, this.t / pageMs(i)) : 0;
      if (p > 0.02) {
        b.fillStyle(i === this.page ? 0xe2b33c : 0xf4f5f7, 1);
        b.fillRoundedRect(sx, 740, Math.max(6, segW * p), 6, 3);
      }
    }
    if (this.t >= pageMs(this.page)) {
      // alla fine dell'ultimo video parte il gioco
      if (this.page < LAST) this.showPage(this.page + 1);
      else goTo(this, this.next);
    }
  }
}

// ---------------------------------------------------------------- la macchina BIONOMAD
// geometria in prospettiva (come nelle immagini del dispositivo): F = spigolo frontale in basso,
// A = direzione del lato lungo (verso destra e in alto), B = lato corto (verso sinistra e in alto)
const MG = { ox: 40, oy: 140, k: 0.86, F: [290, 520], A: [0.93, -0.37], B: [-0.86, -0.4], L: 250, Sd: 175, H: 230 };
const mp = (a, b, z) => [MG.F[0] + a * MG.A[0] + b * MG.B[0], MG.F[1] + a * MG.A[1] + b * MG.B[1] - z];
const ms = (a, b, z) => {
  const [x, y] = mp(a, b, z);
  return { x: MG.ox + x * MG.k, y: MG.oy + y * MG.k };
};
// tasti sul lato con il display, in fila subito sopra lo schermo: luce, acqua, aria, play, manopola
const BTN_A = [52, 86, 120, 154, 206];
const BTN_Z = 200;
const MACHINE = {
  btn: BTN_A.map((a) => ms(a, 0, BTN_Z)),
  soil: ms(150, 100, 230), // centro dell'apertura con le piante
  disp: ms(140, 0, 95) // centro del display
};
const CTRL_ROW = [
  { id: "light", label: "LUCE", x: 700, y: 380, glow: 0xe2b33c, cap: "Gira la manopola: più la giri, più luce. Il LED diventa giallo." },
  { id: "water", label: "ACQUA", x: 810, y: 380, glow: 0x3f8fe0, cap: "Premi una volta, in tempo: LED azzurro, nel gioco parte l'irrigazione." },
  { id: "air", label: "ARIA", x: 920, y: 380, glow: 0x9aa7ba, cap: "Premi una volta, in tempo: LED bianco, nel gioco la ventola soffia aria pulita." },
  { id: "play", label: "PLAY", x: 1030, y: 380, glow: 0x4cbf72, cap: "Avvia il gioco, mette in pausa." },
  { id: "temp", label: "TEMP", x: 1150, y: 380, glow: 0xd0864f, cap: "Gira la manopola: il LED segue il colore scelto. Tieni tra 17 e 25 °C." }
];

// illustrazione vettoriale del dispositivo, come il prototipo: blocco bianco dagli spigoli
// morbidi, vaschetta con le sansevierie sul coperchio, provetta NFC, tasti e grande display sul
// lato destro, due vasi agganciati (uno davanti a sinistra, uno dietro a destra)
export function machineArt(scene) {
  const key = "tut_machine5";
  if (scene.textures.exists(key)) return key;
  const S = 2;
  const W = 640;
  const H = 600;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  X.lineJoin = "round";
  X.lineCap = "round";
  const P = (a, b, z) => mp(a, b, z);
  const { L, Sd } = MG;
  const Hh = MG.H;
  // poligono con gli angoli arrotondati
  const round = (pts, r) => {
    X.beginPath();
    const n = pts.length;
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    X.moveTo(...mid(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i++) X.arcTo(pts[i][0], pts[i][1], ...mid(pts[i], pts[(i + 1) % n]), r);
    X.closePath();
  };
  // lato bombato: il bordo inferiore si curva un po' verso l'esterno
  const face = (p0, p1, p2, p3, fill, bulge) => {
    X.beginPath();
    X.moveTo(...p3);
    X.lineTo(...p0);
    X.quadraticCurveTo((p0[0] + p1[0]) / 2 + bulge[0], (p0[1] + p1[1]) / 2 + bulge[1], ...p1);
    X.lineTo(...p2);
    X.closePath();
    X.fillStyle = fill;
    X.fill();
  };
  // sansevieria: foglie larghe e appuntite, verde scuro con il bordo giallo e le striature chiare
  const leaf = (bx, by, h, lean, w) => {
    const path = new Path2D();
    path.moveTo(bx - w, by);
    path.quadraticCurveTo(bx - w * 1.1 + lean * 0.3, by - h * 0.55, bx + lean, by - h);
    path.quadraticCurveTo(bx + w * 1.1 + lean * 0.3, by - h * 0.55, bx + w, by);
    path.closePath();
    X.fillStyle = "#2E5B4B";
    X.fill(path);
    X.save();
    X.clip(path);
    X.strokeStyle = "rgba(160,196,170,0.45)";
    X.lineWidth = 1.2;
    for (let y = by - 8; y > by - h; y -= 9) {
      X.beginPath();
      X.moveTo(bx - w * 1.4, y + 3);
      X.quadraticCurveTo(bx, y - 2, bx + w * 1.4, y + 3);
      X.stroke();
    }
    X.fillStyle = "rgba(0,0,0,0.12)";
    X.fillRect(bx + lean * 0.4, by - h, w * 2, h);
    X.restore();
    X.strokeStyle = "#D9C98F";
    X.lineWidth = 1.6;
    X.stroke(path);
  };
  const tuft = (bx, by, h, n, sc = 1) => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const lean = (u - 0.5) * 60 * sc;
      leaf(bx + (u - 0.5) * 40 * sc, by + Math.abs(u - 0.5) * 4, h * (0.72 + 0.28 * Math.sin(u * Math.PI)) * (0.9 + ((i * 7) % 3) * 0.06), lean, 7 * sc);
    }
  };
  // vaso cilindrico agganciato (cx,cy = centro del bordo)
  const pot = (cx, cy, r, h, plantH) => {
    X.save();
    X.filter = "blur(5px)";
    X.fillStyle = "rgba(36,52,75,0.2)";
    X.beginPath();
    X.ellipse(cx + 6, cy + h + 4, r * 0.95, r * 0.28, 0, 0, 7);
    X.fill();
    X.restore();
    X.fillStyle = "#E9E6DE";
    X.beginPath();
    X.moveTo(cx - r, cy);
    X.lineTo(cx - r, cy + h);
    X.ellipse(cx, cy + h, r, r * 0.34, 0, Math.PI, 0, true);
    X.lineTo(cx + r, cy);
    X.closePath();
    X.fill();
    const g = X.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(150,140,125,0.35)");
    X.fillStyle = g;
    X.fill();
    X.fillStyle = "#F6F4EF";
    X.beginPath();
    X.ellipse(cx, cy, r, r * 0.34, 0, 0, 7);
    X.fill();
    X.fillStyle = "#4A3A2F";
    X.beginPath();
    X.ellipse(cx, cy + 1, r * 0.82, r * 0.25, 0, 0, 7);
    X.fill();
    tuft(cx, cy + 4, plantH, 7, 0.75);
  };

  // ombra a terra: segue la pianta della scatola (non un'ellisse), morbida e sfumata
  X.save();
  X.filter = "blur(10px)";
  X.fillStyle = "rgba(36,52,75,0.22)";
  X.beginPath();
  [P(-6, -10, 0), P(MG.L + 14, -10, 0), P(MG.L + 26, MG.Sd + 6, 0), P(-6, MG.Sd + 6, 0)].forEach(([x, y], i) => (i ? X.lineTo(x + 10, y + 4) : X.moveTo(x + 10, y + 4)));
  X.closePath();
  X.fill();
  // contatto: ombra più scura proprio sotto gli spigoli
  X.filter = "blur(4px)";
  X.fillStyle = "rgba(36,52,75,0.18)";
  X.beginPath();
  [P(0, 0, 0), P(MG.L, 0, 0), P(MG.L, 6, 0), P(0, 6, 0)].forEach(([x, y], i) => (i ? X.lineTo(x, y + 2) : X.moveTo(x, y + 2)));
  X.closePath();
  X.fill();
  X.restore();

  // vaso destro: dietro, agganciato al fianco destro a metà altezza
  const rp = P(L + 30, 60, 90);
  pot(rp[0] + 26, rp[1] - 40, 40, 74, 100);

  // corpo: silhouette unica con spigoli morbidi
  const base = [P(0, 0, 0), P(L, 0, 0), P(L, Sd, 0), P(0, Sd, 0)];
  const top = [P(0, 0, Hh), P(L, 0, Hh), P(L, Sd, Hh), P(0, Sd, Hh)];
  round([base[3], base[0], base[1], top[1], top[2], top[3]], 34);
  X.fillStyle = "#E4E1D9";
  X.fill();
  // lato sinistro (corto), più chiaro e bombato
  face(P(0, Sd, 8), P(0, 0, 8), P(0, 0, Hh - 10), P(0, Sd, Hh - 10), "#EEEBE4", [-6, 16]);
  // lato destro (con il display), in leggera ombra
  face(P(0, 0, 8), P(L, 0, 8), P(L, 0, Hh - 10), P(0, 0, Hh - 10), "#E2DED5", [8, 14]);
  // spigolo frontale arrotondato: una fascia di luce
  const eg = X.createLinearGradient(P(-14, 14, 0)[0], 0, P(14, -14, 0)[0], 0);
  eg.addColorStop(0, "rgba(255,255,255,0)");
  eg.addColorStop(0.5, "rgba(255,255,255,0.75)");
  eg.addColorStop(1, "rgba(255,255,255,0)");
  X.fillStyle = eg;
  X.fillRect(P(-14, 14, 0)[0], P(0, 0, Hh)[1] + 14, 28, Hh - 34);
  // coperchio con gli angoli arrotondati
  round(top, 30);
  const tg = X.createLinearGradient(0, P(L, Sd, Hh)[1], 0, P(0, 0, Hh)[1]);
  tg.addColorStop(0, "#F1EEE8");
  tg.addColorStop(1, "#FBFAF7");
  X.fillStyle = tg;
  X.fill();
  // smusso morbido sugli spigoli frontali del coperchio
  X.strokeStyle = "rgba(255,255,255,0.95)";
  X.lineWidth = 3;
  X.beginPath();
  X.moveTo(...P(0, Sd - 30, Hh - 2));
  X.lineTo(...P(0, 26, Hh - 2));
  X.quadraticCurveTo(...P(0, 0, Hh - 2), ...P(26, 0, Hh - 2));
  X.lineTo(...P(L - 30, 0, Hh - 2));
  X.stroke();
  X.strokeStyle = "rgba(150,140,125,0.25)";
  X.lineWidth = 2;
  X.beginPath();
  X.moveTo(...P(0, Sd - 30, Hh - 8));
  X.lineTo(...P(0, 26, Hh - 8));
  X.quadraticCurveTo(...P(0, 0, Hh - 8), ...P(26, 0, Hh - 8));
  X.lineTo(...P(L - 30, 0, Hh - 8));
  X.stroke();
  // vaschetta con la terra (verso il fondo del coperchio) e le sansevierie
  const tub = [P(66, 40, Hh), P(L - 26, 40, Hh), P(L - 26, Sd - 24, Hh), P(66, Sd - 24, Hh)];
  // vaschetta: bordo chiaro rialzato, poi la terra con un'ombra interna
  round(tub, 14);
  X.fillStyle = "#FBFAF7";
  X.fill();
  const tubIn = [P(72, 46, Hh + 2), P(L - 32, 46, Hh + 2), P(L - 32, Sd - 30, Hh + 2), P(72, Sd - 30, Hh + 2)];
  round(tubIn, 10);
  X.fillStyle = "#4A3A2F";
  X.fill();
  X.save();
  X.clip();
  X.strokeStyle = "rgba(0,0,0,0.25)";
  X.lineWidth = 8;
  round(tubIn, 10);
  X.stroke();
  X.restore();
  // le piante escono SOLO dalla terra: si ritagliano lungo i bordi vicini della vaschetta,
  // così le basi delle foglie non finiscono sul coperchio bianco
  X.save();
  const n0 = P(74, Sd - 32, Hh);
  const n1 = P(74, 48, Hh);
  const n2 = P(L - 34, 48, Hh);
  X.beginPath();
  X.moveTo(n0[0], n0[1]);
  X.lineTo(n1[0], n1[1]);
  X.lineTo(n2[0], n2[1]);
  X.lineTo(n2[0], -10);
  X.lineTo(n0[0], -10);
  X.closePath();
  X.clip();
  for (let row = 2; row >= 0; row--) {
    for (let k = 0; k < 2; k++) {
      const [bx, by] = P(100 + k * 66 + row * 6, 66 + row * 28, Hh);
      tuft(bx, by, 190 - row * 22 - k * 10, 9, 1.0);
    }
  }
  X.restore();
  // provetta NFC con l'anello verde, sul coperchio davanti a sinistra
  const [vx, vy] = P(34, 54, Hh);
  X.fillStyle = "#1F2B3D";
  X.beginPath();
  X.ellipse(vx, vy, 16, 7, -0.25, 0, 7);
  X.fill();
  X.strokeStyle = "#5FD39A";
  X.lineWidth = 2.5;
  X.stroke();
  X.fillStyle = "rgba(220,236,242,0.95)";
  X.beginPath();
  X.roundRect(vx - 6, vy - 40, 12, 40, 5);
  X.fill();
  X.fillStyle = "#4FA36E";
  X.fillRect(vx - 6, vy - 16, 12, 14);
  X.fillStyle = "#B88A5A";
  X.fillRect(vx - 7, vy - 44, 14, 7);
  // display grande sul lato destro, con il gioco acceso (città di notte, luna, operatore)
  const d0 = P(38, 0, 30);
  const d1 = P(L - 22, 0, 30);
  const d2 = P(L - 22, 0, 168);
  const d3 = P(38, 0, 168);
  round([d0, d1, d2, d3], 8);
  X.fillStyle = "#1A2434";
  X.fill();
  const i0 = P(46, 0, 38);
  const i2 = P(L - 30, 0, 160);
  X.save();
  round([i0, P(L - 30, 0, 38), i2, P(46, 0, 160)], 5);
  X.clip();
  const sky = X.createLinearGradient(0, i2[1], 0, i0[1]);
  sky.addColorStop(0, "#3D5272");
  sky.addColorStop(1, "#1E2B40");
  X.fillStyle = sky;
  X.fillRect(0, 0, W, H);
  // disegno del gioco sullo schermo, inclinato come il lato
  const [sx0, sy0] = P(46, 0, 160);
  X.translate(0, 0);
  X.translate(sx0, sy0);
  X.transform(1, MG.A[1] / MG.A[0], 0, 1, 0, 0);
  const sw = (L - 76) * MG.A[0];
  X.fillStyle = "#E9ECF2";
  X.beginPath();
  X.arc(sw * 0.62, 18, 7, 0, 7);
  X.fill();
  X.fillStyle = "#2A3A55";
  [[0.45, 50, 0.1], [0.56, 38, 0.12], [0.7, 58, 0.1], [0.82, 44, 0.18]].forEach(([x, hh, bw]) => X.fillRect(sw * x, 112 - hh, sw * bw, hh));
  X.fillStyle = "#33465F";
  X.fillRect(0, 104, sw, 18);
  X.fillStyle = "#E9ECEF";
  X.font = "bold 13px monospace";
  X.fillText("O₂RIGIN", 8, 22);
  X.fillStyle = "rgba(233,236,239,0.35)";
  [34, 46, 58].forEach((y) => X.fillRect(8, y, 60, 6));
  // operatore piccolino
  X.fillStyle = "#9AA3AF";
  X.fillRect(sw * 0.66, 76, 8, 28);
  X.fillStyle = "#E8CFB8";
  X.beginPath();
  X.arc(sw * 0.66 + 4, 71, 5, 0, 7);
  X.fill();
  X.fillStyle = "#E2B33C";
  X.fillRect(sw * 0.66, 78, 8, 3);
  X.restore();
  // incavi dei tasti in fila sopra il display (i tasti si accendono nell'animazione)
  // incavi dei tasti: cerchi disegnati SUL piano del lato (quindi ellissi inclinate)
  const faceDisc = (a0, z0, r) => {
    X.beginPath();
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      const [x, y] = P(a0 + Math.cos(t) * r, 0, z0 + Math.sin(t) * r);
      i ? X.lineTo(x, y) : X.moveTo(x, y);
    }
    X.closePath();
  };
  BTN_A.forEach((a, i) => {
    const r = i === 4 ? 18 : 14;
    faceDisc(a, BTN_Z, r + 1.5);
    X.fillStyle = "#CBC6BC";
    X.fill();
    faceDisc(a, BTN_Z + 1, r);
    X.fillStyle = "#D8D4CB";
    X.fill();
  });
  // vaso sinistro: davanti, agganciato in basso al lato sinistro
  const lp = P(-26, Sd - 50, 20);
  pot(lp[0], lp[1] - 30, 52, 90, 110);
  addHiRes(scene, key, c, S);
  return key;
}

// un comando grande nello stile del dispositivo: cerchio chiaro, icona, alone colorato se acceso
function drawCtrl(g, k, onK, pressed, t, knob) {
  const { x, y, glow } = k;
  // onK: intensità 0..1 dell'accensione (sfuma tra un comando e l'altro)
  const lvl = typeof onK === "number" ? onK : onK ? 1 : 0;
  const on = lvl > 0.5;
  if (lvl > 0.02) {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(glow, (0.08 * (5 - i) + (pressed ? 0.06 : 0)) * lvl);
      g.fillCircle(x, y, 44 + i * 9 + Math.sin(t / 160) * 2);
    }
  }
  if (k.id === "temp" || k.id === "light") {
    // anello di puntini: temperatura freddo (blu) → caldo (arancio); luce spenta → gialla piena
    const isL = k.id === "light";
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * 1.25 + (i / 15) * Math.PI * 1.5;
      const u = i / 15;
      const col = isL ? mixCol(0xb9b4aa, 0xf6c94c, 0.35 + u * 0.65) : Phaser.Display.Color.GetColor(Math.round(0x5f + (0xd0 - 0x5f) * u), Math.round(0x8f + (0x86 - 0x8f) * u), Math.round(0xd0 + (0x4f - 0xd0) * u));
      g.fillStyle(u <= knob ? col : 0xd3dbe6, 1);
      g.fillCircle(x + Math.cos(a) * 60, y + Math.sin(a) * 60, 5);
    }
    g.fillStyle(0xd9d5cc, 1);
    g.fillCircle(x, y, 46);
    g.fillStyle(0x24344b, 1);
    g.fillCircle(x, y, 38);
    const a = -Math.PI * 1.25 + knob * Math.PI * 1.5;
    g.lineStyle(6, isL ? 0xf6c94c : 0xd0864f, 1);
    g.lineBetween(x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a) * 32, y + Math.sin(a) * 32);
    if (isL) {
      // piccolo sole al centro della manopola della luce
      g.fillStyle(0xf6c94c, 0.35 + knob * 0.65);
      g.fillCircle(x - Math.cos(a) * 14, y - Math.sin(a) * 14, 4);
    }
    return;
  }
  g.fillStyle(0x24344b, 0.12);
  g.fillCircle(x, y + 4, 44);
  g.fillStyle(pressed ? 0xe4e1d9 : 0xf4f2ec, 1);
  g.fillCircle(x, y + (pressed ? 3 : 0), 44);
  g.lineStyle(2 + 2 * lvl, mixCol(0xd3dbe6, glow, lvl), 1);
  g.strokeCircle(x, y + (pressed ? 3 : 0), 44);
  const col = mixCol(0x9aa7ba, glow, lvl);
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

// mano del tutorial: indice teso (punta in x,y), solo mano e polsino (niente braccio lungo
// che passa sopra le scritte)
function drawHand(h, x, y, grip) {
  h.fillStyle(0x9aa3af, 1);
  h.fillRoundedRect(x - 2, y + 58, 40, 30, 8);
  h.fillStyle(0xe2b33c, 1);
  h.fillRect(x - 2, y + 56, 40, 7);
  h.fillStyle(0xd6b89e, 1);
  h.fillEllipse(x + 20, y + 42, 44, 36);
  h.fillStyle(0xe8cfb8, 1);
  h.fillEllipse(x + 18, y + 40, 42, 34);
  if (grip) {
    h.fillStyle(0xd6b89e, 1);
    h.fillEllipse(x + 4, y + 24, 16, 24);
    h.fillEllipse(x + 30, y + 22, 16, 24);
  } else {
    h.lineStyle(12, 0xe8cfb8, 1);
    h.lineBetween(x + 4, y + 28, x, y + 4);
    h.fillStyle(0xf3dfcd, 1);
    h.fillCircle(x, y + 5, 4);
  }
}

// vaso con la sansevieria nello stile vettoriale (foglie larghe, bordo giallo, striature)
function potPlantArt(scene) {
  const key = "tut_potplant";
  if (scene.textures.exists(key)) return key;
  const S = 2;
  const W = 300;
  const H = 330;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  const cx = W / 2;
  const potTop = 220;
  // foglie: [base x, punta x, punta y, larghezza]
  const leaves = [
    [-30, -96, 30, 13], [-16, -58, 0, 14], [0, -8, -2, 15], [16, 44, 10, 14], [30, 84, 26, 13], [-6, -30, 40, 12], [10, 22, 34, 12]
  ];
  leaves.forEach(([b, tx, ty, w], i) => {
    const bx = cx + b;
    const by = potTop + 6;
    const px = cx + tx;
    const path = new Path2D();
    path.moveTo(bx - w, by);
    path.quadraticCurveTo(bx - w + (px - bx) * 0.3, by - (by - ty) * 0.6, px, ty);
    path.quadraticCurveTo(bx + w + (px - bx) * 0.3, by - (by - ty) * 0.6, bx + w, by);
    path.closePath();
    X.fillStyle = i % 2 ? "#3C6B55" : "#2E5B4B";
    X.fill(path);
    X.save();
    X.clip(path);
    X.strokeStyle = "rgba(170,205,180,0.45)";
    X.lineWidth = 1.6;
    for (let y = by - 10; y > ty; y -= 11) {
      X.beginPath();
      X.moveTo(cx - 140, y + 4);
      X.quadraticCurveTo(cx, y - 3, cx + 140, y + 4);
      X.stroke();
    }
    X.restore();
    X.strokeStyle = "#D9C98F";
    X.lineWidth = 2;
    X.stroke(path);
  });
  // vaso: corpo che si stringe verso il fondo, base arrotondata, bordo spesso e terra
  const rT = 64; // raggio in alto
  const rB = 50; // raggio in basso
  const yB = H - 16;
  const body = new Path2D();
  body.moveTo(cx - rT + 4, potTop + 14);
  body.lineTo(cx - rB, yB - 6);
  body.quadraticCurveTo(cx - rB, yB + 10, cx, yB + 10);
  body.quadraticCurveTo(cx + rB, yB + 10, cx + rB, yB - 6);
  body.lineTo(cx + rT - 4, potTop + 14);
  body.closePath();
  X.fillStyle = "#E9E6DE";
  X.fill(body);
  const g = X.createLinearGradient(cx - rT, 0, cx + rT, 0);
  g.addColorStop(0, "rgba(255,255,255,0.6)");
  g.addColorStop(0.35, "rgba(255,255,255,0.1)");
  g.addColorStop(0.75, "rgba(150,140,125,0.12)");
  g.addColorStop(1, "rgba(120,110,98,0.4)");
  X.fillStyle = g;
  X.fill(body);
  // bordo spesso arrotondato
  X.fillStyle = "#F4F2EC";
  X.beginPath();
  X.roundRect(cx - rT, potTop - 4, rT * 2, 22, 11);
  X.fill();
  X.fillStyle = "rgba(120,110,98,0.18)";
  X.fillRect(cx - rT + 6, potTop + 15, rT * 2 - 12, 3);
  // terra con le piante che escono
  X.fillStyle = "#4A3A2F";
  X.beginPath();
  X.ellipse(cx, potTop - 3, rT - 8, 7, 0, 0, 7);
  X.fill();
  addHiRes(scene, key, c, S);
  return key;
}

// simbolo piccolo per i tasti della macchina (stesso disegno dei comandi grandi, in piccolo)
function miniIcon(g, id, x, y, col, knob = 0.3) {
  if (id === "light") {
    g.fillStyle(col, 1);
    g.fillCircle(x, y, 2.6);
    g.lineStyle(1.6, col, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 4.3, y + Math.sin(a) * 4.3, x + Math.cos(a) * 6.6, y + Math.sin(a) * 6.6);
    }
  } else if (id === "water") {
    g.fillStyle(col, 1);
    g.fillCircle(x, y + 1.8, 3.4);
    g.fillTriangle(x - 3.2, y + 0.8, x + 3.2, y + 0.8, x, y - 6);
  } else if (id === "air") {
    g.lineStyle(1.8, col, 1);
    g.lineBetween(x - 5.5, y - 3, x + 3.5, y - 3);
    g.lineBetween(x - 5.5, y, x + 5.5, y);
    g.lineBetween(x - 5.5, y + 3, x + 1.5, y + 3);
  } else if (id === "play") {
    g.fillStyle(col, 1);
    g.fillTriangle(x - 3, y - 5, x - 3, y + 5, x + 5, y);
  } else {
    // manopola: tacca che indica la posizione (arancio per la temperatura, gialla per la luce)
    const a = -Math.PI * 1.25 + knob * Math.PI * 1.5;
    g.lineStyle(2.4, col === 0x8a99b0 ? (id === "knoblight" ? 0xf6c94c : 0xd0864f) : col, 1);
    g.lineBetween(x + Math.cos(a) * 3, y + Math.sin(a) * 3, x + Math.cos(a) * 10, y + Math.sin(a) * 10);
  }
}

// schermata del display della macchina per ogni comando (stessa prospettiva del lato destro)
function screenArt(scene, id) {
  const key = `tut_screen2_${id}`;
  if (scene.textures.exists(key)) return key;
  const S = 2;
  const W = 640;
  const H = 600;
  const c = document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const X = c.getContext("2d");
  X.scale(S, S);
  const P = (a, b, z) => mp(a, b, z);
  const { L } = MG;
  const pts = [P(46, 0, 38), P(L - 30, 0, 38), P(L - 30, 0, 160), P(46, 0, 160)];
  X.beginPath();
  pts.forEach(([x, y], i) => (i ? X.lineTo(x, y) : X.moveTo(x, y)));
  X.closePath();
  X.clip();
  const bg = { light: ["#5A4E2E", "#2A2A2A"], water: ["#264A73", "#16263D"], air: ["#3C4E66", "#1E2B40"], play: ["#3D5272", "#1E2B40"], temp: ["#6A3F2E", "#2A1F28"] }[id];
  const gr = X.createLinearGradient(0, pts[2][1], 0, pts[0][1]);
  gr.addColorStop(0, bg[0]);
  gr.addColorStop(1, bg[1]);
  X.fillStyle = gr;
  X.fillRect(0, 0, W, H);
  const [sx0, sy0] = P(46, 0, 160);
  X.translate(sx0, sy0);
  X.transform(1, MG.A[1] / MG.A[0], 0, 1, 0, 0);
  const sw = (L - 76) * MG.A[0];
  const T = (t, x, y, size, col = "#E9ECEF", weight = "bold") => {
    X.fillStyle = col;
    X.font = `${weight} ${size}px monospace`;
    X.fillText(t, x, y);
  };
  if (id === "light") {
    X.fillStyle = "#F6D36B";
    X.beginPath();
    X.arc(sw / 2, 48, 16, 0, 7);
    X.fill();
    X.strokeStyle = "#F6D36B";
    X.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      X.beginPath();
      X.moveTo(sw / 2 + Math.cos(a) * 22, 48 + Math.sin(a) * 22);
      X.lineTo(sw / 2 + Math.cos(a) * 30, 48 + Math.sin(a) * 30);
      X.stroke();
    }
    T("LUCE 75%", sw / 2 - 38, 104, 15);
  } else if (id === "water") {
    X.fillStyle = "#6FA8E8";
    X.beginPath();
    X.arc(sw / 2, 52, 13, 0, 7);
    X.fill();
    X.beginPath();
    X.moveTo(sw / 2 - 12, 47);
    X.lineTo(sw / 2 + 12, 47);
    X.lineTo(sw / 2, 22);
    X.fill();
    T("IRRIGAZIONE", sw / 2 - 52, 88, 13);
    X.fillStyle = "rgba(233,236,239,0.25)";
    X.fillRect(20, 98, sw - 40, 8);
    X.fillStyle = "#6FA8E8";
    X.fillRect(20, 98, (sw - 40) * 0.62, 8);
  } else if (id === "air") {
    X.strokeStyle = "#C9D3E0";
    X.lineWidth = 5;
    X.lineCap = "round";
    [[-26, 18, 30], [-26, 26, 42], [-26, 12, 54]].forEach(([a, b, y]) => {
      X.beginPath();
      X.moveTo(sw / 2 + a, y);
      X.lineTo(sw / 2 + b, y);
      X.stroke();
    });
    T("ARIA PULITA", sw / 2 - 50, 92, 13);
    T("ventola attiva", sw / 2 - 52, 110, 11, "rgba(233,236,239,0.7)", "normal");
  } else if (id === "play") {
    // il gioco parte: città di notte, luna, operatore e START
    X.fillStyle = "#E9ECF2";
    X.beginPath();
    X.arc(sw * 0.62, 18, 7, 0, 7);
    X.fill();
    X.fillStyle = "#2A3A55";
    [[0.45, 50, 0.1], [0.56, 38, 0.12], [0.7, 58, 0.1], [0.82, 44, 0.18]].forEach(([x, hh, bw]) => X.fillRect(sw * x, 112 - hh, sw * bw, hh));
    X.fillStyle = "#33465F";
    X.fillRect(0, 104, sw, 18);
    T("O₂RIGIN", 8, 22, 13);
    X.fillStyle = "#4CBF72";
    X.beginPath();
    X.moveTo(14, 44);
    X.lineTo(14, 66);
    X.lineTo(32, 55);
    X.fill();
    T("START", 38, 61, 13, "#8FD0A6");
    X.fillStyle = "#9AA3AF";
    X.fillRect(sw * 0.66, 76, 8, 28);
    X.fillStyle = "#E8CFB8";
    X.beginPath();
    X.arc(sw * 0.66 + 4, 71, 5, 0, 7);
    X.fill();
  } else {
    T("21.0°C", sw / 2 - 52, 62, 26);
    T("FUORI 12°C", sw / 2 - 42, 90, 12, "rgba(233,236,239,0.75)", "normal");
    const g2 = X.createLinearGradient(20, 0, sw - 20, 0);
    g2.addColorStop(0, "#5F8FD0");
    g2.addColorStop(1, "#D0864F");
    X.fillStyle = g2;
    X.fillRect(20, 102, sw - 40, 6);
    X.fillStyle = "#FFFFFF";
    X.fillRect(20 + (sw - 40) * 0.55 - 2, 98, 4, 14);
  }
  addHiRes(scene, key, c, S);
  return key;
}

// mescola due colori (0..1): serve alle dissolvenze dei tasti
function mixCol(a, b, k) {
  const m = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * k));
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
