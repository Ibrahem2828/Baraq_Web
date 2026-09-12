import sharp from "sharp";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "preview.png";

const tile = 320;
const resized = await sharp(inputPath)
  .resize(tile, tile, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

function checkerboardSvg(w, h, cell) {
  let rects = "";
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const even = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${even ? "#d0d0d0" : "#f5f5f5"}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
}

const backgrounds = [
  { name: "light", color: { r: 250, g: 248, b: 245, alpha: 1 } }, // app light surface
  { name: "dark", color: { r: 18, g: 20, b: 28, alpha: 1 } }, // app dark surface
  { name: "fire", color: { r: 46, g: 20, b: 12, alpha: 1 } }, // app fire surface
  { name: "checker", svg: checkerboardSvg(tile, tile, 20) },
];

const panels = [];
for (const bg of backgrounds) {
  const base = bg.svg
    ? sharp(Buffer.from(bg.svg))
    : sharp({ create: { width: tile, height: tile, channels: 4, background: bg.color } });
  const composed = await base
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
  panels.push(composed);
}

const labelHeight = 28;
const canvasWidth = tile * panels.length;
const canvasHeight = tile + labelHeight;

const svgLabels = backgrounds
  .map(
    (bg, i) =>
      `<text x="${i * tile + tile / 2}" y="${tile + 20}" font-size="16" fill="#333" text-anchor="middle" font-family="sans-serif">${bg.name}</text>`,
  )
  .join("");

const canvas = sharp({
  create: {
    width: canvasWidth,
    height: canvasHeight,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
});

await canvas
  .composite([
    ...panels.map((p, i) => ({ input: p, left: i * tile, top: 0 })),
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${labelHeight}">${svgLabels}</svg>`,
      ),
      left: 0,
      top: tile,
    },
  ])
  .png()
  .toFile(outputPath);

console.log(`preview written: ${outputPath}`);
