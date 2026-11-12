// sprite pixel-art generati via codice (nessun file immagine necessario)

// proporzioni "chibi" come nelle tavole
// lettere extra: L = riflesso dei capelli, d = ombra dei capelli, w = luce negli occhi,
// c = guance, n = ombra del collo, t = colletto, B = piega dei pantaloni, K = suola
const HERO = [
  "....hhhhhh....",
  "..hhLLLhhhhh..",
  ".hhLLhhhhhhhd.",
  ".hLhhhhhhhhhd.",
  ".hhsssssssshd.",
  ".hssssssssssd.",
  ".hssEwssEwssh.",
  ".hssEEssEEssh.",
  "..scsssssscs..",
  "...ssSSSSss...",
  "....snnnns....",
  "...rrttttrr...",
  "..rrrrttrrrr..",
  ".srrrrrrrrrrs.",
  ".srrrrrrrrrrs.",
  "..RRRRRRRRRR..",
  "...bbbbbbbb...",
  "...bbbBBbbb...",
  "...bbb..bbb...",
  "...bbB..bbB...",
  "..kkkK..kkkK.."
];

// frame di animazione
const withRows = (rows, changes) =>
  rows.map((row, y) => (typeof changes[y] === "function" ? changes[y](row) : changes[y] ?? row));
const FRAME_ROWS = {
  // passo visto di fronte, ciclo a 4 frame: appoggio sx, passaggio, appoggio dx, passaggio.
  // nei frame di appoggio un piede è sollevato e le braccia oscillano in direzioni opposte;
  // nei frame di passaggio le gambe si riuniscono e il corpo si abbassa di un pixel
  w1: { 12: "..rrrrrrrrrrr.", 13: ".srrrrrrrrrrs.", 14: "..RRRRRRRRRRs.", 19: "..kkkk..bbb...", 20: "........kkkk.." },
  w2: { 12: ".rrrrrrrrrrr..", 13: ".srrrrrrrrrrs.", 14: ".sRRRRRRRRRR..", 19: "...bbb..kkkk..", 20: "..kkkk........" },
  // passaggio: la testa scende di una riga (la costruisce passRows), gambe unite
  p1: { 13: ".srrrrrrrrrrs.", 14: ".srrrrrrrrrrs.", 18: "....bbbbbb....", 19: "....bbBBbb....", 20: "...kkkkkkkK..." },
  p2: { 13: ".srrrrrrrrrrs.", 14: ".srrrrrrrrrrs.", 18: "....bbbbbb....", 19: "....bbBBbb....", 20: "...kkkkkkkK..." },
  // seduto: cosce in avanti (pantaloni più larghi), piedi appoggiati, gambe accorciate
  sit: { 16: "..bbbbbbbbbb..", 17: "..bbBbbbbBbb..", 18: "..kkkK..kkkK..", 19: "..............", 20: ".............." },
  // seduto mentre porta il cibo alla bocca: braccio destro piegato verso il viso
  sitEat: { 10: "....ssssss.s..", 11: "...rrrrrrrrs..", 12: "..rrrrrrrrrrs.", 13: ".srrrrrrrrrr..", 14: ".sRRRRRRRRRR..", 16: "..bbbbbbbbbb..", 17: "..bbBbbbbBbb..", 18: "..kkkK..kkkK..", 19: "..............", 20: ".............." },
  // respiro da fermo: spalle leggermente più basse
  idle: { 11: "....rttttr....", 13: ".srrrrrrrrrrs." },
  // azione
  act: { 12: "..rrrrrrrrrrss", 13: "..rrrrrrrrrr..", 14: "..RRRRRRRRRR.." },
  // esulta
  cheer: { 9: (row) => `s${row.slice(1, -1)}s`, 10: (row) => `s${row.slice(1, -1)}s`, 11: "srrrrrrrrrrrrs", 13: "..rrrrrrrrrr..", 14: "..RRRRRRRRRR.." },
  // occhi chiusi
  blink: { 6: ".hssssssssssh.", 7: ".hssEEssEEssh." }
};

// variante con mascherina, per quando si è all'aperto
const HERO_MASKED = HERO.map((row, y) => {
  if (y === 8) return "..sMMMMMMMMs..";
  if (y === 9) return "...MMFMMFMM...";
  if (y === 10) return "....sMMMMs....";
  return row;
});

