// ESLint flat config — permissive baseline. Pass 2 maintainability review
// flagged that the project had no lint config at all (plus two stale
// `eslint-disable-next-line` comments in App.jsx with no ESLint installed,
// which were dead pragmas). This config exists so:
//  - `npm run lint` is a real command future contributors can run
//  - new code gets caught by the recommended rule set immediately
//  - existing code isn't required to refactor today (most rules are 'warn')
//
// To tighten over time: flip rules from 'warn' to 'error' as the codebase
// converges. Add `no-magic-numbers` and a max-lines-per-function ceiling
// once the simulation.js / compatibility.js splits land (rebuild items #4, #5).

import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        WheelEvent: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        history: 'readonly',
        crypto: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        // Vite
        import: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: '18' },
    },
    rules: {
      // React-specific
      'react/jsx-uses-react': 'off',         // not needed in React 17+ with the new JSX transform
      'react/react-in-jsx-scope': 'off',     // same — no need to import React just for JSX
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',             // project doesn't use PropTypes
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Catch real bugs, not style
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-prototype-builtins': 'warn',

      // The schema.js + parseSpec story is incompatible with implicit fallbacks
      // — but tightening this is a future commit, not today.
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['src/test/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      // Tests can be more permissive — they're allowed to use magic numbers etc.
      'no-unused-vars': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      // landing page is a separate scroll-experience build with its own globals
      // (Lenis, gsap, ScrollTrigger from CDN) — lint when we vendor those locally.
      '../landing/**',
    ],
  },
]
