// Bounded Read-Only Data-Driven Evidence Auditor for RecoverySys Catalog Review
// Location: RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.mjs
// Owns ONLY this directory. Strictly read-only; does NOT edit production files or enforce production writes.

import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { PARTS } from '../../../src/data/parts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Derives primary repository root from git common-dir with absolute path anchoring.
 * Works uniformly whether invoked from worktrees, primary repository root, or subdirectories.
 */
export function resolvePrimaryRoot(fromDir = __dirname) {
  const rawCommonDir = execSync('git rev-parse --git-common-dir', {
    cwd: fromDir,
    encoding: 'utf8',
  }).trim()
  const commonDir = resolve(fromDir, rawCommonDir)
  return resolve(commonDir, '..')
}

/**
 * Runs the bounded evidence audit on catalog sources and decision proposals.
 * @param {Object} [options]
 * @param {string} [options.primaryRoot]
 * @param {Array|string} [options.sources] - Source records array or path to sources.json
 * @param {Object|string} [options.proposalsData] - Decision proposals object or path to DECISION-PROPOSALS.json
 * @param {Object|string} [options.stagedDiff] - Staged diff object or path to primary-pages-2026-11-05-diff.json
 * @param {Array} [options.parts] - Catalog parts array (defaults to production PARTS)
 * @returns {Promise<{ success: boolean, passes: number, failures: number, diagnostics: Array<{ type: string, testName: string, details?: string }>, derivedSummary: Object }>}
 */