// palette persone
const HERO_PALETTE = {
  h: "#1c2839",
  s: "#e8dccd",
  S: "#c9b8a6",
  E: "#1c2839",
  r: "#b4553f",
  R: "#8a3e2e",
  b: "#5e7f94",
  B: "#3f5a6c",
  k: "#1c2839",
  M: "#f1f0ed",
  F: "#5e7f94"
};

// varianti
const HERO_VARIANTS = {
  hero: {},
  // protagonisti per origine
  hero_delhi: { h: "#16181c", s: "#b98a6a", S: "#9a6e52", r: "#d98a4b", R: "#b06a35", b: "#dadfda", B: "#a3a9a6" },
  hero_milano: {},
  hero_reykjavik: { h: "#d8c48f", s: "#f3e6da", S: "#dcc8b6", r: "#5e7f94", R: "#163c4d", b: "#3b4f5c", B: "#2a3a45" },
  npc_old: { h: "#dadfda", r: "#7e8683", R: "#5f6663", b: "#3b4f5c", B: "#2a3a45" },
  npc_d: { h: "#16181c", s: "#c69a7a", S: "#a77c5e", r: "#9fb4c2", R: "#6f8798" },
  npc_vendor: { h: "#3a3633", r: "#f1f0ed", R: "#cdd2ce" },
  hero_nara: { h: "#3a3633", r: "#dadfda", R: "#a3a9a6", b: "#163c4d", B: "#0f2a37" },
  hero_lio: { h: "#a3a9a6", r: "#7e9c8c", R: "#5c7a6b", b: "#3b4f5c", B: "#2a3a45" },
  hero_sela: { h: "#4b4440", r: "#5e7f94", R: "#3f5a6c", b: "#1c2839", B: "#121b27" },
  npc_a: { r: "#a3a9a6", R: "#7e8683", b: "#3b4f5c", B: "#2a3a45" },
  npc_b: { h: "#4b4440", r: "#9fb4c2", R: "#6f8798", b: "#1c2839", B: "#121b27" },
  npc_c: { h: "#cdd2ce", r: "#dadfda", R: "#a3a9a6", b: "#5e7f94", B: "#3f5a6c" },
  // altri passanti: capelli, pelle e vestiti diversi
  npc_e: { h: "#7a3a2e", s: "#d9b89c", S: "#bf9c80", r: "#7fae86", R: "#2f5e4a", b: "#1c2839", B: "#121b27" },
  npc_f: { h: "#e8d29a", r: "#b4553f", R: "#8a3e2e", b: "#dadfda", B: "#a3a9a6" },
  npc_g: { h: "#3a2a20", s: "#8a6248", S: "#6e4c36", r: "#e8c66a", R: "#c9a23d", b: "#3b4f5c", B: "#2a3a45" },
  npc_h: { h: "#a3a9a6", s: "#f3e6da", S: "#dcc8b6", r: "#163c4d", R: "#0f2a37", b: "#7e8683", B: "#5f6663" }
};

const PACK = [
  "..G.G.G.",
  ".gG.GgG.",
  ".GGgGGG.",
  "cGgGGgGc",
  "TTTTTTTT",
  "TtvttttT",
  "TtwwwwtT",
  "TtwggwtT",
  "TtwwwwtT",
  "TltttttT",
  "TttttttT",
  "TTTTTTTT"
];

const PACK_PALETTE = {
  g: "#7fae86",
  G: "#2f5e4a",
  T: "#163c4d",
  t: "#2c566a",
  w: "#cdd2ce",
  c: "#9fb4c2",
  v: "#b4553f",
  l: "#9fd4b0"
};

// sansevieria: foglie a spada dritte, verde scuro con bande chiare a zig-zag
const POT_PLANT = [
  ".....G......",
  ".....GG.....",
  "..G..gG.G...",
  "..GG.GgGG...",
  "..gG.GGgG.G.",
  "..GGGGgGG.GG",
  ".GgGgGGgGGgG",
  ".GGgGGgGgGG.",
  "..pppppppp..",
  "..PPPPPPPP..",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "....pppp...."
];

