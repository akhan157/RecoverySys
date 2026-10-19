/* global TextDecoder */
import { SUPPLIERS } from '../data/supplierSources.js'

export const COMMERCIAL_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const COMMERCIAL_MAX_BYTES = 2_000_000

export function validateCommercialSnapshot(raw) {
  if (raw?.version !== 1 || !Array.isArray(raw.offers) || raw.offers.length > 2000)
    throw new Error('Unsupported supplier snapshot')
  const offers = []
  const keys = new Set()
  for (const offer of raw.offers) {
    if (
      !offer ||
      !SUPPLIERS[offer.supplier] ||
      typeof offer.partId !== 'string' ||
      offer.partId.length > 200 ||
      typeof offer.variantId !== 'string' ||
      !/^\d{1,30}$/.test(offer.variantId)
    )
      throw new Error('Invalid supplier identity')
    const url = new URL(offer.url)
    if (url.origin !== SUPPLIERS[offer.supplier].baseUrl || !url.pathname.startsWith('/products/'))
      throw new Error('Invalid supplier product URL')
    if (
      !Number.isFinite(offer.price) ||
      offer.price < 0 ||
      offer.price > 1e8 ||
      !/^[A-Z]{3}$/.test(offer.currency) ||
      !['in-stock', 'out-of-stock', 'unknown'].includes(offer.stock) ||
      !Number.isFinite(Date.parse(offer.fetchedAt))
    )
      throw new Error('Invalid supplier price or date')
    if (
      typeof offer.variantTitle !== 'string' ||
      offer.variantTitle.length > 500 ||
      typeof offer.productTitle !== 'string' ||
      offer.productTitle.length > 500
    )
      throw new Error('Invalid supplier description')
    const key = `${offer.partId}:${offer.supplier}:${offer.variantId}`
    if (keys.has(key)) throw new Error('Duplicate supplier offer')
    keys.add(key)
    offers.push({
      partId: offer.partId,
      supplier: offer.supplier,
      variantId: offer.variantId,
      productTitle: offer.productTitle,
      variantTitle: offer.variantTitle,
      url: url.href,
      price: offer.price,
      currency: offer.currency,
      stock: offer.stock,
      fetchedAt: offer.fetchedAt,
    })
  }
  return { version: 1, offers }
}

export function commercialStatus(offer, now = Date.now()) {
  const age = now - Date.parse(offer.fetchedAt)
  return age < -5 * 60 * 1000 || age > COMMERCIAL_MAX_AGE_MS ? 'stale' : 'recent'
}

export function summarizeBudget(config, offers = [], now = Date.now()) {
  const totals = {}
  let missing = 0
  let stale = 0
  let unavailable = 0
  for (const part of Object.values(config ?? {}).filter(Boolean)) {
    const offer = offers.find(
      (candidate) => candidate.partId === part.id && !part.id.startsWith('custom-')
    )
    if (!offer) {
      missing++
      continue
    }
    const status = commercialStatus(offer, now)
    if (status === 'stale') {
      stale++
      continue
    }
    const amount = Math.round(offer.price * 100)
    totals[offer.currency] = (totals[offer.currency] ?? 0) + amount
    if (offer.stock !== 'in-stock') unavailable++
  }
  return {
    totals: Object.fromEntries(
      Object.entries(totals).map(([currency, cents]) => [currency, cents / 100])
    ),
    missing,
    stale,
    unavailable,
  }
}

// Bundled data works offline; network refresh starts only on request.
export async function fetchCommercialSnapshot(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store', credentials: 'omit' })
  if (!response.ok) throw new Error('Supplier snapshot unavailable')
  if (Number(response.headers.get('content-length')) > COMMERCIAL_MAX_BYTES)
    throw new Error('Supplier snapshot exceeds size limit')
  const reader = response.body.getReader()
  const chunks = []
  let bytes = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > COMMERCIAL_MAX_BYTES) throw new Error('Supplier snapshot exceeds size limit')
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const joined = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.length
  }
  return validateCommercialSnapshot(JSON.parse(new TextDecoder().decode(joined)))
}
