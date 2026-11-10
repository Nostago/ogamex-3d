# Codex cloud development environment

These scripts retain the setup validated during cloud onboarding. They use the
existing isolated checkout; do not create a worktree unless explicitly requested.
They do not update dependency versions or lockfiles. Run them as the regular
cloud user, without `sudo`.

## Environment settings

Select `Nostago/ogamex-3d` and the branch containing these scripts. After merging
the pull request, select `main`. The checkout below is `/workspace/ogamex-3d`.

**Installation script:**

```sh
cd /workspace/ogamex-3d
sh scripts/codex/install.sh
```

**Start instructions / start_skill:**

```sh
cd /workspace/ogamex-3d
sh scripts/codex/start.sh
```

If the start field accepts agent instructions rather than an executable script,
enter: “Use the existing checkout at `/workspace/ogamex-3d`; do not create a
worktree. Run `sh scripts/codex/start.sh` there and check its exit status.”

Save the settings and publish the prepared environment through the Codex UI.
Committing these scripts alone does not update or publish the cloud settings.
Installation prepares retained dependencies; start restarts processes after a
snapshot is restored. Start does not run npm, Composer, or a Rust build.

## Prerequisites and retained state

- Managed Linux cloud environment with working Docker/Compose (including
  `!reset` overrides), BuildKit, Node 24/npm, Python 3, curl, and Git.
- The prepared PHP image and workers use UID/GID `1000:1000`, matching the
  managed cloud user. Rust builds use four jobs.
- PHP `8.5.12-fpm`, Rust `1.90-bookworm`, and MariaDB `11.3.2-jammy` follow the
  validated setup. Composer's image digest is pinned for its archive-cache format.
- Keep the inherited proxy configuration and the supplied `CODEX_PROXY_CERT`.
  TLS, package signatures, and existing archive checksums remain enabled.
- Enable the cloud package-manager network preset. Downloads use Docker Hub and
  its registry/CDN, Debian repositories, `registry.npmjs.org`,
  `codeload.github.com`, `index.crates.io`, and `static.crates.io`. No additional
  application credentials are needed for local development. Email delivery and
  Discord integration remain optional.

Caches, Rust build outputs, and the regenerated cloud CA bundle live outside the
checkout in `/workspace/ogamex-cloud` by default. Override that path with
`OGAMEX_CLOUD_STATE_DIR` consistently for installation, start, and compose calls.
The existing onboarding caches at the default path are reused. No certificates,
credentials, `.env`, cache files, or database contents are committed here.

Installation copies `.env.example` only when `.env` is absent and generates an
application key only when its entry is missing or empty. It installs locked
dependencies, builds the Rust libraries, prepares writable cache directories,
and runs migrations against the configured local database. It uses the database
and development settings in the existing Docker Compose configuration. Do not
point these development commands at a production database.

GitHub ZIPs are prefetched from the official codeload endpoint at the exact
locked commits, including PHPStan, which has no Git source in the lockfile.
The helper validates ZIP CRCs, archive commit names, and any supplied SHA-1
checksums, then populates Composer's retained cache under the original URL keys.
It fails explicitly for unsupported archive formats rather than rewriting the
lockfile. Composer uses its normal `install --prefer-dist` workflow afterward.

## Development and readiness

Start runs PHP-FPM, MariaDB, Nginx, the scheduler, queue worker, and Reverb, then
checks migrations and follows the local HTTP redirects to the login page.
phpMyAdmin is optional. The database volume and `.env` survive container
recreation. Do not use `down -v` if you want to retain development data.

Use the cloud Compose wrapper for subsequent commands:

```sh
sh scripts/codex/compose.sh ps
sh scripts/codex/compose.sh logs --tail=50 ogamex-app
sh scripts/codex/compose.sh exec -T --user 1000:1000 ogamex-app \
  ./vendor/bin/pest tests/Unit/RustFfiTest.php tests/Unit/ObjectLogicTest.php tests/Feature/Http200Test.php
```

For frontend development, run `npm run dev` from the repository root.
`public/build` is tracked; installation deliberately leaves those assets alone.
The existing Vite build warns about image files already missing from the checkout.
Onboarding verified the Vite build/dev server, 15 selected PHP tests with 471
assertions, migrations, login HTML, a Reverb WebSocket handshake, and repeated
installation/start. The full test suite was not run during onboarding. Rust's
native test targets contain zero tests; the PHP FFI test checks the integration.
