/* global DOMParser, TextDecoder */

import { unzipSync } from 'fflate'

export const OPENROCKET_SUPPORTED_VERSIONS = Object.freeze(['1.10', '1.11'])

export const OPENROCKET_IMPORT_LIMITS = Object.freeze({
  archiveBytes: 25 * 1024 * 1024,
  uncompressedBytes: 50 * 1024 * 1024,
  memberCount: 512,
  xmlBytes: 12 * 1024 * 1024,
  xmlNodes: 100_000,
})

const METRIC_FIELDS = Object.freeze({
  maxaltitude: { key: 'maximumAltitude', unit: 'm' },
  maxvelocity: { key: 'maximumVelocity', unit: 'm/s' },
  maxacceleration: { key: 'maximumAcceleration', unit: 'm/s²' },
  maxmach: { key: 'maximumMach', unit: 'dimensionless' },
  timetoapogee: { key: 'timeToApogee', unit: 's' },
  flighttime: { key: 'flightTime', unit: 's' },
  groundhitvelocity: { key: 'groundHitVelocity', unit: 'm/s' },
  launchrodvelocity: { key: 'launchRodVelocity', unit: 'm/s' },
  deploymentvelocity: { key: 'deploymentVelocity', unit: 'm/s' },
  optimumdelay: { key: 'optimumDelay', unit: 's' },
})

const DEPLOYMENT_EVENTS = new Set([
  'recoverydevicedeployment',
  'drogueinflation',
  'maininflation',
  'parachutedeployment',
])

function importError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

function asBytes(input) {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input))
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  throw importError('INVALID_INPUT', 'OpenRocket import requires an ArrayBuffer or byte array.')
}

function textOf(parent, tagName) {
  return parent?.querySelector(`:scope > ${tagName}`)?.textContent?.trim() || ''
}

function numberOf(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

function childPath(parentPath, node, siblingIndex) {
  return `${parentPath}/${node.tagName}[${siblingIndex + 1}]`
}

function sourceVersion(creator) {
  const match = /^OpenRocket\s+(.+)$/i.exec(creator.trim())
  return match?.[1] || null
}

function decodeXml(bytes) {
  if (bytes.byteLength > OPENROCKET_IMPORT_LIMITS.xmlBytes) {
    throw importError(
      'XML_TOO_LARGE',
      'The rocket.ork XML member exceeds the supported size limit.'
    )
  }

  let xml
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw importError('INVALID_ENCODING', 'The rocket.ork member is not valid UTF-8.')
  }

  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw importError('UNSAFE_XML', 'The rocket.ork member contains a prohibited XML declaration.')
  }

  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) {
    throw importError('MALFORMED_XML', 'The rocket.ork member is not well-formed XML.')
  }

  const root = document.documentElement
  if (!root || root.tagName !== 'openrocket') {
    throw importError('INVALID_ROOT', 'The archive does not contain an OpenRocket XML root.')
  }

  return root
}

function parseRadius(raw) {
  const value = raw.trim()
  const autoMatch = /^auto\s+(.+)$/i.exec(value)
  if (autoMatch) {
    return { mode: 'auto', meters: numberOf(autoMatch[1]) }
  }
  return { mode: 'explicit', meters: numberOf(value) }
}

function parseThickness(raw) {
  const value = raw.trim()
  if (value.toLowerCase() === 'filled') return { mode: 'filled', meters: null }
  return { mode: 'explicit', meters: numberOf(value) }
}

function walkElements(node, path, callback, state, stage = null) {
  state.count += 1
  if (state.count > OPENROCKET_IMPORT_LIMITS.xmlNodes) {
    throw importError('XML_TOO_COMPLEX', 'The rocket.ork XML member exceeds the structural limit.')
  }

  const nextStage =
    node.tagName === 'stage'
      ? {
          id: textOf(node, 'id') || null,
          name: textOf(node, 'name') || `Stage ${node.getAttribute('number') ?? '?'}`,
          number:
            numberOf(node.getAttribute('number')) ??
            Array.from(node.parentElement?.children || [])
              .filter((sibling) => sibling.tagName === 'stage')
              .indexOf(node) + 1,
          sourcePath: path,
        }
      : stage
  callback(node, path, nextStage)

  Array.from(node.children).forEach((child, index) => {
    walkElements(child, childPath(path, child, index), callback, state, nextStage)
  })
}

