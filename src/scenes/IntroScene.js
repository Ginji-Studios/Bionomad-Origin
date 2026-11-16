import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { currentEvent, dayTime, getRun, cityZone } from "../systems/RunManager.js";
import { buildSkyline, paint, setDayMode } from "../world/skyline.js";
import { buildPlace } from "../art/places.js";
import { Walker } from "../entities/Walker.js";
import { K, operatorKey } from "../art/people.js";
import { packGesture } from "../entities/packGesture.js";
import { doorway } from "../ui/door.js";
import { brackets, button, C, canvasImage, ditherBand, ditherTitle, fadeIn, goTo, HEX, skylineLayers, txt, VIEW } from "../ui/hud.js";
import { plantNav } from "../input/plantNav.js";

const FEET = 764;

// scena iniziale: a casa l'operatore indossa il BIONOMAD, arriva il comunicato,
// poi esce dalla porta
export class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    this._leaving = false;
    this.ready = false;
    fadeIn(this, 600);
    setAmbient(null);
    this.indoor = true;
    const origin = getOrigin(this.registry);
    const sky = skylineLayers(this, origin.id, buildSkyline, { time: dayTime(getRun(this.registry)), zone: cityZone(getRun(this.registry)) });
    this.cameras.main.setScroll(Math.round((sky.worldW - VIEW.w) * 0.1), 0);
    const place = buildPlace("home", origin.id);
    canvasImage(this, `place_home_${origin.id}`, place.canvas).setScrollFactor(0);
    this.points = place.points;
    this.op = this.registry.get("operator") ?? "a";
    brackets(this);

    // l'operatore entra in scena senza zaino e va verso l'hub
    this.city = origin.id;
    this.walker = new Walker(this, operatorKey(this, this.op, this.city, { bare: true }), 120, FEET, { sound: true, indoor: true, speed: 220 });
    [this.walker.img, this.walker.shadow].forEach((o) => o.setScrollFactor(0));
    this.walker.pack = false;
    this.walkTo = this.points.hub - 90;
    this.phase = "walk";
    this.input.keyboard.on("keydown-ENTER", () => this.go());
    this.input.keyboard.on("keydown-SPACE", () => this.go());
    // pianta: destra = INIZIA (verso la porta)
    plantNav(this, { right: () => this.go() });
    // tocco per saltare la scena
    this.skip = txt(this, VIEW.w - 40, VIEW.h - 40, "TOCCA PER SALTARE", { size: 16, color: HEX.c3, origin: [1, 1] }).setScrollFactor(0);
    this.input.once("pointerup", () => this.phase === "walk" && this.wearPack());
  }

  update(time, delta) {
    if (!this.walker) return;
    if (this.phase === "walk") {
      this.walker.update(1, delta);
      if (this.walker.x >= this.walkTo) this.wearPack();
    } else if (this.phase === "out") {
      this.walker.update(1, delta);
      // arrivato davanti alla porta: si apre e lui esce
      if (this.walker.x >= this.points.door - 70) this.exitDoor();
    } else if (this.phase === "exit") {
      this.walker.update(1, delta);
    } else {
      this.walker.update(0, delta);
    }
  }

  // aggancio dello zaino: l'operatore lo prende dall'hub, lo porta davanti a sé,
  // lo passa sopra la spalla e lo indossa; la pianta si accende e rilascia ossigeno
  wearPack() {
    if (this.phase !== "walk") return;
    this.phase = "wear";
    this.skip.destroy();
    this.walker.frozen = true;
    this.walker.update(0, 16);
    const img = this.walker.img;
    const k = img.scaleX;
    // lo zaino è in carica in cima all'hub
    const hub = [this.points.hub - 14 * k, FEET - 250];
    packGesture(this, this.walker, {
      bareKey: this.walker.key,
      packedKey: operatorKey(this, this.op, this.city),
      hub,
      mode: "wear",
      onAttach: () => this.walker.bubble?.(10),
      onDone: () => this.time.delayedCall(600, () => this.showNotice())
    });
  }

  // comunicato ufficiale al centro, come una scheda del fascicolo BIODOM.
  // Si apre come un terminale: una riga che si allarga, il pannello che si spalanca,
  // la testata che si stende, il titolo che si scrive con un cursore, il testo battuto a macchina.
  showNotice() {
    this.phase = "notice";
    Sfx.announce();
    const w = 860;
    const h = 470;
    const x = (VIEW.w - w) / 2;
    const y = (VIEW.h - h) / 2 - 20;
    const cxm = x + w / 2;
    const cym = y + h / 2;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    const dim = this.add.rectangle(0, 0, VIEW.w, VIEW.h, C.c0, 0.6).setOrigin(0).setAlpha(0);
    const shell = this.add.graphics();
    const band = ditherBand(this, x, y, w, 64, { from: 0.06, to: 0.42 }).setVisible(false);
    const hatch = this.add.graphics().setVisible(false);
    for (let i = -20; i < w; i += 18) {
      hatch.fillStyle(C.c2, 1);
      hatch.fillTriangle(x + i, y + h - 10, x + i + 9, y + h - 10, x + i + 18, y + h - 1);
      hatch.fillTriangle(x + i, y + h - 10, x + i + 9, y + h - 1, x + i + 18, y + h - 1);
    }
    const lines = this.add.graphics().setVisible(false);
    lines.lineStyle(2, C.c3, 1);
    lines.lineBetween(x, y + 64, x + w, y + 64);
    lines.lineBetween(x, y + h - 112, x + w, y + h - 112);
    lines.fillStyle(C.c4, 1);
    [[x, y + 64], [x + w, y + 64], [x, y + h - 112], [x + w, y + h - 112]].forEach(([nx, ny]) => lines.fillRect(nx - 3, ny - 3, 6, 6));
    const warn = this.add.graphics().setVisible(false);
    warn.fillStyle(C.c4, 1);
    warn.fillTriangle(x + 30, y + 48, x + 50, y + 14, x + 70, y + 48);
    warn.fillStyle(C.c0, 1);
    warn.fillRect(x + 48, y + 25, 4, 12);
    warn.fillRect(x + 48, y + 40, 4, 4);
    const HEAD = "COMUNICATO UFFICIALE · PPR-01";
    const BODY = "Il tuo BIONOMAD ti dà ossigeno solo se la pianta sta bene.";
    const GOAL = "▶  COMPLETA LE TASK DELLA GIORNATA";
    const head = txt(this, x + 88, y + 32, "", { size: 20, origin: [0, 0.5] });
    const logo = this.add.image(x + w - 26, y + 32, "logo_biodom").setOrigin(1, 0.5).setTint(C.c4).setVisible(false);
    const title = ditherTitle(this, x + 40, y + 88, "L'ARIA ESTERNA\nNON È RESPIRABILE", { size: 46 }).setVisible(false);
    const body = txt(this, x + 40, title.y + title.height + 14, BODY, { size: 22, color: HEX.c3, wrap: w - 80 });
    body.setText("");
    const goal = txt(this, x + 40, y + h - 60, "", { size: 22, origin: [0, 0.5] });
    const cursor = this.add.rectangle(0, 0, 14, 40, C.c4).setOrigin(0).setVisible(false);
    const scan = this.add.rectangle(x, 0, w, 3, C.c4, 0.9).setOrigin(0).setVisible(false);
    c.add([dim, shell, band, hatch, lines, warn, head, logo, title, body, goal, cursor, scan]);
    const btn = button(this, x + w - 300, y + h - 94, 270, 64, "INIZIA ▶", () => this.go(), { primary: true, size: 26, depth: 2001 });
    btn.c.setVisible(false);
    this.notice = [c, btn.c];

    // guscio del pannello: rettangolo (cw x ch) centrato, con bordo e nodi
    const drawShell = (cw, ch) => {
      shell.clear();
      shell.fillStyle(C.c0, 1);
      shell.fillRect(cxm - cw / 2, cym - ch / 2, cw, ch);
      shell.lineStyle(2, C.c3, 1);
      shell.strokeRect(cxm - cw / 2, cym - ch / 2, cw, ch);
      shell.fillStyle(C.c4, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => shell.fillRect(cxm + (sx * cw) / 2 - 3, cym + (sy * ch) / 2 - 3, 6, 6));
    };
    const type = (t, full, ms, done) => {
      let i = 0;
      const ev = this.time.addEvent({
        delay: ms,
        repeat: full.length - 1,
        callback: () => {
          i++;
          t.setText(full.slice(0, i));
          if (i >= full.length) done?.();
        }
      });
      return ev;
    };
    const ease = (u) => 1 - Math.pow(1 - u, 3);
    this.tweens.add({ targets: dim, alpha: 1, duration: 300 });
    // 1) una riga luminosa si allarga dal centro
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 280,
      onUpdate: (tw) => drawShell(Math.max(6, w * ease(tw.getValue())), 2),
      onComplete: () => {
        // 2) il pannello si spalanca in verticale
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 320,
          onUpdate: (tw) => drawShell(w, Math.max(2, h * ease(tw.getValue()))),
          onComplete: () => {
            // 3) testata retinata che si stende da sinistra, poi divisori e avviso
            band.setVisible(true).setCrop(0, 0, 0, 64);
            this.tweens.addCounter({
              from: 0,
              to: w,
              duration: 260,
              onUpdate: (tw) => band.setCrop(0, 0, Math.round(tw.getValue()), 64),
              onComplete: () => {
                lines.setVisible(true);
                hatch.setVisible(true);
                warn.setVisible(true);
                logo.setVisible(true);
                type(head, HEAD, 18);
                this.time.delayedCall(250, writeTitle);
              }
            });
          }
        });
      }
    });
    // 4) il titolo si scrive con un cursore a blocco, una riga alla volta
    const writeTitle = () => {
      const tw0 = title.width;
      const th = title.height;
      const rowH = th / 2;
      title.setVisible(true).setCrop(0, 0, 0, 0);
      cursor.setVisible(true);
      let row = 0;
      const wipeRow = () => {
        this.tweens.addCounter({
          from: 0,
          to: tw0,
          duration: 380,
          onUpdate: (tw) => {
            const v = Math.round(tw.getValue());
            if (row === 0) title.setCrop(0, 0, v, rowH);
            else row2.setCrop(0, rowH, v, th - rowH);
            cursor.setPosition(title.x + v + 4, title.y + row * rowH + 4);
          },
          onComplete: () => {
            row++;
            if (row < 2) wipeRow();
            else {
              title.setCrop();
              row2.destroy();
              this.tweens.add({ targets: cursor, alpha: 0, duration: 120, yoyo: true, repeat: 2, onComplete: () => cursor.setVisible(false) });
              type(body, BODY, 14, () => type(goal, GOAL, 16, showButton));
            }
          }
        });
      };
      // seconda riga: una copia del titolo ritagliata sulla riga sotto
      const row2 = this.add.image(title.x, title.y, title.texture.key).setOrigin(0).setScrollFactor(0).setCrop(0, rowH, 0, rowH);
      c.addAt(row2, c.getIndex(title) + 1);
      wipeRow();
    };
    // 5) il pulsante si accende con una scansione
    const showButton = () => {
      btn.c.setVisible(true).setScale(1, 0.1);
      this.tweens.add({ targets: btn.c, scaleY: 1, duration: 180, ease: "Back.easeOut" });
      scan.setVisible(true).setPosition(x, y);
      this.tweens.add({ targets: scan, y: y + h - 3, alpha: 0.2, duration: 500, ease: "Sine.easeIn", onComplete: () => scan.setVisible(false) });
      this.ready = true;
    };
  }

  // uscita: la porta si apre verso l'esterno (luce della città nel vano), l'operatore
  // entra nel vano e sparisce nella luce, la porta si richiude, poi si cambia scena
  exitDoor() {
    if (this.phase === "exit") return;
    this.phase = "exit";
    const night = dayTime(getRun(this.registry)) === "night";
    const door = doorway(this, this.points.door, { night, depth: this.walker.img.depth });
    door.open();
    // il personaggio attraversa il vano e si perde nella luce
    this.walker.minX = 0;
    // si ferma al centro del vano e "entra" nella luce: si rimpicciolisce appena e svanisce
    this.walker.maxX = this.points.door;
    this.tweens.add({ targets: this.walker.img, scaleX: 0.92, scaleY: 0.92, delay: 420, duration: 520, ease: "Sine.easeIn" });
    this.tweens.add({ targets: [this.walker.img, this.walker.shadow], alpha: 0, delay: 520, duration: 420 });
    this.time.delayedCall(1000, () => door.close());
    this.time.delayedCall(1350, () => {
      if (this._leaving) return;
      const ev = currentEvent(this.registry);
      goTo(this, ev && (ev.location === "home" || ev.location === "street") ? "EventScene" : "TravelScene");
    });
  }

  go() {
    if (!this.ready || this.phase !== "notice") return;
    this.phase = "out";
    // il comunicato e il pulsante spariscono del tutto (non solo trasparenti)
    this.tweens.add({ targets: this.notice, alpha: 0, duration: 250, onComplete: () => this.notice.forEach((o) => o.destroy()) });
    this.walker.frozen = false;
    this.walker.speed = 260;
  }
}
