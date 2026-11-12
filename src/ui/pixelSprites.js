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

// colore del contorno dei personaggi
// (niente contorno: i personaggi restano nello stile pieno delle tavole)
const CHAR_OUTLINE = null;

// piante negli zaini dei passanti: solo il protagonista ha la sansevieria
const PACK_PLANTS = {
  fern: ["..g..g..", ".gGggGg.", "gGgGGgGg", "cGgGGgGc"],
  succulent: ["........", "...uu...", ".uUuuUu.", "cuUuuUuc"],
  pothos: ["..gG....", ".gGgGg..", "gGgGgGgg", "gGGGGGGg"],
  cactus: ["...o....", "..kkk.k.", ".kkkkkk.", "ckkKkkKc"],
  lavender: [".p..p.p.", ".pGp.pG.", "..GgGgG.", "cGgGGgGc"],
  geranium: [".oo..oo.", "oOGooGOo", ".GgGGgG.", "cGgGGgGc"],
  monstera: [".GG..gg.", "GgGGggGg", ".GgGGgG.", "cGgGGgGc"],
  basil: ["..gggg..", ".gGggGg.", "ggGggGgg", "cGgGGgGc"]
};
export const PACK_KEYS = Object.keys(PACK_PLANTS).map((k) => `pack_${k}`);
export function randomPackKey() {
  return PACK_KEYS[Math.floor(Math.random() * PACK_KEYS.length)];
}

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

export function makeTexture(scene, key, rows, palette, { outline = null } = {}) {
  if (scene.textures.exists(key)) {
    return;
  }
  const pad = outline ? 1 : 0;
  const width = Math.max(...rows.map((row) => row.length));
  const texture = scene.textures.createCanvas(key, width + pad * 2, rows.length + pad * 2);
  const ctx = texture.getContext();
  const solid = (x, y) => y >= 0 && y < rows.length && x >= 0 && !!palette[rows[y][x]];
  rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = palette[char];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + pad, y + pad, 1, 1);
      }
    });
  });
  // contorno scuro di un pixel: separa i personaggi dagli sfondi e li rende leggibili
  if (outline) {
    ctx.fillStyle = outline;
    for (let y = -1; y <= rows.length; y += 1) {
      for (let x = -1; x <= width; x += 1) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x + pad, y + pad, 1, 1);
      }
    }
  }
  texture.refresh();
}

// outfit: ogni personaggio ha un suo taglio di vestiti, non solo colori diversi.
// si applica sopra qualsiasi frame. y / Y = colore d'accento (righe, cappello, sciarpa), i = maglia sotto
function applyOutfit(rows, outfit, off = 0) {
  if (!outfit) return rows;
  const out = rows.map((row) => [...row]);
  const swap = (y, cols, from, to) => {
    if (!out[y]) return;
    out[y].forEach((c, x) => {
      if ((cols === null || cols.includes(x)) && from.includes(c)) out[y][x] = to;
    });
  };
  const all = null;
  const center = [4, 5, 6, 7, 8, 9];
  switch (outfit.top) {
    case "jacket": // giacca aperta con la maglia sotto e il colletto rialzato
      for (let y = 11; y <= 15; y += 1) swap(y, [6, 7], "rRt", "i");
      swap(11, [4, 9], "rt", "R");
      break;
    case "stripes": // maglione a righe
      swap(12, all, "r", "y");
      swap(14, all, "r", "y");
      break;
    case "hoodie": // felpa col cappuccio sulle spalle e la tasca davanti
      swap(11, all, "rt", "y");
      swap(14, [5, 6, 7, 8], "r", "Y"); // tasca dritta, senza la forma a U
      break;
    case "overalls": // salopette sopra la maglia
      for (let y = 12; y <= 15; y += 1) swap(y, center, "rRt", "b");
      swap(11, [4, 9], "rt", "B");
      swap(13, [6, 7], "b", "Y");
      break;
    case "coat": // cappotto lungo fino alle ginocchia, con i bottoni
      swap(15, all, "R", "r");
      swap(16, all, "bB", "r");
      swap(17, all, "bB", "R");
      [12, 14, 16].forEach((y) => swap(y, [7], "r", "Y"));
      break;
    case "vest": // gilet imbottito sopra la maglia
      for (let y = 12; y <= 15; y += 1) swap(y, [2, 3, 10, 11], "rR", "y");
      for (let y = 12; y <= 15; y += 1) swap(y, [6], "r", "Y");
      break;
    default:
      break;
  }
  if (outfit.neck === "scarf") {
    swap(11, all, "rt", "y");
    swap(12, [9], "r", "Y");
    swap(13, [9], "r", "Y");
  }
  // copricapo: la testa scende di una riga nei frame di passaggio
  if (outfit.head === "beanie") {
    swap(0 + off, all, "hLd", "y");
    swap(1 + off, all, "hLd", "y");
    swap(2 + off, all, "hLd", "Y");
  } else if (outfit.head === "cap") {
    swap(0 + off, all, "hLd", "y");
    swap(1 + off, all, "hLd", "y");
    swap(2 + off, [8, 9, 10, 11, 12, 13], "hLd", "Y");
    if (out[2 + off] && out[2 + off][13] === ".") out[2 + off][13] = "Y";
  }
  return out.map((row) => row.join(""));
}

