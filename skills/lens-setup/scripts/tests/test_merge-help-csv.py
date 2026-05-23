import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_script(name: str):
    script_path = Path(__file__).resolve().parents[1] / name
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class MergeHelpCsvTests(unittest.TestCase):
    def test_filter_and_roundtrip_rows(self):
        module = load_script("merge-help-csv.py")
        rows = [
            ["Lens", "lens-map-audit", "Audit", "MA"],
            ["Other", "other-skill", "Other", "OT"],
        ]

        self.assertEqual(module.extract_module_codes(rows), {"Lens", "Other"})
        self.assertEqual(module.filter_rows(rows, "Lens"), [rows[1]])

        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "module-help.csv"
            module.write_csv(str(target), ["module", "skill", "display-name", "menu-code"], rows)
            header, loaded = module.read_csv_rows(str(target))
            self.assertEqual(header, ["module", "skill", "display-name", "menu-code"])
            self.assertEqual(loaded, rows)

    def test_anti_zombie_merge_is_idempotent(self):
        module = load_script("merge-help-csv.py")
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            source = tmp_path / "source.csv"
            target = tmp_path / "target.csv"
            header = ",".join(module.HEADER)
            source.write_text(
                header
                + "\nLens,lens-doctor,doctor,LD,Check stable IDs,doctor,[scope],doctor,,,,,\n"
                + "Lens,lens-projection-rebuild,projection,PR,Rebuild maps,rebuild,[scope],projection,,,,,\n",
                encoding="utf-8",
            )
            target.write_text(
                header
                + "\nLens,lens-old,old,ZZ,Stale row,old,[],anytime,,,,,\n"
                + "Other,other-skill,other,OT,Other row,run,[],anytime,,,,,\n",
                encoding="utf-8",
            )

            source_header, source_rows = module.read_csv_rows(str(source))
            target_header, target_rows = module.read_csv_rows(str(target))
            filtered = target_rows
            for code in module.extract_module_codes(source_rows):
                filtered = module.filter_rows(filtered, code)
            merged = filtered + source_rows
            module.write_csv(str(target), target_header or source_header, merged)
            first = target.read_text(encoding="utf-8")

            target_header, target_rows = module.read_csv_rows(str(target))
            filtered = target_rows
            for code in module.extract_module_codes(source_rows):
                filtered = module.filter_rows(filtered, code)
            module.write_csv(str(target), target_header, filtered + source_rows)

            self.assertEqual(target.read_text(encoding="utf-8"), first)
            _, loaded = module.read_csv_rows(str(target))
            self.assertEqual(sum(1 for row in loaded if row[0] == "Lens"), 2)


if __name__ == "__main__":
    unittest.main()
