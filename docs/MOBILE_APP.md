# Baraq mobile app (Capacitor)

The Android app (and later iOS) is this web project, built a second way. The
web build is unchanged: `npm run build` still produces the standalone
server with the BFF, cookies and CSP headers. `npm run build:native`
produces a static bundle (`out/`) that Capacitor packages into the app.

## How the two builds differ

| | Web (`npm run build`) | App (`npm run build:native`) |
|---|---|---|
| Output | Next standalone server | Static export in `out/` (`output: "export"`, `trailingSlash`) |
| API calls | `/api/bff/*` on the same origin; the server adds the token | Direct to `https://api.baraqapp.com/api/v1/*` with `Authorization: Bearer` |
| Access token | HttpOnly cookie | Memory only |
| Refresh token | HttpOnly cookie | Android Keystore / iOS Keychain (`@aparajita/capacitor-secure-storage`) |
| CSRF | Double-submit token | Not needed: no cookie is ever sent |
| Route guard | `src/proxy.ts` | `src/lib/auth/NativeAuthGate.tsx` (same `resolveAuthRedirectTarget`) |
| Record pages | `/quizzes/4` (`[id]/page.web.tsx`) | `/quizzes/view?id=4` (`view/page.native.tsx`) |
| CSP | Response header (`next.config.ts`) | `<meta>` tag (`src/design-system/NativeHead.tsx`) |

Selection:

- `BUILD_TARGET=native` switches `next.config.ts` to the export config. It
  also sets `pageExtensions`: a `*.web.tsx`/`*.web.ts` route file exists only
  on the web (the BFF and auth route handlers, the `[id]` pages, the
  server-read join page), a `*.native.tsx` file only in the app. A plain
  `page.tsx` is shared.
- `NEXT_PUBLIC_BUILD_TARGET` (`"web"` or `"native"`, set by `next.config.ts`
  for both builds) is inlined as a literal. Every `IS_NATIVE` branch is
  removed from the other build. App-only modules load only through
  `src/lib/auth/load-native-session.ts` and the lazy gate in
  `src/app/providers.tsx`, so the web bundle does not even contain them.
  `npm run check:bundle` (web) and `build:native` itself (app) fail if that
  ever stops being true.
- Links to a record always go through `detailHref()`
  (`src/lib/routing/detail-href.ts`).

## Why an entry document (`scripts/native-shell/index.html`)

Capacitor's Android server answers every path without a file extension
(`/ar/quizzes/`) with the root `index.html`. It cannot map a path to the
exported `ar/quizzes/index.html`. The entry document does what a static host
would: it fetches the exported page for the current path and writes it into
the document, leaving the address unchanged. This only happens on a cold
start or a reload. Navigation inside the app is client-side and fetches the
`.txt` payloads directly.

