// pannello AZIONE SULLA PIANTA: cosa fare, a che punto sei, e (senza pianta collegata)
// i pulsanti grandi per simularla sul tablet. Nessun testo in più.
import Phaser from "../phaser.js";
import { PlantSensors, VIAL_COLORS } from "../input/PlantSensors.js";
import { paint } from "../world/skyline.js";
import { box, button, C, ditherBand, HEX, txt, VIEW } from "./hud.js";

const W = 830;
const H = 470;
const X0 = (VIEW.w - W) / 2;
const Y0 = (VIEW.h - H) / 2;

// sansevieria nel vaso bianco, retinata come il resto: foglie a spada con le bande
export function plantArt(scene, key = "plant_big", k = 1) {
  if (scene.textures.exists(key)) return;
  const c = paint(240 * k, 300 * k, k, ({ X, G }) => {
    // foglie: [base x, altezza, inclinazione, larghezza, tono]
    const leaves = [[96, 230, -0.32, 15, 0.5], [104, 268, -0.12, 18, 0.62], [120, 290, 0.02, 20, 0.7], [134, 250, 0.16, 17, 0.58], [146, 210, 0.36, 14, 0.5], [112, 180, -0.22, 13, 0.78], [128, 196, 0.24, 13, 0.8]];
    leaves.forEach(([bx, h, tilt, w, tone], i) => {
      const by = 210;
      const tx = bx + Math.sin(tilt) * h;
      const ty = by - Math.cos(tilt) * h;
      const nx = Math.cos(tilt);
      const ny = Math.sin(tilt);
      X.save();
      X.beginPath();
      X.moveTo(bx - (w / 2) * nx, by - (w / 2) * ny);
      X.quadraticCurveTo(bx - w * 0.7 * nx + (tx - bx) * 0.5, by - w * 0.7 * ny + (ty - by) * 0.5, tx, ty);
      X.quadraticCurveTo(bx + w * 0.7 * nx + (tx - bx) * 0.5, by + w * 0.7 * ny + (ty - by) * 0.5, bx + (w / 2) * nx, by + (w / 2) * ny);
      X.closePath();
      const g = X.createLinearGradient(bx - w, 0, bx + w, 0);
      g.addColorStop(0, G(tone + 0.15));
      g.addColorStop(1, G(tone - 0.2));
      X.fillStyle = g;
      X.fill();
      X.clip();
      // bande ondulate scure, tipiche della sansevieria
      X.strokeStyle = G(tone - 0.35);
      X.lineWidth = 2;
      for (let k = 12; k < h; k += 11 + (i % 3)) {
        const cx = bx + Math.sin(tilt) * k;
        const cy = by - Math.cos(tilt) * k;
        X.beginPath();
        for (let t = -w; t <= w; t += 3) {
          const px = cx + t * nx;
          const py = cy + t * ny + Math.sin(t * 0.9 + k) * 1.6;
          if (t === -w) X.moveTo(px, py);
          else X.lineTo(px, py);
        }
        X.stroke();
      }
      X.restore();
    });
    // vaso cilindrico bianco con il bordo
    const pg = X.createLinearGradient(66, 0, 174, 0);
    pg.addColorStop(0, G(0.98));
    pg.addColorStop(0.6, G(0.82));
    pg.addColorStop(1, G(0.55));
    X.fillStyle = pg;
    X.fillRect(70, 206, 100, 90);
    X.fillStyle = G(0.7);
    X.fillRect(66, 200, 108, 8);
    X.fillStyle = G(0.12);
    X.fillRect(72, 202, 96, 4);
    X.fillStyle = G(0.6);
    X.fillRect(70, 278, 100, 2);
  }, { seedValue: 3, cell: 1 });
  scene.textures.addCanvas(key, c);
}

