import React from 'react'

/**
 * Shared button primitive. Pass 2 found 4 distinct button visual styles
 * reimplemented inline across ConfigBuilder, RocketSpecs, SuggestPanel,
 * CustomMotorImport, FlightLogTab, PartsBrowser, with subtly different
 * hover handlers and transition values. This primitive consolidates
 * the three variants that differ only in color treatment.
 *
 * Variants (per DESIGN.md):
 *   - 'primary'   — full --cta-bg fill (slate-dark in light, light slate in dark).
 *                   The "do the thing" CTA: Save Config, Run Sim, Confirm.
 *   - 'secondary' — transparent fill, 1px --border-default. Hover swaps border
 *                   to --accent. The "second action" pair partner: Copy Share
 *                   Link, Cancel, Dismiss.
 *   - 'accent'    — full --accent fill (mid-grey slate). Slightly less weight
 *                   than primary; used for nested confirms like "Use This Motor".
 *
 * Hover/active behavior matches the existing inline pattern: subtle 1px
 * translateY lift on hover, neutral on press. No JS needed — the lift is
 * handled by inline mouseEnter/Leave/Down callbacks (CSS transitions provide
 * the smoothness).
 *
 * size:
 *   - 'md' (default) — 32px height, 13px text, 16px x-padding. Standard CTA.
 *   - 'sm'           — 24px height, 12px text, 10px x-padding. Inline / nested.
 *
 * Custom styles can be passed through `style` and `className` for one-off
 * spacing tweaks. Color, border, and radius come from the variant —
 * overriding those defeats the purpose of the primitive.
 */

const VARIANT_BASE = {
  primary: {
    background: 'var(--cta-bg)',
    color: 'var(--cta-fg)',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  },
  accent: {
    background: 'var(--accent)',
    color: 'var(--accent-text)',
    border: '1px solid var(--accent)',
  },
}

const SIZE_BASE = {
  md: { height: '32px', padding: '0 16px', fontSize: '13px' },
  sm: { height: '24px', padding: '0 10px', fontSize: '12px' },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  children,
  style,
  className,
  ...rest
}) {
  const variantStyle = VARIANT_BASE[variant] ?? VARIANT_BASE.primary
  const sizeStyle    = SIZE_BASE[size]       ?? SIZE_BASE.md
  const isDisabled   = disabled || loading

  const handleEnter = (e) => {
    if (isDisabled) return
    e.currentTarget.style.transform = 'translateY(-1px)'
    if (variant === 'primary' || variant === 'accent') {
      e.currentTarget.style.opacity = '0.9'
    } else {
      e.currentTarget.style.borderColor = 'var(--accent)'
    }
  }
  const handleLeave = (e) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.opacity = ''
    if (variant === 'secondary') {
      e.currentTarget.style.borderColor = 'var(--border-default)'
    }
  }
  const handleDown = (e) => {
    if (isDisabled) return
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleDown}
      className={className}
      style={{
        ...variantStyle,
        ...sizeStyle,
        borderRadius: 'var(--radius)',
        cursor: isDisabled ? 'default' : 'pointer',
        fontWeight: variant === 'primary' || variant === 'accent' ? 500 : 400,
        opacity: isDisabled ? 0.7 : 1,
        transition: 'transform 150ms ease, opacity 150ms ease, border-color 200ms ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
