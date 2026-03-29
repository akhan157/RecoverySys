/**
 * rc.js — Runtime configuration loader
 *
 * Operators who self-host RecoverySys can place a `recoverysys.rc.json`
 * file alongside the app to set site-wide spec defaults for first-time
 * visitors (no saved session, no share link).
 *
 * Priority order (highest → lowest):
 *   1. URL ?c= share link
 *   2. localStorage saved session
 *   3. recoverysys.rc.json (this file)
 *   4. DEFAULT_SPECS code defaults
 *
 * Format:
 *   {
 *     "specs": {
 *       "main_deploy_alt_ft": "800",
 *       "drag_cd": "0.6"
 *     }
 *   }
 *
 * Only `specs` keys are supported. Unknown keys are silently ignored.
 * All values are coerced to strings to match the App state shape.
 */

const RC_PATH = '/recoverysys.rc.json'

/**
 * Fetch and parse the rc config file.
 * Returns the parsed object, or null if the file is absent or invalid.
 */
export async function fetchRcConfig() {
  try {
    const res = await fetch(RC_PATH)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Validate and extract spec overrides from a parsed rc config object.
 *
 * @param {unknown}  rcConfig   - Parsed JSON (may be null/undefined/arbitrary)
 * @param {Set<string>} validKeys - Set of known spec keys from DEFAULT_SPECS
 * @returns {Record<string, string>} Safe key→string-value map (may be empty)
 */
export function extractRcSpecs(rcConfig, validKeys) {
  if (!rcConfig || typeof rcConfig !== 'object' || Array.isArray(rcConfig)) return {}
  const raw = rcConfig.specs
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!validKeys.has(key)) continue
    // Coerce to string — the app stores all spec values as strings
    const str = typeof value === 'string' ? value : String(value)
    result[key] = str
  }
  return result
}
