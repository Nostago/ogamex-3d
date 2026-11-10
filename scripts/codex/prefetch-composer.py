#!/usr/bin/env python3
"""Cache official GitHub archives for locked commits without changing composer.lock.

The cloud package-manager allowlist permits codeload.github.com. Composer's
locked api.github.com archive URLs can be blocked. Both endpoints deliver the
official legacy ZIP for the same commit. Composer 2.11.1 keys its ZIP cache by
SHA-1 of the locked URL; the Dockerfile pins the Composer image digest.
"""

import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import re
import subprocess
import zipfile


def validate_archive(path, reference, checksum):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise RuntimeError(f"Corrupt archive: {path}")
        if not archive.namelist()[0].rstrip("/").endswith(reference[:7]):
            raise RuntimeError(f"Archive commit mismatch: {path}")
    if checksum and hashlib.sha1(path.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f"Checksum mismatch: {path}")


def fetch_package(package, cache_dir):
    dist = package.get("dist", {})
    url = dist.get("url", "")
    match = re.fullmatch(
        r"https://api.github.com/repos/([^/]+/[^/]+)/zipball/([0-9a-f]{40})", url
    )
    if not match or dist.get("type") != "zip":
        raise RuntimeError(f"Unsupported archive URL for {package['name']}")
    repository, reference = match.groups()
    if reference != dist["reference"]:
        raise RuntimeError(f"Reference mismatch for {package['name']}")

    target = cache_dir / "files" / package["name"] / (hashlib.sha1(url.encode()).hexdigest() + ".zip")
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        validate_archive(target, reference, dist.get("shasum"))
        return

    temporary = target.with_suffix(".download")
    try:
        subprocess.run(
            [
                "curl", "--fail", "--silent", "--show-error", "--location",
                "--retry", "2", "--max-time", "120",
                f"https://codeload.github.com/{repository}/legacy.zip/{reference}",
                "-o", str(temporary),
            ],
            check=True,
        )
        validate_archive(temporary, reference, dist.get("shasum"))
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, type=pathlib.Path)
    parser.add_argument("--cache-dir", required=True, type=pathlib.Path)
    args = parser.parse_args()
    lock = json.loads((args.repository / "composer.lock").read_text())
    packages = lock["packages"] + lock["packages-dev"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_package, package, args.cache_dir) for package in packages]
        for future in futures:
            future.result()
    print(f"Verified official archives cached: {len(packages)}")


if __name__ == "__main__":
    main()
