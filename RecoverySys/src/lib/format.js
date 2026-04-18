/**
 * Category-aware spec summary for a catalog/custom part.
 * Single source of truth — used by PartsBrowser cards, MissionControl bay
 * schematic, and ConfigSlot rows.
 *
 * variant:
 *   'compact'  — default; minimal: size/strength + weight
 *   'detailed' — ConfigSlot row; adds packed_diam / Cd inline for chutes
 */
export function partSpecLine(part, variant = 'compact') {
  if (!part?.specs) return ''
  const s = part.specs
  switch (part.category) {
    case 'main_chute':
    case 'drogue_chute':
      return variant === 'detailed'
        ? `${s.diameter_in}" Ø  Cd ${s.cd}  packed ${s.packed_diam_in}"  ${s.weight_g}g`
        : `${s.diameter_in}" Ø  Cd ${s.cd}  ${s.weight_g}g`
    case 'chute_protector':
      return `${s.size_in}" fits ≤${s.max_chute_diam_in}" chute  ${s.weight_g}g`
    case 'flight_computer':
      return `${s.min_voltage}–${s.max_voltage}V  ${s.weight_g}g`
    case 'battery':
      return `${s.voltage}V  ${s.capacity_mah}mAh  ${s.weight_g}g`
    case 'shock_cord':
      return `${s.strength_lbs} lbs  ${s.length_ft}ft  ${s.weight_g}g`
    case 'quick_links':
      return `${s.strength_lbs} lbs  ${s.size_in}" size  ${s.weight_g}g`
    case 'deployment_bag':
      return `fits ≤${s.max_chute_diam_in}" chute  ${s.packed_height_in}" packed  ${s.weight_g}g`
    case 'swivel':
      return `${s.rated_lbs} lbs WLL  ${s.size_in}" size  ${s.weight_g}g`
    case 'chute_device': {
      const altRange = s.deploy_alt_min_ft != null
        ? `  ${s.deploy_alt_min_ft}–${s.deploy_alt_max_ft}ft`
        : ''
      return `${s.weight_g}g${altRange}`
    }
    default:
      return ''
  }
}
