/**
 * Schema migrations for persisted payloads (localStorage CONFIG + share link).
 *
 * Pass 2's data-migration review found that no payload carried a version
 * field, so any future schema change would silently corrupt old saved data.
 * This module registers an ordered chain of migrators keyed by `from` version.
 * `runMigrations` walks the chain until the payload reaches the current
 * SCHEMA_VERSION, then stamps the version in. Migrators are pure functions
 * that take a payload and return a new (or mutated) payload.
 *
 * Adding a new migration:
 *   1. Bump SCHEMA_VERSION in lib/schema.js.
 *   2. Append `{ from: <prev>, to: <new>, migrate(p) { ... } }` here.
 *   3. Make the migration idempotent so re-running it is safe.
 */

import { SCHEMA_VERSION } from './schema.js'

const MIGRATIONS = [
  // v0 → v1: pre-versioning data. Older builds wrote payloads without a
  // schemaVersion field. The historical airframe_od_in → airframe_id_in
  // rewrite (wall thickness negligible for HPR sim) lives here so it runs
  // on first load after upgrade. Idempotent: no-op if airframe_od_in is
  // absent or airframe_id_in is already set.
  {
    from: 0,
    to: 1,
    migrate(payload) {
      if (payload?.specs?.airframe_od_in != null &&
          payload?.specs?.airframe_id_in == null) {
        payload.specs.airframe_id_in = payload.specs.airframe_od_in
      }
      // Always remove the ghost key so it doesn't pollute state.specs even
      // if airframe_id_in was already populated.
      if (payload?.specs && 'airframe_od_in' in payload.specs) {
        delete payload.specs.airframe_od_in
      }
      return payload
    },
  },
]

/**
 * Walk a payload up to the current SCHEMA_VERSION via registered migrators.
 *
 * Behavior:
 *   - Missing schemaVersion is treated as v0 (pre-versioning).
 *   - If a migrator is missing for the current version, returns the payload
 *     as-is at whatever version it reached. Caller can detect via
 *     `payload.schemaVersion < SCHEMA_VERSION`.
 *   - If schemaVersion > SCHEMA_VERSION (forward incompatibility), returns
 *     the payload unchanged so callers can decide whether to reject or
 *     attempt a best-effort decode.
 */
export function runMigrations(payload, currentVersion = SCHEMA_VERSION) {
  if (payload == null || typeof payload !== 'object') return payload
  let v = Number.isFinite(payload.schemaVersion) ? payload.schemaVersion : 0
  let p = payload
  while (v < currentVersion) {
    const m = MIGRATIONS.find(x => x.from === v)
    if (!m) break
    p = m.migrate(p) ?? p
    v = m.to
  }
  if (p && typeof p === 'object') p.schemaVersion = v
  return p
}

/**
 * True when the payload claims a version newer than this build understands.
 * Callers use this to toast "this link was created with a newer version of
 * the app" instead of silently corrupting fields.
 */
export function isPayloadFromFuture(payload) {
  const v = Number.isFinite(payload?.schemaVersion) ? payload.schemaVersion : 0
  return v > SCHEMA_VERSION
}
