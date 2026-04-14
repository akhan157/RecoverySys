import React from 'react'
import { slotStatus } from '../lib/compatibility.js'

const ACCENT = {
  ok:      'var(--ok-fg)',
  warn:    'var(--warn-fg)',
  error:   'var(--error-fg)',
  neutral: 'transparent',
}

function slotSpecLine(part) {
  if (!part) return ''
  switch (part.category) {
    case 'main_chute':
    case 'drogue_chute':
      return `${part.specs.diameter_in}" Ø  Cd ${part.specs.cd}  packed ${part.specs.packed_diam_in}"  ${part.specs.weight_g}g`
    case 'shock_cord':
      return `${part.specs.strength_lbs} lbs  ${part.specs.length_ft}ft  ${part.specs.weight_g}g`
    case 'chute_protector':
      return `${part.specs.size_in}" fits ≤${part.specs.max_chute_diam_in}" chute  ${part.specs.weight_g}g`
    case 'quick_links':
      return `${part.specs.strength_lbs} lbs  ${part.specs.size_in}" size  ${part.specs.weight_g}g`
    case 'deployment_bag':
      return `fits ≤${part.specs.max_chute_diam_in}" chute  ${part.specs.packed_height_in}" packed  ${part.specs.weight_g}g`
    case 'swivel':
      return `${part.specs.rated_lbs} lbs WLL  ${part.specs.size_in}" size  ${part.specs.weight_g}g`
    case 'chute_device': {
      const altRange = part.specs.deploy_alt_min_ft != null
        ? `  ${part.specs.deploy_alt_min_ft}–${part.specs.deploy_alt_max_ft}ft`
        : ''
      return `${part.specs.weight_g}g${altRange}`
    }
    default:
      return ''
  }
}

export default function ConfigSlot({ category, label, placeholder, part, warnings, onRemove, onClickEmpty }) {
  const status = part ? slotStatus(category, warnings) : 'neutral'
  const accent = ACCENT[status]

  if (!part) {
    return (
      <button
        onClick={onClickEmpty}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '56px',
          width: '100%',
          padding: '0 12px',
          background: 'transparent',
          border: '1px dashed var(--border-default)',
          borderRadius: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: 'var(--text-placeholder)', fontStyle: 'italic', fontSize: '13px' }}>
          {placeholder}
        </span>
      </button>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '56px',
      border: '1px solid var(--border-default)',
      borderLeft: `3px solid ${accent}`,
      padding: '0 12px',
      gap: '8px',
      background: 'var(--bg-panel)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part.manufacturer} {part.name}
        </div>
        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slotSpecLine(part)}
        </div>
      </div>
      <button
        onClick={() => onRemove(category)}
        title="Remove"
        aria-label={`Remove ${part.name}`}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '16px',
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 -12px 0 0',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--error-fg)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        ×
      </button>
    </div>
  )
}
