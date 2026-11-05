import { test as base, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { installDeterministicRouting } from './support/deterministicRouting.js'

const supplierSnapshot = JSON.parse(await readFile(resolve('public/supplier-prices.json'), 'utf8'))

const test = base.extend({
  guardedPage: async ({ page }, use) => {
    const pageErrors = []
    const consoleErrors = []
    const requestErrors = []
    await installDeterministicRouting(page)
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      if (
        request.url().startsWith('http://127.0.0.1:4174/') &&
        request.failure()?.errorText !== 'net::ERR_ABORTED'
      ) {
        requestErrors.push(`${request.url()} — ${request.failure()?.errorText ?? 'request failed'}`)
      }
    })

    await use(page)

    expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([])
    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([])
    expect(requestErrors, `same-origin request errors: ${requestErrors.join('\n')}`).toEqual([])
  },
})

async function prepareStorage(page, { firstVisit = false, seed = null, customParts = [] } = {}) {
  await page.addInitScript(
    ({ isFirstVisit, payload, parts }) => {
      if (sessionStorage.getItem('__e2e_storage_initialized')) return
      localStorage.clear()
      if (!isFirstVisit) localStorage.setItem('recoverysys-visited', '1')
      if (payload) localStorage.setItem('recoverysys-config', JSON.stringify(payload))
      if (parts.length > 0) localStorage.setItem('recoverysys-custom-parts', JSON.stringify(parts))
      sessionStorage.setItem('__e2e_storage_initialized', '1')
    },
    { isFirstVisit: firstVisit, payload: seed, parts: customParts }
  )
}

