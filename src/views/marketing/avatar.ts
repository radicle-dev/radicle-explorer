/**
 * Client-side repo avatar generator using the browser Canvas API. Ported from
 * radicle.dev's server-side `avatar.server.ts` (which used @napi-rs/canvas at
 * prerender time) — same drawing logic, produces the same pixel output.
 */

type AtomType = "A" | "B" | "C" | "D";

const PALETTE = [
  "#00D4DA", // teal
  "#886BF2", // purple
  "#FFA5FF", // pink
  "#009F67", // green
  "#CCFF38", // lime
  "#585600", // olive
];

const GRID = 16;
const CELL = 32;
const DENSITY = 2;
const CIRCLE_B = CELL * 0.55;
const CIRCLE_C = CELL * 0.67;
const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_SPACING = 2;
const GLYPH_2X_W = 10;
const GLYPH_2X_H = 14;

function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseK<T>(arr: T[], k: number, rnd: () => number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(rnd() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function fillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  diameter: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, diameter / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawAtomA(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  c1: string,
) {
  ctx.fillStyle = c1;
  ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
}

function drawAtomB(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  c1: string,
  c2: string,
) {
  ctx.fillStyle = c1;
  ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
  fillCircle(ctx, gx * CELL + CELL / 2, gy * CELL + CELL / 2, CIRCLE_B, c2);
}

function drawAtomC(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  c2: string,
  c3: string,
) {
  ctx.fillStyle = c2;
  ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
  fillCircle(ctx, gx * CELL + CELL / 2, gy * CELL + CELL / 2, CIRCLE_C, c3);
}

function drawAtomD(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  c3: string,
) {
  ctx.fillStyle = c3;
  ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
}

function drawAtom(
  ctx: CanvasRenderingContext2D,
  atom: AtomType,
  gx: number,
  gy: number,
  c1: string,
  c2: string,
  c3: string,
) {
  switch (atom) {
    case "A":
      drawAtomA(ctx, gx, gy, c1);
      break;
    case "B":
      drawAtomB(ctx, gx, gy, c1, c2);
      break;
    case "C":
      drawAtomC(ctx, gx, gy, c2, c3);
      break;
    case "D":
      drawAtomD(ctx, gx, gy, c3);
      break;
  }
}

// 5x7 pixel font glyphs
function createGlyphs(): Record<string, number[][]> {
  const L: Record<string, number[][]> = {};
  const r = (s: string[]) =>
    s.map(row => row.split("").map(ch => (ch === "1" ? 1 : 0)));
  L["A"] = r(["01110", "10001", "10001", "11111", "10001", "10001", "10001"]);
  L["B"] = r(["11110", "10001", "10001", "11110", "10001", "10001", "11110"]);
  L["C"] = r(["01111", "10000", "10000", "10000", "10000", "10000", "01111"]);
  L["D"] = r(["11110", "10001", "10001", "10001", "10001", "10001", "11110"]);
  L["E"] = r(["11111", "10000", "10000", "11110", "10000", "10000", "11111"]);
  L["F"] = r(["11111", "10000", "10000", "11110", "10000", "10000", "10000"]);
  L["G"] = r(["01111", "10000", "10000", "10111", "10001", "10001", "01111"]);
  L["H"] = r(["10001", "10001", "10001", "11111", "10001", "10001", "10001"]);
  L["I"] = r(["11111", "00100", "00100", "00100", "00100", "00100", "11111"]);
  L["J"] = r(["11111", "00001", "00001", "00001", "10001", "10001", "01110"]);
  L["K"] = r(["10001", "10010", "10100", "11000", "10100", "10010", "10001"]);
  L["L"] = r(["10000", "10000", "10000", "10000", "10000", "10000", "11111"]);
  L["M"] = r(["10001", "11011", "10101", "10001", "10001", "10001", "10001"]);
  L["N"] = r(["10001", "11001", "10101", "10011", "10001", "10001", "10001"]);
  L["O"] = r(["01110", "10001", "10001", "10001", "10001", "10001", "01110"]);
  L["P"] = r(["11110", "10001", "10001", "11110", "10000", "10000", "10000"]);
  L["Q"] = r(["01110", "10001", "10001", "10001", "10101", "10010", "01101"]);
  L["R"] = r(["11110", "10001", "10001", "11110", "10100", "10010", "10001"]);
  L["S"] = r(["01111", "10000", "11110", "00001", "00001", "10001", "11110"]);
  L["T"] = r(["11111", "00100", "00100", "00100", "00100", "00100", "00100"]);
  L["U"] = r(["10001", "10001", "10001", "10001", "10001", "10001", "01110"]);
  L["V"] = r(["10001", "10001", "10001", "01010", "01010", "00100", "00100"]);
  L["W"] = r(["10001", "10001", "10001", "10101", "10101", "11011", "10001"]);
  L["X"] = r(["10001", "01010", "00100", "00100", "00100", "01010", "10001"]);
  L["Y"] = r(["10001", "01010", "00100", "00100", "00100", "00100", "00100"]);
  L["Z"] = r(["11111", "00001", "00010", "00100", "01000", "10000", "11111"]);
  L["0"] = r(["01110", "10001", "10011", "10101", "11001", "10001", "01110"]);
  L["1"] = r(["00100", "01100", "00100", "00100", "00100", "00100", "01110"]);
  L["2"] = r(["01110", "10001", "00001", "00110", "01000", "10000", "11111"]);
  L["3"] = r(["11110", "00001", "01110", "00001", "00001", "00001", "11110"]);
  L["4"] = r(["10010", "10010", "10010", "11111", "00010", "00010", "00010"]);
  L["5"] = r(["11111", "10000", "11110", "00001", "00001", "00001", "11110"]);
  L["6"] = r(["01110", "10000", "11110", "10001", "10001", "10001", "01110"]);
  L["7"] = r(["11111", "00001", "00010", "00100", "01000", "01000", "01000"]);
  L["8"] = r(["01110", "10001", "01110", "10001", "10001", "10001", "01110"]);
  L["9"] = r(["01110", "10001", "10001", "01111", "00001", "00001", "11110"]);
  L["?"] = r(["11111", "00001", "01110", "00000", "00100", "00000", "00100"]);
  return L;
}

const GLYPHS = createGlyphs();

function getInitials(name: string): string[] {
  if (!name || typeof name !== "string") return ["?"];
  const cleaned = name.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const first = parts[0] ? parts[0][0].toUpperCase() : "?";
  const second = parts[1] ? parts[1][0].toUpperCase() : null;
  return second ? [first, second] : [first];
}

export function renderRepoAvatar(key: string): string {
  const W = GRID * CELL;
  const H = GRID * CELL;

  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = W * DENSITY;
  canvas.height = H * DENSITY;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const ctx: CanvasRenderingContext2D = context;
  ctx.scale(DENSITY, DENSITY);

  const initials = getInitials(key);
  const seed = hash32(key.toLowerCase());
  const rnd = mulberry32(seed);
  const [c1, c2, c3] = chooseK(PALETTE, 3, rnd);

  const letterSolidAtom: AtomType = ((seed >>> 7) & 1) === 0 ? "A" : "D";
  const bgAtoms: AtomType[] = (["A", "B", "C", "D"] as AtomType[]).filter(
    a => a !== letterSolidAtom,
  );

  function pickBgAtom(gx: number, gy: number): AtomType {
    const k = (gy * 131 + gx * 197 + seed) >>> 0;
    return bgAtoms[k % bgAtoms.length];
  }

  // Background
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      drawAtom(ctx, pickBgAtom(gx, gy), gx, gy, c1, c2, c3);
    }
  }

  // Letters
  function placeSolidLetter(
    glyph: number[][],
    startX: number,
    startY: number,
    scale2x: boolean,
  ) {
    if (scale2x) {
      for (let r = 0; r < GLYPH_H; r++) {
        for (let c = 0; c < GLYPH_W; c++) {
          if (!glyph[r][c]) continue;
          const gx = startX + c * 2;
          const gy = startY + r * 2;
          const color = letterSolidAtom === "A" ? c1 : c3;
          drawAtomA(ctx, gx, gy, color);
          drawAtomA(ctx, gx + 1, gy, color);
          drawAtomA(ctx, gx, gy + 1, color);
          drawAtomA(ctx, gx + 1, gy + 1, color);
        }
      }
    } else {
      for (let r = 0; r < GLYPH_H; r++) {
        for (let c = 0; c < GLYPH_W; c++) {
          if (!glyph[r][c]) continue;
          const gx = startX + c;
          const gy = startY + r;
          const color = letterSolidAtom === "A" ? c1 : c3;
          drawAtomA(ctx, gx, gy, color);
        }
      }
    }
  }

  if (initials.length === 1) {
    const glyph = GLYPHS[initials[0]] || GLYPHS["?"];
    const startX = Math.floor((GRID - GLYPH_2X_W) / 2);
    const startY = Math.floor((GRID - GLYPH_2X_H) / 2);
    placeSolidLetter(glyph, startX, startY, true);
  } else {
    const leftGlyph = GLYPHS[initials[0]] || GLYPHS["?"];
    const rightGlyph = GLYPHS[initials[1]] || GLYPHS["?"];
    const totalW = GLYPH_W * 2 + GLYPH_SPACING;
    const startX = Math.floor((GRID - totalW) / 2);
    const startY = Math.floor((GRID - GLYPH_H) / 2);
    placeSolidLetter(leftGlyph, startX, startY, false);
    placeSolidLetter(
      rightGlyph,
      startX + GLYPH_W + GLYPH_SPACING,
      startY,
      false,
    );
  }

  return canvas.toDataURL("image/png");
}
