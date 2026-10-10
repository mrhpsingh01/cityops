import unittest
from feature_contract import ALLOWED_FEATURES, assert_feature_contract


class FeatureContractTests(unittest.TestCase):
    def test_approved_creation_features(self):
        assert_feature_contract(ALLOWED_FEATURES)

    def test_future_outcome_is_rejected(self):
        for field in ("closed_at_local", "status_normalized", "resolution_description", "target"):
            with self.assertRaises(ValueError):
                assert_feature_contract(list(ALLOWED_FEATURES) + [field])


if __name__ == "__main__":
    unittest.main()
