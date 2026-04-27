import json
import os
import subprocess
import sys
from pathlib import Path

import yaml


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "init-feature-ops.py"
EXPECTED_CONSTITUTION_BODY = """\
---
permitted_tracks: [quickplan, full, hotfix, tech-change]
required_artifacts:
  planning:
    - business-plan
  dev:
    - stories
gate_mode: informational
sensing_gate_mode: informational
additional_review_participants: []
enforce_stories: true
enforce_review: true
---

# {display} Domain Constitution

This constitution defines governance rules for the **{display}** domain.

## Scope

Applies to all services and repositories within the `{domain}` domain.
Lower-level constitutions (service, repo) may add constraints but may not remove those defined here.

## Tracks

All standard tracks are permitted: `quickplan`, `full`, `hotfix`, `tech-change`.
Service-level constitutions may restrict this list further.

## Artifacts

- **Planning phase:** a `business-plan` is required before promotion to dev.
- **Dev phase:** at least one story file must exist before dev work begins.

## Review

Peer review is enforced for all features in this domain.
Additional participants may be named at the service or repo level.

## Notes

This constitution was initialized with domain defaults.
Update it to reflect the specific governance needs of the {display} domain.
"""


def run_script(args, cwd=None, env=None):
    completed = subprocess.run(
        [sys.executable, str(SCRIPT_PATH), *args],
        cwd=str(cwd) if cwd else None,
        env=env,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout or "{}")
    return completed, payload


def init_git_repo(path: Path, branch: str = "main"):
    subprocess.run(["git", "init", "-b", branch, str(path)], check=True, capture_output=True, text=True)
    subprocess.run(["git", "-C", str(path), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(path), "config", "user.name", "Test User"], check=True)
    subprocess.run(["git", "-C", str(path), "commit", "--allow-empty", "-m", "init"], check=True)


def test_validate_safe_id_valid(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    completed, payload = run_script(
        ["create-domain", "--governance-repo", str(gov), "--domain", "lens-dev", "--dry-run"]
    )
    assert completed.returncode == 0
    assert payload["status"] == "pass"


def test_validate_safe_id_invalid(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    completed, payload = run_script(
        ["create-domain", "--governance-repo", str(gov), "--domain", "UPPER", "--dry-run"]
    )
    assert completed.returncode == 1
    assert payload["status"] == "fail"
    assert "Invalid domain" in payload["error"]


def test_create_domain_dry_run(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "my-domain",
            "--personal-folder",
            str(personal),
            "--dry-run",
        ]
    )
    assert completed.returncode == 0
    assert payload["status"] == "pass"
    assert payload["dry_run"] is True
    assert payload["context_path"] is not None
    assert not (gov / "features" / "my-domain" / "domain.yaml").exists()
    assert not (gov / "constitutions" / "my-domain" / "constitution.md").exists()
    assert not (personal / "context.yaml").exists()


def test_create_domain_basic(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "platform",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    assert payload["status"] == "pass"
    assert payload["dry_run"] is False
    assert (gov / "features" / "platform" / "domain.yaml").exists()
    assert (gov / "constitutions" / "platform" / "constitution.md").exists()
    assert (personal / "context.yaml").exists()


def test_create_domain_with_scaffolds(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    target = tmp_path / "target"
    docs = tmp_path / "docs"
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "infra",
            "--target-projects-root",
            str(target),
            "--docs-root",
            str(docs),
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    assert payload["status"] == "pass"
    assert (target / "infra" / ".gitkeep").exists()
    assert (docs / "infra" / ".gitkeep").exists()
    assert payload["target_projects_path"] == str(target / "infra")
    assert payload["docs_path"] == str(docs / "infra")
    assert payload["created_marker_paths"] == ["features/infra/domain.yaml"]
    assert len(payload["workspace_git_commands"]) == 2
    assert "target/infra/.gitkeep" in payload["workspace_git_commands"][0]
    assert "docs/infra/.gitkeep" in payload["workspace_git_commands"][0]
    assert payload["git_commands"] == payload["remaining_git_commands"]


def test_create_domain_duplicate_fails(tmp_path):
    gov = tmp_path / "gov"
    (gov / "features" / "platform").mkdir(parents=True)
    (gov / "features" / "platform" / "domain.yaml").write_text("kind: domain\n", encoding="utf-8")
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "platform",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 1
    assert payload["status"] == "fail"
    assert "already exists" in payload["error"]
    assert not (gov / "constitutions" / "platform" / "constitution.md").exists()


def test_create_domain_execute_governance_git(tmp_path):
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "--bare", str(remote)], check=True)

    gov = tmp_path / "gov"
    subprocess.run(["git", "clone", str(remote), str(gov)], check=True)
    subprocess.run(["git", "-C", str(gov), "checkout", "-b", "main"], check=True)
    subprocess.run(["git", "-C", str(gov), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(gov), "config", "user.name", "Test User"], check=True)
    subprocess.run(["git", "-C", str(gov), "commit", "--allow-empty", "-m", "init"], check=True)
    subprocess.run(["git", "-C", str(gov), "push", "-u", "origin", "main"], check=True)

    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "finance",
            "--personal-folder",
            str(personal),
            "--execute-governance-git",
        ]
    )

    assert completed.returncode == 0
    assert payload["status"] == "pass"
    assert payload["governance_git_executed"] is True
    assert payload["governance_commit_sha"]


