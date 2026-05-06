import React from 'react'
import { CATEGORIES } from '../../data/parts.js'
import ConfigBuilder from '../ConfigBuilder.jsx'

export default function SpecsTab({
  state, setSpec, removePart, setCategory, saveConfig, copyShareLink,
  setCustomMotor, clearCustomMotor, addToast,
}) {
  return (
    <div className="mc-specs-panel">
      <h2 className="mc-panel-header">ROCKET_SPECS</h2>
      <div className="mc-specs-content">
        <ConfigBuilder
          categories={CATEGORIES}
          config={state.config}
          specs={state.specs}
          warnings={state.warnings}
          saveState={state.saveState}
          shareState={state.shareState}
          onRemovePart={removePart}
          onSetSpec={setSpec}
          onSave={saveConfig}
          onShare={copyShareLink}
          onSelectCategory={setCategory}
          customMotor={state.customMotor}
          onSetCustomMotor={setCustomMotor}
          onClearCustomMotor={clearCustomMotor}
          onToast={addToast}
        />
      </div>
    </div>
  )
}
