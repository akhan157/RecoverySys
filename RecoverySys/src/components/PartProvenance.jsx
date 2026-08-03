import { provenanceForPart } from '../data/catalogProvenance.js'

export default function PartProvenance({ part, compact = false }) {
  if (!part) return null
  const provenance = provenanceForPart(part)
  const userSupplied = part.manufacturer === 'Custom' || !provenance

  return (
    <span
      className={`mc-provenance ${compact ? 'mc-provenance--compact' : ''}`}
      title={
        userSupplied
          ? 'User-supplied part data; source and specifications have not been independently verified.'
          : `${provenance.title}. Catalog data is unverified and is not a manufacturer verification.`
      }
      aria-label={
        userSupplied
          ? 'User-supplied part data; not independently verified'
          : `Catalog provenance: ${provenance.title}; unverified, not manufacturer verified`
      }
    >
      {userSupplied ? 'USER-SUPPLIED DATA' : 'CATALOG DATA · UNVERIFIED'}
    </span>
  )
}
