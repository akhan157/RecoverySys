import seaLevel from '../../validation/corpus/isa-density-sea-level.json'
import altitude from '../../validation/corpus/isa-density-5000m.json'
import descent from '../../validation/corpus/terminal-descent-36in-main-sea-level.json'
import reference from '../../validation/independent-review/analytic-2026-10-19.json'
import { airDensity, computeDescentRate } from './simulation.js'

// The independent reference is a versioned review artifact. Evaluate the current
// model at the same inputs so the displayed comparisons cannot silently go stale.
export function getBenchmarkComparisons() {
  const cases = [
    {
      test: seaLevel,
      label: 'Air density at sea level',
      matches: seaLevel.inputs.altitude_m === 0,
      actual: () => airDensity(seaLevel.inputs.altitude_m),
    },
    {
      test: altitude,
      label: 'Air density at 5,000 m',
      matches: altitude.inputs.altitude_m === 5000,
      actual: () => airDensity(altitude.inputs.altitude_m),
    },
    {
      test: descent,
      label: 'Terminal descent at sea level (2.5 kg, 36 in chute, Cd 1.5)',
      matches:
        descent.inputs.mass_kg === 2.5 &&
        descent.inputs.altitude_ft === 0 &&
        descent.inputs.chuteSpecs?.diameter_in === 36 &&
        descent.inputs.chuteSpecs?.cd === 1.5,
      actual: () =>
        computeDescentRate(
          descent.inputs.chuteSpecs,
          descent.inputs.mass_kg,
          descent.inputs.altitude_ft
        ),
    },
  ]
  return cases
    .map(({ test, label, actual, matches }) => {
      if (!matches) return null
      const ref = reference.cases.find((item) => item.case === test.id)
      if (!ref || ref.unit !== test.expected.metrics[0].unit || !Number.isFinite(ref.reference))
        return null
      const observed = actual()
      if (!Number.isFinite(observed)) return null
      return {
        id: test.id,
        label,
        status: test.status,
        unit: ref.unit,
        observed,
        reference: ref.reference,
        difference: observed - ref.reference,
        percent:
          ref.reference === 0 ? null : (100 * (observed - ref.reference)) / Math.abs(ref.reference),
      }
    })
    .filter(Boolean)
}
