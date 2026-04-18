import React from 'react'

export default function ExportTab({ state, saveConfig, copyShareLink }) {
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
            {state.saveState === 'saving' ? 'SAVING...' : state.saveState === 'saved' ? '✓ SAVED' : 'SAVE_CONFIG →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">SHARE_LINK</div>
          <div style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '6px 0 12px', lineHeight: 1.6 }}>
            Creates a URL encoding your entire configuration. Anyone who opens
            it will see your exact recovery bay setup. No account required.
          </div>
          <button className="mc-run-btn" onClick={copyShareLink}>
            {state.shareState === 'copied' ? '✓ COPIED_TO_CLIPBOARD' : 'COPY_SHARE_LINK →'}
          </button>
        </div>
      </div>
    </div>
  )
}
