# Outdoor Pet Route Logger

Personal app experiment for tracking the cat's outdoor sessions with Moto Tag and Find Hub data.

## Goal

Measure tracker reliability first, then use reliable points to build route history.

## Current Setup

- Cat wears a Moto Tag.
- Location is checked through Find Hub.
- Prior baseline is AirTag experience.

## MVP Direction

1. Build a CLI/data collector before any UI.
2. Start and stop an outside session.
3. Capture timestamped location points at a regular cadence, likely around every 10 minutes.
4. Store sessions, check attempts, location points, stale age, precision/accuracy signal, and whether a scheduled check succeeded in SQLite.
5. Summarize reliability before drawing conclusions from route maps.
6. Map route history only from collected points with enough quality context.

## First Spike

Verify which collector path gives the best data access:

1. Unofficial Find Hub sync tooling on Windows / Python.
2. Android phone automation against the Find Hub app.
3. Browser/session scraping from `android.com/find`.
4. Manual capture only as a fallback.

The collector choice is unresolved until tested against the real Moto Tag account. Pick the path that exposes freshness, timestamp, accuracy, and failure state most reliably.

## Collector Spike Order

1. **Unofficial sync tooling first**: highest upside because it may expose structured tag/device data directly.
2. **Android automation second**: most likely to match the real Find Hub app state, but may only expose UI/screenshot data.
3. **Browser scraping third**: useful fallback for desktop automation, but likely brittle because auth and UI can change.

Each path should be judged by the same output contract: location, observation timestamp, stale age/freshness, accuracy or confidence signal, failure reason, and whether the value came from a new observation or a repeated old point.

## Collector Viability Contract

A collector is viable only if it can produce:

- `lat` / `lon`
- `observed_at`
- `freshness_age`
- `accuracy` or `confidence`
- `new_vs_repeated`
- `failure_reason`

The strict contract is intentional. A collector that only returns coordinates cannot support the reliability-first goal.

## Build Order

Start with a CLI/data collector that can run checks, persist results, and print reliability summaries. Defer UI until the data pipeline proves it can produce recovery-grade checks.

## Persistence

Use SQLite first. The data model needs queryable sessions, check attempts, location points, freshness windows, failure reasons, and daily reliability summaries.

## Data Model

Optimize for measurement integrity:

- `outside_sessions`: manually started/stopped outdoor windows.
- `collector_runs`: each invocation of a collector path, including version/config and raw status.
- `check_attempts`: each scheduled effort to read Find Hub / Moto Tag state.
- `location_points`: only new tracker observations, linked from the check attempt that discovered them.

Core rule: every check attempt is stored, but not every check attempt creates a location point.

## First Schema

```sql
create table outside_sessions (
  id integer primary key,
  started_at text not null,
  ended_at text,
  notes text
);

create table collector_runs (
  id integer primary key,
  collector_name text not null,
  collector_version text,
  started_at text not null,
  finished_at text,
  status text not null,
  raw_status text
);

create table check_attempts (
  id integer primary key,
  outside_session_id integer not null references outside_sessions(id),
  collector_run_id integer references collector_runs(id),
  scheduled_for text not null,
  checked_at text not null,
  status text not null,
  failure_reason text,
  repeated_location_point_id integer references location_points(id),
  raw_payload text
);

create table location_points (
  id integer primary key,
  outside_session_id integer not null references outside_sessions(id),
  check_attempt_id integer not null references check_attempts(id),
  observed_at text not null,
  collected_at text not null,
  lat real not null,
  lon real not null,
  accuracy_m real,
  confidence text,
  freshness_age_seconds integer not null,
  freshness_class text not null,
  recovery_grade integer not null
);
```

## CLI Surface

Start with these commands:

- `petlog session start`
- `petlog session stop`
- `petlog check --collector <name>`
- `petlog run --collector <name> --interval 10m`
- `petlog summary --today`
- `petlog export --session <id>`

## Reliability Rules

- Freshness: usable under 10 minutes, stale from 10 to 30 minutes, failed over 30 minutes.
- Recovery-grade: true only when the point has acceptable freshness and enough accuracy/confidence to act on.
- Repeated old observations: store the check attempt, link to the repeated point, do not create a new route point.
- Failed checks: store the failure reason instead of hiding the miss.

## Privacy Boundary

Keep the first version local-only. Do not sync location data to a hosted service. Store raw collector payloads only in the local SQLite database for debugging and schema evolution.

## Out of Scope for v0

- Push notifications or missing-cat alerting.
- Automatic outside-session detection.
- Hosted dashboard or cloud sync.
- Multi-pet support.
- Product/customer-discovery workflow.
- Polished route-map UI before collector reliability is proven.

## Implementation Plan

### Phase 1: Collector spike

1. Test unofficial Find Hub sync tooling.
2. Test Android automation if sync tooling does not satisfy the viability contract.
3. Test browser scraping if Android automation is weaker or blocked.
4. Pick the collector that returns the strongest structured data.

Current status: `GoogleFindMyTools` is the active collector path. Local Google auth, E2EE key retrieval, device listing, and one encrypted Find Hub location decrypt succeeded. `google-find-hub-sync` remains reference code only because current live auth/FCM registration hit a Firebase blocked-client error.

### Phase 2: CLI data foundation

1. Create the SQLite schema. Done in `petlog/storage.py`.
2. Implement manual session start/stop. Done with `petlog session start` and `petlog session stop`.
3. Implement check-attempt persistence. Done with `petlog check --collector googlefindmytools`.
4. Implement location-point classification. Done in `petlog/normalize.py`.
5. Implement `summary --today`. Done.
6. Add bounded reliability runs. Done with `petlog run --interval ... --max-checks ...`.

Current local commands:

```powershell
python -m petlog.cli session start --notes "manual outside session"
python -m petlog.cli check --collector googlefindmytools --device-number 3
python -m petlog.cli summary --today
python -m petlog.cli summary --session 1
python -m petlog.cli run --collector googlefindmytools --device-number 3 --interval 10m --max-checks 3
python -m petlog.cli session stop
python -m petlog.cli export --session 1
```

### Phase 3: Reliability audit

1. Run real outside sessions.
2. Measure recovery-grade rate.
3. Measure stale and failed intervals.
4. Identify dead zones and weak time windows.
5. Decide whether Moto Tag is good enough.

### Phase 4: Route history

1. Build route export from recovery-grade points.
2. Add map rendering only after route data is trustworthy.
3. Keep stale/failed intervals visible on the map instead of smoothing over them.
