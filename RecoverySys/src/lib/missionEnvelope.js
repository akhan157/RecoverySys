import { parseSpec } from './schema.js'

export const ENVELOPE_STATUS = Object.freeze({
  IN_SCOPE: 'in-scope',
  CONDITIONAL: 'conditional',
  OUT_OF_SCOPE: 'out-of-scope',
})

const definition = (code, status, path, message, remediation) => ({
  code,
  status,
  path,
  message,
  remediation,
})

const definitions = Object.freeze({
  MISSING_MASS: definition(
    'MISSING_MASS',
    ENVELOPE_STATUS.OUT_OF_SCOPE,
    'specs.rocket_mass_g',
    'Rocket mass is required before the recovery estimate can be interpreted.',
    'Enter the loaded rocket mass.'
  ),
  MISSING_MOTOR_IMPULSE: definition(
    'MISSING_MOTOR_IMPULSE',
    ENVELOPE_STATUS.OUT_OF_SCOPE,
    'specs.motor_total_impulse_ns',
    'Motor total impulse is required before the recovery estimate can be interpreted.',
    'Enter a motor total impulse or import a supported motor curve.'
  ),
  INVALID_WIND_DIRECTION: definition(
    'INVALID_WIND_DIRECTION',
    ENVELOPE_STATUS.OUT_OF_SCOPE,
    'specs.wind_direction_deg',
    'A positive wind speed needs a wind direction for a usable drift estimate.',
    'Enter the meteorological wind direction for each populated wind layer.'
  ),
  HEURISTIC_ASCENT: definition(
    'HEURISTIC_ASCENT',
    ENVELOPE_STATUS.CONDITIONAL,
    'specs.burn_time_s',
    'Apogee uses the scalar impulse heuristic because burn time is unavailable.',
    'Enter burn time or import a supported motor curve before relying on apogee.'
  ),
  DEFAULT_AIRFRAME: definition(
    'DEFAULT_AIRFRAME',
    ENVELOPE_STATUS.CONDITIONAL,
    'specs.airframe_id_in',
    'Ascent uses the default airframe area because airframe ID is unavailable.',
    'Enter the recovery-bay inner diameter.'
  ),
  DEFAULT_DRAG: definition(
    'DEFAULT_DRAG',
    ENVELOPE_STATUS.CONDITIONAL,
    'specs.drag_cd',
    'Ascent uses a generic drag coefficient because no drag coefficient was entered.',
    'Enter a justified subsonic drag coefficient.'
  ),
  NO_MAIN_CHUTE: definition(
    'NO_MAIN_CHUTE',
    ENVELOPE_STATUS.CONDITIONAL,
    'config.main_chute',
    'No main chute is selected; descent and landing outputs use the drogue-only path.',
    'Select a main chute or explicitly review the drogue-only deployment plan.'
  ),
  NO_DROGUE_CHUTE: definition(
    'NO_DROGUE_CHUTE',
    ENVELOPE_STATUS.CONDITIONAL,
    'config.drogue_chute',
    'No drogue chute is selected; the model uses its documented fallback descent rate.',
    'Select a drogue chute or independently review the single-deploy plan.'
  ),
  NO_WIND_PROFILE: definition(
    'NO_WIND_PROFILE',
    ENVELOPE_STATUS.CONDITIONAL,
    'specs.wind_speed_mph',
    'No populated wind profile is available, so drift is not evidence-backed.',
    'Enter a measured wind profile before interpreting landing drift.'
  ),
})

function populatedWindNeedsDirection(specs, speedKey, directionKey, altitudeKey = null) {
  const speed = parseSpec(speedKey, specs?.[speedKey]) ?? 0
  const altitude = altitudeKey ? (parseSpec(altitudeKey, specs?.[altitudeKey]) ?? 0) : 1
  return speed > 0 && altitude > 0 && parseSpec(directionKey, specs?.[directionKey]) == null
}

function hasWindProfile(specs) {
  return (
    (parseSpec('wind_speed_mph', specs?.wind_speed_mph) ?? 0) > 0 ||
    (parseSpec('wind_mid_speed_mph', specs?.wind_mid_speed_mph) ?? 0) > 0 ||
    (parseSpec('wind_aloft_speed_mph', specs?.wind_aloft_speed_mph) ?? 0) > 0
  )
}

export function evaluateMissionEnvelope({ specs = {}, config = {}, customMotor = null } = {}) {
  const reasons = []
  const mass = parseSpec('rocket_mass_g', specs.rocket_mass_g)
  const impulse = parseSpec('motor_total_impulse_ns', specs.motor_total_impulse_ns)
  const burn = parseSpec('burn_time_s', specs.burn_time_s)
  const airframe = parseSpec('airframe_id_in', specs.airframe_id_in)
  const drag = parseSpec('drag_cd', specs.drag_cd)

  if (mass == null) reasons.push(definitions.MISSING_MASS)
  if (impulse == null) reasons.push(definitions.MISSING_MOTOR_IMPULSE)
  if (
    populatedWindNeedsDirection(specs, 'wind_speed_mph', 'wind_direction_deg') ||
    populatedWindNeedsDirection(
      specs,
      'wind_mid_speed_mph',
      'wind_mid_direction_deg',
      'wind_mid_alt_ft'
    ) ||
    populatedWindNeedsDirection(
      specs,
      'wind_aloft_speed_mph',
      'wind_aloft_direction_deg',
      'wind_aloft_alt_ft'
    )
  )
    reasons.push(definitions.INVALID_WIND_DIRECTION)
  if (!customMotor?.curve && burn == null) reasons.push(definitions.HEURISTIC_ASCENT)
  if (airframe == null) reasons.push(definitions.DEFAULT_AIRFRAME)
  if (drag == null) reasons.push(definitions.DEFAULT_DRAG)
  if (!config.main_chute) reasons.push(definitions.NO_MAIN_CHUTE)
  if (!config.drogue_chute) reasons.push(definitions.NO_DROGUE_CHUTE)
  if (!hasWindProfile(specs)) reasons.push(definitions.NO_WIND_PROFILE)

  const status = reasons.some(({ status }) => status === ENVELOPE_STATUS.OUT_OF_SCOPE)
    ? ENVELOPE_STATUS.OUT_OF_SCOPE
    : reasons.length > 0
      ? ENVELOPE_STATUS.CONDITIONAL
      : ENVELOPE_STATUS.IN_SCOPE
  return { status, reasons, assumptionsVersion: 'mission-envelope-v1' }
}
