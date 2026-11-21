import Phaser from "../phaser.js";
import { Sfx, setAmbient } from "../systems/Sfx.js";
import { getOrigin } from "../config/origins.js";
import { EMERGENCY_ACTIONS, EVENTS } from "../config/events.js";
import { completeEvent, currentEvent, dayTime, failRun, getRun, cityZone, cityTemp } from "../systems/RunManager.js";
import { doorway } from "../ui/door.js";
import { PlantSensors } from "../input/PlantSensors.js";
import { Bionomad } from "../systems/Bionomad.js";
import { buildSkyline } from "../world/skyline.js";
import { buildPlace, busSprite, OUTDOOR } from "../art/places.js";
import { snowfall } from "../world/snow.js";
import { Walker, smoothFollow } from "../entities/Walker.js";
import { npcKey, operatorKey, holdFrames } from "../art/people.js";
import { BioPanel, bioKeys } from "../ui/BioPanel.js";
import { cityHud, C, canvasImage, controls, fadeIn, goTo, HEX, marker, o2Hud, statusChip, skylineLayers, taskPanel, toast, txt, VIEW, BRAND } from "../ui/hud.js";

const NEAR = 80;
const STEP_BONUS = 0.04;
const EVENT_BONUS = 0.08;
const FEET = 764;
// dove guarda la città dalle finestre / all'aperto (frazione della strada)
const VIEWPOINT = { home: 0.1, office: 0.3, bus: 0.5, busstop: 0.62, foodtruck: 0.8 };
// passanti fermi nei luoghi
const EXTRAS = { busstop: [["man", 2]], bus: [[260, 1], [880, 3], [1060, 4]], office: [[230, 0]] };
// temperatura esterna di base (all'aperto di giorno / di sera); al chiuso 21 °C
const OUT_TEMP = { day: 13, night: 8 };
// step che si completano appena si arriva
const REACH_TYPES = new Set(["reach"]);
const TARGET_NAMES = { hub: "BIONOMAD", door: "USCITA", boss: "CAPO", sofa: "DIVANO", home: "CASA" };

export class EventScene extends Phaser.Scene {
  constructor() {
    super("EventScene");
  }

