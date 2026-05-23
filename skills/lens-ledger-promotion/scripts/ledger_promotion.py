#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Review ledger promotion provenance and Salmon blockers."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "lens-setup" / "scripts"
if str(SHARED) not in sys.path:
    sys.path.insert(0, str(SHARED))

from lens_seed_core import collect_entities, run_doctor, validate_promotion  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Review Lens ledger promotion readiness.")
    parser.add_argument("project_root", type=Path)
    parser.add_argument("--work-intake-path", default="docs/features")
    parser.add_argument("--feature-archive-path", default="docs/features")
    parser.add_argument("--landscape-root", default="docs")
    parser.add_argument("--reporting-output-path", default="_bmad-output/lens")
    parser.add_argument("--include-drafts", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    result = validate_promotion(collect_entities(args), run_doctor(args))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
