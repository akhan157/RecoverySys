import { CATEGORIES } from '../../src/data/parts.js'

const positive = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 && number <= 10000 ? number : null
}
const RIGID_CATEGORIES = new Set(['quick_links', 'swivel', 'chute_device'])

// Individual size references only. There is deliberately no combined occupied
// volume, automatic placement, nesting, compression model or fit classification.
export function buildBayGeometry(config = {}, specs = {}, activeCategory) {
  const parts = CATEGORIES.flatMap((category, index) => {
    const part = config[category.id]
    if (!part) return []
    const dimensions = part.specs ?? {}
    const rigid = RIGID_CATEGORIES.has(category.id)
    const length = positive(
      rigid
        ? dimensions.body_length_in
        : (dimensions.packed_length_in ?? dimensions.packed_height_in)
    )
    const width = positive(rigid ? dimensions.body_width_in : dimensions.packed_diam_in)
    const depth = rigid ? positive(dimensions.body_depth_in) : width
    const rangeValues = [
      'packed_length_min_in',
      'packed_length_max_in',
      'packed_diam_min_in',
      'packed_diam_max_in',
    ].map((key) => positive(dimensions[key]))
    const hasRange =
      !rigid &&
      rangeValues.every((value) => value != null) &&
      rangeValues[0] <= rangeValues[1] &&
      rangeValues[2] <= rangeValues[3]
    const range = hasRange
      ? {
          lengthMin: rangeValues[0],
          lengthMax: rangeValues[1],
          widthMin: rangeValues[2],
          widthMax: rangeValues[3],
        }
      : null
    const complete = rigid ? !!(length && width && depth) : !!((length && width) || range)
    return [
      {
        category: category.id,
        name: part.name,
        id: part.id,
        rigid,
        shape: rigid ? 'box' : 'cylinder',
        length: range?.lengthMax ?? length,
        width: range?.widthMax ?? width,
        depth: range?.widthMax ?? depth,
        range,
        invalidRange: !rigid && rangeValues.some((value) => value != null) && !hasRange,
        complete,
        color: [
          '#46b8c9',
          '#b99aef',
          '#e7b65c',
          '#76c999',
          '#e49eac',
          '#91a8dd',
          '#c5c879',
          '#d6a575',
        ][index],
        provenance: part.id?.startsWith('custom-')
          ? 'User-supplied; not independently verified'
          : 'Catalog nominal; unverified',
        missing: rigid
          ? [!length && 'body length', !width && 'body width', !depth && 'body depth'].filter(
              Boolean
            )
          : [!length && 'packed length', !width && 'packed diameter'].filter(Boolean),
      },
    ]
  })
  const diameter = positive(specs.airframe_id_in)
  const length = positive(specs.bay_length_in)
  const selected =
    parts.find((part) => part.category === activeCategory) ??
    (activeCategory == null ? parts[0] : null)
  const reference = selected?.complete ? selected : null
  const separation =
    ((diameter ?? 0) + (reference?.width ?? 0)) / 2 +
    Math.max(diameter ?? 1, reference?.width ?? 1) * 0.6
  return {
    diameter,
    length,
    parts,
    selected,
    reference,
    incomplete: parts.filter((part) => !part.complete),
    separation,
    extent: Math.max(length ?? 0, reference?.length ?? 0, separation * 2, reference?.depth ?? 0, 1),
  }
}
