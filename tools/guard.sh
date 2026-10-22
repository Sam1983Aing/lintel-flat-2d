#!/bin/zsh
# tools/guard.sh <seconds> <cmd> [args...]: run a command, kill it and its children after <seconds>. (macOS has no timeout.)
secs=$1; shift
"$@" &
pid=$!
( sleep $secs; pkill -P $pid 2>/dev/null; kill $pid 2>/dev/null ) >/dev/null 2>&1 &
w=$!
wait $pid; code=$?
kill $w 2>/dev/null
exit $code
