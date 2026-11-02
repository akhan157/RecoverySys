import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const constants = await readFile(new URL('src/lib/constants.js', root), 'utf8')
const versionDisplay = constants.match(/VERSION_DISPLAY\s*=\s*'([^']+)'/)?.[1]
const publicUrl =
  process.env.PAGES_URL || constants.match(/PUBLIC_WEB_APP_URL\s*=\s*'([^']+)'/)?.[1]
if (!versionDisplay || !publicUrl) throw new Error('Could not read version/public URL constants')
const publicOrigin = new URL(publicUrl).origin

const expectedTabs = [
  'GUIDED_REVIEW',
  'DASHBOARD',
  'SIMULATION',
  'ANALYSIS',
  'DISPERSION',
  'COMPARE',
  'FLIGHT_LOG',
  'RECOVERY_BRIEF',
  'SPECS',
  'EXPORT',
]
const bust = `verify=${process.env.GITHUB_SHA || Date.now()}`
const appUrl = `${publicUrl}?${bust}`
const landingUrl = `${new URL('landing/', publicUrl)}?${bust}`

async function get(url) {
  let lastError
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } })
      if (!response.ok) throw new Error(`${response.status} for ${url}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  throw lastError
}

const app = await get(appUrl)
if (!app.includes(`RECOVERYSYS_${versionDisplay}`)) {
  throw new Error(`Published app does not carry the expected brand RECOVERYSYS_${versionDisplay}`)
}
for (const tab of expectedTabs) {
  if (!app.includes(`class="s-tab">${tab}<`)) {
    throw new Error(`Published pre-hydration navigation is missing ${tab}; the deployment is stale`)
  }
}

const assets = [
  ...new Set([...app.matchAll(/(?:src|href)="(\/RecoverySys\/assets\/[^"]+)"/g)].map((m) => m[1])),
]
if (assets.length === 0) throw new Error('Published app references no built assets')
for (const asset of assets) {
  const response = await fetch(`${publicOrigin}${asset}`)
  if (!response.ok) throw new Error(`Published asset ${asset} returned ${response.status}`)
}

const landing = await get(landingUrl)
const landingScripts = [
  ...landing.matchAll(/src="(\/RecoverySys\/assets\/landing-[^"]+\.js)"/g),
].map((match) => match[1])
if (landingScripts.length === 0)
  throw new Error('Published landing page references no built script')
let landingBundle = ''
for (const script of landingScripts) {
  const response = await fetch(`${publicOrigin}${script}`)
  if (!response.ok) throw new Error(`Published landing asset ${script} returned ${response.status}`)
  landingBundle += await response.text()
}
for (const marker of ['OPEN_THE_TOOL', 'FIELD_TRIAL', '#validation']) {
  if (!landingBundle.includes(marker)) {
    throw new Error(`Published landing bundle is missing ${marker}; the deployment is stale`)
  }
}

console.log(
  `pages ok — ${publicUrl} serves ${versionDisplay}, ${expectedTabs.length} skeleton tabs, ${assets.length} assets, and the current landing page`
)
