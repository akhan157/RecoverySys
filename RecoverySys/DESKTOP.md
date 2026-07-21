# RecoverySys Windows desktop build

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