export async function auditCatalogEvidence(options = {}) {
  const primaryRoot = options.primaryRoot || resolvePrimaryRoot(__dirname)

  // Load sources
  let sources = options.sources
  if (!sources || typeof sources === 'string') {
    const p = sources || resolve(__dirname, 'sources.json')
    sources = JSON.parse(await readFile(p, 'utf8'))
  }

  // Load decision proposals
  let proposalsData = options.proposalsData
  if (!proposalsData || typeof proposalsData === 'string') {
    const p = proposalsData || resolve(__dirname, 'DECISION-PROPOSALS.json')
    proposalsData = JSON.parse(await readFile(p, 'utf8'))
  }
  const proposals = proposalsData.proposals

  // Load staged diff
  let stagedDiff = options.stagedDiff
  if (!stagedDiff || typeof stagedDiff === 'string') {
    const p =
      stagedDiff ||
      resolve(
        primaryRoot,
        'RecoverySys/validation/catalog-review/primary-pages-2026-11-05-diff.json'
      )
    stagedDiff = JSON.parse(await readFile(p, 'utf8'))
  }
  const stagedChanges = stagedDiff.changes

  // Catalog parts
  const parts = options.parts || PARTS

  let passes = 0
  let failures = 0
  const diagnostics = []

  function assert(condition, testName, details = '') {
    if (condition) {
      passes++
      diagnostics.push({ type: 'PASS', testName })
    } else {
      failures++
      diagnostics.push({ type: 'FAIL', testName, details })
    }
  }

  // Group 1: Source Artifact Integrity & Real Byte Hashing
  for (const src of sources) {
    const absArtifactPath = resolve(primaryRoot, src.artifact.relativePath)
    let exists = false
    let calculatedHash = ''
    let byteLength = 0
    try {
      const bytes = await readFile(absArtifactPath)
      exists = true
      byteLength = bytes.length
      calculatedHash = createHash('sha256').update(bytes).digest('hex')
    } catch (e) {
      exists = false
    }

    assert(
      exists,
      `Artifact exists: ${src.sourceId}`,
      `Artifact file not found at ${absArtifactPath}`
    )
    assert(
      calculatedHash === src.artifact.sha256,
      `Artifact SHA-256 matches: ${src.sourceId}`,
      `SHA-256 mismatch: expected ${src.artifact.sha256}, got ${calculatedHash}`
    )
    assert(
      byteLength > 0,
      `Artifact byte length is non-zero: ${src.sourceId}`,
      `File is empty (0 bytes)`
    )
    assert(
      src.artifact.captureFormat === 'normalized-markdown',
      `Artifact capture format normalized markdown: ${src.sourceId}`,
      `Expected 'normalized-markdown', got ${src.artifact.captureFormat}`
    )
  }

  // Group 2: Proposal Deduplication & Identification
  const seenProposalIds = new Set()
  const seenTuples = new Set()
  for (const p of proposals) {
    assert(
      !seenProposalIds.has(p.proposalId),
      `Unique proposal ID: ${p.proposalId}`,
      `Duplicate proposal ID detected: ${p.proposalId}`
    )
    seenProposalIds.add(p.proposalId)

    const tupleKey = `${p.catalogId}::${p.category}::${p.field}`
    assert(
      !seenTuples.has(tupleKey),
      `Unique proposal tuple: (${p.catalogId}, ${p.category}, ${p.field})`,
      `Duplicate proposal tuple detected: (${p.catalogId}, ${p.category}, ${p.field}) in ${p.proposalId}`
    )
    seenTuples.add(tupleKey)
  }

  // Group 3: Comparison with Production Catalog (PARTS) & Staged Proposals
  for (const p of proposals) {
    const part = parts.find((item) => item.id === p.catalogId && item.category === p.category)
    assert(
      Boolean(part),
      `Catalog part exists in parts.js: ${p.catalogId}`,
      `Part ${p.catalogId} missing from catalog`
    )

    if (part) {
      assert(
        part.specs && part.specs[p.field] !== undefined,
        `Field exists in catalog specs: ${p.catalogId}.${p.field}`,
        `Field ${p.field} not found in specs for ${p.catalogId}`
      )
      assert(
        p.currentValue === part.specs[p.field],
        `Current value matches catalog for ${p.proposalId} (${p.catalogId}.${p.field})`,
        `Proposal currentValue ${p.currentValue} does not match catalog value ${part.specs[p.field]}`
      )
    }

    const staged = stagedChanges.find(
      (s) => s.partId === p.catalogId && s.category === p.category && s.field === p.field
    )
    assert(
      Boolean(staged),
      `Staged proposal exists for ${p.proposalId} (${p.catalogId}, ${p.category}, ${p.field})`,
      `No matching staged proposal in diff for ${p.catalogId} ${p.category} ${p.field}`
    )

    if (staged) {
      assert(
        p.currentValue === staged.old,
        `Proposal currentValue matches staged old: ${p.proposalId}`,
        `Proposal currentValue ${p.currentValue} != staged old ${staged.old}`
      )
      assert(
        p.proposedValue === staged.proposed,
        `Proposal proposedValue matches staged proposed: ${p.proposalId}`,
        `Proposal proposedValue ${p.proposedValue} != staged proposed ${staged.proposed}`
      )
      assert(
        p.source.url === staged.url,
        `Proposal source URL matches staged URL: ${p.proposalId}`,
        `Proposal URL ${p.source.url} != staged URL ${staged.url}`
      )
    }
  }

  // Group 4: Source Reference & Variant Mapping Metadata
  for (const p of proposals) {
    const matchedSource = sources.find(
      (s) => s.artifact.relativePath === p.source.artifactRelativePath && s.url === p.source.url
    )
    assert(
      Boolean(matchedSource),
      `Proposal cites valid archived source: ${p.proposalId}`,
      `No archived source in sources.json matches URL ${p.source.url}`
    )
    assert(
      Boolean(matchedSource) && p.source.artifactSha256 === matchedSource.artifact.sha256,
      `Proposal source SHA-256 matches capture metadata: ${p.proposalId}`,
      'Proposal source SHA-256 or URL/path does not match the cited capture'
    )

    // Variant mapping checks:
    // Rocketman lp-024 / lp-036: Catalog parts are Ultra-Light line (0.66 oz nylon, Spectra lines).
    // Proposing standard line values must be rejected as REJECT_VARIANT_MISMATCH based on physical evidence.
    if (p.catalogId === 'lp-024' || p.catalogId === 'lp-036') {
      const isStandardSource = p.source.url.includes('rocketman-high-performance-cd-2-2-parachutes')
      if (isStandardSource) {
        assert(
          p.proposedDisposition === 'reject',
          `Rocketman proposal ${p.proposalId} disposition is 'reject'`,
          `Expected 'reject', got '${p.proposedDisposition}'`
        )
        assert(
          p.identityConfidence === 'REJECT_VARIANT_MISMATCH',
          `Rocketman proposal ${p.proposalId} identityConfidence is 'REJECT_VARIANT_MISMATCH'`,
          `Expected 'REJECT_VARIANT_MISMATCH', got '${p.identityConfidence}'`
        )
      }
    }

    // Fruity Chutes ifc-030-sl: Primary sources omit IFC-30-SL.
    // Mapping to IFC-30-SL is an unconfirmed hypothesis. Prohibit overwrite/rename. Six proposals must be HOLD.
    if (p.catalogId === 'ifc-030-sl') {
      assert(
        p.proposedDisposition === 'hold',
        `Iris proposal ${p.proposalId} disposition is 'hold'`,
        `Expected 'hold', got '${p.proposedDisposition}'`
      )
      assert(
        p.identityConfidence === 'UNCONFIRMED_HYPOTHESIS',
        `Iris proposal ${p.proposalId} identityConfidence is 'UNCONFIRMED_HYPOTHESIS'`,
        `Expected 'UNCONFIRMED_HYPOTHESIS', got '${p.identityConfidence}'`
      )
    }

    // Fruity Chutes cfc-030-n: Parent direction: retain existing 88 g as rounded equivalent of published 87.9 g.
    if (p.catalogId === 'cfc-030-n') {
      assert(
        p.proposedDisposition === 'retain-rounded',
        `CFC-30-N proposal ${p.proposalId} disposition is 'retain-rounded'`,
        `Expected 'retain-rounded', got '${p.proposedDisposition}'`
      )
      assert(
        p.identityConfidence === 'HIGH',
        `CFC-30-N proposal ${p.proposalId} identityConfidence is 'HIGH'`,
        `Expected 'HIGH', got '${p.identityConfidence}'`
      )
    }
  }

  // Group 5: Units & Conversion Sanity Checks
  for (const p of proposals) {
    const expectedUnit = {
      weight_g: 'g',
      packed_diam_in: 'in',
      packed_length_in: 'in',
    }[p.field]
    assert(
      expectedUnit !== undefined &&
        p.currentUnit === expectedUnit &&
        p.proposedUnit === expectedUnit,
      `Declared units match field: ${p.proposalId}`,
      `Unit labels must both be ${expectedUnit} for ${p.field}`
    )
    if (p.field === 'weight_g') {
      // Ounce-as-gram error detector: For parachutes >= 24 in, mass in grams cannot equal raw ounce figure
      const rawOunceValues = [0.7, 1.34, 1.5, 1.88, 2.1, 3.1, 4.8]
      const isRawOunce = rawOunceValues.includes(p.proposedValue) || p.proposedValue < 5.0
      assert(
        !isRawOunce,
        `Unit conversion sanity for ${p.proposalId}: proposedValue ${p.proposedValue} is not raw ounces in grams field`,
        `Ounce-as-gram unit error detected: proposedValue ${p.proposedValue} appears to be raw ounces`
      )

      // Mathematical conversion tolerance verification against 28.349523125 g/oz
      if (p.catalogId === 'lp-024') {
        const expectedExactGrams = 3.1 * 28.349523125 // 87.883521688 g
        assert(
          Math.abs(p.proposedValue - expectedExactGrams) < 1e-6,
          `Rocketman 24" weight conversion math matches source 3.1 oz: ${p.proposedValue}`,
          `Expected ${expectedExactGrams}, got ${p.proposedValue}`
        )
      } else if (p.catalogId === 'lp-036') {
        const expectedExactGrams = 4.8 * 28.349523125 // 136.077711 g
        assert(
          Math.abs(p.proposedValue - expectedExactGrams) < 1e-6,
          `Rocketman 36" weight conversion math matches source 4.8 oz: ${p.proposedValue}`,
          `Expected ${expectedExactGrams}, got ${p.proposedValue}`
        )
      } else if (p.catalogId === 'cfc-030-n') {
        const mathGrams = 3.1 * 28.349523125 // 87.8835 g
        assert(
          Math.abs(p.proposedValue - mathGrams) < 0.05,
          `CFC-30-N published 87.9 g is within 0.05 g of 3.1 oz conversion: ${p.proposedValue}`,
          `Expected close to ${mathGrams}, got ${p.proposedValue}`
        )
        assert(
          Math.abs(p.currentValue - mathGrams) < 0.2,
          `CFC-30-N catalog 88 g is nearest integer rounded equivalent of 3.1 oz conversion`,
          `Catalog 88 g differs by ${Math.abs(p.currentValue - mathGrams)} g`
        )
      }
    }
  }

  // Ambiguous range preservation: CFC-30-N Cd range [1.5, 1.6] preserved without inventing constant
  const cfc30Src = sources.find((s) => s.sourceId === 'fruitychutes-cfc-30-n-standard')
  assert(
    Array.isArray(cfc30Src?.specs?.cd_range) &&
      cfc30Src.specs.cd_range[0] === 1.5 &&
      cfc30Src.specs.cd_range[1] === 1.6,
    `CFC-30-N Cd preserved as [1.5, 1.6] range in source record without inventing constant`
  )

  // Group 6: Governance, No Self-Acceptance & Derived Summary Counts
  // Deriving summary counts dynamically rather than asserting fixed constants
  const derivedSummary = {
    total_proposals_evaluated: proposals.length,
    proposed_reject_count: proposals.filter((p) => p.proposedDisposition === 'reject').length,
    proposed_hold_count: proposals.filter((p) => p.proposedDisposition === 'hold').length,
    proposed_retain_rounded_count: proposals.filter(
      (p) => p.proposedDisposition === 'retain-rounded'
    ).length,
    proposed_accept_count: proposals.filter((p) => p.proposedDisposition === 'accept').length,
  }

  assert(
    derivedSummary.proposed_accept_count === 0,
    `Author self-acceptance count is exactly 0 (contract invariant: ${derivedSummary.proposed_accept_count})`,
    `Self-acceptance count was ${derivedSummary.proposed_accept_count}`
  )

  assert(
    proposalsData.summary.total_proposals_evaluated === derivedSummary.total_proposals_evaluated,
    `Summary total matches derived proposal count (${derivedSummary.total_proposals_evaluated})`,
    `Expected ${derivedSummary.total_proposals_evaluated}, got ${proposalsData.summary.total_proposals_evaluated}`
  )

  assert(
    proposalsData.summary.proposed_reject_count === derivedSummary.proposed_reject_count,
    `Summary reject count matches derived reject count (${derivedSummary.proposed_reject_count})`,
    `Expected ${derivedSummary.proposed_reject_count}, got ${proposalsData.summary.proposed_reject_count}`
  )

  assert(
    proposalsData.summary.proposed_hold_count === derivedSummary.proposed_hold_count,
    `Summary hold count matches derived hold count (${derivedSummary.proposed_hold_count})`,
    `Expected ${derivedSummary.proposed_hold_count}, got ${proposalsData.summary.proposed_hold_count}`
  )

  assert(
    proposalsData.summary.proposed_retain_rounded_count ===
      derivedSummary.proposed_retain_rounded_count,
    `Summary retain-rounded count matches derived retain-rounded count (${derivedSummary.proposed_retain_rounded_count})`,
    `Expected ${derivedSummary.proposed_retain_rounded_count}, got ${proposalsData.summary.proposed_retain_rounded_count}`
  )

  assert(
    proposalsData.summary.proposed_accept_count === 0,
    `Recorded author self-acceptance is 0 in proposal summary`,
    `Summary has non-zero accepted count: ${proposalsData.summary.proposed_accept_count}`
  )

  return {
    success: failures === 0,
    passes,
    failures,
    diagnostics,
    derivedSummary,
  }
}

