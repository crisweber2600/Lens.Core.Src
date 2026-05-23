#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Run repeatable local release validation for lens.core.src."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lens_seed_core import run_release_validation


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Lens release validation.")
    parser.add_argument("project_root", type=Path)
    parser.add_argument("--work-intake-path", default="docs/features")
    parser.add_argument("--feature-archive-path", default="docs/features")
    parser.add_argument("--landscape-root", default="docs")
    parser.add_argument("--reporting-output-path", default="_bmad-output/lens")
    parser.add_argument("--include-drafts", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--branch")
    parser.add_argument("--allow-projection-drift", action="store_true")
    exit_code, result = run_release_validation(parser.parse_args())
    print(json.dumps(result, indent=2, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