// vasi in "pietra" chiara come nei disegni tecnici BIODOM, foglie salvia
const PLANT_PALETTE = {
  g: "#7fae86",
  G: "#2f5e4a",
  p: "#a3a9a6",
  P: "#6e7673",
  f: "#f1f0ed"
};

// sansevieria con lo stelo fiorito
const FLOWER_PLANT = [
  ".....G...f..",
  ".....GG..f..",
  "..G..gG.Gf..",
  "..GG.GgGGf..",
  "..gG.GGgG.G.",
  "..GGGGgGG.GG",
  ".GgGgGGgGGgG",
  ".GGgGGgGgGG.",
  "..pppppppp..",
  "..PPPPPPPP..",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "....pppp...."
];

const TALL_PLANT = [
  ".....G......",
  ".....GG.....",
  ".....Gg.....",
  ".....GG..G..",
  ".....Gg..GG.",
  "..G..GG..gG.",
  "..GG.Gg.GGg.",
  "..gG.GG.GgG.",
  "..GgGGgGGGG.",
  ".GGGgGGGgG..",
  ".GgGGGgGGG..",
  "..pppppppp..",
  "..PPPPPPPP..",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "....pppp...."
];

const CAN = [
  "...kkk......",
  "..k...k.....",
  ".cccccccc..c",
  ".ccCCcccc.c.",
  ".cccccccccc.",
  ".cccccccc...",
  ".cccccccc...",
  "..CCCCCC...."
];

const BOTTLE = ["..kk..", "..ww..", ".wwww.", "wbbbbw", "wbbbbw", "wbbbbw", "wbbbbw", "wbbbbw", ".wwww."];

// foglia di sansevieria tagliata: lama stretta a bande
const LEAF = ["....gG", "..GgG.", ".GgG..", "GG...."];

const BATTERY = ["kkkkkkkkk.", "kgggggggkk", "kgggggggkk", "kkkkkkkkk."];

// active Pack
const ACTIVE_PACK = [
  ".kkkkkkkkkk.",
  "kwwyywwwwwwk",
  "kwggGgggGgwk",
  "kwgGgggGggwk",
  "kwggggGgggwk",
  "kwgGgggggGwk",
  "kwwwwwwwwwwk",
  ".kkkkkkkkkk."
];

// home Hub
const HOME_HUB = [
  "kkkkkkkkkkkkkkkk",
  "kwwwwwwwwwwwwwwk",
  "kwwwwwgGgwwwwwwk",
  "kwwwwgGGGgwwwwwk",
  "kwwwgGGgGGgwwwwk",
  "kwwwwgGGGgwwwwwk",
  "kwwwwwwtwwwwwwwk",
  "kwwwwwwtwwwwwwwk",
  "kwwwwppppppwwwwk",
  "kwwwwwPPPPwwwwwk",
  "kkkkkkkkkkkkkkkk",
  "kssssssssssssssk",
  "ksbbsbbsbbssrrsk",
  "kssssssssssssssk",
  "kkkkkkkkkkkkkkkk",
  ".kk..........kk."
];

// logotipo "o₂rigin"
const TITLE_GLYPHS = {
  o: ["", "", "..####..", ".######.", "##....##", "##....##", "##....##", ".######.", "..####.."],
  two: ["", "", "", "", "", "", ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  r: ["", "", "##.####", "#######", "###....", "##.....", "##.....", "##.....", "##....."],
  i: ["##", "##", "", "##", "##", "##", "##", "##", "##"],
  g: ["", "", "..######", ".#######", "##....##", "##....##", "##....##", ".#######", "..######", "......##", "#######.", ".#####.."],
  n: ["", "", "##.####.", "########", "###...##", "##....##", "##....##", "##....##", "##....##"]
};
export const TITLE_WORD = ["o", "two", "r", "i", "g", "i", "n"];

function glyphRows(rows) {
  const width = Math.max(...rows.map((r) => r.length), 1);
  const out = [];
  for (let y = 0; y < 13; y += 1) out.push((rows[y] ?? "").padEnd(width, "."));
  return out;
}

const HEART = [
  ".rr.rr.",
  "rrrrrrr",
  "rrrrrrr",
  ".rrrrr.",
  "..rrr..",
  "...r..."
];

const FLAG_IT = Array(9).fill("ggggwwwwrrrr");
const FLAG_IN = [
  "oooooooooooo",
  "oooooooooooo",
  "oooooooooooo",
  "wwwwwwwwwwww",
  "wwwwwbbwwwww",
  "wwwwwwwwwwww",
  "gggggggggggg",
  "gggggggggggg",
  "gggggggggggg"
];
const FLAG_IS = [
  "BBBwrwBBBBBB",
  "BBBwrwBBBBBB",
  "BBBwrwBBBBBB",
  "wwwwrwwwwwww",
  "rrrrrrrrrrrr",
  "wwwwrwwwwwww",
  "BBBwrwBBBBBB",
  "BBBwrwBBBBBB",
  "BBBwrwBBBBBB"
];

const CHECK = ["......w", ".....w.", "w...w..", ".w.w...", "..w...."];
const CROSS = ["w...w", ".w.w.", "..w..", ".w.w.", "w...w"];

export function makeTexture(scene, key, rows, palette) {
  if (scene.textures.exists(key)) {
    return;
  }
  const width = Math.max(...rows.map((row) => row.length));
  const texture = scene.textures.createCanvas(key, width, rows.length);
  const ctx = texture.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = palette[char];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });
  texture.refresh();
}

