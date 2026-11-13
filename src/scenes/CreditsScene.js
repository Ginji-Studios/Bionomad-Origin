import Phaser from "../phaser.js";
import { TEAM } from "../ui/teamSprites.js";
import { TITLE_WORD } from "../ui/pixelSprites.js";
import { updateHose } from "../entities/Player.js";
import { bandGradient, brandMarks, ditherRect, addTopBar, bodyText, COLORS, hex, drawPanel, dropShadow, goTo, paperGrid, pixelDisc, pixelText, textChip } from "../ui/theme.js";

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
      // riquadro "fotografia" come nella selezione del personaggio: cielo azzurro a bande,
      // profilo di palazzi a retino, strada scura e grana chiara sopra
      const art = this.add.graphics();
      const ax = x + 14;
      const ay = y + 38;
      const aw = w - 28;
      const ah = 128;
      bandGradient(art, ax, ay, aw, ah, [0x9fb4c2, 0x86a0b2, 0x6f8ea2, 0x5e7f94]);
      for (let k = 0, bx = ax; bx < ax + aw; k += 1) {
        const bw = 14 + ((i * 31 + k * 17) % 20);
        const bh = 30 + ((i * 13 + k * 29) % 50);
        ditherRect(art, bx, ay + ah - 20 - bh, Math.min(bw, ax + aw - bx), bh, 0x3f5a6c, 10, 2);
        bx += bw + 2;
      }
      art.fillStyle(0x2c3e52, 1);
      art.fillRect(ax, ay + ah - 20, aw, 20);
      ditherRect(art, ax, ay + ah - 26, aw, 6, 0x2c3e52, 8, 2);
      ditherRect(art, ax, ay, aw, ah, COLORS.paper, 2, 2, 0.5);
      art.lineStyle(2, COLORS.ink, 1);
      art.strokeRect(ax, ay, aw, ah);
      items.push(art, ...this.drawProductArt(product.art, x + w / 2, y + 160));

      items.push(bodyText(this, x + 14, y + 174, product.text, { size: 20, color: COLORS.ink, wrap: w - 28, lineSpacing: -3 }));
    });

    page.add(items);
    return page;
  }

  drawProductArt(type, cx, baseY) {
    const out = [];
    if (type === "backpack") {
      // lo stesso protagonista del gioco, con spallacci, tubo e ossigeno che esce dalla pianta
      const hero = this.add.container(cx + 10, baseY);
      const pack = this.add.image(-30, -24, "pack").setOrigin(0.5, 1).setScale(4);
      const body = this.add.image(0, 0, "hero_milano_mask").setOrigin(0.5, 1).setScale(4);
      hero.add([pack, body]);
      const walker = { scene: this, pack, sprite: body, baseTexture: "hero_milano_mask" };
      this.time.addEvent({ delay: 33, loop: true, callback: () => hero.active && updateHose(walker, 33) });
      this.tweens.add({ targets: [body], y: -3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      out.push(hero);
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
      const light = this.add.rectangle(cx + 4 * 7 - 4, baseY - 7 * 3.5, 14, 7, 0x9fd4b0);
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
    // "una macchina comunicativa del progetto" + logo vero di biodom+ in pixel, sulla stessa linea di base
    const claim = bodyText(this, 0, 188, "una macchina comunicativa del progetto", { size: 18, color: COLORS.steel });
    const logoW = this.textures.get("logo_biodom_s").getSourceImage().width;
    const claimX = Math.round(width / 2 - (claim.width + 8 + logoW) / 2);
    claim.setX(claimX);
    // logo piccolo: le aste di b e d alte come le maiuscole del testo, stessa linea di base
    const logo = this.add.image(claimX + claim.width + 8, 188 + 5, "logo_biodom_s").setOrigin(0, 0).setTint(COLORS.steel);
    items.push(claim, logo);
    // crocette del marchio agli angoli della scheda
    items.push(brandMarks(this, x, 64, 680, 424, { color: COLORS.steel, lines: false, gap: 6 }));

    // il team
    items.push(pixelText(this, width / 2, 218, "IL TEAM", { size: 8, color: COLORS.steel, origin: 0.5 }));
    // pedana a retino e il team: respirano, sbattono le palpebre e ogni tanto salutano
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRect(x + 60, 322, 560, 4);
    ditherRect(g, x + 60, 326, 560, 6, COLORS.panelLight, 6, 2);
    TEAM.forEach(({ key }, i) => {
      const px = width / 2 - 250 + i * 100;
      const shadow = this.add.graphics();
      ditherRect(shadow, px - 24, 318, 48, 6, COLORS.ink, 6, 2, 0.35);
      const member = this.add.container(px, 322);
      const sprite = this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(4);
      member.add(sprite);
      // respiro: si allunga di un pixel e torna
      this.tweens.add({ targets: sprite, scaleY: 4.2, duration: 900 + i * 60, delay: i * 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      const loop = () => {
        if (!sprite.active) return;
        const roll = Math.random();
        if (roll < 0.35) {
          // saluto con un saltello
          sprite.setTexture(`${key}_wave`);
          this.tweens.add({ targets: member, y: 314, duration: 140, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
          this.time.delayedCall(900, () => sprite.active && sprite.setTexture(key));
        } else {
          sprite.setTexture(`${key}_blink`);
          this.time.delayedCall(140, () => sprite.active && sprite.setTexture(key));
        }
        this.time.delayedCall(Phaser.Math.Between(1600, 3800), loop);
      };
      this.time.delayedCall(600 + i * 350, loop);
      items.push(shadow, member);
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
