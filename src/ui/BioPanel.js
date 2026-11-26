// pannello del BIONOMAD: il "display" del dispositivo con temperatura dello zaino e dell'esterno,
// luce, acqua e aria, più l'obiettivo della task. Si usa con i controlli fisici; se un comando
// non è collegato, compaiono i pulsanti a schermo e funzionano i tasti:
//   L/K manopola della luce (su/giù) · W/S (o ↑/↓) manopola della task aperta · R irrigazione · V aria (tenere premuto)
//   rotellina del mouse = regolazione fine della manopola della task; manopola e termometro a schermo
//   si possono anche trascinare su/giù (o toccare: metà alta/destra = di più, metà bassa/sinistra = di meno)
import Phaser from "../phaser.js";
import { Bionomad, IDEAL } from "../systems/Bionomad.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { Sfx } from "../systems/Sfx.js";
import { BRAND, C, HEX, txt, VIEW, Y_ACCENT } from "./hud.js";
import { grain } from "../world/city.js";
import { addHiRes } from "../art/hires.js";

const X0 = 400;
const Y0 = 120;
const W = 820;
const H = 470;

// tasti dei controlli simulati: validi in tutte le scene di gioco
export function bioKeys(scene) {
  const kb = scene.input.keyboard;
  const keys = kb.addKeys("W,S,UP,DOWN,R,V,L,K");
  const taskGoal = () => (scene.bio?.open ? scene.bio.step?.goal : null);
  // rotellina: un passo fine alla volta sulla manopola della task aperta
  scene.input.on("wheel", (_p, _o, _dx, dy) => {
    const g = taskGoal();
    if (g === "light" || g === "temp") Bionomad.nudge(g === "light" ? "lightKnob" : "knob", dy < 0 ? 1 : -1);
  });
  return (delta) => {
    const up = keys.W.isDown || keys.UP.isDown;
    const down = keys.S.isDown || keys.DOWN.isDown;
    // W/S girano la manopola della task aperta (luce o temperatura); L/K sempre quella della luce
    const lightTask = taskGoal() === "light";
    const lUp = keys.L.isDown || (lightTask && up);
    const lDown = keys.K.isDown || (lightTask && down);
    // tastiera e pulsanti a schermo insieme: una sola chiamata per frame, così l'accelerazione è continua
    Bionomad.turn("lightKnob", (lUp ? 1 : 0) - (lDown ? 1 : 0) || (scene.bio?.lightDir ?? 0), delta);
    Bionomad.turn("knob", (!lightTask ? (up ? 1 : 0) - (down ? 1 : 0) : 0) || (scene.bio?.knobDir ?? 0), delta);
    Bionomad.sim.irrigating = keys.R.isDown || Boolean(scene._simIrr);
    Bionomad.sim.venting = keys.V.isDown || Boolean(scene._simAir);
  };
}

// ------------------------------------------------------------------ lo ZAINO a tutto schermo
// Nelle task si vede lo zaino BIONOMAD in grande, nel posto in cui ci si trova (bus, ufficio,
// casa, strada; di giorno o di sera), e la mano del giocatore che usa i comandi dello zaino:
// ogni volta che nella realtà si preme un pulsante, si gira la manopola o l'interruttore,
// la mano fa lo stesso gesto e la pianta reagisce davvero (acqua che scorre, luce, aria, brina/calore).

const PX = 640; // centro dello zaino (grande: occupa quasi tutta l'altezza)
const TOP = 92;
const BOT = 830;
const PW = 480;
const GLASS = { x: PX - 190, y: 150, w: 380, h: 410 }; // finestra di vetro con la pianta
const SOIL_Y = 512;
const TANK = { x: PX - 170, y: 578, w: 340, h: 30 }; // serbatoio d'acqua trasparente
const SCREEN = { x: PX - 78, y: 652, w: 108, h: 76 }; // display al centro, dove sul dispositivo c'è PLAY // display della temperatura
// oggetti reali con cui si interagisce
// tasti sullo zaino (come sul dispositivo vero): luce interna, irrigazione interna, aria
const BTN = {
  // come sul dispositivo: manopola luce, acqua, aria, manopola temperatura (da freddo a caldo)
  light: { x: PX - 182, y: 690, col: 0x7d909f },
  water: { x: PX - 113, y: 690, col: 0x587284 },
  air: { x: PX + 66, y: 690, col: 0x8fb3c4 },
  temp: { x: PX + 136, y: 690, col: 0x4e6878 }
};
// termometro dentro il guscio, accanto al vetro (la temperatura si regola col potenziometro vero)
const T_MIN = 0;
const T_MAX = 40;
const PIPE_X = GLASS.x + GLASS.w - 22; // tubo dell'irrigazione interna (sale dal serbatoio)
const SPRAY_Y = GLASS.y + 120; // barra con gli ugelli sopra le piante
const GREENS = [0x688471, 0x7e9984, 0x577263, 0x728e79];

