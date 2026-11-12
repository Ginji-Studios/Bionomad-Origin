// il team in versione pixel, stesso formato 14x21 dei cittadini

const SKIN = { s: "#f0dccb", S: "#d9bfa8", E: "#1c2839", g: "#3f5a6c", l: "#cfe0ea" };

function girl({ top = "long", glasses = false, earrings = false, vest = false, skirt = false, streaks = false, tuft = false, balayage = false }) {
  const rows = [
    "....hhhhhh....",
    "..hhhhhhhhhh..",
    ".hhhhhhhhhhhh.",
    ".hhhhhhhhhhhh.",
    ".hhsssssssshh.",
    ".hssssssssssh.",
    ".hssEEssEEssh.",
    ".hssEEssEEssh.",
    ".hssssssssssh.",
    ".hhssSSSSsshh.",
    ".hh.ssssss.hh.",
    ".hhrrrrrrrrhh.",
    ".hrrrrrrrrrrh.",
    ".srrrrrrrrrrs.",
    ".srrrrrrrrrrs.",
    "..RRRRRRRRRR..",
    "...bbbbbbbb...",
    "...bbbbbbbb...",
    "...bbb..bbb...",
    "...bbb..bbb...",
    "..kkkk..kkkk.."
  ];

  if (top === "bun") {
    rows[0] = ".....hhhh.....";
    rows[1] = "....hhhhhh....";
    rows[2] = "..hhhhhhhhhh..";
    rows[8] = "..ssssssssss..";
    rows[9] = "...ssSSSSss...";
    rows[10] = "....ssssss....";
    rows[11] = "...rrrrrrrr...";
    rows[12] = "..rrrrrrrrrr..";
  }
  if (top === "cap") {
    rows[0] = "....cccccc....";
    rows[1] = "..cccccccccc..";
    rows[2] = ".cccccccccccc.";
    rows[3] = "cccccccccccccc";
  }
  if (glasses) {
    // occhiali tondi
    rows[5] = ".hssggssggssh.";
    rows[6] = ".hsgEEggEEgsh.";
    rows[7] = ".hsgllggllgsh.";
    rows[8] = top === "bun" ? "..ssggssggss.." : ".hssggssggssh.";
  }
  if (earrings) rows[10] = ".hy.ssssss.yh.";
  if (vest) {
    rows[11] = ".hhrrwwwwrrhh.";
    rows[12] = ".hrrrwwwwrrrh.";
  }
  if (skirt) {
    rows[15] = "..pPpPpPpPpP..";
    rows[16] = ".pPpPpPpPpPpP.";
    rows[17] = "...bbb..bbb...";
  }
  if (tuft) {
    // ciuffo rosso sulla fronte e una ciocca sul lato
    rows[4] = ".hxxxxxsssshh.";
    rows[5] = ".hxxssssssssh.";
    rows[9] = ".xhssSSSSsshh.";
    rows[10] = ".xh.ssssss.hh.";
  }
  if (streaks) {
    rows[1] = "..hhfhhhhfhh..";
    rows[2] = ".hhfhhhhhhfhh.";
    rows[9] = ".hfssSSSSssfh.";
    rows[10] = ".fh.ssssss.hf.";
  }
  if (balayage) {
    // capelli lunghi e mossi che scendono dritti ai lati fino ai fianchi:
    // radici bionde, sfumatura rosa a metà, punte fucsia scure
    rows[1] = "..hhhHhhhhhh..";
    rows[2] = ".hhhhhhHhhhhh.";
    rows[3] = ".hHhhhhhhhhHh.";
    rows[4] = ".hhhhssssssHh.";
    rows[5] = ".hhsssssssssh.";
    rows[7] = ".HssEEssEEssH.";
    rows[9] = ".HmssSSSSssmH.";
    rows[10] = ".mH.ssssss.Hm.";
    rows[11] = ".mmrrrrrrrrmm.";
    rows[12] = "mffrrrrrrrrffm";
    rows[13] = ".fFrrrrrrrrFf.";
    rows[14] = "fFfrrrrrrrrfFf";
    rows[15] = ".FFRRRRRRRRFF.";
    rows[16] = ".F.bbbbbbbb.F.";
  }
  return rows;
}

