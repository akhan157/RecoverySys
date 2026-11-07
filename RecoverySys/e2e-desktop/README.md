# RecoverySys desktop E2E

Shared WebDriver spec for the real Tauri desktop app. The same
`specs/desktop.spec.js` runs on both desktop CI jobs.

| OS      | App under test                                                                           | Driver path                                                             |
| ------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Windows | `RecoverySys.exe` extracted from `RecoverySys-Portable.zip` (release build)              | `tauri-driver` 2.1.0 + `msedgedriver` pinned to the WebView2 runtime    |
| macOS   | `src-tauri/target/release/RecoverySys` built with `--features e2e` (not the shipped app) | `@wdio/tauri-service` embedded provider (`tauri-plugin-wdio-webdriver`) |

The macOS embedded WebDriver server is a test-only in-app hook. It is behind
the non-default `e2e` cargo feature; the shipped portable archive and the
universal `.app` are built with default features and are asserted in CI to
contain no `RECOVERYSYS_E2E_WEBDRIVER_MARKER` string. The feature build is
asserted to contain that marker, so the check cannot pass vacuously.

## Local run

```sh
cd RecoverySys/e2e-desktop
npm ci

# Windows: extract the release archive first, then point at the exe
RECOVERYSYS_E2E_APP=/abs/path/RecoverySys.exe npm run test:desktop

# macOS: build the feature-flagged test binary first
(cd .. && npm run tauri:build -- --no-bundle --features e2e)
RECOVERYSYS_E2E_APP=/abs/path/RecoverySys/src-tauri/target/release/RecoverySys \
  npm run test:desktop
```

On Windows CI, `EDGEDRIVER_VERSION` is set to the runner's installed WebView2
runtime version; the service downloads the exactly matching `msedgedriver`.
Locally, omit it and the service detects the runtime.

Artifacts are written to `artifacts/`: per-step screenshots, failure
screenshots/page source, and the WDIO console log when CI tees it.

## Persistence check

The final step reloads the webview and re-asserts the plan. On macOS the
embedded provider restarts the real app profile, so the step uses a full
process relaunch there. On Windows, msedgedriver allocates a fresh temporary
WebView2 profile for every WebDriver session, so a session relaunch would lose
the profile by construction; the Windows run reloads the webview instead and
still asserts the plan came back from `localStorage`.
