#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Synchronise authority repos and validate workspace state before workflow execution."""

from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def echo(msg: str) -> None:
    print(msg)


def git_pull(repo: Path) -> bool:
    result = subprocess.run(
        ["git", "-C", str(repo), "pull", "origin"],
        capture_output=True, text=True,
    )
    return result.returncode == 0


def current_branch() -> str:
    result = subprocess.run(
        ["git", "branch", "--show-current"],
        capture_output=True, text=True,
    )
    return result.stdout.strip()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_hash_manifest(path: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    if not path.is_file():
        return hashes
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([0-9a-fA-F]+)\s{2}(.+)$", line)
        if m:
            hashes[m.group(2)] = m.group(1).lower()
    return hashes


def parse_timestamp(raw: str) -> datetime | None:
    val = raw.strip()
    if not val:
        return None
    # Unix epoch seconds
    if re.match(r"^\d+$", val):
        return datetime.fromtimestamp(int(val), tz=timezone.utc)
    # ISO-8601
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        echo(f"  ⚠ Ignoring invalid preflight timestamp: {val}")
        return None


def pull_window_seconds(branch: str) -> int:
    if branch.startswith("alpha"):
        return 3600
    if branch.startswith("beta"):
        return 10800
    return 86400


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Shared preflight: sync authority repos and validate workspace."
    )
    parser.add_argument("--skip-constitution", action="store_true")
    parser.add_argument("--caller", default="")
    parser.add_argument("--governance-path", default="")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    # Find control repo root: the directory that contains lens.core/
    _cwd = Path.cwd()
    project_root = (
        _cwd if (_cwd / "lens.core").exists()
        else next(p for p in script_dir.parents if (p / "lens.core").exists())
    )
    release_dir = project_root / "lens.core"
    timestamp_file = project_root / "docs/lens-work/personal/.preflight-timestamp"
    hash_file = project_root / "docs/lens-work/personal/.github-hashes"
    lifecycle_path = release_dir / "_bmad/lens-work/lifecycle.yaml"
    governance_path = Path(args.governance_path) if args.governance_path else None

    # Change to project root
    import os
    os.chdir(project_root)

    # ------------------------------------------------------------------
    # Step 1: Check release dir
    # ------------------------------------------------------------------
    echo("[preflight] Checking release branch...")
    if not release_dir.is_dir():
        echo(f"ERROR: lens.core directory not found at {release_dir}")
        return 1

    # ------------------------------------------------------------------
    # Step 1a: Enforce LENS_VERSION compatibility
    # ------------------------------------------------------------------
    echo("[preflight] Verifying LENS_VERSION compatibility...")
    if not lifecycle_path.is_file():
        echo(f"ERROR: lifecycle.yaml not found at {lifecycle_path}")
        return 1

    module_schema = ""
    for line in lifecycle_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("schema_version:"):
            module_schema = line.split(":", 1)[1].strip()
            break

    if not module_schema:
        echo("VERSION MISMATCH: lifecycle.yaml is missing or has empty 'schema_version:'. Run /lens-upgrade.")
        return 1

    lens_version_file = project_root / "LENS_VERSION"
    control_version = lens_version_file.read_text(encoding="utf-8").strip() if lens_version_file.is_file() else ""

    if not control_version or (control_version != module_schema and control_version != f"{module_schema}.0.0"):
        display_version = control_version or "missing"
        echo(f"VERSION MISMATCH: control repo is v{display_version}, module expects v{module_schema}. Run /lens-upgrade.")
        return 1

    echo(f"  ✓ LENS_VERSION v{control_version} matches module schema")

    # ------------------------------------------------------------------
    # Step 2: Determine pull strategy
    # ------------------------------------------------------------------
    needs_pull = True
    last_time: datetime | None = None

    if timestamp_file.is_file():
        raw = timestamp_file.read_text(encoding="utf-8").strip()
        last_time = parse_timestamp(raw)

    if last_time is not None:
        elapsed = (datetime.now(tz=timezone.utc) - last_time).total_seconds()
        window = pull_window_seconds(current_branch())
        if elapsed < window:
            needs_pull = False
            echo(f"[preflight] Timestamp fresh ({int(elapsed)}s < {window}s) — skipping pulls")

    if needs_pull:
        echo("[preflight] Pulling authority repos...")
        if not git_pull(release_dir):
            echo("  ⚠ Release repo pull failed (offline?)")
        if governance_path and governance_path.is_dir():
            if not git_pull(governance_path):
                echo("  ⚠ Governance repo pull failed (offline?)")

    # ------------------------------------------------------------------
    # Step 3: Sync .github/ from release repo (hash-based)
    # ------------------------------------------------------------------
    echo("[preflight] Syncing .github/ from release repo...")
    release_github = release_dir / ".github"
    if not release_github.is_dir():
        echo(f"ERROR: Missing authority folder: {release_github}")
        return 1

    local_github = project_root / ".github"
    local_github.mkdir(parents=True, exist_ok=True)

    stored_hashes = load_hash_manifest(hash_file)
    new_hashes: dict[str, str] = {}
    updated_count = 0

    for src_file in sorted(release_github.rglob("*")):
        if not src_file.is_file():
            continue
        rel = ".github/" + src_file.relative_to(release_github).as_posix()
        r_hash = sha256_file(src_file)
        s_hash = stored_hashes.get(rel, "")
        local_file = project_root / rel
        l_hash = sha256_file(local_file) if local_file.is_file() else ""

        if r_hash != s_hash or l_hash != r_hash:
            local_file.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(src_file, local_file)
            updated_count += 1

        new_hashes[rel] = r_hash

    # Write hash manifest
    hash_file.parent.mkdir(parents=True, exist_ok=True)
    hash_file.write_text(
        "\n".join(f"{v}  {k}" for k, v in sorted(new_hashes.items())) + "\n",
        encoding="utf-8",
    )
    echo(f"  ✓ .github/ synced ({updated_count} file(s) updated)")

    # Prompt hygiene
    prompts_dir = project_root / ".github/prompts"
    if prompts_dir.is_dir():
        release_prompts = release_github / "prompts"
        for pf in list(prompts_dir.iterdir()):
            name = pf.name
            if re.match(r"^lens-.*\.prompt\.md$", name):
                if not (release_prompts / name).exists():
                    pf.unlink()
            elif name.endswith(".prompt.md"):
                pf.unlink()

    # ------------------------------------------------------------------
    # Step 3b: Sync agent entry points
    # ------------------------------------------------------------------
    for entry in ["CLAUDE.md"]:
        src = release_dir / entry
        if src.is_file():
            local = project_root / entry
            if not local.is_file():
                import shutil
                shutil.copy2(src, local)
                echo(f"  ✓ Synced {entry}")
            else:
                result = subprocess.run(
                    ["git", "-C", str(release_dir), "diff", "--name-only", "HEAD@{1}", "HEAD", "--", entry],
                    capture_output=True, text=True,
                )
                if result.stdout.strip():
                    import shutil
                    shutil.copy2(src, local)
                    echo(f"  ✓ Synced {entry}")

    # ------------------------------------------------------------------
    # Step 4: Verify IDE adapters
    # ------------------------------------------------------------------
    if not (project_root / ".claude/commands").is_dir():
        echo("[preflight] .claude/commands missing — running installer...")
        install_script = release_dir / "_bmad/lens-work/scripts/install.py"
        if install_script.is_file():
            subprocess.run(["uv", "run", str(install_script), "--ide", "claude"], check=False)

    # ------------------------------------------------------------------
    # Step 4b: Verify authority repos
    # ------------------------------------------------------------------
    missing_repos = not release_dir.is_dir()
    if governance_path and not governance_path.is_dir():
        missing_repos = True

    if missing_repos:
        if args.caller == "onboard":
            echo("[preflight] Authority repos incomplete — onboard will bootstrap")
        else:
            echo("")
            echo("⚠️  Missing authority repos — this workspace needs onboarding first.")
            echo("")
            echo("  Onboarding sets up your profile, governance repo, and target project clones.")
            echo("  It takes about 2 minutes and only needs to run once.")
            echo("")
            echo("  Run /onboard to get started, then retry this command.")
            return 1

    # ------------------------------------------------------------------
    # Step 6: Update timestamp
    # ------------------------------------------------------------------
    if needs_pull:
        timestamp_file.parent.mkdir(parents=True, exist_ok=True)
        timestamp_file.write_text(
            datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            encoding="utf-8",
        )
        echo("[preflight] Timestamp updated")

    echo("[preflight] Preflight complete ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