function parseStages(root) {
  const stages = []
  const state = { count: 0 }
  walkElements(
    root,
    '/openrocket',
    (node, path, stage) => {
      if (
        node.tagName !== 'stage' ||
        node.parentElement?.tagName !== 'subcomponents' ||
        node.parentElement.parentElement?.tagName !== 'rocket'
      )
        return
      stages.push({
        id: stage.id,
        name: stage.name,
        number: stage.number,
        sourcePath: path,
      })
    },
    state
  )
  return { stages, nodeCount: state.count }
}
function parseConfigurations(root) {
  return Array.from(root.querySelectorAll('rocket > motorconfiguration')).map((node, index) => ({
    id: node.getAttribute('configid') || `configuration-${index + 1}`,
    default: node.getAttribute('default') === 'true',
    stages: Array.from(node.querySelectorAll(':scope > stage')).map((stage) => ({
      number: numberOf(stage.getAttribute('number')),
      active: stage.getAttribute('active') !== 'false',
    })),
  }))
}

function parseTubeCandidates(root) {
  const candidates = []
  const state = { count: 0 }

  walkElements(
    root,
    '/openrocket',
    (node, path, stage) => {
      if (node.tagName !== 'bodytube') return

      const rawRadius = textOf(node, 'radius')
      const rawThickness = textOf(node, 'thickness')
      const radius = parseRadius(rawRadius)
      const thickness = parseThickness(rawThickness)
      const lengthMeters = numberOf(textOf(node, 'length'))
      const innerDiameterMeters =
        radius.meters != null && thickness.meters != null
          ? 2 * (radius.meters - thickness.meters)
          : null
      const innerDiameterIn =
        innerDiameterMeters != null && innerDiameterMeters > 0
          ? innerDiameterMeters * 39.37007874015748
          : null
      const lengthIn =
        lengthMeters != null && lengthMeters > 0 ? lengthMeters * 39.37007874015748 : null
      const componentId = textOf(node, 'id') || null
      const componentName = textOf(node, 'name') || 'Unnamed body tube'
      const groupId = componentId || path
      const reason =
        radius.mode === 'auto'
          ? 'OpenRocket marks the outer radius automatic; confirm the nominal derived diameter.'
          : thickness.mode === 'filled'
            ? 'A filled component has no wall-thickness subtraction for inner diameter.'
            : 'OpenRocket does not identify the intended recovery bay.'

      if (innerDiameterIn != null) {
        candidates.push({
          id: `${groupId}:airframe_id_in`,
          groupId,
          kind: 'tube',
          targetField: 'airframe_id_in',
          sourcePath: `${path}/radius`,
          sourceValue: { radius: rawRadius, thickness: rawThickness },
          sourceUnit: 'm',
          normalizedValue: innerDiameterIn,
          normalizedUnit: 'in',
          semantic:
            'Nominal body-tube inner diameter derived from outer radius and wall thickness.',
          status: 'needs-confirmation',
          reason,
          confidence:
            radius.mode === 'explicit' && thickness.mode === 'explicit' ? 'medium' : 'low',
          tube: {
            componentId,
            componentName,
            lengthIn,
            radiusMode: radius.mode,
            thicknessMode: thickness.mode,
            stage,
          },
        })
      }

      if (lengthIn != null) {
        candidates.push({
          id: `${groupId}:bay_length_in`,
          groupId,
          kind: 'tube',
          targetField: 'bay_length_in',
          sourcePath: `${path}/length`,
          sourceValue: lengthMeters,
          sourceUnit: 'm',
          normalizedValue: lengthIn,
          normalizedUnit: 'in',
          semantic: 'Nominal body-tube length; usable recovery-bay length requires confirmation.',
          status: 'needs-confirmation',
          reason: 'OpenRocket does not identify obstructions or usable recovery-bay boundaries.',
          confidence: 'medium',
          tube: {
            componentId,
            componentName,
            lengthIn,
            radiusMode: radius.mode,
            thicknessMode: thickness.mode,
            stage,
          },
        })
      }

      if (innerDiameterIn == null && lengthIn == null) {
        candidates.push({
          id: `${groupId}:unavailable`,
          groupId,
          kind: 'tube',
          targetField: null,
          sourcePath: path,
          sourceValue: {
            radius: rawRadius,
            thickness: rawThickness,
            length: textOf(node, 'length'),
          },
          sourceUnit: 'm',
          normalizedValue: null,
          normalizedUnit: null,
          semantic: 'Body-tube geometry is incomplete or non-finite.',
          status: 'unavailable',
          reason: 'The source does not provide enough valid numeric geometry.',
          confidence: 'none',
          tube: {
            componentId,
            componentName,
            lengthIn,
            radiusMode: radius.mode,
            thicknessMode: thickness.mode,
            stage,
          },
        })
      }
    },
    state
  )

  return { candidates, nodeCount: state.count }
}

