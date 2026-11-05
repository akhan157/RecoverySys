#!/usr/bin/env node
/**
 * Standalone Read-Only Benchmark Runner for Online Physics Validation (2026-11-05).
 *
 * Requirements:
 *   - Standalone and read-only (no destructive writes)
 *   - Checks free memory (stops if available memory < 2 GiB)
 *   - Can be invoked from primary root, app dir, worktree root, or owned directory
 *   - Performs schema validation of 6 proposals using Ajv without altering corpus
 *   - Evaluates 4 approved reachable benchmarks against independent Python reference
 *   - Runs 5 rigorous negative controls exercising adapter and comparison paths
 *   - Formats complete JSON report with exact model, source, and metrics identities
 *   - Writes output report and logs outside git to sibling artifacts directory
 *   - Exits nonzero on any failure
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, execSync } from 'node:child_process'
import os from 'node:os'

import {
  PRODUCTION_MODEL_ID,
  PRODUCTION_MODEL_VERSION,
  PRODUCTION_ASSUMPTIONS_VERSION,
  compareMetric,
  evaluateAtmosphere,
  evaluateTerminalDescent,
  evaluateDrift,
  evaluateSnatch,
} from './adapter.js'
import { runNegativeControls } from './negative-controls.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── 1. Memory Check ──────────────────────────────────────────────────────────
function checkFreeMemory() {
  let availableBytes = os.freemem()
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8')
    const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/)
    if (match) {
      availableBytes = parseInt(match[1], 10) * 1024
    }
  } catch {
    // Fallback to os.freemem()
  }

  const minRequiredBytes = 2 * 1024 * 1024 * 1024 // 2 GiB
  const availableGiB = (availableBytes / (1024 * 1024 * 1024)).toFixed(2)
  if (availableBytes < minRequiredBytes) {
    console.error(
      `ABORT: Available memory ${availableGiB} GiB is below the 2 GiB safety threshold.`
    )
    process.exit(1)
  }
  return availableGiB
}

// ── 2. Locate Repositories & Artifacts Directory ─────────────────────────────
function resolvePaths() {
  const ownedDir = __dirname
  const appDir = path.resolve(ownedDir, '../..')
  let gitCommonDir = null
  let primaryRepo = null

  try {
    const common = execSync('git rev-parse --git-common-dir', {
      cwd: ownedDir,
      encoding: 'utf8',
    }).trim()
    gitCommonDir = path.resolve(ownedDir, common)
    primaryRepo = path.dirname(gitCommonDir)
  } catch {
    primaryRepo = path.resolve(appDir, '..')
  }

  // Sibling artifacts directory relative to primary repo
  const artifactsDir = path.resolve(
    primaryRepo,
    '../RecoverySys-artifacts/online-validation-2026-11-05/physics'
  )

  const corpusSchemaPath = path.resolve(appDir, 'validation/corpus/schema.json')
  const proposalsDir = path.resolve(ownedDir, 'proposals')
  const sourcesPath = path.resolve(ownedDir, 'sources.json')
  const refCalcScript = path.resolve(ownedDir, 'reference_calculator.py')

  return {
    ownedDir,
    appDir,
    primaryRepo,
    artifactsDir,
    corpusSchemaPath,
    proposalsDir,
    sourcesPath,
    refCalcScript,
  }
}

// ── 3. Dynamic Ajv Loader ───────────────────────────────────────────────────
async function loadAjv(paths) {
  const candidatePaths = [
    path.join(paths.appDir, 'node_modules/ajv/dist/2020.js'),
    path.join(paths.primaryRepo, 'RecoverySys/node_modules/ajv/dist/2020.js'),
    path.join(paths.primaryRepo, 'node_modules/ajv/dist/2020.js'),
    '/home/ak/RecoverySys/RecoverySys/node_modules/ajv/dist/2020.js',
  ]

  for (const cand of candidatePaths) {
    if (fs.existsSync(cand)) {
      const ajvMod = await import(cand)
      return ajvMod.default
    }
  }

  // Fallback to standard package import
  try {
    const ajvMod = await import('ajv/dist/2020.js')
    return ajvMod.default
  } catch (err) {
    throw new Error(`Cannot locate ajv module for schema checking: ${err.message}`)
  }
}

// ── 4. Main Execution ────────────────────────────────────────────────────────
async function main() {
  const availableMemGiB = checkFreeMemory()
  const paths = resolvePaths()

  console.log('=================================================================')
  console.log('RecoverySys Online Physics Benchmark Suite (2026-11-05)')
  console.log(`Available Memory: ${availableMemGiB} GiB (Threshold: 2.00 GiB)`)
  console.log(`Owned Directory: ${paths.ownedDir}`)
  console.log(`Primary Repo: ${paths.primaryRepo}`)
  console.log(`Artifacts Root: ${paths.artifactsDir}`)
  console.log('=================================================================\n')

  // A. Schema Check Proposals
  console.log('--- Step 1: Schema-checking proposals against corpus schema ---')
  const AjvClass = await loadAjv(paths)
  const schemaJson = JSON.parse(fs.readFileSync(paths.corpusSchemaPath, 'utf8'))
  const validateSchema = new AjvClass({ allErrors: true })
    .addFormat('uri', /^https?:\/\/\S+$/)
    .addFormat('date', /^\d{4}-\d{2}-\d{2}$/)
    .compile(schemaJson)

  const proposalFiles = fs
    .readdirSync(paths.proposalsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()

  const schemaResults = []
  let allSchemasValid = true

  for (const file of proposalFiles) {
    const fullPath = path.join(paths.proposalsDir, file)
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    const valid = validateSchema(content)
    schemaResults.push({
      file,
      id: content.id,
      valid,
      errors: valid ? null : validateSchema.errors,
    })
    if (!valid) allSchemasValid = false
    console.log(`  Proposal ${file}: ${valid ? 'PASS' : 'FAIL (schema errors)'}`)
  }

  if (!allSchemasValid) {
    console.error('ERROR: One or more proposals failed corpus schema validation.')
    process.exit(1)
  }
  console.log('All 6 proposal JSON files pass corpus schema validation cleanly.\n')

  // B. Run Independent Reference Calculator
  console.log('--- Step 2: Running independent first-principles reference calculator ---')
  const refOutputRaw = execFileSync('python3', [paths.refCalcScript, '--json'], {
    encoding: 'utf8',
  })
  const referenceData = JSON.parse(refOutputRaw)
  console.log(`Computed 4 independent analytical references via ${referenceData.calculator}.\n`)

  // C. Execute 4 Reachable Benchmarks
  console.log('--- Step 3: Executing 4 approved reachable benchmarks ---')
  const benchmarksEvaluated = []
  let allBenchmarksPass = true

  // Benchmark 1: Atmosphere
  {
    const bId = 'isa-troposphere-analytic-2500m'
    const ref = referenceData.references[bId]
    const obs = evaluateAtmosphere(ref.inputs)
    const metricsComparison = []
    let benchPass = obs.status === 'evaluated'

    for (const [mname, mspec] of Object.entries(ref.metrics)) {
      const cmp = compareMetric(obs.metrics[mname], mspec.value, mspec.tolerance)
      metricsComparison.push({
        metric: mname,
        unit: mspec.unit,
        expected: mspec.value,
        observed: obs.metrics[mname],
        difference: cmp.difference,
        threshold: cmp.threshold,
        toleranceType: cmp.toleranceType,
        basis: cmp.basis,
        pass: cmp.pass,
      })
      if (!cmp.pass) benchPass = false
    }

    benchmarksEvaluated.push({
      id: bId,
      name: '2500m Matched-Coordinate Atmosphere T/P/rho',
      domain: 'atmosphere',
      kind: 'analytic',
      status: 'evaluated',
      verdict: benchPass ? 'PASS' : 'FAIL',
      inputs: ref.inputs,
      metrics: metricsComparison,
    })
    if (!benchPass) allBenchmarksPass = false
    console.log(`  [${benchPass ? 'PASS' : 'FAIL'}] ${bId}`)
  }

  // Benchmark 2: Terminal Descent 48-inch
  {
    const bId = 'terminal-descent-nominal-48in-sea-level'
    const ref = referenceData.references[bId]
    const obs = evaluateTerminalDescent(ref.inputs)
    const metricsComparison = []
    let benchPass = obs.status === 'evaluated'

    for (const [mname, mspec] of Object.entries(ref.metrics)) {
      const cmp = compareMetric(obs.metrics[mname], mspec.value, mspec.tolerance)
      metricsComparison.push({
        metric: mname,
        unit: mspec.unit,
        expected: mspec.value,
        observed: obs.metrics[mname],
        difference: cmp.difference,
        threshold: cmp.threshold,
        toleranceType: cmp.toleranceType,
        basis: cmp.basis,
        pass: cmp.pass,
      })
      if (!cmp.pass) benchPass = false
    }

    benchmarksEvaluated.push({
      id: bId,
      name: '48in Nominal Area Terminal Descent at Sea Level',
      domain: 'descent',
      kind: 'analytic',
      status: 'evaluated',
      verdict: benchPass ? 'PASS' : 'FAIL',
      inputs: ref.inputs,
      metrics: metricsComparison,
    })
    if (!benchPass) allBenchmarksPass = false
    console.log(`  [${benchPass ? 'PASS' : 'FAIL'}] ${bId}`)
  }

  // Benchmark 3: Cardinal Wind Drift 3000ft
  {
    const bId = 'cardinal-wind-drift-north-3000ft'
    const ref = referenceData.references[bId]
    const obs = evaluateDrift(ref.inputs)
    const metricsComparison = []
    let benchPass = obs.status === 'evaluated'

    for (const [mname, mspec] of Object.entries(ref.metrics)) {
      const cmp = compareMetric(obs.metrics[mname], mspec.value, mspec.tolerance)
      metricsComparison.push({
        metric: mname,
        unit: mspec.unit,
        expected: mspec.value,
        observed: obs.metrics[mname],
        difference: cmp.difference,
        threshold: cmp.threshold,
        toleranceType: cmp.toleranceType,
        basis: cmp.basis,
        pass: cmp.pass,
      })
      if (!cmp.pass) benchPass = false
    }

    benchmarksEvaluated.push({
      id: bId,
      name: 'Constant 15mph Wind From South Drift (North Displaced)',
      domain: 'drift',
      kind: 'analytic',
      status: 'evaluated',
      verdict: benchPass ? 'PASS' : 'FAIL',
      inputs: ref.inputs,
      metrics: metricsComparison,
    })
    if (!benchPass) allBenchmarksPass = false
    console.log(`  [${benchPass ? 'PASS' : 'FAIL'}] ${bId}`)
  }

  // Benchmark 4: Secant Linear-Elastic Snatch Arithmetic
  {
    const bId = 'linear-elastic-snatch-energy-margin-nylon'
    const ref = referenceData.references[bId]
    const obs = evaluateSnatch(ref.inputs)
    const metricsComparison = []
    let benchPass = obs.status === 'evaluated'

    for (const [mname, mspec] of Object.entries(ref.metrics)) {
      const cmp = compareMetric(obs.metrics[mname], mspec.value, mspec.tolerance)
      metricsComparison.push({
        metric: mname,
        unit: mspec.unit,
        expected: mspec.value,
        observed: obs.metrics[mname],
        difference: cmp.difference,
        threshold: cmp.threshold,
        toleranceType: cmp.toleranceType,
        basis: cmp.basis,
        pass: cmp.pass,
      })
      if (!cmp.pass) benchPass = false
    }

    benchmarksEvaluated.push({
      id: bId,
      name: 'Secant Linear-Elastic Snatch Arithmetic Proxy',
      domain: 'shock-load',
      kind: 'analytic',
      status: 'evaluated',
      verdict: benchPass ? 'PASS' : 'FAIL',
      inputs: ref.inputs,
      metrics: metricsComparison,
    })
    if (!benchPass) allBenchmarksPass = false
    console.log(`  [${benchPass ? 'PASS' : 'FAIL'}] ${bId}`)
  }

  console.log()

  // D. Execute Negative Controls Suite
  console.log('--- Step 4: Executing negative controls suite ---')
  const negativeControlResults = runNegativeControls(referenceData)
  for (const ctrl of negativeControlResults.controls) {
    console.log(`  [${ctrl.verdict}] ${ctrl.id}: ${ctrl.name}`)
  }
  console.log(
    `Negative controls: ${negativeControlResults.detectedCount}/${negativeControlResults.total} defects properly detected.\n`
  )

  // E. Excluded / Blocked Cases Registration
  const excludedCases = [
    {
      id: 'unpowered-vertical-coast-apogee-analytic',
      domain: 'ascent',
      kind: 'analytic',
      disposition: 'excluded_from_execution',
      reason:
        'Production integrateAscent models powered ascent with varying density, Mach drag rise, and APCP mass depletion; unpowered constant-density coast is not exposed as a public API seam in production. No new production seams are authorized.',
    },
    {
      id: 'prometheus-telemetrum-dual-deploy-flight-descent',
      domain: 'descent',
      kind: 'real-flight',
      disposition: 'blocked_pending_evidence',
      reason:
        'Vehicle dry mass (14.5 kg), drogue diameter (24 in), main diameter (120 in), launch pad atmospheric conditions, and sensor uncertainty are unverified in the supplied TeleMetrum CSV. A chosen ±15% band lacks source-stated acceptance. Flight comparison remains strictly blocked pending configuration and environmental provenance.',
    },
  ]

  // F. Structure Complete Report
  const sourcesData = JSON.parse(fs.readFileSync(paths.sourcesPath, 'utf8'))
  const report = {
    timestamp: new Date().toISOString(),
    executionEnvironment: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      availableMemoryGiB: availableMemGiB,
      worktree: paths.appDir,
      primaryRepo: paths.primaryRepo,
    },
    models: {
      production: {
        id: PRODUCTION_MODEL_ID,
        version: PRODUCTION_MODEL_VERSION,
        assumptionsVersion: PRODUCTION_ASSUMPTIONS_VERSION,
      },
      reference: {
        id: 'independent-first-principles-reference-calculator',
        version: '1.0.0',
        language: 'python3-standard-library',
        oracleTautologyAvoided: true,
      },
    },
    sources: sourcesData.sources.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      artifact: s.artifact ?? null,
      uncapturedMetadata: s.uncapturedMetadata ?? null,
      reuseConstraints: s.reuseConstraints,
    })),
    proposalSchemaValidation: {
      schemaPath: paths.corpusSchemaPath,
      totalProposals: proposalFiles.length,
      allValid: allSchemasValid,
      results: schemaResults,
    },
    reachableBenchmarks: {
      total: benchmarksEvaluated.length,
      passed: benchmarksEvaluated.filter((b) => b.verdict === 'PASS').length,
      failed: benchmarksEvaluated.filter((b) => b.verdict === 'FAIL').length,
      allPassed: allBenchmarksPass,
      benchmarks: benchmarksEvaluated,
    },
    negativeControls: negativeControlResults,
    excludedCases,
    summary: {
      benchmarksPass: allBenchmarksPass,
      negativeControlsPass: negativeControlResults.allDetected,
      proposalSchemasPass: allSchemasValid,
      overallVerdict:
        allBenchmarksPass && negativeControlResults.allDetected && allSchemasValid
          ? 'PASS'
          : 'FAIL',
      authorSignoffClaimed: false,
      note: 'Author cannot self-accept; submitted for independent parent review.',
    },
  }

  // G. Write Output Report & Raw Run Log Outside Git
  if (fs.existsSync(paths.artifactsDir)) {
    const reportPath = path.join(paths.artifactsDir, 'online-benchmarks-report.json')
    const logPath = path.join(paths.artifactsDir, 'online-benchmarks-run.log')

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    const logContent = [
      `RecoverySys Online Physics Benchmark Run Log`,
      `Executed: ${report.timestamp}`,
      `Node: ${report.executionEnvironment.nodeVersion}, MemAvailable: ${report.executionEnvironment.availableMemoryGiB} GiB`,
      `Proposals Checked: ${report.proposalSchemaValidation.totalProposals} (${report.proposalSchemaValidation.allValid ? 'ALL VALID' : 'FAILED'})`,
      `Reachable Benchmarks: ${report.reachableBenchmarks.passed}/${report.reachableBenchmarks.total} PASSED`,
      `Negative Controls: ${report.negativeControls.detectedCount}/${report.negativeControls.total} DEFECTS DETECTED`,
      `Overall Verdict: ${report.summary.overallVerdict}`,
      `Report JSON: ${reportPath}`,
    ].join('\n')

    fs.writeFileSync(logPath, logContent)
    console.log('--- Step 5: Reports written outside git ---')
    console.log(`Report JSON: ${reportPath}`)
    console.log(`Run Log: ${logPath}`)
  } else {
    console.warn(`WARNING: Artifacts directory not found at ${paths.artifactsDir}`)
  }

  console.log('=================================================================')
  console.log(`FINAL RESULT: ${report.summary.overallVerdict}`)
  console.log('=================================================================')

  if (!allBenchmarksPass || !negativeControlResults.allDetected || !allSchemasValid) {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal execution error in benchmark runner:', err)
  process.exit(1)
})
