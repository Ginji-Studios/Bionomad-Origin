import Phaser from "../phaser.js";
import { addTopBar, bodyText, COLORS, drawPanel, dropShadow, goTo, paperGrid, pixelDisc, pixelText, textChip } from "../ui/theme.js";

// Crediti in due pagine: 1) chi è BIODOM e i suoi prodotti, 2) chi ha fatto il gioco.
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

    this.dots = this.add.graphics();
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
    this.tweens.add({ targets: current, x: -dir * width * 0.3, alpha: 0, duration: 260, ease: "Cubic.easeIn" });
    incoming.setX(dir * width * 0.3);
    this.tweens.add({ targets: incoming, x: 0, alpha: 1, duration: 320, delay: 120, ease: "Cubic.easeOut" });
    this.page = next;
    this.drawDots();
  }

  drawDots() {
    const { width, height } = this.scale;
    this.dots.clear();
    this.pages.forEach((_, i) => {
      this.dots.fillStyle(i === this.page ? COLORS.ink : COLORS.stone, 1);
      this.dots.fillRect(width / 2 - 20 + i * 28, height - 30, 12, 12);
    });
  }

  // ---------- Pagina 1: BIODOM ----------

  createBiodomPage() {
    const page = this.add.container(0, 0);
    const items = [];
    items.push(pixelText(this, 40, 62, "BIONOMAD SYSTEM", { size: 24, color: COLORS.ink, shadow: true }));
    items.push(bodyText(this, 40, 96, BIODOM_TEXT, { size: 22, color: COLORS.steel, wrap: 880, lineSpacing: -2 }));

    PRODUCTS.forEach((product, i) => {
      const x = 40 + i * 300;
      const y = 166;
      const w = 280;
      const h = 322;
      const g = this.add.graphics();
      dropShadow(g, x, y, w, h, 6);
      drawPanel(g, x, y, w, h, { fill: COLORS.paper, border: COLORS.ink });
      g.fillStyle(COLORS.ink, 1);
      g.fillRect(x, y, w, 26);
      items.push(g);
      items.push(pixelText(this, x + 10, y + 9, `${product.code} ${product.name}`, { size: 8, color: COLORS.paper }));

      // Riquadro illustrazione con mirino "+" come nelle tavole BIODOM
      const art = this.add.graphics();
      drawPanel(art, x + 14, y + 38, w - 28, 128, { fill: COLORS.bg, border: COLORS.panelLight });
      art.fillStyle(COLORS.steel, 1);
      art.fillRect(x + w - 30, y + 46, 2, 10);
      art.fillRect(x + w - 34, y + 50, 10, 2);
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
      // Tubo dallo zaino alla mascherina
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
      // Bollicine di micro-alghe
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

  // ---------- Pagina 2: team ----------

  createTeamPage() {
    const { width } = this.scale;
    const page = this.add.container(0, 0);
    const g = this.add.graphics();
    const x = width / 2 - 280;
    dropShadow(g, x, 74, 560, 380, 8);
    drawPanel(g, x, 74, 560, 380, { fill: COLORS.paper, border: COLORS.ink });
    g.fillStyle(COLORS.ink, 1);
    g.fillRect(x, 74, 560, 28);

    const items = [g, pixelText(this, x + 14, 84, "O2RIGIN · CREDITI", { size: 8, color: COLORS.paper })];
    items.push(pixelText(this, width / 2, 138, "O2RIGIN", { size: 32, color: COLORS.ink, origin: 0.5, shadow: true }));
    items.push(bodyText(this, width / 2, 172, "una macchina comunicativa del progetto BIODOM+", { size: 22, color: COLORS.steel, origin: 0.5 }));

    const rows = [
      ["UN PROGETTO DI", "BIODOM"],
      ["CONTESTO", "Laboratorio di Sintesi · Politecnico di Milano"],
      ["SVILUPPO", "Phaser + Elegoo UNO R3"],
      ["FONT", "Press Start 2P · VT323 (SIL OFL)"]
    ];
    rows.forEach(([label, value], i) => {
      const y = 214 + i * 54;
      items.push(pixelText(this, width / 2, y, label, { size: 8, color: COLORS.steel, origin: 0.5 }));
      items.push(bodyText(this, width / 2, y + 22, value, { size: 28, color: COLORS.ink, origin: 0.5, fit: 520 }));
    });

    const plantL = this.add.image(x + 50, 444, "pot_flower").setOrigin(0.5, 1).setScale(4);
    const plantR = this.add.image(x + 510, 444, "pot_plant").setOrigin(0.5, 1).setScale(4);
    this.tweens.add({ targets: [plantL, plantR], scaleY: 4.2, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    items.push(plantL, plantR);
    items.push(bodyText(this, width / 2, 482, "Grazie per aver giocato.", { size: 26, color: COLORS.steel, origin: 0.5 }));

    page.add(items);
    return page;
  }
}
