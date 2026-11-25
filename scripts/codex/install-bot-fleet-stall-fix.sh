#!/usr/bin/env bash
# Surgical deployment of the autonomous-bot starter-fleet savings fix.
# No migrations, population, DB writes, model changes, or new Docker volumes.
set -Eeuo pipefail
umask 077

root=/home/ogamedev/OGameX
remote=https://github.com/Nostago/ogamex-3d.git
base_sha=ac5cb5298f3d86d7c636a0d7b4cd7e70cac65764
fix_ancestor_sha=91a940804e0ec98ce3492f6cbc39486773e9e52f
base_ref=refs/remotes/bot-fleet-fix/baseline
fix_ref=refs/remotes/bot-fleet-fix/update
app_container=ogamex-ogamex-app-1
scheduler_container=ogamex-ogamex-scheduler-1
files=(app/Services/AutonomousBotService.php resources/lang/de/t_bots.php resources/lang/en/t_bots.php)

die() { printf 'ABBRUCH: %s\n' "$*" >&2; exit 1; }
cd "$root" || die "Projektordner $root nicht gefunden."
test -d .git || die "Kein Git-Checkout: $root"
command -v docker >/dev/null || die 'Docker fehlt.'
command -v git >/dev/null || die 'Git fehlt.'
command -v sha256sum >/dev/null || die 'sha256sum fehlt.'
test -z "$(git status --porcelain)" || die 'Arbeitsverzeichnis hat lokale Aenderungen. Nichts ueberschrieben.'
git var GIT_AUTHOR_IDENT >/dev/null || die 'Git-Benutzeridentitaet fehlt.'
git var GIT_COMMITTER_IDENT >/dev/null || die 'Git-Commitidentitaet fehlt.'

for name in "$app_container" "$scheduler_container"; do
    running=$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null) || die "Container $name fehlt."
    test "$running" = true || die "Container $name ist nicht aktiv."
done
# Check that the application container sees the same bind-mounted source.
host_hash=$(sha256sum app/Services/AutonomousBotService.php | cut -d ' ' -f1)
container_hash=$(docker exec "$app_container" sha256sum /var/www/app/Services/AutonomousBotService.php | cut -d ' ' -f1) || die 'Quellcode in Docker nicht lesbar.'
test "$host_hash" = "$container_hash" || die 'Docker nutzt andere PHP-Dateien; kein Eingriff.'

printf 'Pruefe passenden Git-Stand ...\n'
git fetch -q --no-tags "$remote" \
    "+refs/heads/codex/ogamex-3d-bot-strategy-controls:$base_ref" \
    "+refs/heads/codex/ogamex-3d-bot-fleet-stall-fix:$fix_ref" \
    || die 'GitHub-Fetch fehlgeschlagen.'
test "$(git rev-parse "$base_ref")" = "$base_sha" || die 'Basis-Branch wurde veraendert.'
git merge-base --is-ancestor "$fix_ancestor_sha" "$fix_ref" || die 'Fix-Branch enthaelt nicht den freigegebenen Fix.'

patch=$(mktemp)
applied=0
committed=0
restore_if_failed() {
    status=$?
    trap - ERR
    if (( applied == 1 && committed == 0 )); then
        printf 'Fehler entdeckt; setze ausschliesslich den Bot-Patch zurueck ...\n' >&2
        if git apply --reverse --index "$patch"; then
            docker restart "$app_container" "$scheduler_container" >/dev/null 2>&1 || true
        else
            printf 'Automatisches Zuruecksetzen fehlgeschlagen; gesicherte Originale wiederherstellen.\n' >&2
        fi
    fi
    printf 'Installation NICHT erfolgreich, Status %s.\n' "$status" >&2
    exit "$status"
}
cleanup() { rm -f "$patch"; }
trap cleanup EXIT
trap restore_if_failed ERR

git diff --binary "$base_ref" "$fix_ref" -- "${files[@]}" > "$patch"
test -s "$patch" || die 'Kein Bot-Fix in den ausgewählten Dateien gefunden.'
if ! git apply --check --index "$patch"; then
    if git apply --reverse --check "$patch"; then
        echo 'Der Bot-Fix ist bereits im aktuellen Quellcode enthalten.'
        exit 0
    fi
    die 'Der aktuell installierte Code passt nicht exakt zum Bot-Patch; unveraendert gelassen.'
fi

backup="$HOME/OGameX-backups/bot-fleet-fix-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$backup"
git rev-parse HEAD > "$backup/PREVIOUS_HEAD"
git branch --show-current > "$backup/PREVIOUS_BRANCH"
for f in "${files[@]}"; do
    mkdir -p "$backup/$(dirname "$f")"
    cp -p "$f" "$backup/$f"
done
printf 'Code-Sicherung: %s\n' "$backup"

git apply --index "$patch"
applied=1
docker exec "$app_container" php -l /var/www/app/Services/AutonomousBotService.php
docker exec "$app_container" php -l /var/www/resources/lang/de/t_bots.php
docker exec "$app_container" php -l /var/www/resources/lang/en/t_bots.php

# PHP-FPM OPcache and the long-running scheduler must see the new PHP code.
docker restart "$app_container" "$scheduler_container" >/dev/null
healthy=0
for ((i=0; i<45; i++)); do
    if [[ $(docker inspect -f '{{.State.Health.Status}}' "$app_container" 2>/dev/null || true) == healthy ]]; then
        healthy=1
        break
    fi
    sleep 2
done
test "$healthy" -eq 1 || die 'PHP-Container wird nach Neustart nicht gesund.'
test "$(docker inspect -f '{{.State.Running}}' "$scheduler_container")" = true || die 'Scheduler startet nicht.'
git -c core.hooksPath=/dev/null commit -m "fix(bots): reserve resources for starter fleets" -- "${files[@]}" >/dev/null
committed=1
printf '\nFERTIG: Bot-Fix aktiv.\nGit-Commit: %s\nBackup: %s\n' "$(git rev-parse --short HEAD)" "$backup"
printf 'Bei der naechsten Botentscheidung auf "Spart Rohstoffe fuer ..." achten.\n'
