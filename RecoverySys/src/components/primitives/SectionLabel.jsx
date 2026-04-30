import React from 'react'

/**
 * Section divider label — small uppercase tertiary-color text used to title
 * sections within panels, tabs, and forms.
 *
 * Pass 1 / Pass 2 reviews found this pattern reimplemented inline 12+ times
 * across ConfigBuilder, PartsBrowser, RocketSpecs, CompareTab, FlightLogTab
 * with subtle drift (fontSize 10 vs 11, letterSpacing 0.04em vs 0.05em,
 * --text-tertiary vs --mc-text-dim). This primitive is the canonical version.
 *
 * Visual rule (from DESIGN.md): 10px / weight 600 / uppercase / letter-spacing
 * 0.05em / --text-tertiary. Sized deliberately small — it orients, doesn't
 * compete with content.
 *
 * Variant prop lets two contexts opt in:
 *   - default: inside a flat panel
 *   - 'panel-header': slightly larger (11px) for top-of-panel titles like
 *     PartsBrowser's "MAIN CHUTE" tab heading
 *
 * The textTransform: uppercase is applied via CSS so callers can write either
 * case ('Components' or 'COMPONENTS') and get consistent visual output.
 */
export default function SectionLabel({ variant = 'default', style, children, ...rest }) {
  const isHeader = variant === 'panel-header'
  return (
    <div
      style={{
        fontSize: isHeader ? '11px' : '10px',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