  create() {
    this.run = getRun(this.registry);
    this.event = currentEvent(this.registry);
    if (!this.run || !this.event) {
      this.scene.start("MenuScene");
      return;
    }
    this._leaving = false;
    this.origin = getOrigin(this.registry);
    this.mode = "play";
    this.stepIndex = 0;
    this.holdMs = 0;
    this.oxygen = this.run.oxygen ?? 1;
    fadeIn(this);

    const loc = this.event.location;
    const outdoor = OUTDOOR.has(loc) || loc === "bus";
    this.indoor = !OUTDOOR.has(loc);
    this.time_ = dayTime(this.run);
    Bionomad.setOutside(cityTemp(this.run, this.event.out ?? (outdoor ? OUT_TEMP[this.time_] : 21)));
    setAmbient(OUTDOOR.has(loc) ? (this.time_ === "night" ? "night" : "city") : null);
    this.events.once("shutdown", () => PlantSensors.send("E0"));
    if (OUTDOOR.has(loc) && this.origin.id === "reykjavik") snowfall(this, { intensity: 0.8 });

    // città sullo sfondo
    const sky = skylineLayers(this, this.origin.id, buildSkyline, { time: this.time_, zone: cityZone(this.run) });
    this.wide = loc === "street";
    const op = this.registry.get("operator") ?? "a";
    this.packedKey = operatorKey(this, op, this.origin.id);
    this.bareKey = operatorKey(this, op, this.origin.id, { bare: true, mask: false });
    if (this.wide) {
      // emergenza: strada lunga fino a casa
      this.worldW = sky.worldW;
      this.cameras.main.setBounds(0, 0, this.worldW, VIEW.h);
      this.points = { home: this.worldW - 160 };
    } else {
      this.worldW = VIEW.w;
      const cam = Math.round((sky.worldW - VIEW.w) * (VIEWPOINT[loc] ?? 0.4));
      this.cameras.main.setScroll(cam, 0);
      const place = buildPlace(loc, this.origin.id);
      canvasImage(this, `place_${loc}_${this.origin.id}`, place.canvas).setScrollFactor(0).setDepth(0);
      this.points = { ...place.points };
      this.floorY = place.floorY;
    }
    const sf = this.wide ? 1 : 0;
    this.sf = sf;
    if (loc === "office") this.points.boss = this.points.ac ?? 660;

    (EXTRAS[loc] ?? []).forEach(([at, key]) => {
      const x = typeof at === "number" ? at : this.points[at];
      const npc = this.add.image(x, FEET, `${npcKey(this, this.origin.id, 6 + key)}_idle`).setOrigin(0.5, 1).setDepth(400).setScrollFactor(sf).setFlipX(true);
      this.add.ellipse(x, FEET - 6, 70, 12, 0x24344b, 0.18).setDepth(399).setScrollFactor(sf);
      if (at === "man") this.man = npc;
    });
    if (this.points.boss) {
      // il capo in ufficio, in giacca scura, girato verso di te
      const boss = this.add.image(this.points.boss + 40, FEET, `${npcKey(this, this.origin.id, 12)}_idle`).setOrigin(0.5, 1).setDepth(400).setScrollFactor(sf).setFlipX(true);
      this.add.ellipse(boss.x, FEET - 6, 70, 12, 0x24344b, 0.18).setDepth(399).setScrollFactor(sf);
    }

    this.player = new Walker(this, this.packedKey, 420, FEET, { sound: true, indoor: this.indoor, speed: 230 });
    this.player.img.setScrollFactor(sf);
    this.player.shadow.setScrollFactor(sf);
    this.player.maxX = this.worldW - 60;
    if (this.wide) smoothFollow(this, this.player, 480);
    // a casa si entra dalla porta (come nella cutscene finale), camminando verso sinistra
    if (loc === "home" && this.points.door) this.enterHome();

    // interfaccia pulita: luogo + task in alto a sinistra, respiro in alto al centro
    cityHud(this, this.origin.id, { zone: cityZone(this.run) });
    this.o2 = o2Hud(this);
    this.chip = statusChip(this);
    this.tasks = taskPanel(this);
    this.pad = controls(this);
    this.mark = marker(this, 0, "", { y: FEET - 230, h: 230 });
    this.mark.c.setScrollFactor(sf).setVisible(false);
    this.bio = new BioPanel(this);
    // sfondo ravvicinato delle task: il posto in cui si è, di giorno o di sera
    this.bioContext = { kind: ["bus", "office", "home"].includes(loc) ? loc : "street", night: this.time_ === "night" };
    this.tasks.setDark(this.bioContext.night);
    this.bioKeys = bioKeys(this);
    this.night = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x0e1626, 0).setOrigin(0).setScrollFactor(0).setDepth(1300);
    this.input.keyboard.on("keydown-ESC", () => goTo(this, "MenuScene"));

