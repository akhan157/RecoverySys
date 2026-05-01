import { useState, useEffect, useMemo, useCallback } from 'react'
import { PARTS } from '../data/parts.js'
import { loadCustomParts, saveCustomPartsToStorage } from '../lib/storage.js'

/**
 * User-defined custom parts: persisted to localStorage, merged with the
 * static PARTS catalog into `allParts` for downstream consumers, with
 * CRUD callbacks that also clean up the active config when a referenced
 * part is deleted or edited.
 *
 * Why config + dispatch are params: deleteCustomPart needs to clear any
 * config slot that points at the deleted part, and editCustomPart needs
 * to update the slot when the edited part is currently selected. Without
 * this, the slot would either point at a stale object or a vanished id.
 *
 * The setCustomParts setter is also returned for callers that need to
 * merge in parts from outside the hook (the share-link loader inlines
 * custom parts from a sender's link into the receiver's catalog).
 *
 * Returns:
 *   - customParts:       the user's saved custom parts (array)
 *   - setCustomParts:    raw setter for cross-hook merges
 *   - allParts:          customParts ++ catalog PARTS, memoized
 *   - addCustomPart:     append one
 *   - deleteCustomPart:  remove one + clear matching config slot
 *   - editCustomPart:    replace one + update matching config slot
 */
export default function useCustomParts({ config, dispatch }) {
  const [customParts, setCustomParts] = useState(loadCustomParts)

  const allParts = useMemo(() => [...customParts, ...PARTS], [customParts])

  useEffect(() => { saveCustomPartsToStorage(customParts) }, [customParts])

  const addCustomPart = useCallback((part) => {
    setCustomParts(prev => [...prev, part])
  }, [])

  const deleteCustomPart = useCallback((id) => {
    setCustomParts(prev => prev.filter(p => p.id !== id))
    Object.entries(config).forEach(([category, selected]) => {
      if (selected?.id === id) dispatch({ type: 'REMOVE_PART', category })
    })
  }, [config, dispatch])

  const editCustomPart = useCallback((updatedPart) => {
    setCustomParts(prev => prev.map(p => p.id === updatedPart.id ? updatedPart : p))
    Object.entries(config).forEach(([category, selected]) => {
      if (selected?.id === updatedPart.id) dispatch({ type: 'SELECT_PART', category, part: updatedPart })
    })
  }, [config, dispatch])

  return {
    customParts,
    setCustomParts,
    allParts,
    addCustomPart,
    deleteCustomPart,
    editCustomPart,
  }
}