async function openDashboard(page, options) {
  await prepareStorage(page, options)
  await page.goto('./')
  await expect(page.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()
  await page.getByRole('tab', { name: 'DASHBOARD' }).click()
}

async function configureRocket(page) {
  await page.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await page.locator('#mass').fill('2500')
  await page.locator('#impulse').fill('640')
  await page.locator('#burn').fill('1.8')
  await page.locator('#airframe-id').fill('3.9')
  await page.locator('#bay-length').fill('18')
  await page.locator('#cd').fill('0.5')
  await page.getByRole('tab', { name: 'DASHBOARD' }).click()
  await page.getByRole('button', { name: 'Main Chute' }).click()
  await page.getByRole('button', { name: /24" Compact Light/ }).click()
}

async function simulate(page) {
  await page.getByRole('tab', { name: 'SIMULATION' }).click()
  await page.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(page.getByText('APOGEE_ALTITUDE')).toBeVisible()
}

async function acceptLegacyOpenRocket(page) {
  await page.getByRole('tab', { name: 'EXPORT' }).click()
  await page
    .locator('input[type="file"][accept*=".ork"]')
    .setInputFiles(resolve('src/test/fixtures/openrocket/legacy-example-1.5.ork'))
  await expect(page.getByText(/LEGACY_FORMAT/)).toBeVisible()
  for (const label of ['CONFIGURATION', 'STAGE', 'AIRFRAME_ID_CANDIDATE', 'BAY_LENGTH_CANDIDATE']) {
    await page.getByLabel(label, { exact: true }).selectOption({ index: 1 })
  }
  await page.getByRole('button', { name: /ACCEPT_VEHICLE_SNAPSHOT/ }).click()
  await expect(page.getByText(/IMPORTED_SOURCE/)).toContainText('legacy-example-1.5.ork')
}

test('supplier budget aggregates fresh offers and keeps unknown custom parts explicit', async ({
  guardedPage,
}) => {
  const main = supplierSnapshot.offers.find((offer) => offer.partId === 'cfc-048-n')
  const drogue = supplierSnapshot.offers.find((offer) => offer.partId === 'cfc-024-n')
  const fetchedAt = new Date().toISOString()
  await guardedPage.route('https://raw.githubusercontent.com/**/supplier-prices.json', (route) =>
    route.fulfill({
      json: {
        version: 1,
        offers: [
          { ...main, fetchedAt, stock: 'in-stock' },
          { ...drogue, fetchedAt, stock: 'in-stock' },
        ],
      },
    })
  )

  const customCord = {
    id: 'custom-cord',
    category: 'shock_cord',
    name: 'Measured cord',
    specs: {
      packed_height_in: 3,
      packed_diam_in: 2,
      strength_lbs: 2000,
      weight_g: 120,
      length_ft: 20,
      elongation_pct: 20,
      material: 'nylon',
    },
  }
  await openDashboard(guardedPage, {
    seed: {
      schemaVersion: 1,
      config: {
        main_chute: { id: 'cfc-048-n' },
        drogue_chute: { id: 'cfc-024-n' },
        shock_cord: customCord,
      },
      specs: {},
    },
    customParts: [customCord],
  })
  const panel = guardedPage.getByRole('region', { name: 'Supplier prices and availability' })
  await panel.getByRole('button', { name: 'Check price & stock' }).click()
  await expect(panel).toContainText('Known subtotal:')
  await expect(panel).toContainText('$252.32 USD')
  await expect(panel).toContainText('1 unpriced; 0 stale (excluded); 0 with unavailable')
  await expect(panel).toContainText('Budget is incomplete.')
  await panel.getByText(/Selected parts & supplier details/).click()
  await expect(panel).toContainText('Reported in stock')
  await expect(panel).toContainText('Price and stock unknown')
})

test('custom parts can be created, edited, selected, reloaded, and deleted', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await guardedPage.getByRole('button', { name: 'Main Chute' }).click()
  const add = guardedPage.getByRole('button', { name: /Add Custom Part/ })
  await add.click()
  await guardedPage.getByLabel('Custom part name').fill('E2E Custom Main')
  await guardedPage.getByLabel('Diameter (in)').fill('48')
  await guardedPage.getByLabel('Drag Coeff (Cd)').fill('1.2')
  await guardedPage.getByLabel('Packed Diam (in)').fill('4')
  await guardedPage.getByLabel('Packed Length (in)').fill('5')
  await guardedPage.getByLabel('Weight (g)').fill('420')
  await guardedPage.getByRole('button', { name: 'Add Part' }).click()

  const card = guardedPage.getByRole('button', { name: /^E2E Custom Main —/ })
  await expect(card).toBeVisible()
  await card.click()
  await expect(guardedPage.locator('[data-slot="main_chute"]')).toContainText('E2E Custom Main')

  await guardedPage.getByRole('button', { name: 'Edit E2E Custom Main' }).click()
  await guardedPage.getByLabel('Custom part name').fill('E2E Renamed Main')
  await guardedPage.getByRole('button', { name: 'Save Changes' }).click()
  await expect(guardedPage.getByRole('button', { name: /^E2E Renamed Main —/ })).toBeVisible()
  await expect(guardedPage.locator('[data-slot="main_chute"]')).toContainText('E2E Renamed Main')

  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await guardedPage.getByRole('button', { name: 'Main Chute' }).click()
  await expect(guardedPage.getByRole('button', { name: /^E2E Renamed Main —/ })).toBeVisible()

  await guardedPage.getByRole('button', { name: 'Delete E2E Renamed Main' }).click()
  await expect(guardedPage.getByRole('button', { name: /^E2E Renamed Main —/ })).toHaveCount(0)
  await expect(guardedPage.locator('[data-slot="main_chute"]')).toContainText('NO_COMPONENT_LOADED')
  await expect
    .poll(() =>
      guardedPage.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('recoverysys-config') ?? 'null')
        return stored?.config?.main_chute ?? null
      })
    )
    .toBeNull()
})

