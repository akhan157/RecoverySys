import { readFileSync } from 'node:fs'
import { cwd } from 'node:process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { parseOpenRocketArchive } from '../lib/openRocketExchange.js'

const fixtureRoot = resolve(cwd(), 'src/test/fixtures/openrocket')
function fixture(name) {
  return readFileSync(`${fixtureRoot}/${name}`)
}

describe('OpenRocket exchange parser', () => {
  it('extracts source identity, stages, and geometry candidates from a 1.10 archive', () => {
    const exchange = parseOpenRocketArchive(fixture('simple-model-1.10.ork'), {
      sourceFilename: 'simple-model.ork',
    })

    expect(exchange.contractVersion).toBe(1)
    expect(exchange.source).toMatchObject({
      sourceFilename: 'simple-model.ork',
      sourceTool: 'OpenRocket',
      formatVersion: '1.10',
    })
    expect(exchange.project.name).toBe('A simple model rocket')
    expect(exchange.project.stages).toHaveLength(1)
    expect(exchange.project.selectedConfiguration).toBeNull()
    expect(exchange.project.selectedStage).toBeNull()
    expect(
      exchange.vehicleCandidates.some((candidate) => candidate.targetField === 'airframe_id_in')
    ).toBe(true)
    expect(exchange.vehicleCandidates.every((candidate) => candidate.status !== 'mapped')).toBe(
      true
    )
    const stagePath = exchange.project.stages[0].sourcePath
    expect(
      exchange.vehicleCandidates
        .filter((candidate) => candidate.tube?.stage)
        .every((candidate) => candidate.tube.stage.sourcePath === stagePath)
    ).toBe(true)
  })

  it('keeps saved results as external references and exposes pre-launch mass candidates', () => {
    const exchange = parseOpenRocketArchive(fixture('simulation-extensions-1.10.ork'))

    expect(exchange.externalResults.length).toBeGreaterThan(0)
    expect(exchange.externalResults[0]).toMatchObject({
      status: 'external-reference',
      typedFlightData: { branchCount: expect.any(Number) },
    })
    expect(exchange.externalResults.some((result) => result.events.length > 0)).toBe(true)
    expect(exchange.massCandidates.length).toBeGreaterThan(0)
    expect(exchange.massCandidates[0]).toMatchObject({
      targetField: 'rocket_mass_g',
      sourceUnit: 'kg',
      normalizedUnit: 'g',
      status: 'needs-confirmation',
    })
    expect(exchange.motorContext.length).toBeGreaterThan(0)
  })

  it('supports the generated 1.11 archive without treating it as a new authority', () => {
    const exchange = parseOpenRocketArchive(fixture('simulation-extensions-1.11.ork'))

    expect(exchange.source.formatVersion).toBe('1.11')
    expect(exchange.externalResults.length).toBeGreaterThan(0)
    expect(exchange.externalResults.every((result) => result.status === 'external-reference')).toBe(
      true
    )
  })

  it('retains multi-stage source context without flattening stages', () => {
    const exchange = parseOpenRocketArchive(fixture('three-stage-1.10.ork'))

    expect(exchange.project.stages).toHaveLength(3)
    expect(new Set(exchange.project.stages.map((stage) => stage.number)).size).toBe(3)
    expect(exchange.vehicleCandidates.length).toBeGreaterThan(0)
  })

  it('rejects unsupported versions, unsafe XML, and malformed archives', () => {
    const base = '<openrocket version="1.12"><rocket><name>Test</name></rocket></openrocket>'
    const unsupported = zipSync({ 'rocket.ork': strToU8(base) })
    expect(() => parseOpenRocketArchive(unsupported)).toThrow(/not supported/i)

    const unsafe = zipSync({
      'rocket.ork': strToU8('<!DOCTYPE openrocket><openrocket version="1.10" />'),
    })
    expect(() => parseOpenRocketArchive(unsafe)).toThrow(/prohibited XML/i)

    expect(() => parseOpenRocketArchive(strToU8('not a zip'))).toThrow(/readable OpenRocket ZIP/i)
  })
})
