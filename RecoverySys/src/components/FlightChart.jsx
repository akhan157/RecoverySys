import React, { useRef, useEffect, useCallback } from 'react'

const W = 340
const H = 240
const PAD = { top: 20, right: 16, bottom: 36, left: 56 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top  - PAD.bottom

function nice1000(val) {
  return Math.ceil(val / 1000) * 1000
}

function Axes({ maxAlt, maxTime }) {
  const yTicks = []
  for (let alt = 0; alt <= maxAlt; alt += 1000) yTicks.push(alt)
  if (yTicks[yTicks.length - 1] < maxAlt) yTicks.push(nice1000(maxAlt))

  const xTicks = []
  for (let t = 0; t <= maxTime; t += 5) xTicks.push(t)
  if (xTicks[xTicks.length - 1] < maxTime) xTicks.push(Math.ceil(maxTime / 5) * 5)

  const xS = t => PAD.left + (t / maxTime) * CHART_W
  const yS = a => PAD.top  + CHART_H - (a / maxAlt) * CHART_H

  return (
    <>
      {/* Grid lines */}
      {yTicks.map(alt => (
        <line key={`gy${alt}`} x1={PAD.left} y1={yS(alt)} x2={PAD.left + CHART_W} y2={yS(alt)}
          stroke="var(--chart-grid)" strokeWidth="1" />
      ))}
      {xTicks.map(t => (
        <line key={`gx${t}`} x1={xS(t)} y1={PAD.top} x2={xS(t)} y2={PAD.top + CHART_H}
          stroke="var(--chart-grid)" strokeWidth="1" />
      ))}

      {/* Y-axis labels — skip 0 to avoid collision with "0s" x-label */}
      {yTicks.filter(alt => alt > 0).map(alt => (
        <text key={`yl${alt}`} x={PAD.left - 4} y={yS(alt) + 3}
          textAnchor="end" fontSize="10" fontFamily="ui-monospace, monospace" fill="var(--chart-label)">
          {alt >= 1000 ? `${alt / 1000}k` : alt}
        </text>
      ))}
      <text x={10} y={PAD.top + CHART_H / 2}
        textAnchor="middle" fontSize="9" fontFamily="system-ui" fill="var(--chart-label)"
        transform={`rotate(-90, 10, ${PAD.top + CHART_H / 2})`}>
        ALT (ft)
      </text>

      {/* X-axis labels — thin out when many ticks to prevent crowding */}
      {xTicks.map((t, i) => {
        const step = xTicks.length > 8 ? 2 : 1
        if (i % step !== 0) return null
        return (
          <text key={`xl${t}`} x={xS(t)} y={PAD.top + CHART_H + 14}
            textAnchor="middle" fontSize="10" fontFamily="ui-monospace, monospace" fill="var(--chart-label)">
            {t}s
          </text>
        )
      })}

      {/* Axis lines */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CHART_H}
        stroke="var(--chart-axis)" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + CHART_H} x2={PAD.left + CHART_W} y2={PAD.top + CHART_H}
        stroke="var(--chart-axis)" strokeWidth="1" />
    </>
  )
}

