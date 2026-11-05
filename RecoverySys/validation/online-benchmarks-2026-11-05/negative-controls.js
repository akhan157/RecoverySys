/**
 * Negative Controls Test Suite for Online Physics Benchmarks (2026-11-05).
 *
 * Genuinely exercises the adapter and comparison paths with mutated/corrupted inputs:
 *   1. alteredreferencevalue: altered expected value is detected as comparison failure
 *   2. wrongunit: unit discrepancy (feet passed instead of meters) causes failure
 *   3. reversedwind: reversed wind direction (0 deg vs 180 deg) produces inverted bearing
 *   4. wrongdragcoefficient: incorrect drag coefficient causes descent velocity failure
 *   5. malformed/nonfinite data: NaN, negative mass, null wind direction, zero elongation
 *
 * Each negative control asserts that the falsifying condition produces pass === false
 * from the actual comparison function, verifying comparison integrity.
 */

import {
  compareMetric,
  evaluateAtmosphere,
  evaluateTerminalDescent,
  evaluateDrift,
  evaluateSnatch,
} from './adapter.js'

export function runNegativeControls(referenceData) {
  const results = []

  // Control 1: Altered reference value
  {
    const expectedAtmosphere = referenceData.references['isa-troposphere-analytic-2500m']
    const observed = evaluateAtmosphere({ altitude_m: 2500.0 })
    const corruptedExpectedP = 80000.0 // True is ~74682.53 Pa
    const cmp = compareMetric(
      observed.metrics.pressure_Pa,
      corruptedExpectedP,
      expectedAtmosphere.metrics.pressure_Pa.tolerance
    )

    const detected = cmp.pass === false && cmp.difference > 0.05
    results.push({
      id: 'NC1_alteredreferencevalue',
      name: 'Altered Reference Value Detection',
      mutation: 'Corrupted expected pressure to 80000.0 Pa (expected ~74682.53 Pa)',
      observed: cmp.observed,
      expected: cmp.expected,
      difference: cmp.difference,
      threshold: cmp.threshold,
      comparisonPass: cmp.pass,
      detected,
      verdict: detected ? 'PASS' : 'FAIL',
    })
  }

  // Control 2: Wrong unit (Altitude in feet instead of meters)
  {
    // Passing 2500 ft (762 m) instead of 2500 m
    const observedFeet = evaluateAtmosphere({ altitude_m: 2500.0 / 3.28084 })
    const expectedTempK = 271.9 // At 2500 m
    const cmp = compareMetric(observedFeet.metrics.temperature_K, expectedTempK, {
      absolute: 0.01,
      basis: 'source-stated',
    })

    const detected = cmp.pass === false && cmp.difference > 5.0
    results.push({
      id: 'NC2_wrongunit',
      name: 'Unit Discrepancy Detection (Feet vs Meters)',
      mutation: 'Passed 2500 ft (~762 m) instead of 2500 m to atmospheric model',
      observed: cmp.observed,
      expected: cmp.expected,
      difference: cmp.difference,
      threshold: cmp.threshold,
      comparisonPass: cmp.pass,
      detected,
      verdict: detected ? 'PASS' : 'FAIL',
    })
  }

  // Control 3: Reversed wind (0 deg North instead of 180 deg South)
  {
    const reversedWindInputs = {
      simulation: {
        apogee_ft: 3000.0,
        deploy_ft: 500.0,
        drogue_fps: 60.0,
        main_fps: 20.0,
      },
      specs: {
        wind_speed_mph: 15.0,
        wind_direction_deg: 0.0, // FROM North instead of 180 (FROM South)
        wind_surface_alt_ft: 0,
      },
    }
    const observedReversed = evaluateDrift(reversedWindInputs)
    const expectedBearing = 0.0 // Expected True North under South wind
    const cmp = compareMetric(observedReversed.metrics.bearing_deg, expectedBearing, {
      absolute: 0.1,
      basis: 'source-stated',
    })

    const detected = cmp.pass === false && Math.abs(cmp.difference - 180.0) < 0.01
    results.push({
      id: 'NC3_reversedwind',
      name: 'Reversed Wind Direction Detection',
      mutation: 'Wind direction inverted: 0 deg (from North) instead of 180 deg (from South)',
      observed: cmp.observed,
      expected: cmp.expected,
      difference: cmp.difference,
      threshold: cmp.threshold,
      comparisonPass: cmp.pass,
      detected,
      verdict: detected ? 'PASS' : 'FAIL',
    })
  }

  // Control 4: Wrong drag coefficient (Cd = 1.5 instead of 0.8)
  {
    const wrongCdInputs = {
      chuteSpecs: {
        diameter_in: 48.0,
        cd: 1.5, // 1.5 instead of 0.8
      },
      mass_kg: 5.0,
      altitude_ft: 0,
    }
    const observedWrongCd = evaluateTerminalDescent(wrongCdInputs)
    const expectedDescentFps = 30.374731
    const cmp = compareMetric(observedWrongCd.metrics.descent_rate_fps, expectedDescentFps, {
      relative: 0.0001,
      basis: 'analyst-derived',
    })

    const detected = cmp.pass === false && cmp.difference > 0.2
    results.push({
      id: 'NC4_wrongdragcoefficient',
      name: 'Corrupted Drag Coefficient Detection',
      mutation: 'Parachute Cd set to 1.5 instead of nominal 0.8',
      observed: cmp.observed,
      expected: cmp.expected,
      difference: cmp.difference,
      threshold: cmp.threshold,
      comparisonPass: cmp.pass,
      detected,
      verdict: detected ? 'PASS' : 'FAIL',
    })
  }

  // Control 5: Malformed and non-finite data detection
  {
    const subtests = [
      {
        subId: 'NC5a_nan_altitude',
        desc: 'NaN altitude in atmosphere',
        run: () => evaluateAtmosphere({ altitude_m: NaN }),
        expectedPass: false,
      },
      {
        subId: 'NC5b_negative_mass',
        desc: 'Negative mass in descent rate',
        run: () => evaluateTerminalDescent({ chuteSpecs: { diameter_in: 48, cd: 0.8 }, mass_kg: -5 }),
        expectedPass: false,
      },
      {
        subId: 'NC5c_null_wind_dir',
        desc: 'Positive wind with null direction',
        run: () =>
          evaluateDrift({
            simulation: { apogee_ft: 3000, deploy_ft: 500, drogue_fps: 60, main_fps: 20 },
            specs: { wind_speed_mph: 15, wind_direction_deg: null },
          }),
        expectedPass: false,
      },
      {
        subId: 'NC5d_missing_cord_specs',
        desc: 'Null cord specs in snatch load',
        run: () =>
          evaluateSnatch({
            config: { main_chute: {}, drogue_chute: {}, shock_cord: null },
            mass_kg: 6,
            deploy_alt_ft: 800,
            approach_velocity_fps: 65,
          }),
        expectedPass: false,
      },
      {
        subId: 'NC5e_zero_elongation',
        desc: 'Zero elongation percentage in cord',
        run: () =>
          evaluateSnatch({
            config: {
              main_chute: { specs: { diameter_in: 60 } },
              drogue_chute: { specs: { diameter_in: 18 } },
              shock_cord: { specs: { strength_lbs: 1500, length_ft: 20, elongation_pct: 0 } },
            },
            mass_kg: 6,
            deploy_alt_ft: 800,
            approach_velocity_fps: 65,
          }),
        expectedPass: false,
      },
    ]

    let allDetected = true
    const subtestOutcomes = []
    for (const sub of subtests) {
      const outcome = sub.run()
      const isHandled = outcome.status === 'error' || outcome.status === 'unavailable'
      if (!isHandled) allDetected = false
      subtestOutcomes.push({
        subId: sub.subId,
        desc: sub.desc,
        status: outcome.status,
        reason: outcome.reason,
        properlyRejected: isHandled,
      })
    }

    results.push({
      id: 'NC5_malformed_nonfinite_data',
      name: 'Malformed and Non-Finite Data Detection',
      mutation: 'Suite of 5 invalid/non-finite edge cases (NaN altitude, -5kg mass, null wind dir, missing cord, 0% elongation)',
      subtests: subtestOutcomes,
      detected: allDetected,
      verdict: allDetected ? 'PASS' : 'FAIL',
    })
  }

  const allPassed = results.every((r) => r.detected === true)
  return {
    total: results.length,
    detectedCount: results.filter((r) => r.detected === true).length,
    allDetected: allPassed,
    verdict: allPassed ? 'PASS' : 'FAIL',
    controls: results,
  }
}
