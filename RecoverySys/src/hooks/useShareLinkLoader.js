import { useEffect } from 'react'
import { decodeSharePayload, SHARE_PARAM } from '../lib/shareLink.js'
import { SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'
import { TOAST_LEVELS } from '../lib/constants.js'

/**
 * On first mount, look for a `?c=...` share-link payload in the URL. If
 * present and decodable, replace state via LOAD_SHARE, toast the user
 * about any catalog parts that are no longer in the catalog, merge any
 * inlined custom parts into the user's local catalog (skipping ids
 * already present), and toast the import count.
 *
 * Runs exactly once — `allParts` and the toast/setCustomParts callbacks
 * are intentionally read at mount time (the share link is parsed once;
 * re-running on `allParts` change would re-import after the user adds
 * a new local custom part).
 */
export default function useShareLinkLoader({ allParts, addToast, setCustomParts, dispatch }) {
  useEffect(() => {
    const c = new URLSearchParams(location.search).get(SHARE_PARAM)
    if (!c) return
    const decoded = decodeSharePayload(c, {
      allParts, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG,
    })
    if (!decoded) return   // malformed or future-version — silently ignore

    dispatch({
      type: 'LOAD_SHARE',
      config: decoded.config,
      specs: decoded.specs,
      customMotor: decoded.customMotor,
    })

    if (decoded.catalogMissing > 0) {
      addToast(
        TOAST_LEVELS.WARN,
        `${decoded.catalogMissing} part${decoded.catalogMissing > 1 ? 's' : ''} from this link are no longer in the catalog.`,
      )
    }

    if (decoded.inlinedCustomParts?.length > 0) {
      let importedCount = 0
      setCustomParts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const newParts = decoded.inlinedCustomParts.filter(p => !existingIds.has(p.id))
        importedCount = newParts.length
        return importedCount > 0 ? [...prev, ...newParts] : prev
      })
      if (importedCount > 0) {
        addToast(
          TOAST_LEVELS.OK,
          `Imported ${importedCount} custom part${importedCount > 1 ? 's' : ''} from share link.`,
        )
      }
    }

    if (decoded.customMissing > 0) {
      addToast(
        TOAST_LEVELS.WARN,
        `${decoded.customMissing} custom part${decoded.customMissing > 1 ? 's' : ''} in this link can't be loaded.`,
      )
    }
    // Mount-once: link is parsed exactly once at first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