test('motor search writes selected values and reports an unavailable API', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await guardedPage.route('https://www.thrustcurve.org/api/v1/search.json**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            motorId: 'e2e-j350',
            designation: 'J350W',
            manufacturerAbbrev: 'AeroTech',
            totImpulseNs: 650,
            burnTimeS: 1.2,
          },
        ],
      },
    })
  )
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  const search = guardedPage.getByPlaceholder('e.g. J350, K185, L1000…')
  await search.fill('J350')
  await guardedPage.getByRole('button', { name: /J350W/ }).click()
  await expect(guardedPage.locator('#impulse')).toHaveValue('650')
  await expect(guardedPage.locator('#burn')).toHaveValue('1.20')

  await guardedPage.getByTitle('Clear motor selection').click()
  // Invalid JSON keeps the response HTTP-200 so the check verifies the app's
  // parse-error path rather than the browser's expected console logging for 5xx.
  await guardedPage.route('https://www.thrustcurve.org/api/v1/search.json**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json' })
  )
  await search.fill('K185')
  await expect(guardedPage.getByText(/ThrustCurve unavailable/)).toBeVisible()
})

test('simulation failure reports the likely cause and leaves no current result', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('10000')
  await guardedPage.locator('#impulse').fill('1')
  await guardedPage.locator('#burn').fill('1')
  await guardedPage.locator('#airframe-id').fill('3.9')
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await guardedPage.getByRole('button', { name: 'Main Chute' }).click()
  await guardedPage.getByRole('button', { name: /24" Compact Light/ }).click()
  await guardedPage.getByRole('tab', { name: 'SIMULATION' }).click()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText(/Simulation failed/)).toBeVisible()
  await guardedPage.getByRole('tab', { name: 'ANALYSIS' }).click()
  await expect(guardedPage.getByRole('tabpanel').getByText('Not run').first()).toBeVisible()
})

test('JSON round trip preserves accepted OpenRocket source identity', async ({
  browser,
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await acceptLegacyOpenRocket(guardedPage)
  const downloadPromise = guardedPage.waitForEvent('download')
  await guardedPage.getByRole('button', { name: /DOWNLOAD_JSON/ }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  const receiver = await browser.newContext()
  const receiverPage = await receiver.newPage()
  await installDeterministicRouting(receiverPage)
  await openDashboard(receiverPage)
  await receiverPage.getByRole('tab', { name: 'EXPORT' }).click()
  await receiverPage.locator('input[type="file"][accept=".json"]').setInputFiles(downloadPath)
  await expect(receiverPage.getByText(/IMPORTED_SOURCE/)).toContainText('legacy-example-1.5.ork')
  await expect(receiverPage.getByText(/IMPORTED_SOURCE/)).toContainText('1.5')
  await receiverPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(receiverPage.locator('#airframe-id')).not.toHaveValue('')
  await receiver.close()
})

test('flight record import dedupes ids and candidate evidence keeps the prediction identity', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'FLIGHT_LOG' }).click()
  await guardedPage.getByLabel('Location').fill('FAR Mojave')
  await guardedPage.getByLabel('Notes').fill('E2E prediction snapshot')
  await guardedPage.getByRole('button', { name: /LOG_FLIGHT/ }).click()
  await expect(guardedPage.getByText('History (1 flight)')).toBeVisible()

  const recordsDownload = guardedPage.waitForEvent('download')
  await guardedPage.getByRole('button', { name: 'EXPORT_RECORDS' }).click()
  const recordsPath = await (await recordsDownload).path()

  const evidenceDownload = guardedPage.waitForEvent('download')
  await guardedPage.getByRole('button', { name: 'EXPORT_CANDIDATE_EVIDENCE' }).click()
  const evidencePath = await (await evidenceDownload).path()
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'))
  expect(evidence.entries).toHaveLength(1)
  expect(evidence.entries[0].predictionIdentity).toMatch(/^sim-/)
  expect(evidence.entries[0].predicted.apogee_ft).toBeGreaterThan(0)

  await guardedPage.getByLabel('IMPORT_RECORDS').setInputFiles(recordsPath)
  await expect(
    guardedPage.getByText('No new flight records — every record is already in this log.')
  ).toBeVisible()
  await expect(guardedPage.getByText('History (1 flight)')).toBeVisible()

  await guardedPage.getByLabel('IMPORT_CANDIDATE_EVIDENCE').setInputFiles(evidencePath)
  await expect(
    guardedPage.getByText('No new candidate evidence — every record is already in this log.')
  ).toBeVisible()
  await expect(guardedPage.getByText('History (1 flight)')).toBeVisible()

  await guardedPage.getByTitle('Delete entry').click()
  await expect(guardedPage.getByText(/History \(1 flight\)/)).toHaveCount(0)
  await expect(guardedPage.getByText('E2E prediction snapshot')).toHaveCount(0)
})

