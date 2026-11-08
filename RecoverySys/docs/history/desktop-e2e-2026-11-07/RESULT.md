# Desktop E2E lane — result and review (2026-11-07)

Base `11d91f9`; author commits `021cb9a`, `d7612b8`, `deaea10`
(`opencode-go/deepseek-v4.1-flash`). Reviewed and merged by the orchestrator
(`claude-opus-5-5`). The author did not self-accept.

## What runs on every push

- **Windows:** the shipped `RecoverySys.exe` from `RecoverySys-Portable.zip`,
  unmodified, driven by `tauri-driver` 2.1.0 and `msedgedriver` pinned to the
  runner's WebView2 version. On the runner only, an HKLM WebView2 policy enables
  remote debugging; the app is not changed.
- **macOS:** a test build with the non-default `e2e` cargo feature
  (`tauri-plugin-wdio-webdriver` 1.5.1, embedded WebDriver). The shipped
  universal `.app` and Windows exe are checked to be marker-free; the test
  build is checked to contain the marker.
- One shared WebdriverIO spec (`e2e-desktop/specs/desktop.spec.js`): brand and
  version label, fresh plan, six inputs, main and drogue selection, simulation,
  Recovery Brief numeric sections, and persistence.

## Evidence

- CI run 42427514498: `check` on Node 22/24/26, the Windows job and the macOS
  job all succeeded. Five of five specs passed on WebView2 156 (Windows) and
  WebKit 605.1.15 (macOS).
- The orchestrator inspected the downloaded screenshots `01`–`06` for both
  operating systems. Brief sections render in the real windows, and the plan
  survives the persistence step.
- Locally, `npm run check` passed: 51 files and 482 tests.

## Limits

- Windows persistence is checked with a webview reload. msedgedriver uses a
  fresh profile for each session, so a full relaunch cannot be checked there.
  macOS checks a full process relaunch.
- macOS tests a feature-flagged build of the same source, not the shipped
  binary.
- Not covered: a human walkthrough, Intel Mac launch, signing, SmartScreen or
  Gatekeeper behaviour.
- Adding the optional plugin re-resolved `Cargo.lock`. Shared crates moved to
  newer semver-compatible versions (for example `tauri-utils` 2.9.3 → 2.10.2),
  so the shipped binary's dependency set changed. The shipped Windows exe
  passed the full workflow with these versions.
