from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
CORE_PATH = ROOT / "skills" / "lens-setup" / "scripts" / "lens_seed_core.py"
SPEC = importlib.util.spec_from_file_location("lens_seed_core", CORE_PATH)
core = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(core)


class SeedImprovementTests(unittest.TestCase):
    def copy_fixture_tree(self, root: Path) -> Path:
        fixture_root = ROOT / "skills" / "lens-setup" / "assets" / "fixtures" / "seed_improvements"
        target = root / "docs" / "fixtures"
        shutil.copytree(fixture_root, target)
        for feature_id in ["lens-seed-improvements", "seed-a", "seed-b", "seed-c", "invalid-prefix", "incomplete-waiver"]:
            (root / "docs" / "features" / feature_id).mkdir(parents=True, exist_ok=True)
        return target

    def args(self, root: Path, fixture_path: Path) -> argparse.Namespace:
        return argparse.Namespace(
            project_root=root,
            work_intake_path="docs/features",
            feature_archive_path=fixture_path.relative_to(root).as_posix(),
            landscape_root=fixture_path.relative_to(root).as_posix(),
            reporting_output_path="_bmad-output/lens",
            include_drafts=True,
            verbose=True,
            branch="feature/lens-seed-improvements",
        )

    def test_nested_schema_fixtures_and_deterministic_salmon_clusters(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            fixture_path = self.copy_fixture_tree(root)
            args = self.args(root, fixture_path)

            entities = core.collect_entities(args)
            feature = next(entity for entity in entities if entity["stable_id"] == "feature:lens-seed-improvements")
            self.assertEqual(feature["topology_waiver"]["status"], "accepted")

            salmon = core.run_salmon_report(args)
            candidates = salmon["candidate_records"]
            self.assertEqual(len(candidates), 1)
            self.assertEqual(candidates[0]["target_stable_id"], "service:lens-workbench")
            self.assertEqual(candidates[0]["cluster_confidence"], "strong")

    def test_doctor_reports_invalid_fixture_cases_and_pilot_ledger_link(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            fixture_path = self.copy_fixture_tree(root)
            result = core.run_doctor(self.args(root, fixture_path))
            codes = {finding["code"] for finding in result["findings"]}

            self.assertIn("duplicate_stable_id", codes)
            self.assertIn("invalid_stable_id_prefix", codes)
            self.assertIn("missing_required_field", codes)
            self.assertIn("parent_cycle", codes)
            self.assertIn("invalid_waiver", codes)
            self.assertNotIn(
                "feature:lens-seed-improvements",
                {
                    finding["stable_id"]
                    for finding in result["findings"]
                    if finding["code"] == "unknown_parent" and finding["severity"] == "blocker"
                },
            )

    def test_projection_check_ignores_generated_timestamp_and_detects_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            fixture_path = self.copy_fixture_tree(root)
            args = self.args(root, fixture_path)
            args.generated_at = "2026-05-23T00:00:00+00:00"
            args.force = True
            args.check = False
            args.write = True
            args.explain = None
            code, written = core.run_rebuild(args)
            self.assertEqual(code, 0)

            args.generated_at = "2026-05-24T00:00:00+00:00"
            args.check = True
            args.write = False
            code, checked = core.run_rebuild(args)
            self.assertEqual(code, 0)
            self.assertEqual(checked["status"], "pass")

            payload_path = Path(written["json_path"])
            payload = json.loads(payload_path.read_text(encoding="utf-8"))
            payload["entities"] = []
            payload_path.write_text(json.dumps(payload), encoding="utf-8")
            code, checked = core.run_rebuild(args)
            self.assertEqual(code, 1)
            self.assertEqual(checked["status"], "drift")

    def test_explain_and_release_validation_report(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            fixture_path = self.copy_fixture_tree(root)
            args = self.args(root, fixture_path)
            args.generated_at = "2026-05-23T00:00:00+00:00"
            args.force = True
            args.check = False
            args.write = True
            args.explain = None
            core.run_rebuild(args)

            args.explain = "feature:lens-seed-improvements"
            code, explanation = core.run_rebuild(args)
            self.assertEqual(code, 0)
            self.assertEqual(explanation["status"], "pass")
            self.assertTrue(explanation["edges"])

            release_args = self.args(root, fixture_path)
            release_args.allow_projection_drift = False
            code, report = core.run_release_validation(release_args)
            self.assertIn("commands_run", report)
            self.assertTrue((root / "_bmad-output" / "lens" / "release-validation.json").exists())


if __name__ == "__main__":
    unittest.main()
