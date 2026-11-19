// pannello del BIONOMAD: il "display" del dispositivo con temperatura dello zaino e dell'esterno,
// luce, acqua e aria, più l'obiettivo della task. Si usa con i controlli fisici; se un comando
// non è collegato, compaiono i pulsanti a schermo e funzionano i tasti:
//   L luce · W/S (o ↑/↓) manopola · R irrigazione (tenuto) · V aria (tenuto)
import Phaser from "../phaser.js";
import { Bionomad, IDEAL } from "../systems/Bionomad.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { Sfx } from "../systems/Sfx.js";
import { C, HEX, txt, VIEW, Y_ACCENT } from "./hud.js";
import { grain } from "../world/city.js";
import { addHiRes } from "../art/hires.js";

const X0 = 400;
const Y0 = 120;
const W = 820;
const H = 470;

// tasti dei controlli simulati: validi in tutte le scene di gioco
export function bioKeys(scene) {
  const kb = scene.input.keyboard;
  const keys = kb.addKeys("W,S,UP,DOWN,R,V,L");
  kb.on("keydown-L", () => {
    if (PlantSensors.simulated("LU")) Bionomad.sim.light = !Bionomad.sim.light;
  });
  return (delta) => {
    const dt = Math.min(delta, 100) / 1000;
    const up = keys.W.isDown || keys.UP.isDown;
    const down = keys.S.isDown || keys.DOWN.isDown;
    if (up || down) Bionomad.sim.knob = Phaser.Math.Clamp(Bionomad.sim.knob + (up ? 0.35 : -0.35) * dt, 0, 1);
    Bionomad.sim.irrigating = keys.R.isDown || Boolean(scene._simIrr);
    Bionomad.sim.venting = keys.V.isDown || Boolean(scene._simAir);
  };
}

