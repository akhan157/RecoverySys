import snapshot from '../../public/supplier-prices.json'
import mappings from '../data/supplierMappings.json'
import { describe, expect, it } from 'vitest'
import {
  COMMERCIAL_MAX_AGE_MS,
  validateCommercialSnapshot,
  commercialStatus,
  summarizeBudget,
} from '../lib/supplierCatalog.js'
const now = Date.parse('2026-10-19T01:00:00Z')
const offer = {
  partId: 'main',
  supplier: 'rocketman',
  variantId: '123',
  productTitle: 'Main',
  variantTitle: '24 in',
  url: 'https://www.the-rocketman.com/products/main?variant=123',
  price: 19.95,
  currency: 'USD',
  stock: 'in-stock',
  fetchedAt: new Date(now).toISOString(),
}
const config = { main_chute: { id: 'main' }, drogue_chute: { id: 'missing' } }
describe('commercial catalog boundary and budget', () => {
  it('ships only valid, explicitly mapped commercial offers', () => {
    const result = validateCommercialSnapshot(snapshot)
    expect(result.offers.length).toBeGreaterThan(0)
    for (const item of result.offers)
      expect(
        mappings.mappings.some(
          (mapping) =>
            mapping.partId === item.partId &&
            mapping.supplier === item.supplier &&
            mapping.variantId === item.variantId
        )
      ).toBe(true)
  })
  it('preserves unknowns and excludes stale prices without mixing currencies', () => {
    expect(summarizeBudget(config, [offer], now)).toEqual({
      totals: { USD: 19.95 },
      missing: 1,
      stale: 0,
      unavailable: 0,
    })
    expect(summarizeBudget(config, [offer], now + COMMERCIAL_MAX_AGE_MS + 1)).toEqual({
      totals: {},
      missing: 1,
      stale: 1,
      unavailable: 0,
    })
    expect(
      summarizeBudget(
        { a: { id: 'main' }, b: { id: 'euro' } },
        [offer, { ...offer, partId: 'euro', currency: 'EUR', stock: 'out-of-stock', price: 5 }],
        now
      )
    ).toEqual({ totals: { USD: 19.95, EUR: 5 }, missing: 0, stale: 0, unavailable: 1 })
  })
  it('rejects unsafe URLs, impossible prices, invalid dates, duplicates and unbounded records', () => {
    for (const changes of [
      { url: 'javascript:alert(1)' },
      { url: 'https://evil.example/products/main' },
      { price: -1 },
      { price: '19' },
      { fetchedAt: 'yesterday' },
      { currency: 'unknown' },
      { variantId: 'bad' },
    ])
      expect(() =>
        validateCommercialSnapshot({ version: 1, offers: [{ ...offer, ...changes }] })
      ).toThrow()
    expect(() => validateCommercialSnapshot({ version: 1, offers: [offer, offer] })).toThrow(
      /Duplicate/
    )
    expect(() =>
      validateCommercialSnapshot({ version: 1, offers: Array(2001).fill(offer) })
    ).toThrow()
  })
  it('treats future dates as stale and strips engineering values at the boundary', () => {
    expect(
      commercialStatus({ ...offer, fetchedAt: new Date(now + 3600000).toISOString() }, now)
    ).toBe('stale')
    expect(
      validateCommercialSnapshot({ version: 1, offers: [{ ...offer, specs: { cd: 2 } }] }).offers[0]
        .specs
    ).toBeUndefined()
  })
})
