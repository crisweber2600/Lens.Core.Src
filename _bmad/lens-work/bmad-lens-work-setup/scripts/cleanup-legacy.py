# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""
cleanup-legacy.py — Post-install cleanup for lens-work module upgrades.

Safely removes legacy file patterns that have been replaced by
the new BMad Builder folder structure.
"""

import argparse
import sys
from pathlib import Path


LEGACY_FLAT_SKILLS = [
    "skills/checklist.md",
    "skills/constitution.md",
    "skills/git-orchestration.md",
    "skills/git-state.md",
    "skills/sensing.md",
]

LEGACY_DATA_DIRS = [
    "workflows/router/dev/data",
]


def cleanup_legacy(module_dir: Path) -> None:
    removed = 0

    # Remove flat skill files (replaced by skills/{name}/SKILL.md)
    for skill_file in LEGACY_FLAT_SKILLS:
        target = module_dir / skill_file
        if target.exists():
            target.unlink()
            print(f"  Removed legacy skill file: {skill_file}")
            removed += 1

    # Remove legacy data/ directories (renamed to resources/)
    for data_dir in LEGACY_DATA_DIRS:
        target = module_dir / data_dir
        if target.exists() and target.is_dir():
            # Only remove if empty (contents should have been moved to resources/)
            try:
                target.rmdir()
                print(f"  Removed empty legacy directory: {data_dir}")
                removed += 1
            except OSError:
                print(f"  ⚠️ Legacy directory not empty, skipping: {data_dir}")

    if removed == 0:
        print("✅ No legacy artifacts found — module is clean")
    else:
        print(f"✅ Cleaned up {removed} legacy artifact(s)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean up legacy lens-work artifacts")
    parser.add_argument("--module-dir", required=True, help="Path to lens-work module root")
    args = parser.parse_args()

    module_path = Path(args.module_dir)
    if not module_path.exists():
        print(f"❌ Module directory not found: {module_path}", file=sys.stderr)
        sys.exit(1)

    cleanup_legacy(module_path)


if __name__ == "__main__":
    main()
