import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { exportOrk } from '../lib/ork.js'

// Helpers
const baseSpecs = {
  rocket_mass_g:          '2500',
  motor_total_impulse_ns: '640',
  burn_time_s:            '1.8',
  airframe_od_in:         '4',
  airframe_id_in:         '3.9',
  bay_length_in:          '18',
  drag_cd:                '0.5',
  wind_speed_mph:         '10',
  main_deploy_alt_ft:     '500',
}

const mainChute = {
  id:           'test-main',
  name:         'Test Main',
  manufacturer: 'Acme',
  category:     'main_chute',
  specs:        { diameter_in: 36, cd: 1.5, packed_diam_in: 3, packed_length_in: 4, weight_g: 120 },
}

const drogueChute = {
  id:           'test-drogue',
  name:         'Test Drogue',
  manufacturer: 'Acme',
  category:     'drogue_chute',
  specs:        { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 2, weight_g: 40 },
}

async function getXmlFromBlob(blob) {
  const zip = await JSZip.loadAsync(blob)
  return zip.file('rocket.ork').async('string')
}

// ── escapeXml (tested indirectly via exportOrk) ───────────────────────────────

describe('escapeXml — XML character escaping', () => {
  it('escapes & in part names', async () => {
    const blob = await exportOrk({
      config: { main_chute: { ...mainChute, name: 'Rockets & Parachutes' } },
      specs:  baseSpecs,
    })
    const xml = await getXmlFromBlob(blob)
    expect(xml).toContain('Rockets &amp; Parachutes')
    expect(xml).not.toContain('Rockets & Parachutes (M') // raw & must not appear
  })

  it('escapes < in part names', async () => {
    const blob = await exportOrk({
      config: { main_chute: { ...mainChute, name: 'Size <36' } },
      specs:  baseSpecs,
    })
    const xml = await getXmlFromBlob(blob)
    expect(xml).toContain('&lt;36')
    expect(xml).not.toMatch(/Size <36/)
  })

  it('escapes > in part names', async () => {
    const blob = await exportOrk({
      config: { main_chute: { ...mainChute, name: 'Size >36' } },
      specs:  baseSpecs,
    })
    const xml = await getXmlFromBlob(blob)
    expect(xml).toContain('&gt;36')
  })

  it('escapes " in part names', async () => {
    const blob = await exportOrk({
      config: { main_chute: { ...mainChute, name: 'The "Big" Chute' } },
      specs:  baseSpecs,
    })
    const xml = await getXmlFromBlob(blob)
    expect(xml).toContain('The &quot;Big&quot; Chute')
  })

  it('escapes all special chars in a single name', async () => {
    const blob = await exportOrk({
      config: { main_chute: { ...mainChute, name: 'A & <B> "C"' } },
      specs:  baseSpecs,
    })
    const xml = await getXmlFromBlob(blob)
    expect(xml).toContain('A &amp; &lt;B&gt; &quot;C&quot;')
  })
})

// ── XML structure ─────────────────────────────────────────────────────────────

describe('exportOrk — XML structure', () => {
  it('produces valid-looking XML with openrocket root element', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    const xml  = await getXmlFromBlob(blob)
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<openrocket')
    expect(xml).toContain('</openrocket>')
  })

  it('includes bodytube radius derived from airframe_od_in', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    const xml  = await getXmlFromBlob(blob)
    // 4" OD → radius = 2" = 0.0508 m
    expect(xml).toContain('0.0508')
  })

  it('includes main chute with correct diameter when main is set', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    const xml  = await getXmlFromBlob(blob)
    // 36" → 0.9144 m
    expect(xml).toContain('0.9144')
    expect(xml).toContain('altitude')  // main deploys at altitude
  })

  it('includes drogue chute with apogee deploy when drogue is set', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute, drogue_chute: drogueChute }, specs: baseSpecs })
    const xml  = await getXmlFromBlob(blob)
    expect(xml).toContain('apogee')
  })

  it('omits drogue element when no drogue is set', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    const xml  = await getXmlFromBlob(blob)
    expect(xml).not.toContain('Drogue')
  })

  it('uses main_deploy_alt_ft converted to metres', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: { ...baseSpecs, main_deploy_alt_ft: '1000' } })
    const xml  = await getXmlFromBlob(blob)
    // 1000 ft → 304.8 m
    expect(xml).toContain('304.8')
  })
})

// ── JSZip blob generation ──────────────────────────────────────────────────────

describe('exportOrk — Blob output', () => {
  it('returns a Blob', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    expect(blob).toBeInstanceOf(Blob)
  })

  it('blob contains a file named rocket.ork', async () => {
    const blob  = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    const zip   = await JSZip.loadAsync(blob)
    expect(zip.file('rocket.ork')).not.toBeNull()
  })

  it('is a valid ZIP (loadAsync does not throw)', async () => {
    const blob = await exportOrk({ config: { main_chute: mainChute }, specs: baseSpecs })
    await expect(JSZip.loadAsync(blob)).resolves.toBeDefined()
  })
})
