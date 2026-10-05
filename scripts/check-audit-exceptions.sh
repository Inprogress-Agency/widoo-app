#!/usr/bin/env bash
# Fails when an id of auditConfig.ignoreGhsas (pnpm-workspace.yaml) no longer matches any advisory
# of the lockfile: the package was updated past the vulnerable range, or the advisory was withdrawn.
# The exception is then useless and must be dropped. It never fails on a date (review: #280).
# Usage: scripts/check-audit-exceptions.sh (from anywhere in the repo; needs pnpm and node)
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
ignored=$(sed -nE 's/^[[:space:]]+-[[:space:]]+(GHSA-[0-9a-z-]+).*$/\1/p' "$root/pnpm-workspace.yaml")
[ -n "$ignored" ] || { echo "No ignored advisory."; exit 0; }

# Audit the same lockfile without the exception, in a scratch copy of the workspace root.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp "$root/pnpm-lock.yaml" "$root/package.json" "$tmp/"
sed -nE '/^packages:/,/^$/p' "$root/pnpm-workspace.yaml" > "$tmp/pnpm-workspace.yaml"
# pnpm audit exits 1 when it finds advisories: that is expected here, the JSON is what counts.
found=$(cd "$tmp" && { pnpm audit --json || true; } \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      for (const a of Object.values(JSON.parse(s).advisories ?? {})) console.log(a.github_advisory_id)})')

fail=0
for id in $ignored; do
  if grep -qx "$id" <<< "$found"; then echo "$id: still reported, exception kept."
  else echo "$id: no longer reported, drop it from auditConfig.ignoreGhsas."; fail=1; fi
done
exit $fail
