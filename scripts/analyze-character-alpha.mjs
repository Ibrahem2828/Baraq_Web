import sharp from "sharp";
import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = process.argv[2] || "src/assets/characters";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (extname(entry).toLowerCase() === ".png") out.push(p);
  }
  return out;
}

async function analyze(path) {
  const img = sharp(path);
  const meta = await img.metadata();
  const { width, height, channels, hasAlpha, format } = meta;

  let alphaStats = null;
  if (hasAlpha) {
    const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const ch = info.channels; // 4 (RGBA)
    let min = 255,
      max = 0,
      sum = 0,
      transparentPx = 0,
      total = 0;
    // Sample every 7th pixel for speed on large images
    for (let i = 0; i < data.length; i += ch * 7) {
      const a = data[i + 3];
      if (a === undefined) continue;
      min = Math.min(min, a);
      max = Math.max(max, a);
      sum += a;
      if (a < 250) transparentPx++;
      total++;
    }
    alphaStats = {
      min,
      max,
      avg: +(sum / total).toFixed(1),
      pctNonOpaque: +((transparentPx / total) * 100).toFixed(2),
    };
  }

  // Sample the 4 corner pixels' RGB to see if background looks like a flat color
  const cornerSize = 4;
  const { data: cornerData } = await sharp(path)
    .extract({
      left: 0,
      top: 0,
      width: Math.min(cornerSize, width),
      height: Math.min(cornerSize, height),
    })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const topLeft = [cornerData[0], cornerData[1], cornerData[2], cornerData[3]];

  return { path, width, height, format, channels, hasAlpha, alphaStats, topLeftRGBA: topLeft };
}

const files = walk(ROOT);
const results = [];
for (const f of files) {
  results.push(await analyze(f));
}

for (const r of results) {
  const status = !r.hasAlpha
    ? "NO_ALPHA_CHANNEL (fully opaque PNG)"
    : r.alphaStats.min === 255
      ? "ALPHA_CHANNEL_PRESENT_BUT_FULLY_OPAQUE (min alpha 255 — not actually transparent)"
      : r.alphaStats.pctNonOpaque < 0.5
        ? `ALPHA_CHANNEL_MOSTLY_OPAQUE (only ${r.alphaStats.pctNonOpaque}% non-opaque pixels — likely just antialiasing noise, not real background removal)`
        : "REAL_TRANSPARENCY_PRESENT";
  console.log(
    JSON.stringify(
      {
        file: r.path.replace(/\\/g, "/"),
        size: `${r.width}x${r.height}`,
        format: r.format,
        hasAlpha: r.hasAlpha,
        alphaStats: r.alphaStats,
        topLeftRGBA: r.topLeftRGBA,
        status,
      },
      null,
    ),
  );
}
