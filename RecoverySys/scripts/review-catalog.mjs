// Read-only engineering review: explicit normalized source records in JSON.
// The source extraction step must be supplier-specific and reviewed. Marketing
// prose is never parsed into engineering values automatically.
import { readFile } from 'node:fs/promises'
import { PARTS } from '../src/data/parts.js'
const path = process.argv[2]
if (!path) {
  console.error('Usage: npm run catalog:review -- path/to/source-records.json')
  process.exit(1)
}
const records = JSON.parse(await readFile(path, 'utf8'))
if (!Array.isArray(records) || records.length > 2000)
  throw new Error('Expected a bounded source record array')
const diffs = []
for (const record of records) {
  const part = PARTS.find((item) => item.id === record.partId && item.category === record.category)
  if (
    !part ||
    !/^https:\/\//.test(record.url) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.accessed) ||
    !record.specs ||
    Array.isArray(record.specs)
  )
    throw new Error('Invalid source identity or provenance')
  for (const [field, value] of Object.entries(record.specs)) {
    if (!(field in part.specs) && !['packed_diam_in', 'packed_length_in'].includes(field))
      throw new Error(`Unknown engineering field: ${field}`)
    if (
      !['string', 'number'].includes(typeof value) ||
      (typeof value === 'number' && !Number.isFinite(value))
    )
      throw new Error('Invalid engineering value')
    if (part.specs[field] !== value)
      diffs.push({
        partId: part.id,
        category: part.category,
        field,
        old: part.specs[field] ?? null,
        proposed: value,
        url: record.url,
        accessed: record.accessed,
        status: 'requires-human-review',
      })
  }
}
console.log(JSON.stringify({ mode: 'dry-run', changes: diffs }, null, 2))
