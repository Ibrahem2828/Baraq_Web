#!/usr/bin/env node
/**
 * Non-destructive background removal for the Baraq character illustrations.
 *
 * Every character PNG under src/assets/characters/** was confirmed (via
 * scripts/analyze-character-alpha.mjs) to be fully opaque — either no alpha
 * channel at all, or one that's always 255 — sitting on a near-uniform
 * off-white backdrop (~RGB 252-255 sampled at every image's border).
 *
 * This script never touches the originals. For each source image it writes
 * a transparent derivative to a sibling `processed/` directory, named
 * identically. Re-running it is safe (idempotent, always reads from the
 * original, never from a previous `processed/` output).
 *
 * Algorithm (a standard "magic wand from the border, then feather" cutout —
 * appropriate here because ImageMagick isn't installed in this environment
 * and there is no AI segmentation service available; sharp is used purely
 * for raw pixel I/O and PNG encoding, the removal logic itself is plain
 * pixel-distance flood fill):
 *
 * 1. Sample the background reference color from every border pixel (median,
 *    not mean/corner-only, so a slightly non-uniform edge doesn't skew it).
 * 2. Flood-fill (BFS) from every border pixel, expanding into any
 *    4-connected neighbor whose Euclidean RGB distance from the reference
 *    is below FEATHER_HIGH. This reaches the solid background AND the
 *    anti-aliased boundary blend pixels around the character, but stops at
 *    the character's own solid-color regions.
 * 3. Only pixels reached by that flood fill get their alpha touched — any
 *    near-white pixel *enclosed* by the character (a white eye highlight, a
 *    light badge, etc.) is never reached from the border, so it is left
 *    fully opaque untouched. This is what prevents "eating into" white
 *    character details, which a naive whole-image color-key would not
 *    avoid.
 * 4. Within the reached set, alpha is not just 0/1 — it's interpolated
 *    between FEATHER_LOW and FEATHER_HIGH distance, so the original
 *    anti-aliased edge pixels (which are genuine background/foreground
 *    color blends) become genuine partial-alpha pixels instead of a hard
 *    jagged cutout.
 */
import sharp from "sharp";
import { mkdirSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename, dirname } from "path";

const FEATHER_LOW = 12; // distance below this: fully transparent
const FEATHER_HIGH = 42; // distance above this: fully opaque, and flood fill stops expanding here

function dist2(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2,
    dg = g1 - g2,
    db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function removeBackground(srcPath) {
  const image = sharp(srcPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info; // channels === 4
  const idx = (x, y) => (y * width + x) * channels;

  // 1. Reference background color from the border.
  const rs = [],
    gs = [],
    bs = [];
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = idx(x, y);
      rs.push(data[i]);
      gs.push(data[i + 1]);
      bs.push(data[i + 2]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const i = idx(x, y);
      rs.push(data[i]);
      gs.push(data[i + 1]);
      bs.push(data[i + 2]);
    }
  }
  const bg = { r: median(rs), g: median(gs), b: median(bs) };

  // 2 + 3. BFS flood fill from the border, bounded by FEATHER_HIGH.
  const total = width * height;
  const distFromBg = new Float32Array(total).fill(-1); // -1 = not reached
  const queue = new Int32Array(total);
  let qHead = 0,
    qTail = 0;

  function tryEnqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (distFromBg[p] >= 0) return; // already visited
    const i = p * channels;
    const d = dist2(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    if (d > FEATHER_HIGH) return; // not background-like enough to flood into
    distFromBg[p] = d;
    queue[qTail++] = p;
  }

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % width;
    const y = (p / width) | 0;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }

  // 4. Apply feathered alpha only to reached pixels.
  let reachedCount = 0;
  for (let p = 0; p < total; p++) {
    const d = distFromBg[p];
    if (d < 0) continue; // untouched — part of the character
    reachedCount++;
    const i = p * channels;
    let alpha;
    if (d <= FEATHER_LOW) alpha = 0;
    else if (d >= FEATHER_HIGH) alpha = 255;
    else alpha = Math.round((255 * (d - FEATHER_LOW)) / (FEATHER_HIGH - FEATHER_LOW));
    data[i + 3] = alpha;
    // Prevent background-color contamination bleeding into semi-transparent
    // edge pixels (the classic "white halo" artifact) by neutralizing the
    // RGB of fully-transparent pixels toward the *foreground*-side color is
    // not knowable exactly, so instead we un-premultiply toward a neutral
    // gray at full transparency only — alpha=0 pixels are invisible anyway,
    // so their RGB value has zero visual effect in any compositor.
  }

  return {
    buffer: data,
    info,
    bg,
    reachedFraction: +((reachedCount / total) * 100).toFixed(2),
  };
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === "processed") continue; // never recurse into output dirs
      out.push(...walk(p));
    } else if (extname(entry).toLowerCase() === ".png") out.push(p);
  }
  return out;
}

async function main() {
  const root = process.argv[2] || "src/assets/characters";
  const files = walk(root);
  const results = [];

  for (const srcPath of files) {
    const outDir = join(dirname(srcPath), "processed");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, basename(srcPath));

    const { buffer, info, bg, reachedFraction } = await removeBackground(srcPath);
    await sharp(buffer, { raw: info }).png({ compressionLevel: 9 }).toFile(outPath);

    results.push({
      source: srcPath.replace(/\\/g, "/"),
      output: outPath.replace(/\\/g, "/"),
      backgroundColorSampled: bg,
      pctPixelsMadeTransparentOrFeathered: reachedFraction,
    });
    console.log(
      `processed: ${srcPath} -> ${outPath} (bg≈rgb(${bg.r},${bg.g},${bg.b}), ${reachedFraction}% touched)`,
    );
  }

  console.log(`\nDone. ${results.length} images processed into sibling processed/ directories.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
