import React, { useEffect, useMemo, useRef, useState } from 'react'
import { computeDrift, runDispersionMonteCarlo } from '../lib/simulation.js'

// Leaflet is loaded once and reused
let L = null
async function getLeaflet() {
  if (L) return L
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

/**
 * Convert an ellipse (center lat/lon, semi-axes in metres, rotation in degrees)
 * to a polygon of lat/lon points for Leaflet rendering.
 */
function ellipseToPolygon(cx, cy, rx_m, ry_m, angle_deg, segments = 64) {
  const m_per_deg_lat = 111320
  const m_per_deg_lon = 111320 * Math.cos(cx * Math.PI / 180)
  const angle_rad = (90 - angle_deg) * Math.PI / 180  // convert from geographic to math convention

  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = (2 * Math.PI * i) / segments
    // Ellipse in local coordinates
    const ex = rx_m * Math.cos(t)
    const ey = ry_m * Math.sin(t)
    // Rotate
    const rx = ex * Math.cos(angle_rad) - ey * Math.sin(angle_rad)
    const ry_rot = ex * Math.sin(angle_rad) + ey * Math.cos(angle_rad)
    // Convert to lat/lon offset
    const dLon = rx / m_per_deg_lon
    const dLat = ry_rot / m_per_deg_lat
    points.push([cx + dLat, cy + dLon])
  }
  return points
}