// acconciature: sostituiscono le righe della testa (scendono di una riga nei frame di passaggio)
const HAIR_STYLES = {
  short: null,
  spiky: { 0: "...h.hh.hh.h..", 1: "..hhhLhhLhhh..", 2: ".hhLLhhhhhhhd." },
  curly: {
    0: "...hhhhhhhh...",
    1: ".hhhLhhhLhhhh.",
    2: "hhLhhLhhhLhhdh",
    3: "hLhhhhhhhhhhdh",
    4: "hhhsssssssshdh",
    5: "hhssssssssssdh"
  },
  buzz: { 0: "..............", 1: "...hhhhhhhh...", 2: "..hhhhhhhhhd..", 3: ".hhhhhhhhhhhd." },
  bangs: { 3: ".hLLhhhhhhhhd.", 4: ".hhhhhhhhhhhd.", 5: ".hhsssssssshd." },
  sidepart: { 1: "..hhhhLLLhhh..", 2: ".hhhhhhLLhhhd.", 3: ".hhhhhhhhLhhd.", 4: ".hhhhsssssshd." },
  ponytail: { 4: ".hhsssssssshdh", 5: ".hssssssssssdh", 6: ".hssEwssEwsshh", 7: ".hssEEssEEsshh", 8: "..scsssssscs.h" },
  bun: { 0: ".....hLLh.....", 1: "..hhhhhhhhhh.." }
};
function applyHair(rows, style, off = 0) {
  const map = HAIR_STYLES[style];
  if (!map) return rows;
  return rows.map((row, y) => {
    const r = y - off;
    if (!(r in map)) return row;
    // tieni gli occhi chiusi del frame blink e le modifiche del frame sulla faccia
    const next = map[r];
    return [...next].map((c, x) => (c === "s" || c === "E" || c === "w" || c === "c" ? row[x] ?? c : c)).join("");
  });
}

