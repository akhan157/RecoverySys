import React from 'react'
import { slotStatus } from '../lib/compatibility.js'
import { partSpecLine } from '../lib/format.js'

const ACCENT = {
  ok:      'var(--ok-fg)',
  warn:    'var(--warn-fg)',
  error:   'var(--error-fg)',
  neutral: 'var(--border-default)',
}

export default function ConfigSlot({ category, placeholder, part, warnings, onRemove, onClickEmpty }) {
  const status = part ? slotStatus(category, warnings) : 'neutral'
  const accent = ACCENT[status]

  if (!part) {
    return (
      <button
        onClick={onClickEmpty}
        aria-label={`Add ${placeholder}`}
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
      border: `1px solid ${accent}`,
      padding: '0 12px',
      gap: '8px',
      background: 'var(--bg-panel)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part.manufacturer} {part.name}
        </div>
        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {partSpecLine(part, 'detailed')}
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