export default function DispersionMap({ simulation, specs, forceOpen = false }) {
  const [open, setOpen]       = useState(forceOpen)
  const [mapReady, setMapReady] = useState(false)
  const mapRef    = useRef(null)
  const leafRef   = useRef(null)
  const layersRef = useRef([])

  const drift = useMemo(
    () => computeDrift({ simulation, specs }),
    [simulation, specs]  // eslint-disable-line react-hooks/exhaustive-deps
  )

  const monteCarlo = useMemo(
    () => runDispersionMonteCarlo({ simulation, specs }),
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

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const center = hasCoords ? [launch_lat, launch_lon] : [39.5, -98.35]
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
      setMapReady(true)
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

  // Update overlays whenever simulation / drift / monteCarlo changes
  useEffect(() => {
    if (!open) return
    let cancelled = false

    getLeaflet().then((Lf) => {
      if (cancelled || !leafRef.current) return
      const map = leafRef.current

      map.invalidateSize()

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
              drogue_drift_ft, main_drift_ft, drogue_time_s, main_time_s,
              drogue_vector, main_vector } = drift

      if (land_lat != null && land_lon != null) {
        // ── Monte Carlo scatter ─────────────────────────────────────
        if (monteCarlo && monteCarlo.scatter.length > 0) {
          // Scatter dots
          for (const pt of monteCarlo.scatter) {
            add(Lf.circleMarker([pt.lat, pt.lon], {
              radius: 1.5,
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.25,
              weight: 0,
            }))
          }

          // 2σ confidence ellipse
          if (monteCarlo.ellipse) {
            const { cx, cy, rx, ry, angle_deg } = monteCarlo.ellipse
            const ellipsePoints = ellipseToPolygon(cx, cy, rx, ry, angle_deg)
            add(Lf.polygon(ellipsePoints, {
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.10,
              weight: 2,
              dashArray: '6,4',
            }).bindPopup(
              `<b>95% Confidence Ellipse</b><br>` +
              `Semi-major: ${Math.round(rx)}m<br>` +
              `Semi-minor: ${Math.round(ry)}m`
            ))
          }
        }

        // ── Phase vectors (drogue → main) ───────────────────────────
        if (drogue_vector && main_vector) {
          // Drogue endpoint (intermediate landing if main didn't deploy)
          const m_per_deg_lat = 111320
          const m_per_deg_lon = 111320 * Math.cos(launch_lat * Math.PI / 180)
          const drogue_end_lat = launch_lat + (drogue_vector.dy_ft / 3.28084) / m_per_deg_lat
          const drogue_end_lon = launch_lon + (drogue_vector.dx_ft / 3.28084) / m_per_deg_lon

          // Drogue phase vector (yellow)
          add(Lf.polyline([[launch_lat, launch_lon], [drogue_end_lat, drogue_end_lon]], {
            color: '#f59e0b', weight: 2.5, opacity: 0.9,
          }).bindPopup(`<b>Drogue Phase</b><br>${drogue_drift_ft.toLocaleString()} ft / ${drogue_time_s}s`))

          // Main phase vector (red) — from drogue endpoint to landing
          add(Lf.polyline([[drogue_end_lat, drogue_end_lon], [land_lat, land_lon]], {
            color: '#ef4444', weight: 2.5, opacity: 0.9,
          }).bindPopup(`<b>Main Phase</b><br>${main_drift_ft.toLocaleString()} ft / ${main_time_s}s`))
        }

        // Landing marker
        const landIcon = Lf.divIcon({
          html: markerSvg('#ef4444'),
          className: '', iconSize: [20, 28], iconAnchor: [10, 28],
        })
        add(Lf.marker([land_lat, land_lon], { icon: landIcon })
              .bindPopup(`<b>Predicted Landing</b><br>${drift_ft.toLocaleString()} ft downwind`))

        // Fit bounds to include scatter or at minimum launch + landing
        if (monteCarlo && monteCarlo.scatter.length > 0) {
          const allLats = [launch_lat, land_lat, ...monteCarlo.scatter.map(p => p.lat)]
          const allLons = [launch_lon, land_lon, ...monteCarlo.scatter.map(p => p.lon)]
          const bounds = [
            [Math.min(...allLats), Math.min(...allLons)],
            [Math.max(...allLats), Math.max(...allLons)],
          ]
          map.fitBounds(bounds, { padding: [40, 40] })
        } else {
          map.fitBounds([[launch_lat, launch_lon], [land_lat, land_lon]], { padding: [40, 40] })
        }
      } else {
        map.setView([launch_lat, launch_lon], 13)
      }
    })
    return () => { cancelled = true }
  }, [open, mapReady, drift, monteCarlo, launch_lat, launch_lon, hasCoords])  // eslint-disable-line react-hooks/exhaustive-deps

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
          Dispersion Map {monteCarlo ? '(Monte Carlo)' : ''}
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
                Drogue <strong style={{ color: '#f59e0b', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                  {drift.drogue_drift_ft.toLocaleString()} ft / {drift.drogue_time_s}s
                </strong>
              </span>
              {drift.main_drift_ft > 0 && (
                <span>
                  Main <strong style={{ color: '#ef4444', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                    {drift.main_drift_ft.toLocaleString()} ft / {drift.main_time_s}s
                  </strong>
                </span>
              )}
              {monteCarlo && monteCarlo.ellipse && (
                <span>
                  95% ellipse <strong style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                    {Math.round(monteCarlo.ellipse.rx)}×{Math.round(monteCarlo.ellipse.ry)}m
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

          {/* Map container */}
          <div
            ref={mapRef}
            style={{
              height: '300px',
              background: 'var(--bg-right)',
              display: hasCoords ? 'block' : 'none',
            }}
          />

          {/* Legend */}
          {canShow && hasCoords && monteCarlo && (
            <div style={{
              display: 'flex', gap: '16px', padding: '6px 14px',
              fontSize: '10px', color: 'var(--text-tertiary)',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <span><span style={{ color: '#f59e0b' }}>■</span> Drogue vector</span>
              <span><span style={{ color: '#ef4444' }}>■</span> Main vector</span>
              <span><span style={{ color: '#ef4444', opacity: 0.5 }}>·</span> MC scatter ({monteCarlo.scatter.length} pts)</span>
              <span><span style={{ color: '#f59e0b' }}>⬭</span> 95% ellipse</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
