#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
import sys
from typing import Callable, Sequence


EXPECTED_COMMANDS = [
    "preflight",
    "new-domain",
    "new-service",
    "new-feature",
    "switch",
    "next",
    "preplan",
    "businessplan",
    "techplan",
    "finalizeplan",
    "expressplan",
    "dev",
    "complete",
    "split-feature",
    "constitution",
    "discover",
    "upgrade",
]

EXPECTED_COLUMNS = [
    "command",
    "public_stub_path",
    "public_stub_state",
    "release_prompt_path",
    "release_prompt_state",
    "owner_path",
    "owner_state",
    "target_status",
]

ARTIFACT_STATE_COLUMNS = {
    "public_stub_state": "public_stub_path",
    "release_prompt_state": "release_prompt_path",
    "owner_state": "owner_path",
}

VALID_ARTIFACT_STATES = {"present", "missing"}
VALID_TARGET_STATUSES = {"present", "partial", "missing"}


class ParityMapError(Exception):
    """Raised when the parity map cannot be parsed."""


def expected_owner_path(command: str) -> str:
    if command in {"new-domain", "new-service", "new-feature"}:
        return "_bmad/lens-work/lens-init-feature/SKILL.md"
    if command == "preflight":
        return "_bmad/lens-work/lens-preflight/scripts/light-preflight.py"
    return f"_bmad/lens-work/lens-{command}/SKILL.md"


EXPECTED_PATHS: dict[str, Callable[[str], str]] = {
    "public_stub_path": lambda command: f".github/prompts/lens-{command}.prompt.md",
    "release_prompt_path": lambda command: f"_bmad/lens-work/prompts/lens-{command}.prompt.md",
    "owner_path": expected_owner_path,
}


def clean_cell(cell: str) -> str:
    cleaned = cell.strip()
    if cleaned.startswith("`") and cleaned.endswith("`"):
        cleaned = cleaned[1:-1]
    return cleaned.strip()


def split_table_row(line: str) -> list[str]:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return [clean_cell(cell) for cell in stripped.split("|")]


def is_separator_row(cells: Sequence[str]) -> bool:
    return all(cell.replace("-", "").replace(":", "").strip() == "" for cell in cells)


def parse_inventory(document_path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    headers: list[str] | None = None

    try:
        text = document_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ParityMapError(f"could not read inventory document {document_path}: {exc}") from exc

    for line in text.splitlines():
        stripped = line.strip()
        if headers is None:
            if stripped.startswith("| command |") and "public_stub_path" in stripped:
                headers = split_table_row(stripped)
                if headers != EXPECTED_COLUMNS:
                    raise ParityMapError(
                        f"inventory table columns do not match expected columns: {headers}"
                    )
            continue

        if not stripped.startswith("|"):
            if rows:
                break
            continue

        cells = split_table_row(stripped)
        if is_separator_row(cells):
            continue
        if len(cells) != len(headers):
            raise ParityMapError(f"inventory row has {len(cells)} cells, expected {len(headers)}: {stripped}")
        rows.append(dict(zip(headers, cells)))

    if not rows:
        raise ParityMapError("inventory table not found")
    return rows


def find_repo_root(start_path: Path) -> Path:
    for candidate in [start_path, *start_path.parents]:
        if (candidate / ".git").exists():
            return candidate
    raise ParityMapError(f"could not locate repo root above {start_path}")


def reject_absolute_path(relative_path: str, command: str, column: str, errors: list[str]) -> None:
    if relative_path.startswith(("/", "\\")) or ":" in relative_path:
        errors.append(f"{command}: {column} must be repo-relative, got {relative_path!r}")


def target_status_from_states(states: Sequence[str]) -> str:
    present_count = sum(1 for state in states if state == "present")
    if present_count == len(states):
        return "present"
    if present_count == 0:
        return "missing"
    return "partial"


def validate_inventory(rows: list[dict[str, str]], repo_root: Path) -> list[str]:
    errors: list[str] = []
    commands = [row["command"] for row in rows]

    if commands != EXPECTED_COMMANDS:
        errors.append(f"command list drift: expected {EXPECTED_COMMANDS}, got {commands}")
    if any(command.lower() == "quickplan" for command in commands):
        errors.append("QuickPlan must not be listed as a public retained command")

    for row in rows:
        command = row["command"]
        if row["target_status"] not in VALID_TARGET_STATUSES:
            errors.append(f"{command}: invalid target_status {row['target_status']!r}")

        actual_artifact_states: list[str] = []
        for path_column, expected_path_factory in EXPECTED_PATHS.items():
            listed_path = row[path_column]
            expected_path = expected_path_factory(command)
            reject_absolute_path(listed_path, command, path_column, errors)
            if listed_path != expected_path:
                errors.append(f"{command}: {path_column} drift: expected {expected_path}, got {listed_path}")

        for state_column, path_column in ARTIFACT_STATE_COLUMNS.items():
            declared_state = row[state_column]
            invalid_declaration = declared_state not in VALID_ARTIFACT_STATES
            if invalid_declaration:
                errors.append(f"{command}: invalid {state_column} {declared_state!r}")

            listed_path = row[path_column]
            actual_state = "present" if (repo_root / listed_path).exists() else "missing"
            actual_artifact_states.append(actual_state)
            if not invalid_declaration and declared_state != actual_state:
                errors.append(
                    f"{command}: {path_column} is {actual_state} in live tree but map declares {declared_state}"
                )

        computed_target_status = target_status_from_states(actual_artifact_states)
        if row["target_status"] != computed_target_status:
            errors.append(
                f"{command}: target_status is {row['target_status']}, computed {computed_target_status}"
            )

    return errors


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the retained command parity map against the live tree.")
    parser.add_argument(
        "--doc",
        type=Path,
        default=Path(__file__).with_name("retained-command-parity-map.md"),
        help="Path to retained-command-parity-map.md",
    )
    parser.add_argument("--repo-root", type=Path, default=None, help="Target repo root; defaults to nearest parent with .git")
    args = parser.parse_args(argv)

    document_path = args.doc.resolve()
    repo_root = args.repo_root.resolve() if args.repo_root else find_repo_root(Path(__file__).resolve())

    try:
        rows = parse_inventory(document_path)
        errors = validate_inventory(rows, repo_root)
    except ParityMapError as error:
        print(f"DRIFT: {error}", file=sys.stderr)
        return 2

    if errors:
        print("DRIFT: retained-command parity map does not match the live tree", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    status_counts = Counter(row["target_status"] for row in rows)
    print(
        "OK: retained-command parity map matches the live tree "
        f"({len(rows)} commands: present={status_counts['present']}, "
        f"partial={status_counts['partial']}, missing={status_counts['missing']})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())