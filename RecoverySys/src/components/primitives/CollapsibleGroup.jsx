import React, { useState } from 'react'

/**
 * Disclosure-style collapsible section. Pass 1 + Pass 2 found that
 * `MfrGroup` and `CustomGroup` in PartsBrowser were ~80% identical chrome
 * (subtle bottom border, toggle button with section label + chevron, body
 * that animates from `max-height: 0` to `max-height: 9999px` with a 200ms
 * ease transition, 2-column grid). This primitive is the shared chrome.
 *
 * Card content stays in the caller via `children` so each consumer can
 * render its own cell layout (basic part cards in MfrGroup, cards with
 * edit/delete overlays in CustomGroup).
 *
 * The 9999px collapse-trick is kept for now to preserve the existing
 * animation; replacing it with a `<details>` + `content-visibility: auto`
 * approach is on the rebuild list as a follow-up perf improvement.
 *
 * Props:
 *   - label:           text shown in the header (rendered uppercase via .section-label)
 *   - labelStyle:      optional style override (CustomGroup uses this for accent color)
 *   - defaultOpen:     boolean — initial open state. Default false.
 *   - children:        body content (typically a grid of cards)
 *   - bodyStyle:       optional style override for the inner grid wrapper
 */
export default function CollapsibleGroup({
  label,
  labelStyle,
  defaultOpen = false,
  children,
  bodyStyle,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span className="section-label" style={labelStyle}>{label}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            flexShrink: 0,
          }}
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 9999px max-height trick avoids catalog truncation; replace with
          <details> or content-visibility:auto when the perf rebuild lands. */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '9999px' : '0',
        transition: 'max-height 200ms ease',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          padding: '4px 12px 12px',
          ...bodyStyle,
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}
