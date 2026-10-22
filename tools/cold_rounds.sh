#!/bin/zsh
# Cold loads, interleaved: each query gets a salt nobody used before, so no shader cache helps.
#   tools/cold_rounds.sh <out.jsonl> <rounds> <query> [<query> ...]     e.g. "lit=none" "lit=all" "code=living"
# Run from 014 Flat 3D/ with the server up. One JSON line per load, with the salt and the query.
out=$1; rounds=$2; shift 2
for r in $(seq 1 $rounds); do
  for q in "$@"; do
    salt=$(( (RANDOM << 15 | RANDOM) % 900000 + 100000 ))
    line=$(python3 tools/look_numbers.py "$q&salt=$salt" 2>&1 | head -1)
    echo "{\"round\": $r, \"query\": \"$q\", \"salt\": $salt, \"at\": \"$(date +%H:%M:%S)\", \"r\": $line}" >> "$out"
    echo "$r $q $salt done $(date +%H:%M:%S)"
  done
done
