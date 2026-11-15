#!/usr/bin/env bash
# Idempotent per-user NPC scheduler for a native installation. No service restarts.
set -euo pipefail
umask 077
project=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$project"
command -v crontab >/dev/null || { echo 'crontab fehlt. Alternativ den bestehenden Laravel-Scheduler verwenden: php artisan schedule:run (jede Minute).' >&2; exit 1; }
php_bin=$(command -v php)
test -f vendor/autoload.php
marker="ogamex-autonomous-bots:$project"
current=$(mktemp)
next=$(mktemp)
trap 'rm -f "$current" "$next"' EXIT
# crontab -l exits 1 for a user without a crontab. Other errors must not discard entries.
if ! LC_ALL=C crontab -l > "$current" 2> "$next"; then
    if [[ -s $current ]] || ! LC_ALL=C grep -qi 'no crontab' "$next"; then
        cat "$next" >&2
        exit 1
    fi
fi
if grep -Fq -- "$marker" "$current"; then
    awk -v marker="$marker" 'substr($0,length($0)-length(marker)+1)==marker {sub(/--limit=20 /,"--limit=100 ")} {print}' "$current" > "$next"
    crontab "$next"
    echo 'Bot-Taktgeber aktualisiert: maximal 100 fällige Bots je Minute.'
    exit 0
fi
cat "$current" > "$next"
printf '\n* * * * * cd %q && %q artisan ogamex:bots:tick --limit=100 >> storage/logs/autonomous-bots.log 2>&1 # %s\n' "$project" "$php_bin" "$marker" >> "$next"
crontab "$next"
echo 'Bot-Taktgeber eingerichtet: jede Minute, maximal 100 fällige Bots. Bestehende Cron-Aufträge bleiben erhalten.'
