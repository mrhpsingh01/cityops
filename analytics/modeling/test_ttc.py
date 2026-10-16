import unittest
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent

class TestTtcModel(unittest.TestCase):
    def test_ttc_report_exists_and_valid(self):
        report_file = ROOT / "ttc_report.json"
        self.assertTrue(report_file.exists(), "ttc_report.json must exist")
        data = json.loads(report_file.read_text(encoding="utf-8"))
        self.assertEqual(data["model_version"], "hist-gbr-2025-v2")
        self.assertEqual(data["status"], "ACTIVE_PRODUCTION")
        self.assertIn("evaluation", data)
        self.assertIn("feature_importances", data)
        self.assertIn("resolution_benchmarks", data)
        self.assertIn("PostgreSQL", data["training_data_source"])
        self.assertNotIn("synth", data["training_data_source"].lower())
        self.assertIsInstance(data["beats_grouped_median_baseline"], bool)
        self.assertAlmostEqual(sum(f["importance_pct"] for f in data["feature_importances"]), 100, delta=0.6)

    def test_ttc_stats_lookup(self):
        stats_file = ROOT / "ttc_stats.json"
        self.assertTrue(stats_file.exists(), "ttc_stats.json must exist")
        stats = json.loads(stats_file.read_text(encoding="utf-8"))
        self.assertEqual(stats["modelVersion"], "hist-gbr-2025-v2")
        self.assertIn("HEAT/HOT WATER", stats["benchmarks"])
        self.assertGreater(stats["benchmarks"]["HEAT/HOT WATER"]["median_hours"], 30)

if __name__ == "__main__":
    unittest.main()
