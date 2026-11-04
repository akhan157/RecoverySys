import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateCorpus } from './validate-corpus.js'

// Report individual comparisons; unlike units and evidence types must not be averaged.
export function buildBenchmarkReport(corpus, reference) {
  if (!corpus.valid) throw new Error(`Invalid corpus: ${corpus.diagnostics.join('; ')}`)
  const byId = new Map(corpus.caseSummaries.map((item) => [item.id, item]))
  const analyticComparisons = reference.cases.map((item) => {
    const testCase = byId.get(item.case)
    if (!testCase || testCase.metrics.length !== 1)
      throw new Error(`Unmatched reference: ${item.case}`)
    const metric = testCase.metrics[0]
    if (metric.unit !== item.unit) throw new Error(`Unit mismatch: ${item.case}`)
    const difference = metric.observed - item.reference
    return {
      case: item.case,
      metric: metric.name,
      unit: item.unit,
      observed: metric.observed,
      reference: item.reference,
      difference,
      relativeDifferencePercent:
        item.reference === 0 ? null : (100 * difference) / Math.abs(item.reference),
      status: testCase.status,
    }
  })
  return {
    status: 'review-only',
    limitations: [
      'Numerical agreement with equations is not real-flight accuracy or safety validation.',
      'Corpus expectations and tolerances are review-only until independently accepted.',
      'Rounded outputs can hide differences; no overall accuracy score is justified.',
    ],
    coverage: corpus.domainCoverage,
    corpusComparisons: corpus.caseSummaries,
    analyticComparisons,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const reference = JSON.parse(
      execFileSync('python3', ['scripts/physics-reference.py'], { encoding: 'utf8' })
    )
    console.log(JSON.stringify(buildBenchmarkReport(validateCorpus(), reference), null, 2))
  } catch (error) {
    console.error(`Benchmark report failed: ${error.message}`)
    process.exitCode = 1
  }
}