export default function FlightChart({ simulation }) {
  const pathRef  = useRef(null)
  const prevSim  = useRef(null)

  const buildPath = useCallback((timeline, maxAlt, maxTime) => {
    const xS = t => PAD.left + (t / maxTime) * CHART_W
    const yS = a => PAD.top  + CHART_H - (Math.max(0, a) / maxAlt) * CHART_H
    return timeline
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.t).toFixed(1)},${yS(p.alt).toFixed(1)}`)
      .join(' ')
  }, [])

  // Animate path on mount / change
  useEffect(() => {
    if (!simulation || !pathRef.current) return
    const path = pathRef.current
    const len  = path.getTotalLength()
    let timerId

    if (!prevSim.current) {
      // First render: draw left-to-right
      path.style.transition = 'none'
      path.style.strokeDasharray  = len
      path.style.strokeDashoffset = len
      path.style.opacity = 1
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 800ms ease-out'
        path.style.strokeDashoffset = 0
      })
    } else {
      // Re-run: crossfade. Use '' to clear dasharray (not 'none' which is invalid CSS for stroke-dasharray).
      // Capture timerId so we can cancel it if the component unmounts or simulation changes again
      // before the 200 ms fade completes — otherwise the stale callback overwrites the new path state.
      path.style.transition = 'opacity 200ms'
      path.style.opacity = 0
      timerId = setTimeout(() => {
        path.style.strokeDasharray  = ''  // clear → solid line (SVG default)
        path.style.strokeDashoffset = ''
        path.style.opacity = 1
      }, 200)
    }
    prevSim.current = simulation
    return () => clearTimeout(timerId)
  }, [simulation])

  if (!simulation) {
    // No-data state: axes visible, CTA centered
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: 'block', background: 'var(--chart-bg)', border: '1px solid var(--chart-border)', borderRadius: 'var(--radius)' }}>
        <Axes maxAlt={5000} maxTime={120} />
        <text x={PAD.left + CHART_W / 2} y={PAD.top + CHART_H / 2 - 4}
          textAnchor="middle" fontSize="12" fontFamily="system-ui" fill="var(--chart-marker)">
          Run Simulation →
        </text>
      </svg>
    )
  }

  const { timeline, apogee_ft, deploy_ft, phase1_time_s, total_time_s, apogee_t_s, burnout_t_s } = simulation
  // Guard: nice1000(0) = 0 → division-by-zero in yS() → NaN coordinates → blank chart.
  // runSimulation already returns null when apogee_ft <= deploy_ft, but corrupted
  // share-link data could produce apogee_ft: 0. Clamp to at least 1000 ft.
  const maxAlt  = Math.max(1000, nice1000(apogee_ft))

  // maxTime spans the full flight (ascent + descent)
  const descentTime = total_time_s ?? phase1_time_s
  const flightTime  = (apogee_t_s ?? 0) + descentTime
  const maxTime = Math.ceil((flightTime + 5) / 5) * 5

  const xS = t => PAD.left + (t / maxTime) * CHART_W
  const yS = a => PAD.top  + CHART_H - (Math.max(0, a) / maxAlt) * CHART_H

  const d = buildPath(timeline, maxAlt, maxTime)

  // Event markers — BURN only when ascent data is available (integrated mode)
  const events = []
  if (burnout_t_s != null && burnout_t_s > 0) events.push({ t: burnout_t_s, label: 'BURN' })
  events.push({ t: apogee_t_s ?? 0, label: 'APOG' })
  const mainPt = timeline.find(p => p.alt <= deploy_ft && p.t > (apogee_t_s ?? 0))
  if (mainPt) events.push({ t: mainPt.t, label: 'MAIN' })
  const landPt = timeline[timeline.length - 1]
  if (landPt) events.push({ t: landPt.t, label: 'LDG' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ display: 'block', background: 'var(--chart-bg)', border: '1px solid var(--chart-border)', borderRadius: 'var(--radius)' }}>
      <Axes maxAlt={maxAlt} maxTime={maxTime} />

      {/* Event marker lines */}
      {events.map(ev => (
        <g key={ev.label}>
          <line
            x1={xS(ev.t)} y1={PAD.top}
            x2={xS(ev.t)} y2={PAD.top + CHART_H}
            stroke="var(--chart-marker)" strokeWidth="1" strokeDasharray="3,3"
          />
          <text x={xS(ev.t) + 3} y={PAD.top + 10}
            fontSize="8" fontFamily="ui-monospace, monospace" fill="var(--chart-marker)">
            {ev.label}
          </text>
        </g>
      ))}

      {/* Flight path — no inline strokeDasharray/Offset; the animation useEffect owns those */}
      <path
        ref={pathRef}
        d={d}
        stroke="var(--chart-path)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}
