import { PlantSensors } from "../input/PlantSensors.js";
import { bodyText, COLORS, drawPanel, dropShadow, hex, pixelText } from "./theme.js";

// pannello "AZIONE SULLA PIANTA"
const W = 400;
const H = 270;

export class PlantPanel {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
  }

  get open() {
    return Boolean(this.container);
  }

  show(step, { timeoutMs = 0, emergency = false } = {}) {
    const scene = this.scene;
    this.close(true);
    this.step = step;
    this.progress = 0;
    this.elapsed = 0;
    this.timeoutMs = timeoutMs;
    this.baseTemperature = PlantSensors.state.temperature;

    const { width } = scene.scale;
    const x = Math.round(width / 2 - W / 2);
    const y = 100;
    this.box = { x, y };
    const c = scene.add.container(0, 0).setDepth(2000);
    const g = scene.add.graphics();
    dropShadow(g, x, y, W, H, 8);
    drawPanel(g, x, y, W, H, { fill: COLORS.paper, border: emergency ? COLORS.red : COLORS.ink });
    g.fillStyle(emergency ? COLORS.red : COLORS.ink, 1);
    g.fillRect(x, y, W, 28);
    const head = pixelText(scene, x + 12, y + 10, emergency ? "EMERGENZA · CURA" : "AZIONE SULLA PIANTA", { size: 8, color: COLORS.paper });
    const status = pixelText(scene, x + W - 12, y + 10, PlantSensors.state.connected ? "ELEGOO COLLEGATA" : "SIMULAZIONE", {
      size: 8,
      color: PlantSensors.state.connected ? 0x9fd4b0 : COLORS.steelLight,
      origin: [1, 0]
    });
    const title = pixelText(scene, x + 16, y + 42, step.text, { size: 16, fit: W - 32 });

    // illustrazione della pianta con l'effetto dell'azione
    const artBg = drawPanel(scene.add.graphics(), x + 16, y + 68, 120, 132, { fill: COLORS.bg, border: COLORS.panelLight });
    this.plant = scene.add.image(x + 76, y + 192, "plant_tall").setOrigin(0.5, 1).setScale(5);
    this.fx = scene.add.graphics();

    // indicatore del sensore
    this.valueLabel = bodyText(scene, x + 152, y + 70, "", { size: 22, color: COLORS.ink, fit: W - 168 });
    this.gauge = scene.add.graphics();
    this.progressLabel = pixelText(scene, x + 152, y + 128, "COMPLETAMENTO", { size: 8, color: COLORS.steel });
    this.progressBar = scene.add.graphics();
    const hint = bodyText(scene, x + 152, y + 160, step.hint, { size: 18, color: COLORS.steel, wrap: W - 168, lineSpacing: -4 });

    const keyHint = PlantSensors.state.connected
      ? "Usa la pianta vera"
      : step.sensor === "vials"
        ? `Tastiera: premi ${step.key} per ogni fiala`
        : `Tastiera: tieni premuto ${step.key}`;
    const keyLabel = bodyText(scene, x + 16, y + H - 30, keyHint, { size: 20, color: COLORS.red, fit: W - 32 });
    this.timerBar = scene.add.graphics();

    c.add([g, head, status, title, artBg, this.plant, this.fx, this.valueLabel, this.gauge, this.progressLabel, this.progressBar, hint, keyLabel, this.timerBar]);
    c.setAlpha(0).setScale(0.96);
    scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 220, ease: "Back.easeOut" });
    scene.tweens.add({ targets: this.plant, scaleY: 5.25, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.container = c;
  }

  // ritorna { satisfied, done, timedOut }
  update(delta) {
    if (!this.container) return { satisfied: false, done: false, timedOut: false };
    const step = this.step;
    const s = PlantSensors.state;
    const { x, y } = this.box;
    const gx = x + 152;
    const gy = y + 98;
    const gw = W - 168;
    let satisfied = false;
    let fill = 0;
    let marker = null;

    this.fx.clear();
    if (step.sensor === "light") {
      fill = s.light;
      satisfied = step.below !== undefined ? s.light < step.below : s.light > step.above;
      marker = step.below ?? step.above;
      this.valueLabel.setText(`LUCE ${Math.round(s.light * 100)}%  ${step.below !== undefined ? "<" : ">"} ${Math.round(marker * 100)}%`);
      if (step.below !== undefined) {
        // mano che copre la pianta
        this.fx.fillStyle(0xe8dccd, Math.min(1, (1 - s.light) * 1.1));
        this.fx.fillRect(x + 36, y + 84, 80, 56);
        this.fx.fillRect(x + 40, y + 76, 12, 10);
        this.fx.fillRect(x + 58, y + 74, 12, 10);
        this.fx.fillRect(x + 76, y + 74, 12, 10);
        this.fx.fillRect(x + 94, y + 76, 12, 10);
      } else {
        this.fx.fillStyle(0xe8c66a, s.light * 0.6);
        this.fx.fillRect(x + 20, y + 72, 112, 124);
      }
    } else if (step.sensor === "temperature") {
      const target = this.baseTemperature + step.riseBy;
      satisfied = s.temperature >= target;
      fill = (s.temperature - (this.baseTemperature - 2)) / (step.riseBy + 6);
      marker = (target - (this.baseTemperature - 2)) / (step.riseBy + 6);
      this.valueLabel.setText(`TEMP ${s.temperature.toFixed(1)}°C → ${target.toFixed(1)}°C`);
      const warm = Math.max(0, Math.min(1, (s.temperature - this.baseTemperature) / step.riseBy));
      this.fx.fillStyle(COLORS.red, warm * 0.35);
      this.fx.fillRect(x + 20, y + 72, 112, 124);
      if (warm < 0.3) {
        // brina
        this.fx.fillStyle(COLORS.paper, 1 - warm * 3);
        [[34, 90], [96, 84], [60, 120], [110, 132], [44, 150]].forEach(([dx, dy]) => this.fx.fillRect(x + dx, y + dy, 6, 6));
      }
    } else if (step.sensor === "vials") {
      satisfied = s.vials >= step.atLeast;
      fill = s.vials / step.atLeast;
      this.valueLabel.setText(`FIALE ${s.vials}/${step.atLeast}`);
      // punti indicati sul vaso
      [x + 56, x + 96].forEach((vx, i) => {
        const inserted = i < s.vials;
        this.fx.fillStyle(inserted ? COLORS.ink : COLORS.red, 1);
        if (inserted) {
          this.fx.fillRect(vx - 3, y + 128, 6, 26);
          this.fx.fillStyle(0x7e9c8c, 1);
          this.fx.fillRect(vx - 3, y + 128, 6, 8);
        } else {
          this.fx.fillRect(vx - 6, y + 150, 12, 3);
          this.fx.fillRect(vx - 1, y + 144, 3, 14);
        }
      });
    } else if (step.sensor === "touch") {
      satisfied = s.touchLeft || s.touchRight;
      fill = satisfied ? 1 : 0;
      this.valueLabel.setText(satisfied ? "FOGLIA TOCCATA" : "TOCCA UNA FOGLIA");
      if (satisfied) {
        this.fx.fillStyle(0xe8dccd, 1);
        this.fx.fillRect(s.touchLeft ? x + 30 : x + 100, y + 104, 16, 10);
      }
    }

    // barra del sensore con la soglia
    this.gauge.clear();
    drawPanel(this.gauge, gx, gy, gw, 18, { fill: COLORS.bg, border: COLORS.ink });
    this.gauge.fillStyle(satisfied ? COLORS.ink : COLORS.steel, 1);
    this.gauge.fillRect(gx + 4, gy + 4, Math.round((gw - 8) * Math.max(0, Math.min(1, fill))), 10);
    if (marker !== null) {
      this.gauge.fillStyle(COLORS.red, 1);
      this.gauge.fillRect(gx + 4 + Math.round((gw - 8) * Math.max(0, Math.min(1, marker))) - 1, gy - 4, 3, 26);
    }

    const hold = step.holdMs ?? 1000;
    this.progress = Math.max(0, Math.min(hold, this.progress + (satisfied ? delta : -delta * 0.6)));
    this.progressBar.clear();
    drawPanel(this.progressBar, gx, y + 140, gw, 14, { fill: COLORS.bg, border: COLORS.ink });
    this.progressBar.fillStyle(0x5c7a6b, 1);
    this.progressBar.fillRect(gx + 3, y + 143, Math.round((gw - 6) * (this.progress / hold)), 8);
    this.progressLabel.setColor(hex(satisfied ? COLORS.ink : COLORS.steel));

    this.elapsed += delta;
    if (this.timeoutMs) {
      const left = Math.max(0, 1 - this.elapsed / this.timeoutMs);
      this.timerBar.clear();
      this.timerBar.fillStyle(COLORS.red, 1);
      this.timerBar.fillRect(x, y + H - 6, Math.round(W * left), 6);
    }

    return { satisfied, done: this.progress >= hold, timedOut: this.timeoutMs > 0 && this.elapsed >= this.timeoutMs };
  }

  close(instant = false) {
    const c = this.container;
    if (!c) return;
    this.container = null;
    if (instant) {
      c.destroy();
      return;
    }
    this.scene.tweens.add({ targets: c, alpha: 0, scale: 0.96, duration: 180, onComplete: () => c.destroy() });
  }
}
