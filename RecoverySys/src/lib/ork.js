import JSZip from 'jszip'

/**
 * Generate a minimal OpenRocket .ork file from the current config + specs.
 * The .ork format is a ZIP containing a single XML document.
 *
 * Returns a Blob ready for download.
 */
export async function exportOrk({ config, specs, simulation }) {
  const airframe_od_in = parseFloat(specs.airframe_od_in) || 4
  const mass_g         = parseFloat(specs.rocket_mass_g)  || 1000
  const deploy_ft      = parseFloat(specs.main_deploy_alt_ft) || 500
  const deploy_m       = deploy_ft * 0.3048

  const main   = config.main_chute
  const drogue = config.drogue_chute

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<openrocket version="1.7" creator="RecoverySys v1">
  <rocket>
    <name>RecoverySys Export</name>
    <motorconfiguration configid="cfg1" default="true"/>
    <subcomponents>
      <stage>
        <name>Sustainer</name>
        <subcomponents>
          <nosecone>
            <name>Nosecone</name>
            <finish>normal</finish>
            <shape>ogive</shape>
            <length>0.3</length>
            <thickness>0.002</thickness>
            <radius>${(airframe_od_in * 0.0254 / 2).toFixed(4)}</radius>
          </nosecone>
          <bodytube>
            <name>Airframe</name>
            <finish>normal</finish>
            <length>1.0</length>
            <thickness>0.002</thickness>
            <radius>${(airframe_od_in * 0.0254 / 2).toFixed(4)}</radius>
            <subcomponents>${main ? `
              <parachute>
                <name>${escapeXml(main.name)} (Main)</name>
                <cd>${main.specs.cd}</cd>
                <diameter>${(main.specs.diameter_in * 0.0254).toFixed(4)}</diameter>
                <deployevent>altitude</deployevent>
                <deployaltitude>${deploy_m.toFixed(1)}</deployaltitude>
                <deploydelay>0</deploydelay>
                <material type="surface" density="0.067">Ripstop nylon</material>
              </parachute>` : ''}${drogue ? `
              <parachute>
                <name>${escapeXml(drogue.name)} (Drogue)</name>
                <cd>${drogue.specs.cd}</cd>
                <diameter>${(drogue.specs.diameter_in * 0.0254).toFixed(4)}</diameter>
                <deployevent>apogee</deployevent>
                <deploydelay>0</deploydelay>
                <material type="surface" density="0.067">Ripstop nylon</material>
              </parachute>` : ''}
            </subcomponents>
          </bodytube>
        </subcomponents>
      </stage>
    </subcomponents>
  </rocket>
</openrocket>`

  const zip = new JSZip()
  zip.file('rocket.ork', xml)
  return zip.generateAsync({ type: 'blob', mimeType: 'application/octet-stream' })
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