// illustrazione del BIONOMAD vero: scatola bianca con le agavi, il display e i comandi
export function bionomadArt(scene) {
  const key = "bionomad_big";
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 300;
  const X = c.getContext("2d", { willReadFrequently: true });
  const leaf = (x, y, h, lean, col) => {
    X.fillStyle = col;
    X.beginPath();
    X.moveTo(x - 7, y);
    X.quadraticCurveTo(x - 4 + lean * 0.3, y - h * 0.6, x + lean, y - h);
    X.quadraticCurveTo(x + 4 + lean * 0.3, y - h * 0.6, x + 7, y);
    X.fill();
  };
  // agavi
  const greens = ["#5F8F62", "#76A574", "#4E7C55"];
  for (let i = 0; i < 16; i++) leaf(70 + i * 10, 120, 70 + ((i * 37) % 50), ((i * 13) % 30) - 15, greens[i % 3]);
  // vaso laterale
  X.fillStyle = "#E9E7E1";
  X.fillRect(18, 170, 52, 56);
  for (let i = 0; i < 5; i++) leaf(28 + i * 9, 172, 40 + (i % 2) * 14, (i - 2) * 6, greens[i % 3]);
  // corpo principale
  X.fillStyle = "#EDEBE5";
  X.beginPath();
  X.moveTo(50, 120);
  X.lineTo(250, 120);
  X.quadraticCurveTo(262, 120, 262, 132);
  X.lineTo(262, 262);
  X.quadraticCurveTo(262, 274, 250, 274);
  X.lineTo(62, 274);
  X.quadraticCurveTo(50, 274, 50, 262);
  X.closePath();
  X.fill();
  X.fillStyle = "#D9D6CE";
  X.fillRect(236, 124, 24, 148);
  // display
  X.fillStyle = "#2B3D56";
  X.fillRect(120, 168, 112, 70);
  X.fillStyle = "#8FD0A6";
  X.fillRect(128, 228, 60, 3);
  X.fillStyle = "#F4F5F7";
  X.font = "bold 13px monospace";
  X.fillText("O₂RIGIN", 130, 190);
  // pulsanti
  [[74, 150, "#E2B33C"], [74, 182, "#3F67A8"], [74, 214, "#F4F5F7"], [196, 146, "#BFC6D0"]].forEach(([x, y, col]) => {
    X.fillStyle = "#C9C6BE";
    X.beginPath();
    X.arc(x, y, 11, 0, 7);
    X.fill();
    X.fillStyle = col;
    X.beginPath();
    X.arc(x, y, 7, 0, 7);
    X.fill();
  });
  // anello luminoso alla base
  X.fillStyle = "#8FD0A6";
  X.fillRect(56, 266, 200, 3);
  scene.textures.addCanvas(key, c);
  return key;
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
const SCREEN = { x: PX - 112, y: 640, w: 224, h: 84 }; // display della temperatura
// oggetti reali con cui si interagisce
const INLET = { x: PX - PW / 2 - 4, y: 330 }; // imbuto per l'acqua sul fianco sinistro
const CAN = { x: INLET.x - 162, y: INLET.y - 112 }; // annaffiatoio (punto della maniglia)
const LAMP_K = 1.45;
const LAMP = { x: PX + 228, y: 262 }; // lampada a pinza agganciata alla spalla destra
const LAMP_HEAD = { x: LAMP.x - 82 * LAMP_K, y: LAMP.y - 80 * LAMP_K };
const LAMP_SW = { x: LAMP.x + 46, y: LAMP.y + 2 }; // interruttore sulla pinza
const DIAL = { x: PX + 330, y: 640, r: 66 }; // ghiera della temperatura sul fianco
const FAN = { x: 236, y: 370 }; // ventilatore a mano (centro della griglia)
const GREENS = [0x5f8f62, 0x76a574, 0x4e7c55, 0x6a9a69];

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
    g.addColorStop(0, night ? "#1F2E46" : "#C3CCD9");
    g.addColorStop(1, night ? "#3E5372" : "#E3E7ED");
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
      R(x, y1 - h, w, h, night ? ["#2B3D56", "#34496A"][n % 2] : ["#6581A3", "#8394AD", "#4C6787"][n % 3]);
      if (night) for (let wy = y1 - h + 12; wy < y1 - 10; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 18) if ((wx * wy) % 7 < 2) R(wx, wy, 6, 8, "#F2E1A6");
      x += w + 4;
      n++;
    }
    X.filter = "none";
    X.restore();
  };
  if (kind === "bus") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#2A384D" : "#8C9AB0");
    cityBlur(70, 470, 0, VIEW.w);
    // montanti dei finestrini, corrimano, schienali
    for (let x = 120; x < VIEW.w; x += 360) R(x, 60, 26, 440, night ? "#3A4B63" : "#B5BFCC");
    R(0, 60, VIEW.w, 22, night ? "#3A4B63" : "#B5BFCC");
    R(0, 470, VIEW.w, 30, night ? "#33445C" : "#A9B3C2");
    X.fillStyle = night ? "#C9B37A" : "#E2B33C";
    [250, 990].forEach((x) => X.fillRect(x, 0, 12, 760));
    R(0, 500, VIEW.w, 300, night ? "#26344A" : "#6E7C93");
  } else if (kind === "office") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#2B3A50" : "#D5DBE4");
    cityBlur(60, 420, 60, 760);
    R(60, 410, 700, 14, night ? "#3A4B63" : "#B9C2CE");
    for (let x = 60; x < 760; x += 175) R(x, 60, 8, 360, night ? "#3A4B63" : "#B9C2CE");
    // monitor sfocato e lampada da scrivania
    X.filter = "blur(4px)";
    R(880, 300, 260, 160, "#24344B");
    R(895, 315, 230, 130, night ? "#5E7EA8" : "#9FB6D3");
    R(1000, 460, 20, 60, "#3A4B63");
    X.filter = "none";
    // piano della scrivania
    R(0, 640, VIEW.w, 160, night ? "#3D4C61" : "#C7CFD9");
    R(0, 636, VIEW.w, 8, night ? "#56657B" : "#E3E8EF");
  } else if (kind === "home") {
    R(0, 0, VIEW.w, VIEW.h, night ? "#2E3A4E" : "#E1DDD5");
    cityBlur(70, 380, 820, 1200);
    R(810, 60, 400, 14, night ? "#44526A" : "#C9C3B8");
    R(810, 380, 400, 14, night ? "#44526A" : "#C9C3B8");
    // divano sfocato e lampada calda
    X.filter = "blur(5px)";
    R(40, 470, 380, 200, night ? "#3F4D66" : "#9AA7BA");
    R(20, 440, 60, 230, night ? "#3F4D66" : "#9AA7BA");
    X.fillStyle = night ? "rgba(242,225,166,0.35)" : "rgba(242,225,166,0.2)";
    X.beginPath();
    X.arc(260, 200, 160, 0, 7);
    X.fill();
    X.filter = "none";
    R(0, 680, VIEW.w, 120, night ? "#2A3546" : "#B8AFA2");
  } else {
    // strada: la città sfocata dietro, il marciapiede in basso
    cityBlur(0, 620);
    R(0, 600, VIEW.w, 70, night ? "#3A475D" : "#59667C");
    R(0, 668, VIEW.w, 4, "#E6E9EE");
    R(0, 672, VIEW.w, 130, night ? "#56637A" : "#A6B1C2");
  }
  // velo chiaro/scuro per far risaltare lo zaino
  const v = X.createRadialGradient(PX, 450, 120, PX, 450, 700);
  v.addColorStop(0, night ? "rgba(20,30,48,0)" : "rgba(255,255,255,0.18)");
  v.addColorStop(1, night ? "rgba(20,30,48,0.45)" : "rgba(36,52,75,0.18)");
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
    X.fillStyle = "#2F3D52";
    [-1, 1].forEach((d) => {
      X.beginPath();
      X.moveTo(PX + d * 200, TOP + 150);
      X.quadraticCurveTo(PX + d * 300, 470, PX + d * 262, BOT);
      X.lineTo(PX + d * 222, BOT);
      X.quadraticCurveTo(PX + d * 256, 470, PX + d * 168, TOP + 150);
      X.fill();
    });
    // ombra portata
    X.fillStyle = "rgba(20,30,48,0.22)";
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
    X.fillStyle = "#ECEAE4";
    X.fill(shell);
    X.save();
    X.clip(shell);
    // lato in ombra a destra, luce a sinistra
    X.fillStyle = "#D8D5CD";
    X.fillRect(PX + PW / 2 - 56, TOP, 56, BOT - TOP);
    X.fillStyle = "rgba(255,255,255,0.55)";
    X.fillRect(PX - PW / 2 + 16, TOP + 120, 10, BOT - TOP - 180);
    // cucitura
    X.strokeStyle = "#D1CEC6";
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
    X.fillStyle = "#C9CDD3";
    X.beginPath();
    X.roundRect(PX - 50, TOP - 20, 100, 28, 8);
    X.fill();
    X.fillStyle = "#AEB6C2";
    X.beginPath();
    X.ellipse(PX, TOP - 20, 50, 9, 0, 0, 7);
    X.fill();
    // imbuto dell'acqua sul fianco sinistro
    X.fillStyle = "#AEB6C2";
    X.beginPath();
    X.moveTo(INLET.x - 40, INLET.y - 30);
    X.lineTo(INLET.x + 30, INLET.y - 30);
    X.lineTo(INLET.x + 30, INLET.y + 26);
    X.lineTo(INLET.x + 8, INLET.y + 26);
    X.closePath();
    X.fill();
    X.fillStyle = "#C9CDD3";
    X.beginPath();
    X.ellipse(INLET.x - 5, INLET.y - 30, 36, 9, 0, 0, 7);
    X.fill();
    X.fillStyle = "#2B3D56";
    X.beginPath();
    X.ellipse(INLET.x - 5, INLET.y - 30, 28, 6, 0, 0, 7);
    X.fill();
    // cornice del vetro
    X.fillStyle = "#D9D6CE";
    X.beginPath();
    X.moveTo(GLASS.x - 12, GLASS.y + GLASS.h + 12);
    X.lineTo(GLASS.x - 12, GLASS.y + 150);
    X.quadraticCurveTo(GLASS.x - 12, GLASS.y - 12, PX, GLASS.y - 12);
    X.quadraticCurveTo(GLASS.x + GLASS.w + 12, GLASS.y - 12, GLASS.x + GLASS.w + 12, GLASS.y + 150);
    X.lineTo(GLASS.x + GLASS.w + 12, GLASS.y + GLASS.h + 12);
    X.closePath();
    X.fill();
    // cornice del display
    X.fillStyle = "#D9D6CE";
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
    H.strokeStyle = "rgba(160,120,95,0.45)";
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
    H.strokeStyle = "rgba(160,120,95,0.5)";
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
  // annaffiatoio: corpo blu-grigio, beccuccio lungo con la rosetta a sinistra, maniglia in alto
  // (origine sulla maniglia: 200,40)
  {
    const [c, X] = hiCanvas(280, 190);
    X.strokeStyle = "#556C88";
    X.lineWidth = 12;
    X.beginPath();
    X.moveTo(150, 74);
    X.quadraticCurveTo(200, 0, 252, 80);
    X.stroke();
    X.fillStyle = "#6E86A4";
    X.beginPath();
    X.moveTo(150, 70);
    X.lineTo(70, 120);
    X.lineTo(20, 46);
    X.lineTo(34, 38);
    X.lineTo(84, 104);
    X.lineTo(150, 82);
    X.closePath();
    X.fill();
    X.fillStyle = "#556C88";
    X.beginPath();
    X.ellipse(22, 40, 18, 9, -0.95, 0, 7);
    X.fill();
    X.fillStyle = "#7F97B5";
    X.beginPath();
    X.roundRect(130, 70, 140, 110, 18);
    X.fill();
    X.fillStyle = "#6E86A4";
    X.fillRect(250, 74, 20, 104);
    X.fillStyle = "rgba(255,255,255,0.35)";
    X.fillRect(144, 84, 8, 80);
    X.fillStyle = "#E2B33C";
    X.fillRect(130, 150, 140, 8);
    addHiRes(scene, "bv_can", c, SSZ);
  }
  // lampada a pinza: pinza sul bordo, collo flessibile, testa che guarda dentro il vetro
  {
    const [c, X] = hiCanvas(200, 200);
    X.strokeStyle = "#3A4B63";
    X.lineWidth = 9;
    X.beginPath();
    X.moveTo(130, 140);
    X.bezierCurveTo(130, 60, 90, 30, 50, 60);
    X.stroke();
    X.save();
    X.translate(48, 70);
    X.rotate(0.5);
    X.fillStyle = "#24344B";
    X.beginPath();
    X.moveTo(-34, 30);
    X.lineTo(-18, -12);
    X.lineTo(18, -12);
    X.lineTo(34, 30);
    X.closePath();
    X.fill();
    X.fillStyle = "#3A4B63";
    X.fillRect(-18, -20, 36, 10);
    X.restore();
    // pinza
    X.fillStyle = "#2F3D52";
    X.beginPath();
    X.roundRect(104, 130, 70, 36, 10);
    X.fill();
    X.fillStyle = "#24344B";
    X.fillRect(112, 160, 14, 34);
    X.fillRect(152, 160, 14, 34);
    addHiRes(scene, "bv_lamp", c, SSZ);
  }
  // ventilatore a mano: griglia rotonda e manico (centro griglia 90,90)
  {
    const [c, X] = hiCanvas(180, 300);
    X.fillStyle = "#3A4B63";
    X.beginPath();
    X.roundRect(76, 150, 28, 140, 12);
    X.fill();
    X.fillStyle = "#E2B33C";
    X.fillRect(78, 196, 24, 8);
    X.fillStyle = "#24344B";
    X.beginPath();
    X.arc(90, 90, 84, 0, 7);
    X.fill();
    X.fillStyle = "#C6D3E3";
    X.beginPath();
    X.arc(90, 90, 74, 0, 7);
    X.fill();
    addHiRes(scene, "bv_fan", c, SSZ);
  }
  // pala del ventilatore (ruota attorno a 70,70)
  {
    const [c, X] = hiCanvas(140, 140);
    X.fillStyle = "#7F97B5";
    for (let i = 0; i < 4; i++) {
      X.save();
      X.translate(70, 70);
      X.rotate((i * Math.PI) / 2);
      X.beginPath();
      X.ellipse(0, -34, 18, 32, 0.35, 0, 7);
      X.fill();
      X.restore();
    }
    X.fillStyle = "#24344B";
    X.beginPath();
    X.arc(70, 70, 12, 0, 7);
    X.fill();
    addHiRes(scene, "bv_blade", c, SSZ);
  }
  // griglia davanti alle pale
  {
    const [c, X] = hiCanvas(180, 180);
    X.strokeStyle = "rgba(36,52,75,0.85)";
    X.lineWidth = 2;
    [24, 44, 64].forEach((r) => {
      X.beginPath();
      X.arc(90, 90, r, 0, 7);
      X.stroke();
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      X.beginPath();
      X.moveTo(90, 90);
      X.lineTo(90 + Math.cos(a) * 74, 90 + Math.sin(a) * 74);
      X.stroke();
    }
    addHiRes(scene, "bv_guard", c, SSZ);
  }
}

