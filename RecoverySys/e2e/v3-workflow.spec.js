import { test as base, expect } from '@playwright/test'
import { installDeterministicRouting } from './support/deterministicRouting.js'

const test = base.extend({
  guardedPage: async ({ page }, use) => {
    await installDeterministicRouting(page)
    const errors = []
    const warnings = []

    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
      if (message.type() === 'warning') warnings.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await use({
      page,
      assertNoErrors: () => {
        expect(errors).toEqual([])
      },
    })
  },
})

async function openApp(page, options = {}) {
  const query = new URLSearchParams()
  if (options.demo) query.set('demo', '1')
  if (options.fresh) query.set('fresh', '1')
  const search = query.toString() ? `?${query.toString()}` : ''
  await page.goto(`http://127.0.0.1:4174/${search}`)
  await page.waitForSelector('#root:not(:empty)')
}

test('guided wizard opens, steps through 6-phase configuration, and completes to dashboard', async ({
  guardedPage,
}) => {
  const { page, assertNoErrors } = guardedPage
  await openApp(page, { demo: true })

  // Toggle Guided Wizard
  const guidedBtn = page.getByRole('button', { name: /guided review/i })
  await expect(guidedBtn).toBeVisible()
  await guidedBtn.click()

  // Step 1: Start & Scope
  await expect(page.getByText('GUIDED FIRST-PLAN // WIZARD')).toBeVisible()
  await expect(page.getByText('STEP 01 OF 06 — START & SCOPE')).toBeVisible()

  // Step 2: Rocket & Motor
  await page.getByRole('button', { name: /CONTINUE/i }).click()
  await expect(page.getByText('STEP 02 OF 06 — ROCKET & MOTOR')).toBeVisible()

  // Step 3: Recovery Hardware
  await page.getByRole('button', { name: 'NEXT →' }).click()
  await expect(page.getByText('STEP 03 OF 06 — RECOVERY HARDWARE')).toBeVisible()

  // Step 4: Deploy & Weather
  await page.getByRole('button', { name: 'NEXT →' }).click()
  await expect(page.getByText('STEP 04 OF 06 — DEPLOY & WEATHER')).toBeVisible()

  // Step 5: Simulate & Review
  await page.getByRole('button', { name: 'NEXT →' }).click()
  await expect(page.getByText('STEP 05 OF 06 — SIMULATE & REVIEW')).toBeVisible()

  // Step 6: Recovery Brief
  await page.getByRole('button', { name: 'NEXT →' }).click()
  await expect(page.getByText('STEP 06 OF 06 — RECOVERY BRIEF')).toBeVisible()

  // Return to Dashboard
  await page.getByRole('button', { name: /OPEN_IN_MISSION_CONTROL/i }).click()
  await expect(page.getByRole('tab', { name: 'DASHBOARD' })).toBeVisible()

  assertNoErrors()
})

test('analysis tab displays causality board and result status', async ({ guardedPage }) => {
  const { page, assertNoErrors } = guardedPage
  await openApp(page, { demo: true })

  // Navigate to Analysis tab
  await page.getByRole('tab', { name: 'ANALYSIS' }).click()

  // Verify ResultStatus is present
  await expect(page.getByText('ESTIMATE / EVIDENCE POSTURE')).toBeVisible()

  // Verify Causality Board is present
  await expect(page.getByText(/CAUSALITY_REVIEW/)).toBeVisible()
  await expect(page.getByText('DRIVER:').first()).toBeVisible()
  await expect(page.getByText('AFFECTED OUTCOME:').first()).toBeVisible()

  assertNoErrors()
})

test('export tab offers distinct recovery brief and checklist print actions', async ({
  guardedPage,
}) => {
  const { page, assertNoErrors } = guardedPage
  await openApp(page, { demo: true })

  // Navigate to Export tab
  await page.getByRole('tab', { name: 'EXPORT' }).click()

  // Check both print buttons
  await expect(page.getByRole('button', { name: /PRINT_RECOVERY_BRIEF/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /PRINT_CHECKLIST/i })).toBeVisible()

  // Check that the static packing sequence disclaimer exists in the print DOM
  const disclaimer = page.locator('.print-packing-disclaimer')
  await expect(disclaimer).toContainText('static planning sequence')

  assertNoErrors()
})
