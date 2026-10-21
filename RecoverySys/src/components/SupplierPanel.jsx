import './SupplierPanel.css'
import { useEffect, useRef, useState } from 'react'
import {
  commercialStatus,
  fetchCommercialSnapshot,
  summarizeBudget,
} from '../lib/supplierCatalog.js'
import bundledSnapshot from '../../public/supplier-prices.json'
import { validateCommercialSnapshot } from '../lib/supplierCatalog.js'
import { MANUFACTURER_SHOPS } from '../data/supplierSources.js'

const money = (amount, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)

export default function SupplierPanel({ config }) {
  const [offers, setOffers] = useState(() => validateCommercialSnapshot(bundledSnapshot).offers)
  const [status, setStatus] = useState('idle')
  const [now, setNow] = useState(Date.now())
  const request = useRef(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      clearInterval(timer)
      request.current?.abort()
    }
  }, [])
  const refresh = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    const timer = setTimeout(() => controller.abort(), 15_000)
    try {
      const url =
        import.meta.env.VITE_SUPPLIER_SNAPSHOT_URL ||
        'https://raw.githubusercontent.com/akhan157/RecoverySys/main/RecoverySys/public/supplier-prices.json'
      const snapshot = await fetchCommercialSnapshot(url, controller.signal)
      if (controller.signal.aborted) return
      setOffers(snapshot.offers)
      setNow(Date.now())
      setStatus('loaded')
    } catch {
      if (request.current === controller) setStatus('error')
    } finally {
      clearTimeout(timer)
    }
  }
  const budget = summarizeBudget(config, offers, now)
  const parts = Object.values(config).filter(Boolean)
  return (
    <section className="supplier-panel" aria-label="Supplier prices and availability">
      <div className="supplier-panel__toolbar">
        <strong>PRICE & STOCK</strong>
        <button type="button" onClick={refresh} disabled={status === 'loading'}>
          {status === 'loading' ? 'Checking…' : 'Check price & stock'}
        </button>
      </div>
      {parts.length === 0 ? (
        <p>Select parts to see supplier information.</p>
      ) : (
        <p aria-live="polite">
          Known subtotal:{' '}
          {Object.entries(budget.totals)
            .map(([currency, amount]) => `${money(amount, currency)} ${currency}`)
            .join(' + ') || 'No recent prices'}
          . {budget.missing} unpriced; {budget.stale} stale (excluded); {budget.unavailable} with
          unavailable or unknown stock.{' '}
          {budget.missing + budget.stale > 0 ? 'Budget is incomplete.' : ''}
        </p>
      )}
      {status === 'error' && (
        <p role="status">
          Could not refresh supplier data. Any previous prices retain their original timestamps.
          Check the supplier directly.
        </p>
      )}
      <p className="supplier-panel__note">
        Snapshot only; one item per slot. Excludes tax, shipping and extra quantities.
      </p>
      <details className="supplier-panel__details">
        <summary>Selected parts &amp; supplier details ({parts.length})</summary>
        <p className="supplier-panel__note">
          Supplier snapshots, not checkout quotes. One item per selected slot; excludes tax,
          shipping and required extra quantities. Stock can change before purchase.
        </p>
        {status === 'idle' && (
          <p className="supplier-panel__note">
            Showing bundled supplier data. Check for a newer published snapshot via GitHub. No plan
            data is sent; planning works offline.
          </p>
        )}
        <ul className="supplier-panel__legend">
          {parts.map((part) => {
            const offer = offers.find(
              (candidate) => candidate.partId === part.id && !part.id.startsWith('custom-')
            )
            const stale = offer && commercialStatus(offer, now) === 'stale'
            const url = offer?.url || MANUFACTURER_SHOPS[part.manufacturer]
            return (
              <li key={`${part.category}:${part.id}`}>
                <strong>{part.name}</strong>
                <br />
                {offer ? (
                  <>
                    <span>
                      {money(offer.price, offer.currency)} ·{' '}
                      {stale
                        ? 'Stale snapshot; current stock unknown'
                        : offer.stock === 'in-stock'
                          ? 'Reported in stock'
                          : offer.stock === 'out-of-stock'
                            ? 'Reported out of stock'
                            : 'Stock unknown'}
                    </span>
                    <br />
                    <small>
                      {offer.productTitle} · {offer.variantTitle}
                      <br />
                      Retrieved {new Date(offer.fetchedAt).toLocaleString()}
                    </small>
                  </>
                ) : (
                  <span>Price and stock unknown</span>
                )}
                {url && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Check supplier
                    </a>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </details>
    </section>
  )
}
