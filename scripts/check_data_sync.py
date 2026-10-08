#!/usr/bin/env python3
"""
scripts/check_data_sync.py
==========================
Asserts that copies of datasets across folders are byte-identical.
Exit code 0 on success, exit code 1 on mismatch.
"""

import hashlib
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).parent.parent

SYNC_PAIRS = [
    (
        REPO_ROOT / "data" / "processed" / "restaurants_ng.json",
        REPO_ROOT / "tastematch" / "public" / "data" / "restaurants_ng.json",
    ),
    (
        REPO_ROOT / "data" / "manifest.json",
        REPO_ROOT / "tastematch" / "public" / "data" / "manifest.json",
    ),
]


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    errors = []
    print("Checking dataset file synchronization...")

    for src, dst in SYNC_PAIRS:
        if not src.exists():
            errors.append(f"Source missing: {src}")
            continue
        if not dst.exists():
            errors.append(f"Target missing: {dst}")
            continue

        sha_src = sha256_file(src)
        sha_dst = sha256_file(dst)

        if sha_src != sha_dst:
            errors.append(
                f"Mismatch:\n  {src} ({sha_src})\n  {dst} ({sha_dst})"
            )
        else:
            print(f"  ✓ In sync: {src.name} ({sha_src[:12]}...)")

    if errors:
        print("\n❌ DATA SYNC ERRORS:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    print("\n✓ All dataset copies are byte-identical.")
    sys.exit(0)


if __name__ == "__main__":
    main()
