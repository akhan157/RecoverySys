import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import { PARTS, CATEGORIES } from '../src/data/parts.js'
import {
  MANUFACTURER_PROVENANCE,
  provenanceForPart,
  validateCatalogProvenance,
} from '../src/data/catalogProvenance.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const PARTS_SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'parts-schema.json'), 'utf8'))

function locationFor(error) {
  const match = error.instancePath.match(/^\/(\d+)(.*)$/)
  if (!match) return { index: null, path: error.instancePath || '/' }
  return { index: Number(match[1]), path: match[2] || '/' }
}

export function formatDiagnostic({ index, part, path: errorPath, reason }) {
  const id = part?.id ?? '<missing-id>'
  const category = part?.category ?? '<missing-category>'
  return `part[${index ?? '?'}] id=${id} category=${category} path=${errorPath} ${reason}`
}

export function validateCatalog(parts, categories = CATEGORIES, schema = PARTS_SCHEMA) {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const diagnostics = []
  const records = Array.isArray(parts) ? parts : []
  validate(parts)
  for (const error of validate.errors || []) {
    const { index, path: errorPath } = locationFor(error)
    const detailPath = error.keyword === 'required'
      ? `${errorPath === '/' ? '' : errorPath}/${error.params.missingProperty}`
      : errorPath
    diagnostics.push(formatDiagnostic({
      index,
      part: records[index],
      path: detailPath,
      reason: error.message,
    }))
  }

  const seen = new Map()
  records.forEach((part, index) => {
    if (!part || typeof part !== 'object') return
    const key = `${part.category}:${part.id}`
    if (seen.has(key)) {
      diagnostics.push(formatDiagnostic({
        index,
        part,
        path: '/id',
        reason: `duplicate composite key (already used by part[${seen.get(key)}])`,
      }))
    } else if (part.category != null && part.id != null) seen.set(key, index)

    const min = part.specs?.deploy_alt_min_ft
    const max = part.specs?.deploy_alt_max_ft
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      diagnostics.push(formatDiagnostic({
        index,
        part,
        path: '/specs/deploy_alt_min_ft',
        reason: 'deployment altitude minimum must be less than or equal to maximum',
      }))
    }
    const provenance = provenanceForPart(part)
    if (!provenance) {
      diagnostics.push(formatDiagnostic({
        index,
        part,
        path: '/manufacturer',
        reason: 'has no catalog provenance record',
      }))
    } else if (!['verified', 'unverified'].includes(provenance.status)) {
      diagnostics.push(formatDiagnostic({
        index,
        part,
        path: '/manufacturer',
        reason: 'has an invalid catalog provenance status',
      }))
    }
  })

  const covered = new Set(records.map((part) => part?.category))
  for (const category of categories) {
    const id = typeof category === 'string' ? category : category.id
    if (!covered.has(id)) {
      diagnostics.push(`catalog category=${id} path=/ reason=slot has no parts`)
    }
  }
  return { valid: diagnostics.length === 0, diagnostics }
}

export function validateParts(
  parts = PARTS,
  categories = CATEGORIES,
  provenanceRegistry = MANUFACTURER_PROVENANCE
) {
  // V2-07: provenance shape is part of the catalog gate. validateCatalog stays
  // a pure parts-shape check; provenance record shape is validated separately
  // and its diagnostics are appended so the CLI reports both in one run.
  const catalog = validateCatalog(parts, categories)
  const provenance = validateCatalogProvenance(provenanceRegistry)
  return {
    valid: catalog.valid && provenance.valid,
    diagnostics: [...catalog.diagnostics, ...provenance.diagnostics],
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateParts()
  if (result.valid) {
    console.log(`parts catalog valid (${PARTS.length} parts)`)
  } else {
    console.error(result.diagnostics.join('\n'))
    process.exitCode = 1
  }
}
