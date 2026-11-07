#!/usr/bin/env node
// Read-only integrity/coverage validator for the 2026-11-07 historical Fruity review.
// Run from anywhere: node <this file>
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..') // RecoverySys/
const HOME = process.env.HOME
const ART_ROOT = join(HOME, 'RecoverySys-artifacts')
const PACKET = process.env.PACKET_DIR ? resolve(process.env.PACKET_DIR) : HERE
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
let passed = 0
let failed = 0
const failures = []
const checks = []
function check(name, condition, detail = '') {
  if (condition) {
    passed++
    checks.push({ name, ok: true, detail })
  } else {
    failed++
    failures.push({ name, detail })
    checks.push({ name, ok: false, detail })
  }
}
function resolveArtifact(rel) {
  if (!rel) return null
  const candidates = []
  if (rel.startsWith('/')) candidates.push(rel)
  else {
    const stripped = rel.replace(/^\.\.\//, '')
    candidates.push(join(HOME, stripped))
    candidates.push(join(HOME, 'RecoverySys', stripped))
    candidates.push(join(ROOT, rel))
    candidates.push(join(ROOT, '..', rel))
  }
  return candidates.find((p) => existsSync(p)) || null
}

const rec = readJson(join(PACKET, 'RECOMMENDATIONS.json'))
const sourcesFile = readJson(join(PACKET, 'sources.json'))
const diff = readJson(join(ROOT, 'validation/catalog-review/fruity-2026-10-19-diff.json')).changes
const historical = readJson(join(ROOT, 'validation/catalog-review/fruity-2026-10-19.json'))
const priorProposals = readJson(join(ROOT, 'validation/catalog-review/online-2026-11-05/DECISION-PROPOSALS.json')).proposals
const priorSources = readJson(join(ROOT, 'validation/catalog-review/online-2026-11-05/sources.json'))
const priorEvidence = readJson(join(ROOT, 'docs/history/online-validation-2026-11-05/CATALOG-EVIDENCE.json'))
const priorSourceById = Object.fromEntries(priorSources.map((s) => [s.sourceId, s]))
const priorProposalByKey = Object.fromEntries(priorProposals.map((p) => [[p.catalogId, p.category, p.field].join('|'), p]))
const priorDecisionById = Object.fromEntries(priorEvidence.decisions.map((d) => [d.proposalId, d]))
const { PARTS } = await import(join(ROOT, 'src/data/parts.js'))

const inputFiles = {
  diff: join(ROOT, 'validation/catalog-review/fruity-2026-10-19-diff.json'),
  historical: join(ROOT, 'validation/catalog-review/fruity-2026-10-19.json'),
  priorProposals: join(ROOT, 'validation/catalog-review/online-2026-11-05/DECISION-PROPOSALS.json'),
  priorSources: join(ROOT, 'validation/catalog-review/online-2026-11-05/sources.json'),
  priorEvidence: join(ROOT, 'docs/history/online-validation-2026-11-05/CATALOG-EVIDENCE.json'),
  parts: join(ROOT, 'src/data/parts.js'),
  mappings: join(ROOT, 'src/data/supplierMappings.json'),
}

// 1. Input identity
check('Packet base SHA is a full 40-hex SHA', /^[0-9a-f]{40}$/.test(rec.baseSha), rec.baseSha)
for (const [key, path] of Object.entries(inputFiles)) {
  const actual = sha256(path)
  check(`Input hash ${key} matches RECOMMENDATIONS.json`, actual === rec.inputHashes[key], `${actual} vs ${rec.inputHashes[key]}`)
}
check('sources.json capture note records HTTP 429 workaround', /429/.test(sourcesFile.captureNote), sourcesFile.captureNote)

// 2. Coverage and uniqueness
const rows = rec.rows
check('Exactly 35 recommendation rows', rows.length === 35, String(rows.length))
check('Rows are numbered 1..35 in order', rows.every((r, i) => r.row === i + 1), rows.map((r) => r.row).join(','))
const keys = rows.map((r) => [r.partId, r.category, r.field].join('|'))
check('All (partId, category, field) rows are unique', new Set(keys).size === keys.length, keys.join(','))
check('Recommendation keys equal the historical diff keys', JSON.stringify(keys) === JSON.stringify(diff.map((c) => [c.partId, c.category, c.field].join('|'))), `${keys.length} keys`)

// 3. Per-row catalog and historical values
const allowedDispositions = new Set(['retain-rounded', 'recommend-change-rounded', 'hold-identity', 'hold-source', 'reject-substitution'])
for (const r of rows) {
  const i = r.row - 1
  const d = diff[i]
  check(`Row ${r.row} oldValue matches history`, r.oldValue === d.old, `${r.oldValue} vs ${d.old}`)
  check(`Row ${r.row} proposedValue matches history`, r.proposedValue === d.proposed, `${r.proposedValue} vs ${d.proposed}`)
  const current = PARTS.find((p) => p.id === r.partId && p.category === r.category)
  check(`Row ${r.row} catalog entry exists`, Boolean(current), `${r.partId}/${r.category}`)
  if (current) {
    check(`Row ${r.row} currentValue matches PARTS`, current.specs[r.field] === r.currentValue, `${r.currentValue} vs ${current.specs[r.field]}`)
    check(`Row ${r.row} currentMatchesHistoricalOld is correct`, r.currentMatchesHistoricalOld === (current.specs[r.field] === d.old), `${r.currentMatchesHistoricalOld}`)
    check(`Row ${r.row} catalog identity name matches PARTS`, current.name === r.catalogIdentity.name, `${r.catalogIdentity.name} vs ${current.name}`)
    check(`Row ${r.row} catalog identity diameter matches PARTS`, current.specs.diameter_in === r.catalogIdentity.diameter_in, `${r.catalogIdentity.diameter_in}`)
    check(`Row ${r.row} catalog identity shape matches PARTS`, current.specs.shape === r.catalogIdentity.shape, `${r.catalogIdentity.shape}`)
    check(`Row ${r.row} catalog identity material matches PARTS`, current.specs.material === r.catalogIdentity.material, `${r.catalogIdentity.material}`)
  }
  check(`Row ${r.row} disposition is allowed`, allowedDispositions.has(r.disposition), r.disposition)
  check(`Row ${r.row} resolutionStatus is allowed`, ['already-resolved', 'reviewed-2026-11-07'].includes(r.resolutionStatus), r.resolutionStatus)
  check(`Row ${r.row} has a non-empty reason`, typeof r.reason === 'string' && r.reason.trim().length > 10, r.reason)
  check(`Row ${r.row} conflicts is an array`, Array.isArray(r.conflicts), String(r.conflicts))
  check(`Row ${r.row} recommendedAction is non-empty`, typeof r.recommendedAction === 'string' && r.recommendedAction.trim().length > 0, r.recommendedAction)
  check(`Row ${r.row} historical source hash is 64 hex`, /^[0-9a-f]{64}$/.test(r.historicalSource.sourceSha256), r.historicalSource.sourceSha256)
  check(`Row ${r.row} historical raw bytes are labelled not archived`, r.historicalSource.rawBytesArchived === false, String(r.historicalSource.rawBytesArchived))
  check(`Row ${r.row} area is not fabricated`, r.reviewEvidence.publishedArea === null && typeof r.reviewEvidence.areaNote === 'string' && r.reviewEvidence.areaNote.length > 20, String(r.reviewEvidence.publishedArea))
  check(`Row ${r.row} has public source URL`, /^https:\/\//.test(r.reviewEvidence.url), r.reviewEvidence.url)
  check(`Row ${r.row} has published packing`, typeof r.reviewEvidence.publishedPacking === 'string' && r.reviewEvidence.publishedPacking.length > 5, r.reviewEvidence.publishedPacking)
  check(`Row ${r.row} has packing conditions`, typeof r.reviewEvidence.packingConditions === 'string' && r.reviewEvidence.packingConditions.length > 5, r.reviewEvidence.packingConditions)
  check(`Row ${r.row} has published material`, typeof r.reviewEvidence.publishedMaterial === 'string' && r.reviewEvidence.publishedMaterial.length > 5, r.reviewEvidence.publishedMaterial)
  check(`Row ${r.row} identity confidence is labelled`, ['confirmed', 'unconfirmed'].includes(r.catalogIdentity.identityConfidence), r.catalogIdentity.identityConfidence)
  check(`Row ${r.row} captured variant starts with family`, r.reviewEvidence.manufacturerSku == null || r.reviewEvidence.manufacturerSkuFamily == null || r.reviewEvidence.manufacturerSku.startsWith(r.reviewEvidence.manufacturerSkuFamily), `${r.reviewEvidence.manufacturerSku} vs ${r.reviewEvidence.manufacturerSkuFamily}`)
  check(`Row ${r.row} identity family matches review evidence`, r.catalogIdentity.exactManufacturerSku === r.reviewEvidence.manufacturerSkuFamily, `${r.catalogIdentity.exactManufacturerSku} vs ${r.reviewEvidence.manufacturerSkuFamily}`)
  check(`Row ${r.row} stable identity tuple includes part/category/SKU`, r.catalogIdentity.stableTuple.includes(r.partId) && r.catalogIdentity.stableTuple.includes(r.category), r.catalogIdentity.stableTuple)
  if (r.disposition === 'recommend-change-rounded') {
    check(`Row ${r.row} recommends a finite different value`, Number.isFinite(r.recommendedCatalogValue) && r.recommendedCatalogValue !== r.currentValue, `${r.recommendedCatalogValue}`)
  } else {
    check(`Row ${r.row} recommends no catalog value for ${r.disposition}`, r.recommendedCatalogValue === null, `${r.recommendedCatalogValue}`)
  }
}

// 4. Prior-overlap exactness
for (const r of rows) {
  const key = [r.partId, r.category, r.field].join('|')
  const prior = priorProposalByKey[key]
  if (prior) {
    check(`Row ${r.row} is marked already-resolved`, r.resolutionStatus === 'already-resolved', r.resolutionStatus)
    check(`Row ${r.row} priorDecision exists`, Boolean(r.priorDecision), 'missing')
    if (r.priorDecision) {
      check(`Row ${r.row} prior proposal ID matches`, r.priorDecision.proposalId === prior.proposalId, `${r.priorDecision.proposalId} vs ${prior.proposalId}`)
      check(`Row ${r.row} prior reviewer decision matches CATALOG-EVIDENCE`, r.priorDecision.reviewerDecision === priorDecisionById[prior.proposalId].reviewerDecision, `${r.priorDecision.reviewerDecision}`)
      check(`Row ${r.row} prior disposition matches proposal`, r.priorDecision.disposition === prior.proposedDisposition, `${r.priorDecision.disposition} vs ${prior.proposedDisposition}`)
    }
    check(`Row ${r.row} review source is a prior 2026-11-05 source`, r.reviewSourceRef.startsWith('online-2026-11-05:'), r.reviewSourceRef)
  } else {
    check(`Row ${r.row} is marked reviewed here`, r.resolutionStatus === 'reviewed-2026-11-07', r.resolutionStatus)
    check(`Row ${r.row} has no prior decision`, r.priorDecision === null, JSON.stringify(r.priorDecision))
    check(`Row ${r.row} review source is a new 2026-11-07 source`, r.reviewSourceRef.startsWith('review-2026-11-07:'), r.reviewSourceRef)
  }
}
const overlapRows = rows.filter((r) => r.resolutionStatus === 'already-resolved')
check('Exactly 8 prior-overlap rows', overlapRows.length === 8, String(overlapRows.length))
check('Overlap rows are exactly the prior 8 keys', overlapRows.every((r) => priorProposalByKey[[r.partId, r.category, r.field].join('|')]), 'mismatch')

// 5. Source resolution and hashes
check('All source IDs are unique', new Set(sourcesFile.sources.map((s) => s.sourceId)).size === sourcesFile.sources.length, String(sourcesFile.sources.length))
for (const s of sourcesFile.sources) {
  check(`Source ${s.sourceId} has URL`, /^https:\/\//.test(s.url), s.url)
  check(`Source ${s.sourceId} has access date`, /^\d{4}-\d{2}-\d{2}$/.test(s.accessed), s.accessed)
  check(`Source ${s.sourceId} has SKU`, typeof s.manufacturerSKU === 'string' && s.manufacturerSKU.length > 3, s.manufacturerSKU)
  check(`Source ${s.sourceId} has SKU family`, typeof s.manufacturerSkuFamily === 'string' && s.manufacturerSkuFamily.length > 3, s.manufacturerSkuFamily)
  check(`Source ${s.sourceId} captured variant starts with family`, typeof s.capturedVariantSku === 'string' && typeof s.manufacturerSkuFamily === 'string' && s.capturedVariantSku.startsWith(s.manufacturerSkuFamily), `${s.capturedVariantSku} vs ${s.manufacturerSkuFamily}`)
  check(`Source ${s.sourceId} has weight`, typeof s.specs.weight_published === 'string' && s.specs.weight_published.length > 2, s.specs.weight_published)
  check(`Source ${s.sourceId} has packing`, typeof s.specs.packing_published === 'string' && s.specs.packing_published.length > 5, s.specs.packing_published)
  check(`Source ${s.sourceId} has material`, typeof s.specs.material_published === 'string' && s.specs.material_published.length > 5, s.specs.material_published)
  check(`Source ${s.sourceId} has area field`, Object.prototype.hasOwnProperty.call(s.specs, 'area_published'), 'missing area_published')
  check(`Source ${s.sourceId} has area note`, typeof s.specs.area_note === 'string' && s.specs.area_note.length > 20, s.specs.area_note)
  const artifact = resolveArtifact(s.artifact.homeRelativePath)
  check(`Source ${s.sourceId} artifact exists`, Boolean(artifact), s.artifact.homeRelativePath)
  if (artifact) {
    check(`Source ${s.sourceId} artifact hash matches`, sha256(artifact) === s.artifact.sha256, `${sha256(artifact)} vs ${s.artifact.sha256}`)
    check(`Source ${s.sourceId} artifact bytes match`, readFileSync(artifact).length === s.artifact.bytes, `${readFileSync(artifact).length} vs ${s.artifact.bytes}`)
  }
}

for (const r of rows) {
  const ref = r.reviewSourceRef
  let source
  if (ref.startsWith('review-2026-11-07:')) source = sourcesFile.sources.find((s) => s.sourceId === ref.split(':')[1])
  else source = priorSourceById[ref.split(':')[1]]
  check(`Row ${r.row} review source resolves`, Boolean(source), ref)
  if (!source) continue
  check(`Row ${r.row} review source URL matches`, source.url === r.reviewEvidence.url, `${source.url} vs ${r.reviewEvidence.url}`)
  check(`Row ${r.row} review source ID matches`, source.sourceId === r.reviewEvidence.sourceId, `${source.sourceId} vs ${r.reviewEvidence.sourceId}`)
  const expectedHash = ref.startsWith('review-2026-11-07:') ? source.artifact.sha256 : source.artifact.sha256
  check(`Row ${r.row} review artifact hash matches source`, expectedHash === r.reviewEvidence.artifactSha256, `${r.reviewEvidence.artifactSha256} vs ${expectedHash}`)
  const expectedPath = ref.startsWith('review-2026-11-07:') ? source.artifact.homeRelativePath : source.artifact.relativePath.replace(/^\.\.\//, '')
  check(`Row ${r.row} review artifact path matches source`, expectedPath === r.reviewEvidence.artifactHomeRelativePath, `${r.reviewEvidence.artifactHomeRelativePath} vs ${expectedPath}`)
  const artifact = resolveArtifact(r.reviewEvidence.artifactHomeRelativePath)
  check(`Row ${r.row} review artifact exists`, Boolean(artifact), r.reviewEvidence.artifactHomeRelativePath)
  if (artifact) check(`Row ${r.row} review artifact hash is real`, sha256(artifact) === r.reviewEvidence.artifactSha256, r.reviewEvidence.artifactSha256)
}

// Every new source must be used or explicitly listed as conflict evidence.
const usedSourceIds = new Set(rows.map((r) => r.reviewSourceRef.split(':')[1]))
for (const s of sourcesFile.sources) {
  const used = usedSourceIds.has(s.sourceId)
  const conflictEvidence = s.sourceId === 'fruity-ifc-036-sl-historical-mapping-20261107'
  check(`Source ${s.sourceId} is used or labelled conflict evidence`, used || conflictEvidence, String(used))
}

// 6. Derived counts
const countBy = (arr, key) => arr.reduce((a, r) => ((a[r[key]] = (a[r[key]] || 0) + 1), a), {})
const reviewed = rows.filter((r) => r.resolutionStatus === 'reviewed-2026-11-07')
const already = rows.filter((r) => r.resolutionStatus === 'already-resolved')
const expectedCounts = {
  totalRows: rows.length,
  alreadyResolved: already.length,
  reviewedHere: reviewed.length,
  byDisposition: countBy(rows, 'disposition'),
  priorOverlap: {
    total: already.length,
    retainRounded: already.filter((r) => r.disposition === 'retain-rounded').length,
    holdIdentity: already.filter((r) => r.disposition === 'hold-identity').length,
  },
  remaining: {
    total: reviewed.length,
    byDisposition: countBy(reviewed, 'disposition'),
  },
  recommendedCatalogEdits: rows.filter((r) => r.recommendedCatalogValue !== null).length,
  rowsWithoutCapturedSource: rows.filter((r) => !r.reviewEvidence.artifactSha256).length,
  currentMatchesHistoricalOld: rows.filter((r) => r.currentMatchesHistoricalOld).length,
}
check('Recorded counts equal rows', JSON.stringify(rec.counts) === JSON.stringify(expectedCounts), JSON.stringify({ recorded: rec.counts, expected: expectedCounts }))
check('All 35 historical old values still match current PARTS', expectedCounts.currentMatchesHistoricalOld === 35, String(expectedCounts.currentMatchesHistoricalOld))
check('No row lacks a captured source', expectedCounts.rowsWithoutCapturedSource === 0, String(expectedCounts.rowsWithoutCapturedSource))
check('Exactly one recommended catalog edit', expectedCounts.recommendedCatalogEdits === 1, String(expectedCounts.recommendedCatalogEdits))

// 7. Semantic invariants from the reviewed findings (guards against silent flips)
const byRow = (n) => rows[n - 1]
check('cfc-030-s rows remain retain-rounded (1 g display rounding)', byRow(3).disposition === 'retain-rounded' && byRow(4).disposition === 'retain-rounded', `${byRow(3).disposition}/${byRow(4).disposition}`)
check('cfc-036-s row remains retain-rounded (source display rounding)', byRow(14).disposition === 'retain-rounded', byRow(14).disposition)
check('ifc-036-sl rows are reject-substitution', byRow(16).disposition === 'reject-substitution' && byRow(17).disposition === 'reject-substitution' && byRow(18).disposition === 'reject-substitution', `${byRow(16).disposition}/${byRow(17).disposition}/${byRow(18).disposition}`)
check('ifc-096-s recommends 462 g', byRow(31).disposition === 'recommend-change-rounded' && byRow(31).recommendedCatalogValue === 462, `${byRow(31).disposition}/${byRow(31).recommendedCatalogValue}`)
check('cfc-018-n remains hold-source', byRow(35).disposition === 'hold-source', byRow(35).disposition)
check('ifc-030-sl rows remain hold-identity (prior decision)', [5, 6, 7, 8, 9, 10].every((n) => byRow(n).disposition === 'hold-identity'), [5, 6, 7, 8, 9, 10].map((n) => byRow(n).disposition).join('/'))
check('cfc-030-n rows remain retain-rounded (prior decision)', byRow(1).disposition === 'retain-rounded' && byRow(2).disposition === 'retain-rounded', `${byRow(1).disposition}/${byRow(2).disposition}`)

const summary = { passed, failed, failures, packet: rec.packet, baseSha: rec.baseSha, counts: expectedCounts }
console.log(JSON.stringify(summary, null, 2))
if (failed > 0) process.exit(1)