function parseMotorContext(root) {
  const motors = []
  const state = { count: 0 }
  walkElements(
    root,
    '/openrocket',
    (node, path) => {
      if (node.tagName !== 'motor') return
      const configId = node.getAttribute('configid') || null
      motors.push({
        id: `${configId || 'unassigned'}:${path}`,
        configId,
        sourcePath: path,
        manufacturer: textOf(node, 'manufacturer') || null,
        designation: textOf(node, 'designation') || null,
        type: textOf(node, 'type') || null,
        digest: textOf(node, 'digest') || null,
        diameterM: numberOf(textOf(node, 'diameter')),
        lengthM: numberOf(textOf(node, 'length')),
        delays: textOf(node, 'delay') || null,
        status: 'metadata-only',
        embeddedCurve: false,
      })
    },
    state
  )
  return motors
}

function parseEvents(flightData) {
  return Array.from(flightData.querySelectorAll(':scope > event'))
    .map((event) => ({
      type: event.getAttribute('type') || 'unknown',
      timeS: numberOf(event.getAttribute('time')),
      sourceId: event.getAttribute('source') || null,
    }))
    .filter((event) => event.timeS != null)
}

function parseSummary(flightData) {
  return Object.entries(METRIC_FIELDS).reduce((summary, [attribute, field]) => {
    const value = numberOf(flightData.getAttribute(attribute))
    if (value != null) summary[field.key] = { value, unit: field.unit }
    return summary
  }, {})
}

