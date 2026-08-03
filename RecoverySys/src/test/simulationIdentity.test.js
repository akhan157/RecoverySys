import { describe, expect, it } from 'vitest'
import {
  canonicalSimulationInput,
  captureSimulationProvenance,
  isSimulationStale,
  simulationInputKey,
  simulationStatus,
} from '../lib/simulationIdentity.js'
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_METHOD,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
  SIMULATION_SCHEMA_VERSION,
  VERSION,
} from '../lib/constants.js'

const input = {
  specs: { rocket_mass_g: 1200, launch_angle_deg: 84 },
  config: { main_chute: { id: 'main-1' }, drogue: null },
  customMotor: { designation: 'M123', totalImpulseNs: 1250 },
}

describe('simulation identity', () => {
  it('canonicalizes object keys recursively', () => {
    expect(
      canonicalSimulationInput({
        customMotor: input.customMotor,
        config: { drogue: null, main_chute: { id: 'main-1' } },
        specs: { launch_angle_deg: 84, rocket_mass_g: 1200 },
      })
    ).toBe(canonicalSimulationInput(input))
    expect(simulationInputKey(input)).toMatch(/^sim-[0-9a-f]{8}$/)
  })

  it('captures complete deterministic provenance', () => {
    const generatedAt = '2026-08-02T00:00:00.000Z'
    const provenance = captureSimulationProvenance(input, generatedAt)

    expect(provenance).toEqual({
      inputKey: simulationInputKey(input),
      revision: simulationInputKey(input),
      modelId: SIMULATION_MODEL_ID,
      modelVersion: SIMULATION_MODEL_VERSION,
      assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      appVersion: VERSION,
      method: SIMULATION_METHOD,
      generatedAt,
    })
  })

  it('marks a matching run current and a changed input stale', () => {
    const run = { provenance: captureSimulationProvenance(input, 'fixed-time') }

    expect(simulationStatus(run, input)).toEqual({ current: true, stale: false })
    expect(
      isSimulationStale(run, { ...input, specs: { ...input.specs, rocket_mass_g: 1201 } })
    ).toBe(true)
  })

  it.each([
    ['model', 'modelVersion'],
    ['assumptions', 'assumptionsVersion'],
    ['schema', 'schemaVersion'],
  ])('invalidates a run when its %s provenance changes', (_label, field) => {
    const provenance = captureSimulationProvenance(input, 'fixed-time')
    const run = { provenance: { ...provenance, [field]: `${provenance[field]}-changed` } }

    expect(isSimulationStale(run, input)).toBe(true)
  })

  it('marks legacy and incomplete provenance stale', () => {
    expect(isSimulationStale({}, input)).toBe(true)
    expect(isSimulationStale({ provenance: { inputKey: simulationInputKey(input) } }, input)).toBe(
      true
    )
  })
})
