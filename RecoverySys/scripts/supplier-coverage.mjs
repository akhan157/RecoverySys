import { readFile } from 'node:fs/promises'
import { PARTS } from '../src/data/parts.js'
const root = new URL('../', import.meta.url)
const mappings = JSON.parse(
  await readFile(new URL('src/data/supplierMappings.json', root))
).mappings
const snapshot = JSON.parse(await readFile(new URL('public/supplier-prices.json', root)))
const ids = new Set(mappings.map((mapping) => mapping.partId))
const offered = new Set(snapshot.offers.map((offer) => offer.partId))
const manufacturers = [...new Set(PARTS.map((part) => part.manufacturer))]
  .sort()
  .map((manufacturer) => {
    const parts = [
      ...new Map(
        PARTS.filter((part) => part.manufacturer === manufacturer).map((part) => [part.id, part])
      ).values(),
    ]
    return {
      manufacturer,
      distinctIds: parts.length,
      mapped: parts.filter((part) => ids.has(part.id)).length,
      offered: parts.filter((part) => offered.has(part.id)).length,
      unmapped: parts
        .filter((part) => !ids.has(part.id))
        .map((part) => ({ id: part.id, name: part.name })),
    }
  })
console.log(
  JSON.stringify(
    {
      catalogEntries: PARTS.length,
      distinctCatalogIds: new Set(PARTS.map((part) => part.id)).size,
      mappedIds: ids.size,
      offeredIds: offered.size,
      manufacturers,
    },
    null,
    2
  )
)
