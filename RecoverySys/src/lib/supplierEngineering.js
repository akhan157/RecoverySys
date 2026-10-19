// Narrow primary-source extraction. Ambiguous ranges and implicit assumptions
// are omitted, not collapsed into invented engineering constants.
export function extractFruityEngineering(html) {
  const text = String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
  const specs = {}
  const sourceUnits = {}
  const packing = /Packing Volume:\s*([\d.]+)\s*"\s*D\s*[x×]\s*([\d.]+)\s*"\s*L/i.exec(text)
  if (packing) {
    specs.packed_diam_in = Number(packing[1])
    specs.packed_length_in = Number(packing[2])
    sourceUnits.packed_dimensions = 'in'
  }
  const weightGrams = /Weight:\s*[^;:]{0,45}?\(?([\d.]+)\s*grams?\)?/i.exec(text)
  const weightOunces = /Weight:\s*([\d.]+)\s*oz\b/i.exec(text)
  if (weightGrams) {
    specs.weight_g = Number(weightGrams[1])
    sourceUnits.weight = 'g'
  } else if (weightOunces) {
    specs.weight_g = Number(weightOunces[1]) * 28.349523125
    sourceUnits.weight = 'oz; 28.349523125 g/oz'
  }
  const cd = /\bCd\s+of\s+([\d.]+)/i.exec(text)
  if (cd) specs.cd = Number(cd[1])
  for (const [field, value] of Object.entries(specs))
    if (!Number.isFinite(value) || value <= 0) delete specs[field]
  return {
    specs,
    sourceUnits,
    packingAssumptions: /packing density of\s+([\d.]+)\s*oz\/cu/i.test(text)
      ? 'Manufacturer packed dimensions assume a specified packing density; traditional folding may occupy a different volume.'
      : packing
        ? 'Manufacturer nominal packed dimensions; physical folding and fit are not verified.'
        : null,
  }
}