const SENSOR_HINT = {
  light: (s) => (s.below !== undefined ? "COPRI LA PIANTA CON LA MANO" : "PUNTA LA TORCIA SULLA PIANTA"),
  temperature: (s) => (s.dropBy !== undefined ? `RAFFREDDA DI ${s.dropBy} °C` : `SCALDA DI ${s.riseBy} °C`),
  irrigation: (s) => (s.on ? "APRI LA LEVA DELL'ACQUA" : "CHIUDI LA LEVA DELL'ACQUA"),
  vials: () => "INSERISCI LE 2 FIALE INDICATE",
  touch: () => "TOCCA UNA FOGLIA"
};

export class PlantPanel {
  constructor(scene) {
    this.scene = scene;
    this.c = null;
    this.sim = { C: false, I: false, H: false, F: false, Q: false, E: false };
    plantArt(scene);
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys("C,I,H,F,Q,E,R,ONE,TWO,THREE,ZERO");
    kb.on("keydown-R", () => this.open && this.toggleLever());
    kb.on("keydown-ONE", () => this.open && this.vial(1));
    kb.on("keydown-TWO", () => this.open && this.vial(2));
    kb.on("keydown-THREE", () => this.open && this.vial(3));
    kb.on("keydown-ZERO", () => this.open && PlantSensors.removeVial());
  }

  get open() {
    return Boolean(this.c);
  }

  show(step, { timeoutMs = 0, emergency = false } = {}) {
    const scene = this.scene;
    this.close();
    this.step = step;
    this.progress = 0;
    this.elapsed = 0;
    this.timeoutMs = timeoutMs;
    this.baseTemperature = PlantSensors.state.temperature;
    this.floodMs = 0;
    this.overheated = false;
    this.lastSlots = [...PlantSensors.state.slots];
    const c = scene.add.container(0, 0).setDepth(1800).setScrollFactor(0);
    const panelBg = ditherBand(scene, X0, Y0, W, H, { from: 0.0, to: 0.3, vertical: true });
    const bg = box(scene, X0, Y0, W, H, { alpha: 0, border: emergency ? C.c4 : C.c3, bw: emergency ? 3 : 2 });
    const title = txt(scene, X0 + 32, Y0 + 26, step.text.replace(/^[+!]\s*/, ""), { size: 34, weight: "500", wrap: W - 64 });
    const hint = txt(scene, X0 + 32, Y0 + 26 + title.height + 10, SENSOR_HINT[step.sensor]?.(step) ?? "", { size: 22, color: HEX.c3, wrap: W - 64 });
    // la pianta sta nella sua colonna a sinistra, lontano dai numeri
    const plant = scene.add.image(X0 + 30, Y0 + H - 20, "plant_big").setOrigin(0, 1);
    this.fx = scene.add.graphics();
    // colonna destra: valore (1-2 righe), poi barra del sensore, poi completamento, poi pulsanti
    this.value = txt(scene, X0 + 300, Y0 + 132, "", { size: 26, wrap: W - 340 });
    this.gauge = scene.add.graphics();
    this.doneLabel = txt(scene, X0 + 300, Y0 + 270, "COMPLETAMENTO", { size: 18, color: HEX.c3 });
    this.timer = scene.add.graphics();
    c.add([panelBg, bg, title, hint, plant, this.fx, this.value, this.gauge, this.doneLabel, this.timer]);
    this.plantImg = plant;
    this.box = { plantX: X0 + 40, plantW: plant.displayWidth, plantTop: Y0 + H - 30 - plant.displayHeight };
    // pulsanti per simulare la pianta: solo per i sensori che l'Arduino non manda
    this.simButtons = [];
    const KEY = { light: "L", temperature: "T", vials: "P", irrigation: "W", touch: "TOUCH" }[step.sensor];
    if (!KEY || PlantSensors.simulated(KEY)) this.makeSimButtons(c, step);
    c.setAlpha(0);
    scene.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.c = c;
  }

