import React, { useState, useRef } from 'react'
import { parseEng } from '../../lib/engParser.js'
import ThrustCurveSparkline from './ThrustCurveSparkline.jsx'
import Button from '../primitives/Button.jsx'
import MotorPill from '../primitives/MotorPill.jsx'

// Custom motor import (.eng file upload).
//
// Accepts RASP .eng files — the universal format exported by OpenMotor,
// downloadable from ThrustCurve.org, and readable by OpenRocket / RockSim.
// On successful parse, shows a preview card with the designation, key stats,
// and a mini thrust curve sparkline. User confirms to inject into state.
export default function CustomMotorImport({ customMotor, onSetCustomMotor, onClearCustomMotor, onToast }) {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)  // parsed motor waiting for confirm

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text !== 'string') {
        onToast('error', 'Could not read file')
        return
      }
      const result = parseEng(text)
      if (!result.success) {
        onToast('error', `Parse failed: ${result.error}`)
        return
      }
      setPreview(result.data)
    }
    reader.onerror = () => onToast('error', 'Could not read file')
    reader.readAsText(file)
    // Reset the input so re-selecting the same file still triggers onChange
    e.target.value = ''
  }

  const confirm = () => {
    onSetCustomMotor(preview)
    setPreview(null)
  }

  // Active motor — same pill as MotorSearch's selected state, via shared primitive
  if (customMotor && !preview) {
    return (
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
          Custom Motor <span style={{ fontWeight: 400, opacity: 0.7 }}>(.eng import)</span>
        </label>
        <MotorPill
          designation={customMotor.designation}
          meta={
            <span className="mono">
              {Math.round(customMotor.totalImpulse_ns)} Ns / {customMotor.burnTime_s.toFixed(2)}s / peak {Math.round(customMotor.peakThrust_N)} N
            </span>
          }
          onClear={onClearCustomMotor}
          clearTitle="Clear custom motor"
        />
      </div>
    )
  }

  // Preview waiting for confirm
  if (preview) {
    return (
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
          Custom Motor Preview
        </label>
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: '14px' }}>{preview.designation}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{preview.manufacturer}</span>
          </div>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
            <span>{preview.diameter_mm}×{preview.length_mm} mm</span>
            <span>{preview.propellant_kg.toFixed(3)} kg prop</span>
            <span>{Math.round(preview.totalImpulse_ns)} Ns total</span>
            <span>{preview.total_kg.toFixed(3)} kg total</span>
            <span>{preview.burnTime_s.toFixed(2)} s burn</span>
            <span>peak {Math.round(preview.peakThrust_N)} N</span>
          </div>
          <ThrustCurveSparkline curve={preview.curve} peak={preview.peakThrust_N} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button variant="accent" size="sm" onClick={confirm} style={{ flex: 1 }}>
              Use This Motor
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPreview(null)} style={{ flex: 1 }}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Idle — upload chip
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
        Custom Motor <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional — OpenMotor .eng import)</span>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".eng"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        className="parts-add-custom"
        onClick={() => fileInputRef.current?.click()}
      >
        + Import Custom Motor (.eng)
      </button>
    </div>
  )
}