export const TEAM = [
  { key: "team_1", rows: girl({ earrings: true }), palette: { h: "#e8d29a", r: "#7a2e3a", R: "#5a1f2a", b: "#1c2028", k: "#0f1216", y: "#e8c66a" } },
  { key: "team_2", rows: girl({ top: "bun" }), palette: { h: "#6e4a32", r: "#f1f0ed", R: "#cdd2ce", b: "#1c2028", k: "#dadfda" } },
  { key: "team_3", rows: girl({ top: "cap", vest: true, tuft: true }), palette: { h: "#6e4a32", c: "#1c2028", x: "#d0453a", r: "#8a2e2e", R: "#6a2222", w: "#f1f0ed", b: "#1c2028", k: "#f1f0ed" } },
  { key: "team_4", rows: girl({ skirt: true }), palette: { h: "#7a3a2e", r: "#1c2028", R: "#0f1216", p: "#b4553f", P: "#6e2a26", b: "#1c2028", k: "#0f1216" } },
  {
    key: "team_5",
    rows: girl({ balayage: true }),
    palette: { h: "#e8d29a", H: "#c9a865", m: "#e58cb6", f: "#d94f9a", F: "#a8306c", r: "#5e7f94", R: "#3f5a6c", b: "#1c2028", k: "#0f1216" }
  },
  { key: "team_6", rows: girl({}), palette: { h: "#a8805a", r: "#7e9c8c", R: "#5c7a6b", b: "#3b5ba8", B: "#2a4180", k: "#1c2028" } }
];

// stesse rifiniture dei cittadini del gioco: riflesso (1) e ombra (2) dei capelli,
// luce negli occhi (3), guance (4), ombra del collo (5), suola (6)
function polish(rows) {
  const set = (row, x, from, to) => (row[x] === from ? row.slice(0, x) + to + row.slice(x + 1) : row);
  return rows.map((row, y) => {
    let r = row;
    if (y === 1) [4, 5, 6].forEach((x) => (r = set(r, x, "h", "1")));
    if (y === 2) [3, 4].forEach((x) => (r = set(r, x, "h", "1")));
    if (y === 3) r = set(r, 2, "h", "1");
    if (y >= 2 && y <= 5) r = set(r, 12, "h", "2");
    if (y === 6) [5, 9].forEach((x) => (r = set(r, x, "E", "3")));
    if (y === 8) [3, 10].forEach((x) => (r = set(r, x, "s", "4")));
    if (y === 10) [5, 6, 7, 8].forEach((x) => (r = set(r, x, "s", "5")));
    if (y === 20) [5, 11].forEach((x) => (r = set(r, x, "k", "6")));
    // lato destro in ombra: maglia e pantaloni
    if (y >= 11 && y <= 14) [10, 11].forEach((x) => (r = set(r, x, "r", "7")));
    if (y >= 16 && y <= 19) [9, 10].forEach((x) => (r = set(r, x, "b", "8")));
    return r;
  });
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

// frame per l'animazione nei crediti: occhi chiusi e saluto con la mano
const blinkRows = (rows) => rows.map((row, y) => (y === 6 || y === 7 ? row.replace(/E/g, "s").replace(/3/g, "s") : row));
const waveRows = (rows) =>
  rows.map((row, y) => {
    if (y >= 8 && y <= 10) return row.slice(0, 13) + "s";
    if (y === 13) return row.slice(0, 12) + ".." ;
    return row;
  });

export function registerTeamTextures(scene, makeTexture) {
  TEAM.forEach(({ key, rows, palette }) => {
    const full = { ...SKIN, ...palette };
    const pal = {
      ...full,
      1: mix(full.h, "#ffffff", 0.3),
      2: mix(full.h, "#000000", 0.22),
      3: "#f1f0ed",
      4: mix(full.s, "#d0685a", 0.3),
      5: full.S,
      6: mix(full.k, "#808890", 0.5),
      7: mix(full.r ?? "#888888", "#000000", 0.2),
      8: mix(full.b ?? "#888888", "#000000", 0.25)
    };
    const base = polish(rows);
    makeTexture(scene, `${key}_blink`, blinkRows(base), pal);
    makeTexture(scene, `${key}_wave`, waveRows(base), pal);
    makeTexture(scene, key, base, {
      ...full,
      1: mix(full.h, "#ffffff", 0.3),
      2: mix(full.h, "#000000", 0.22),
      3: "#f1f0ed",
      4: mix(full.s, "#d0685a", 0.3),
      5: full.S,
      6: mix(full.k, "#808890", 0.5),
      7: mix(full.r ?? "#888888", "#000000", 0.2),
      8: mix(full.b ?? "#888888", "#000000", 0.25)
    });
  });
}
