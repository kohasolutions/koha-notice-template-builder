#!/usr/bin/env bash
# The whole proof in one run, written to test-run.txt (attached to each GitHub Release by scripts/release.sh).
# Needs a TEST Koha (koha-testing-docker) and koha-notice-templates checked out at the pinned commit beside this one.
#   bash scripts/test-live.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=${TEMPLATES_DIR:-../koha-notice-templates}
pin=$(node -p 'require("./templates.lock.json").commit')
[ "$(git -C "$T" rev-parse HEAD)" = "$pin" ] || { echo "$T is not at the pinned commit ${pin:0:7}: check it out first."; exit 1; }
{
  echo "koha-notice-template-builder $(node -p 'require("./package.json").version') · $(git describe --tags --always --dirty) · $(git rev-parse HEAD)"
  echo "Templates: koha-notice-templates $(node -p 'const l=require("./templates.lock.json"); (l.version ? "v"+l.version+" " : "")+l.commit')"
  echo "Run on $(date -u +%Y-%m-%dT%H:%M:%SZ), $(uname -sr), node $(node --version)"
  echo
  echo "== Pin, lint, types, unit tests"
  npm run -s templates:check
  npm run -s lint
  npm run -s typecheck
  npx vitest run 2>&1 | grep -E 'Test Files|Tests '
  echo
  echo "== Single-file build"
  npm run -s build > /dev/null
  echo "dist/index.html $(wc -c < dist/index.html) bytes, sha256 $(sha256sum dist/index.html | cut -d' ' -f1)"
  echo
  echo "== The built file in a browser (Playwright, network refused)"
  npx playwright test --reporter=dot 2>&1 | grep -E '^\s+[0-9]+ (passed|failed|flaky|skipped)'
  echo
  echo "== How the compiled notices look (scripts/look.mjs)"
  node scripts/look.mjs 2>&1 | tail -3
  echo
  echo "== Every notice through Koha: Koha's message equals the preview (scripts/prove.mjs)"
  TEMPLATES_DIR="$T" node scripts/prove.mjs 2>&1 | tail -8
  echo
  echo "RESULT: all passed"
} 2>&1 | tee test-run.txt