// variante donna: capelli lunghi che scendono ai lati del viso fino alle spalle.
// si applica sopra qualsiasi frame (off = 1 nei frame di passaggio, dove la testa è più bassa)
function longHair(rows, off = 0) {
  const paint = (row, cols) => [...row].map((c, x) => (cols.includes(x) && (c === "." || c === "s") ? "h" : c)).join("");
  return rows.map((row, y) => {
    const r = y - off;
    if (r === 8) return paint(row, [1, 12]);
    if (r === 9 || r === 10) return paint(row, [1, 2, 11, 12]);
    if (r === 11) return paint(row, [1, 2, 11, 12]);
    if (r === 12 && off === 0) return paint(row, [1, 12]);
    // outfit: gonna a pieghe al posto dei pantaloni, gambe scoperte
    if (y === 16) return "..BBBBBBBBBB..";
    if (y === 17) return ".bBbBbBbBbBbB.";
    if (y === 18 || y === 19) return row.replaceAll("b", "s").replaceAll("B", "S");
    return row;
  });
}

// colori di rifinitura ricavati dalla palette della variante, così valgono per tutti i personaggi
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}
function shaded(palette) {
  return {
    ...palette,
    L: mix(palette.h, "#ffffff", 0.22),
    d: mix(palette.h, "#000000", 0.25),
    w: "#f1f0ed",
    c: mix(palette.s, "#d0685a", 0.3),
    n: palette.S,
    t: mix(palette.r, "#ffffff", 0.35),
    K: mix(palette.k, "#ffffff", 0.3)
  };
}

let currentGender = "m";
export function setGender(gender) {
  currentGender = gender === "f" ? "f" : "m";
}
export function getGender() {
  return currentGender;
}

