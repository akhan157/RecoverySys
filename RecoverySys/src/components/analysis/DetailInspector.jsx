import CollapsibleGroup from '../primitives/CollapsibleGroup.jsx'
import SectionLabel from '../primitives/SectionLabel.jsx'
import StatusChip from '../primitives/StatusChip.jsx'
import './AnalysisPrimitives.css'

function textValue(value, fallback = 'Not provided') {
  if (value == null || value === '') return fallback
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  if (typeof value === 'object') return value.label ?? value.name ?? JSON.stringify(value)
  return String(value)
}

function DetailFact({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{textValue(value)}</dd>
    </div>
  )
}

export default function DetailInspector({ row, detail, onClose }) {
  const source = detail ?? row?.detail ?? row?.details ?? {}
  const finding = row?.finding && typeof row.finding === 'object' ? row.finding : {}
  const selected = row || detail

  if (!selected) {
    return (
      <aside className="analysis-detail-inspector" aria-label="Analysis detail inspector">
        <div className="analysis-detail-inspector__header">
          <SectionLabel>Detail inspector</SectionLabel>
          <StatusChip status="neutral" label="No row selected" />
        </div>
        <p className="analysis-detail-inspector__empty">
          Select a review row to inspect its estimate, criterion, inputs, remediation, method, and
          provenance.
        </p>
      </aside>
    )
  }

  const title = row?.affectedOutcome ?? row?.outcome ?? source.title ?? 'Selected review item'
  const state = finding.state ?? row?.state ?? source.state
  const stateLabel = state === 'unknown' || state === 'not-evaluated' ? 'Not evaluated' : state

  return (
    <aside className="analysis-detail-inspector" aria-label="Analysis detail inspector">
      <div className="analysis-detail-inspector__header">
        <div className="analysis-detail-inspector__identity">
          <SectionLabel>Detail inspector</SectionLabel>
          <strong>{title}</strong>
        </div>
        <div>
          {stateLabel && (
            <StatusChip
              status={stateLabel === 'Not evaluated' ? 'neutral' : 'warn'}
              label={stateLabel}
            />
          )}
          {onClose && (
            <button type="button" className="analysis-detail-inspector__close" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <dl className="analysis-detail-inspector__facts">
        <DetailFact label="Driver" value={row?.driver ?? row?.cause} />
        <DetailFact label="Affected outcome" value={row?.affectedOutcome ?? row?.outcome} />
        <DetailFact label="Estimate" value={source.estimate ?? finding.value ?? row?.value} />
        <DetailFact label="Criterion" value={source.criterion} />
        <DetailFact label="Affected inputs" value={source.affectedInputs ?? row?.inputPaths} />
        <DetailFact
          label="Remediation"
          value={source.remediation ?? row?.remediation ?? row?.action?.label}
        />
      </dl>

      {(source.consequence || finding.message || row?.consequence) && (
        <div className="analysis-detail-inspector__section">
          <span className="analysis-detail-inspector__label">Consequence</span>
          <p>{textValue(source.consequence ?? finding.message ?? row.consequence)}</p>
        </div>
      )}

      <CollapsibleGroup label="Supporting detail">
        <div className="analysis-detail-inspector__facts">
          <DetailFact label="Method" value={source.method ?? source.methodVersion} />
          <DetailFact label="Assumptions" value={source.assumptions} />
          <DetailFact label="Provenance" value={source.provenance ?? source.evidenceIds} />
          <DetailFact label="Reason code" value={finding.code ?? row?.code ?? source.reasonCode} />
        </div>
      </CollapsibleGroup>
    </aside>
  )
}

export { textValue }
