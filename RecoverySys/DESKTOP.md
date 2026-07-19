# RecoverySys Windows desktop build

The Tauri v2 foundation in `src-tauri/` packages the existing Vite SPA as a
per-user Windows NSIS installer.

## Prerequisites

Install Rust (with the MSVC toolchain), Microsoft C++ Build Tools, and WebView2
using the official Tauri Windows prerequisites. These are system dependencies;
the project does not install them. Node.js `^20.19.0 || ^22.13.0 || >=24.0.0` and
npm 10 or newer are required locally; use the current LTS release.

## Development and packaging

```powershell
npm install
npm run tauri:dev
npm run tauri:build
```

The build uses Vite on port 5173 and writes the NSIS installer under
`src-tauri/target/release/bundle/nsis/`. A normal `npm run build` remains the
GitHub Pages build and uses `/RecoverySys/`; Tauri builds use relative asset
paths automatically.

## Offline behavior

The app remains usable offline for its local catalog, calculations, and saved
configurations. Google Fonts, OpenStreetMap tiles, and ThrustCurve motor search
are network-dependent; when offline they may be absent or unavailable and
should not be treated as bundled data. Import a local `.eng` file when motor
search is unavailable.
