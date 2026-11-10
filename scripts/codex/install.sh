#!/bin/sh
set -eu
. "$(dirname "$0")/common.sh"
cd "$ogamex_repo_dir"
# Use the existing isolated checkout; do not create a worktree.
ogamex_prepare_ca
docker build --secret "id=ca,src=$OGAMEX_CLOUD_STATE_DIR/ca.pem" \
    -t ogamex-cloud-php:8.5.12 "$ogamex_scripts_dir"
npm ci --cache /workspace/.npm-cache
# public/build is tracked. Use npm run dev instead of overwriting it during setup.
test -f .env || cp .env.example .env
ogamex_compose up -d ogamex-db
python3 "$ogamex_scripts_dir/prefetch-composer.py" \
    --repository "$ogamex_repo_dir" --cache-dir "$OGAMEX_CLOUD_STATE_DIR/composer-cache"
ogamex_compose run --rm --no-deps -T ogamex-app composer install --no-interaction --prefer-dist
sh "$ogamex_scripts_dir/build-rust.sh"
# Nginx workers need read access to the public files in the cloud checkout.
chmod a+rx .
find public -type d -exec chmod a+rx {} +
git ls-files -z public | xargs -0 chmod a+r
ogamex_wait_database
ogamex_compose run --rm --no-deps -T ogamex-app sh -ec '
    mkdir -p vendor/pestphp/pest-plugin-mutate/.temp/pest-mutate-cache
    chown -R 1000:1000 storage bootstrap/cache vendor/pestphp/pest-plugin-mutate/.temp
'
ogamex_compose run --rm --no-deps -T --user 1000:1000 ogamex-app sh -ec '
    if ! grep -Eq "^APP_KEY=.+$" .env; then
        php artisan key:generate --force --no-interaction
    fi
    php artisan migrate --force --no-interaction
'
