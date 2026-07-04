# Plan: Fix Zedra ↔ OpenCode (lildax) Integration Layer

## Status: SOLVED ✅

`zedra agent scan sessions opencode` now returns 26 sessions for this workspace.

## Problem Summary

Zedra (mobile agent controller) cannot scan OpenCode sessions. Three root causes found and fixed:

1. **No `opencode.exe`** — Zedra (Rust) uses `Command::new("opencode")` which only finds `.exe` files. The npm shims (`.ps1`/`.cmd`) were invisible to it → "program not found".
2. **Nested `location.directory`** — Zedra's `OpenCodeSessionJson` struct expects a top-level `directory` field, but the opencode API returns it nested as `location.directory`. All sessions silently failed to match the workdir filter.
3. **Plain vs UNC paths** — Zedra normalizes its workdir to `\\?\C:\...` (UNC long-path form). Session paths from the API are plain `C:\...`. Even with the top-level `directory` field, they wouldn't match without UNC normalization.

## Solution

Built a Go wrapper (`wrapper/main.go`) compiled as `opencode.exe` that:

1. **Intercepts `session list`** — captures stdout from `opencode-real.exe` (the renamed Go wrapper)
2. **Flattens `location.directory` → top-level `directory`** — Zedra's struct reads `directory`, not `location.directory`
3. **Normalizes paths to UNC** — adds `\\?\` prefix so `C:\foo` → `\\?\C:\foo`, matching Zedra's workdir
4. **Adds `created_at`/`last_activity_at`** — from `time.created`/`time.updated` as ISO-8601 strings
5. **Passes through all other commands** — `--help`, `api`, etc. go straight to `opencode-real.exe`

### Key files

| File | Role |
|------|------|
| `C:\Users\adnan\AppData\Roaming\npm\opencode.exe` | Go wrapper (2.4MB) — intercepts `session list`, passes through everything else |
| `C:\Users\adnan\AppData\Roaming\npm\opencode-real.exe` | Original Go wrapper (9.1MB) — calls lildax API, returns session JSON |
| `C:\Users\adnan\AppData\Roaming\npm\opencode.ps1` | PowerShell shim — calls `opencode.exe` |
| `C:\Users\adnan\AppData\Roaming\npm\opencode.cmd` | cmd.exe shim — calls `opencode.exe` |
| `wrapper/main.go` | Wrapper source (this repo) |
| `wrapper/go.mod` | Go module definition |
| `fix-opencode-zedra.ps1` | Durability script — rebuilds wrapper after `npm install` |

### How to verify

```bash
zedra agent scan sessions opencode --json --quiet
# Should return: "total": 26 (or however many sessions exist)
```

### Durability

After `npm install -g @opencode-ai/cli` overwrites the shims:

```powershell
cd C:\Users\adnan\Projects\opencode remote
.\fix-opencode-zedra.ps1
```

This rebuilds the wrapper from source, renames the raw binary, and fixes the shims.

### Verified Behaviors

| Command | PowerShell | cmd.exe | Direct .exe |
|---------|-----------|---------|-------------|
| `opencode session list` | FAILS (lildax help) | WORKS (JSON array) | WORKS (JSON array) |
| `opencode --help` | Works (lildax help) | Works | Works |
| `opencode api GET /api/session` | Works | Works | Works (returns `{"data":[...]}`) |
| `opencode session <id>` | N/A | N/A | FAILS (lildax help — not intercepted) |
| `opencode --session <id>` | N/A | N/A | FAILS (lildax help — not intercepted) |

PowerShell prefers `.ps1` (ExternalScript) over `.exe` (Application).
cmd.exe prefers `.exe` over `.cmd` (PATHEXT order: `.EXE` before `.CMD`).

---

## Execution Plan

### Phase 1: Fix the Shims (5 min)

Rewrite all three shim files to call `opencode.exe` instead of `lildax`:

**`opencode.ps1`** → call `opencode.exe` with args passthrough and pipeline input support
**`opencode.cmd`** → call `opencode.exe` with args passthrough
**`opencode`** (bash) → call `opencode.exe` with args passthrough

Back up the original shims first (`.bak` suffix).

### Phase 2: Verify Shim Fix (2 min)

Test from all three shells:
- `opencode session list` in PowerShell → should return JSON array
- `cmd /c "opencode session list"` → should return JSON array
- `opencode --help` → should show lildax help (passthrough works)

If any fail, debug the shim syntax.

### Phase 3: Test Zedra Session Scan (3 min)

1. Run `zedra agent scan sessions` from the current workspace
2. Check if sessions are found (should see > 0)
3. If 0 sessions: check if Zedra is running the daemon and what command it executes
4. If sessions found but wrong workspace: UNC path issue (Phase 4)

### Phase 4: Fix UNC Path Issue (if needed, 10 min)

If Zedra's workspace filter fails because daemon workdir is `\\?\C:\...` but session paths are `C:\...`:

**Option A (preferred): Build a new Go wrapper** that normalizes paths
- Create Go source in `C:\Users\adnan\Projects\opencode remote\wrapper\`
- Intercept `session list` → call `lildax api GET /api/session`
- Extract `data` array from response
- Normalize `location.directory` in each session (strip `\\?\` prefix or add it to match Zedra's expectation)
- Output clean JSON array
- Pass through all other commands to `lildax`
- Compile with `go build -o opencode.exe`

**Option B (fallback): PowerShell wrapper script**
- Replace `opencode.exe` with a PowerShell script that does the same
- Less robust but easier to iterate on

### Phase 5: Handle Session Detail (if needed, 10 min)

If Zedra needs `opencode --session <id>` or `opencode session <id>`:
- Add interception in the Go wrapper
- Call `lildax api GET /api/session/<id>`
- Return session detail JSON

### Phase 6: Full Integration Test (5 min)

1. Start Zedra daemon: `zedra start --workdir "C:\Users\adnan\Projects\opencode remote" --json`
2. Run `zedra agent scan sessions`
3. Verify sessions from this workspace are found
4. Run `zedra agent scan summaries`
5. Verify session summaries work
6. Run `zedra status` — check daemon health
7. Test `zedra agent scan bench` if available

### Phase 7: Durability (5 min)

1. Create a fix script: `C:\Users\adnan\Projects\opencode remote\fix-shims.ps1`
   - Detects and fixes the shims if they're pointing at `lildax` instead of `opencode.exe`
   - Can be re-run after `npm install` overwrites the shims
2. Document the fix in a README

### Phase 8: Verify Mobile Handoff (if Zedra daemon works)

1. Run `zedra start` with `--json` flag
2. Get the pairing QR
3. (User can scan from phone to verify end-to-end)

---

## What I Need From You

**Nothing.** This plan is designed to be fully autonomous. I will:
1. Fix the shims
2. Test iteratively
3. Build a new Go wrapper if the existing one is insufficient
4. Keep debugging until `zedra agent scan sessions` works cleanly

The only thing that would require your input is if Zedra needs a network pairing that I can't test from the CLI (Phase 8).

## Risks

- **npm install overwrites shims**: Mitigated by Phase 7 (fix script)
- **Go wrapper source is lost**: I'll recreate it from observed behavior (it's simple: intercept `session list`, call `lildax api`, pass through everything else)
- **Zedra is closed-source**: I work around this by controlling what `opencode session list` outputs
- **UNC path mismatch**: May require path normalization in the Go wrapper