// outfit dei personaggi principali e dei passanti fissi: ognuno il suo
const OUTFITS = {
  hero: { top: "jacket" },
  hero_milano: { hair: "sidepart", top: "jacket", neck: "scarf", y: "#5e7f94", Y: "#3f5a6c", i: "#dadfda" },
  hero_delhi: { hair: "short", top: "coat", y: "#e8c66a", Y: "#c9a23d" },
  hero_reykjavik: { hair: "short", top: "hoodie", head: "beanie", y: "#b4553f", Y: "#8a3e2e" },
  hero_nara: { hair: "bangs", top: "overalls", y: "#e8c66a", Y: "#c9a23d" },
  hero_lio: { hair: "spiky", top: "stripes", y: "#f1f0ed", Y: "#cdd2ce" },
  hero_sela: { hair: "curly", top: "coat", neck: "scarf", y: "#b4553f", Y: "#8a3e2e" },
  npc_old: { hair: "buzz", top: "vest", head: "cap", y: "#6e5434", Y: "#523e26" },
  npc_vendor: { top: "overalls", y: "#f1f0ed", Y: "#cdd2ce" },
  npc_a: { hair: "spiky", top: "hoodie", y: "#5e7f94", Y: "#3f5a6c" },
  npc_b: { hair: "bun", top: "jacket", i: "#f1f0ed" },
  npc_c: { hair: "buzz", top: "stripes", y: "#163c4d", Y: "#0f2a37" },
  npc_d: { hair: "curly", top: "tee", neck: "scarf", y: "#d98a4b", Y: "#b06a35" },
  npc_e: { hair: "ponytail", top: "overalls", y: "#e8c66a", Y: "#c9a23d" },
  npc_f: { hair: "bangs", top: "coat", y: "#e8c66a", Y: "#c9a23d" },
  npc_g: { top: "hoodie", head: "cap", y: "#163c4d", Y: "#0f2a37" },
  npc_h: { top: "jacket", head: "beanie", y: "#b4553f", Y: "#8a3e2e", i: "#9fb4c2" }
};
function outfitPalette(outfit) {
  const pal = { y: "#dadfda", Y: "#a3a9a6", i: "#f1f0ed" };
  ["y", "Y", "i"].forEach((k) => outfit?.[k] && (pal[k] = outfit[k]));
  return pal;
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

// tutti i fotogrammi di un personaggio: [suffisso, righe, offset]
let sheetCache = null;
function heroSheets() {
  if (sheetCache) return sheetCache;
  const sheets = [["", HERO, 0], ["_mask", HERO_MASKED, 0]];
  for (const [frame, changes] of Object.entries(FRAME_ROWS)) {
    const off = frame.startsWith("p") ? 1 : 0;
    // nei frame di passaggio testa e mascherina scendono di una riga
    const passRows = (rows) => ["..............", ...rows.slice(0, 10), ...rows.slice(11)];
    sheets.push([`_${frame}`, withRows(off ? passRows(HERO) : HERO, changes), off]);
    const masked = off ? { ...changes, 11: "..rrsMMMMsrr.." } : changes;
    sheets.push([`_mask_${frame}`, withRows(off ? passRows(HERO_MASKED) : HERO_MASKED, masked), off]);
  }
  sheetCache = sheets;
  return sheets;
}

export function registerPixelTextures(scene) {
  for (const [key, overrides] of Object.entries(HERO_VARIANTS)) {
    const outfit = OUTFITS[key];
    const palette = { ...shaded({ ...HERO_PALETTE, ...overrides }), ...outfitPalette(outfit) };
    const sheets = heroSheets();
    sheets.forEach(([suffix, rows, off]) => {
      const styled = applyHair(rows, outfit?.hair, off);
      makeTexture(scene, `${key}${suffix}`, applyOutfit(styled, outfit, off), palette, { outline: CHAR_OUTLINE });
      // protagonisti e passanti hanno anche la versione donna (stesso set di frame):
      // capelli lunghi, e se l'acconciatura è corta passa alla frangia
      const femStyle = ["buzz", "spiky"].includes(outfit?.hair) ? "bangs" : outfit?.hair;
      if (key !== "npc_vendor" && key !== "npc_old") makeTexture(scene, `${key}_f${suffix}`, applyOutfit(longHair(applyHair(rows, femStyle, off), off), outfit, off), palette, { outline: CHAR_OUTLINE });
    });
  }
  makeTexture(scene, "pack", PACK, PACK_PALETTE, { outline: CHAR_OUTLINE });
  const extra = { u: "#8fb5ae", U: "#4f7a78", k: "#6a9a64", K: "#3f6a44", o: "#c9706a", O: "#9a4c48", p: "#8a7fb0" };
  for (const [name, top] of Object.entries(PACK_PLANTS)) {
    const rows = [...top, ...PACK.slice(4)];
    // il pothos ricade sui lati dello zaino
    if (name === "pothos") {
      rows[4] = "gTTTTTTg";
      rows[5] = "gtvttttT";
      rows[6] = "TtwwwwtG";
    }
    makeTexture(scene, `pack_${name}`, rows, { ...PACK_PALETTE, ...extra }, { outline: CHAR_OUTLINE });
  }
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
  return crowdVariant(scene, masked);
}

// varianti dei passanti: stessa figura e stessi fotogrammi dei personaggi, ma con
// vestiti, capelli, pelle e mascherina ricombinati. Così nella stessa scena nessuno è uguale.
const VARIANT_COLORS = {
  shirt: [["#b4553f", "#8a3e2e"], ["#5e7f94", "#3f5a6c"], ["#163c4d", "#0f2a37"], ["#7e9c8c", "#5c7a6b"], ["#c98552", "#a06a40"], ["#a3a9a6", "#7e8683"], ["#9fb4c2", "#6f8798"], ["#e8c66a", "#c9a23d"], ["#6e5434", "#523e26"], ["#a35d6a", "#7d4450"], ["#dadfda", "#a3a9a6"], ["#3f6560", "#2a4844"]],
  pants: [["#3b4f5c", "#2a3a45"], ["#1c2839", "#121b27"], ["#5e7f94", "#3f5a6c"], ["#6e7673", "#4f5654"], ["#8f775b", "#6e5a44"], ["#dadfda", "#a3a9a6"]],
  hair: ["#1c2839", "#16181c", "#3a2a20", "#4b4440", "#6e5434", "#7a3a2e", "#a3a9a6", "#d8c48f", "#e8d29a", "#cdd2ce"],
  skin: [["#e8dccd", "#c9b8a6"], ["#f3e6da", "#dcc8b6"], ["#d9b89c", "#bf9c80"], ["#c69a7a", "#a77c5e"], ["#b98a6a", "#9a6e52"], ["#8a6248", "#6e4c36"]],
  mask: [["#f1f0ed", "#5e7f94"], ["#dfe7ea", "#163c4d"], ["#cfe3d4", "#2f5e4a"], ["#e6d6cc", "#b4553f"], ["#d6dade", "#5e7f94"]]
};
const POOL_MAX = { cv: 26, cb: 32 };
const variantPool = { cv: [], cb: [] };
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];