const GOAL_NAME = { light: "LUCE", temp: "TEMPERATURA", water: "IRRIGAZIONE", air: "ARIEGGIAMENTO" };

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
    packTextures(scene);
    let goal = step.goal;
    let hint = step.hint;
    if (goal === "need") {
      goal = Math.random() < 0.5 ? "water" : "air";
      hint = goal === "water" ? "Ha sete: premi UNA volta il pulsante dell'acqua, in tempo." : "Ha bisogno d'aria: premi UNA volta il pulsante dell'aria, in tempo.";
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
    this.tilt = 0;
    this.spin = 0;
    this.fanPush = 0;
    this.dust = goal === "air" ? Array.from({ length: 30 }, () => [GLASS.x + 24 + Math.random() * (GLASS.w - 48), 230 + Math.random() * 260]) : [];
    if (step.out != null) Bionomad.setOutside(step.out);
    const s = Bionomad.state;
    if (goal === "water") s.water = Math.min(s.water, 0.18);
    if (goal === "air") s.air = Math.min(s.air, 0.25);
    this.prev = { light: s.light, knob: s.knob };
    // quick time event dei pulsanti: si conta da qui quante volte vengono premuti
    this.presses0 = { irr: Bionomad.pulse.irrPresses, air: Bionomad.pulse.airPresses };
    this.qte = step.qteMs ?? step.timeoutMs ?? (goal === "water" || goal === "air" ? 7000 : null);

    const ctx = scene.bioContext ?? { kind: "street", night: false };
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
      big: txt(scene, SCREEN.x + 18, SCREEN.y + 32, "", { size: 34, weight: "500", color: HEX.c0, origin: [0, 0.5] }),
      out: txt(scene, SCREEN.x + 18, SCREEN.y + 66, "", { size: 14, color: "#C9D3E0", origin: [0, 0.5] })
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
    if (goal === "water") {
      // girato: il beccuccio punta a destra, verso l'imbuto dello zaino
      this.can = scene.add.image(CAN.x, CAN.y, "bv_can").setOrigin(80 / 280, 40 / 190).setFlipX(true);
      this.hand = scene.add.image(CAN.x, CAN.y, "bv_grip").setOrigin(60 / 140, 60 / 140);
      this.props.add([this.can, this.hand]);
    } else if (goal === "light") {
      this.props.add(scene.add.image(LAMP.x, LAMP.y, "bv_lamp").setOrigin(130 / 200, 150 / 200).setScale(LAMP_K));
      this.sw = scene.add.graphics();
      this.props.add(this.sw);
      this.hand = scene.add.image(LAMP_SW.x, LAMP_SW.y, "bv_hand2").setOrigin(22 / 140, 22 / 140);
      this.props.add(this.hand);
    } else if (goal === "air") {
      this.fan = scene.add.container(FAN.x, FAN.y);
      this.blade = scene.add.image(0, 0, "bv_blade");
      this.fan.add([scene.add.image(0, 0, "bv_fan").setOrigin(0.5, 90 / 300), this.blade, scene.add.image(0, 0, "bv_guard")]);
      this.fan.setRotation(0.12);
      this.hand = scene.add.image(FAN.x + 18, FAN.y + 150, "bv_grip").setOrigin(60 / 140, 60 / 140);
      this.props.add([this.fan, this.hand]);
    } else if (goal === "temp") {
      this.hand = scene.add.image(DIAL.x, DIAL.y, "bv_grip").setOrigin(60 / 140, 60 / 140);
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
    const card = scene.add.graphics();
    card.fillStyle(C.c4, 0.12);
    card.fillRoundedRect(VIEW.w - 372, 100, 340, 128, 18);
    card.fillStyle(C.c0, 0.96);
    card.fillRoundedRect(VIEW.w - 372, 96, 340, 128, 18);
    c.add(card);
    c.add(txt(scene, VIEW.w - 352, 112, GOAL_NAME[goal], { size: 13, color: HEX.c3 }));
    c.add(txt(scene, VIEW.w - 352, 134, hint ?? "", { size: 16, color: HEX.c4, wrap: 300 }));
    this.bar = scene.add.graphics();
    c.add(this.bar);
    this.makeTouch(c);
    c.setAlpha(0);
    scene.tweens.add({ targets: c, alpha: 1, duration: 220 });
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
    if (g === "light" && PlantSensors.simulated("LU")) zone(LAMP.x - 60, LAMP.y - 90, 260, 220, () => (Bionomad.sim.light = !Bionomad.sim.light));
    if (g === "water" && PlantSensors.simulated("IR")) zone(CAN.x + 60, CAN.y + 60, 300, 220, () => (scene._simIrr = true), () => (scene._simIrr = false));
    if (g === "air" && PlantSensors.simulated("AR")) zone(FAN.x, FAN.y + 40, 200, 320, () => (scene._simAir = true), () => (scene._simAir = false));
    if (g === "temp" && PlantSensors.simulated("TK"))
      [-1, 1].forEach((d) => zone(DIAL.x + d * 60, DIAL.y, 120, 180, () => (this.knobDir = d), () => (this.knobDir = 0)));
  }

  close() {
    this.c?.destroy();
    this.c = null;
    this.scene._simIrr = false;
    this.scene._simAir = false;
    this.knobDir = 0;
  }

  // ritorna { done, failed, negligence, progress }
  update(delta) {
    if (!this.c || this.done) return {};
    const step = this.step;
    const s = Bionomad.state;
    if (this.knobDir) Bionomad.sim.knob = Phaser.Math.Clamp(Bionomad.sim.knob + this.knobDir * 0.4 * (delta / 1000), 0, 1);
    this.elapsed += delta;
    this.t += delta;
    let progress = 0;
    let res = {};
    if (step.goal === "light") {
      if (s.light) this.ok += delta;
      else this.ok = 0;
      progress = Math.min(1, this.ok / 500);
      if (step.qteMs && this.elapsed > step.qteMs && progress < 1) res = { failed: true, negligence: "dark" };
    } else if (step.goal === "temp") {
      if (Bionomad.tempOk()) this.ok += delta;
      else this.ok = Math.max(0, this.ok - delta * 0.5);
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
    return { ...res, progress };
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
    const COAT = 0x9aa3af;
    const COAT_D = 0x838c9a;
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
    A.fillStyle(0x1c2839, 0.18);
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
    quad(wx - ux * 34, wy - uy * 34, wx - ux * 4, wy - uy * 4, 41, 40, 0x6e7889, false);
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
    const handFree = this.hand && !this.scene.tweens.isTweening(this.hand);

    // ---------- oggetti reali mossi dai comandi veri
    let spout = null;
    if (goal === "water") {
      // annaffiatoio: si inclina e versa davvero quando si tiene premuto il pulsante dell'acqua
      this.tilt = ease(this.tilt, s.irrigating ? 0.56 : 0.04 + Math.sin(t * 1.4) * 0.02, 180);
      this.can.setRotation(this.tilt);
      if (handFree) this.hand.setPosition(CAN.x, CAN.y).setRotation(this.tilt * 0.5);
      // punta del beccuccio (girato: 258,40 nella texture) ruotata attorno alla maniglia (80,40)
      const dx = 258 - 80;
      const dy = 0;
      spout = { x: CAN.x + dx * Math.cos(this.tilt) - dy * Math.sin(this.tilt), y: CAN.y + dx * Math.sin(this.tilt) + dy * Math.cos(this.tilt) };
    } else if (goal === "light") {
      if (s.light !== this.prev.light) this.tapUntil = this.t + 280;
      const press = this.t < (this.tapUntil ?? 0) ? 1 : 0;
      this.handPress = ease(this.handPress ?? 0, press, 60);
      if (handFree) this.hand.setPosition(LAMP_SW.x + 8 + 22 * (1 - this.handPress), LAMP_SW.y + 10 + 26 * (1 - this.handPress));
    } else if (goal === "air") {
      this.spin += (s.venting ? 0.05 : 0.002) * delta;
      this.blade.setRotation(this.spin);
      this.fanPush = ease(this.fanPush, s.venting ? 1 : 0, 200);
      const fx = FAN.x + this.fanPush * 40 + (s.venting ? Math.sin(t * 30) * 1.5 : 0);
      this.fan.setPosition(fx, FAN.y);
      if (handFree) this.hand.setPosition(fx + 18, FAN.y + 150);
    } else if (goal === "temp") {
      const ang = -Math.PI * 0.75 + s.knob * Math.PI * 1.5;
      if (handFree) this.hand.setPosition(DIAL.x + Math.sin(ang) * 30, DIAL.y - Math.cos(ang) * 30).setRotation(ang * 0.5);
    }
    this.prev = { light: s.light, knob: s.knob };
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
    G.fillStyle(lit ? 0xf4ecc8 : 0xc6d6ea, 1);
    G.fillPoints(glassPts, true);
    if (lit) {
      // luce accesa: il cono caldo della lampada sulle piante
      G.fillStyle(0xf6e7a8, 0.45 + 0.08 * Math.sin(t * 4));
      G.fillTriangle(LAMP_HEAD.x - 8, LAMP_HEAD.y + 26, GLASS.x + 10, SOIL_Y, GLASS.x + GLASS.w - 10, SOIL_Y);
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
    L.fillStyle(0x8a8478, 0.85);
    this.dust.forEach(([x, y]) => L.fillCircle(x, y, 3.5));
    // terra (più scura quando è bagnata) e serbatoio d'acqua trasparente
    const w = Phaser.Math.Clamp(s.water, 0, 1);
    const dry = [0xa8, 0x94, 0x7f];
    const wet = [0x4f, 0x40, 0x36];
    L.fillStyle(Phaser.Display.Color.GetColor(...dry.map((v, i) => Math.round(v + (wet[i] - v) * w))), 1);
    L.fillRect(GLASS.x, SOIL_Y, GLASS.w, GLASS.y + GLASS.h - SOIL_Y);
    L.fillStyle(0xdfe7f1, 1);
    L.fillRoundedRect(TANK.x, TANK.y, TANK.w, TANK.h, 8);
    L.fillStyle(0x5f8fd0, 0.85);
    const lvl = Math.max(0.06, w);
    L.fillRoundedRect(TANK.x + 4, TANK.y + 4, (TANK.w - 8) * lvl, TANK.h - 8, 5);

    // ---------- davanti al vetro: riflesso, acqua che scorre, aria, brina/calore
    const F = this.front;
    F.clear();
    F.fillStyle(0xffffff, 0.35);
    F.fillRect(GLASS.x + 22, GLASS.y + 80, 12, 240);
    if (spout && this.tilt > 0.36) {
      // getto vero: dall'annaffiatoio cade nell'imbuto, poi scorre lungo il vetro fino alla terra
      const k = Phaser.Math.Clamp((this.tilt - 0.36) / 0.18, 0, 1);
      F.lineStyle(7 * k, 0x6f9fdc, 0.9);
      F.beginPath();
      F.moveTo(spout.x, spout.y);
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const u = i / steps;
        // piccola parabola: esce in avanti e cade
        const x = spout.x + (INLET.x - 4 - spout.x) * u + Math.sin(u * Math.PI) * 6;
        const y = spout.y + (INLET.y - 34 - spout.y) * u * u + Math.sin(t * 22 + u * 9) * 1.2;
        F.lineTo(x, y);
      }
      F.strokePath();
      // dentro: un filo d'acqua scende lungo la parete sinistra del vetro fino alla terra
      F.lineStyle(6 * k, 0x6f9fdc, 0.85);
      F.beginPath();
      F.moveTo(GLASS.x + 4, INLET.y);
      F.lineTo(GLASS.x + 12, INLET.y + 40);
      F.lineTo(GLASS.x + 24 + Math.sin(t * 18) * 2, SOIL_Y);
      F.strokePath();
      if (Math.random() < delta / 22) this.drops.push({ x: GLASS.x + 24 + Math.random() * 30, y: SOIL_Y - 4, vx: Math.random() * 0.15, vy: -0.22 - Math.random() * 0.2 });
      if (Math.random() < delta / 50) this.drops.push({ x: INLET.x - 4 + (Math.random() - 0.5) * 30, y: INLET.y - 36, vx: (Math.random() - 0.5) * 0.12, vy: -0.15, free: true });
    }
    this.drops = this.drops.filter((d) => {
      d.vy += delta * 0.0012;
      d.x += d.vx * delta;
      d.y += d.vy * delta;
      F.fillStyle(0x5f8fd0, 0.9);
      F.fillCircle(d.x, d.y, 3.5);
      return d.free ? d.y < INLET.y - 26 : d.y < SOIL_Y + 2;
    });
    if (s.water > 0.92) {
      // troppa acqua: trabocca dal bocchettone e cola lungo il guscio fino a terra
      F.fillStyle(0x5f8fd0, 0.6);
      F.fillEllipse(PX, BOT - 18, 460 + Math.sin(t * 2) * 20, 26);
      for (let i = 0; i < 5; i++) F.fillCircle(PX - 200 + i * 100, ((t * 170 + i * 70) % 200) + 600, 5);
      F.fillRect(INLET.x - 30, INLET.y - 30, 6, 160 + Math.sin(t * 3) * 12);
      F.fillRect(INLET.x + 14, INLET.y - 30, 6, 120 + Math.cos(t * 3) * 12);
    }
    if (s.venting && Math.random() < delta / 20) this.puffs.push({ x: FAN.x + 70 + this.fanPush * 40, y: FAN.y - 60 + Math.random() * 120, a: 1 });
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
      F.fillStyle(0xf2f8ff, a);
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
      F.lineStyle(3, 0xe2a03c, a);
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
    if (goal === "light") {
      // interruttore a levetta sulla pinza (sopra la lampada, sotto la mano)
      const W2 = this.sw;
      W2.clear();
      W2.fillStyle(0x56657b, 1);
      W2.fillRoundedRect(LAMP_SW.x - 20, LAMP_SW.y - 13, 40, 26, 8);
      W2.fillStyle(lit ? Y_ACCENT : 0xc9ced6, 1);
      W2.fillRoundedRect(lit ? LAMP_SW.x : LAMP_SW.x - 17, LAMP_SW.y - 10, 17, 20, 6);
      if (lit) {
        // la lampadina brilla
        D.fillStyle(0xfff3c4, 0.9);
        D.fillCircle(LAMP_HEAD.x - 8, LAMP_HEAD.y + 26, 18);
        D.fillStyle(0xfff3c4, 0.22 + 0.05 * Math.sin(t * 5));
        D.fillCircle(LAMP_HEAD.x - 8, LAMP_HEAD.y + 26, 48);
      }
    }
    if (goal === "temp" || step.out != null) {
      // ghiera sul fianco: scala dal blu (freddo) al rosso (caldo), indice, zigrinatura
      const a0 = -Math.PI * 0.75 - Math.PI / 2;
      for (let i = 0; i < 24; i++) {
        const u = i / 23;
        const a = a0 + u * Math.PI * 1.5;
        const col = Phaser.Display.Color.GetColor(Math.round(0x5f + (0xd0 - 0x5f) * u), Math.round(0x8f + (0x6a - 0x8f) * u), Math.round(0xd0 + (0x4f - 0xd0) * u));
        D.lineStyle(6, col, 1);
        D.lineBetween(DIAL.x + Math.cos(a) * (DIAL.r + 10), DIAL.y + Math.sin(a) * (DIAL.r + 10), DIAL.x + Math.cos(a) * (DIAL.r + 22), DIAL.y + Math.sin(a) * (DIAL.r + 22));
      }
      D.fillStyle(0x20304a, 0.25);
      D.fillCircle(DIAL.x + 4, DIAL.y + 6, DIAL.r);
      D.fillStyle(0xc9c6be, 1);
      D.fillCircle(DIAL.x, DIAL.y, DIAL.r);
      const ang = -Math.PI * 0.75 + s.knob * Math.PI * 1.5 - Math.PI / 2;
      D.lineStyle(4, 0xb2aea5, 1);
      for (let i = 0; i < 18; i++) {
        const a = ang + (i / 18) * Math.PI * 2;
        D.lineBetween(DIAL.x + Math.cos(a) * (DIAL.r - 12), DIAL.y + Math.sin(a) * (DIAL.r - 12), DIAL.x + Math.cos(a) * (DIAL.r - 2), DIAL.y + Math.sin(a) * (DIAL.r - 2));
      }
      D.fillStyle(0x24344b, 1);
      D.fillCircle(DIAL.x, DIAL.y, DIAL.r - 18);
      D.lineStyle(7, Y_ACCENT, 1);
      D.lineBetween(DIAL.x + Math.cos(ang) * 10, DIAL.y + Math.sin(ang) * 10, DIAL.x + Math.cos(ang) * (DIAL.r - 22), DIAL.y + Math.sin(ang) * (DIAL.r - 22));
    }
    D.fillStyle(0x24344b, 1);
    D.fillRoundedRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, 10);
    const ok = Bionomad.tempOk();
    this.disp.big.setText(`${s.temp.toFixed(1)}°C`).setColor(ok ? "#F4F5F7" : "#F0A08C");
    this.disp.out.setText(`FUORI ${Math.round(s.out)}°C`);
    D.fillStyle(0x8fd0a6, 1);
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
        CR.fillStyle(0x2b3a50, 0.94 * k2);
        CR.fillRoundedRect(-60 - (1 - k2) * 360, 110, 470, 760, 140);
        CR.fillCircle(170 - (1 - k2) * 360, 80, 78);
        CR.fillStyle(0x3a4b63, 0.94 * k2);
        CR.fillRoundedRect(VIEW.w - 300 + (1 - k2) * 360, 160, 470, 720, 140);
        CR.fillCircle(VIEW.w - 110 + (1 - k2) * 360, 120, 72);
        CR.fillStyle(0x0e1626, 0.28 * k2);
        CR.fillRect(0, 0, VIEW.w, VIEW.h);
      }
    }

    const pressed = goal === "water" ? Bionomad.pulse.irrPresses > this.presses0.irr : goal === "air" ? Bionomad.pulse.airPresses > this.presses0.air : false;
    // ---------- quick time event: anello che si svuota attorno all'oggetto finché non si preme
    if ((goal === "water" || goal === "air") && !pressed && this.qte) {
      const at = goal === "water" ? { x: CAN.x + 60, y: CAN.y + 50 } : { x: FAN.x, y: FAN.y };
      const left = Math.max(0, 1 - this.elapsed / this.qte);
      const pulseR = 118 + Math.sin(t * 8) * 5;
      X.lineStyle(10, 0xffffff, 0.35);
      X.strokeCircle(at.x, at.y, pulseR);
      X.lineStyle(10, left < 0.3 ? 0xb4553f : Y_ACCENT, 1);
      X.beginPath();
      X.arc(at.x, at.y, pulseR, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false);
      X.strokePath();
    }

    // ---------- completamento e tempo rimasto
    const B = this.bar;
    B.clear();
    B.fillStyle(C.c1, 1);
    B.fillRoundedRect(VIEW.w - 352, 204, 300, 8, 4);
    B.fillStyle(C.c4, 1);
    B.fillRoundedRect(VIEW.w - 352, 204, Math.max(8, 300 * progress), 8, 4);
    const limit = pressed ? null : this.qte;
    if (limit) {
      const left = Math.max(0, 1 - this.elapsed / limit);
      B.fillStyle(left < 0.3 ? 0xb4553f : Y_ACCENT, 1);
      B.fillRoundedRect(VIEW.w - 352, 216, 300 * left, 4, 2);
    }
  }
}
