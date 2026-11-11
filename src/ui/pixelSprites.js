// sprite pixel-art generati via codice (nessun file immagine necessario)

// proporzioni "chibi" come nelle tavole
const HERO = [
  "....hhhhhh....",
  "..hhhhhhhhhh..",
  ".hhhhhhhhhhhh.",
  ".hhhhhhhhhhhh.",
  ".hhsssssssshh.",
  ".hssssssssssh.",
  ".hssEEssEEssh.",
  ".hssEEssEEssh.",
  "..ssssssssss..",
  "...ssSSSSss...",
  "....ssssss....",
  "...rrrrrrrr...",
  "..rrrrrrrrrr..",
  ".srrrrrrrrrrs.",
  ".srrrrrrrrrrs.",
  "..RRRRRRRRRR..",
  "...bbbbbbbb...",
  "...bbbbbbbb...",
  "...bbb..bbb...",
  "...bbb..bbb...",
  "..kkkk..kkkk.."
];

// frame di animazione
const withRows = (rows, changes) =>
  rows.map((row, y) => (typeof changes[y] === "function" ? changes[y](row) : changes[y] ?? row));
const FRAME_ROWS = {
  // passo visto di fronte
  w1: { 13: ".srrrrrrrrrrr.", 14: "..RRRRRRRRRRs.", 19: "..kkkk..bbb...", 20: "........kkkk.." },
  w2: { 13: ".rrrrrrrrrrrs.", 14: ".sRRRRRRRRRR..", 19: "...bbb..kkkk..", 20: "..kkkk........" },
  // azione
  act: { 12: "..rrrrrrrrrrss", 13: "..rrrrrrrrrr..", 14: "..RRRRRRRRRR.." },
  // esulta
  cheer: { 9: (row) => `s${row.slice(1, -1)}s`, 10: (row) => `s${row.slice(1, -1)}s`, 11: "srrrrrrrrrrrrs", 13: "..rrrrrrrrrr..", 14: "..RRRRRRRRRR.." },
  // occhi chiusi
  blink: { 6: ".hssssssssssh." }
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
  npc_c: { h: "#cdd2ce", r: "#dadfda", R: "#a3a9a6", b: "#5e7f94", B: "#3f5a6c" }
};

const PACK = [
  "..g..g..",
  ".gGg.Gg.",
  "gGgGgGgg",
  ".gGgGgg.",
  "TTTTTTTT",
  "TttttttT",
  "TtwwwwtT",
  "TtwggwtT",
  "TtwwwwtT",
  "TttttttT",
  "TttttttT",
  "TTTTTTTT"
];

const PACK_PALETTE = {
  g: "#7e9c8c",
  G: "#3f6560",
  T: "#163c4d",
  t: "#2c566a",
  w: "#cdd2ce"
};

const POT_PLANT = [
  "....gg......",
  "...gGGg..gg.",
  "....gg..gGGg",
  ".gg..g..gg..",
  "gGGg.g.g....",
  ".gg..gg.....",
  ".....g......",
  ".....g......",
  "..pppppppp..",
  "..PPPPPPPP..",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "....pppp...."
];

// vasi in "pietra" chiara come nei disegni tecnici BIODOM, foglie salvia
const PLANT_PALETTE = {
  g: "#7e9c8c",
  G: "#3f6560",
  p: "#a3a9a6",
  P: "#6e7673",
  f: "#f1f0ed"
};

const FLOWER_PLANT = [
  "....gf......",
  "...gGGg..gf.",
  "....gg..gGGg",
  ".fg..g..gg..",
  "gGGg.g.g....",
  ".gg..gg.....",
  ".....g......",
  ".....g......",
  "..pppppppp..",
  "..PPPPPPPP..",
  "...pppppp...",
  "...pppppp...",
  "...pppppp...",
  "....pppp...."
];

const TALL_PLANT = [
  "....g...g...",
  "...gG..gG...",
  "...gG.gGg...",
  "..gGg.gG..g.",
  ".gG...g..gG.",
  ".gG..gg.gGg.",
  "..g..g..gG..",
  "....gg.gg...",
  ".....gg.....",
  ".....g......",
  ".....g......",
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

const LEAF = [".gg...", "gGGgg.", ".gGGGg", "...gg."];

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

export function registerPixelTextures(scene) {
  for (const [key, overrides] of Object.entries(HERO_VARIANTS)) {
    const palette = { ...HERO_PALETTE, ...overrides };
    makeTexture(scene, key, HERO, palette);
    makeTexture(scene, `${key}_mask`, HERO_MASKED, palette);
    for (const [frame, changes] of Object.entries(FRAME_ROWS)) {
      makeTexture(scene, `${key}_${frame}`, withRows(HERO, changes), palette);
      makeTexture(scene, `${key}_mask_${frame}`, withRows(HERO_MASKED, changes), palette);
    }
  }
  makeTexture(scene, "pack", PACK, PACK_PALETTE);
  makeTexture(scene, "pot_plant", POT_PLANT, PLANT_PALETTE);
  makeTexture(scene, "pot_flower", FLOWER_PLANT, PLANT_PALETTE);
  makeTexture(scene, "plant_tall", TALL_PLANT, { ...PLANT_PALETTE, p: "#2c566a", P: "#163c4d" });
  makeTexture(scene, "can", CAN, { k: "#163c4d", c: "#5e7f94", C: "#3f5a6c" });
  makeTexture(scene, "bottle", BOTTLE, { k: "#163c4d", w: "#dadfda", b: "#9fb4c2" });
  makeTexture(scene, "leaf_good", LEAF, { g: "#7e9c8c", G: "#3f6560" });
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
export function characterTexture(originId, masked = false) {
  const key = HERO_VARIANTS[`hero_${originId}`] ? `hero_${originId}` : "hero_milano";
  return masked ? `${key}_mask` : key;
}
