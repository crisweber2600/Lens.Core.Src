from __future__ import annotations

from importlib import util as importlib_util
from pathlib import Path

import pytest


LENS_YAML_PATH = Path(__file__).resolve().parents[1] / "lens_yaml.py"
SPEC = importlib_util.spec_from_file_location("lens_yaml", LENS_YAML_PATH)
assert SPEC is not None and SPEC.loader is not None
lens_yaml = importlib_util.module_from_spec(SPEC)
SPEC.loader.exec_module(lens_yaml)


def test_safe_dump_round_trips_strings_needing_yaml_quoting() -> None:
    payload = {"title": 'Bob\'s "feature", ready: maybe'}

    dumped = lens_yaml.safe_dump(payload, sort_keys=False)

    assert "\\'" not in dumped
    assert "'Bob''s \"feature\", ready: maybe'" in dumped
    assert lens_yaml.safe_load(dumped) == payload


def test_safe_load_preserves_blank_lines_and_comment_like_lines_in_block_scalars() -> None:
    text = (
        "description: |\n"
        "  First paragraph.\n"
        "\n"
        "  # Heading-like line that is data\n"
        "  Second paragraph.\n"
    )

    loaded = lens_yaml.safe_load(text)

    assert loaded == {
        "description": "First paragraph.\n\n# Heading-like line that is data\nSecond paragraph."
    }
    assert lens_yaml.safe_load(lens_yaml.safe_dump(loaded, sort_keys=False)) == loaded


def test_safe_load_rejects_malformed_inline_list() -> None:
    with pytest.raises(lens_yaml.YAMLError, match="Invalid inline list"):
        lens_yaml.safe_load("bad: [unclosed\n")


def test_safe_dump_allow_unicode_false_escapes_non_ascii_scalars() -> None:
    payload = {"name": "café", "description": "naïve path"}

    dumped = lens_yaml.safe_dump(payload, sort_keys=False, allow_unicode=False)

    assert "café" not in dumped
    assert "naïve" not in dumped
    assert '"caf\\u00e9"' in dumped
    assert '"na\\u00efve path"' in dumped
    assert lens_yaml.safe_load(dumped) == payload


def test_safe_dump_allow_unicode_false_escapes_non_ascii_scalars() -> None:
    payload = {"name": "café", "description": "naïve path"}

    dumped = lens_yaml.safe_dump(payload, sort_keys=False, allow_unicode=False)

    assert "café" not in dumped
    assert "naïve" not in dumped
    assert '"caf\\u00e9"' in dumped
    assert '"na\\u00efve path"' in dumped
    assert lens_yaml.safe_load(dumped) == payload
