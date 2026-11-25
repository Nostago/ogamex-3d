"""Exercise the SSH installer against real temporary Git repos and mocked runtimes."""
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / 'scripts/codex/install-bot-fleet-stall-fix.sh'
FILES = ['app/Services/AutonomousBotService.php', 'resources/lang/de/t_bots.php', 'resources/lang/en/t_bots.php']


class InstallerTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ogamex-installer-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / 'project'
        self.project.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Installer test')
        self.git('config', 'user.email', 'installer@test.invalid')
        (self.project / '.gitignore').write_text('/vendor/\n')
        self.write_sources('base')
        self.base = self.commit()
        self.write_sources('submitted')
        self.original = self.commit()
        self.write_sources('reviewed')
        (self.project / 'unrelated-release-file').write_text('Do not install this file')
        self.target = self.commit()
        self.git('checkout', '-q', '--detach', self.base)
        (self.project / 'vendor').mkdir()
        (self.project / 'vendor/autoload.php').write_text('<?php\n')
        self.script = self.root / 'installer.sh'
        self.script.write_text(SCRIPT.read_text().replace('ac5cb5298f3d86d7c636a0d7b4cd7e70cac65764', self.base).replace('7f7725f54e05a6730f848926c36bfff0b66f2c2f', self.original))
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.log = self.root / 'signals.log'
        self.log.write_text('')
        self.executable('php', '''#!/usr/bin/env bash
cat >/dev/null
[[ ${FAIL_LINT:-0} != 1 ]] || exit 1
echo 'Syntax OK'
''')
        self.executable('docker', r'''#!/usr/bin/env bash
set -e
case "$1" in
ps) [[ ${FAKE_MODE:-native} != docker ]] || echo test-app ;;
inspect)
    if [[ $3 == *Mounts* ]]; then printf '%s\t/var/www\n' "${FAKE_MOUNT:-$OGAMEX_PROJECT_DIR}"
    elif [[ $3 == *Health* ]]; then
        if [[ ${FAIL_HEALTH:-0} == 1 && $(wc -l < "$FAKE_LOG") == 1 ]]; then echo unhealthy; else echo healthy; fi
    else exit 98; fi ;;
exec)
    shift
    if [[ $1 == -i ]]; then shift; fi
    shift
    case "$1" in
      cat) echo php-fpm ;;
      sha256sum) sha256sum "$OGAMEX_PROJECT_DIR/${2#/var/www/}" ;;
      php) exec php -l ;;
      *) exit 97 ;;
    esac ;;
kill) printf '%s\n' "$*" >> "$FAKE_LOG" ;;
*) exit 96 ;;
esac
''')
        self.env = {**os.environ, 'PATH': str(self.bin) + ':' + os.environ['PATH'],
                    'OGAMEX_PROJECT_DIR': str(self.project), 'OGAMEX_BACKUP_ROOT': str(self.root / 'backups'),
                    'FAKE_LOG': str(self.log), 'FAKE_MODE': 'native'}

    def executable(self, name, text):
        path = self.bin / name
        path.write_text(text)
        path.chmod(0o755)

    def git(self, *args):
        result = subprocess.run(['git', *args], cwd=self.project, text=True, capture_output=True)
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def write_sources(self, version):
        for file in FILES:
            path = self.project / file
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f'<?php\necho "{version}:{file}";\n')
            path.chmod(0o644)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        return self.git('rev-parse', 'HEAD')

    def run_installer(self, **environment):
        return subprocess.run(['bash', str(self.script), self.target], env={**self.env, **environment}, text=True, capture_output=True)

    def assert_sources(self, version):
        for file in FILES:
            self.assertIn(f'"{version}:', (self.project / file).read_text())

    def assert_unchanged(self):
        self.assert_sources('base')
        self.assertEqual(self.git('rev-parse', 'HEAD'), self.base)
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_native_install_changes_only_three_files_and_backs_up_privately(self):
        result = self.run_installer()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_sources('reviewed')
        self.assertEqual(set(self.git('diff', '--name-only', self.base, 'HEAD').splitlines()), set(FILES))
        self.assertFalse((self.project / 'unrelated-release-file').exists())
        backup = next((self.root / 'backups').iterdir())
        self.assertEqual(stat.S_IMODE(backup.stat().st_mode), 0o700)
        self.assertEqual((backup / 'PREVIOUS_HEAD').read_text().strip(), self.base)
        for file in FILES:
            self.assertIn('"base:', (backup / file).read_text())
            self.assertEqual(stat.S_IMODE((self.project / file).stat().st_mode), 0o644)
        self.assertEqual(self.git('status', '--porcelain'), '')
        self.assertEqual(self.log.read_text(), '')

    def test_docker_reloads_only_fpm_without_restarting_stack(self):
        result = self.run_installer(FAKE_MODE='docker')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_sources('reviewed')
        self.assertEqual(self.log.read_text(), 'kill --signal=USR2 test-app\n')

    def test_unhealthy_runtime_rolls_back_code_and_index_even_on_explicit_abort(self):
        result = self.run_installer(FAKE_MODE='docker', FAIL_HEALTH='1')
        self.assertNotEqual(result.returncode, 0)
        self.assert_unchanged()
        self.assertEqual(self.log.read_text().count('USR2'), 2)
        self.assertTrue((self.root / 'backups').exists())

    def test_candidate_lint_failure_leaves_sources_untouched(self):
        result = self.run_installer(FAIL_LINT='1')
        self.assertNotEqual(result.returncode, 0)
        self.assert_unchanged()
        self.assertEqual(self.log.read_text(), '')
        self.assertFalse((self.root / 'backups').exists())

    def test_dirty_worktree_is_not_overwritten(self):
        path = self.project / FILES[0]
        path.write_text('local edits\n')
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(path.read_text(), 'local edits\n')
        self.assertEqual(self.log.read_text(), '')

    def test_incompatible_tracked_source_is_not_overwritten(self):
        path = self.project / FILES[0]
        path.write_text('completely different source\n')
        original = self.commit()
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(path.read_text(), 'completely different source\n')
        self.assertEqual(self.git('rev-parse', 'HEAD'), original)

    def test_repeat_install_is_idempotent_and_does_not_reload_again(self):
        first = self.run_installer(FAKE_MODE='docker')
        self.assertEqual(first.returncode, 0, first.stderr)
        head = self.git('rev-parse', 'HEAD')
        result = self.run_installer(FAKE_MODE='docker')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('bereits enthalten', result.stdout)
        self.assertEqual(self.git('rev-parse', 'HEAD'), head)
        self.assertEqual(self.log.read_text().count('USR2'), 1)

    def test_original_pr_can_be_upgraded_without_reapplying_old_changes(self):
        self.git('checkout', '-q', '--detach', self.original)
        result = self.run_installer()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_sources('reviewed')

    def test_container_with_another_checkout_is_not_modified(self):
        result = self.run_installer(FAKE_MODE='docker', FAKE_MOUNT='/other/checkout')
        self.assertNotEqual(result.returncode, 0)
        self.assert_unchanged()
        self.assertEqual(self.log.read_text(), '')

    def test_failing_commit_hook_is_respected_and_code_is_restored(self):
        hook = self.project / '.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\nexit 1\n')
        hook.chmod(0o755)
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assert_unchanged()


if __name__ == '__main__':
    unittest.main()
