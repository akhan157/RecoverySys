# RecoverySys desktop builds

These are build outputs from the current `main` branch, not automatically attached
GitHub Release downloads. Current main produces a portable Windows ZIP and a macOS
universal CI artifact. The historical GitHub v1.2.0.0 release contains the older
Windows installer asset; do not treat that installer as the current portable build.

## Version identity

The app release is `1.2.0.1` (single-sourced in `src/lib/constants.js`,
matching `package.json` and `VERSION`). Desktop artifacts package as semver
`1.2.0` because Tauri and Cargo require strict semver, which the four-part
`1.2.0.1` does not satisfy; the desktop version is the semver normalization of
the app release (first three components). The web app and the desktop shell are
the same release; the desktop does not carry an independent feature version.

The Tauri v2 foundation in `src-tauri/` packages the existing Vite SPA into a
portable Windows executable. Frontend assets from `frontendDist` are embedded
in the executable; no installer or registry shortcut is used.

## Prerequisites

Install Rust (with the MSVC toolchain), Microsoft C++ Build Tools, and WebView2
using the official Tauri Windows prerequisites. These are system dependencies;
the project does not install them. Node.js `^20.19.0 || ^22.13.0 || >=24.0.0` and
npm 10 or newer are required locally; use the current LTS release.

## Development and packaging

```powershell
npm install
npm run tauri:dev
npm run portable:build
```

`npm run portable:build` builds without a Tauri bundle target and creates
`RecoverySys-Portable.zip` in this directory. The ZIP contains
`RecoverySys.exe` and a concise `README.txt`. To use it, extract the archive
before running the executable; it does not install anything. Windows must have
the Microsoft Edge WebView2 Evergreen Runtime installed separately; WebView2
is required and is not bundled.

The build uses Vite on port 5173. A normal `npm run build` remains the GitHub
Pages build and uses `/RecoverySys/`; Tauri builds use relative asset paths
automatically.

## Offline behavior

The app remains usable offline for its local catalog, calculations, and saved
configurations. Google Fonts, OpenStreetMap tiles, and ThrustCurve motor search
are network-dependent; when offline they may be absent or unavailable and
should not be treated as bundled data. Import a local `.eng` file when motor
search is unavailable.

## macOS universal portable build

The macOS workflow builds both `aarch64-apple-darwin` and `x86_64-apple-darwin`
and produces `RecoverySys-macos-universal.zip`, containing one universal
`RecoverySys.app`. It has an ad-hoc signature (not an Apple Developer ID
signature), is unsigned for trusted distribution, and is not notarized.

After verifying that you trust the source, extract the ZIP, then in Finder
right-click `RecoverySys.app` and choose **Open**, confirming the prompt. If
macOS still blocks this app, remove quarantine only from this app:
`xattr -dr com.apple.quarantine /path/to/RecoverySys.app`.
Do not disable Gatekeeper globally.

The workflow uploads `RecoverySys-macos-universal.zip` as a GitHub Actions artifact.
It is not a GitHub Release download: fetch it from the workflow run's artifacts,
then extract it once to reach `RecoverySys.app`. If a GitHub Release is added, the
inner `RecoverySys-macos-universal.zip` should be attached directly.

The current-main Windows workflow uploads the extracted contents as the
`RecoverySys-Portable` Actions artifact; it is not the historical v1.2.0.0
installer and is not currently a release asset.
