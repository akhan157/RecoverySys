import { PARTS } from '../src/data/parts.js'
import { CATALOG_PROVENANCE_VERSION, provenanceForPart } from '../src/data/catalogProvenance.js'

export function catalogProvenanceReport(parts = PARTS) {
  const groups = new Map()
  const missing = []
  for (const part of parts) {
    const provenance = provenanceForPart(part)
    if (!provenance) {
      missing.push(`${part.category}:${part.id}`)
      continue
    }
    const key = `${part.manufacturer}|${provenance.status}`
    const group = groups.get(key) ?? {
      manufacturer: part.manufacturer,
      status: provenance.status,
      source: provenance.title,
      count: 0,
    }
    group.count++
    groups.set(key, group)
  }
  return {
    version: CATALOG_PROVENANCE_VERSION,
    totalParts: parts.length,
    groups: [...groups.values()].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer)),
    missing: missing.sort(),
  }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const report = catalogProvenanceReport()
  console.log(JSON.stringify(report, null, 2))
  if (report.missing.length > 0) process.exitCode = 1
}