    this.stepLabels = this.event.steps.map((s) => s.text.replace(/^[+!]\s*/, ""));
    if (this.event.emergency) this.startEmergency();
    this.startStep();
  }

  get step() {
    return this.event.steps[this.stepIndex];
  }

  refreshTasks(progress = null) {
    const title = `EVENTO ${this.run.index + 1}/${this.run.events.length} · ${this.event.title}`;
    if (this.step?.type === "emergency") {
      const need = this.step.cures;
      const done = Math.min(this.cures ?? 0, need);
      this.tasks.set(title, [done < need ? `TIENI IN VITA IL BIONOMAD · ${done}/${need}` : "TORNA A CASA"], 0, { progress });
      return;
    }
    this.tasks.set(title, this.stepLabels, this.stepIndex, { progress });
  }

  startStep() {
    const step = this.step;
    this.holdMs = 0;
    this.refreshTasks();
    const target = step.target && this.points[step.target];
    this.mark.c.setVisible(Boolean(target));
    if (target) {
      this.mark.c.x = target;
      this.mark.setLabel(TARGET_NAMES[step.target] ?? "");
      this.mark.setActive(false);
    }
    if (step.type === "bio") this.openBio(step);
    if (step.type === "notify") this.notify(step);
    if (step.type === "busLeaves") this.busLeaves();
    if (step.type === "emergency") {
      this.cures = 0;
      this.emTimer = 0;
      this.mark.c.x = this.points.home;
      this.mark.setLabel("CASA");
      this.mark.c.setVisible(true);
      this.refreshTasks();
    }
  }

  enterHome() {
    const p = this.player;
    p.x = this.points.door;
    p.maxX = this.points.door + 10;
    p.facing = -1;
    p.img.setFlipX(true);
    [p.img, p.shadow].forEach((o) => o.setAlpha(0));
    const door = doorway(this, this.points.door, { night: true, depth: p.img.depth });
    this.autoWalk = this.points.door - 170;
    this.time.delayedCall(250, () => {
      door.open();
      this.tweens.add({ targets: [p.img, p.shadow], alpha: 1, duration: 380 });
    });
    this.time.delayedCall(1300, () => door.close());
  }

  // ---------- notifica (telefono / BIONOMAD) ----------

  notify(step) {
    // niente attesa a gioco fermo: la notifica arriva subito e si può continuare a camminare.
    // Se il passo dopo apre lo zaino si lascia appena il tempo di leggerla.
    if (step.wake) {
      // svegliato nel cuore della notte: la stanza si schiarisce appena
      this.mode = "busy";
      this.tweens.add({ targets: this.night, fillAlpha: Math.max(0.35, this.duskA ?? 0), duration: 600 });
      this.player.img.setTexture(`${this.player.key}_idle`);
    }
    if (step.dusk) {
      // la giornata scorre: la luce cala (fine giornata in ufficio, corrente saltata a casa)
      this.duskA = step.dusk;
      this.tweens.add({ targets: this.night, fillAlpha: step.dusk, duration: 1400, ease: "Sine.easeInOut" });
      this.bioContext.night = true;
    }
    if (step.out != null) Bionomad.setOutside(cityTemp(this.run, step.out));
    PlantSensors.send("N");
    Sfx.announce?.();
    notification(this, step.line ?? step.text);
    const next = this.event.steps[this.stepIndex + 1];
    const wait = next?.type === "bio" ? 1100 : step.wake ? 900 : 250;
    this.time.delayedCall(wait, () => {
      if (this.step !== step) return;
      this.mode = "play";
      this.completeStep({ quiet: true });
    });
  }

  // ---------- pannello del BIONOMAD ----------

  openBio(step, emergency = false) {
    this.mode = "bio";
    this.bioEmergency = emergency;
    this.bio.show(step, { emergency });
    this.pad.setVisible(false);
  }

  closeBio(success) {
    this.bio.close();
    this.pad.setVisible(true);
    if (success) PlantSensors.send("G");
    if (this.bioEmergency) {
      this.bioEmergency = false;
      this.mode = "play";
      this.emTimer = 0;
      if (success) {
        this.cures += 1;
        const left = this.step.cures - this.cures;
        const bonus = left > 0 ? 0.18 : 0.4;
        this.addOxygen(bonus, true);
        this.player.o2Pop(1);
        this.player.bubble?.(10);
        Sfx.o2Gain();
        toast(this, left > 0 ? `CURA RIUSCITA · NE MANCANO ${left}` : "BIONOMAD STABILE · VAI A CASA", { duration: 1600 });
      } else {
        this.addOxygen(-0.08, true);
        this.player.o2Pop(-1);
        Sfx.negligence();
        this.cameras.main.shake(200, 0.006);
        toast(this, "TROPPO TARDI", { duration: 1600 });
      }
      this.refreshTasks();
      return;
    }
    this.mode = "play";
    this.completeStep();
  }

  negligence(type) {
    const messages = {
      forgot: "NEGLIGENZA · NON L'HAI CURATO IN TEMPO",
      dark: "NEGLIGENZA · IL BIONOMAD È RIMASTO AL BUIO",
      flood: "NEGLIGENZA · TROPPA ACQUA",
      cold: "NEGLIGENZA · TEMPERATURA SBAGLIATA"
    };
    // gioco più semplice: errori che costano la metà
    const cost = { forgot: 0.09, dark: 0.07, flood: 0.07, cold: 0.06 }[type] ?? 0.05;
    Sfx.negligence();
    this.player.o2Pop(-1);
    this.addOxygen(-cost, true);
    this.cameras.main.shake(220, 0.006);
    toast(this, messages[type] ?? "NEGLIGENZA", { y: 640, duration: 2200 });
    this.run.negligence = (this.run.negligence ?? 0) + 1;
    this.registry.set("run", this.run);
  }

  // ---------- BIONOMAD sul tavolo (ufficio) ----------

  placePack() {
    const x = this.points.hub;
    holdFrames(this, this.bareKey);
    this.packImg = this.add.image(x + 6, (this.floorY ?? 711) - 118, "pack_item").setOrigin(0.5, 1).setScrollFactor(this.sf).setDepth(420).setScale(1.4);
    this.packImg.setAlpha(0);
    this.tweens.add({ targets: this.packImg, alpha: 1, y: this.packImg.y + 6, duration: 300 });
    this.player.key = this.bareKey;
    this.player.img.setTexture(`${this.bareKey}_idle`);
    Sfx.attach();
  }

  takePack() {
    this.packImg?.destroy();
    this.packImg = null;
    this.player.key = this.packedKey;
    this.player.img.setTexture(`${this.packedKey}_idle`);
    Sfx.attach();
  }

  // ---------- bus che parte ----------

  busLeaves() {
    this.mode = "busy";
    const key = busSprite(this, this.origin.id);
    const img = this.add.image(0, 0, key).setOrigin(0, 1);
    const w = img.width;
    const bus = this.add.container(-w - 40, FEET - 4, [img]).setScrollFactor(0).setDepth(450);
    this.tweens.add({ targets: img, y: -2, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const puff = this.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => {
        const p = this.add.circle(bus.x + 8, FEET + 4 - Math.random() * 6, 5, 0xdfe4ea, 0.8).setScrollFactor(0).setDepth(449);
        this.tweens.add({ targets: p, x: p.x - 30 - Math.random() * 30, y: p.y - 14 - Math.random() * 14, alpha: 0, scale: 2, duration: 700, onComplete: () => p.destroy() });
      }
    });
    Sfx.whoosh?.();
    this.tweens.chain({
      targets: bus,
      tweens: [
        { x: 300, duration: 1700, ease: "Quad.easeOut" },
        { x: 306, duration: 700, ease: "Sine.easeInOut" },
        { x: VIEW.w + 60, duration: 2200, ease: "Quad.easeIn" }
      ],
      onComplete: () => {
        puff.remove();
        bus.destroy();
        toast(this, "IL BUS È PARTITO · FUORI FA FREDDO", { duration: 1800 });
        this.time.delayedCall(250, () => {
          this.mode = "play";
          this.completeStep({ quiet: true });
        });
      }
    });
  }

  // ---------- emergenza ----------

  startEmergency() {
    PlantSensors.send("E1");
    const alarm = this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0xb4553f, 0).setOrigin(0).setScrollFactor(0).setDepth(1400);
    this.tweens.add({ targets: alarm, fillAlpha: 0.08, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.alarm = alarm;
    toast(this, "EMERGENZA · IL BIONOMAD È COMPROMESSO", { duration: 2600 });
  }

  // ---------- azioni ----------

  near() {
    const t = this.step?.target && this.points[this.step.target];
    return t !== undefined && t !== null && Math.abs(this.player.x - t) < NEAR;
  }

  onAction() {
    const step = this.step;
    if (this.mode !== "play" || !step || !this.near()) return;
    if (step.type === "sleep" || REACH_TYPES.has(step.type)) return;
    if (step.type === "talk") {
      toast(this, step.line ?? "", { duration: 2400 });
      this.mode = "busy";
      this.time.delayedCall(900, () => {
        this.mode = "play";
        this.completeStep();
      });
      return;
    }
    if (step.type === "place") this.placePack();
    if (step.type === "take") this.takePack();
    this.completeStep();
  }

  completeStep({ quiet = false } = {}) {
    // a evento chiuso (o dopo la fine dei passi) non si avanza più: niente doppie chiusure
    if (this.mode === "done" || this.stepIndex >= this.event.steps.length) return;
    if (!quiet) {
      Sfx.o2Gain();
      this.addOxygen(STEP_BONUS);
      this.player.o2Pop(1);
    }
    this.stepIndex += 1;
    if (this.stepIndex >= this.event.steps.length) this.finishEvent();
    else this.startStep();
  }

  finishEvent() {
    this.mode = "done";
    this.mark.c.setVisible(false);
    this.tasks.set(`EVENTO · ${this.event.title}`, ["EVENTO COMPLETATO"], 1);
    this.addOxygen(EVENT_BONUS);
    Sfx.task();
    toast(this, "EVENTO COMPLETATO", { duration: 1500 });
    PlantSensors.send("E0");
    this.time.delayedCall(1100, () => {
      const here = this.event.endsAt ?? this.event.location;
      const finished = completeEvent(this.registry, Math.min(1, this.oxygen));
      const run = getRun(this.registry);
      const nextId = run.events[run.index];
      // già a casa a fine giornata: niente tragitto, si va alla cutscene finale.
      // Evento successivo nello stesso posto (ufficio → ufficio, casa → casa): si resta lì.
      if (finished && here === "home") goTo(this, "OutroScene", { inside: this.event.location === "home", night: this.event.steps.some((st) => st.type === "sleep") });
      else if (!finished && nextId && EVENTS[nextId].location === here) goTo(this, "EventScene");
      else goTo(this, "TravelScene");
    });
  }

  addOxygen(amount, raw = false) {
    const gain = amount > 0 && !raw ? amount * (this.origin.regen ?? 1) : amount;
    this.oxygen = Phaser.Math.Clamp(this.oxygen + gain, 0, 1);
  }

  fail() {
    if (this.mode === "done") return;
    this.mode = "done";
    this.oxygen = 0;
    this.bio.close();
    this.mark.c.setVisible(false);
    this.pad.setVisible(false);
    failRun(this.registry);
    Sfx.gameOver();
    toast(this, "OSSIGENO ESAURITO", { duration: 3000 });
    this.player.faint(() => this.time.delayedCall(900, () => goTo(this, "EndScene", { result: "lose" })));
  }

  update(time, delta) {
    if (!this.player || this.mode === "done") {
      this.o2?.set(this.oxygen ?? 0, time);
      return;
    }
    this.bioKeys(delta);
    Bionomad.update(delta);
    this.chip.update(time);
    const input = this.pad.poll();
    let dir = input.dir;
    if (this.autoWalk != null) {
      // entrata in casa: qualche passo da solo oltre la porta
      dir = -1;
      if (this.player.x <= this.autoWalk) {
        this.autoWalk = null;
        this.player.maxX = this.worldW - 60;
      }
    }
    this.player.frozen = this.mode !== "play" && this.autoWalk == null;
    this.player.update(dir, delta);

    const step = this.step;
    if (this.mode === "bio") {
      const r = this.bio.update(delta);
      if (r.negligence) this.negligence(r.negligence);
      if (r.done) this.closeBio(true);
      else if (r.failed) this.closeBio(false);
    } else if (this.mode === "play" && step) {
      const near = this.near();
      this.mark.setActive(near);
      const needsButton = ["place", "take", "talk", "exit"].includes(step.type);
      this.pad.highlight(near && needsButton);
      if (input.action) this.onAction();
      if (near && REACH_TYPES.has(step.type)) this.completeStep({ quiet: true });
      else if (near && step.type === "sleep") {
        // tieni premuto ● vicino al divano: ci si addormenta
        if (input.holding) this.holdMs += delta;
        else this.holdMs = Math.max(0, this.holdMs - delta);
        const p = Math.min(1, this.holdMs / (step.duration ?? 1800));
        this.refreshTasks(p);
        this.night.fillAlpha = Math.max(this.duskA ?? 0, p * 0.7);
        if (p >= 1) {
          this.player.img.setVisible(true);
          this.completeStep({ quiet: true });
        }
      }
      if (step.type === "emergency") this.updateEmergency(delta);
    }

    this.addOxygen(-(delta * Bionomad.stress()) / (this.origin.drainSeconds * 1000), true);
    this.o2.set(this.oxygen, time);
    // livello di ossigeno al LED RGB del dispositivo (solo quando cambia)
    const o = Math.round(this.oxygen * 100);
    if (o !== this.lastO2) {
      this.lastO2 = o;
      PlantSensors.send(`O:${o}`);
    }
    if (this.oxygen <= 0) this.fail();
  }

  updateEmergency(delta) {
    const step = this.step;
    this.emTimer += delta;
    const stable = this.cures >= step.cures;
    const atHome = this.player.x >= this.points.home - 40;
    if (!stable && this.emTimer > step.actionEveryMs) {
      // tre cure diverse fra loro, mai la stessa due volte
      if (!this.emBag?.length) this.emBag = Phaser.Utils.Array.Shuffle([...EMERGENCY_ACTIONS]);
      this.openBio(this.emBag.pop(), true);
    }
    else if (atHome && !stable) {
      if (!this.blockToast || this.time.now - this.blockToast > 2500) {
        this.blockToast = this.time.now;
        toast(this, "PRIMA METTI IN SICUREZZA IL BIONOMAD", { duration: 1600 });
      }
      this.emTimer = Math.max(this.emTimer, step.actionEveryMs - 900);
    } else if (atHome) {
      PlantSensors.send("E0");
      this.tweens.killTweensOf(this.alarm);
      this.alarm?.destroy();
      this.completeStep();
    }
  }
}

