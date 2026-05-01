import { useState, useEffect } from 'react'
import { loadTheme, saveTheme } from '../lib/storage.js'

/**
 * Persisted dark-mode state. Reads initial value from localStorage (or
 * the OS prefers-color-scheme fallback that loadTheme() handles); applies
 * `data-theme="dark"` to <html> while the flag is true; writes back to
 * localStorage on every change.
 *
 * Pre-paint flash is prevented separately by the inline script in
 * index.html which reads the same key BEFORE React mounts. This hook
 * picks up where that script left off.
 *
 * Returns [darkMode, setDarkMode] just like useState so call sites
 * don't have to change.
 */
export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(loadTheme)

  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark')
    else          document.documentElement.removeAttribute('data-theme')
    saveTheme(darkMode)
  }, [darkMode])

  return [darkMode, setDarkMode]
}