test('legacy saved payloads migrate and future share payloads are rejected', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage, {
    seed: {
      config: { main_chute: { id: 'cl-24-n' } },
      specs: { rocket_mass_g: '2500', airframe_od_in: '4.1' },
    },
  })
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#airframe-id')).toHaveValue('4.1')

  const futurePayload = {
    schemaVersion: 999,
    config: {},
    specs: {},
    customMotor: null,
  }
  const encoded = Buffer.from(encodeURIComponent(JSON.stringify(futurePayload))).toString('base64')
  await guardedPage.goto(`./?c=${encodeURIComponent(encoded)}`)
  await expect(guardedPage.getByText(/Share link rejected/)).toBeVisible()
  await expect(guardedPage.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()
})

test('a transient invalid field does not wipe the saved plan on reload', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await configureRocket(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('0')
  await guardedPage.waitForTimeout(500)
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await expect(guardedPage.locator('[data-slot="main_chute"]')).toContainText('Compact Light')
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('')
  await expect(guardedPage.locator('#impulse')).toHaveValue('640')
})

test('a corrupt custom-parts store is reported and left untouched', async ({ guardedPage }) => {
  await openDashboard(guardedPage)
  await guardedPage.evaluate(() => localStorage.setItem('recoverysys-custom-parts', '{corrupt'))
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'DASHBOARD' }).click()
  await expect(
    guardedPage.getByText(/Stored flight log could not be read|Restored your last session/)
  ).toHaveCount(0)
  await guardedPage.waitForTimeout(500)
  expect(await guardedPage.evaluate(() => localStorage.getItem('recoverysys-custom-parts'))).toBe(
    '{corrupt'
  )
})

test('saving a share-link session clears the share parameter and survives reload', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await configureRocket(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.getByRole('button', { name: /Copy Share Link/ }).click()
  await expect
    .poll(() => guardedPage.evaluate(() => navigator.clipboard.readText()))
    .toContain('?c=')
  const shareUrl = await guardedPage.evaluate(() => navigator.clipboard.readText())

  await guardedPage.goto(shareUrl)
  await expect(guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' })).toBeVisible()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('2500')
  await guardedPage.getByRole('button', { name: /Save Config/ }).click()
  await expect(guardedPage.getByRole('button', { name: /Saved/ })).toBeVisible()
  expect(guardedPage.url()).not.toContain('?c=')

  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('2500')
})

test('previewing an OpenRocket archive does not disable auto-save', async ({ guardedPage }) => {
  await openDashboard(guardedPage)
  await guardedPage.getByRole('tab', { name: 'EXPORT' }).click()
  await guardedPage
    .locator('input[type="file"][accept*=".ork"]')
    .setInputFiles(resolve('src/test/fixtures/openrocket/legacy-example-1.5.ork'))
  await expect(guardedPage.getByText(/LEGACY_FORMAT/)).toBeVisible()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.locator('#mass').fill('2600')
  await guardedPage.waitForTimeout(500)
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('2600')
})

test('demo Save does not overwrite the user saved plan', async ({ guardedPage }) => {
  await openDashboard(guardedPage, {
    seed: {
      schemaVersion: 1,
      config: { main_chute: { id: 'cfc-048-n' } },
      specs: { rocket_mass_g: '4321', motor_total_impulse_ns: '999' },
    },
  })
  const saved = await guardedPage.evaluate(() =>
    JSON.parse(localStorage.getItem('recoverysys-config'))
  )
  await guardedPage.goto('./?demo=1')
  await expect(guardedPage.getByRole('status')).toContainText('DEMO')
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.getByRole('button', { name: /Save Config/ }).click()
  await expect(guardedPage.getByText(/Demo mode does not overwrite/)).toBeVisible()
  expect(
    await guardedPage.evaluate(() => JSON.parse(localStorage.getItem('recoverysys-config')))
  ).toMatchObject({ config: saved.config, specs: saved.specs })

  await guardedPage.goto('./')
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('4321')
})

test('Start Fresh after a share link clears the link so reload stays empty', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage)
  await configureRocket(guardedPage)
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await guardedPage.getByRole('button', { name: /Copy Share Link/ }).click()
  await expect
    .poll(() => guardedPage.evaluate(() => navigator.clipboard.readText()))
    .toContain('?c=')
  const shareUrl = await guardedPage.evaluate(() => navigator.clipboard.readText())
  await guardedPage.goto(shareUrl)
  await guardedPage.getByRole('tab', { name: 'GUIDED_REVIEW' }).click()
  guardedPage.on('dialog', (dialog) => dialog.accept())
  await guardedPage.getByRole('button', { name: /start a new plan/i }).click()
  expect(guardedPage.url()).not.toContain('?c=')
  await guardedPage.reload()
  await guardedPage.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
  await expect(guardedPage.locator('#mass')).toHaveValue('')
})

