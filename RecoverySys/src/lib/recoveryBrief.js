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
      code: 'RESULT_MISSING',
      message: 'Run a simulation before interpreting derived recovery estimates.',
    })
  } else if (!resultFresh) {
    unresolvedChecks.push({
      type: 'result',
      code: 'RESULT_STALE',
      message: 'The printed estimates are stale because inputs or selected hardware changed.',
      remediation: 'Rerun the simulation before using current results.',
    })
  }

  return {
    briefVersion: RECOVERY_BRIEF_VERSION,
    generatedAt: new Date().toISOString(),
    status: simulation && resultFresh ? 'current' : simulation ? 'stale' : 'not-run',
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
    keyEstimates: simulation
      ? {
          apogee_ft: simulation.apogee_ft,
          drift_ft: simulation.drift_ft,
          drogue_fps: simulation.drogue_fps,
          main_fps: simulation.main_fps,
          landing_ke_ftlbf: simulation.landing_ke_ftlbf,
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
