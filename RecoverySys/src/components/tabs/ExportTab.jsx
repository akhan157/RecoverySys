import React, { useRef } from 'react'
import { SAVE_STATES, SHARE_STATES } from '../../lib/constants.js'

function downloadJson(state) {
  const payload = {
    _format: 'recoverysys-config-v1',
    exportedAt: new Date().toISOString(),
    config: state.config,
    specs: state.specs,
    customMotor: state.customMotor ?? null,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recoverysys-config-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportTab({ state, saveConfig, copyShareLink, onLoadConfig }) {
  const fileRef = useRef(null)

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (data._format !== 'recoverysys-config-v1' || !data.config || typeof data.config !== 'object' || !data.specs || typeof data.specs !== 'object') {
          alert('Invalid config file — must be a RecoverySys JSON export.')
          return
        }
        onLoadConfig({ config: data.config, specs: data.specs, customMotor: data.customMotor ?? null })
      } catch {
        alert('Failed to parse config file — not valid JSON.')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="mc-export">
      <h2 className="mc-panel-header" style={{ borderBottom: '1px solid var(--mc-border)' }}>
        EXPORT // SHARE_CONFIGURATION
      </h2>
      <div className="mc-export__content">
        <div className="mc-export__section">
          <div className="mc-metric__label">SAVE_TO_BROWSER</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Stores your current configuration in the browser's local storage.
            Your config will persist across sessions on this device.
          </div>
          <button className="mc-run-btn" onClick={saveConfig}>
            {state.saveState === SAVE_STATES.SAVING ? 'SAVING...' : state.saveState === SAVE_STATES.SAVED ? '✓ SAVED' : 'SAVE_CONFIG →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">SHARE_LINK</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Creates a URL encoding your entire configuration. Anyone who opens
            it will see your exact recovery bay setup. No account required.
          </div>
          <button className="mc-run-btn" onClick={copyShareLink}>
            {state.shareState === SHARE_STATES.COPIED ? '✓ COPIED_TO_CLIPBOARD' : 'COPY_SHARE_LINK →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">EXPORT_JSON</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Download your full configuration as a JSON file. Share with teammates,
            back up before changes, or template common setups.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mc-run-btn" onClick={() => downloadJson(state)}>
              DOWNLOAD_JSON &rarr;
            </button>
            <button className="mc-run-btn" onClick={() => fileRef.current?.click()}>
              IMPORT_JSON &rarr;
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">PRINT_CHECKLIST</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Print a recovery checklist with specs, selected parts, compatibility
            warnings, simulation results, and a packing order with checkboxes.
          </div>
          <button className="mc-run-btn" onClick={() => window.print()}>
            PRINT_CHECKLIST &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