test('packing screening does not show a passing badge when capacity is not evaluated', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage, {
    seed: {
      schemaVersion: 1,
      config: { main_chute: { id: 'cl-24-n' } },
      specs: {
        rocket_mass_g: '2500',
        motor_total_impulse_ns: '640',
        burn_time_s: '1.8',
        airframe_id_in: '4',
        bay_length_in: '6',
        bay_obstruction_vol_in3: '5000',
      },
    },
  })
  await guardedPage.getByRole('tab', { name: 'SIMULATION' }).click()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  const packing = guardedPage.getByRole('region', { name: 'Packing screening' })
  await expect(packing).toContainText('Unavailable')
  await expect(packing).toContainText('NOT EVALUATED')
  await expect(packing).not.toContainText('SCREENING AVAILABLE')
})

test('rapidly leaving the dispersion map does not raise runtime errors', async ({
  guardedPage,
}) => {
  await openDashboard(guardedPage, {
    seed: {
      schemaVersion: 1,
      config: { main_chute: { id: 'cl-24-n' } },
      specs: {
        rocket_mass_g: '2500',
        motor_total_impulse_ns: '640',
        burn_time_s: '1.8',
        airframe_id_in: '3.9',
        bay_length_in: '18',
        drag_cd: '0.5',
        wind_speed_mph: '10',
        wind_direction_deg: '270',
        launch_lat: '35.3456',
        launch_lon: '-117.8083',
      },
    },
  })
  await guardedPage.getByRole('tab', { name: 'SIMULATION' }).click()
  await guardedPage.getByRole('button', { name: /RUN_SIMULATION/ }).click()
  await expect(guardedPage.getByText('APOGEE_ALTITUDE')).toBeVisible()
  for (let index = 0; index < 6; index += 1) {
    await guardedPage.getByRole('tab', { name: 'DISPERSION' }).click()
    await guardedPage.waitForTimeout(80)
    await guardedPage.getByRole('tab', { name: 'COMPARE' }).click()
    await guardedPage.waitForTimeout(20)
  }
  await guardedPage.getByRole('tab', { name: 'DISPERSION' }).click()
  await expect(guardedPage.locator('.leaflet-container')).toBeVisible()
})

