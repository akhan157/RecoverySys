import React, { useEffect, useMemo, useRef, useState } from 'react'
import { computeDrift } from '../lib/simulation.js'

// Leaflet is loaded once and reused
let L = null
async function getLeaflet() {
  if (L) return L
  // Dynamic import so the bundle only loads Leaflet when the map is first opened
  const mod = await import('leaflet')
  L = mod.default ?? mod
  return L
}

function compassLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

// ── marker SVG ───────────────────────────────────────────────────────────────
function markerSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28">
    <circle cx="10" cy="10" r="9" fill="${color}" stroke="white" stroke-width="2"/>
    <line x1="10" y1="19" x2="10" y2="28" stroke="${color}" stroke-width="2"/>
  </svg>`
}

export default function DispersionMap({ simulation, specs }) {
  const [open, setOpen]       = useState(false)
  const [mapReady, setMapReady] = useState(false)  // true once Leaflet map is mounted
  const mapRef    = useRef(null)   // DOM node
  const leafRef   = useRef(null)   // Leaflet map instance
  const layersRef = useRef([])     // overlay layers to remove on update

  const drift = useMemo(
    () => computeDrift({ simulation, specs }),
    [simulation, specs]  // eslint-disable-line react-hooks/exhaustive-deps
  )
  const launch_lat = parseFloat(specs.launch_lat)
  const launch_lon = parseFloat(specs.launch_lon)
  const hasCoords  = isFinite(launch_lat) && isFinite(launch_lon)

  // Mount / destroy map when panel opens/closes
  useEffect(() => {
    if (!open || !mapRef.current) return
    let destroyed = false

    getLeaflet().then(Lf => {
      if (destroyed || leafRef.current) return

      // Leaflet CSS — inject once
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const center = hasCoords ? [launch_lat, launch_lon] : [39.5, -98.35]  // US center fallback
      const zoom   = hasCoords ? 13 : 4

      const map = Lf.map(mapRef.current, {
        center, zoom,
        zoomControl: true,
        attributionControl: true,
      })

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      leafRef.current = map
      setMapReady(true)   // signal overlay effect that map is ready
    })

    return () => {
      destroyed = true
      if (leafRef.current) {
        leafRef.current.remove()
        leafRef.current = null
      }
      setMapReady(false)
    }
  }, [open])  // eslint-disable-line react-hooks/exhaustive-deps

  // Update overlays whenever simulation / drift changes
  useEffect(() => {
    if (!open) return
    let cancelled = false

    getLeaflet().then((Lf) => {
      if (cancelled || !leafRef.current) return   // re-validate after async: map may have been destroyed
      const map = leafRef.current

      // Invalidate size first: map may have been initialized while container was display:none
      map.invalidateSize()

      // Clear previous overlays (guard each remove — a broken layer must not abort the loop)
      layersRef.current.forEach(l => { try { l.remove() } catch (_) {} })
      layersRef.current = []

      const add = (layer) => { layer.addTo(map); layersRef.current.push(layer) }

      if (!hasCoords) return

      // Launch marker
      const launchIcon = Lf.divIcon({
        html: markerSvg('#3b82f6'),
        className: '', iconSize: [20, 28], iconAnchor: [10, 28],
      })
      add(Lf.marker([launch_lat, launch_lon], { icon: launchIcon })
            .bindPopup('<b>Launch Site</b>'))

      if (!drift) {
        map.setView([launch_lat, launch_lon], 13)
        return
      }

      const { land_lat, land_lon, drift_ft, bearing_deg,
              drogue_drift_ft, main_drift_ft, drogue_time_s, main_time_s } = drift

      if (land_lat != null && land_lon != null) {
        // Landing marker
        const landIcon = Lf.divIcon({
          html: markerSvg('#ef4444'),
          className: '', iconSize: [20, 28], iconAnchor: [10, 28],
        })
        add(Lf.marker([land_lat, land_lon], { icon: landIcon })
              .bindPopup(`<b>Predicted Landing</b><br>${drift_ft.toLocaleString()} ft downwind`))

        // Drift line
        add(Lf.polyline([[launch_lat, launch_lon], [land_lat, land_lon]], {
          color: '#ef4444', weight: 2, dashArray: '6,4', opacity: 0.8,
        }))

        // Uncertainty circle (±20% of drift distance)
        const radius_m = Math.max(50, drift.drift_m * 0.20)
        add(Lf.circle([land_lat, land_lon], {
          radius: radius_m,
          color: '#ef4444', fillColor: '#ef4444',
          fillOpacity: 0.08, weight: 1, dashArray: '4,4',
        }).bindPopup(`±20% dispersion circle (~${Math.round(radius_m)}m radius)`))

        // Fit bounds
        map.fitBounds([[launch_lat, launch_lon], [land_lat, land_lon]], { padding: [40, 40] })
      } else {
        map.setView([launch_lat, launch_lon], 13)
      }
    })
    return () => { cancelled = true }
  }, [open, mapReady, drift, launch_lat, launch_lon, hasCoords])  // eslint-disable-line react-hooks/exhaustive-deps

  const canShow = !!simulation && !!drift

  return (
    <div style={{ borderTop: '1px solid var(--border-default)' }}>

      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Dispersion Map
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', transition: 'transform 200ms',
          transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {open && (
        <div>
          {/* Drift stats bar */}
          {canShow && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '12px',
              padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)',
              fontSize: '11px', color: 'var(--text-tertiary)',
            }}>
              <span>
                Drift <strong style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                  {drift.drift_ft.toLocaleString()} ft
                </strong>
                {' '}({(drift.drift_m / 1000).toFixed(2)} km)
              </span>
              {drift.bearing_deg != null && (
                <span>
                  Direction <strong style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                    {compassLabel(drift.bearing_deg)} ({Math.round(drift.bearing_deg)}°)
                  </strong>
                </span>
              )}
              <span>
                Drogue phase <strong style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                  {drift.drogue_drift_ft.toLocaleString()} ft / {drift.drogue_time_s}s
                </strong>
              </span>
              {drift.main_drift_ft > 0 && (
                <span>
                  Main phase <strong style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                    {drift.main_drift_ft.toLocaleString()} ft / {drift.main_time_s}s
                  </strong>
                </span>
              )}
            </div>
          )}

          {!simulation && (
            <div style={{ padding: '14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Run a simulation first to see drift predictions.
            </div>
          )}

          {simulation && !drift && (
            <div style={{ padding: '14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Enter Wind Speed in Rocket Specs to compute drift.
            </div>
          )}

          {!hasCoords && drift && (
            <div style={{ padding: '8px 14px 4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Enter Launch Lat / Lon in Rocket Specs to show landing on map.
            </div>
          )}

          {/* Map container — always mounted when open so Leaflet can attach */}
          <div
            ref={mapRef}
            style={{
              height: '300px',
              background: 'var(--bg-right)',
              display: hasCoords ? 'block' : 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
