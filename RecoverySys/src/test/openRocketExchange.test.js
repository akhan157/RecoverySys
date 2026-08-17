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

// Build a minimal ZIP by hand so a member can declare a compression method
// without carrying valid deflate data. fflate's unzipSync never checks CRC, so
// a zero CRC is fine; only the member layout and central-directory sizes matter.
function u16(v) {
  return [v & 255, (v >> 8) & 255]
}
function u32(v) {
  return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255]
}
function localHeader(name, method, compSize, uncompSize) {
  const nameBytes = strToU8(name)
  return new Uint8Array([
    ...strToU8('PK\x03\x04'),
    ...u16(20), // version needed
    ...u16(0), // flags
    ...u16(method),
    ...u16(0), // mod time
    ...u16(0), // mod date
    ...u32(0), // crc (not validated)
    ...u32(compSize),
    ...u32(uncompSize),
    ...u16(nameBytes.length),
    ...u16(0), // extra
    ...nameBytes,
  ])
}
function centralEntry(name, method, compSize, uncompSize, localOffset) {
  const nameBytes = strToU8(name)
  return new Uint8Array([
    ...strToU8('PK\x01\x02'),
    ...u16(20), // version made by
    ...u16(20), // version needed
    ...u16(0), // flags
    ...u16(method),
    ...u16(0), // mod time
    ...u16(0), // mod date
    ...u32(0), // crc
    ...u32(compSize),
    ...u32(uncompSize),
    ...u16(nameBytes.length),
    ...u16(0), // extra
    ...u16(0), // comment
    ...u16(0), // disk start
    ...u16(0), // internal attrs
    ...u32(0), // external attrs
    ...u32(localOffset),
    ...nameBytes,
  ])
}
function eocd(entryCount, centralSize, centralOffset) {
  return new Uint8Array([
    ...strToU8('PK\x05\x06'),
    ...u16(0), // disk
    ...u16(0), // cd disk
    ...u16(entryCount),
    ...u16(entryCount),
    ...u32(centralSize),
    ...u32(centralOffset),
    ...u16(0), // comment
  ])
}
function craftZip(members) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const member of members) {
    const local = localHeader(member.name, member.method, member.data.length, member.uncompSize)
    localParts.push(local, member.data)
    centralParts.push(
      centralEntry(member.name, member.method, member.data.length, member.uncompSize, offset)
    )
    offset += local.length + member.data.length
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  return new Uint8Array([
    ...localParts.reduce((all, part) => [...all, ...part], []),
    ...centralParts.reduce((all, part) => [...all, ...part], []),
    ...eocd(members.length, centralSize, offset),
  ])
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

  it('reports embedded thrustcurve names without decompressing their content', () => {
    // Real 1.11 fixture carries one thrustcurve member; the envelope names it
    // and the warning counts it, proving the metadata-only path surfaces it.
    const exchange = parseOpenRocketArchive(fixture('simulation-extensions-1.11.ork'))
    expect(exchange.omitted.embeddedCurveMembers).toHaveLength(1)
    expect(exchange.omitted.embeddedCurveMembers[0]).toMatch(/^thrustcurves\/.+\.rse$/)
    const warning = exchange.warnings.find((w) => w.code === 'EMBEDDED_CURVE_NOT_IMPORTED')
    expect(warning?.level).toBe('info')
    expect(warning?.message).toContain('1 embedded motor curve')

    // Hostile archive: the thrustcurve member declares deflate compression but
    // carries invalid deflate bytes. If the parser inflated discarded content
    // it would fail; skipping decompression means the parse still succeeds.
    const garbageCurve = strToU8('this is not valid deflate data \x00\xff\xfe')
    const archive = craftZip([
      {
        name: 'rocket.ork',
        method: 0,
        uncompSize: 0,
        data: strToU8(
          '<openrocket version="1.10"><rocket><name>Nested</name>' +
            '<subcomponents><stage number="1"><name>Stage 1</name></stage></subcomponents>' +
            '</rocket></openrocket>'
        ),
      },
      { name: 'thrustcurves/bad.rse', method: 8, uncompSize: 8, data: garbageCurve },
    ])
    const hostile = parseOpenRocketArchive(archive, { sourceFilename: 'hostile.ork' })
    expect(hostile.omitted.embeddedCurveMembers).toEqual(['thrustcurves/bad.rse'])
    expect(hostile.warnings.some((w) => w.code === 'EMBEDDED_CURVE_NOT_IMPORTED')).toBe(true)
  })

  it('retains multi-stage source context without flattening stages', () => {
    const exchange = parseOpenRocketArchive(fixture('three-stage-1.10.ork'))

    expect(exchange.project.stages).toHaveLength(3)
    expect(new Set(exchange.project.stages.map((stage) => stage.number)).size).toBe(3)
    expect(exchange.vehicleCandidates.length).toBeGreaterThan(0)
  })

  it('parses a real-world user .ork file within the supported version range', () => {
    const exchange = parseOpenRocketArchive(fixture('bryant-test-rocket-1.10.ork'), {
      sourceFilename: 'Bryant Test Rocket.ork',
    })

    expect(exchange.source.formatVersion).toBe('1.10')
    expect(exchange.project.stages).toHaveLength(1)
    expect(exchange.vehicleCandidates.length).toBeGreaterThan(0)
    expect(
      exchange.vehicleCandidates.some((candidate) => candidate.targetField === 'airframe_id_in')
    ).toBe(true)
    expect(exchange.externalResults.length).toBeGreaterThan(0)
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