// One plan crosses each transfer boundary in a fresh browser context. Inputs
// transfer; numerical authority must be regenerated before any current result.
test('fresh-context transfer matrix preserves estimates, findings, print and evidence identity', async ({
  browser,
  guardedPage,
}, testInfo) => {
  test.setTimeout(120_000)
  guardedPage.setDefaultTimeout(15_000)
  await openDashboard(guardedPage)
  await configureRocket(guardedPage)
  await simulate(guardedPage)
  await guardedPage.getByRole('tab', { name: 'RECOVERY_BRIEF' }).click()
  const brief = guardedPage.getByRole('tabpanel')
  const sourceEstimates = await brief.locator('#brief-estimates-title').locator('..').innerText()
  const metricValues = await brief
    .locator('#brief-estimates-title')
    .locator('..')
    .locator('dd')
    .allTextContents()
  const sourceChecks = await brief.locator('#brief-checks-title').locator('..').innerText()
  const checkCodes = await brief
    .locator('#brief-checks-title')
    .locator('..')
    .locator('strong')
    .allTextContents()
  const identity = (await brief.locator('#brief-provenance-title').locator('..').innerText()).match(
    /sim-[a-f0-9]+/
  )[0]
  const model = 'browser-js-recovery'
  await expect(brief).toContainText(model)
  await expect(brief).toContainText('No accepted comparison or flight evidence')

  await guardedPage.getByRole('tab', { name: 'EXPORT' }).click()
  const downloadPromise = guardedPage.waitForEvent('download')
  await guardedPage.getByRole('button', { name: /DOWNLOAD_JSON/ }).click()
  const jsonPath = await (await downloadPromise).path()
  const payload = JSON.parse(await readFile(jsonPath, 'utf8'))
  expect(payload.simulation).toBeUndefined()
  await guardedPage.getByRole('button', { name: /COPY_SHARE_LINK/ }).click()
  await expect
    .poll(() => guardedPage.evaluate(() => navigator.clipboard.readText()))
    .toContain('?c=')
  const shareUrl = await guardedPage.evaluate(() => navigator.clipboard.readText())

  for (const transfer of ['json', 'share', 'reload']) {
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use
    const context = await browser.newContext({
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
    })
    try {
      const page = await context.newPage()
      page.setDefaultTimeout(15_000)
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await installDeterministicRouting(page)
      await openDashboard(page)
      if (transfer === 'json') {
        await page.getByRole('tab', { name: 'EXPORT' }).click()
        await page.getByRole('button', { name: /IMPORT_JSON/ }).click()
        await page.locator('input[type="file"][accept=".json"]').setInputFiles(jsonPath)
      } else {
        await page.goto(shareUrl)
        if (transfer === 'reload') {
          await page.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
          await page.getByRole('button', { name: /Save Config/ }).click()
          await page.reload()
        }
      }
      await page.getByRole('tab', { name: 'RECOVERY_BRIEF' }).click()
      await expect(page.getByRole('tabpanel').getByRole('status')).toContainText(
        'NO CURRENT RESULT'
      )
      await expect(page.locator('#brief-estimates-title').locator('..')).not.toContainText('Apogee')
      await simulate(page)
      await page.getByRole('tab', { name: 'RECOVERY_BRIEF' }).click()
      const current = page.getByRole('tabpanel')
      await expect(current.getByRole('status')).toContainText('CURRENT RESULT')
      expect(await current.locator('#brief-estimates-title').locator('..').innerText()).toBe(
        sourceEstimates
      )
      expect(await current.locator('#brief-checks-title').locator('..').innerText()).toBe(
        sourceChecks
      )
      await expect(current.locator('#brief-provenance-title').locator('..')).toContainText(identity)

      await page.getByRole('tab', { name: 'EXPORT' }).click()
      await page.evaluate(() => {
        window.print = () => {}
      })
      for (const mode of ['RECOVERY_BRIEF', 'CHECKLIST']) {
        await page.getByRole('button', { name: new RegExp(`PRINT_${mode}`) }).click()
        await page.emulateMedia({ media: 'print' })
        const artifact = page.locator('.print-checklist')
        await expect(artifact.locator('.print-shared-provenance')).toBeVisible()
        await expect(artifact.locator('.print-shared-provenance')).toContainText(identity)
        await expect(artifact.locator('.print-shared-provenance')).toContainText(model)
        await expect(artifact.locator('.print-shared-provenance')).toContainText(
          'Result state: current'
        )
        await expect(artifact.locator('.print-shared-review')).toBeVisible()
        for (const code of checkCodes)
          await expect(artifact.locator('.print-shared-review')).toContainText(code)
        const estimates = artifact
          .getByRole('heading', {
            name: mode === 'RECOVERY_BRIEF' ? 'Current key estimates' : 'Simulation Results',
            exact: true,
          })
          .locator('..')
        for (const value of metricValues) await expect(estimates).toContainText(value)
        await expect(artifact.locator('.print-shared-provenance')).toContainText(
          'isa-apogee-descent-v1'
        )
        await expect(artifact.locator('.print-shared-provenance')).toContainText(
          'recovery-assumptions-v1'
        )
        await page.emulateMedia({ media: 'screen' })
      }
      await page.getByRole('tab', { name: 'FLIGHT_LOG' }).click()
      await page.getByRole('button', { name: /LOG_FLIGHT/ }).click()
      const evidencePromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'EXPORT_CANDIDATE_EVIDENCE' }).click()
      const evidencePath = await (await evidencePromise).path()
      const evidence = JSON.parse(await readFile(evidencePath, 'utf8'))
      expect(evidence.entries[0]).toMatchObject({
        predictionIdentity: identity,
        corpusEvidence: false,
        reviewerStatus: 'unreviewed',
        simulationProvenance: { modelId: model },
        units: { main_fps: 'ft/s', apogee_ft: 'ft' },
      })
      const recordsPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'EXPORT_RECORDS' }).click()
      const recordsPath = await (await recordsPromise).path()
      for (const [label, path] of [
        ['IMPORT_RECORDS', recordsPath],
        ['IMPORT_CANDIDATE_EVIDENCE', evidencePath],
      ]) {
        const intake = await browser.newContext({
          viewport,
          userAgent,
          deviceScaleFactor,
          isMobile,
          hasTouch,
        })
        try {
          const receiver = await intake.newPage()
          receiver.setDefaultTimeout(15_000)
          await installDeterministicRouting(receiver)
          await openDashboard(receiver)
          await receiver.getByRole('tab', { name: 'FLIGHT_LOG' }).click()
          await receiver.getByLabel(label, { exact: true }).setInputFiles(path)
          await expect(receiver.getByText('History (1 flight)')).toBeVisible()
          const reexportPromise = receiver.waitForEvent('download')
          await receiver.getByRole('button', { name: 'EXPORT_CANDIDATE_EVIDENCE' }).click()
          const imported = JSON.parse(await readFile(await (await reexportPromise).path(), 'utf8'))
            .entries[0]
          expect(imported.predictionIdentity).toBe(identity)
          expect(imported.predicted).toEqual(evidence.entries[0].predicted)
          expect(imported.units).toEqual(evidence.entries[0].units)
          expect(imported.reviewerStatus).toBe('unreviewed')
          expect(imported.corpusEvidence).toBe(false)
          await receiver.getByRole('tab', { name: 'RECOVERY_BRIEF' }).click()
          await expect(receiver.getByRole('tabpanel').getByRole('status')).toContainText(
            'NO CURRENT RESULT'
          )
          await expect(receiver.locator('#brief-estimates-title').locator('..')).not.toContainText(
            'Apogee'
          )
        } finally {
          await intake.close()
        }
      }
      await page.getByRole('tab', { name: 'ROCKET_SPECS' }).click()
      await page.locator('#mass').fill('2600')
      await page.getByRole('tab', { name: 'RECOVERY_BRIEF' }).click()
      await expect(page.getByRole('tabpanel').getByRole('status')).toContainText('STALE RESULT')
      await expect(page.locator('#brief-estimates-title').locator('..')).not.toContainText('Apogee')
      await page.getByRole('tab', { name: 'EXPORT' }).click()
      for (const mode of ['RECOVERY_BRIEF', 'CHECKLIST']) {
        await page.getByRole('button', { name: new RegExp(`PRINT_${mode}`) }).click()
        await page.emulateMedia({ media: 'print' })
        await expect(page.locator('.print-shared-provenance')).toContainText('Result state: stale')
        await expect(page.locator('.print-checklist')).toContainText('RESULT_STALE')
        const staleEstimates = page
          .locator('.print-checklist')
          .getByRole('heading', {
            name: mode === 'RECOVERY_BRIEF' ? 'Current key estimates' : 'Simulation Results',
            exact: true,
          })
          .locator('..')
        await expect(staleEstimates.locator('table')).toHaveCount(0)
        await page.emulateMedia({ media: 'screen' })
      }
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  }
})
