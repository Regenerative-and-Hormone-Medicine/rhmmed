#!/bin/bash
# Compare many routes at all widths; prints one summary line per route. Usage: [FLAGS=--freeze] scripts/batch-compare.sh /a /b ...
for r in "$@"; do
  out=$(node scripts/compare.mjs "$r" $FLAGS 2>&1)
  widths=$(echo "$out" | grep -oE '^[0-9]+px +(score [0-9.]+%|ERROR.*)' | sed -E 's/px +score /:/; s/%//' | tr '\n' ' ')
  page=$(echo "$out" | grep -oE 'worst = [0-9.]+%|INCOMPLETE.*' )
  echo "$r | $widths| $page"
done
