# Separate Check Attempts from Location Points

Every scheduled Find Hub read is recorded as a check attempt, but only genuinely newer tracker observations become location points. This prevents stale repeated coordinates from polluting route history while preserving reliability evidence about missed or stale checks.