// sfondo ravvicinato del posto in cui si è (sfocato, come in primo piano)
function placeBackdrop(scene, kind, night) {
  const key = `bv_bg_${kind}_${night ? "n" : "d"}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = VIEW.w;
  c.height = VIEW.h;
  const X = c.getContext("2d", { willReadFrequently: true });
  const R = (x, y, w, h, col) => {
    X.fillStyle = col;
    X.fillRect(x, y, w, h);
  };
  const skyG = (y0, y1) => {
    const g = X.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, night ? "#27323F" : "#C0C6CA");
    g.addColorStop(1, night ? "#435363" : "#DDE1E2");
    return g;
  };
  const cityBlur = (y0, y1, x0 = 0, x1 = VIEW.w) => {
    X.fillStyle = skyG(y0, y1);
    X.fillRect(x0, y0, x1 - x0, y1 - y0);
    X.save();
    X.beginPath();
    X.rect(x0, y0, x1 - x0, y1 - y0);
    X.clip();
    X.filter = "blur(6px)";
    let x = x0 - 40;
    let n = 3;
    while (x < x1) {
      const w = 60 + ((n * 37) % 90);
      const h = (y1 - y0) * (0.3 + ((n * 53) % 50) / 100);
      R(x, y1 - h, w, h, night ? ["#313E4C", "#3B495A"][n % 2] : ["#6A7C8E", "#828F9D", "#526475"][n % 3]);
      if (night) for (let wy = y1 - h + 12; wy < y1 - 10; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 18) if ((wx * wy) % 7 < 2) R(wx, wy, 6, 8, "#E4E8E3");
      x += w + 4;
      n++;
    }
    X.filter = "none";
    X.restore();
  };
  if (kind === "bus") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#2F3A46" : "#8A95A2");
    cityBlur(70, 470, 0, VIEW.w);
    // montanti dei finestrini, corrimano, schienali
    for (let x = 120; x < VIEW.w; x += 360) R(x, 60, 26, 440, night ? "#374E5B" : "#B2B9BF");
    R(0, 60, VIEW.w, 22, night ? "#374E5B" : "#B2B9BF");
    R(0, 470, VIEW.w, 30, night ? "#384552" : "#A5AEB5");
    X.fillStyle = night ? "#B3BCB7" : "#7D909F";
    [250, 990].forEach((x) => X.fillRect(x, 0, 12, 760));
    R(0, 500, VIEW.w, 300, night ? "#2C3743" : "#6C7987");
  } else if (kind === "office") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#303C48" : "#D1D5D7");
    cityBlur(60, 420, 60, 760);
    R(60, 410, 700, 14, night ? "#374E5B" : "#B6BCC1");
    for (let x = 60; x < 760; x += 175) R(x, 60, 8, 360, night ? "#374E5B" : "#B6BCC1");
    // monitor sfocato e lampada da scrivania
    X.filter = "blur(4px)";
    R(880, 300, 260, 160, "#2E4350");
    R(895, 315, 230, 130, night ? "#66798E" : "#A2AFBC");
    R(1000, 460, 20, 60, "#374E5B");
    X.filter = "none";
    // piano della scrivania
    R(0, 640, VIEW.w, 160, night ? "#404C59" : "#C4C9CC");
    R(0, 636, VIEW.w, 8, night ? "#566371" : "#D7DBD6");
  } else if (kind === "home") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#313C48" : "#D7D8D3");
    cityBlur(70, 380, 820, 1200);
    R(810, 60, 400, 14, night ? "#465260" : "#BEBFBA");
    R(810, 380, 400, 14, night ? "#465260" : "#BEBFBA");
    // divano sfocato e lampada calda
    X.filter = "blur(5px)";
    R(40, 470, 380, 200, night ? "#424E5C" : "#8C9893");
    R(20, 440, 60, 230, night ? "#424E5C" : "#8C9893");
    X.fillStyle = night ? "rgba(222,225,222,0.35)" : "rgba(222,225,222,0.2)";
    X.beginPath();
    X.arc(260, 200, 160, 0, 7);
    X.fill();
    X.filter = "none";
    R(0, 680, VIEW.w, 120, night ? "#2E3842" : "#AAABA8");
  } else {
    // strada: la città sfocata dietro, il marciapiede in basso
    cityBlur(0, 620);
    R(0, 600, VIEW.w, 70, night ? "#3D4855" : "#586572");
    R(0, 668, VIEW.w, 4, "#E0E3E3");
    R(0, 672, VIEW.w, 130, night ? "#55626F" : "#A3ACB4");
  }
  // velo chiaro/scuro per far risaltare lo zaino
  const v = X.createRadialGradient(PX, 450, 120, PX, 450, 700);
  v.addColorStop(0, night ? "rgba(29,37,46,0)" : "rgba(247,248,247,0.18)");
  v.addColorStop(1, night ? "rgba(29,37,46,0.45)" : "rgba(43,55,67,0.18)");
  X.fillStyle = v;
  X.fillRect(0, 0, VIEW.w, VIEW.h);
  grain(c, 6, kind.length + (night ? 7 : 1));
  scene.textures.addCanvas(key, c);
  return key;
}

// ---- texture in alta risoluzione (vettoriale nitido)
const SSZ = 2;
function hiCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w * SSZ;
  c.height = h * SSZ;
  const X = c.getContext("2d", { willReadFrequently: true });
  X.scale(SSZ, SSZ);
  X.lineCap = "round";
  X.lineJoin = "round";
  return [c, X];
}

// lo zaino: guscio bianco, spallacci, finestra di vetro, serbatoio, display
function packTextures(scene) {
  if (scene.textures.exists("bv_pack2")) return;
  {
    const [c, X] = hiCanvas(VIEW.w, VIEW.h);
    // spallacci dietro
    X.fillStyle = "#2E4350";
    [-1, 1].forEach((d) => {
      X.beginPath();
      X.moveTo(PX + d * 200, TOP + 150);
      X.quadraticCurveTo(PX + d * 300, 470, PX + d * 262, BOT);
      X.lineTo(PX + d * 222, BOT);
      X.quadraticCurveTo(PX + d * 256, 470, PX + d * 168, TOP + 150);
      X.fill();
    });
    // ombra portata
    X.fillStyle = "rgba(29,37,46,0.22)";
    X.beginPath();
    X.ellipse(PX + 18, BOT - 10, PW / 2 + 30, 40, 0, 0, 7);
    X.fill();
    // guscio
    const shell = new Path2D();
    shell.moveTo(PX - PW / 2, TOP + 200);
    shell.quadraticCurveTo(PX - PW / 2, TOP, PX, TOP);
    shell.quadraticCurveTo(PX + PW / 2, TOP, PX + PW / 2, TOP + 200);
    shell.lineTo(PX + PW / 2, BOT);
    shell.lineTo(PX - PW / 2, BOT);
    shell.closePath();
    X.fillStyle = "#E3E4E0";
    X.fill(shell);
    X.save();
    X.clip(shell);
    // lato in ombra a destra, luce a sinistra
    X.fillStyle = "#CFD0CB";
    X.fillRect(PX + PW / 2 - 56, TOP, 56, BOT - TOP);
    X.fillStyle = "rgba(247,248,247,0.55)";
    X.fillRect(PX - PW / 2 + 16, TOP + 120, 10, BOT - TOP - 180);
    // cucitura
    X.strokeStyle = "#C8C9C5";
    X.lineWidth = 3;
    X.setLineDash([10, 8]);
    X.beginPath();
    X.moveTo(PX - PW / 2 + 22, BOT);
    X.lineTo(PX - PW / 2 + 22, TOP + 200);
    X.quadraticCurveTo(PX - PW / 2 + 22, TOP + 22, PX, TOP + 22);
    X.quadraticCurveTo(PX + PW / 2 - 22, TOP + 22, PX + PW / 2 - 22, TOP + 200);
    X.lineTo(PX + PW / 2 - 22, BOT);
    X.stroke();
    X.setLineDash([]);
    X.restore();
    // bocchettone per l'acqua in cima
    X.fillStyle = "#C4C8C9";
    X.beginPath();
    X.roundRect(PX - 50, TOP - 20, 100, 28, 8);
    X.fill();
    X.fillStyle = "#B3BCB7";
    X.beginPath();
    X.ellipse(PX, TOP - 20, 50, 9, 0, 0, 7);
    X.fill();
    // pannello dei tasti a destra del display
    X.fillStyle = "#D0D1CC";
    X.beginPath();
    X.roundRect(PX - 226, 638, 406, 104, 22);
    X.fill();
    // cornice del vetro
    X.fillStyle = "#D0D1CC";
    X.beginPath();
    X.moveTo(GLASS.x - 12, GLASS.y + GLASS.h + 12);
    X.lineTo(GLASS.x - 12, GLASS.y + 150);
    X.quadraticCurveTo(GLASS.x - 12, GLASS.y - 12, PX, GLASS.y - 12);
    X.quadraticCurveTo(GLASS.x + GLASS.w + 12, GLASS.y - 12, GLASS.x + GLASS.w + 12, GLASS.y + 150);
    X.lineTo(GLASS.x + GLASS.w + 12, GLASS.y + GLASS.h + 12);
    X.closePath();
    X.fill();
    // cornice del display
    X.fillStyle = "#C4C8C3";
    X.beginPath();
    X.roundRect(SCREEN.x - 8, SCREEN.y - 8, SCREEN.w + 16, SCREEN.h + 16, 14);
    X.fill();
    grain(c, 4, 21);
    addHiRes(scene, "bv_pack2", c, SSZ);
  }
  // mano che indica (solo la mano: il braccio si disegna a parte e la segue).
  // Punta dell'indice a (22,22), polso a (92,104)
  {
    const [c, H] = hiCanvas(140, 140);
    const SK = "#E8CFB8";
    const SKD = "#D6B89E";
    // dita piegate (pugno) e dorso
    H.fillStyle = SKD;
    H.beginPath();
    H.ellipse(78, 86, 30, 24, -0.8, 0, 7);
    H.fill();
    H.fillStyle = SK;
    H.beginPath();
    H.ellipse(72, 80, 30, 24, -0.8, 0, 7);
    H.fill();
    // indice teso
    H.strokeStyle = SK;
    H.lineWidth = 15;
    H.beginPath();
    H.moveTo(62, 66);
    H.lineTo(24, 24);
    H.stroke();
    H.fillStyle = "#F3DFCD";
    H.beginPath();
    H.ellipse(26, 26, 5, 3.5, -0.8, 0, 7);
    H.fill();
    // pollice
    H.strokeStyle = SKD;
    H.lineWidth = 13;
    H.beginPath();
    H.moveTo(84, 70);
    H.lineTo(98, 44);
    H.stroke();
    H.strokeStyle = SK;
    H.lineWidth = 11;
    H.beginPath();
    H.moveTo(82, 72);
    H.lineTo(96, 46);
    H.stroke();
    // nocche
    H.strokeStyle = "rgba(132,123,118,0.45)";
    H.lineWidth = 2;
    [[52, 92, 62, 82], [60, 100, 72, 90]].forEach(([x0, y0, x1, y1]) => {
      H.beginPath();
      H.moveTo(x0, y0);
      H.lineTo(x1, y1);
      H.stroke();
    });
    addHiRes(scene, "bv_hand2", c, SSZ);
  }
  // mano che impugna (pugno chiuso visto di lato). Centro della presa a (60,60), polso a (92,92)
  {
    const [c, H] = hiCanvas(140, 140);
    const SK = "#E8CFB8";
    const SKD = "#D6B89E";
    H.fillStyle = SKD;
    H.beginPath();
    H.roundRect(36, 36, 62, 58, 24);
    H.fill();
    H.fillStyle = SK;
    H.beginPath();
    H.roundRect(32, 32, 60, 56, 24);
    H.fill();
    // dita avvolte: quattro falangi arrotondate
    for (let i = 0; i < 4; i++) {
      H.fillStyle = i % 2 ? SK : "#EDD7C2";
      H.beginPath();
      H.ellipse(40 + i * 3, 42 + i * 13, 12, 7, 0.2, 0, 7);
      H.fill();
    }
    H.strokeStyle = "rgba(132,123,118,0.5)";
    H.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      H.beginPath();
      H.moveTo(32 + i * 3, 36 + i * 13);
      H.lineTo(52 + i * 3, 38 + i * 13);
      H.stroke();
    }
    // pollice sopra
    H.fillStyle = SKD;
    H.beginPath();
    H.ellipse(64, 34, 20, 10, -0.3, 0, 7);
    H.fill();
    H.fillStyle = SK;
    H.beginPath();
    H.ellipse(62, 32, 19, 9, -0.3, 0, 7);
    H.fill();
    addHiRes(scene, "bv_grip", c, SSZ);
  }
}

// mescola due colori 0xRRGGBB (k da 0 a 1)
function mixC(a, b, k) {
  const m = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * k));
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

const GOAL_NAME = { light: "MANOPOLA LUCE", temp: "MANOPOLA TEMP", water: "TASTO ACQUA", air: "TASTO ARIA" };
// colore della task (solo palette del brand): la scheda, l'icona e l'alone del comando da usare
const GOAL_COL = { light: 0x7d909f, temp: 0x4e6878, water: 0x587284, air: 0x8fb3c4 };
// simbolo del comando (uguale a quello disegnato sul tasto dello zaino)
function glyph(g, id, x, y, col, s = 1) {
  g.fillStyle(col, 1);
  g.lineStyle(3 * s, col, 1);
  if (id === "light") {
    g.fillCircle(x, y, 5 * s);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(x + Math.cos(a) * 8 * s, y + Math.sin(a) * 8 * s, x + Math.cos(a) * 11.5 * s, y + Math.sin(a) * 11.5 * s);
    }
  } else if (id === "water") {
    g.fillCircle(x, y + 3 * s, 6 * s);
    g.fillTriangle(x - 5.6 * s, y + 1 * s, x + 5.6 * s, y + 1 * s, x, y - 10 * s);
  } else if (id === "air") {
    g.lineBetween(x - 9 * s, y - 5 * s, x + 6 * s, y - 5 * s);
    g.lineBetween(x - 9 * s, y, x + 9 * s, y);
    g.lineBetween(x - 9 * s, y + 5 * s, x + 3 * s, y + 5 * s);
  } else {
    // manopola della temperatura: disco con la tacca (niente termometro)
    g.lineStyle(2.4 * s, col, 1);
    g.strokeCircle(x, y, 9 * s);
    g.lineBetween(x, y, x + 5.5 * s, y - 5.5 * s);
  }
}

export class BioPanel {
  constructor(scene) {
    this.scene = scene;
    this.c = null;
  }

  get open() {
    return Boolean(this.c);
  }

  // step = { goal, out, holdMs, qteMs, timeoutMs, text, hint }
  show(step, { emergency = false } = {}) {
    this.close();
    const scene = this.scene;
    scene.events.emit("bio-open");
    packTextures(scene);
    let goal = step.goal;
    let hint = step.hint;
    if (goal === "need") {
      goal = Math.random() < 0.5 ? "water" : "air";
      hint = goal === "water" ? "La terra è secca: premi ACQUA una volta, parte l'irrigazione interna." : "L'aria nel vetro è viziata: tieni premuto ARIA finché il vetro non è pulito.";
    }
    this.step = { ...step, goal, hint };
    this.emergency = emergency;
    this.elapsed = 0;
    this.ok = 0;
    this.done = false;
    this.flooded = false;
    this.t = 0;
    this.drops = [];
    this.puffs = [];
    this.litAt = null;
    this.dust = goal === "air" ? Array.from({ length: 30 }, () => [GLASS.x + 24 + Math.random() * (GLASS.w - 48), 230 + Math.random() * 260]) : [];
    if (step.out != null) Bionomad.setOutside(step.out);
    const s = Bionomad.state;
    if (goal === "water") s.water = Math.min(s.water, 0.18);
    if (goal === "air") s.air = Math.min(s.air, 0.25);
    // task della luce: si parte al buio (in simulazione la manopola torna a zero)
    if (goal === "light" && PlantSensors.simulated("LK")) Bionomad.sim.lightKnob = 0;
    this.prev = { light: s.light, knob: s.knob };
    // manopola vera (potenziometro): resta dov'era, quindi la task conta solo dopo averla girata
    this.knob0 = { light: s.lightLvl ?? 0, temp: s.knob };
    this.turned = { light: PlantSensors.simulated("LK"), temp: PlantSensors.simulated("TK") };
    // quick time event dei pulsanti: si conta da qui quante volte vengono premuti
    this.presses0 = { irr: Bionomad.pulse.irrPresses, air: Bionomad.pulse.airPresses };
    this.qte = step.qteMs ?? step.timeoutMs ?? (goal === "water" || goal === "air" ? 10000 : null);

    const ctx = scene.bioContext ?? { kind: "street", night: false };
    scene.tasks?.setDark?.(ctx.night || (goal === "light" && step.qteMs));
    const c = scene.add.container(0, 0).setDepth(1400).setScrollFactor(0);
    c.add(scene.add.image(0, 0, placeBackdrop(scene, ctx.kind, ctx.night)).setOrigin(0));
    this.back = scene.add.graphics();
    c.add(this.back);
    c.add(scene.add.image(0, 0, "bv_pack2").setOrigin(0));
    this.glass = scene.add.graphics();
    this.leaves = scene.add.graphics();
    this.front = scene.add.graphics();
    this.dev = scene.add.graphics();
    c.add([this.glass, this.leaves, this.front, this.dev]);
    this.disp = {
      big: txt(scene, SCREEN.x + SCREEN.w / 2, SCREEN.y + 30, "", { size: 22, weight: "500", color: HEX.c0, origin: 0.5 }),
      out: txt(scene, SCREEN.x + SCREEN.w / 2, SCREEN.y + 58, "", { size: 11, color: "#C7CDD1", origin: 0.5 })
    };
    c.add(Object.values(this.disp));
    // l'oggetto reale dell'obiettivo e la mano del giocatore
    // le persone del bus affollato: coprono lo zaino, ma non la mano e la lampada
    this.crowd = scene.add.graphics();
    c.add(this.crowd);
    this.props = scene.add.container(0, 0);
    c.add(this.props);
    // braccio del giocatore: manica del cappotto disegnata ogni fotogramma dalla spalla
    // (fuori schermo in basso a destra) fino al polso della mano, con il gomito piegato
    this.arm = scene.add.graphics();
    this.props.add(this.arm);
    this.hand = null;
    if (goal !== "temp" && goal !== "light") {
      // il dito preme il tasto dello zaino (luce e temperatura sono manopole vere: niente mano) (per la temperatura si usa il potenziometro vero:
      // nel gioco si vede lo zaino che scalda o raffredda, senza mano)
      const k = BTN[goal];
      this.hand = scene.add.image(k.x + 6, k.y + 8, "bv_hand2").setOrigin(22 / 140, 22 / 140);
      this.props.add(this.hand);
    }
    // la mano entra dal basso a destra
    if (this.hand) {
      const hx = this.hand.x;
      const hy = this.hand.y;
      this.handHome = { x: hx, y: hy };
      this.hand.setPosition(hx + 320, hy + 360);
      scene.tweens.add({ targets: this.hand, x: hx, y: hy, duration: 520, ease: "Cubic.easeOut" });
    }
    this.fx = scene.add.graphics();
    c.add(this.fx);
    // scheda con l'indicazione (a destra in alto)
    const gcol = GOAL_COL[goal] ?? 0x587284;
    const label = txt(scene, VIEW.w - 314, 112, GOAL_NAME[goal], { size: 13, weight: "500", color: HEX.c4 });
    const hintT = txt(scene, VIEW.w - 352, 140, hint ?? "", { size: 16, color: HEX.c4, wrap: 300 });
    const ch = Math.max(128, hintT.height + 86);
    this.barY = 96 + ch - 22;
    const card = scene.add.graphics();
    card.fillStyle(C.c4, 0.12);
    card.fillRoundedRect(VIEW.w - 372, 100, 340, ch, 18);
    card.fillStyle(C.c0, 0.96);
    card.fillRoundedRect(VIEW.w - 372, 96, 340, ch, 18);
    // una velatura del colore della task e una banda a sinistra: si capisce a colpo d'occhio
    // quale comando usare; accanto al nome, lo stesso simbolo che c'è sul tasto
    card.fillStyle(gcol, 0.1);
    card.fillRoundedRect(VIEW.w - 372, 96, 340, ch, 18);
    card.fillStyle(gcol, 1);
    card.fillRoundedRect(VIEW.w - 372, 96 + 18, 5, ch - 36, 2.5);
    card.fillStyle(gcol, 1);
    card.fillCircle(VIEW.w - 336, 119, 15);
    glyph(card, goal, VIEW.w - 336, 119, 0xe6e9e5, 0.85);
    c.add([card, label, hintT]);
    // indicatore sul comando da usare (freccia che dondola e anello del colore della task)
    this.cue = scene.add.graphics();
    this.bar = scene.add.graphics();
    c.add(this.bar);
    c.add(this.cue);
    this.cueCol = gcol;
    this.makeTouch(c);
    // entrata morbida: il pannello sfuma e lo zaino sale dal basso
    c.setAlpha(0);
    c.y = 40;
    scene.tweens.add({ targets: c, alpha: 1, y: 0, duration: 320, ease: "Cubic.easeOut" });
    this.outro = null;
    this.shownProg = 0;
    this.c = c;
    Sfx.announce?.();
  }

  // gli oggetti si possono toccare (se l'Arduino non è collegato): lampada, annaffiatoio,
  // ventilatore, metà sinistra/destra della ghiera
  makeTouch(c) {
    const scene = this.scene;
    const zone = (x, y, w, h, down, up) => {
      const z = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      z.on("pointerdown", down);
      if (up) {
        z.on("pointerup", up);
        z.on("pointerout", up);
      }
      c.add(z);
    };
    const g = this.step.goal;
    // manopola / termometro: tocco = gira piano in quella direzione; trascinando su/giù si imposta
    // il valore direttamente (300 px = tutta la corsa), con la precisione del mouse
    const dial = (x, y, w, h, dirOf, name, dirKey) => {
      const z = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      z.on("pointerdown", (p) => {
        this.drag = { name, y: p.y, v0: Bionomad.sim[name], moved: false, dirKey };
        this[dirKey] = dirOf(p);
      });
      c.add(z);
    };
    const onMove = (p) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      if (!d.moved && Math.abs(p.y - d.y) > 6) {
        d.moved = true;
        this[d.dirKey] = 0;
        d.v0 = Bionomad.sim[d.name];
        d.y = p.y;
      }
      if (d.moved) Bionomad.set(d.name, d.v0 + (d.y - p.y) / 300);
    };
    const onUp = () => {
      if (this.drag) this[this.drag.dirKey] = 0;
      this.drag = null;
    };
    scene.input.on("pointermove", onMove);
    scene.input.on("pointerup", onUp);
    this.offDrag = () => {
      scene.input.off("pointermove", onMove);
      scene.input.off("pointerup", onUp);
    };
    if (g === "light")
      // manopola a schermo, sempre attiva: metà destra = più luce, metà sinistra = meno; o trascina su/giù
      dial(BTN.light.x, BTN.light.y, 160, 120, (p) => (p.x >= BTN.light.x ? 1 : -1), "lightKnob", "lightDir");
    if (g === "water" && PlantSensors.simulated("IR")) zone(BTN.water.x, BTN.water.y, 76, 90, () => (scene._simIrr = true), () => (scene._simIrr = false));
    if (g === "air" && PlantSensors.simulated("AR")) zone(BTN.air.x, BTN.air.y, 76, 90, () => (scene._simAir = true), () => (scene._simAir = false));
    if (g === "temp")
      // manopola della temperatura a schermo: metà destra = più caldo, metà sinistra = più freddo; o trascina su/giù
      dial(BTN.temp.x, BTN.temp.y, 160, 120, (p) => (p.x >= BTN.temp.x ? 1 : -1), "knob", "knobDir");
  }

  close() {
    this.c?.destroy();
    this.c = null;
    this.outro = null;
    // l'HUD torna ai colori del posto in cui si è
    this.scene.tasks?.setDark?.(this.scene.bioContext?.night);
    this.scene._simIrr = false;
    this.scene._simAir = false;
    this.knobDir = 0;
    this.lightDir = 0;
    this.drag = null;
    this.offDrag?.();
    this.offDrag = null;
  }

  // ritorna { done, failed, negligence, progress }
  update(delta) {
    if (!this.c) return {};
    // finale: esito visibile per un attimo, poi il pannello sfuma e solo allora si torna al gioco
    if (this.outro) {
      const o = this.outro;
      o.t += delta;
      this.t += delta;
      this.animate(delta, o.ok ? 1 : this.shownProg);
      if (o.ok && Math.random() < delta / 30) this.sparks.push({ x: GLASS.x + 30 + Math.random() * (GLASS.w - 60), y: SOIL_Y - 40 - Math.random() * 200, a: 1 });
      this.drawSparks(delta);
      if (o.t > 1000) {
        const r = o.res;
        this.outro = null;
        return { done: r.done, failed: r.failed, progress: 1 };
      }
      return {};
    }
    if (this.done) return {};
    const step = this.step;
    const s = Bionomad.state;
    this.elapsed += delta;
    this.t += delta;
    let progress = 0;
    let res = {};
    // la manopola è stata girata da quando si è aperta la task?
    if (!this.turned.light && Math.abs((s.lightLvl ?? 0) - this.knob0.light) > 0.04) this.turned.light = true;
    if (!this.turned.temp && Math.abs(s.knob - this.knob0.temp) > 0.04) this.turned.temp = true;
    if (step.goal === "light") {
      // manopola nella fascia giusta per un attimo (né troppo poca né troppa luce)
      if (Bionomad.lightOk() && this.turned.light) this.ok += delta;
      else this.ok = Math.max(0, this.ok - delta * 0.25);
      progress = Math.min(1, this.ok / (step.holdMs ?? 1000));
      if (step.qteMs && this.elapsed > step.qteMs && progress < 1) res = { failed: true, negligence: "dark" };
    } else if (step.goal === "temp") {
      if (Bionomad.tempOk() && this.turned.temp) this.ok += delta;
      else this.ok = Math.max(0, this.ok - delta * 0.25);
      progress = Math.min(1, this.ok / (step.holdMs ?? 3000));
    } else if (step.goal === "water") {
      // una pressione = una dose giusta; premere di nuovo fa traboccare l'acqua
      const n = Bionomad.pulse.irrPresses - this.presses0.irr;
      if (s.water > 0.92 && !this.flooded) {
        this.flooded = true;
        res = { negligence: "flood" };
      }
      if (n > 0 && Bionomad.waterOk() && !s.irrigating) this.ok += delta;
      else this.ok = 0;
      progress = this.flooded && !s.irrigating ? 1 : n === 0 ? 0 : Math.min(1, (s.water / IDEAL.wMin) * 0.7 + (this.ok / 600) * 0.3);
      if (n === 0 && this.elapsed > this.qte) res = { failed: true, negligence: "forgot" };
    } else if (step.goal === "air") {
      const n = Bionomad.pulse.airPresses - this.presses0.air;
      progress = n === 0 ? 0 : Math.min(1, (s.air - 0.25) / 0.73);
      if (s.venting) this.dust = this.dust.filter(() => Math.random() > delta / 700);
      if (n === 0 && this.elapsed > this.qte) res = { failed: true, negligence: "forgot" };
    }
    if (progress >= 1 && !res.failed) {
      this.done = true;
      res.done = true;
    }
    if (!res.done && !res.failed && step.timeoutMs && this.elapsed > step.timeoutMs + 4000) res = { ...res, failed: true, negligence: res.negligence ?? "forgot" };
    this.animate(delta, progress);
    if (res.done || res.failed) {
      // non si chiude di colpo: prima si mostra l'esito
      this.done = true;
      this.startOutro(res);
      return { negligence: res.negligence, progress };
    }
    return { ...res, progress };
  }

  // esito sopra lo zaino: pillola che compare con un piccolo rimbalzo, poi tutto sfuma
  startOutro(res) {
    const scene = this.scene;
    const ok = Boolean(res.done);
    this.outro = { t: 0, ok, res };
    this.sparks = [];
    if (ok) Sfx.cure?.();
    const pill = scene.add.container(PX, GLASS.y + 150);
    const g = scene.add.graphics();
    const label = ok ? "FATTO  ·  +O₂" : res.negligence === "dark" ? "TROPPO TARDI" : "TEMPO SCADUTO";
    const t = txt(scene, 14, 0, label, { size: 24, weight: "500", origin: [0.5, 0.5], color: ok ? "#3C545B" : "#222A2E" });
    const w = t.width + 90;
    g.fillStyle(C.c4, 0.18);
    g.fillRoundedRect(-w / 2, -28 + 5, w, 56, 28);
    g.fillStyle(C.c0, 1);
    g.fillRoundedRect(-w / 2, -28, w, 56, 28);
    g.fillStyle(ok ? BRAND.teal3 : BRAND.ink, 1);
    g.fillCircle(-w / 2 + 34, 0, 13);
    g.lineStyle(4, 0xffffff, 1);
    if (ok) {
      g.beginPath();
      g.moveTo(-w / 2 + 27, 0);
      g.lineTo(-w / 2 + 32, 6);
      g.lineTo(-w / 2 + 41, -6);
      g.strokePath();
    } else {
      g.lineBetween(-w / 2 + 29, -5, -w / 2 + 39, 5);
      g.lineBetween(-w / 2 + 39, -5, -w / 2 + 29, 5);
    }
    pill.add([g, t]);
    pill.setScale(0.6).setAlpha(0);
    this.c.add(pill);
    scene.tweens.add({ targets: pill, scale: 1, alpha: 1, duration: 260, ease: "Back.easeOut" });
    // la mano si ritira, poi il pannello sfuma via
    if (this.hand) scene.tweens.add({ targets: this.hand, x: this.hand.x + 220, y: this.hand.y + 300, duration: 420, delay: 250, ease: "Cubic.easeIn" });
    scene.tweens.add({ targets: this.c, alpha: 0, duration: 320, delay: 650, ease: "Sine.easeIn" });
  }

  // bollicine di ossigeno che salgono dalle piante quando la cura riesce
  drawSparks(delta) {
    const F = this.fx;
    this.sparks = (this.sparks ?? []).filter((p) => {
      p.y -= delta * 0.09;
      p.a -= delta / 900;
      F.fillStyle(0xffffff, Math.max(0, p.a));
      F.fillCircle(p.x, p.y, 4);
      F.lineStyle(1.5, BRAND.teal4, Math.max(0, p.a));
      F.strokeCircle(p.x, p.y, 4);
      return p.a > 0;
    });
  }

  // manica del cappotto dalla spalla al polso, sempre attaccata alla mano (anche mentre entra)
  drawArm() {
    const A = this.arm;
    A.clear();
    const h = this.hand;
    if (!h) return;
    const pointing = h.texture.key === "bv_hand2";
    // polso nella texture, rispetto all'origine della mano
    const lx = pointing ? 92 - 22 : 92 - 60;
    const ly = pointing ? 104 - 22 : 92 - 60;
    const r = h.rotation;
    const wx = h.x + lx * Math.cos(r) - ly * Math.sin(r);
    const wy = h.y + lx * Math.sin(r) + ly * Math.cos(r);
    // spalla fuori schermo, dal lato in cui sta l'oggetto (annaffiatoio e ventilatore a sinistra)
    const left = wx < PX;
    const sx = left ? -40 : VIEW.w + 40;
    const sy = VIEW.h + 220;
    const dx = sx - wx;
    const dy = sy - wy;
    const len = Math.hypot(dx, dy) || 1;
    // gomito: a metà strada, spinto verso l'esterno (braccio rilassato, non un bastone)
    const bend = Math.min(70, len * 0.14) * (left ? 1 : -1);
    const ex = (wx + sx) / 2 + (dy / len) * bend;
    const ey = (wy + sy) / 2 - (dx / len) * bend;
    const COAT = 0x8c9893;
    const COAT_D = 0x7e8892;
    const quad = (x0, y0, x1, y1, w0, w1, col, cap = true) => {
      const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
      const c0 = Math.cos(ang);
      const s0 = Math.sin(ang);
      A.fillStyle(col, 1);
      A.fillPoints([
        { x: x0 + c0 * w0, y: y0 + s0 * w0 },
        { x: x1 + c0 * w1, y: y1 + s0 * w1 },
        { x: x1 - c0 * w1, y: y1 - s0 * w1 },
        { x: x0 - c0 * w0, y: y0 - s0 * w0 }
      ], true);
      if (cap) A.fillCircle(x1, y1, w1);
    };
    // ombra morbida sotto il braccio
    A.fillStyle(0x262b2c, 0.18);
    A.fillCircle(ex + 14, ey + 18, 60);
    // braccio e avambraccio (la manica si stringe verso il polso)
    quad(sx, sy, ex, ey, 74, 60, COAT_D);
    quad(ex, ey, wx, wy, 60, 40, COAT, false);
    A.fillStyle(COAT, 1);
    A.fillCircle(ex, ey, 58);
    // lato in ombra dell'avambraccio
    const ux = (wx - ex) / (Math.hypot(wx - ex, wy - ey) || 1);
    const uy = (wy - ey) / (Math.hypot(wx - ex, wy - ey) || 1);
    const nx = -uy * (left ? -1 : 1);
    const ny = ux * (left ? -1 : 1);
    quad(ex + nx * 36, ey + ny * 36, wx + nx * 26, wy + ny * 26, 16, 10, COAT_D, false);
    // pieghe al gomito
    A.lineStyle(3, COAT_D, 1);
    for (let i = -1; i <= 1; i++) A.lineBetween(ex + nx * 30 + ux * i * 16, ey + ny * 30 + uy * i * 16, ex - nx * 10 + ux * (i * 16 + 10), ey - ny * 10 + uy * (i * 16 + 10));
    // polsino con la riga gialla
    quad(wx - ux * 34, wy - uy * 34, wx - ux * 4, wy - uy * 4, 41, 40, 0x6a7681, false);
    quad(wx - ux * 26, wy - uy * 26, wx - ux * 20, wy - uy * 20, 41.5, 41.5, Y_ACCENT, false);
  }

  // ---------------------------------------------------------------- disegno animato
  animate(delta, progress) {
    const s = Bionomad.state;
    const step = this.step;
    const goal = step.goal;
    const t = this.t / 1000;
    const lit = s.light;
    const ease = (v, target, ms) => v + (target - v) * Math.min(1, delta / ms);
    // intensità della luce 0..1 (manopola): il disegno la insegue in ~60 ms, così si muove fluida
    this.lvView = ease(this.lvView ?? s.lightLvl ?? 0, s.lightLvl ?? (lit ? 1 : 0), 60);
    const lv = this.lvView;
    const handFree = this.hand && !this.scene.tweens.isTweening(this.hand);

    // ---------- oggetti reali mossi dai comandi veri
    // il dito preme il tasto quando nella realtà si preme il comando
    const presses = Bionomad.pulse.irrPresses + Bionomad.pulse.airPresses;
    if (s.light !== this.prev.light || presses !== this.prev.presses) this.tapUntil = this.t + 300;
    if (this.hand) {
      const k = BTN[goal];
      const press = this.t < (this.tapUntil ?? 0) ? 1 : 0;
      this.handPress = ease(this.handPress ?? 0, press, 60);
      // in attesa la mano respira appena; quando si preme il tasto vero, il dito affonda
      const bob = (1 - this.handPress) * Math.sin(t * 2.4) * 3;
      if (handFree && !this.outro) this.hand.setPosition(k.x + 6 + 20 * (1 - this.handPress), k.y + 8 + 24 * (1 - this.handPress) + bob);
    }
    this.prev = { light: s.light, knob: s.knob, presses };
    this.drawArm();

    // ---------- dietro il vetro: aria interna e luce
    const G = this.glass;
    G.clear();
    const glassPts = [{ x: GLASS.x, y: GLASS.y + GLASS.h }];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI;
      glassPts.push({ x: PX + Math.cos(a) * (GLASS.w / 2), y: GLASS.y + 150 + Math.sin(a) * 150 });
    }
    glassPts.push({ x: GLASS.x + GLASS.w, y: GLASS.y + GLASS.h });
    G.fillStyle(mixC(0xc7cfd5, 0xe4e8e3, Math.min(1, lv * 1.3)), 1);
    G.fillPoints(glassPts, true);
    if (lit) {
      // luce accesa: il cono caldo della lampada sulle piante, intenso quanto la manopola
      G.fillStyle(0xe4e8e3, (0.45 + 0.08 * Math.sin(t * 4)) * Math.min(1, lv * 1.2));
      G.fillTriangle(PX, GLASS.y + 14, GLASS.x + 10, SOIL_Y, GLASS.x + GLASS.w - 10, SOIL_Y);
    }

    // ---------- piante: agave che ondeggia con l'aria, si piega col freddo/caldo
    const L = this.leaves;
    L.clear();
    const wind = s.venting ? 0.22 : 0.035;
    const droop = Phaser.Math.Clamp((Math.abs(s.temp - 21) - 3) / 10, 0, 0.5);
    for (let i = 0; i < 19; i++) {
      const bx = GLASS.x + 40 + i * 16.5;
      const h = 130 + ((i * 53) % 140);
      const lean = ((i * 29) % 40) - 20 + Math.sin(t * (s.venting ? 8 : 1.3) + i) * h * wind + (i % 2 ? 1 : -1) * droop * 70;
      const col = GREENS[i % 4];
      L.fillStyle(lit ? Phaser.Display.Color.GetColor(...[0x9f, 0xd0, 0x8a].map((v, j) => Math.round(v * 0.55 + ((col >> (16 - j * 8)) & 255) * 0.45))) : col, 1);
      const pts = [];
      const n = 10;
      for (let j = 0; j <= n; j++) {
        const u = j / n;
        pts.push({ x: bx - 8 * (1 - u) + lean * u * u, y: SOIL_Y - h * u + droop * 50 * u * u });
      }
      for (let j = n; j >= 0; j--) {
        const u = j / n;
        pts.push({ x: bx + 8 * (1 - u) + lean * u * u, y: SOIL_Y - h * u + droop * 50 * u * u });
      }
      L.fillPoints(pts, true);
    }
    L.fillStyle(0x7d8282, 0.85);
    this.dust.forEach(([x, y]) => L.fillCircle(x, y, 3.5));
    // terra (più scura quando è bagnata) e serbatoio d'acqua trasparente
    const w = Phaser.Math.Clamp(s.water, 0, 1);
    const dry = [0xa8, 0x94, 0x7f];
    const wet = [0x4f, 0x40, 0x36];
    L.fillStyle(Phaser.Display.Color.GetColor(...dry.map((v, i) => Math.round(v + (wet[i] - v) * w))), 1);
    L.fillRect(GLASS.x, SOIL_Y, GLASS.w, GLASS.y + GLASS.h - SOIL_Y);
    L.fillStyle(0xdbe0e3, 1);
    L.fillRoundedRect(TANK.x, TANK.y, TANK.w, TANK.h, 8);
    L.fillStyle(0x587284, 0.85);
    const lvl = Math.max(0.06, w);
    L.fillRoundedRect(TANK.x + 4, TANK.y + 4, (TANK.w - 8) * lvl, TANK.h - 8, 5);

    // ---------- davanti al vetro: riflesso, acqua che scorre, aria, brina/calore
    const F = this.front;
    F.clear();
    F.fillStyle(0xffffff, 0.35);
    F.fillRect(GLASS.x + 22, GLASS.y + 80, 12, 240);
    // irrigazione interna: tubo che sale dal serbatoio e barra con gli ugelli sopra le piante
    const flowing = s.irrigating;
    F.lineStyle(9, 0xb3bcb7, 1);
    F.lineBetween(PIPE_X, TANK.y, PIPE_X, SPRAY_Y);
    F.lineBetween(PIPE_X, SPRAY_Y, GLASS.x + 40, SPRAY_Y);
    for (let i = 0; i < 6; i++) {
      F.fillStyle(0x8b949f, 1);
      F.fillRect(GLASS.x + 52 + i * 52, SPRAY_Y + 3, 8, 8);
    }
    if (flowing) {
      // l'acqua scorre nel tubo (trattini che salgono) ed esce a pioggia dagli ugelli
      F.lineStyle(4, 0x587284, 1);
      for (let y = TANK.y - ((t * 260) % 24); y > SPRAY_Y; y -= 24) F.lineBetween(PIPE_X, y, PIPE_X, Math.max(SPRAY_Y, y - 12));
      for (let x = PIPE_X - ((t * 260) % 24); x > GLASS.x + 40; x -= 24) F.lineBetween(x, SPRAY_Y, Math.max(GLASS.x + 40, x - 12), SPRAY_Y);
      for (let i = 0; i < 6; i++) {
        F.fillStyle(0x7e96b3, 0.35);
        F.fillTriangle(GLASS.x + 56 + i * 52, SPRAY_Y + 10, GLASS.x + 40 + i * 52, SOIL_Y, GLASS.x + 72 + i * 52, SOIL_Y);
      }
      if (Math.random() < delta / 8) {
        const i = Math.floor(Math.random() * 6);
        this.drops.push({ x: GLASS.x + 56 + i * 52, y: SPRAY_Y + 12, vx: (Math.random() - 0.5) * 0.1, vy: 0.1, fall: true });
      }
      if (Math.random() < delta / 30) this.drops.push({ x: GLASS.x + 40 + Math.random() * (GLASS.w - 80), y: SOIL_Y - 4, vx: (Math.random() - 0.5) * 0.15, vy: -0.22 - Math.random() * 0.2 });
    }
    this.drops = this.drops.filter((d) => {
      d.vy += delta * 0.0012;
      d.x += d.vx * delta;
      d.y += d.vy * delta;
      F.fillStyle(0x587284, 0.9);
      F.fillCircle(d.x, d.y, 3.5);
      return d.y < SOIL_Y + 2;
    });
    if (s.water > 0.92) {
      // troppa acqua: trabocca dal bocchettone e cola lungo il guscio fino a terra
      F.fillStyle(0x587284, 0.6);
      F.fillEllipse(PX, BOT - 18, 460 + Math.sin(t * 2) * 20, 26);
      for (let i = 0; i < 5; i++) F.fillCircle(PX - 200 + i * 100, ((t * 170 + i * 70) % 200) + 600, 5);
      F.fillRect(GLASS.x + 30, SOIL_Y - 10, GLASS.w - 60, 14);
      F.fillRect(PX - 120, GLASS.y + GLASS.h + 10, 6, 220 + Math.sin(t * 3) * 12);
      F.fillRect(PX + 80, GLASS.y + GLASS.h + 10, 6, 180 + Math.cos(t * 3) * 12);
    }
    if (s.venting && Math.random() < delta / 20) this.puffs.push({ x: GLASS.x + 6, y: GLASS.y + 180 + Math.random() * 220, a: 1 });
    this.puffs = this.puffs.filter((p) => {
      p.x += delta * 0.8;
      p.a -= delta / 1000;
      F.lineStyle(3, 0xffffff, Math.max(0, p.a));
      F.lineBetween(p.x, p.y, p.x + 48, p.y + Math.sin((p.x + p.y) / 30) * 7);
      return p.a > 0 && p.x < GLASS.x + GLASS.w + 60;
    });
    if (s.temp < IDEAL.tMin - 0.5) {
      // freddo: brina sul vetro
      const a = Phaser.Math.Clamp((IDEAL.tMin - s.temp) / 10, 0.2, 0.8);
      F.fillStyle(0xedf1f2, a);
      for (let i = 0; i < 36; i++) {
        const ang = (i / 36) * Math.PI;
        F.fillCircle(PX - Math.cos(ang) * (GLASS.w / 2 - 8), GLASS.y + 150 - Math.sin(ang) * 142, 6 + (i % 3) * 4);
        if (i % 3 === 0) F.fillCircle(i % 2 ? GLASS.x + 10 : GLASS.x + GLASS.w - 10, GLASS.y + 160 + i * 6, 7);
      }
    } else if (s.temp > IDEAL.tMax + 0.5) {
      // caldo: condensa e onde di calore
      const a = Phaser.Math.Clamp((s.temp - IDEAL.tMax) / 10, 0.25, 0.75);
      F.fillStyle(0xffffff, a * 0.5);
      for (let i = 0; i < 30; i++) F.fillCircle(GLASS.x + 24 + ((i * 47) % (GLASS.w - 48)), GLASS.y + 100 + ((i * 71) % 260), 3.5);
      F.lineStyle(3, 0x587284, a);
      for (let i = 0; i < 4; i++) {
        const x0 = GLASS.x - 70 + i * 170;
        const y0 = TOP + 60 - ((t * 60 + i * 40) % 120);
        F.beginPath();
        for (let j = 0; j <= 8; j++) F.lineTo(x0 + Math.sin(j / 1.6 + t * 4) * 8, y0 - j * 10);
        F.strokePath();
      }
    }

    // ---------- lampada accesa, ghiera della temperatura, display
    const D = this.dev;
    D.clear();
    // freccia sul comando della task: dondola piano, del colore della task
    if (this.cue && !this.done && BTN[goal]) {
      const Q = this.cue;
      Q.clear();
      const tk = BTN[goal];
      const tx = tk.x;
      const ty = tk.y - 50;
      const bob = Math.sin(t * 4) * 4;
      Q.fillStyle(0x2e4350, 0.18);
      Q.fillTriangle(tx - 13, ty - 12 + bob + 3, tx + 13, ty - 12 + bob + 3, tx, ty + 5 + bob + 3);
      Q.fillStyle(this.cueCol, 1);
      Q.fillTriangle(tx - 13, ty - 12 + bob, tx + 13, ty - 12 + bob, tx, ty + 5 + bob);
      Q.lineStyle(2, 0xe6e9e5, 1);
      Q.strokeTriangle(tx - 13, ty - 12 + bob, tx + 13, ty - 12 + bob, tx, ty + 5 + bob);
      Q.lineStyle(3, this.cueCol, 0.55 + 0.35 * Math.sin(t * 4));
      Q.strokeCircle(tk.x, tk.y, goal === "light" || goal === "temp" ? 40 : 30);
    } else this.cue?.clear();
    // luce interna: striscia LED in cima al vetro (accesa calda, spenta scura)
    D.fillStyle(mixC(0x313e4c, 0xe4e8e3, Math.min(1, lv * 1.3)), 1);
    D.fillRoundedRect(PX - 70, GLASS.y + 6, 140, 12, 6);
    if (lit) {
      D.fillStyle(0xe4e8e3, (0.25 + 0.05 * Math.sin(t * 5)) * Math.min(1, lv * 1.3));
      D.fillEllipse(PX, GLASS.y + 14, 240, 40);
    }
    // feritoie dell'aria sul fianco del vetro
    D.fillStyle(0x8c9893, 1);
    for (let i = 0; i < 5; i++) D.fillRoundedRect(GLASS.x - 8, GLASS.y + 200 + i * 40, 14, 22, 4);
    // comandi dello zaino, in fila come sul dispositivo: manopola LUCE, ACQUA, display, ARIA,
    // manopola TEMP. Il comando della task ha l'alone del suo colore.
    const A0 = -Math.PI * 1.25;
    const A1 = Math.PI * 0.25;
    const ang = (v) => A0 + v * (A1 - A0);
    const KR = 30; // raggio dell'anello delle manopole
    const halo = (k, base) => {
      for (let i = 3; i >= 1; i--) {
        D.fillStyle(k.col, 0.09 * (4 - i));
        D.fillCircle(k.x, k.y, base + i * 6 + Math.sin(t * 5) * 1.5);
      }
    };
    const knobBody = (k, v, hot) => {
      D.fillStyle(0xbfc1bd, 1);
      D.fillCircle(k.x, k.y + 3, 22);
      D.fillStyle(0x2e4350, 1);
      D.fillCircle(k.x, k.y, 20);
      D.fillStyle(0x374e5b, 1);
      D.fillCircle(k.x, k.y - 2, 15);
      const a = ang(v);
      D.lineStyle(4, hot ? 0xe6e9e5 : 0x8c9893, 1);
      D.lineBetween(k.x + Math.cos(a) * 6, k.y + Math.sin(a) * 6, k.x + Math.cos(a) * 17, k.y + Math.sin(a) * 17);
    };
    Object.entries(BTN).forEach(([id, k]) => {
      const on = id === goal;
      if (id === "light" || id === "temp") {
        if (on) halo(k, KR);
        const v = id === "light" ? lv : Phaser.Math.Clamp(s.knob, 0, 1);
        if (id === "temp") {
          // da FREDDO (grigio-azzurro) a CALDO (petrolio)
          for (let i = 0; i < 12; i++) {
            D.lineStyle(5, mixC(0xc7d6dd, 0x2e4350, i / 11), 1);
            D.beginPath();
            D.arc(k.x, k.y, KR, ang(i / 12), ang((i + 1) / 12) + 0.02, false);
            D.strokePath();
          }
          const b0 = Bionomad.knobFor(IDEAL.tMin);
          const b1 = Bionomad.knobFor(IDEAL.tMax);
          if (on && b1 > b0) {
            D.lineStyle(9, 0xe6e9e5, 0.5);
            D.beginPath();
            D.arc(k.x, k.y, KR, ang(b0), ang(b1), false);
            D.strokePath();
          }
          // fiocco di neve (freddo) e onde di calore (caldo) alle due estremità
          const ex = k.x - 27;
          const ey = k.y + 27;
          D.lineStyle(1.6, 0x587284, 1);
          for (let i = 0; i < 3; i++) {
            const q = (i / 3) * Math.PI;
            D.lineBetween(ex - Math.cos(q) * 4.5, ey - Math.sin(q) * 4.5, ex + Math.cos(q) * 4.5, ey + Math.sin(q) * 4.5);
          }
          D.lineStyle(1.6, 0x2e4350, 1);
          for (let j = 0; j < 3; j++) {
            D.beginPath();
            for (let q = 0; q <= 5; q++) D.lineTo(k.x + 21 + j * 4 + Math.sin(q * 1.3) * 1.4, ey + 5 - q * 2);
            D.strokePath();
          }
        } else {
          // luce: binario chiaro, parte accesa più chiara, fascia giusta durante la task
          D.lineStyle(5, 0xc6ccc6, 1);
          D.beginPath();
          D.arc(k.x, k.y, KR, A0, A1, false);
          D.strokePath();
          if (on) {
            D.lineStyle(9, 0x678289, 0.5);
            D.beginPath();
            D.arc(k.x, k.y, KR, ang(IDEAL.lMin), ang(IDEAL.lMax), false);
            D.strokePath();
          }
          if (lv > 0.01) {
            D.lineStyle(3, 0x7d909f, 1);
            D.beginPath();
            D.arc(k.x, k.y, KR, A0, ang(lv), false);
            D.strokePath();
          }
          // poca luce (puntino) e tanta luce (sole) alle due estremità
          D.fillStyle(0x8c9893, 1);
          D.fillCircle(k.x - 27, k.y + 27, 2.5);
          glyph(D, "light", k.x + 27, k.y + 27, lit ? 0x2e4350 : 0x8c9893, 0.45);
        }
        knobBody(k, v, on || (id === "light" && lit));
        return;
      }
      if (on) halo(k, 22);
      const pressed = (id === "water" && s.irrigating) || (id === "air" && s.venting);
      const cy = k.y + (pressed ? 2 : 0);
      D.fillStyle(0xbfc1bd, 1);
      D.fillCircle(k.x, k.y + 3, 25);
      D.fillStyle(pressed ? 0xdadbd7 : 0xebece8, 1);
      D.fillCircle(k.x, cy, 23);
      D.lineStyle(1.5, on ? k.col : 0xd0d1cc, 1);
      D.strokeCircle(k.x, cy, 23);
      glyph(D, id, k.x, cy, on || pressed ? (id === "air" ? 0x587284 : k.col) : 0x8c9893, 1.05);
    });
    // ---------- temperatura: termometro nel guscio e piastra sotto la terra che scalda o raffredda
    {
      const tgt = Bionomad.target();
      const diff = tgt - s.temp;
      this.heat = ease(this.heat ?? 0, Phaser.Math.Clamp(diff / 6, -1, 1), 250);
      const hk = this.heat;
      // piastra a serpentina sotto la terra (si vede dal vetro)
      const my = SOIL_Y + 30;
      const col = hk > 0.05 ? mixC(0x8c9893, 0x4e6878, Math.min(1, hk * 1.4)) : hk < -0.05 ? mixC(0x8c9893, 0x8fb3c4, Math.min(1, -hk * 1.4)) : 0x8c9893;
      if (Math.abs(hk) > 0.05) {
        D.lineStyle(14, col, 0.25 * Math.min(1, Math.abs(hk) * 1.5));
        D.beginPath();
        for (let i = 0; i <= 16; i++) D.lineTo(GLASS.x + 20 + i * ((GLASS.w - 40) / 16), my + (i % 2 ? -7 : 7));
        D.strokePath();
      }
      D.lineStyle(4, col, 1);
      D.beginPath();
      for (let i = 0; i <= 16; i++) D.lineTo(GLASS.x + 20 + i * ((GLASS.w - 40) / 16), my + (i % 2 ? -7 : 7));
      D.strokePath();
      // aria che sale: onde calde arancio o cristalli freddi azzurri
      if (Math.abs(hk) > 0.1) {
        for (let i = 0; i < 7; i++) {
          const k = ((t * 0.5 + i / 7) % 1);
          const x0 = GLASS.x + 40 + i * ((GLASS.w - 80) / 6);
          const y0 = SOIL_Y - 10 - k * 260;
          const al = Math.sin(k * Math.PI) * Math.min(1, Math.abs(hk) * 1.6);
          if (hk > 0) {
            D.lineStyle(3, 0x4e6878, al * 0.8);
            D.beginPath();
            for (let j = 0; j <= 6; j++) D.lineTo(x0 + Math.sin(j / 1.4 + t * 5 + i) * 5, y0 - j * 7);
            D.strokePath();
          } else {
            D.fillStyle(0xe1eaed, al);
            D.fillCircle(x0 + Math.sin(t * 2 + i) * 6, y0, 3.5);
            D.lineStyle(1.5, 0x8fb3c4, al);
            D.lineBetween(x0 - 6, y0, x0 + 6, y0);
            D.lineBetween(x0, y0 - 6, x0, y0 + 6);
          }
        }
      }
    }
    D.fillStyle(0x2e4350, 1);
    D.fillRoundedRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 10);
    const ok = Bionomad.tempOk();
    this.disp.big.setText(`${s.temp.toFixed(1)}°C`).setColor(ok ? "#E6E9E5" : "#7D909F");
    this.disp.out.setText(`FUORI ${Math.round(s.out)}°C`);
    D.fillStyle(0x9fc0ad, 1);
    D.fillRect(PX - 170, TANK.y + TANK.h + 14, 340, 4);

    // ---------- bus affollato: le persone coprono lo zaino finché la luce è spenta
    const X = this.fx;
    X.clear();
    const CR = this.crowd;
    CR.clear();
    if (goal === "light" && step.qteMs) {
      if (lit && this.litAt == null) this.litAt = this.t;
      const k2 = lit ? Math.max(0, 1 - (this.t - this.litAt) / 600) : 1;
      if (k2 > 0) {
        CR.fillStyle(0x303c48, 0.94 * k2);
        CR.fillRoundedRect(-60 - (1 - k2) * 360, 110, 470, 760, 140);
        CR.fillCircle(170 - (1 - k2) * 360, 80, 78);
        CR.fillStyle(0x374e5b, 0.94 * k2);
        CR.fillRoundedRect(VIEW.w - 300 + (1 - k2) * 360, 160, 470, 720, 140);
        CR.fillCircle(VIEW.w - 110 + (1 - k2) * 360, 120, 72);
        CR.fillStyle(0x182226, 0.28 * k2);
        CR.fillRect(0, 0, VIEW.w, VIEW.h);
      }
    }

    const pressed = goal === "water" ? Bionomad.pulse.irrPresses > this.presses0.irr : goal === "air" ? Bionomad.pulse.airPresses > this.presses0.air : false;
    // ---------- quick time event: anello che si svuota attorno all'oggetto finché non si preme
    const lightWait = goal === "light" && step.qteMs && !Bionomad.lightOk() && this.ok <= 0;
    if (((goal === "water" || goal === "air") && !pressed && this.qte) || lightWait) {
      const at = BTN[goal];
      const lim = goal === "light" ? step.qteMs : this.qte;
      const left = Math.max(0, 1 - this.elapsed / lim);
      const pulseR = (goal === "light" ? 50 : 46) + Math.sin(t * 8) * 3;
      X.lineStyle(6, 0xffffff, 0.5);
      X.strokeCircle(at.x, at.y, pulseR);
      X.lineStyle(6, left < 0.3 ? 0x262b2c : Y_ACCENT, 1);
      X.beginPath();
      X.arc(at.x, at.y, pulseR, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false);
      X.strokePath();
    }

    // ---------- completamento e tempo rimasto
    const B = this.bar;
    B.clear();
    B.fillStyle(C.c1, 1);
    B.fillRoundedRect(VIEW.w - 352, this.barY, 300, 8, 4);
    B.fillStyle(C.c4, 1);
    this.shownProg = (this.shownProg ?? 0) + (progress - (this.shownProg ?? 0)) * Math.min(1, delta / 120);
    B.fillRoundedRect(VIEW.w - 352, this.barY, Math.max(8, 300 * this.shownProg), 8, 4);
    const limit = goal === "light" ? (step.qteMs && progress < 1 ? step.qteMs : null) : pressed ? null : this.qte;
    if (limit) {
      const left = Math.max(0, 1 - this.elapsed / limit);
      B.fillStyle(left < 0.3 ? 0x262b2c : Y_ACCENT, 1);
      B.fillRoundedRect(VIEW.w - 352, this.barY + 12, 300 * left, 4, 2);
    }
  }
}