  makeSimButtons(c, step) {
    const scene = this.scene;
    const y = Y0 + H - 100;
    const x = X0 + 300;
    const hold = (label, key) => {
      const b = button(scene, x, y, 360, 80, label, null, { size: 26, depth: 1850 });
      const zone = b.c.list[b.c.list.length - 1];
      zone.on("pointerdown", () => (this.sim[key] = true));
      zone.on("pointerup", () => (this.sim[key] = false));
      zone.on("pointerout", () => (this.sim[key] = false));
      return b;
    };
    if (step.sensor === "light") this.simButtons.push(hold(step.below !== undefined ? "TIENI: COPRI" : "TIENI: TORCIA", step.below !== undefined ? "C" : "I"));
    if (step.sensor === "temperature") this.simButtons.push(hold(step.dropBy !== undefined ? "TIENI: RAFFREDDA" : "TIENI: SCALDA", step.dropBy !== undefined ? "F" : "H"));
    if (step.sensor === "touch") this.simButtons.push(hold("TIENI: TOCCA", "Q"));
    if (step.sensor === "irrigation") this.simButtons.push(button(scene, x, y, 360, 80, "LEVA ACQUA", () => this.toggleLever(), { size: 26, depth: 1850 }));
    if (step.sensor === "vials") {
      [1, 2, 3].forEach((v, i) => this.simButtons.push(button(scene, x + i * 124, y, 112, 76, VIAL_COLORS[v].name, () => this.vial(v), { size: 20, depth: 1850 })));
      this.simButtons.push(button(scene, x + 372, y, 112, 76, "TOGLI", () => PlantSensors.removeVial(), { size: 20, depth: 1850 }));
    }
    this.simButtons.forEach((b) => c.add(b.c));
  }

  toggleLever() {
    if (!PlantSensors.simulated("W")) return;
    PlantSensors.state.irrigation = !PlantSensors.state.irrigation;
  }

  vial(v) {
    PlantSensors.insertVial(v, this.step?.required);
  }

  // simulazione dei sensori (tastiera o pulsanti a schermo)
  simulate(delta, baseTemperature) {
    const k = this.keys;
    const down = (key) => ({ isDown: this.sim[key] || k[key].isDown });
    PlantSensors.simulate({ C: down("C"), I: down("I"), H: down("H"), F: down("F"), Q: down("Q"), E: down("E") }, delta, baseTemperature);
  }

