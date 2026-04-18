import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEng } from '../lib/engParser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')

describe('parseEng', () => {
  describe('valid files', () => {
    it('parses the AeroTech K550W fixture', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      expect(result.success).toBe(true)
      const m = result.data
      expect(m.designation).toBe('K550W')
      expect(m.diameter_mm).toBe(54)
      expect(m.length_mm).toBe(410)
      expect(m.delays).toBe('P')
      expect(m.propellant_kg).toBeCloseTo(0.919, 3)
      expect(m.total_kg).toBeCloseTo(1.838, 3)
      expect(m.manufacturer).toBe('AT')
    })

    it('computes total impulse via trapezoidal integration', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      // Approximated curve should integrate to ~1300-1700 Ns (K class range)
      expect(result.data.totalImpulse_ns).toBeGreaterThan(1000)
      expect(result.data.totalImpulse_ns).toBeLessThan(2600)
    })

    it('computes burn time as time of last non-zero thrust sample', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      // Last non-zero sample is at t=2.85 (120 N)
      expect(result.data.burnTime_s).toBe(2.85)
    })

    it('computes peak thrust as max over the curve', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      expect(result.data.peakThrust_N).toBe(850)
    })

    it('prepends implicit (0, 0) when first sample is after t=0', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      // First curve point should now be (0, 0) even though the file starts at 0.04
      expect(result.data.curve[0]).toEqual({ t: 0, thrust_N: 0 })
      expect(result.data.curve[1].t).toBe(0.04)
    })

    it('ignores semicolon comment lines', () => {
      const input = `; this is a comment
; another one
F32 24 124 P .038 .07 RV
  0.05 50
  1.00  0
`
      const result = parseEng(input)
      expect(result.success).toBe(true)
      expect(result.data.designation).toBe('F32')
    })

    it('handles Windows CRLF line endings', () => {
      const input = [
        'F32 24 124 P .038 .07 RV',
        '  0.05 50',
        '  1.00  0',
      ].join('\r\n')
      const result = parseEng(input)
      expect(result.success).toBe(true)
      expect(result.data.curve.length).toBe(3) // implicit (0,0) + 2 data points
    })

    it('handles old Mac CR line endings', () => {
      const input = 'F32 24 124 P .038 .07 RV\r  0.05 50\r  1.00  0\r'
      const result = parseEng(input)
      expect(result.success).toBe(true)
      expect(result.data.designation).toBe('F32')
    })

    it('preserves curve monotonicity in time', () => {
      const result = parseEng(fixture('aerotech-k550.eng'))
      const times = result.data.curve.map(p => p.t)
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1])
      }
    })
  })

  describe('rejects malformed input', () => {
    it('rejects empty input', () => {
      expect(parseEng('').success).toBe(false)
      expect(parseEng(null).success).toBe(false)
      expect(parseEng(undefined).success).toBe(false)
    })

    it('rejects a header with too few fields', () => {
      const result = parseEng('K550 54 410\n  0.1 500\n  1.0   0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/header/i)
    })

    it('rejects non-numeric diameter', () => {
      const result = parseEng('K550 abc 410 P .9 1.8 AT\n  0.1 500\n  1.0  0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/diameter/i)
    })

    it('rejects negative propellant mass', () => {
      const result = parseEng('K550 54 410 P -0.9 1.8 AT\n  0.1 500\n  1.0  0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/propellant/i)
    })

    it('rejects propellant mass greater than total mass', () => {
      const result = parseEng('K550 54 410 P 2.0 1.0 AT\n  0.1 500\n  1.0  0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/total.*propellant|propellant.*total/i)
    })

    it('rejects non-monotonic time in data', () => {
      const result = parseEng('K550 54 410 P .9 1.8 AT\n  0.2 500\n  0.1 600\n  1.0 0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/strictly after|monotonic/i)
    })

    it('rejects negative thrust', () => {
      const result = parseEng('K550 54 410 P .9 1.8 AT\n  0.1 -500\n  1.0 0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/thrust/i)
    })

    it('rejects when final sample is not zero thrust', () => {
      const result = parseEng('K550 54 410 P .9 1.8 AT\n  0.1 500\n  1.0 200\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/zero thrust/i)
    })

    it('rejects fewer than 2 data points', () => {
      const result = parseEng('K550 54 410 P .9 1.8 AT\n  0.1 0\n')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/at least 2/i)
    })
  })

  describe('trapezoidal integration accuracy', () => {
    it('computes impulse of a simple triangle correctly', () => {
      // Triangle: 0 → 1000 N at t=1s → 0 at t=2s
      // Total area: 0.5 * 2 * 1000 = 1000 Ns
      const input = 'TEST 24 100 P .1 .2 RV\n  1.0 1000\n  2.0    0\n'
      const result = parseEng(input)
      expect(result.success).toBe(true)
      expect(result.data.totalImpulse_ns).toBeCloseTo(1000, 1)
    })

    it('computes impulse of a square pulse correctly', () => {
      // Square-ish: 0 → 500 N between t=0.001 and t=1.999, → 0 at t=2.0
      // Area ≈ 500 * 2 = 1000 Ns (with tiny triangular ramps)
      const input = 'TEST 24 100 P .1 .2 RV\n  0.001 500\n  1.999 500\n  2.000   0\n'
      const result = parseEng(input)
      expect(result.success).toBe(true)
      expect(result.data.totalImpulse_ns).toBeCloseTo(1000, 0)
    })
  })
})
