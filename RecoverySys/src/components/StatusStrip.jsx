/**
 * Persistent 28px status strip — sticky under the mission-control header.
 * One-glance instrument readout: result freshness, error/warning tally,
 * bay utilization, apogee, and a single quick action when attention is due.
 *
 * Props:
 *   simulation    — latest run result ({ apogee_ft, ... }) or null
 *   resultFresh   — true when the result matches the current inputs
 *   hasErrors     — true when any warning carries level 'error'   (fallback)
 *   hasWarnings   — true when any warning exists                  (fallback)
 *   warnings      — Warning[] with { level: 'error' | 'warn' }
 *   filledSlots   — filled bay slot count
 *   totalSlots    — bay slot capacity (default 8)
 *   packingVolume — { fraction, ... } from computePackingVolume
 *   onNavigate    — (target) => void; 'SIMULATION' | 'ANALYSIS'
 *
 * Tokens resolve against the live `--mc-*` remaps first, then the
 * blueprint `--ok/--warn/--err/--ink` palette, with the instrument hex
 * as last-resort fallback — renders correctly before and after the
 * token migration.
 */

const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace"
const SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

const TONE = {
  ok: 'var(--ok-fg, var(--ok, #3ddc84))',
  warn: 'var(--warn-fg, var(--warn, #ffb224))',
  err: 'var(--error-fg, var(--err, #ff5c5c))',
  dim: 'var(--mc-text-dim, var(--txt-2, #9aa4b2))',
  text: 'var(--mc-text, var(--txt-0, #f2f5f8))',
  panel: 'var(--mc-bg-panel, var(--ink-1, #0c0f14))',
  border: 'var(--mc-border, var(--line-0, #232b36))',
}

const SEP = '·'

export default function StatusStrip({
  simulation,
  resultFresh = false,
  hasErrors = false,
  hasWarnings = false,
  warnings = [],
  filledSlots = 0,
  totalSlots = 8,
  packingVolume = {},
  onNavigate,
}) {
  const hasSim = Boolean(simulation)
  const isFresh = hasSim && resultFresh
  const isStale = hasSim && !resultFresh

  // warning tally; the boolean props are the floor for callers that pass
  // only the flags (never double-counts when the array is authoritative)
  const errorCount = warnings.filter((w) => w.level === 'error').length || (hasErrors ? 1 : 0)
  const warnCount = warnings.filter((w) => w.level === 'warn').length || (hasWarnings ? 1 : 0)

  const apogeeFt =
    simulation && Number.isFinite(simulation.apogee_ft) ? Math.round(simulation.apogee_ft) : null
  const apogeeText = apogeeFt != null ? apogeeFt.toLocaleString('en-US') : null

  const fraction = Number.isFinite(packingVolume.fraction) ? packingVolume.fraction : null
  const packedPct = fraction != null ? `${Math.round(fraction * 100)}%` : null

  // single quick action: re-running clears staleness, warnings get a review
  let action = null
  if (isStale) {
    action = { label: 'RERUN SIM', target: 'SIMULATION', tone: 'warn' }
  } else if (errorCount > 0 || warnCount > 0) {
    action = {
      label: 'REVIEW WARN',
      target: 'ANALYSIS',
      tone: errorCount > 0 ? 'err' : 'warn',
    }
  }

  const freshness = isFresh
    ? { dot: '●', label: 'CURRENT', tone: 'ok' }
    : isStale
      ? { dot: '▲', label: 'STALE', tone: 'warn' }
      : { dot: '○', label: 'NO RUN', tone: 'dim' }

  return (
    <aside
      className="mc-status-strip"
      aria-label="System status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 28,
        minHeight: 28,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        background: TONE.panel,
        borderBottom: `1px solid ${TONE.border}`,
        overflow: 'hidden',
      }}
    >
      {/* 1 · freshness */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          aria-hidden="true"
          style={{ color: TONE[freshness.tone], fontSize: 10, lineHeight: 1 }}
        >
          {freshness.dot}
        </span>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: TONE[freshness.tone],
          }}
        >
          {freshness.label}
        </span>
      </span>

      <span style={{ color: TONE.border }}>│</span>

      {/* 2 · error / warning tally */}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: errorCount ? TONE.err : TONE.dim }}>
          {errorCount} ERR
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: TONE.dim }}>{SEP}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: warnCount ? TONE.warn : TONE.dim }}>
          {warnCount} WARN
        </span>
      </span>

      <span style={{ color: TONE.border }}>│</span>

      {/* 3 · bay utilization */}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: TONE.text }}>
          {filledSlots}/{totalSlots}
        </span>
        <span style={{ fontFamily: SANS, fontSize: 10, color: TONE.dim }}>BAYS LOADED</span>
        {packedPct && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: TONE.dim }}>
            {SEP} {packedPct}
          </span>
        )}
      </span>

      {/* 4 · apogee estimate */}
      {apogeeText && (
        <>
          <span style={{ color: TONE.border }}>│</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 10, color: TONE.dim }}>APOGEE</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: TONE.text }}>
              {apogeeText}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: TONE.dim }}>FT</span>
          </span>
        </>
      )}

      {/* 5 · quick action */}
      {action && (
        <button
          type="button"
          onClick={() => onNavigate && onNavigate(action.target)}
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            height: 18,
            padding: '0 10px',
            color: TONE[action.tone],
            background: TONE.panel,
            border: `1px solid ${TONE[action.tone]}`,
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          {action.label} →
        </button>
      )}
    </aside>
  )
}
