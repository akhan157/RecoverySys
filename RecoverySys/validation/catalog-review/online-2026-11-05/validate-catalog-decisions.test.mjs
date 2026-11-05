// Negative Mutation Test Suite for RecoverySys Catalog Evidence Auditor
// Location: RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.test.mjs
// Owns ONLY this directory. All mutation fixtures are synthetic and in-memory.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditCatalogEvidence, resolvePrimaryRoot } from './validate-catalog-decisions.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultSources = JSON.parse(await readFile(resolve(__dirname, 'sources.json'), 'utf8'))
const defaultProposalsData = JSON.parse(await readFile(resolve(__dirname, 'DECISION-PROPOSALS.json'), 'utf8'))

test('Baseline: Authentic unmodified packet passes all evidence audit checks', async () => {
  const result = await auditCatalogEvidence()
  assert.equal(result.success, true, 'Baseline audit must succeed')
  assert.equal(result.failures, 0, 'Baseline audit must have zero failures')
  assert.ok(result.passes > 0, 'Baseline audit must record passing checks')
  assert.equal(result.derivedSummary.proposed_accept_count, 0, 'Author acceptance must be 0')
  assert.equal(result.derivedSummary.proposed_reject_count, 6, 'Derived reject count must match')
  assert.equal(result.derivedSummary.proposed_hold_count, 6, 'Derived hold count must match')
  assert.equal(result.derivedSummary.proposed_retain_rounded_count, 2, 'Derived retain-rounded count must match')
})

test('Mutation 1: missingartifact - Detects missing external artifact file', async () => {
  const mutatedSources = JSON.parse(JSON.stringify(defaultSources))
  mutatedSources[0].artifact.relativePath = '../RecoverySys-artifacts/online-validation-2026-11-05/catalog/non-existent-artifact-123.md'

  const result = await auditCatalogEvidence({ sources: mutatedSources })
  assert.equal(result.success, false, 'Audit must fail when artifact is missing')
  assert.ok(result.failures >= 1, 'Must record at least one failure')

  const missingArtifactFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.testName.includes('Artifact exists') && d.details.includes('not found')
  )
  assert.ok(missingArtifactFailure, 'Diagnostic must specifically report missing artifact failure')
})

test('Mutation 2: changedbytes/hash - Detects SHA-256 hash mismatch / byte mutation', async () => {
  const mutatedSources = JSON.parse(JSON.stringify(defaultSources))
  // Alter expected hash
  mutatedSources[0].artifact.sha256 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  const result = await auditCatalogEvidence({ sources: mutatedSources })
  assert.equal(result.success, false, 'Audit must fail on altered SHA-256 checksum')
  assert.ok(result.failures >= 1, 'Must record failure')

  const hashFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.testName.includes('Artifact SHA-256 matches') && d.details.includes('SHA-256 mismatch')
  )
  assert.ok(hashFailure, 'Diagnostic must report SHA-256 checksum mismatch')
})

test('Mutation 3: wrongsource/variant link - Detects standard-line source linked to ultralight catalog item', async () => {
  const mutatedProposalsData = JSON.parse(JSON.stringify(defaultProposalsData))
  // Mutate Rocketman lp-024 proposal to falsely accept standard line values
  const prop = mutatedProposalsData.proposals.find(p => p.proposalId === 'PROP-20261105-11')
  prop.proposedDisposition = 'accept'
  prop.identityConfidence = 'HIGH'

  const result = await auditCatalogEvidence({ proposalsData: mutatedProposalsData })
  assert.equal(result.success, false, 'Audit must fail when standard line is linked to ultralight part without reject')

  const variantFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.testName.includes("Rocketman proposal PROP-20261105-11 disposition is 'reject'")
  )
  assert.ok(variantFailure, 'Diagnostic must report failure of variant mismatch rejection')
})

test('Mutation 4: ounce-as-gram - Detects raw ounce numbers erroneously injected into gram fields', async () => {
  const mutatedProposalsData = JSON.parse(JSON.stringify(defaultProposalsData))
  // Mutate proposedValue from 87.9 g to raw 3.1 (ounces directly placed in grams field)
  const prop = mutatedProposalsData.proposals.find(p => p.proposalId === 'PROP-20261105-01')
  prop.proposedValue = 3.1

  const result = await auditCatalogEvidence({ proposalsData: mutatedProposalsData })
  assert.equal(result.success, false, 'Audit must fail on ounce-as-gram unit mistake')

  const unitFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.details && d.details.includes('Ounce-as-gram unit error detected')
  )
  assert.ok(unitFailure, 'Diagnostic must specifically identify ounce-as-gram unit error')
})

test('Mutation 5: duplicateproposal - Detects duplicate proposal ID and tuple collisions', async () => {
  const mutatedProposalsData = JSON.parse(JSON.stringify(defaultProposalsData))
  // Inject duplicate proposal entry
  const duplicate = JSON.parse(JSON.stringify(mutatedProposalsData.proposals[0]))
  mutatedProposalsData.proposals.push(duplicate)

  const result = await auditCatalogEvidence({ proposalsData: mutatedProposalsData })
  assert.equal(result.success, false, 'Audit must fail when duplicate proposal exists')

  const duplicateIdFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.details && d.details.includes('Duplicate proposal ID detected')
  )
  const duplicateTupleFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.details && d.details.includes('Duplicate proposal tuple detected')
  )
  assert.ok(duplicateIdFailure || duplicateTupleFailure, 'Diagnostic must report duplicate proposal detection')
})

test('Mutation 6: alteredcurrentvalue - Detects currentValue tampering or divergence from parts.js', async () => {
  const mutatedProposalsData = JSON.parse(JSON.stringify(defaultProposalsData))
  // Alter currentValue from catalog 88 to 99
  const prop = mutatedProposalsData.proposals.find(p => p.proposalId === 'PROP-20261105-01')
  prop.currentValue = 99

  const result = await auditCatalogEvidence({ proposalsData: mutatedProposalsData })
  assert.equal(result.success, false, 'Audit must fail when proposal currentValue diverges from parts.js')

  const currentValueFailure = result.diagnostics.find(
    d => d.type === 'FAIL' && d.details && d.details.includes('does not match catalog value 88')
  )
  assert.ok(currentValueFailure, 'Diagnostic must report currentValue mismatch against production catalog')
})
