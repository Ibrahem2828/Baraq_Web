// Build the distributable Android app: one signed universal APK plus the
// manifest the download page reads.
//
//   JAVA_HOME=... ANDROID_HOME=... node scripts/android-release.mjs
//
// Output (dist/android/):
//   baraq-<versionName>.apk   signed with android/keystore.properties
//   latest.json               version, size, SHA-256 of the file and of the signing certificate
//
// It refuses to continue unless the APK is signed by the release key (not the
// debug key), has the expected package and version, and carries no web-only
// code paths; the guard lives in build-native.mjs. Version numbers come from
// android/app/build.gradle so there is one place to bump.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const isWindows = process.platform === "win32";
const fail = (message) => { console.error(`\n[android-release] ${message}`); process.exit(1); };
const log = (message) => console.log(`[android-release] ${message}`);

const javaHome = process.env.JAVA_HOME;
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!javaHome || !sdkRoot) fail("Set JAVA_HOME and ANDROID_HOME (JDK 21, Android SDK with build-tools).");
if (!existsSync(path.join(androidDir, "keystore.properties"))) {
  fail("android/keystore.properties is missing: a release APK must be signed with the release key (see docs/MOBILE_APP.md).");
}

const gradle = readFileSync(path.join(androidDir, "app", "build.gradle"), "utf8");
const versionCode = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1]);
const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];
const applicationId = /applicationId\s+"([^"]+)"/.exec(gradle)?.[1];
if (!versionCode || !versionName || !applicationId) fail("could not read versionCode/versionName/applicationId from android/app/build.gradle");
const minSdk = Number(/minSdkVersion\s*=\s*(\d+)/.exec(readFileSync(path.join(androidDir, "variables.gradle"), "utf8"))?.[1]);

const run = (command, args, options = {}) => execFileSync(command, args, { stdio: "inherit", shell: isWindows && /\.(bat|cmd)$/i.test(command), ...options });
const capture = (command, args) => execFileSync(command, args, { encoding: "utf8", shell: isWindows && /\.(bat|cmd)$/i.test(command) });

log(`building ${applicationId} ${versionName} (code ${versionCode})`);
// --verify-only re-runs the checks and packaging on the APK already built.
if (!process.argv.includes("--verify-only")) {
  run(process.execPath, [path.join(root, "scripts", "build-native.mjs"), "--sync"], { cwd: root });
  run(path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew"), ["clean", "assembleRelease", "--no-daemon", "--console=plain"], { cwd: androidDir });
}

const apkSource = path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!existsSync(apkSource)) fail(`Gradle finished but ${apkSource} does not exist`);

const buildTools = path.join(sdkRoot, "build-tools");
const newest = readdirSync(buildTools).filter((name) => /^\d/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
if (!newest) fail(`no build-tools in ${buildTools}`);
const tool = (name) => path.join(buildTools, newest, isWindows ? `${name}.exe` : name);
const script = (name) => path.join(buildTools, newest, isWindows ? `${name}.bat` : name);

// 1. The signature verifies, and it is the release key, not the debug key.
const verify = capture(script("apksigner"), ["verify", "--verbose", "--print-certs", apkSource]);
if (!/Verified using v2 scheme[^\n]*true/i.test(verify) && !/Verified using v3 scheme[^\n]*true/i.test(verify)) fail(`APK signature does not verify:\n${verify}`);
const certSha256 = /certificate SHA-256 digest:\s*([0-9a-f]+)/i.exec(verify)?.[1]?.toLowerCase();
if (!certSha256) fail(`could not read the signing certificate:\n${verify}`);
if (/CN=Android Debug/i.test(verify)) fail("the APK is signed with the DEBUG key; refusing to publish it");

// 2. Package, version and minimum Android are what this script was told to ship.
const badging = capture(tool("aapt2"), ["dump", "badging", apkSource]);
const field = (re) => re.exec(badging)?.[1];
if (field(/package: name='([^']+)'/) !== applicationId) fail("package name in the APK does not match build.gradle");
if (Number(field(/versionCode='(\d+)'/)) !== versionCode) fail("versionCode in the APK does not match build.gradle");
if (field(/versionName='([^']+)'/) !== versionName) fail("versionName in the APK does not match build.gradle");
if (Number(field(/minSdkVersion:'(\d+)'/)) !== minSdk) fail("minSdk in the APK does not match variables.gradle");
if (/debuggable/i.test(badging)) fail("the APK is debuggable");
log(`permissions: ${[...badging.matchAll(/uses-permission: name='([^']+)'/g)].map((match) => match[1]).join(", ") || "none"}`);

// 3. Publish: versioned file, hash, manifest.
const outDir = path.join(root, "dist", "android");
mkdirSync(outDir, { recursive: true });
const fileName = `baraq-${versionName}.apk`;
const apkTarget = path.join(outDir, fileName);
copyFileSync(apkSource, apkTarget);
const sha256 = createHash("sha256").update(readFileSync(apkTarget)).digest("hex");
const manifest = {
  applicationId,
  versionName,
  versionCode,
  file: fileName,
  sizeBytes: statSync(apkTarget).size,
  sha256,
  signingCertSha256: certSha256,
  minAndroid: minSdk === 24 ? "7.0" : `API ${minSdk}`,
  minSdk,
  releasedAt: new Date().toISOString()
};
writeFileSync(path.join(outDir, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(path.join(outDir, `${fileName}.sha256`), `${sha256}  ${fileName}\n`);

log(`done: ${apkTarget}`);
log(`size ${(manifest.sizeBytes / 1048576).toFixed(2)} MB, sha256 ${sha256}`);
log(`signing certificate sha256 ${certSha256}`);
