#!/usr/bin/env node
// Mutation tests for validate-review.mjs. Each mutation copies the two packet
// JSON files to a temporary directory, edits one thing, and expects the
// validator to fail. No production file or external artifact is modified.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const VALIDATOR = join(HERE, 'validate-review.mjs')
const REC = join(HERE, 'RECOMMENDATIONS.json')
const SOURCES = join(HERE, 'sources.json')

function runWithPacket(packetDir) {
  const res = spawnSync(process.execPath, [VALIDATOR], {
    env: { ...process.env, PACKET_DIR: packetDir },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  let parsed = null
  try {
    parsed = JSON.parse(res.stdout)
  } catch {
    parsed = null
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, parsed }
}

function mutate(mutator) {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-review-2026-11-07-'))
  try {
    const rec = JSON.parse(readFileSync(REC, 'utf8'))
    const sources = JSON.parse(readFileSync(SOURCES, 'utf8'))
    mutator(rec, sources)
    writeFileSync(join(dir, 'RECOMMENDATIONS.json'), JSON.stringify(rec, null, 2))
    writeFileSync(join(dir, 'sources.json'), JSON.stringify(sources, null, 2))
    const result = runWithPacket(dir)
    return { ...result, dir }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function assertFailed(result, namePart) {
  assert.equal(result.status, 1, `expected validator exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`)
  assert.ok(result.parsed, 'validator did not emit JSON')
  assert.ok(result.parsed.failed > 0, 'expected at least one failed check')
  assert.ok(
    result.parsed.failures.some((f) => f.name.toLowerCase().includes(namePart.toLowerCase())),
    `expected a failure containing "${namePart}", got ${JSON.stringify(result.parsed.failures.map((f) => f.name))}`
  )
}

test('baseline packet passes all checks', () => {
  const result = runWithPacket(HERE)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.ok(result.parsed.passed > 1000, `expected many checks, got ${result.parsed.passed}`)
  assert.equal(result.parsed.failed, 0)
})

test('duplicate (partId, category, field) row is detected', () => {
  const result = mutate((rec) => {
    rec.rows[1].partId = rec.rows[0].partId
    rec.rows[1].category = rec.rows[0].category
    rec.rows[1].field = rec.rows[0].field
  })
  assertFailed(result, 'unique')
})

test('missing source artifact hash is detected', () => {
  const result = mutate((rec, sources) => {
    sources.sources[0].artifact.sha256 = '0000000000000000000000000000000000000000000000000000000000000000'
  })
  assertFailed(result, 'artifact hash matches')
})

test('mismatched catalog current value is detected', () => {
  const result = mutate((rec) => {
    rec.rows[2].currentValue = rec.rows[2].currentValue + 1
  })
  assertFailed(result, 'currentValue matches PARTS')
})

test('missing artifact file is detected', () => {
  const result = mutate((rec, sources) => {
    sources.sources[0].artifact.homeRelativePath =
      'RecoverySys-artifacts/catalog-review-2026-11-07/reader-proxy/does-not-exist.md'
  })
  assertFailed(result, 'artifact exists')
})

test('altered summary count is detected', () => {
  const result = mutate((rec) => {
    rec.counts.totalRows = 34
  })
  assertFailed(result, 'Recorded counts equal rows')
})

test('silent disposition flip on ifc-096-s is detected', () => {
  const result = mutate((rec) => {
    rec.rows[30].disposition = 'retain-rounded'
    rec.rows[30].recommendedCatalogValue = null
  })
  assertFailed(result, 'ifc-096-s recommends 462 g')
})

test('missing row reason is detected', () => {
  const result = mutate((rec) => {
    rec.rows[0].reason = ''
  })
  assertFailed(result, 'reason')
})

test('fabricated area value is detected', () => {
  const result = mutate((rec) => {
    rec.rows[0].reviewEvidence.publishedArea = 12.5
  })
  assertFailed(result, 'area is not fabricated')
})
