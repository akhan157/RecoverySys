import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const FIRST_PARTY_ORIGIN = 'http://127.0.0.1:4174'
const leafletCss = await readFile(resolve('node_modules/leaflet/dist/leaflet.css'))
const emptyFontCss = Buffer.from('/* deterministic E2E font stub */')
const transparentTile = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)
const routingStates = new WeakMap()

export async function installDeterministicRouting(page) {
  const state = { blockedThirdPartyRequests: [], fulfilledFixtures: [] }
  routingStates.set(page, state)

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === FIRST_PARTY_ORIGIN) {
      await route.continue()
    } else if (url.hostname === 'fonts.googleapis.com') {
      state.fulfilledFixtures.push(url.href)
      await route.fulfill({ status: 200, contentType: 'text/css', body: emptyFontCss })
    } else if (url.hostname === 'fonts.gstatic.com') {
      state.fulfilledFixtures.push(url.href)
      await route.fulfill({ status: 200, contentType: 'font/woff2', body: Buffer.alloc(0) })
    } else if (url.hostname === 'unpkg.com' && url.pathname === '/leaflet@1.9.4/dist/leaflet.css') {
      state.fulfilledFixtures.push(url.href)
      await route.fulfill({ status: 200, contentType: 'text/css', body: leafletCss })
    } else if (url.hostname.endsWith('tile.openstreetmap.org') && url.pathname.endsWith('.png')) {
      state.fulfilledFixtures.push(url.href)
      await route.fulfill({ status: 200, contentType: 'image/png', body: transparentTile })
    } else {
      state.blockedThirdPartyRequests.push(url.href)
      await route.abort('blockedbyclient')
    }
  })

  return state
}

export function getDeterministicRoutingState(page) {
  return routingStates.get(page)
}
