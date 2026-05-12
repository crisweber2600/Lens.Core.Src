"""Lens YAML shim loader for script-entrypoint imports."""

from __future__ import annotations

import importlib.util
from pathlib import Path

_ROOT_YAML = Path(__file__).resolve().parents[3] / "yaml.py"
_SPEC = importlib.util.spec_from_file_location("_lens_yaml_root", _ROOT_YAML)
if _SPEC is None or _SPEC.loader is None:
    raise ImportError(f"Unable to load Lens YAML shim from {_ROOT_YAML}")
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)

YAMLError = _MODULE.YAMLError
safe_load = _MODULE.safe_load
safe_load_all = _MODULE.safe_load_all
safe_dump = _MODULE.safe_dump
dump = _MODULE.dump
