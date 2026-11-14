// icone degli oggetti da usare, disegnate in scala di grigi e convertite nel retino
// della palette BIODOM (stesso processo della skyline). Area di disegno 64x64.
import { paint } from "../world/skyline.js";

const S = 64;

const DRAW = {
  // annaffiatoio: corpo, beccuccio lungo, manico ad arco
  can({ X, G }) {
    X.fillStyle = G(0.85);
    X.fillRect(16, 26, 26, 26);
    X.fillStyle = G(0.6);
    X.fillRect(16, 46, 26, 6);
    X.strokeStyle = G(0.85);
    X.lineWidth = 4;
    X.beginPath();
    X.moveTo(42, 34);
    X.lineTo(56, 20);
    X.stroke();
    X.fillStyle = G(1);
    X.fillRect(53, 15, 8, 6);
    X.lineWidth = 3;
    X.beginPath();
    X.arc(29, 26, 10, Math.PI, 0);
    X.stroke();
    X.fillStyle = G(0.95);
    for (let i = 0; i < 3; i++) X.fillRect(57 + (i % 2) * 2, 26 + i * 7, 2, 4);
  },
  // hub di casa: serbatoio con la pianta e il livello
  hub({ X, G }) {
    X.fillStyle = G(0.75);
    X.fillRect(18, 18, 28, 36);
    X.fillStyle = G(0.4);
    X.fillRect(22, 22, 20, 22);
    X.fillStyle = G(0.95);
    X.fillRect(22, 34, 20, 10);
    X.fillStyle = G(1);
    for (let i = 0; i < 3; i++) X.fillRect(25 + i * 6, 10 + (i % 2) * 4, 3, 12);
    X.fillStyle = G(0.55);
    X.fillRect(14, 54, 36, 4);
  },
  // porta con maniglia e freccia d'uscita
  door({ X, G }) {
    X.fillStyle = G(0.7);
    X.fillRect(18, 8, 26, 50);
    X.fillStyle = G(0.35);
    X.fillRect(22, 12, 18, 18);
    X.fillRect(22, 34, 18, 20);
    X.fillStyle = G(1);
    X.fillRect(36, 34, 4, 4);
    X.beginPath();
    X.moveTo(48, 26);
    X.lineTo(58, 33);
    X.lineTo(48, 40);
    X.fill();
  },
  // condizionatore: split a parete con alette e flusso
  ac({ X, G }) {
    X.fillStyle = G(0.85);
    X.fillRect(8, 16, 48, 20);
    X.fillStyle = G(0.4);
    X.fillRect(12, 30, 40, 3);
    X.fillStyle = G(1);
    X.fillRect(46, 20, 5, 3);
    X.strokeStyle = G(0.9);
    X.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      X.beginPath();
      X.moveTo(16 + i * 10, 40);
      X.quadraticCurveTo(12 + i * 10, 48, 16 + i * 10, 56);
      X.stroke();
    }
  },
  // furgoncino del cibo con il bancone aperto
  counter({ X, G }) {
    X.fillStyle = G(0.8);
    X.fillRect(6, 20, 42, 28);
    X.fillRect(48, 28, 12, 20);
    X.fillStyle = G(0.3);
    X.fillRect(12, 26, 26, 12);
    X.fillStyle = G(1);
    X.fillRect(8, 18, 40, 4);
    X.fillRect(51, 31, 6, 7);
    X.fillStyle = G(0.15);
    X.beginPath();
    X.arc(16, 50, 6, 0, 7);
    X.arc(48, 50, 6, 0, 7);
    X.fill();
    X.fillStyle = G(0.7);
    X.beginPath();
    X.arc(16, 50, 2, 0, 7);
    X.arc(48, 50, 2, 0, 7);
    X.fill();
  },
  // colonnina di ricarica con cavo e fulmine
  charger({ X, G }) {
    X.fillStyle = G(0.8);
    X.fillRect(20, 8, 22, 50);
    X.fillStyle = G(0.3);
    X.fillRect(24, 13, 14, 10);
    X.fillStyle = G(1);
    X.beginPath();
    X.moveTo(33, 28);
    X.lineTo(26, 40);
    X.lineTo(31, 40);
    X.lineTo(28, 50);
    X.lineTo(36, 37);
    X.lineTo(31, 37);
    X.closePath();
    X.fill();
    X.strokeStyle = G(0.6);
    X.lineWidth = 3;
    X.beginPath();
    X.moveTo(42, 30);
    X.quadraticCurveTo(56, 34, 52, 56);
    X.stroke();
  },
  // panchina
  bench({ X, G }) {
    X.fillStyle = G(0.85);
    X.fillRect(8, 22, 48, 6);
    X.fillRect(8, 32, 48, 6);
    X.fillStyle = G(0.55);
    X.fillRect(6, 40, 52, 5);
    X.fillStyle = G(0.35);
    X.fillRect(12, 45, 5, 13);
    X.fillRect(47, 45, 5, 13);
  },
  // persona (busto) con fumetto
  man({ X, G }) {
    X.fillStyle = G(0.8);
    X.beginPath();
    X.arc(26, 22, 10, 0, 7);
    X.fill();
    X.beginPath();
    X.moveTo(10, 58);
    X.quadraticCurveTo(12, 36, 26, 36);
    X.quadraticCurveTo(40, 36, 42, 58);
    X.fill();
    X.fillStyle = G(1);
    X.fillRect(42, 8, 18, 12);
    X.beginPath();
    X.moveTo(44, 20);
    X.lineTo(42, 26);
    X.lineTo(50, 20);
    X.fill();
    X.fillStyle = G(0.3);
    for (let i = 0; i < 3; i++) X.fillRect(45 + i * 5, 13, 3, 3);
  },
  // casa
  home({ X, G }) {
    X.fillStyle = G(0.95);
    X.beginPath();
    X.moveTo(8, 32);
    X.lineTo(32, 10);
    X.lineTo(56, 32);
    X.closePath();
    X.fill();
    X.fillStyle = G(0.75);
    X.fillRect(14, 32, 36, 26);
    X.fillStyle = G(0.3);
    X.fillRect(27, 42, 10, 16);
    X.fillStyle = G(1);
    X.fillRect(17, 37, 7, 7);
    X.fillRect(40, 37, 7, 7);
  },
  // ufficio: palazzo a finestre
  office({ X, G }) {
    X.fillStyle = G(0.8);
    X.fillRect(14, 6, 36, 54);
    X.fillStyle = G(0.3);
    for (let y = 11; y < 50; y += 9) for (let x = 18; x < 46; x += 9) X.fillRect(x, y, 5, 5);
    X.fillStyle = G(1);
    X.fillRect(27, 50, 10, 10);
    X.fillRect(36, 20, 5, 5);
  },
  // autobus con fermata
  bus({ X, G }) {
    X.fillStyle = G(0.85);
    X.fillRect(6, 16, 46, 34);
    X.fillStyle = G(0.3);
    for (let i = 0; i < 4; i++) X.fillRect(9 + i * 10, 21, 8, 11);
    X.fillStyle = G(1);
    X.fillRect(46, 40, 5, 4);
    X.fillStyle = G(0.15);
    X.beginPath();
    X.arc(16, 51, 5, 0, 7);
    X.arc(42, 51, 5, 0, 7);
    X.fill();
    X.fillStyle = G(0.7);
    X.fillRect(56, 12, 3, 46);
    X.fillStyle = G(1);
    X.fillRect(53, 8, 10, 8);
  },
  // bandierina d'arrivo
  flag({ X, G }) {
    X.fillStyle = G(0.6);
    X.fillRect(20, 8, 4, 50);
    X.fillStyle = G(1);
    X.beginPath();
    X.moveTo(24, 10);
    X.lineTo(50, 18);
    X.lineTo(24, 28);
    X.fill();
    X.fillStyle = G(0.5);
    X.fillRect(12, 56, 22, 4);
  }
};

// alias: luoghi e nomi usati dalle scene
const ALIAS = { busstop: "bus", foodtruck: "counter", street: "flag", arrivo: "flag" };

export function iconKey(scene, name) {
  const id = DRAW[name] ? name : ALIAS[name] ?? "flag";
  const key = `icon_${id}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paint(S * 1.5, S * 1.5, 1.5, DRAW[id], { cell: 1, seedValue: 3 }));
  return key;
}