export function registerPixelTextures(scene) {
  for (const [key, overrides] of Object.entries(HERO_VARIANTS)) {
    const palette = shaded({ ...HERO_PALETTE, ...overrides });
    const sheets = [["", HERO, 0], ["_mask", HERO_MASKED, 0]];
    for (const [frame, changes] of Object.entries(FRAME_ROWS)) {
      const off = frame.startsWith("p") ? 1 : 0;
      // nei frame di passaggio testa e mascherina scendono di una riga
      const passRows = (rows) => ["..............", ...rows.slice(0, 10), ...rows.slice(11)];
      sheets.push([`_${frame}`, withRows(off ? passRows(HERO) : HERO, changes), off]);
      const masked = off ? { ...changes, 11: "..rrsMMMMsrr.." } : changes;
      sheets.push([`_mask_${frame}`, withRows(off ? passRows(HERO_MASKED) : HERO_MASKED, masked), off]);
    }
    sheets.forEach(([suffix, rows, off]) => {
      makeTexture(scene, `${key}${suffix}`, rows, palette);
      // protagonisti e passanti hanno anche la versione donna (stesso set di frame)
      if (key !== "npc_vendor" && key !== "npc_old") makeTexture(scene, `${key}_f${suffix}`, longHair(rows, off), palette);
    });
  }
  makeTexture(scene, "pack", PACK, PACK_PALETTE);
  makeTexture(scene, "pot_plant", POT_PLANT, PLANT_PALETTE);
  makeTexture(scene, "pot_flower", FLOWER_PLANT, PLANT_PALETTE);
  makeTexture(scene, "plant_tall", TALL_PLANT, { ...PLANT_PALETTE, p: "#2c566a", P: "#163c4d" });
  makeTexture(scene, "can", CAN, { k: "#163c4d", c: "#5e7f94", C: "#3f5a6c" });
  makeTexture(scene, "bottle", BOTTLE, { k: "#163c4d", w: "#dadfda", b: "#9fb4c2" });
  makeTexture(scene, "leaf_good", LEAF, { g: "#7fae86", G: "#2f5e4a" });
  makeTexture(scene, "leaf_bad", LEAF, { g: "#a88a5a", G: "#6e5434" });
  makeTexture(scene, "battery", BATTERY, { k: "#163c4d", g: "#7e9c8c" });
  makeTexture(scene, "active_pack", ACTIVE_PACK, { k: "#163c4d", w: "#dfe7ea", g: "#7e9c8c", G: "#3f6560", y: "#e8c66a" });
  makeTexture(scene, "home_hub", HOME_HUB, { k: "#163c4d", w: "#dfe7ea", g: "#7e9c8c", G: "#3f6560", t: "#6e5434", p: "#a3a9a6", P: "#6e7673", s: "#5e7f94", b: "#163c4d", r: "#b4553f" });
  for (const [name, rows] of Object.entries(TITLE_GLYPHS)) {
    const full = glyphRows(rows);
    makeTexture(scene, `title_${name}`, full, { "#": name === "two" ? "#5e7f94" : "#163c4d" });
    // ombra a retino (un pixel sì e uno no)
    const shadow = full.map((row, y) => [...row].map((ch, x) => (ch === "#" && (x + y) % 2 === 0 ? "#" : ".")).join(""));
    makeTexture(scene, `title_${name}_sh`, shadow, { "#": "#9fb4c2" });
  }
  makeTexture(scene, "heart", HEART, { r: "#b4553f" });
  makeTexture(scene, "flag_it", FLAG_IT, { g: "#5c7a6b", w: "#f1f0ed", r: "#b4553f" });
  makeTexture(scene, "flag_in", FLAG_IN, { o: "#d98a4b", w: "#f1f0ed", b: "#163c4d", g: "#5c7a6b" });
  makeTexture(scene, "flag_is", FLAG_IS, { B: "#2c566a", w: "#f1f0ed", r: "#b4553f" });
  makeTexture(scene, "check", CHECK, { w: "#f1f0ed" });
  makeTexture(scene, "cross", CROSS, { w: "#f1f0ed" });
}

// sprite del protagonista in base all'origine
export function characterTexture(originId, masked = false, gender) {
  const base = HERO_VARIANTS[`hero_${originId}`] ? `hero_${originId}` : "hero_milano";
  const key = (gender ?? currentGender) === "f" ? `${base}_f` : base;
  return masked ? `${key}_mask` : key;
}

// passanti generici: pesca un aspetto (e un genere) non ancora usato nella scena
const CROWD = ["npc_a", "npc_b", "npc_c", "npc_d", "npc_e", "npc_f", "npc_g", "npc_h", "hero_nara", "hero_lio", "hero_sela"];
export function crowdTexture(scene, masked = true) {
  scene.crowdUsed ??= new Set();
  const options = [];
  CROWD.forEach((base) => ["", "_f"].forEach((g) => options.push(`${base}${g}`)));
  const free = options.filter((k) => !scene.crowdUsed.has(k));
  const key = free.length ? free[Math.floor(Math.random() * free.length)] : options[Math.floor(Math.random() * options.length)];
  scene.crowdUsed.add(key);
  return masked ? `${key}_mask` : key;
}

// aspetto a caso per le comparse lontane (non consuma quelli dei passanti in primo piano)
export function randomCrowdKey(masked = true) {
  const base = CROWD[Math.floor(Math.random() * CROWD.length)] + (Math.random() < 0.5 ? "_f" : "");
  return masked ? `${base}_mask` : base;
}
