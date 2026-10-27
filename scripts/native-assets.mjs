// Generates the Android launcher icons and splash images from the brand
// masters in src/assets/icons (replacing Capacitor's placeholder artwork).
// Run after `npx cap add android`, or whenever the brand icons change:
//
//   node scripts/native-assets.mjs
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const icons = path.join(projectRoot, "src", "assets", "icons");
const res = path.join(projectRoot, "android", "app", "src", "main", "res");

// The gems alone, transparent: the adaptive icon's foreground layer. The
// full lockup (gems + wordmark) is too detailed at launcher size.
const gems = path.join(icons, "app_icon_adaptive_foreground.png");
const lockup = path.join(icons, "app_icon_1024.png");
/** White: the lockup master has a white (not transparent) background. */
const background = "#ffffff";

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function write(image, file) {
  mkdirSync(path.dirname(file), { recursive: true });
  await image.png({ compressionLevel: 9 }).toFile(file);
}

for (const [density, scale] of Object.entries(DENSITIES)) {
  const dir = path.join(res, `mipmap-${density}`);
  const legacy = Math.round(48 * scale);
  const foreground = Math.round(108 * scale);

  await write(
    sharp(gems).resize(foreground, foreground),
    path.join(dir, "ic_launcher_foreground.png"),
  );

  // Pre-Android-8 launchers: the gems on the brand background, square and round.
  const square = await sharp({
    create: { width: legacy, height: legacy, channels: 4, background },
  })
    .composite([{ input: await sharp(gems).resize(legacy, legacy).toBuffer() }])
    .png()
    .toBuffer();
  await write(sharp(square), path.join(dir, "ic_launcher.png"));
  const circle = Buffer.from(
    `<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`,
  );
  await write(
    sharp(square).composite([{ input: circle, blend: "dest-in" }]),
    path.join(dir, "ic_launcher_round.png"),
  );
}

// Splash: the full lockup centred on the brand background, a third of the
// shorter side, for every density and orientation Capacitor's theme uses.
const SPLASH = {
  drawable: [480, 320],
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
};
// The master's "white" is 253-255 noise, which shows as a faint square on a
// pure white screen: snap anything that close to white to white.
const { data: lockupPixels, info: lockupInfo } = await sharp(lockup)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < lockupPixels.length; i += 3) {
  if (Math.min(lockupPixels[i], lockupPixels[i + 1], lockupPixels[i + 2]) >= 245) {
    lockupPixels[i] = lockupPixels[i + 1] = lockupPixels[i + 2] = 255;
  }
}
const cleanLockup = sharp(lockupPixels, {
  raw: { width: lockupInfo.width, height: lockupInfo.height, channels: 3 },
});
for (const [dir, [width, height]] of Object.entries(SPLASH)) {
  const logo = Math.round(Math.min(width, height) / 2.2);
  const image = sharp({ create: { width, height, channels: 4, background } }).composite([
    { input: await cleanLockup.clone().resize(logo, logo).png().toBuffer(), gravity: "centre" },
  ]);
  await write(image, path.join(res, dir, "splash.png"));
}

console.log("[native-assets] launcher icons and splash images written to", res);
