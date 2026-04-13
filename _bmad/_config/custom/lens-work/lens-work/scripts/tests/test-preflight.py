"""Tests for preflight.py."""
import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parent.parent / "preflight.py"


def _run(*args, **kwargs):
    return subprocess.run(
        ["uv", "run", "--script", str(SCRIPT), *args],
        capture_output=True,
        text=True,
        **kwargs,
    )


def _write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_hash_manifest(workspace: Path, entries: dict[str, str]) -> None:
    manifest = workspace / ".github/lens/personal/.github-hashes"
    lines = []

    for rel_path, content in sorted(entries.items()):
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        lines.append(f"{digest}  {rel_path}")

    _write_file(manifest, "\n".join(lines) + ("\n" if lines else ""))


@pytest.fixture()
def workspace(tmp_path: Path) -> Path:
    root = tmp_path / "workspace"
    _write_file(root / "LENS_VERSION", "3.4\n")
    _write_file(root / "lens.core/_bmad/lens-work/lifecycle.yaml", "schema_version: 3.4\n")
    _write_file(
        root / ".github/lens/personal/.preflight-timestamp",
        datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    return root


class TestHelpFlag:
    def test_help_exits_zero(self):
        result = _run("--help")
        assert result.returncode == 0, f"--help should exit 0\nstdout: {result.stdout}\nstderr: {result.stderr}"

    def test_help_contains_usage(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "preflight" in combined.lower() or "usage" in combined.lower()


class TestArgumentParsing:
    def test_unknown_flag_exits_nonzero(self):
        result = _run("--unknown-arg-xyz")
        assert result.returncode != 0

    def test_skip_constitution_flag_accepted(self):
        # --skip-constitution is a valid flag; just verify it is recognized (may fail on env)
        result = _run("--skip-constitution", "--help")
        # --help should override and exit 0 even with additional flags
        assert result.returncode == 0


class TestGitHubSync:
    def test_prunes_manifest_tracked_stale_github_files(self, workspace: Path):
        keep_workflow = "name: keep\n"
        keep_prompt = "---\ndescription: keep\n---\n"

        _write_file(workspace / "lens.core/.github/workflows/keep.yml", keep_workflow)
        _write_file(workspace / "lens.core/.github/prompts/lens-keep.prompt.md", keep_prompt)
        _write_file(workspace / ".github/workflows/keep.yml", "name: old\n")
        _write_file(workspace / ".github/workflows/legacy/obsolete.yml", "name: obsolete\n")
        _write_file(workspace / ".github/prompts/lens-stale.prompt.md", "---\ndescription: stale\n---\n")
        _write_hash_manifest(
            workspace,
            {
                ".github/prompts/lens-stale.prompt.md": "---\ndescription: stale\n---\n",
                ".github/workflows/keep.yml": "name: old\n",
                ".github/workflows/legacy/obsolete.yml": "name: obsolete\n",
            },
        )

        result = _run(cwd=workspace)

        assert result.returncode == 0, result.stdout + result.stderr
        assert (workspace / ".github/workflows/keep.yml").read_text(encoding="utf-8") == keep_workflow
        assert (workspace / ".github/prompts/lens-keep.prompt.md").read_text(encoding="utf-8") == keep_prompt
        assert not (workspace / ".github/workflows/legacy/obsolete.yml").exists()
        assert not (workspace / ".github/workflows/legacy").exists()
        assert not (workspace / ".github/prompts/lens-stale.prompt.md").exists()

        manifest_text = (workspace / ".github/lens/personal/.github-hashes").read_text(encoding="utf-8")
        assert ".github/workflows/legacy/obsolete.yml" not in manifest_text
        assert ".github/prompts/lens-stale.prompt.md" not in manifest_text
        assert ".github/workflows/keep.yml" in manifest_text
        assert ".github/prompts/lens-keep.prompt.md" in manifest_text

    def test_preserves_untracked_non_prompt_github_files(self, workspace: Path):
        _write_file(workspace / "lens.core/.github/workflows/keep.yml", "name: keep\n")
        _write_file(workspace / ".github/local/custom.yml", "name: custom\n")
        _write_hash_manifest(workspace, {})

        result = _run(cwd=workspace)

        assert result.returncode == 0, result.stdout + result.stderr
        assert (workspace / ".github/local/custom.yml").read_text(encoding="utf-8") == "name: custom\n"

    def test_prompt_hygiene_removes_untracked_prompt_files(self, workspace: Path):
        keep_prompt = "---\ndescription: keep\n---\n"

        _write_file(workspace / "lens.core/.github/prompts/lens-keep.prompt.md", keep_prompt)
        _write_file(workspace / ".github/prompts/lens-stale.prompt.md", "---\ndescription: stale\n---\n")
        _write_file(workspace / ".github/prompts/custom.prompt.md", "---\ndescription: custom\n---\n")
        _write_hash_manifest(workspace, {})

        result = _run(cwd=workspace)

        assert result.returncode == 0, result.stdout + result.stderr
        assert (workspace / ".github/prompts/lens-keep.prompt.md").read_text(encoding="utf-8") == keep_prompt
        assert not (workspace / ".github/prompts/lens-stale.prompt.md").exists()
        assert not (workspace / ".github/prompts/custom.prompt.md").exists()


# TODO: Test version comparison logic (requires monkeypatch or script refactor)
# TODO: Test TTL window calculation
