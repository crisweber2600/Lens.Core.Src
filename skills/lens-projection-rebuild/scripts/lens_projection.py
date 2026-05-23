#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""CLI front-end for Lens doctor and projection rebuild operations."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "lens-setup" / "scripts"
if str(SHARED) not in sys.path:
    sys.path.insert(0, str(SHARED))

from lens_seed_core import run_doctor, run_rebuild  # noqa: E402


def add_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("project_root", type=Path, help="Project root containing authored docs.")
    parser.add_argument("--work-intake-path", default="docs/features")
    parser.add_argument("--feature-archive-path", default="docs/features")
    parser.add_argument("--landscape-root", default="docs")
    parser.add_argument("--reporting-output-path", default="_bmad-output/lens")
    parser.add_argument("--include-drafts", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--branch")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Lens doctor checks or rebuild derived governance maps.")
    subcommands = parser.add_subparsers(dest="command", required=True)
    doctor = subcommands.add_parser("doctor", help="Validate authored topology metadata.")
    add_common_arguments(doctor)
    rebuild = subcommands.add_parser("rebuild", help="Check, write, or explain derived governance-map output.")
    add_common_arguments(rebuild)
    rebuild.add_argument("--check", action="store_true", help="Compare generated output without writing.")
    rebuild.add_argument("--write", action="store_true", help="Write generated governance-map JSON and Markdown.")
    rebuild.add_argument("--explain", help="Explain one stable_id.")
    rebuild.add_argument("--json", action="store_true", help="Emit machine-readable output.")
    rebuild.add_argument("--force", action="store_true")
    rebuild.add_argument("--generated-at", help="Deterministic timestamp override for tests.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "doctor":
        result = run_doctor(args)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if result["status"] == "pass" else 1
    exit_code, result = run_rebuild(args)
    print(json.dumps(result, indent=2, sort_keys=True))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
