# Collector Access Spike

Purpose: choose the collector that can support the reliability-first app plan.

## Plan Guardrails

- Reliability first: do not accept coordinate-only data as sufficient.
- Strict collector contract: location, observation timestamp, freshness age, accuracy/confidence, new-vs-repeated status, and failure reason.
- Local only: do not sync pet location data to a hosted service.
- Secrets stay local: never commit `Auth/secrets.json`, `.env`, browser cookies, or token dumps.

## Test Order

1. Unofficial sync tooling derived from `GoogleFindMyTools`.
2. Android automation against Find Hub.
3. Browser scraping from `android.com/find`.

## Candidate 1: Unofficial Sync Tooling

Primary candidates:

- `leonboe1/GoogleFindMyTools`
- `traccar/google-find-hub-sync`
- `BSkando/GoogleFindMy-HA` as a reference for grading, polling, and Home Assistant integration behavior

Why first: these tools are the only path likely to return structured Find Hub device data rather than screenshots or UI text.

Local inspection found that `traccar/google-find-hub-sync` exposes:

- `GET /devices` -> `{ "devices": [{ "name": "...", "id": "..." }] }`
- `GET /devices/<device_id>/location` -> `{ "locations": [...] }`

Location records can include `latitude`, `longitude`, `time`, `accuracy`, `status`, and `is_own_report`, which is enough to attempt the strict collector contract.

Live result: `leonboe1/GoogleFindMyTools` is the current working collector path. `traccar/google-find-hub-sync` failed on Firebase install auth with `API_KEY_ANDROID_APP_BLOCKED`; keep it as reference code, not the active collector.

The working cached-auth command is:

```powershell
cd C:\Users\adnan\Projects\outdoor-pet-route-logger
.\spikes\collector-access\.venv312\Scripts\python.exe .\spikes\collector-access\collect_googlefindmytools.py
```

It emits normalized JSON for the app collector contract.

Known constraints from upstream docs:

- Latest Google Chrome is required for initial authentication.
- Initial auth writes sensitive credentials to `Auth/secrets.json`.
- GoogleFindMy-HA says the authentication sequence may require two login flows before valid location data appears.
- Traccar's service warns that this is not intended for high-frequency tracking; do not abuse polling or risk Google rate limits.

## Viability Checklist

For a real Moto Tag test, record whether the collector returns:

- [x] Device list includes the Moto Tag.
- [x] Device identifier is stable across runs.
- [x] Latest latitude/longitude is available.
- [x] Observation timestamp is available.
- [x] Freshness age can be calculated.
- [x] Accuracy or confidence signal is available.
- [ ] A repeated old observation can be detected.
- [x] Failure reasons can be captured.
- [ ] Polling at 10-minute cadence appears safe.

## Do Not Do Yet

- Do not build the app UI.
- Do not create a hosted dashboard.
- Do not commit secrets or raw location history.
- Do not run aggressive polling.

## Local Normalizer

`normalize_google_find_hub.py` converts the Traccar-style `/location` JSON into the app's collector contract:

```powershell
python .\spikes\collector-access\normalize_google_find_hub.py .\spikes\collector-access\sample_locations.json --now 1893455700
```

This is no-auth and safe to run. It does not contact Google.
