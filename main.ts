// news-image-20261125 — "The World in One Day", Wednesday 25 November 2026.
//
// A newspaper-style front page summing up 25 November 2026, drawn entirely
// in code. Lead story: two oil tankers struck naval mines and exploded in
// the Strait of Hormuz. Also covered: the Houthi attack on Saudi Arabia's
// Ras Tanura refinery, the killing of Hamas security chief Mohammad Abuelouf
// in Gaza, RSF drone strikes killing 19 civilians in Sudan, the
// Australia–Solomon Islands treaty, Pope Leo XIV on the COP31 failure,
// Shenzhou-24 docking with Pakistan's first astronaut, and sport (Sinner's
// knee surgery; Lakers beat Jazz, Doncic 28 points).
//
// How it draws text: the DejaVu fonts are not available where this program
// runs, so the vector outlines of the 66 characters this page needs were
// extracted from the DejaVu TTFs (DejaVuSerif-Bold, DejaVuSerif,
// DejaVuSans-Bold, DejaVuSans) into glyphs.json beside this file — advances,
// kerning pairs and TrueType quadratic contours in font units. This program
// flattens those contours, rasterises them with 4x supersampling, and blends
// them onto the page. Everything else (rules, the strait illustration, the
// story grid) is drawn with the same small canvas primitives. The PNG is
// encoded by hand (IHDR + IDAT + IEND, zlib via node:zlib).
//
// Node 22+, standard library only, no network access. Deterministic: fixed
// layout, fixed outlines, no timestamps, no randomness. Writes a 1024x1024
// PNG to $MAKEFUN_OUTPUT_DIR/entry.png (defaults to /output).
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// PNG encoder (hand-written: IHDR + IDAT + IEND, zlib via node:zlib)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines: one filter byte (0 = none) per row, then RGB triples.
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const parts = [signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

// ---------------------------------------------------------------------------
// Glyph outlines (glyphs.json): DejaVu vector outlines for the characters
// this page uses. A point is [x, y, onCurve] in font units, y up from the
// baseline; a contour is a closed loop of such points. Off-curve points are
// quadratic Bezier control points; consecutive off-curve points imply an
// on-curve point at their midpoint (TrueType rule).
// ---------------------------------------------------------------------------

type OutlinePoint = [number, number, number]; // [x, y, onCurve 0|1]
type GlyphData = { adv: number; contours: OutlinePoint[][] };
type FontData = {
  upm: number;
  ascent: number;
  descent: number;
  glyphs: Record<string, GlyphData>;
  kern: Record<string, number>;
};
type GlyphSet = Record<string, FontData>;

const GLYPHS: GlyphSet = JSON.parse(
  readFileSync(new URL("./glyphs.json", import.meta.url), "utf8"),
) as GlyphSet;

// ---------------------------------------------------------------------------
// Geometry: flatten a glyph's contours into polylines, then scanline-fill.
// A polygon is a list of closed polylines; each polyline is a flat list of
// [x, y] vertices in screen coordinates (y down). Filling uses the even-odd
// rule over pixel centres.
// ---------------------------------------------------------------------------

type Pt = [number, number];

// Split one quadratic Bezier until it is flat enough, appending line
// segments (as points) to `out`. `flat` is the tolerance in screen px.
function flattenQuad(p0: Pt, p1: Pt, p2: Pt, flat: number, out: Pt[]): void {
  const dx = p0[0] - 2 * p1[0] + p2[0];
  const dy = p0[1] - 2 * p1[1] + p2[1];
  if (dx * dx + dy * dy <= flat * flat) {
    out.push(p2);
    return;
  }
  const m01: Pt = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const m12: Pt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const mid: Pt = [(m01[0] + m12[0]) / 2, (m01[1] + m12[1]) / 2];
  flattenQuad(p0, m01, mid, flat, out);
  flattenQuad(mid, m12, p2, flat, out);
}

// Turn one contour's outline points into a closed polyline of screen points.
// `toScreen` maps a font-unit point to screen coordinates.
function flattenContour(contour: OutlinePoint[], toScreen: (x: number, y: number) => Pt): Pt[] {
  const pts: Pt[] = [];
  const n = contour.length;
  if (n === 0) return pts;
  // A contour's first point is on-curve; if a later point is off-curve its
  // segment ends at the next on-curve point, or at the implied midpoint
  // between two consecutive off-curve points.
  const start: Pt = toScreen(contour[0][0], contour[0][1]);
  pts.push(start);
  let cur: Pt = start;
  let curOff: Pt | null = null;
  for (let i = 1; i < n; i++) {
    const p = contour[i];
    const sp: Pt = toScreen(p[0], p[1]);
    if (p[2] === 1) {
      if (curOff !== null) {
        flattenQuad(cur, curOff, sp, 0.35, pts);
        curOff = null;
      } else {
        pts.push(sp);
      }
      cur = sp;
    } else {
      if (curOff !== null) {
        // Two off-curve points in a row: implied on-curve midpoint.
        const mid: Pt = [(curOff[0] + sp[0]) / 2, (curOff[1] + sp[1]) / 2];
        flattenQuad(cur, curOff, mid, 0.35, pts);
        cur = mid;
      }
      curOff = sp;
    }
  }
  if (curOff !== null) {
    // Contour closes on an off-curve point: curve back to the start point.
    flattenQuad(cur, curOff, start, 0.35, pts);
  }
  return pts;
}

// Fill `polys` (closed polylines) into `mask` — a Uint8 grid of width `mw`
// and height `mh` whose cell (col, row) covers screen
// [ox + col/sub, ox + (col+1)/sub) x [oy + row/sub, oy + (row+1)/sub) —
// using the even-odd rule over cell centres.
function fillMask(
  polys: Pt[][],
  mask: Uint8Array,
  mw: number,
  mh: number,
  ox: number,
  oy: number,
  sub: number,
): void {
  // Collect non-horizontal edges.
  const edges: [number, number, number, number][] = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (a[1] === b[1]) continue;
      edges.push([a[0], a[1], b[0], b[1]]);
    }
  }
  if (edges.length === 0) return;
  for (let row = 0; row < mh; row++) {
    const cy = oy + (row + 0.5) / sub; // scanline through cell centres
    const xs: number[] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= cy && cy < y1) || (y1 <= cy && cy < y0)) {
        xs.push(x0 + ((cy - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = xs[k];
      const xb = xs[k + 1];
      // Cell (col) centre is ox + (col + 0.5) / sub; inside when xa <= c < xb.
      const c0 = Math.max(0, Math.ceil((xa - ox) * sub - 0.5));
      const c1 = Math.min(mw, Math.ceil((xb - ox) * sub - 0.5));
      for (let col = c0; col < c1; col++) mask[row * mw + col] = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer with drawing helpers, plus the text rasteriser.
// Text is drawn like a typesetter: the pen starts at (x, y) where y is the
// top of the ascender (PIL's default "la" anchor), advances by each glyph's
// advance plus the kerning pair, and each glyph's outline is rendered at
// 4x supersampling and blended in.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const SS = 4; // glyph supersampling factor

type RGB = readonly [number, number, number];

const BG: RGB = [247, 242, 231];
const INK: RGB = [18, 18, 18];
const RED: RGB = [178, 34, 34];
const NAVY: RGB = [24, 48, 88];
const GREY: RGB = [90, 86, 78];

class Page {
  readonly buf = new Uint8Array(W * H * 3);

  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = BG[0];
      this.buf[i * 3 + 1] = BG[1];
      this.buf[i * 3 + 2] = BG[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  // Blend a solid colour over (x, y) with coverage alpha 0..255.
  blend(x: number, y: number, c: RGB, alpha: number): void {
    if (alpha <= 0 || x < 0 || y < 0 || x >= W || y >= H) return;
    if (alpha >= 255) {
      this.set(x, y, c);
      return;
    }
    const i = (y * W + x) * 3;
    const inv = 255 - alpha;
    this.buf[i] = Math.round((c[0] * alpha + this.buf[i] * inv) / 255);
    this.buf[i + 1] = Math.round((c[1] * alpha + this.buf[i + 1] * inv) / 255);
    this.buf[i + 2] = Math.round((c[2] * alpha + this.buf[i + 2] * inv) / 255);
  }

  // Solid rectangle over [x, x+w) x [y, y+h).
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
  }

  // Horizontal rule centred on y, `thickness` px tall, from x0 to x1
  // inclusive (mirrors PIL's ImageDraw.line with a width).
  rule(x0: number, y: number, x1: number, thickness: number, c: RGB = INK): void {
    this.rect(x0, y - Math.floor(thickness / 2), x1 - x0 + 1, thickness, c);
  }

  // Filled polygon (even-odd rule over pixel centres).
  polygon(points: Pt[], c: RGB): void {
    const polys = [points];
    let minY = H;
    let maxY = -1;
    for (const [, y] of points) {
      minY = Math.min(minY, Math.floor(y));
      maxY = Math.max(maxY, Math.ceil(y));
    }
    minY = Math.max(0, minY);
    maxY = Math.min(H - 1, maxY);
    // Fill one row at a time with the shared scanline filler (sub = 1).
    for (let y = minY; y <= maxY; y++) {
      const row = new Uint8Array(W);
      fillMask(polys, row, W, 1, 0, y, 1);
      for (let x = 0; x < W; x++) if (row[x] === 1) this.set(x, y, c);
    }
  }

  // Filled ellipse inside the inclusive bounding box [x0, y0]-[x1, y1].
  ellipse(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = (x1 - x0) / 2;
    const ry = (y1 - y0) / 2;
    for (let y = y0; y <= y1; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (Math.abs(t) >= 1) continue;
      const dx = rx * Math.sqrt(1 - t * t);
      const xa = Math.ceil(cx - dx - 0.5);
      const xb = Math.floor(cx + dx - 0.5);
      for (let x = xa; x <= xb; x++) this.set(x, y, c);
    }
  }

  // Arc stroke: angles in degrees from 3 o'clock, increasing clockwise
  // (PIL convention). Drawn as a chain of small discs of diameter `width`.
  arc(x0: number, y0: number, x1: number, y1: number, startDeg: number, endDeg: number, width: number, c: RGB): void {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = (x1 - x0) / 2;
    const ry = (y1 - y0) / 2;
    const r = width / 2;
    for (let deg = startDeg; deg <= endDeg; deg += 0.5) {
      const a = (deg * Math.PI) / 180;
      const px = cx + rx * Math.cos(a);
      const py = cy + ry * Math.sin(a);
      const x0d = Math.floor(px - r);
      const x1d = Math.ceil(px + r);
      const y0d = Math.floor(py - r);
      const y1d = Math.ceil(py + r);
      for (let y = y0d; y <= y1d; y++) {
        for (let x = x0d; x <= x1d; x++) {
          const ddx = x + 0.5 - px;
          const ddy = y + 0.5 - py;
          if (ddx * ddx + ddy * ddy <= r * r) this.set(x, y, c);
        }
      }
    }
  }
}

// Width of `text` in px at `size` in font `name`, advances + kerning.
function textWidth(fontName: string, size: number, text: string): number {
  const font = GLYPHS[fontName];
  const scale = size / font.upm;
  let w = 0;
  let prev: string | null = null;
  for (const ch of text) {
    const g = font.glyphs[ch];
    if (g === undefined) throw new Error(`no glyph for ${JSON.stringify(ch)} in ${fontName}`);
    w += g.adv * scale;
    if (prev !== null) w += (font.kern[prev + ch] ?? 0) * scale;
    prev = ch;
  }
  return w;
}

// Render one glyph's mask at 4x and blend it onto the page at pen (penX,
// baselineY), in colour `c`. Returns nothing; advances are handled by the
// caller.
function drawGlyph(page: Page, fontName: string, size: number, ch: string, penX: number, baselineY: number, c: RGB): void {
  const font = GLYPHS[fontName];
  const g = font.glyphs[ch];
  if (g === undefined) throw new Error(`no glyph for ${JSON.stringify(ch)} in ${fontName}`);
  if (g.contours.length === 0) return; // e.g. space: no ink
  const scale = size / font.upm;
  const toScreen = (x: number, y: number): Pt => [penX + x * scale, baselineY - y * scale];
  const polys: Pt[][] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contour of g.contours) {
    const poly = flattenContour(contour, toScreen);
    if (poly.length < 2) continue;
    polys.push(poly);
    for (const [x, y] of poly) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (polys.length === 0 || !isFinite(minX)) return;
  const ox = Math.floor(minX);
  const oy = Math.floor(minY);
  const mw = (Math.ceil(maxX) - ox + 1) * SS;
  const mh = (Math.ceil(maxY) - oy + 1) * SS;
  const mask = new Uint8Array(mw * mh);
  fillMask(polys, mask, mw, mh, ox, oy, SS);
  // Box-downsample 4x4 -> coverage 0..255 and blend.
  const pw = mw / SS;
  const ph = mh / SS;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      let sum = 0;
      for (let dy = 0; dy < SS; dy++) {
        const row = (y * SS + dy) * mw + x * SS;
        for (let dx = 0; dx < SS; dx++) sum += mask[row + dx];
      }
      if (sum === 0) continue;
      page.blend(ox + x, oy + y, c, Math.round((sum * 255) / (SS * SS)));
    }
  }
}

// Draw `text` with its pen at (x, y); y is the top of the ascender.
function drawText(page: Page, fontName: string, size: number, x: number, y: number, text: string, c: RGB): void {
  const font = GLYPHS[fontName];
  const scale = size / font.upm;
  const baselineY = y + font.ascent * scale;
  let penX = x;
  let prev: string | null = null;
  for (const ch of text) {
    const g = font.glyphs[ch];
    if (g === undefined) throw new Error(`no glyph for ${JSON.stringify(ch)} in ${fontName}`);
    if (prev !== null) penX += (font.kern[prev + ch] ?? 0) * scale;
    drawGlyph(page, fontName, size, ch, penX, baselineY, c);
    penX += g.adv * scale;
    prev = ch;
  }
}

// Word-wrap plain text to fit `width` px (breaks on spaces).
function wrap(fontName: string, size: number, text: string, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const t = cur === "" ? word : cur + " " + word;
    if (textWidth(fontName, size, t) <= width) {
      cur = t;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function paragraph(
  page: Page,
  fontName: string,
  size: number,
  x: number,
  y: number,
  text: string,
  width: number,
  c: RGB,
  leading?: number,
): number {
  const lh = leading ?? Math.round(size * 1.35);
  const lines = wrap(fontName, size, text, width);
  for (let i = 0; i < lines.length; i++) {
    drawText(page, fontName, size, x, y + i * lh, lines[i], c);
  }
  return y + lines.length * lh;
}

// ---------------------------------------------------------------------------
// The front page itself — Wednesday 25 November 2026.
// Layout coordinates follow the original generator exactly: margin 48,
// masthead, lead story, a drawn strait scene, six stories in a 3x2 grid,
// sport, and the sources footer.
// ---------------------------------------------------------------------------

const M = 48;
const SERIF_BOLD = "serifBold";
const SERIF = "serif";
const SANS_BOLD = "sansBold";
const SANS = "sans";

function drawFrontPage(): Page {
  const page = new Page();

  // ---- masthead ----
  drawText(page, SERIF_BOLD, 58, M, 24, "THE WORLD IN ONE DAY", INK);
  page.rule(M, 100, W - M, 4);
  drawText(page, SANS_BOLD, 30, M, 110, "WEDNESDAY  25  NOVEMBER  2026", RED);
  page.rule(M, 152, W - M, 2);

  // ---- lead ----
  let y = 166;
  drawText(page, SANS_BOLD, 24, M, y, "LEAD  \u2022  STRAIT OF HORMUZ", RED);
  y += 36;
  y = paragraph(page, SERIF_BOLD, 52, M, y, "TANKERS ABLAZE AFTER", W - 2 * M, INK, 56);
  y = paragraph(page, SERIF_BOLD, 52, M, y, "MINES BLAST IN HORMUZ", W - 2 * M, INK, 56);
  y += 4;
  y = paragraph(
    page,
    SERIF,
    24,
    M,
    y,
    "Two oil tankers struck naval mines and exploded in the Strait of Hormuz " +
      "on Wednesday, catching fire as they tried to transit an unauthorised route, " +
      "Iran's Revolutionary Guard said \u2014 raising fears for the world's busiest oil waterway.",
    W - 2 * M,
    INK,
    31,
  );
  y += 10;

  // ---- illustration: strait scene, 140 tall ----
  const SAND: RGB = [232, 222, 196];
  const SEA: RGB = [28, 68, 110];
  const SUN: RGB = [238, 196, 110];
  const HILLS: RGB = [122, 104, 78];
  const HULL1: RGB = [30, 30, 34];
  const HULL2: RGB = [40, 40, 46];
  const RUST: RGB = [150, 30, 24];
  const FLAME: RGB = [232, 120, 20];
  const FLAME_IN: RGB = [245, 190, 40];
  const SMOKE1: RGB = [70, 68, 66];
  const SMOKE2: RGB = [80, 78, 74];
  const WAVE: RGB = [200, 220, 235];
  const ix0 = M;
  const iy0 = y;
  const ix1 = W - M;
  const iy1 = y + 140;
  page.rect(ix0, iy0, ix1 - ix0 + 1, iy1 - iy0 + 1, SAND);
  page.rect(ix0, iy0 + 84, ix1 - ix0 + 1, iy1 - (iy0 + 84) + 1, SEA);
  page.ellipse(ix0 + 700, iy0 + 12, ix0 + 768, iy0 + 80, SUN);
  page.polygon(
    [
      [ix0, iy0 + 84],
      [ix0 + 260, iy0 + 40],
      [ix0 + 520, iy0 + 84],
    ],
    HILLS,
  );
  page.polygon(
    [
      [ix0 + 560, iy0 + 84],
      [ix0 + 760, iy0 + 52],
      [ix1, iy0 + 84],
    ],
    HILLS,
  );
  // tanker 1 (left, on fire)
  const tx = ix0 + 60;
  const ty = iy0 + 92;
  page.rect(tx, ty, 331, 27, HULL1);
  page.rect(tx + 250, ty - 22, 43, 23, HULL1);
  page.rect(tx + 20, ty + 26, 291, 11, RUST);
  for (const [fx, fh] of [
    [tx + 70, 40],
    [tx + 120, 50],
    [tx + 180, 36],
  ]) {
    page.polygon(
      [
        [fx, ty],
        [fx + 15, ty - fh],
        [fx + 30, ty],
      ],
      FLAME,
    );
    page.polygon(
      [
        [fx + 7, ty - 4],
        [fx + 18, ty - fh - 12],
        [fx + 28, ty - 4],
      ],
      FLAME_IN,
    );
  }
  for (const [sx, sy, r] of [
    [tx + 95, ty - 52, 18],
    [tx + 135, ty - 70, 20],
    [tx + 175, ty - 82, 18],
  ]) {
    page.ellipse(sx - r, sy - r, sx + r, sy + r, SMOKE1);
  }
  // tanker 2 (right, smoking)
  const tx2 = ix0 + 500;
  const ty2 = iy0 + 96;
  page.rect(tx2, ty2, 301, 25, HULL2);
  page.rect(tx2 + 30, ty2 - 20, 37, 21, HULL2);
  page.rect(tx2 + 12, ty2 + 24, 277, 11, RUST);
  for (const [sx, sy, r] of [
    [tx2 + 120, ty2 - 40, 17],
    [tx2 + 160, ty2 - 58, 19],
    [tx2 + 200, ty2 - 70, 16],
  ]) {
    page.ellipse(sx - r, sy - r, sx + r, sy + r, SMOKE2);
  }
  page.polygon(
    [
      [tx2 + 200, ty2],
      [tx2 + 214, ty2 - 36],
      [tx2 + 228, ty2],
    ],
    FLAME,
  );
  for (let wx = ix0 + 10; wx < ix1 - 10; wx += 46) {
    page.arc(wx, iy1 - 14, wx + 40, iy1 + 2, 200, 340, 3, WAVE);
  }
  y = iy1 + 6;
  drawText(page, SANS_BOLD, 16, M, y, "THE STRAIT OF HORMUZ \u2014 TWO TANKERS HIT MINES AND CAUGHT FIRE", GREY);
  y += 26;
  page.rule(M, y, W - M, 2);
  y += 12;

  // ---- supporting stories: 3 columns x 2 rows ----
  const colW = Math.floor((W - 2 * M - 48) / 3);
  const BODY: RGB = [60, 58, 52];
  const stories: [string, string, string][] = [
    [
      "MIDDLE EAST",
      "Houthis hit Saudi refinery",
      "Yemen's Houthis said they attacked the Ras Tanura oil refinery in Saudi Arabia, causing fires.",
    ],
    [
      "GAZA",
      "Hamas security chief killed",
      "Israel's military killed Hamas colonel Mohammad Abuelouf, who ran the militants' interior security.",
    ],
    [
      "SUDAN",
      "Drone strikes kill 19 civilians",
      "Rapid Support Forces drone strikes killed 19 people and wounded 20 in Damazin and Roseires.",
    ],
    [
      "PACIFIC",
      "Solomons sign pact with Australia",
      "Australia and Solomon Islands signed a treaty barring any foreign military or security base.",
    ],
    [
      "CLIMATE",
      "Pope laments COP31 failure",
      "Pope Leo XIV voiced concern at the failure of the UN COP31 climate talks to reach a deal.",
    ],
    [
      "SPACE",
      "Shenzhou-24 docks with astronaut",
      "China's Shenzhou-24 docked with Tiangong station carrying Pakistan's first astronaut.",
    ],
  ];
  const sy = y;
  const ROW_H = 128;
  for (let i = 0; i < stories.length; i++) {
    const [kick, head, body] = stories[i];
    const cx = M + (i % 3) * (colW + 24);
    const cy = sy + Math.floor(i / 3) * ROW_H;
    drawText(page, SANS_BOLD, 16, cx, cy, kick, RED);
    const hy = paragraph(page, SERIF_BOLD, 21, cx, cy + 21, head, colW, INK, 25);
    paragraph(page, SANS, 15, cx, hy + 3, body, colW, BODY, 19);
  }
  y = sy + 2 * ROW_H + 2;
  page.rule(M, y, W - M, 2);
  y += 12;

  // ---- sport ----
  drawText(page, SANS_BOLD, 20, M, y, "SPORT", NAVY);
  y += 28;
  y = paragraph(
    page,
    SANS,
    18,
    M,
    y,
    "Sinner out after knee surgery \u2014 the Italian star faces an extended spell on the sidelines.",
    W - 2 * M,
    INK,
    24,
  );
  y = paragraph(
    page,
    SANS,
    18,
    M,
    y,
    "Lakers beat Jazz: Doncic scores 28 as Los Angeles win for the 11th time.",
    W - 2 * M,
    INK,
    24,
  );
  y += 8;
  page.rule(M, y, W - M, 4);
  y += 10;
  drawText(
    page,
    SANS,
    14,
    M,
    y,
    "Sources: Reuters, AP, NYT, BBC \u2014 via Just Security Early Edition, 25 Nov 2026  \u2022  make.fun news-image-20261125",
    GREY,
  );

  return page;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const page = drawFrontPage();
  const png = encodePng(W, H, page.buf);
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes, ${W}x${H})`);
}

main();
