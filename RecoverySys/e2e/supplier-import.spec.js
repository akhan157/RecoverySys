import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { installDeterministicRouting } from './support/deterministicRouting.js'

const seed = {
  schemaVersion: 1,
  config: {
    main_chute: { id: 'hx-024' },
    shock_cord: {
      id: 'custom-cord',
      category: 'shock_cord',
      name: 'Measured cord',
      specs: {
        packed_height_in: 3,
        packed_diam_in: 2,
        strength_lbs: 2000,
        weight_g: 120,
        length_ft: 20,
      },
    },
  },
  specs: { airframe_id_in: '4', bay_length_in: '18' },
  customMotor: null,
}
async function openSeed(page, payload = seed) {
  await installDeterministicRouting(page)
  await page.addInitScript((payload) => {
    localStorage.setItem('recoverysys-visited', '1')
    localStorage.setItem('recoverysys-config', JSON.stringify(payload))
    localStorage.setItem(
      'recoverysys-custom-parts',
      JSON.stringify(Object.values(payload.config).filter((part) => part.id.startsWith('custom-')))
    )
  }, payload)
  await page.goto('./')
  await page.getByRole('tab', { name: 'DASHBOARD', exact: true }).click()
}

test('price refresh updates only commercial data and preserves stale timestamps on failure', async ({
  page,
}) => {
  await openSeed(page)
  const data = JSON.parse(await readFile(resolve('public/supplier-prices.json'), 'utf8'))
  const offer = {
    ...data.offers.find((item) => item.partId === 'hx-024'),
    price: 23.5,
    fetchedAt: new Date().toISOString(),
    stock: 'in-stock',
  }
  let requests = 0
  await page.route('https://raw.githubusercontent.com/**/supplier-prices.json', (route) => {
    requests++
    return route.fulfill({ json: { version: 1, offers: [offer] } })
  })
  const panel = page.getByRole('region', { name: 'Supplier prices and availability' })
  expect(requests).toBe(0)
  await panel.getByRole('button', { name: 'Check price & stock' }).click()
  await expect(panel).toContainText('$23.50')
  await expect(panel).toContainText('Budget is incomplete')
  await page.route('https://raw.githubusercontent.com/**/supplier-prices.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' })
  )
  await panel.getByRole('button', { name: 'Check price & stock' }).click()
  await expect(panel.getByRole('status')).toContainText('Could not refresh')
  await expect(panel).toContainText('$23.50')
  await page.getByRole('tab', { name: 'ROCKET_SPECS', exact: true }).click()
  await expect(page.locator('#airframe-id')).toHaveValue('4')
  await expect(page.locator('#bay-length')).toHaveValue('18')
})

test('legacy gzip import accepts reviewed geometry and preserves source after save/reload', async ({
  page,
}) => {
  await installDeterministicRouting(page)
  await page.addInitScript(() => localStorage.setItem('recoverysys-visited', '1'))
  await page.goto('./')
  await page.getByRole('tab', { name: 'EXPORT', exact: true }).click()
  await page
    .locator('input[type="file"][accept*=".ork"]')
    .setInputFiles(resolve('src/test/fixtures/openrocket/legacy-example-1.5.ork'))
  await expect(page.getByText(/LEGACY_FORMAT/)).toBeVisible()
  for (const label of ['CONFIGURATION', 'STAGE', 'AIRFRAME_ID_CANDIDATE', 'BAY_LENGTH_CANDIDATE'])
    await page.getByLabel(label, { exact: true }).selectOption({ index: 1 })
  await page.getByRole('button', { name: /ACCEPT_VEHICLE_SNAPSHOT/ }).click()
  await page.getByRole('button', { name: /SAVE_CONFIG/ }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'EXPORT', exact: true }).click()
  await expect(page.getByText(/IMPORTED_SOURCE/)).toContainText('legacy-example-1.5.ork')
  await expect(page.getByText(/IMPORTED_SOURCE/)).toContainText('1.5')
})
