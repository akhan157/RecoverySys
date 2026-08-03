import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
} from '../../../lib/constants.js'

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const source = Object.freeze({
  title: 'U.S. Standard Atmosphere, 1976 / NASA Glenn Beginner’s Guide to Aerodynamics',
  url: 'https://www.grc.nasa.gov/www/k-12/airplane/atmosmet.html',
  accessDate: '2026-07-21',
})

// Analytic regression data only. These cases are not real-flight validation,
// flight-test evidence, or a claim of agreement with a complete vehicle model.
export const PHASE2_CASES = deepFreeze([
  Object.freeze({
    id: 'isa-density-sea-level',
    kind: 'analytic',
    validationType: 'analytic_regression',
    source,
    modelId: SIMULATION_MODEL_ID,
    modelVersion: SIMULATION_MODEL_VERSION,
    assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
    inputs: { altitude_m: 0 },
    expected: { value: 1.2249781262, unit: 'kg/m^3', tolerance: 1e-9 },
    assumptions: ['ISA troposphere at sea level', 'dry air and standard gravity'],
    notes:
      'Expected value is independently evaluated from ISA P/(R*T). Not real-flight validation.',
  }),
  Object.freeze({
    id: 'isa-density-5000m',
    kind: 'analytic',
    validationType: 'analytic_regression',
    source,
    modelId: SIMULATION_MODEL_ID,
    modelVersion: SIMULATION_MODEL_VERSION,
    assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
    inputs: { altitude_m: 5000 },
    expected: { value: 0.736100614, unit: 'kg/m^3', tolerance: 1e-9 },
    assumptions: ['ISA troposphere lapse rate applies through 5000 m', 'dry air'],
    notes:
      'Expected value is independently evaluated from ISA P/(R*T). Not real-flight validation.',
  }),
  Object.freeze({
    id: 'terminal-descent-36in-main-sea-level',
    kind: 'analytic',
    validationType: 'analytic_regression',
    source,
    modelId: SIMULATION_MODEL_ID,
    modelVersion: SIMULATION_MODEL_VERSION,
    assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
    inputs: { chuteSpecs: { diameter_in: 36, cd: 1.5 }, mass_kg: 2.5, altitude_ft: 0 },
    expected: { value: 20.9141123491, unit: 'ft/s', tolerance: 1e-9 },
    assumptions: ['steady terminal descent', 'flat circular projected area', 'constant Cd'],
    notes:
      'Expected value is independently evaluated from sqrt(2*m*g/(rho*Cd*A)). Not real-flight validation.',
  }),
  Object.freeze({
    id: 'layered-wind-linear-interpolation-drift',
    kind: 'analytic',
    validationType: 'analytic_regression',
    source: Object.freeze({
      title: 'NOAA National Weather Service, Wind: direction convention',
      url: 'https://www.weather.gov/jetstream/wind',
      accessDate: '2026-07-21',
    }),
    modelId: SIMULATION_MODEL_ID,
    modelVersion: SIMULATION_MODEL_VERSION,
    assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
    inputs: {
      simulation: { apogee_ft: 1000, deploy_ft: 0, drogue_fps: 10 },
      specs: {
        wind_speed_mph: '1',
        wind_direction_deg: '0',
        wind_surface_alt_ft: '0',
        wind_mid_speed_mph: '21',
        wind_mid_direction_deg: '0',
        wind_mid_alt_ft: '1000',
      },
    },
    // computeDrift is a presentation-oriented API and rounds distance to whole
    // feet. The analytic reference is 1613.333... ft, which the API reports as
    // 1613 ft.
    expected: { value: 1613, unit: 'ft', tolerance: 0 },
    assumptions: [
      'linear speed interpolation between layers',
      'wind direction is FROM north; drift is TOWARD south',
      'instant wind coupling',
    ],
    notes:
      'The linear profile averages 11 mph over 1000 ft at 10 ft/s: 11*(5280/3600)*100 = 1613.333... ft; computeDrift rounds to 1613 ft. Not real-flight validation.',
  }),
])