  // ritorna { satisfied, done, timedOut, negligence }
  update(delta) {
    if (!this.c) return { satisfied: false, done: false, timedOut: false };
    const step = this.step;
    const s = PlantSensors.state;
    let satisfied = false;
    let fill = 0;
    let mark = null;
    let negligence = null;
    const fx = this.fx;
    fx.clear();
    const { plantX, plantW, plantTop } = this.box;

    if (step.sensor === "light") {
      fill = s.light;
      satisfied = step.below !== undefined ? s.light < step.below : s.light > step.above;
      mark = step.below ?? step.above;
      this.value.setText(`LUCE ${Math.round(s.light * 100)}%   ${step.below !== undefined ? "SOTTO" : "SOPRA"} ${Math.round(mark * 100)}%`);
      if (step.below !== undefined) {
        fx.fillStyle(C.c0, Math.min(0.85, (1 - s.light) * 0.9));
        fx.fillRect(plantX, plantTop, plantW, 200);
      } else {
        fx.fillStyle(C.c4, s.light * 0.25);
        fx.fillRect(plantX, plantTop, plantW, 300);
      }
    } else if (step.sensor === "temperature") {
      const cooling = step.dropBy !== undefined;
      const d = cooling ? -step.dropBy : step.riseBy;
      const target = this.baseTemperature + d;
      satisfied = cooling ? s.temperature <= target : s.temperature >= target;
      const range = Math.abs(d) + 8;
      const lowest = cooling ? target - 4 : this.baseTemperature - 2;
      fill = (s.temperature - lowest) / range;
      mark = (target - lowest) / range;
      this.value.setText(`${s.temperature.toFixed(1)} °C  →  ${target.toFixed(1)} °C`);
      if (step.maxOver && !cooling && s.temperature > target + step.maxOver && !this.overheated) {
        this.overheated = true;
        negligence = "overheat";
      }
      if (step.maxOver && !cooling && s.temperature < target + step.maxOver - 1) this.overheated = false;
    } else if (step.sensor === "vials") {
      const required = step.required ?? [1, 2];
      const remaining = [...required];
      const matched = s.slots.map((v) => {
        if (!v) return false;
        const i = remaining.indexOf(v);
        if (i === -1) return false;
        remaining.splice(i, 1);
        return true;
      });
      const correct = matched.filter(Boolean).length;
      satisfied = correct === required.length;
      fill = correct / required.length;
      const slotTxt = s.slots.map((v, i) => (v ? `${VIAL_COLORS[v].name}${matched[i] ? " ✓" : " ✗"}` : "—")).join("  |  ");
      this.value.setText(`SERVONO: ${required.map((c) => VIAL_COLORS[c].name).join(" + ")}\nPOZZETTO: ${slotTxt}`);
      s.slots.forEach((v, i) => {
        if (v && v !== this.lastSlots[i] && !matched[i]) negligence = "wrongVial";
      });
      this.lastSlots = [...s.slots];
    } else if (step.sensor === "irrigation") {
      satisfied = s.irrigation === step.on;
      fill = s.irrigation ? 1 : 0;
      if (step.on === false && s.irrigation) {
        this.floodMs += delta;
        if (this.floodMs > (step.floodMs ?? 4000)) {
          this.floodMs = 0;
          negligence = "flood";
        }
      }
      this.value.setText(`LEVA ${s.irrigation ? "APERTA" : "CHIUSA"}`);
      if (s.irrigation) {
        const t = this.scene.time.now;
        fx.fillStyle(C.c4, 0.9);
        for (let i = 0; i < 7; i += 1) fx.fillRect(plantX + 30 + i * 26, plantTop + ((t / 5 + i * 37) % 180), 4, 12);
      }
    } else if (step.sensor === "touch") {
      satisfied = s.touchLeft || s.touchRight;
      fill = satisfied ? 1 : 0;
      this.value.setText(satisfied ? "FOGLIA TOCCATA" : "IN ATTESA");
    }

    // barra del sensore con la soglia, poi la barra di completamento
    const gx = X0 + 300;
    const gw = W - 340;
    const g = this.gauge;
    g.clear();
    // la barra del sensore sta sempre sotto il testo del valore, mai sopra
    const gy = Math.max(Y0 + 190, Math.round(this.value.y + this.value.height + 18));
    const dy = gy + 44;
    this.doneLabel.setY(dy);
    const py = dy + 30;
    g.lineStyle(2, C.c3, 1);
    g.strokeRect(gx, gy, gw, 26);
    g.fillStyle(satisfied ? C.c4 : C.c2, 1);
    g.fillRect(gx + 4, gy + 4, Math.round((gw - 8) * Phaser.Math.Clamp(fill, 0, 1)), 18);
    if (mark !== null) {
      g.fillStyle(C.c4, 1);
      g.fillRect(gx + 4 + Math.round((gw - 8) * Phaser.Math.Clamp(mark, 0, 1)) - 2, gy - 6, 4, 38);
    }
    const hold = step.holdMs ?? 1000;
    this.progress = Phaser.Math.Clamp(this.progress + (satisfied ? delta : -delta * 0.6), 0, hold);
    g.lineStyle(2, C.c3, 1);
    g.strokeRect(gx, py, gw, 18);
    g.fillStyle(C.c4, 1);
    g.fillRect(gx + 3, py + 3, Math.round((gw - 6) * (this.progress / hold)), 12);

    this.elapsed += delta;
    this.timer.clear();
    if (this.timeoutMs) {
      const left = Math.max(0, 1 - this.elapsed / this.timeoutMs);
      this.timer.fillStyle(C.c4, 1);
      this.timer.fillRect(X0, Y0 + H - 6, Math.round(W * left), 6);
    }
    return { satisfied, done: this.progress >= hold, timedOut: this.timeoutMs > 0 && this.elapsed >= this.timeoutMs, negligence };
  }

  close() {
    if (!this.c) return;
    const c = this.c;
    this.c = null;
    Object.keys(this.sim).forEach((k) => (this.sim[k] = false));
    c.destroy();
  }
}
