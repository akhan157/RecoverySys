import { test, expect } from '@playwright/test'
import { installDeterministicRouting } from './support/deterministicRouting.js'

test('both print artifacts hide an active app notification', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await installDeterministicRouting(page)
  await page.addInitScript(() => {
    // Keep the real restore toast alive through print inspection. No sleep or
    // artificial DOM notification: only its dismissal timer is extended.
    const schedule = window.setTimeout.bind(window)
    window.setTimeout = (callback, delay, ...args) =>
      schedule(callback, delay === 3000 ? 60_000 : delay, ...args)
    localStorage.clear()
    localStorage.setItem('recoverysys-visited', '1')
    localStorage.setItem(
      'recoverysys-config',
      JSON.stringify({
        schemaVersion: 1,
        config: { main_chute: { id: 'cl-24-n' } },
        specs: { rocket_mass_g: '2500', motor_total_impulse_ns: '640', burn_time_s: '1.8' },
      })
    )
  })
  await page.goto('./')
  const notifications = page.getByLabel('Notifications', { exact: true })
  await expect(notifications).toBeVisible()
  await expect(notifications).toContainText('Restored your last session.')
  await page.getByRole('tab', { name: 'EXPORT' }).click()
  await page.evaluate(() => {
    window.print = () => {}
  })
  for (const mode of ['RECOVERY_BRIEF', 'CHECKLIST']) {
    await page.getByRole('button', { name: new RegExp(`PRINT_${mode}`) }).click()
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.print-shared-provenance')).toBeVisible()
    await expect(notifications).toBeHidden()
    await testInfo.attach(`print-${mode.toLowerCase()}-no-notification`, {
      body: await page.locator('.print-checklist').screenshot(),
      contentType: 'image/png',
    })
    await page.emulateMedia({ media: 'screen' })
    await expect(notifications).toBeVisible()
  }
  expect(errors).toEqual([])
})
