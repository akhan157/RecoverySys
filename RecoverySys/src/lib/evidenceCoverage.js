export const EVIDENCE_LEVEL = Object.freeze({
  UNCOVERED: 'E0',
  INVARIANT: 'E1',
  ANALYTIC: 'E2',
  SIMULATOR: 'E3',
  TEST: 'E4',
  FLIGHT: 'E5',
})

const rank = Object.freeze({
  [EVIDENCE_LEVEL.UNCOVERED]: 0,
  [EVIDENCE_LEVEL.INVARIANT]: 1,
  [EVIDENCE_LEVEL.ANALYTIC]: 2,
  [EVIDENCE_LEVEL.SIMULATOR]: 3,
  [EVIDENCE_LEVEL.TEST]: 4,
  [EVIDENCE_LEVEL.FLIGHT]: 5,
})

const levelForKind = Object.freeze({
  metamorphic: EVIDENCE_LEVEL.INVARIANT,
  analytic: EVIDENCE_LEVEL.ANALYTIC,
  'trusted-simulator': EVIDENCE_LEVEL.SIMULATOR,
  'real-flight': EVIDENCE_LEVEL.FLIGHT,
})

export function evidenceCoverage(cases = [], domain) {
  const applicable = cases.filter(
    (testCase) =>
      testCase?.domain === domain && ['review', 'accepted-for-comparison'].includes(testCase.status)
  )
  const accepted = applicable.filter(({ status }) => status === 'accepted-for-comparison')
  const strongest = accepted.reduce((level, testCase) => {
    const candidate = levelForKind[testCase.kind] ?? EVIDENCE_LEVEL.UNCOVERED
    return rank[candidate] > rank[level] ? candidate : level
  }, EVIDENCE_LEVEL.UNCOVERED)

  return {
    domain,
    level: strongest,
    caseIds: applicable.map(({ id }) => id),
    acceptedCaseIds: accepted.map(({ id }) => id),
    hasReviewOnlyEvidence: applicable.length > accepted.length,
  }
}

export function evidenceIsSupported(coverage) {
  return rank[coverage?.level] >= rank[EVIDENCE_LEVEL.ANALYTIC]
}
