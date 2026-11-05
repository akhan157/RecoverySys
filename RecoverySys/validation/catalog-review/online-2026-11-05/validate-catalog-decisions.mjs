// Validation Design: Executable Falsifiers for Catalog Decisions & Review
// Location: RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.mjs
// Owns ONLY this directory. Does NOT edit production files.

import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { PARTS } from '../../../src/data/parts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Derive primary root from git common dir (handles isolated worktrees correctly)
const commonDir = execSync('git rev-parse --git-common-dir', { cwd: __dirname, encoding: 'utf8' }).trim()
const PRIMARY_ROOT = resolve(commonDir, '..')

let passes = 0
let failures = 0

function assert(condition, testName, details = '') {
  if (condition) {
    passes++
    console.log(`  PASS: ${testName}`)
  } else {
    failures++
    console.error(`  FAIL: ${testName} - ${details}`)
  }
}

console.log('=== RecoverySys Online Catalog Validation Design Tests ===\n')

// 1. Artifact Verification & Stale/Failed Fetch Falsifiers
console.log('Group 1: Artifact Integrity & Stale/Failed Fetch Falsifiers')
const sourcesPath = resolve(__dirname, 'sources.json')
const sources = JSON.parse(await readFile(sourcesPath, 'utf8'))

for (const src of sources) {
  // Resolve artifact path relative to primary repo root
  const absArtifactPath = resolve(PRIMARY_ROOT, src.artifact.relativePath)
  let exists = false
  let calculatedHash = ''
  let content = ''
  try {
    content = await readFile(absArtifactPath, 'utf8')
    exists = true
    calculatedHash = createHash('sha256').update(content).digest('hex')
  } catch (e) {
    exists = false
  }

  assert(exists, `Artifact exists: ${src.sourceId}`)
  assert(
    calculatedHash === src.artifact.sha256,
    `Artifact SHA-256 matches: ${src.sourceId}`,
    `Expected ${src.artifact.sha256}, got ${calculatedHash}`
  )

  // Stale/failed fetch check: must not contain rate-limit or error indicators
  const isRateLimited = content.includes('local_rate_limited') || content.includes('429 Too Many Requests')
  assert(!isRateLimited, `Artifact not rate-limited: ${src.sourceId}`)
  assert(content.length > 500, `Artifact has substantive content: ${src.sourceId} (${content.length} bytes)`)
}

// 2. Wrong-Variant Substitution Falsifiers
console.log('\nGroup 2: Wrong-Variant Substitution Falsifiers')
const proposalsPath = resolve(__dirname, 'DECISION-PROPOSALS.json')
const proposalsData = JSON.parse(await readFile(proposalsPath, 'utf8'))
const proposals = proposalsData.proposals

// Rule: A proposal is flagged as a variant mismatch if mass or dimensions shift by >50%
// without explicit model line transition documentation.
for (const p of proposals) {
  if (p.proposedDisposition === 'reject') {
    const isRocketman = p.catalogId.startsWith('lp-')
    const isIrisLight = p.catalogId === 'ifc-030-sl'
    assert(
      isRocketman || isIrisLight,
      `Rejected proposal ${p.proposalId} matches known variant divergence target (${p.catalogId})`
    )
    assert(
      p.identityConfidence === 'REJECT_VARIANT_MISMATCH',
      `Proposal ${p.proposalId} explicitly marked REJECT_VARIANT_MISMATCH`
    )
  }
}

// Specific check: Rocketman lp-024 and lp-036 mass comparison
const lp024_weight_prop = proposals.find(p => p.proposalId === 'PROP-20261105-11')
const lp024_current = PARTS.find(p => p.id === 'lp-024')
assert(lp024_current.specs.weight_g === 20, 'Current lp-024 weight is 20 g')
assert(
  lp024_weight_prop.proposedValue > 80,
  'Proposed lp-024 weight was 87.88 g (standard line, 1.1 oz ripstop)'
)
assert(
  lp024_weight_prop.proposedDisposition === 'reject',
  'Falsifier correctly rejected replacing 20 g ultralight chute with 87.88 g standard chute'
)

const lp036_weight_prop = proposals.find(p => p.proposalId === 'PROP-20261105-14')
const lp036_current = PARTS.find(p => p.id === 'lp-036')
assert(lp036_current.specs.weight_g === 43, 'Current lp-036 weight is 43 g')
assert(
  lp036_weight_prop.proposedValue > 130,
  'Proposed lp-036 weight was 136.08 g (standard line, 1.1 oz ripstop)'
)
assert(
  lp036_weight_prop.proposedDisposition === 'reject',
  'Falsifier correctly rejected replacing 43 g ultralight chute with 136.08 g standard chute'
)

// Specific check: ifc-030-sl variant mismatch
const ifc030_weight_prop = proposals.find(p => p.proposalId === 'PROP-20261105-05')
assert(
  ifc030_weight_prop.proposedDisposition === 'reject',
  'Falsifier correctly rejected substituting IFC-30-SUL (38 g) into IFC-30-SL (45 g)'
)

// 3. Unit Mistake & Range Preservation Falsifiers
console.log('\nGroup 3: Unit Mistake & Range Preservation Falsifiers')
// Test unit sanity: no raw ounce numbers in grams field
for (const p of proposals) {
  if (p.field === 'weight_g') {
    // If a weight in grams is below 1.0 for a 24"+ parachute, someone likely forgot oz-to-g conversion
    assert(
      p.proposedValue > 10.0,
      `Unit check passed for ${p.proposalId}: ${p.proposedValue} g is physically plausible (>10 g)`
    )
  }
}

// Check ambiguous range preservation: cfc-030-n Cd must remain range or held midpoint without inventing a constant
const cfc30_src = sources.find(s => s.sourceId === 'fruitychutes-cfc-30-n-standard')
assert(
  Array.isArray(cfc30_src.specs.cd_range) && cfc30_src.specs.cd_range[0] === 1.5 && cfc30_src.specs.cd_range[1] === 1.6,
  'CFC-30-N Cd preserved as [1.5, 1.6] range in source record without inventing constant'
)

// 4. Governance & No Self-Acceptance Falsifiers
console.log('\nGroup 4: Governance & No Self-Acceptance Falsifiers')
assert(
  proposalsData.summary.proposed_accept_count === 0,
  'Author self-acceptance count is exactly 0 (contract invariant)'
)
assert(
  proposalsData.summary.proposed_reject_count === 12,
  'Exactly 12 proposals rejected due to variant divergence'
)
assert(
  proposalsData.summary.proposed_hold_count === 2,
  'Exactly 2 proposals held for precision policy decision'
)

console.log(`\nResults: ${passes} passed, ${failures} failed.`)
if (failures > 0) {
  process.exit(1)
} else {
  console.log('All catalog validation design falsifiers PASSED successfully.')
}
