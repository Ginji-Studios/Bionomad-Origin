// il team in versione pixel, stesso formato 14x21 dei cittadini

const SKIN = { s: "#f0dccb", S: "#d9bfa8", E: "#1c2839", g: "#3f5a6c", l: "#cfe0ea" };

function girl({ top = "long", glasses = false, earrings = false, vest = false, skirt = false, streaks = false, tuft = false }) {
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
  return rows;
}

export const TEAM = [
  { key: "team_1", rows: girl({ earrings: true }), palette: { h: "#e8d29a", r: "#7a2e3a", R: "#5a1f2a", b: "#1c2028", k: "#0f1216", y: "#e8c66a" } },
  { key: "team_2", rows: girl({ top: "bun" }), palette: { h: "#6e4a32", r: "#f1f0ed", R: "#cdd2ce", b: "#1c2028", k: "#dadfda" } },
  { key: "team_3", rows: girl({ top: "cap", vest: true, tuft: true }), palette: { h: "#6e4a32", c: "#1c2028", x: "#d0453a", r: "#8a2e2e", R: "#6a2222", w: "#f1f0ed", b: "#1c2028", k: "#f1f0ed" } },
  { key: "team_4", rows: girl({ skirt: true }), palette: { h: "#7a3a2e", r: "#1c2028", R: "#0f1216", p: "#b4553f", P: "#6e2a26", b: "#1c2028", k: "#0f1216" } },
  { key: "team_5", rows: girl({ streaks: true }), palette: { h: "#e8d29a", f: "#d94f9a", r: "#5e7f94", R: "#3f5a6c", b: "#1c2028", k: "#0f1216" } },
  { key: "team_6", rows: girl({}), palette: { h: "#a8805a", r: "#7e9c8c", R: "#5c7a6b", b: "#3b5ba8", B: "#2a4180", k: "#1c2028" } }
];

export function registerTeamTextures(scene, makeTexture) {
  TEAM.forEach(({ key, rows, palette }) => makeTexture(scene, key, rows, { ...SKIN, ...palette }));
}
