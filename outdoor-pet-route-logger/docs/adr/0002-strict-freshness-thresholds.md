# Strict Freshness Thresholds

Location points are classified as usable when under 10 minutes old, stale from 10 to 30 minutes old, and failed when over 30 minutes old. This keeps the app honest: with a planned 10-minute check cadence, anything older than one missed interval should be treated as suspicious, and anything over 30 minutes should not support recovery confidence.
