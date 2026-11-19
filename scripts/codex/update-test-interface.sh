#!/usr/bin/env bash
# Apply an already fetched, pinned release to the existing native test installation.
# Does not install dependencies, change main or restart services. Adds only the named premium/NPC tables, fleet planning metadata and ship-grant receipts.
set -euo pipefail
umask 022
cd /home/ogamedev/OGameX
if [[ $# != 1 || ! $1 =~ ^[0-9a-f]{40}$ ]]; then
    echo 'Aufruf: bash update-test-interface.sh <vollständiger Commit-SHA>' >&2
    exit 1
fi
target=$(git rev-parse --verify "$1^{commit}")
branch=$(git symbolic-ref --quiet --short HEAD)
if [[ $branch == main || $branch == master ]]; then
    echo 'Abbruch: zuerst den bereits eingerichteten Testbranch auswählen.' >&2
    exit 1
fi
if [[ -n $(git status --porcelain) ]]; then
    echo 'Abbruch: lokale Änderungen zuerst prüfen; es wird nichts überschrieben.' >&2
    exit 1
fi
command -v php >/dev/null
command -v composer >/dev/null
test -f vendor/autoload.php
git var GIT_COMMITTER_IDENT >/dev/null
# Detect conflicts before changing the worktree.
git merge-tree --write-tree HEAD "$target" >/dev/null
stamp=$(date -u +%Y%m%dT%H%M%SZ)-$$
backup="/home/ogamedev/OGameX-backups/$stamp"
(
    umask 077
    mkdir -p "$backup"
    git rev-parse HEAD > "$backup/commit.txt"
    git branch --show-current > "$backup/branch.txt"
    tar -czf "$backup/public-build.tar.gz" public/build
)
git branch "backup/vor-command-interface-$stamp"
printf 'Sicherung: %s\n' "$backup"
git merge --no-ff --no-edit "$target"
if [[ -f public/hot ]]; then
    mv public/hot "$backup/public-hot"
fi
composer dump-autoload --optimize --no-scripts --no-plugins --no-interaction
# Add only the named additive tables; leave unrelated pending migrations alone.
php artisan migrate --force --path=database/migrations/2026_11_14_100000_create_premium_commerce_tables.php
php artisan migrate --force --path=database/migrations/2026_11_14_160000_create_autonomous_bots_table.php
php artisan migrate --force --path=database/migrations/2026_11_15_120000_add_autonomous_bot_operations.php
# Add optional planning preferences without changing saved ship quantities.
php artisan migrate --force --path=database/migrations/2026_11_18_200000_add_settings_to_fleet_templates.php
# Add immutable ship-compensation receipts; existing ship inventories are untouched.
php artisan migrate --force --path=database/migrations/2026_11_18_230000_create_admin_ship_grants_table.php
# Add optional per-NPC strategy overrides; existing bots retain their profile defaults.
php artisan migrate --force --path=database/migrations/2026_11_19_010000_add_strategy_to_autonomous_bots_table.php
# Requested initial population; idempotent and leaves existing human accounts untouched.
php artisan ogamex:bots:populate --count=50
# Enable bounded NPC decisions even when no browser is open.
if command -v crontab >/dev/null; then
    bash scripts/codex/enable-bots-cron.sh
else
    echo 'Hinweis: Bots benötigen den Laravel-Scheduler (jede Minute php artisan schedule:run).' >&2
fi
php artisan route:clear
php artisan view:clear
php artisan route:list --path=play-3d
printf '\nFertig. Im Browser /play-3d neu laden. Sicherung: %s\n' "$backup"