// CLI Execution Entrypoint
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (isMain) {
  console.log('=== RecoverySys Online Catalog Evidence Auditor ===\n')
  console.log('Boundaries & Disclaimers:')
  console.log('  - Strictly read-only audit of local records and archived evidence.')
  console.log('  - No production enforcement or catalog modification is performed or claimed.')
  console.log('  - SHA-256 and byte length establish archive integrity against recorded captures;')
  console.log(
    '    they DO NOT establish freshness, identity, or absence of upstream vendor changes.'
  )
  console.log(
    '  - Semantic validity of manufacturer claims and rating conventions requires manual engineering review.\n'
  )

  try {
    const result = await auditCatalogEvidence()
    for (const d of result.diagnostics) {
      if (d.type === 'PASS') {
        console.log(`  PASS: ${d.testName}`)
      } else {
        console.error(`  FAIL: ${d.testName} - ${d.details}`)
      }
    }

    console.log(`\nDerived Summary Counts:`)
    console.log(`  Total Proposals Evaluated: ${result.derivedSummary.total_proposals_evaluated}`)
    console.log(`  Proposed Reject:           ${result.derivedSummary.proposed_reject_count}`)
    console.log(`  Proposed Hold:             ${result.derivedSummary.proposed_hold_count}`)
    console.log(
      `  Proposed Retain-Rounded:   ${result.derivedSummary.proposed_retain_rounded_count}`
    )
    console.log(`  Proposed Accept:           ${result.derivedSummary.proposed_accept_count}`)

    console.log(`\nAudit Results: ${result.passes} passed, ${result.failures} failed.`)
    if (!result.success) {
      process.exit(1)
    } else {
      console.log('All catalog evidence audit checks PASSED successfully.')
    }
  } catch (err) {
    console.error('Fatal auditor exception:', err)
    process.exit(1)
  }
}
