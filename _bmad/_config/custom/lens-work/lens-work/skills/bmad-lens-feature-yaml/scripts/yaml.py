from __future__ import annotations

import importlib.util
from pathlib import Path

_here = Path(__file__).resolve()
_target = None
for parent in _here.parents[1:]:
    candidate = parent / "yaml.py"
    if candidate.exists() and candidate != _here:
        _target = candidate
        break
if _target is None:
    raise ModuleNotFoundError("No module named 'yaml'")

_spec = importlib.util.spec_from_file_location("_lens_yaml_root", _target)
if _spec is None or _spec.loader is None:
    raise ModuleNotFoundError("No module named 'yaml'")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

YAMLError = _mod.YAMLError
safe_load = _mod.safe_load
dump = _mod.dump
safe_dump = _mod.safe_dump
