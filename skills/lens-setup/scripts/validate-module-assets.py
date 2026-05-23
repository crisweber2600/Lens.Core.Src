#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Validate Lens module registration assets and progressive disclosure risks."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lens_seed_core import validate_module_assets


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Lens module assets.")
    parser.add_argument("project_root", type=Path)
    result = validate_module_assets(parser.parse_args().project_root.resolve())
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