`build-native.mjs` also writes Next 16's per-segment prefetch payloads under
the dotted names the client router requests (the export writes them as
nested folders, so every prefetch 404'd).

## Build an Android preview

Prerequisites: JDK 21 and the Android SDK (platform 36, build-tools 36). On
the development machine they live in `D:\baraaq\toolchain`, so set these
first:

```bash
export JAVA_HOME="D:\baraaq\toolchain\jdk-21.0.12.1+1" ANDROID_HOME="D:\baraaq\toolchain\android-sdk"
```

Then:

```bash
npm run android:sync                       # build:native + cap sync android
cd android && ./gradlew assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
```

The debug build installs as `com.baraq.app.preview` ("برّاق تجريبي") beside
a future store build (`com.baraq.app`). `node scripts/native-assets.mjs`
regenerates the launcher icons and splash from `src/assets/icons`.

`NEXT_PUBLIC_API_BASE_URL` picks the backend (default
`https://api.baraqapp.com`; plain `http://` only for localhost).

## Backend requirement

The app's origin is `https://localhost`. The backend must:

- list it in `CORS_ALLOWED_ORIGINS` only, never in `CSRF_TRUSTED_ORIGINS`
  (`deploy/production/compose.yaml`, backend commit 0a86642 on
  `release/production-20261028`);
- allow the `X-Request-ID` request header and expose `X-Request-ID` and
  `Retry-After` (`config/settings.py`, same commit).

Until that commit is deployed, the app cannot sign in against production:
the browser preflight fails.

## Release build, signing and distribution

The app is **not** published on Google Play. It is distributed as one signed
universal APK from `https://baraqapp.com/download/` (the download page lives in
the website repo, see its README). The APK has no native libraries, so the same
file runs on ARM and x86 devices, Android 7.0 (API 24) and newer.

One command builds everything:

```bash
export JAVA_HOME="D:\baraaq\toolchain\jdk-21.0.12.1+1" ANDROID_HOME="D:\baraaq\toolchain\android-sdk"
npm run android:release        # -> dist/android/baraq-<version>.apk, .apk.sha256, latest.json
```

It runs the native build and its bundle guard, `gradlew clean assembleRelease`
(R8 minify + resource shrinking), then **refuses to produce output** unless
`apksigner` verifies the signature, the signer is not the debug key, the package
is `com.baraq.app`, `versionCode`/`versionName`/`minSdk` match the Gradle files,
and the APK is not debuggable. `--verify-only` re-runs the checks on the APK
already built.

### The signing key (never lose it)

Updates install over an existing app **only if signed with the same key**. If
the key is lost, every installed phone must uninstall and reinstall. The key is
`baraq-release.jks` (alias `baraq`, RSA 4096, valid to 2056). Keep it, and
`android/keystore.properties` (gitignored; `storeFile`, `storePassword`,
`keyAlias`, `keyPassword`), outside the repository in at least two separate
places. Signing certificate SHA-256 (also shown on the download page):
`3F:C3:53:83:DE:0F:B0:57:AC:04:69:EB:52:89:92:02:2C:EC:F8:6B:60:E3:48:D1:E9:08:57:1B:EB:A0:EA:72`.

`assembleRelease` without `keystore.properties` fails on purpose.
`-PallowDebugSignedRelease=true` produces a debug-signed APK for a local R8
check only: never distribute it.

### Versioning

`versionCode = major*10000 + minor*100 + patch` (1.0.0 = 10000). Raise it for
every release: Android refuses to update to an equal or lower code. Change
`versionName` and `versionCode` together in `android/app/build.gradle`.

### Publishing a release

1. Bump the version, run `npm run android:release`.
2. Copy the `.apk` and `.apk.sha256` to the server's downloads folder, then
   `latest.json` last (the page switches when the manifest becomes valid).
3. Keep the previous APK there so old links keep working.

The app has no in-app update prompt yet: `latest.json` (readable from the app's
origin) is published so one can be added; until then users update by
downloading the new APK and installing it over the old one.

## What differs in the app

- Class-library file downloads are web-only: the download link goes through
  the BFF, which the app does not have, so it is not rendered in the app
  (`libraryDownloadHref()` returns `null` there).
- The verification-code screen tells the student to check the spam folder
  and links back to registration to correct a mistyped address.

## Testing without a phone

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build:native
npm run serve:native                       # Capacitor's path rules on :3030
E2E_NATIVE=1 E2E_BACKEND_AVAILABLE=1 E2E_STUDENT_EMAIL=… E2E_STUDENT_PASSWORD=… \
  PLAYWRIGHT_BASE_URL=http://localhost:3030 npx playwright test tests/e2e/native-app.spec.ts
```

The local backend needs `http://localhost:3030` in `CORS_ALLOWED_ORIGINS`.
In a desktop browser the secure-storage plugin falls back to localStorage
(`baraq_refresh`); on a device the same calls use the Keystore.

## Not done yet

- Not run on a real device or emulator: status bars, the keyboard, the
  hardware back button, and the file picker (including camera capture) are
  untested on Android itself.
- Google Play: not planned (the app is self-distributed, see above).
- App Links / deep links: invitation and password-reset links still open
  the web app.
- Push notifications: the backend has no device-token model; notifications
  stay in-app.
- iOS: the WebView origin there is `capacitor://localhost`, which the
  backend's HTTPS-only origin validation rejects today; Xcode and a Mac are
  required.
