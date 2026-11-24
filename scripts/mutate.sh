#!/bin/bash
# Mutation checks through Koha: break the escaping or a printer in one place, run the live proof, put it back.
# Every mutation must FAIL the proof, except m9, which only the unit tests can see (both outputs print the same quote).
#   TEMPLATES_DIR=../koha-notice-templates scripts/mutate.sh      (about 25 minutes; one Koha run at a time)
cd "$(dirname "$0")/.." || exit 2
OUT=out/mutate; mkdir -p "$OUT"; : > "$OUT/summary.txt"
proof() { NO_WRITE=1 node scripts/prove.mjs --random=4 --only="$2" > "$OUT/$1.log" 2>&1; echo $?; }
mutate() { # name file old new notices
  local name=$1 f=$2; cp "$f" "$OUT/orig"; CUR=$f
  python3 -c "import sys;p,o,n=sys.argv[1:];s=open(p).read();assert o in s,'missing '+o;open(p,'w').write(s.replace(o,n,1))" "$f" "$3" "$4" || { echo "$name: patch failed" | tee -a "$OUT/summary.txt"; return; }
  local rc; rc=$(proof "$name" "$5"); cp "$OUT/orig" "$f"; CUR=
  echo "$name exit $rc: $(grep -E 'equal to the preview|Error' "$OUT/$name.log" | head -1 | cut -c1-160)" | tee -a "$OUT/summary.txt"
}
CUR=; trap '[ -n "$CUR" ] && cp "$OUT/orig" "$CUR"' EXIT   # an interrupted run puts the broken file back
SET=CHECKOUT,ODUE,PREDUEDGST,ISSUESLIP,PASSWORD_RESET
E=src/compiler/escape.ts; P=src/compiler/print.ts
echo "baseline exit $(proof baseline $SET)" | tee -a "$OUT/summary.txt"
mutate m1-html-no-bracket      $E "'[': '&#91;' " "'[': '[' " $SET
mutate m2-html-no-dashes       $E ".replace(/-{2,}/g, (run) => '&#45;'.repeat(run.length))" "" $SET
mutate m3-plain-keeps-chevrons $E ".replace(/<{2,}/g, (r) => '‹'.repeat(r.length))" "" $SET
mutate m4-plain-keeps-dashes   $E ".replace(/-{4,}/g, (r) => '–'.repeat(r.length))" "" $SET
mutate m5-plainTT-no-wrap      $E "plain(v).replace(/\[%/g, \"[% '[%' %]\")" "plain(v)" $SET
mutate m6-sample-zero-true     $P "['', '0'].includes" "[''].includes" AUTO_RENEWALS,AUTO_RENEWALS_DGST
mutate m7-sample-digest-noLead $P "? '\n' + out.map" "? '' + out.map" $SET
mutate m8-koha-digest-trail    $P "\`\n----\n\${walk(n.body)}\n----\n\`" "\`\n----\n\${walk(n.body)}----\n\`" $SET
mutate m9-html-no-quote        $E "'\"': '&quot;', " "" $SET
