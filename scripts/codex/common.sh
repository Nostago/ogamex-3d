#!/bin/sh
# Shared paths and readiness checks for the managed Codex cloud environment.
set -eu

ogamex_scripts_dir=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
ogamex_repo_dir=$(CDPATH= cd -P "$ogamex_scripts_dir/../.." && pwd)
OGAMEX_CLOUD_STATE_DIR=${OGAMEX_CLOUD_STATE_DIR:-/workspace/ogamex-cloud}
export OGAMEX_CLOUD_STATE_DIR

ogamex_compose() {
    docker compose --project-directory "$ogamex_repo_dir" \
        -f "$ogamex_repo_dir/docker-compose.yml" \
        -f "$ogamex_scripts_dir/compose.cloud.yml" "$@"
}

ogamex_prepare_ca() {
    mkdir -p "$OGAMEX_CLOUD_STATE_DIR"
    cat /etc/ssl/certs/ca-certificates.crt \
        "${CODEX_PROXY_CERT:?Cloud proxy CA is required}" \
        > "$OGAMEX_CLOUD_STATE_DIR/ca.pem"
}

ogamex_wait_database() {
    ogamex_attempt=0
    until ogamex_compose exec -T ogamex-db healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1; do
        ogamex_attempt=$((ogamex_attempt + 1))
        if [ "$ogamex_attempt" -ge 30 ]; then
            echo 'MariaDB is not ready; inspect the ogamex-db logs.' >&2
            return 1
        fi
        sleep 2
    done
}
