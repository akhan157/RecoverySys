import { RESULT_STATUS_DETAILS, currentResultOrNull } from './assessment.js'
import { evaluateConfidence } from './confidence.js'
import { EVIDENCE_LEVEL } from './evidenceCoverage.js'
import { evaluateMissionEnvelope } from './missionEnvelope.js'
import { runSensitivity } from './sensitivity.js'

export const RECOVERY_BRIEF_VERSION = 'recovery-brief-v1'

const LABELS = {
  supported: 'Supported',
  conditional: 'Conditional',
  'sensitivity-flagged': 'Sensitivity flagged',
  'insufficient-confidence': 'Insufficient confidence',
}

export function buildRecoveryBrief({
  specs = {},
  config = {},
  customMotor = null,
  simulation = null,
  resultFresh = false,
  warnings = [],
  sensitivity = undefined,
} = {}) {
  const status = !simulation ? 'not-run' : resultFresh ? 'current' : 'stale'
  const resultDetails = RESULT_STATUS_DETAILS[status]
  const usableSimulation = currentResultOrNull(simulation, status === 'current')
  const envelope = evaluateMissionEnvelope({ specs, config, customMotor })
  // The checked-in corpus contains review-only analytic cases and no accepted
  // comparison or flight evidence. Keep the brief conservative until that changes.
  const coverage = { level: EVIDENCE_LEVEL.UNCOVERED, caseIds: [], hasReviewOnlyEvidence: true }
  const confidence = evaluateConfidence({
    fresh: Boolean(simulation && resultFresh),
    envelope,
    coverage,
  })
  const selectedHardware = Object.entries(config)
    .filter(([, part]) => part)
    .map(([slot, part]) => ({ slot, name: part.name, specification: part.specs ?? {} }))
  const unresolvedChecks = [
    ...envelope.reasons.map((reason) => ({
      type: 'mission-envelope',
      code: reason.code,
      message: reason.message,
      remediation: reason.remediation,
      path: reason.path,
    })),
    ...warnings.map((warning) => ({
      type: 'compatibility',
      code: warning.code ?? 'COMPATIBILITY_WARNING',
      message: warning.message,
      level: warning.level,
      path: warning.slot ? `config.${warning.slot}` : null,
    })),
  ]
  if (!simulation) {
    unresolvedChecks.push({
      type: 'result',
      code: resultDetails.reasonCode,
      message: resultDetails.remediation,
      remediation: resultDetails.nextAction,
    })
  } else if (status === 'stale') {
    unresolvedChecks.push({
      type: 'result',
      code: resultDetails.reasonCode,
      message: resultDetails.reason,
      remediation: resultDetails.remediation,
    })
  }

  return {
    briefVersion: RECOVERY_BRIEF_VERSION,
    generatedAt: new Date().toISOString(),
    status,
    missionEnvelope: {
      status: envelope.status,
      reasons: envelope.reasons,
      assumptionsVersion: envelope.assumptionsVersion,
    },
    confidence: {
      state: confidence.state,
      label: LABELS[confidence.state],
      reasons: confidence.reasons,
      evidenceCaseIds: confidence.evidenceCaseIds,
      evidenceLevel: coverage.level,
      evidenceNote: 'No accepted comparison or flight evidence is available in the current corpus.',
    },
    selectedHardware,
    warnings,
    keyEstimates: usableSimulation
      ? {
          apogee_ft: usableSimulation.apogee_ft,
          drift_ft: usableSimulation.drift_ft,
          drogue_fps: usableSimulation.drogue_fps,
          main_fps: usableSimulation.main_fps,
          landing_ke_ftlbf: usableSimulation.landing_ke_ftlbf,
        }
      : null,
    sensitivity:
      sensitivity === false
        ? null
        : (sensitivity ?? runSensitivity({ specs, config, customMotor })),
    unresolvedChecks,
    provenance: simulation?.provenance ?? null,
    authorization:
      'This brief is a recovery planning aid. It does not authorize launch or replace engineering, manufacturer, certification, or range review.',
  }
}
