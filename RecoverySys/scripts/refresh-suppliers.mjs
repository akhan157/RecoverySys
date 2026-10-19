import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { SUPPLIERS } from '../src/data/supplierSources.js'
import { validateCommercialSnapshot } from '../src/lib/supplierCatalog.js'

const root = new URL('../', import.meta.url)
const mappings = JSON.parse(await readFile(new URL('src/data/supplierMappings.json', root), 'utf8')).mappings
const output = new URL('public/supplier-prices.json', root)
const write = process.argv.includes('--write')
let previous = { version: 1, offers: [] }
try { previous = validateCommercialSnapshot(JSON.parse(await readFile(output, 'utf8'))) } catch {}
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'RecoverySys supplier snapshot (+https://github.com/akhan157/RecoverySys)' } })
  if (!response.ok) throw new Error(`${response.status} from ${url}`)
  const chunks = []
  let bytes = 0
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > 8_000_000) throw new Error('Supplier response exceeds limit')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
const offers = []
const failures = []
for (const [supplier, source] of Object.entries(SUPPLIERS)) {
  try {
    const feed = await getJson(`${source.baseUrl}/products.json?limit=250`)
    const cart = await getJson(`${source.baseUrl}/cart.js`)
    if (!Array.isArray(feed.products) || feed.products.length >= 250 || !/^[A-Z]{3}$/.test(cart.currency)) throw new Error('Incomplete feed or unknown currency; refusing partial refresh')
    const fetchedAt = new Date().toISOString()
    for (const mapping of mappings.filter((item) => item.supplier === supplier)) {
      const product = feed.products.find((item) => item.handle === mapping.handle)
      const variant = product?.variants.find((item) => String(item.id) === mapping.variantId)
      if (!variant) { failures.push(`${mapping.partId}: mapped variant missing`); continue }
      if (product.title !== mapping.productTitle || variant.title.replace(/\(\$[\d,.]+\)/g, '').trim() !== mapping.variantTitle.replace(/\(\$[\d,.]+\)/g, '').trim()) { failures.push(`${mapping.partId}: product identity changed; review mapping`); continue }
      if (!/^\d+(\.\d{1,2})?$/.test(String(variant.price))) throw new Error('Invalid supplier price')
      offers.push({ partId: mapping.partId, supplier, productTitle: product.title, variantId: mapping.variantId, variantTitle: variant.title, url: `${source.baseUrl}/products/${product.handle}?variant=${variant.id}`, price: Number(variant.price), currency: cart.currency, stock: variant.available === true ? 'in-stock' : variant.available === false ? 'out-of-stock' : 'unknown', fetchedAt })
    }
  } catch (error) {
    failures.push(`${supplier}: ${error.message}`)
  }
}
// Failed fetches retain only historical timestamps, never masquerade as fresh.
for (const old of previous.offers) if (!offers.some((offer) => offer.partId === old.partId && offer.supplier === old.supplier)) offers.push(old)
const result = validateCommercialSnapshot({ version: 1, offers })
const changes = result.offers.flatMap((offer) => {
  const old = previous.offers.find((item) => item.partId === offer.partId && item.supplier === offer.supplier)
  return ['price', 'currency', 'stock'].filter((field) => old?.[field] !== offer[field]).map((field) => ({ partId: offer.partId, field, old: old?.[field] ?? null, new: offer[field], url: offer.url, fetchedAt: offer.fetchedAt }))
})
console.log(JSON.stringify({ mode: write ? 'write-commercial-only' : 'dry-run', offers: result.offers.length, changes, failures }, null, 2))
if (write && result.offers.length) {
  await mkdir(new URL('public/', root), { recursive: true })
  const temp = `${fileURLToPath(output)}.tmp`
  await writeFile(temp, JSON.stringify(result, null, 2) + '\n')
  await rename(temp, output)
}
if (failures.length) process.exitCode = 1