def test_create_domain_governance_git_dirty_repo(tmp_path):
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "--bare", str(remote)], check=True)

    gov = tmp_path / "gov"
    subprocess.run(["git", "clone", str(remote), str(gov)], check=True)
    subprocess.run(["git", "-C", str(gov), "checkout", "-b", "main"], check=True)
    subprocess.run(["git", "-C", str(gov), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(gov), "config", "user.name", "Test User"], check=True)
    subprocess.run(["git", "-C", str(gov), "commit", "--allow-empty", "-m", "init"], check=True)
    subprocess.run(["git", "-C", str(gov), "push", "-u", "origin", "main"], check=True)

    (gov / "DIRTY.txt").write_text("dirty\n", encoding="utf-8")
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "risk",
            "--personal-folder",
            str(personal),
            "--execute-governance-git",
        ]
    )

    assert completed.returncode == 1
    assert payload["status"] == "fail"
    assert "preflight failed" in payload["error"].lower()
    assert not (gov / "features" / "risk" / "domain.yaml").exists()


def test_domain_yaml_schema_parity(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, payload = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "payments",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    data = yaml.safe_load((gov / "features" / "payments" / "domain.yaml").read_text(encoding="utf-8"))
    assert set(data.keys()) == {"kind", "id", "name", "domain", "status", "owner", "created", "updated"}
    assert data["kind"] == "domain"
    assert data["id"] == "payments"
    assert data["status"] == "active"


def test_constitution_content_parity(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, _ = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "audit",
            "--name",
            "Audit",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    content = (gov / "constitutions" / "audit" / "constitution.md").read_text(encoding="utf-8")
    assert content == EXPECTED_CONSTITUTION_BODY.replace("{domain}", "audit").replace("{display}", "Audit")


def test_context_yaml_schema_parity(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, _ = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "core",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    data = yaml.safe_load((personal / "context.yaml").read_text(encoding="utf-8"))
    assert set(data.keys()) == {"domain", "service", "updated_at", "updated_by"}
    assert data["domain"] == "core"
    assert data["service"] is None
    assert data["updated_by"] == "new-domain"


def test_create_domain_name_defaults_to_slug(tmp_path):
    gov = tmp_path / "gov"
    gov.mkdir()
    personal = tmp_path / "personal"
    completed, _ = run_script(
        [
            "create-domain",
            "--governance-repo",
            str(gov),
            "--domain",
            "ops",
            "--personal-folder",
            str(personal),
        ]
    )
    assert completed.returncode == 0
    data = yaml.safe_load((gov / "features" / "ops" / "domain.yaml").read_text(encoding="utf-8"))
    assert data["name"] == "ops"
