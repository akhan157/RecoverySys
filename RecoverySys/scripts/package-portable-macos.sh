#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_path="${1:-$project_root/src-tauri/target/universal-apple-darwin/release/bundle/macos/RecoverySys.app}"
output_path="${2:-$project_root/RecoverySys-macos-universal.zip}"

if [[ ! -d "$app_path" ]]; then
  echo "Portable macOS app not found: $app_path. Run 'npm run portable:macos:build' first." >&2
  exit 1
fi

mkdir -p "$(dirname "$output_path")"
rm -f "$output_path"
codesign --verify --deep --strict "$app_path"
ditto -c -k --rsrc --sequesterRsrc --keepParent "$app_path" "$output_path"
echo "Created $output_path"
