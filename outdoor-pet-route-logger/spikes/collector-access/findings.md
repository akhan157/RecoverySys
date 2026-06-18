# Collector Access Findings

## 2026-06-18

### Research Summary

- `GoogleFindMyTools` reimplements parts of Google's Find My Device / Find Hub network and says it can query trackers and Android devices, read E2EE keys, and decrypt encrypted network locations.
- Initial authentication requires Google Chrome and stores results in `Auth/secrets.json`.
- `traccar/google-find-hub-sync` is based on `GoogleFindMyTools` and exposes a command-line/microservice flow that can query device location and push to Traccar.
- `GoogleFindMy-HA` is a Home Assistant integration built around the same ecosystem. It has useful concepts for this project: polling interval, rate-limit protection, recency/accuracy/source grading, map history, and statistics.

### Current Decision

Start with unofficial sync tooling. Use Android automation and browser scraping only if structured sync tooling fails the collector viability contract.

### Local Inspection

- Cloned `leonboe1/GoogleFindMyTools` at `d46e952`.
- Cloned `traccar/google-find-hub-sync` at `dd1682c`.
- Created ignored venv at `spikes/collector-access/.venv`.
- Created ignored Python 3.12 venv at `spikes/collector-access/.venv312` because system Python is 3.14 and exposed async compatibility issues.
- Installed `google-find-hub-sync` Python dependencies successfully.
- Imported `microservice`, device-list, and locate/decrypt modules successfully without starting auth.
- `traccar/google-find-hub-sync` failed current live auth/FCM registration because Firebase installation returned `API_KEY_ANDROID_APP_BLOCKED`.
- `leonboe1/GoogleFindMyTools` succeeded after local spike patches:
  - remove interactive `Press Enter` gates for noninteractive runs
  - avoid killing existing Chrome processes
  - launch the known installed Chrome binary directly
  - print accuracy in decrypted location output

### Live Moto Tag Result

- Google account auth succeeded and cached `fcm_credentials`, `aas_token`, `shared_key`, and `owner_key` under ignored `vendor/GoogleFindMyTools/Auth/secrets.json`.
- Device list returned:
  - `Google Pixel 9a`
  - `WH-1000XM5`
  - `Laddoo`
- `Laddoo` location request and E2EE decryption worked.
- Added `collect_googlefindmytools.py` as the first repeatable cached-auth collector wrapper.
- Latest test returned one coordinate point with:
  - observed timestamp available
  - accuracy available
  - source status available
  - own-report flag available
  - freshness grading available
- The sample was about 39 minutes old at collection time, so it normalized to `freshness_class: failed` and `recovery_grade: false`. This is useful reliability evidence, not a failure of the parser.

### Data Contract Mapping

`google-find-hub-sync` exposes enough fields to attempt the strict collector contract:

| Pet Logger Field | Source Field |
| --- | --- |
| `lat` / `lon` | `latitude` / `longitude` |
| `observed_at` | `time` |
| `freshness_age` | derived from `collected_at - time` |
| `accuracy` / `confidence` | `accuracy`, then derived confidence |
| `new_vs_repeated` | compare latest `time` against prior stored point |
| `failure_reason` | no coordinates, auth failure, timeout, decrypt failure, request failure |

### Local Normalizer

Added `normalize_google_find_hub.py` to normalize Traccar-style `/location` JSON into the pet logger contract.

Verified cases:

- Fresh point under 10 minutes + accuracy 35m -> `recovery_grade: true`.
- Same observed timestamp as previous point -> `new_vs_repeated: repeated`, `recovery_grade: false`.
- Point over 30 minutes old -> `freshness_class: failed`, `recovery_grade: false`.

### Current Repeatable Command

After auth is cached, run:

```powershell
cd C:\Users\adnan\Projects\outdoor-pet-route-logger
.\spikes\collector-access\.venv312\Scripts\python.exe .\spikes\collector-access\collect_googlefindmytools.py
```

It emits the normalized collector contract JSON.

### Next Engineering Step

Move this spike into an app collector module with SQLite persistence for `check_attempts` and `location_points`. Keep the raw command output ignored; do not commit raw coordinates or secrets.
