import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const artifactsDir = path.join(here, 'artifacts')
const appBinary = process.env.RECOVERYSYS_E2E_APP

if (!appBinary) {
  throw new Error(
    'RECOVERYSYS_E2E_APP must point at the built RecoverySys binary. ' +
      'Windows: the extracted release exe from RecoverySys-Portable.zip. ' +
      'macOS: src-tauri/target/release/RecoverySys built with --features e2e.'
  )
}

if (!fs.existsSync(appBinary)) {
  throw new Error(`RECOVERYSYS_E2E_APP does not exist: ${appBinary}`)
}

const isWindows = process.platform === 'win32'

export const config = {
  runner: 'local',
  specs: ['./specs/**/*.spec.js'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': {
        application: appBinary,
      },
    },
  ],
  services: [
    [
      '@wdio/tauri-service',
      {
        appBinaryPath: appBinary,
        // Windows exercises the shipped release binary through the official
        // tauri-driver + msedgedriver path. macOS has no tauri-driver support,
        // so it uses the embedded provider linked only into the e2e build.
        driverProvider: isWindows ? 'official' : 'embedded',
        // CI installs tauri-driver explicitly at a pinned version.
        autoInstallTauriDriver: false,
        // CI sets EDGEDRIVER_VERSION to the runner's installed WebView2
        // runtime version, so the downloaded msedgedriver matches it exactly.
        autoDownloadEdgeDriver: true,
        ...(process.env.EDGEDRIVER_VERSION
          ? { edgeDriverVersion: process.env.EDGEDRIVER_VERSION }
          : {}),
        logDir: path.join(artifactsDir, 'wdio-logs'),
        logLevel: process.env.WDIO_TAURI_LOG_LEVEL || 'info',
        startTimeout: 180_000,
        statusPollTimeout: 5_000,
        commandTimeout: 60_000,
      },
    ],
  ],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 30_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 1,
  outputDir: artifactsDir,
  framework: 'mocha',
  reporters: [['spec', { onlyFailures: false }]],
  mochaOpts: {
    ui: 'bdd',
    timeout: 300_000,
  },
  afterTest: async function (test, _context, { error }) {
    if (!error) return
    const failures = path.join(artifactsDir, 'failures')
    fs.mkdirSync(failures, { recursive: true })
    const safeTitle = String(test.title || 'test')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .slice(0, 80)
    const stem = `${Date.now()}-${safeTitle}`
    try {
      await browser.saveScreenshot(path.join(failures, `${stem}.png`))
    } catch (screenshotError) {
      fs.writeFileSync(
        path.join(failures, `${stem}-screenshot-error.txt`),
        String(screenshotError?.stack || screenshotError)
      )
    }
    try {
      fs.writeFileSync(path.join(failures, `${stem}.html`), await browser.getPageSource())
    } catch (sourceError) {
      fs.writeFileSync(
        path.join(failures, `${stem}-source-error.txt`),
        String(sourceError?.stack || sourceError)
      )
    }
  },
}
