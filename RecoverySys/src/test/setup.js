import '@testing-library/jest-dom'
// Node 22 exposes a disabled global localStorage accessor unless Vitest is
// launched with --localstorage-file. Prefer jsdom's origin-backed stores and
// fall back to an isolated in-memory store when the environment omits them.
function createMemoryStorage() {
  const values = new Map()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => (values.has(String(key)) ? values.get(String(key)) : null),
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value)),
  }
}

if (typeof window !== 'undefined') {
  const storage = (() => {
    try {
      return window.localStorage ?? createMemoryStorage()
    } catch {
      return createMemoryStorage()
    }
  })()
  const sessionStorage = (() => {
    try {
      return window.sessionStorage ?? createMemoryStorage()
    } catch {
      return createMemoryStorage()
    }
  })()

  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, value: sessionStorage })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStorage,
  })
}
