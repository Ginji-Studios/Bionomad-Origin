import Phaser from "../phaser.js";
import { TEAM } from "../ui/teamSprites.js";
import { TITLE_WORD } from "../ui/pixelSprites.js";
import { ditherRect, addTopBar, bodyText, COLORS, hex, drawPanel, dropShadow, goTo, paperGrid, pixelDisc, pixelText, textChip } from "../ui/theme.js";

// crediti in due pagine
const BIODOM_TEXT =
  "BIODOM è un'istituzione laboratoriale, farmaceutica e biotecnologica di diritto privato che opera in partenariato diretto con le Nazioni Unite e le autorità sanitarie europee per la gestione dei protocolli di biosicurezza atmosferica.";

const PRODUCTS = [
  {
    code: "[01]",
    name: "BIONOMAD BACKPACK",
    art: "backpack",
    text: "Dotazione d'ordinanza per la mobilità urbana: vincola la libertà di movimento al monitoraggio costante di pH e flusso, riducendo ogni spostamento a una procedura di stabilizzazione della biomassa."
  },
  {
    code: "[02]",
    name: "BIONOMAD ACTIVE PACK",
    art: "active",
    text: "Modulo compatto ad aggancio e sgancio rapido dallo zaino. Una sospensione di micro-alghe ad alta densità garantisce 1-2 ore di ossigeno autonomo durante le disconnessioni temporanee."
  },
  {
    code: "[03]",
    name: "HOME HUB",
    art: "hub",
    text: "Il Nucleo Domestico: la serra d'appartamento che genera aria per tutta la famiglia. Stazione di ricarica per sanificazione chimica, bilanciamento dei sali e travaso nei moduli indossabili."
  }
];

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("CreditsScene");
  }

  create() {
    const { width, height } = this.scale;
    this.page = 0;
    paperGrid(this);
    addTopBar(this, "CREDITI", "BIODOM+");

    this.pages = [this.createBiodomPage(), this.createTeamPage()];
    this.pages[1].setAlpha(0).setX(width);

    // linguette delle due sezioni: quella attiva è piena, si possono anche cliccare
    this.tabs = ["BIONOMAD SYSTEM", "CREDITI"].map((name, i) => {
      const label = bodyText(this, 0, 0, name, { size: 20, color: COLORS.ink });
      const w = label.width + 24;
      const x = width / 2 + (i === 0 ? -w - 4 : 4);
      label.setPosition(x + 12, height - 36);
      const bg = this.add.graphics().setDepth(10);
      label.setDepth(11);
      const zone = this.add.zone(x + w / 2, height - 24, w, 28).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.goToPage(i));
      return { label, bg, x, w };
    });
    this.drawDots();

    textChip(this, 14, height - 24, "A / D cambia pagina", { size: 20 });
    textChip(this, width - 14, height - 24, "ESC  MENU", { size: 20, originX: 1 });

    const keys = this.input.keyboard;
    ["LEFT", "A"].forEach((key) => keys.on(`keydown-${key}`, () => this.goToPage(this.page - 1)));
    ["RIGHT", "D", "SPACE", "ENTER"].forEach((key) => keys.on(`keydown-${key}`, () => this.goToPage(this.page + 1)));
    keys.once("keydown-ESC", () => goTo(this, "MenuScene"));
  }

  goToPage(index) {
    const next = Phaser.Math.Wrap(index, 0, this.pages.length);
    if (next === this.page) return;
    const { width } = this.scale;
    const dir = index > this.page ? 1 : -1;
    const current = this.pages[this.page];
    const incoming = this.pages[next];
    // le due pagine scorrono insieme come un nastro; i tween vecchi si fermano,
    // così cambiando scheda in fretta non restano pagine sovrapposte o sparite
    this.pages.forEach((p) => this.tweens.killTweensOf(p));
    this.pages.forEach((p) => p !== current && p !== incoming && p.setAlpha(0));
    this.tweens.add({ targets: current, x: -dir * width, alpha: 0, duration: 360, ease: "Cubic.easeInOut" });
    incoming.setX(dir * width).setAlpha(1);
    this.tweens.add({ targets: incoming, x: 0, duration: 360, ease: "Cubic.easeInOut" });
    this.page = next;
    this.drawDots();
  }

  drawDots() {
    const { height } = this.scale;
    this.tabs.forEach((tab, i) => {
      const active = i === this.page;
      tab.bg.clear();
      drawPanel(tab.bg, tab.x, height - 38, tab.w, 28, { fill: active ? COLORS.ink : COLORS.paper, border: COLORS.ink });
      tab.label.setColor(hex(active ? COLORS.paper : COLORS.ink));
    });
  }

  // pagina 1

  createBiodomPage() {
    const page = this.add.container(0, 0);
    const items = [];
    items.push(pixelText(this, 40, 62, "BIONOMAD SYSTEM", { size: 24, color: COLORS.ink, shadow: true }));
    items.push(bodyText(this, 40, 102, BIODOM_TEXT, { size: 22, color: COLORS.steel, wrap: 880, lineSpacing: -2 }));

    PRODUCTS.forEach((product, i) => {
      const x = 40 + i * 300;
      const y = 172;
      const w = 280;
      const h = 316;
      const g = this.add.graphics();
      dropShadow(g, x, y, w, h, 6);
      drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(x, y, w, 26);
      items.push(g);
      items.push(pixelText(this, x + 10, y + 9, `${product.code} ${product.name}`, { size: 8, color: COLORS.paper }));

      // riquadro illustrazione
      const art = this.add.graphics();
      drawPanel(art, x + 14, y + 38, w - 28, 128, { fill: COLORS.bg, border: COLORS.panelLight });
      items.push(art, ...this.drawProductArt(product.art, x + w / 2, y + 160));

      items.push(bodyText(this, x + 14, y + 174, product.text, { size: 20, color: COLORS.ink, wrap: w - 28, lineSpacing: -3 }));
    });

    page.add(items);
    return page;
  }

  drawProductArt(type, cx, baseY) {
    const out = [];
    if (type === "backpack") {
      const hero = this.add.container(cx + 10, baseY);
      const pack = this.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(4);
      const body = this.add.image(0, 0, "hero_milano_mask").setOrigin(0.5, 1).setScale(4);
      hero.add([pack, body]);
      // tubo dallo zaino alla mascherina
      const tube = this.add.graphics();
      tube.fillStyle(COLORS.paper, 1);
      tube.fillRect(cx - 20, baseY - 68, 4, 14);
      tube.fillRect(cx - 20, baseY - 70, 22, 4);
      tube.fillStyle(COLORS.ink, 1);
      tube.fillRect(cx - 22, baseY - 72, 2, 20);
      this.tweens.add({ targets: [body], y: -3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      out.push(hero, tube);
    }
    if (type === "active") {
      const pack = this.add.image(cx, baseY - 56, "active_pack").setScale(7);
      this.tweens.add({ targets: pack, y: baseY - 62, duration: 1000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      out.push(pack);
      // bollicine di micro-alghe
      for (let i = 0; i < 4; i += 1) {
        const b = this.add.graphics();
        pixelDisc(b, 0, 0, 6, COLORS.ink, 1, 2);
        pixelDisc(b, 0, 0, 4, COLORS.paper, 1, 2);
        b.setPosition(cx - 30 + i * 20, baseY - 90);
        this.tweens.add({ targets: b, y: baseY - 120, alpha: 0, duration: 1400, delay: i * 350, repeat: -1, ease: "Sine.easeOut" });
        out.push(b);
      }
    }
    if (type === "hub") {
      const hub = this.add.image(cx, baseY, "home_hub").setOrigin(0.5, 1).setScale(7);
      const light = this.add.rectangle(cx + 4 * 7 - 4, baseY - 7 * 3.5, 14, 7, COLORS.red);
      this.tweens.add({ targets: light, alpha: 0.2, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      out.push(hub, light);
    }
    return out;
  }

  // pagina 2

  createTeamPage() {
    const { width } = this.scale;
    const page = this.add.container(0, 0);
    const x = width / 2 - 340;
    const g = this.add.graphics();
    dropShadow(g, x, 64, 680, 424, 8);
    drawPanel(g, x, 64, 680, 424, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, 64, 680, 28);
    const items = [g, pixelText(this, x + 14, 72, "CREDITI", { size: 8, color: COLORS.paper })];

    // logotipo pixel, con il 2 a pedice
    const scale = 5;
    const widths = TITLE_WORD.map((name) => this.textures.get(`title_${name}`).getSourceImage().width);
    const total = widths.reduce((sum, w, i) => sum + (w + (TITLE_WORD[i] === "two" ? 1 : 2)) * scale, 0);
    let lx = width / 2 - total / 2;
    TITLE_WORD.forEach((name, i) => {
      items.push(this.add.image(lx + scale, 104 + scale, `title_${name}_sh`).setOrigin(0, 0).setScale(scale));
      items.push(this.add.image(lx, 104, `title_${name}`).setOrigin(0, 0).setScale(scale));
      lx += (widths[i] + (name === "two" ? 1 : 2)) * scale;
    });
    items.push(bodyText(this, width / 2, 194, "una macchina comunicativa del progetto BIODOM+", { size: 22, color: COLORS.steel, origin: 0.5 }));

    // il team
    items.push(pixelText(this, width / 2, 226, "IL TEAM", { size: 8, color: COLORS.steel, origin: 0.5 }));
    // pedana a retino e il team: respirano, sbattono le palpebre e ogni tanto salutano
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + 60, 322, 560, 4);
    ditherRect(g, x + 60, 326, 560, 6, COLORS.panelLight, 6, 2);
    TEAM.forEach(({ key }, i) => {
      const px = width / 2 - 250 + i * 100;
      const shadow = this.add.graphics();
      ditherRect(shadow, px - 24, 318, 48, 6, COLORS.ink, 6, 2, 0.35);
      const sprite = this.add.image(px, 322, key).setOrigin(0.5, 1).setScale(4);
      // respiro: si allunga di un pixel e torna
      this.tweens.add({ targets: sprite, scaleY: 4.2, duration: 900 + i * 60, delay: i * 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      const loop = () => {
        if (!sprite.active) return;
        const roll = Math.random();
        if (roll < 0.35) {
          // saluto con un saltello
          sprite.setTexture(`${key}_wave`);
          this.tweens.add({ targets: sprite, y: 314, duration: 140, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
          this.time.delayedCall(900, () => sprite.active && sprite.setTexture(key));
        } else {
          sprite.setTexture(`${key}_blink`);
          this.time.delayedCall(140, () => sprite.active && sprite.setTexture(key));
        }
        this.time.delayedCall(Phaser.Math.Between(1600, 3800), loop);
      };
      this.time.delayedCall(600 + i * 350, loop);
      items.push(shadow, sprite);
    });

    const rows = [
      ["UN PROGETTO DI", "BIODOM · Laboratorio di Sintesi, Politecnico di Milano"],
      ["SVILUPPO", "Phaser + Elegoo UNO R3"],
      ["FONT", "VT323 (SIL Open Font License)"]
    ];
    rows.forEach(([label, value], i) => {
      const y = 340 + i * 38;
      items.push(pixelText(this, width / 2, y, label, { size: 8, color: COLORS.steel, origin: 0.5 }));
      items.push(bodyText(this, width / 2, y + 18, value, { size: 22, color: COLORS.ink, origin: 0.5, fit: 640 }));
    });

    // ringraziamento dentro la scheda, con un filetto e spazio prima del bordo
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(width / 2 - 120, 456, 240, 2);
    items.push(bodyText(this, width / 2, 470, "Grazie per aver giocato.", { size: 20, color: COLORS.steel, origin: 0.5 }));
    page.add(items);
    return page;
  }
}
