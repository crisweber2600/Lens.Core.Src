
"""Local yaml shim to load repository-provided yaml.py without external deps."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import sys

for parent in Path(__file__).resolve().parents:
    candidate = parent / 'yaml.py'
    if candidate.exists() and candidate != Path(__file__).resolve():
        spec = importlib.util.spec_from_file_location('_lens_yaml', candidate)
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        globals().update(module.__dict__)
        sys.modules[__name__] = module
        break
else:
    raise ModuleNotFoundError('No bundled yaml.py found')
