import { VERSION } from './constants.js'

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
    .join(',')}}`
}

export function fingerprintInputs({ specs, config, customMotor }) {
  return stable({ specs, config, customMotor: customMotor ?? null })
}

export function buildResultEnvelope(result, inputs, inputRevision) {
  if (!result) return null
  return {
    ...result,
    provenance: {
      inputFingerprint: fingerprintInputs(inputs),
      inputRevision,
      modelVersion: VERSION,
    },
  }
}

export function isResultFresh(result, inputs, inputRevision) {
  return Boolean(
    result?.provenance &&
    result.provenance.inputRevision === inputRevision &&
    result.provenance.inputFingerprint === fingerprintInputs(inputs) &&
    result.provenance.modelVersion === VERSION
  )
}

export function resultView(result, inputs, inputRevision) {
  return result
    ? { result, fresh: isResultFresh(result, inputs, inputRevision) }
    : { result: null, fresh: false }
}