function makeVariant(scene, tag, full) {
  const key = `${tag}_${variantPool[tag].length}`;
  const base = pickOf(CROWD);
  const female = Math.random() < 0.5;
  const [r, R] = pickOf(VARIANT_COLORS.shirt);
  const [b, B] = pickOf(VARIANT_COLORS.pants);
  const [s, S] = Math.random() < 0.6 ? pickOf(VARIANT_COLORS.skin) : [null, null];
  const [M, F] = pickOf(VARIANT_COLORS.mask);
  const overrides = { ...HERO_VARIANTS[base], r, R, b, B, M, F };
  if (Math.random() < 0.7) overrides.h = pickOf(VARIANT_COLORS.hair);
  if (s) Object.assign(overrides, { s, S });
  // outfit a caso: taglio dei vestiti, copricapo e sciarpa
  const [y, Y] = pickOf(VARIANT_COLORS.shirt);
  const outfit = {
    hair: pickOf(female ? ["short", "bangs", "sidepart", "ponytail", "bun", "curly"] : ["short", "spiky", "curly", "buzz", "sidepart", "bangs"]),
    top: pickOf(["tee", "jacket", "stripes", "hoodie", "overalls", "coat", "vest"]),
    head: Math.random() < 0.3 ? pickOf(["beanie", "cap"]) : null,
    neck: Math.random() < 0.2 ? "scarf" : null,
    y,
    Y,
    i: pickOf(["#f1f0ed", "#dadfda", "#9fb4c2", "#e8c66a"])
  };
  const palette = { ...shaded({ ...HERO_PALETTE, ...overrides }), ...outfitPalette(outfit) };
  // per le comparse lontane bastano la posa con la mascherina e la camminata
  const wanted = full ? null : new Set(["_mask", "_mask_w1", "_mask_p1", "_mask_w2", "_mask_p2"]);
  heroSheets().forEach(([suffix, rows, off]) => {
    if (wanted && !wanted.has(suffix)) return;
    const styled = applyHair(rows, outfit.hair, off);
    makeTexture(scene, `${key}${suffix}`, applyOutfit(female ? longHair(styled, off) : styled, outfit, off), palette, { outline: CHAR_OUTLINE });
  });
  variantPool[tag].push(key);
  return key;
}

export function crowdVariant(scene, masked = true, { full = true } = {}) {
  const tag = full ? "cv" : "cb";
  if (!scene.variantUsed) {
    scene.variantUsed = new Set();
    // la scena di Phaser viene riusata: alla chiusura si ricomincia da capo
    scene.events.once("shutdown", () => (scene.variantUsed = null));
  }
  const pool = variantPool[tag];
  const free = pool.filter((k) => !scene.variantUsed.has(k));
  // finché il gruppo non è pieno se ne crea uno nuovo, poi si pesca tra quelli non usati nella scena
  const key = pool.length < POOL_MAX[tag] ? makeVariant(scene, tag, full) : free.length ? pickOf(free) : pickOf(pool);
  scene.variantUsed.add(key);
  return masked ? `${key}_mask` : key;
}

// aspetto a caso per le comparse lontane (non consuma quelli dei passanti in primo piano)
export function randomCrowdKey(masked = true) {
  const base = CROWD[Math.floor(Math.random() * CROWD.length)] + (Math.random() < 0.5 ? "_f" : "");
  return masked ? `${base}_mask` : base;
}
