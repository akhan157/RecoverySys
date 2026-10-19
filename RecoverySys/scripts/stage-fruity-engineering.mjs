import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { PARTS } from '../src/data/parts.js'
import { extractFruityEngineering } from '../src/lib/supplierEngineering.js'
const feedPath = process.argv[2]
if (!feedPath)
  throw new Error('Usage: node scripts/stage-fruity-engineering.mjs downloaded-products.json')
const data = await readFile(feedPath)
if (data.length > 8_000_000) throw new Error('Source feed exceeds limit')
const feed = JSON.parse(data)
const mappings = JSON.parse(
  await readFile(new URL('../src/data/supplierMappings.json', import.meta.url))
).mappings.filter((mapping) => mapping.supplier === 'fruity')
const accessed = new Date().toISOString().slice(0, 10)
const records = []
for (const mapping of mappings) {
  const product = feed.products?.find((product) => product.handle === mapping.handle)
  if (!product || product.title !== mapping.productTitle) continue
  const extracted = extractFruityEngineering(product.body_html)
  for (const part of PARTS.filter((part) => part.id === mapping.partId))
    records.push({
      partId: part.id,
      category: part.category,
      url: `https://shop.fruitychutes.com/products/${mapping.handle}`,
      accessed,
      ...extracted,
      sourceSha256: createHash('sha256')
        .update(product.body_html || '')
        .digest('hex'),
      parserVersion: 'fruity-explicit-fields-v1',
      status: 'requires-human-review',
    })
}
console.log(JSON.stringify(records, null, 2))
