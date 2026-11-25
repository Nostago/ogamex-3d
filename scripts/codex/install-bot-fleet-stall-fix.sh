#!/usr/bin/env bash
# Apply only the reviewed bot PHP fix. No migrations, population, installs or stack restart.
set -Eeuo pipefail
umask 022
root=${OGAMEX_PROJECT_DIR:-/home/ogamedev/OGameX}
base_sha=ac5cb5298f3d86d7c636a0d7b4cd7e70cac65764
original_pr_sha=7f7725f54e05a6730f848926c36bfff0b66f2c2f
files=(app/Services/AutonomousBotService.php resources/lang/de/t_bots.php resources/lang/en/t_bots.php)
die() { printf 'ABBRUCH: %s\n' "$*" >&2; exit 1; }
[[ $# == 1 && $1 =~ ^[0-9a-f]{40}$ ]] || die 'Aufruf: bash install-bot-fleet-stall-fix.sh <geprüfter vollständiger Commit-SHA>'
cd "$root" || die "Projektordner $root fehlt."
root=$(pwd -P)
git rev-parse --is-inside-work-tree >/dev/null || die 'Kein Git-Checkout.'
if command -v flock >/dev/null; then
    exec 9>"$(git rev-parse --git-path ogamex-bot-fix.lock)"
    flock -n 9 || die 'Ein anderer Bot-Installer läuft bereits.'
fi
test -z "$(git status --porcelain)" || die 'Lokale Änderungen vorhanden; nichts überschrieben.'
target=$(git rev-parse --verify "$1^{commit}")
git merge-base --is-ancestor "$base_sha" "$target" || die 'Der Zielcommit gehört nicht zur geprüften Codebasis.'
git var GIT_AUTHOR_IDENT >/dev/null || die 'Git-Autoridentität fehlt.'
git var GIT_COMMITTER_IDENT >/dev/null || die 'Git-Commitidentität fehlt.'
command -v sha256sum >/dev/null || die 'sha256sum fehlt.'

# Select by the actual checkout bind mount, never by a hardcoded container name.
app_container=
container_root=
candidates=
if command -v docker >/dev/null && candidates=$(docker ps --filter label=com.docker.compose.service=ogamex-app --format '{{.ID}}' 2>/dev/null); then
    for candidate in $candidates; do
        while IFS=$'\t' read -r source destination; do
            if [[ $source == "$root" ]]; then
                [[ -z $app_container || $app_container == "$candidate" ]] || die 'Mehrere PHP-Container verwenden dieses Checkout.'
                app_container=$candidate
                container_root=$destination
            fi
        done < <(docker inspect -f '{{range .Mounts}}{{printf "%s\t%s\n" .Source .Destination}}{{end}}' "$candidate")
    done
fi
if [[ -n $app_container ]]; then
    master=$(docker exec "$app_container" cat /proc/1/comm)
    [[ $master == php-fpm* ]] || die 'PHP-FPM ist nicht PID 1; automatische Aktualisierung dieses Runtimes wird nicht unterstützt.'
    for file in "${files[@]}"; do
        local_hash=$(sha256sum "$file" | cut -d ' ' -f1)
        remote_hash=$(docker exec "$app_container" sha256sum "$container_root/$file" | cut -d ' ' -f1)
        [[ $local_hash == "$remote_hash" ]] || die "PHP-Container verwendet andere Quelldateien: $file"
    done
    printf 'Passender PHP-FPM-Container: %s\n' "$app_container"
else
    [[ -z $candidates ]] || die 'Laufende OGameX-Container verwenden ein anderes Checkout; nichts geändert.'
    command -v php >/dev/null || die 'Weder passender PHP-Container noch natives PHP gefunden.'
    test -f vendor/autoload.php || die 'Die bestehende PHP-Installation ist unvollständig.'
    echo 'Bestehende native PHP-Installation erkannt.'
fi

patch=$(mktemp)
applied=0
committed=0
backup=
refresh_php() {
    [[ -n $app_container ]] || return 0
    # The repository entrypoint runs composer and migrations on a full restart.
    # USR2 reloads the existing FPM master and OPcache without re-running that entrypoint.
    docker kill --signal=USR2 "$app_container" >/dev/null
    local deadline=$((SECONDS + 60)) state
    while (( SECONDS < deadline )); do
        state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Running}}{{end}}' "$app_container")
        case "$state" in
            healthy|true) return 0 ;;
            unhealthy|false) return 1 ;;
        esac
        sleep 2
    done
    return 1
}
finish() {
    local status=$?
    trap - EXIT
    if (( status != 0 && applied == 1 && committed == 0 )); then
        echo 'Installation fehlgeschlagen; stelle ausschließlich den Bot-Patch zurück.' >&2
        if git apply --reverse --index "$patch"; then
            refresh_php || echo 'Alte Dateien wiederhergestellt; PHP-FPM bitte prüfen.' >&2
        else
            printf 'Automatisches Zurücksetzen nicht möglich. Originalsicherung: %s\n' "$backup" >&2
        fi
    fi
    rm -f "$patch" || true
    exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Also permit upgrading the already installed, originally submitted PR #4.
compatible=0
for previous in "$base_sha" "$original_pr_sha"; do
    git cat-file -e "$previous^{commit}" 2>/dev/null || continue
    git diff --binary "$previous" "$target" -- "${files[@]}" > "$patch"
    test -s "$patch" || continue
    if git apply --check --index "$patch" 2>/dev/null; then
        compatible=1
        break
    fi
    if git apply --reverse --check "$patch" 2>/dev/null; then
        echo 'Der geprüfte Bot-Fix ist bereits enthalten.'
        exit 0
    fi
done
[[ $compatible == 1 ]] || die 'Die installierten Bot-Dateien passen nicht zum geprüften Patch; unverändert gelassen.'

# Lint the candidate via stdin before modifying any deployed PHP source.
for file in "${files[@]}"; do
    if [[ -n $app_container ]]; then
        git show "$target:$file" | docker exec -i "$app_container" php -l
    else
        git show "$target:$file" | php -l
    fi
done
backup_root=${OGAMEX_BACKUP_ROOT:-$(dirname "$root")/OGameX-backups}
backup="$backup_root/bot-fleet-fix-$(date -u +%Y%m%dT%H%M%SZ)-$$"
(
    umask 077
    mkdir -p "$backup"
    git rev-parse HEAD > "$backup/PREVIOUS_HEAD"
    git symbolic-ref --quiet --short HEAD > "$backup/PREVIOUS_BRANCH" || true
    printf '%s\n' "$target" > "$backup/REVIEWED_FIX"
    cp "$patch" "$backup/fix.patch"
    for file in "${files[@]}"; do
        mkdir -p "$backup/$(dirname "$file")"
        cp -p "$file" "$backup/$file"
    done
)
printf 'Code-Sicherung: %s\n' "$backup"
git apply --index "$patch"
applied=1
refresh_php || die 'PHP-FPM ist nach dem Neuladen nicht gesund.'
git commit -m 'fix(bots): complete due research and preserve starter fleet savings' -- "${files[@]}" >/dev/null
committed=1
printf '\nFERTIG: Bot-Code aktualisiert. Commit: %s\nSicherung: %s\n' "$(git rev-parse --short HEAD)" "$backup"
echo 'Der bestehende Bot-Taktgeber lädt den Fix bei seinem nächsten regulären PHP-Aufruf.'
echo 'Es wurden keine Migrationen, Populationsbefehle oder manuellen Spielstandsänderungen ausgeführt.'
