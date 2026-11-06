import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const constants = await read('src/lib/constants.js')
const versionDisplay = constants.match(/VERSION_DISPLAY\s*=\s*'([^']+)'/)?.[1]
const version = constants.match(/export const VERSION\s*=\s*'([^']+)'/)?.[1]
if (!versionDisplay || !version) throw new Error('Could not read VERSION_DISPLAY/VERSION')

const identities = {
  VERSION: (await read('VERSION')).trim(),
  'package.json': JSON.parse(await read('package.json')).version,
  'package-lock.json': JSON.parse(await read('package-lock.json')).version,
  'package-lock.json root': JSON.parse(await read('package-lock.json')).packages[''].version,
  'src-tauri/tauri.conf.json': JSON.parse(await read('src-tauri/tauri.conf.json')).version,
  'src-tauri/Cargo.toml': (await read('src-tauri/Cargo.toml')).match(/^version = "([^"]+)"/m)?.[1],
  'src-tauri/Cargo.lock': (await read('src-tauri/Cargo.lock')).match(
    /name = "recoverysys"\nversion = "([^"]+)"/
  )?.[1],
}
for (const [file, identity] of Object.entries(identities)) {
  if (identity !== version) throw new Error(`${file} version ${identity} does not match ${version}`)
}
const prerelease = /-rc\.(\d+)$/.exec(version)
if (prerelease && !versionDisplay.endsWith(`RC${prerelease[1]}`)) {
  throw new Error(`Display ${versionDisplay} does not match release candidate ${version}`)
}

const sourceIndex = await read('index.html')
const skeletonBrand = sourceIndex.match(/class="s-brand">([^<]+)</)?.[1]
if (skeletonBrand !== `RECOVERYSYS_${versionDisplay}`) {
  throw new Error(
    `Pre-hydration brand "${skeletonBrand}" does not match VERSION_DISPLAY "${versionDisplay}". Update index.html.`
  )
}

const distIndex = await read('dist/index.html')
const distLanding = await read('dist/landing/index.html')
if (!distIndex.includes(`RECOVERYSYS_${versionDisplay}`)) {
  throw new Error(
    `dist/index.html does not contain the current brand RECOVERYSYS_${versionDisplay}`
  )
}
if (!distLanding.includes('id="root"')) {
  throw new Error('dist/landing/index.html is missing its mount root')
}

const assetRefs = [...distIndex.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map(
  (match) => match[1]
)
if (assetRefs.length === 0) throw new Error('dist/index.html references no built assets')
for (const ref of assetRefs) {
  const assetIndex = ref.indexOf('assets/')
  const local = new URL(`dist/${ref.slice(assetIndex)}`, root)
  await stat(fileURLToPath(local)).catch(() => {
    throw new Error(`Referenced asset is missing from dist: ${ref}`)
  })
}

for (const required of ['dist/favicon.svg', 'dist/landing/index.html']) {
  await stat(fileURLToPath(new URL(required, root))).catch(() => {
    throw new Error(`Missing ${required}`)
  })
}

console.log(
  `build identity ok — ${version} / ${versionDisplay}, ${assetRefs.length} referenced assets, landing + favicon present`
)