// notifica in stile telefono: scende dall'alto, resta un attimo e risale
export function notification(scene, line) {
  // notifica come sul telefono: arriva da destra in alto (non copre luogo, task e respiro),
  // icona del BIONOMAD colorata in base al bisogno, titolo, messaggio e tempo che scorre
  const msg = String(line).replace(/^NOTIFICA\s*·\s*/i, "");
  const low = msg.toLowerCase();
  const kind = /emergenza|subito|!/.test(low) ? "alert" : /acqua|irrig|sete/.test(low) ? "water" : /aria|polvere|ventil/.test(low) ? "air" : /luce|buio/.test(low) ? "light" : /freddo|caldo|temperatura|riscald/.test(low) ? "temp" : "info";
  // colori del brand biodom+ (verdi-acqua e inchiostro); l'urgenza resta in inchiostro scuro
  const col = { alert: BRAND.ink, water: BRAND.teal2, air: BRAND.teal3, light: BRAND.teal, temp: BRAND.teal2, info: BRAND.teal }[kind];
  const w = 420;
  const LIFE = 3400;
  const c = scene.add.container(VIEW.w + w / 2 + 20, 0).setDepth(2300).setScrollFactor(0);
  const g = scene.add.graphics();
  const icon = scene.add.graphics();
  const title = txt(scene, -w / 2 + 76, 0, "BIONOMAD", { size: 12, color: HEX.c3, origin: [0, 0] });
  title.setLetterSpacing?.(2);
  const when = txt(scene, w / 2 - 20, 0, "ora", { size: 12, color: HEX.c3, origin: [1, 0] });
  const t = txt(scene, -w / 2 + 76, 0, msg, { size: 17, weight: "500", wrap: w - 100, origin: [0, 0] });
  const h = Math.max(78, t.height + 52);
  title.y = -h / 2 + 14;
  when.y = -h / 2 + 14;
  t.y = -h / 2 + 32;
  g.fillStyle(C.c4, 0.16);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 22);
  g.fillStyle(C.c0, 0.98);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  // icona: cerchio colorato con la foglia
  const ix = -w / 2 + 40;
  icon.fillStyle(col, 1);
  icon.fillCircle(ix, 0, 22);
  icon.fillStyle(0xffffff, 1);
  icon.beginPath();
  icon.moveTo(ix, 10);
  icon.lineTo(ix - 9, -2);
  icon.lineTo(ix, -13);
  icon.lineTo(ix + 9, -2);
  icon.closePath();
  icon.fillPath();
  icon.lineStyle(2, col, 1);
  icon.lineBetween(ix, 9, ix, -9);
  // anello che pulsa attorno all'icona e barra del tempo
  const ring = scene.add.graphics();
  const bar = scene.add.graphics();
  c.add([g, ring, icon, title, when, t, bar]);
  const y = 96 + h / 2;
  c.y = y;
  scene.tweens.add({ targets: c, x: VIEW.w - 28 - w / 2, duration: 420, ease: "Cubic.easeOut" });
  const t0 = scene.time.now;
  const tick = () => {
    if (!c.scene) return;
    const e = scene.time.now - t0;
    const p = Math.min(1, e / LIFE);
    ring.clear();
    const k = (e % 1000) / 1000;
    ring.lineStyle(3, col, 0.6 * (1 - k));
    ring.strokeCircle(ix, 0, 22 + k * 12);
    bar.clear();
    bar.fillStyle(C.c1, 1);
    bar.fillRoundedRect(-w / 2 + 76, h / 2 - 12, w - 100, 4, 2);
    bar.fillStyle(col, 1);
    bar.fillRoundedRect(-w / 2 + 76, h / 2 - 12, Math.max(4, (w - 100) * (1 - p)), 4, 2);
  };
  scene.events.on("update", tick);
  // un piccolo scossone all'arrivo, come una vibrazione
  scene.time.delayedCall(430, () => scene.tweens.add({ targets: c, angle: { from: -1.2, to: 1.2 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => c.setAngle(0) }));
  let gone = false;
  const leave = () => {
    if (gone || !c.scene) return;
    gone = true;
    scene.tweens.add({
      targets: c,
      x: VIEW.w + w / 2 + 20,
      alpha: 0,
      duration: 340,
      ease: "Cubic.easeIn",
      onComplete: () => {
        scene.events.off("update", tick);
        c.destroy();
      }
    });
  };
  scene.time.delayedCall(LIFE, leave);
  // quando si apre lo zaino la notifica ha già fatto il suo lavoro: esce subito
  scene.events.once("bio-open", leave);
  return c;
}
