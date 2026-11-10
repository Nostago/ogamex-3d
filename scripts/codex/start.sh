#!/bin/sh
set -eu
. "$(dirname "$0")/common.sh"
# Restored snapshots retain dependencies, but processes and proxy settings must restart.
ogamex_prepare_ca
ogamex_compose up -d --force-recreate ogamex-db ogamex-app
ogamex_wait_database
ogamex_compose exec -T --user 1000:1000 ogamex-app php artisan migrate --force --no-interaction
ogamex_compose up -d --force-recreate ogamex-scheduler ogamex-queue-worker ogamex-reverb ogamex-webserver
ogamex_compose exec -T --user 1000:1000 ogamex-app php artisan migrate:status
ogamex_http_address=$(ogamex_compose port ogamex-webserver 80 | head -n 1)
ogamex_http_port=${ogamex_http_address##*:}
ogamex_homepage=$(mktemp "$OGAMEX_CLOUD_STATE_DIR/homepage-XXXXXX")
trap 'rm -f "$ogamex_homepage"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --max-time 30 \
    "http://127.0.0.1:$ogamex_http_port/" -o "$ogamex_homepage"
grep -q '<html' "$ogamex_homepage"
grep -Eq 'login|register' "$ogamex_homepage"
echo 'OGameX started; database migrations and login page verified.'
