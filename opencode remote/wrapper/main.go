// Command opencode is a thin wrapper around the real opencode binary
// (opencode-real.exe, the renamed Go wrapper).
//
// It intercepts `session list` to transform the JSON output into the
// shape that Zedra's `OpenCodeSessionJson` struct expects:
//
//  1. Flatten `location.directory` to a top-level `directory` field
//     (Zedra reads `directory`, not `location.directory`).
//  2. Normalize the path to \\?\ (UNC long-path) form so it matches
//     Zedra's UNC workdir.
//  3. Expose `time.created` / `time.updated` as top-level
//     `created_at` / `last_activity_at` (ISO-8601 strings).
//
// All other commands pass through to opencode-real.exe unchanged.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const realBinName = "opencode-real.exe"

// isSessionList reports whether args contains "session list" as
// consecutive tokens.
func isSessionList(args []string) bool {
	for i := 0; i+1 < len(args); i++ {
		if args[i] == "session" && args[i+1] == "list" {
			return true
		}
	}
	return false
}

// toUNC converts a plain drive path like "C:\foo" to "\\?\C:\foo".
// Paths already in UNC form or non-drive paths are returned unchanged.
func toUNC(p string) string {
	if strings.HasPrefix(p, `\\?\`) {
		return p
	}
	if len(p) >= 3 && p[1] == ':' && (p[2] == '\\' || p[2] == '/') && isASCIILetter(p[0]) {
		return `\\?\` + p
	}
	return p
}

func isASCIILetter(b byte) bool {
	return (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z')
}

// msToISO converts a Unix-millisecond timestamp (as returned by the
// opencode API) to an ISO-8601 string. Non-numeric values are returned
// as-is (Zedra will treat them as null/missing).
func msToISO(v any) string {
	switch n := v.(type) {
	case float64:
		if n > 0 {
			return time.UnixMilli(int64(n)).UTC().Format(time.RFC3339)
		}
	case int64:
		if n > 0 {
			return time.UnixMilli(n).UTC().Format(time.RFC3339)
		}
	}
	return ""
}

// normalizeSessionPaths transforms the JSON session array returned by
// `opencode session list` into the shape Zedra expects. Non-JSON or
// non-list output is returned unchanged so passthrough is never
// corrupted.
func normalizeSessionPaths(stdout []byte) []byte {
	var sessions []map[string]any
	if err := json.Unmarshal(stdout, &sessions); err != nil {
		return stdout
	}
	for _, s := range sessions {
		// Flatten location.directory → top-level directory (UNC).
		if loc, ok := s["location"].(map[string]any); ok {
			if dir, ok := loc["directory"].(string); ok && dir != "" {
				s["directory"] = toUNC(dir)
			}
		}
		// Expose time.created / time.updated as top-level ISO timestamps.
		if t, ok := s["time"].(map[string]any); ok {
			if c, ok := t["created"]; ok {
				s["created_at"] = msToISO(c)
			}
			if u, ok := t["updated"]; ok {
				s["last_activity_at"] = msToISO(u)
			}
		}
	}
	out, err := json.Marshal(sessions)
	if err != nil {
		return stdout
	}
	return out
}

func main() {
	args := os.Args[1:]
	exeDir := filepath.Dir(os.Args[0])
	realBin := filepath.Join(exeDir, realBinName)

	// Fall back to PATH resolution if the real binary isn't co-located.
	if _, err := os.Stat(realBin); err != nil {
		if resolved, err2 := exec.LookPath(realBinName); err2 == nil {
			realBin = resolved
		} else {
			fmt.Fprintf(os.Stderr, "opencode wrapper: cannot find %s: %v\n", realBinName, err)
			os.Exit(127)
		}
	}

	if isSessionList(args) {
		cmd := exec.Command(realBin, args...)
		cmd.Stdin = os.Stdin
		cmd.Stderr = os.Stderr
		var stdout bytes.Buffer
		cmd.Stdout = &stdout
		if err := cmd.Run(); err != nil {
			os.Stdout.Write(normalizeSessionPaths(stdout.Bytes()))
			if exitErr, ok := err.(*exec.ExitError); ok {
				os.Exit(exitErr.ExitCode())
			}
			fmt.Fprintf(os.Stderr, "opencode wrapper: %v\n", err)
			os.Exit(1)
		}
		os.Stdout.Write(normalizeSessionPaths(stdout.Bytes()))
		return
	}

	// Pass through everything else.
	cmd := exec.Command(realBin, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "opencode wrapper: %v\n", err)
		os.Exit(1)
	}
}