function parseBranchPresence(flightData) {
  return Array.from(flightData.querySelectorAll(':scope > databranch')).map((branch) => ({
    name: branch.getAttribute('name') || 'Unnamed branch',
    series: (branch.getAttribute('types') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    datapointCount: branch.querySelectorAll(':scope > datapoint').length,
    events: parseEvents(branch),
  }))
}

function parseMassCandidate(simulation, flightData, simulationPath, configIds) {
  const branches = Array.from(flightData.querySelectorAll(':scope > databranch'))
  for (const [branchIndex, branch] of branches.entries()) {
    const types = (branch.getAttribute('types') || '').split(',').map((value) => value.trim())
    const timeIndex = types.indexOf('Time')
    const massIndex = types.indexOf('Mass')
    if (timeIndex < 0 || massIndex < 0) continue

    const firstPoint = branch.querySelector(':scope > datapoint')?.textContent?.trim()
    const values = firstPoint?.split(',').map((value) => numberOf(value.trim())) || []
    const timeS = values[timeIndex]
    const massKg = values[massIndex]
    if (timeS !== 0 || massKg == null || massKg <= 0) continue

    const configId = textOf(simulation.querySelector(':scope > conditions'), 'configid') || null
    const configKnown = configId != null && configIds.has(configId)
    const status =
      simulation.getAttribute('status') === 'uptodate' && configKnown
        ? 'needs-confirmation'
        : 'unavailable'
    const reason =
      status === 'needs-confirmation'
        ? 'Confirm this pre-launch mass for the selected configuration and motor assignment.'
        : 'The saved simulation is stale or does not identify a supported configuration.'

    return {
      id: `${simulationPath}/flightdata/databranch[${branchIndex + 1}]/datapoint[1]:rocket_mass_g`,
      kind: 'mass',
      targetField: 'rocket_mass_g',
      sourcePath: `${simulationPath}/flightdata/databranch[${branchIndex + 1}]/datapoint[1]`,
      sourceValue: massKg,
      sourceUnit: 'kg',
      normalizedValue: massKg * 1000,
      normalizedUnit: 'g',
      semantic: 'OpenRocket saved pre-launch mass at t=0 for one simulation branch.',
      status,
      reason,
      confidence: status === 'needs-confirmation' ? 'high' : 'none',
      simulation: {
        name: textOf(simulation, 'name') || 'Unnamed simulation',
        configId,
        branchName: branch.getAttribute('name') || 'Unnamed branch',
        motorAssignmentKnown: configKnown,
      },
    }
  }
  return null
}

function parseExternalResults(root, configIds) {
  const results = []
  const massCandidates = []
  const simulations = root.querySelectorAll('simulations > simulation')

  simulations.forEach((simulation, simulationIndex) => {
    const simulationPath = `/openrocket/simulations/simulation[${simulationIndex + 1}]`
    const flightData = simulation.querySelector(':scope > flightdata')
    const conditions = simulation.querySelector(':scope > conditions')
    if (!flightData) return

    const configId = textOf(conditions, 'configid') || null
    const branches = parseBranchPresence(flightData)
    const events = branches.flatMap((branch) => branch.events)
    const massCandidate = parseMassCandidate(simulation, flightData, simulationPath, configIds)
    if (massCandidate) massCandidates.push(massCandidate)

    results.push({
      id: `${simulationPath}:external-reference`,
      kind: 'simulation-summary',
      status: 'external-reference',
      sourcePath: simulationPath,
      simulationName: textOf(simulation, 'name') || 'Unnamed simulation',
      simulationStatus: simulation.getAttribute('status') || 'unknown',
      simulator: textOf(simulation, 'simulator') || null,
      calculator: textOf(simulation, 'calculator') || null,
      configId,
      summary: parseSummary(flightData),
      events: events.filter(
        (event) =>
          DEPLOYMENT_EVENTS.has(event.type) ||
          ['liftoff', 'apogee', 'burnout', 'groundhit'].includes(event.type)
      ),
      typedFlightData: {
        branchCount: branches.length,
        branches: branches.map(({ name, series, datapointCount }) => ({
          name,
          series,
          datapointCount,
        })),
      },
    })
  })

  return { results, massCandidates }
}

function archiveEntries(bytes) {
  let memberCount = 0
  let declaredUncompressedBytes = 0
  // Thrustcurve members are metadata-only. Collect their names from the ZIP
  // central directory without decompressing the content. A hostile archive can
  // lie about the declared originalSize (it is not a trustworthy expansion
  // bound), so decompressing a member we immediately discard would let a zip
  // bomb expand unbounded in memory. Only rocket.ork is ever decompressed, and
  // it is hard-capped by xmlBytes after extraction.
  const thrustcurveNames = []
  let entries
  try {
    entries = unzipSync(bytes, {
      filter(file) {
        memberCount += 1
        if (memberCount > OPENROCKET_IMPORT_LIMITS.memberCount) {
          throw importError(
            'ARCHIVE_TOO_COMPLEX',
            'The OpenRocket archive contains too many members.'
          )
        }

        const originalSize = Number(file.originalSize) || 0
        declaredUncompressedBytes += originalSize
        if (declaredUncompressedBytes > OPENROCKET_IMPORT_LIMITS.uncompressedBytes) {
          throw importError(
            'ARCHIVE_TOO_LARGE',
            'The OpenRocket archive expands beyond the supported size limit.'
          )
        }

        if (file.name === 'rocket.ork') return true
        if (file.name.startsWith('thrustcurves/')) thrustcurveNames.push(file.name)
        return false
      },
    })
  } catch (error) {
    if (typeof error?.code === 'string') throw error
    throw importError(
      'INVALID_ARCHIVE',
      'The selected file is not a readable OpenRocket ZIP archive.'
    )
  }

  if (!entries['rocket.ork']) {
    throw importError(
      'MISSING_ROCKET_XML',
      'The archive does not contain the required rocket.ork member.'
    )
  }

  return { entries, memberCount, thrustcurveNames }
}

export function parseOpenRocketArchive(input, { sourceFilename = '' } = {}) {
  const bytes = asBytes(input)
  if (bytes.byteLength > OPENROCKET_IMPORT_LIMITS.archiveBytes) {
    throw importError(
      'ARCHIVE_TOO_LARGE',
      'The selected OpenRocket archive exceeds the supported size limit.'
    )
  }

  const { entries, memberCount, thrustcurveNames } = archiveEntries(bytes)
  const root = decodeXml(entries['rocket.ork'])
  const version = root.getAttribute('version') || null
  if (!OPENROCKET_SUPPORTED_VERSIONS.includes(version)) {
    throw importError(
      'UNSUPPORTED_VERSION',
      `OpenRocket file version ${version || 'unknown'} is not supported.`,
      {
        version,
        supportedVersions: OPENROCKET_SUPPORTED_VERSIONS,
      }
    )
  }

  const { stages, nodeCount } = parseStages(root)
  const configurations = parseConfigurations(root)
  const configIds = new Set(configurations.map((configuration) => configuration.id))
  const { candidates: tubeCandidates } = parseTubeCandidates(root)
  const motorContext = parseMotorContext(root)
  const external = parseExternalResults(root, configIds)
  const curveMembers = thrustcurveNames
  const warnings = []

  if (external.results.length === 0) {
    warnings.push({
      code: 'SIMULATION_DATA_UNAVAILABLE',
      level: 'info',
      message: 'No saved OpenRocket simulations were found.',
    })
  }
  if (motorContext.length === 0) {
    warnings.push({
      code: 'MOTOR_METADATA_UNAVAILABLE',
      level: 'info',
      message: 'No embedded motor metadata was found.',
    })
  }
  if (curveMembers.length > 0) {
    warnings.push({
      code: 'EMBEDDED_CURVE_NOT_IMPORTED',
      level: 'info',
      message: `${curveMembers.length} embedded motor curve member(s) were detected but remain metadata-only.`,
    })
  }

  return {
    contractVersion: 1,
    project: {
      name:
        textOf(root.querySelector(':scope > rocket'), 'name') ||
        sourceFilename ||
        'Imported OpenRocket project',
      rocketId: textOf(root.querySelector(':scope > rocket'), 'id') || null,
      selectedConfiguration: null,
      selectedStage: null,
      configurations,
      stages,
    },
    source: {
      sourceFilename: sourceFilename || null,
      memberCount,
      importedAt: new Date().toISOString(),
      sourceTool: 'OpenRocket',
      sourceToolVersion: sourceVersion(root.getAttribute('creator') || ''),
      formatVersion: version,
    },
    vehicleCandidates: tubeCandidates,
    massCandidates: external.massCandidates,
    motorContext,
    externalResults: external.results,
    omitted: {
      embeddedCurveMembers: curveMembers,
      typedFlightBranchCount: external.results.reduce(
        (total, result) => total + result.typedFlightData.branchCount,
        0
      ),
    },
    warnings: [
      ...warnings,
      ...(nodeCount >= OPENROCKET_IMPORT_LIMITS.xmlNodes
        ? [
            {
              code: 'XML_NODE_LIMIT_REACHED',
              level: 'warn',
              message: 'The XML structural limit was reached while inspecting the archive.',
            },
          ]
        : []),
    ],
  }
}

export async function sha256Hex(input) {
  const bytes = asBytes(input)
  if (!globalThis.crypto?.subtle) return null
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}
