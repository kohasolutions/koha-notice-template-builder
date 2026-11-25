#!/usr/bin/env bash
# Publishes a release: refuses unless the proof of this exact build passed, then tags it and attaches the offline
# builder (one HTML file) and the run log as test-run-v<version>.txt.
#   bash scripts/test-live.sh && git commit … && bash scripts/release.sh 1.0.0
set -euo pipefail
cd "$(dirname "$0")/.."
V=${1:?usage: scripts/release.sh <version>}
TAG="v$V"
[ -z "$(git status --porcelain)" ] || { echo "Commit everything first."; exit 1; }
[ "$(node -p 'require("./package.json").version')" = "$V" ] || { echo "package.json says a different version."; exit 1; }
[ "$(node -p 'require("./templates.lock.json").provisional')" = "false" ] || { echo "The templates pin is provisional: pin a released koha-notice-templates."; exit 1; }
[ -f test-run.txt ] || { echo "No test-run.txt: run bash scripts/test-live.sh first."; exit 1; }
tail -1 test-run.txt | grep -q '^RESULT: all passed$' || { echo "test-run.txt does not show a passing run."; exit 1; }
grep -q "^koha-notice-template-builder $V " test-run.txt || { echo "test-run.txt is from another version."; exit 1; }
tested=$(git log -1 --format=%H -- test-run.txt)
changed=$(git diff --name-only "$tested" HEAD -- src scripts/prove.mjs scripts/designs.mjs templates.lock.json package-lock.json vite.config.ts index.html)
[ -z "$changed" ] || { echo "Changed after the run, run scripts/test-live.sh again:"; echo "$changed"; exit 1; }
grep -q "^## $V " CHANGELOG.md || { echo "CHANGELOG.md has no '## $V' entry."; exit 1; }
# A share link made in the offline file opens this page: it must be live first.
home=$(grep -oE "HOME = '[^']+'" src/builder/share.ts | cut -d"'" -f2)
[ "$(curl -s -o /dev/null -w '%{http_code}' "$home")" = 200 ] || { echo "$home is not live: share links from the file would open a missing page."; exit 1; }
npm run -s build > /dev/null
grep -q "sha256 $(sha256sum dist/index.html | cut -d' ' -f1)" test-run.txt || { echo "This build is not the one the run tested."; exit 1; }
cp dist/index.html "/tmp/koha-notice-template-builder-$TAG.html"
cp test-run.txt "/tmp/test-run-$TAG.txt"
notes=$(awk -v v="## $V " 'index($0, v) == 1 { on = 1; next } /^## / && on { exit } on' CHANGELOG.md)
git tag -a "$TAG" -m "koha-notice-template-builder $V"
git push origin main "$TAG"
gh release create "$TAG" "/tmp/koha-notice-template-builder-$TAG.html" "/tmp/test-run-$TAG.txt" --title "koha-notice-template-builder $V" --notes "$notes"
echo "Released $TAG"
