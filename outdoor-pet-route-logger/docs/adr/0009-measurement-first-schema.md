# Measurement-First Schema

The SQLite schema will separate outside sessions, collector runs, check attempts, and location points. This preserves reliability evidence even when no new location is found, and prevents route history from hiding stale repeats or failed checks.
