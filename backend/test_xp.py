import os
import unittest

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from app.services.xp import (
    XP_REWARD_ROADMAP,
    XP_REWARD_STEP,
    level_from_xp,
    next_threshold,
    progress_pct,
    tier_from_level,
    xp_summary,
)


class LevelTests(unittest.TestCase):
    def test_below_first_threshold_is_level_one(self):
        self.assertEqual(level_from_xp(0), 1)
        self.assertEqual(level_from_xp(249), 1)

    def test_at_threshold_promotes(self):
        self.assertEqual(level_from_xp(250), 2)
        self.assertEqual(level_from_xp(750), 3)
        self.assertEqual(level_from_xp(1500), 4)
        self.assertEqual(level_from_xp(2500), 5)

    def test_between_thresholds_stays(self):
        self.assertEqual(level_from_xp(749), 2)
        self.assertEqual(level_from_xp(1499), 3)
        self.assertEqual(level_from_xp(2499), 4)

    def test_beyond_max_adds_1500_per_level(self):
        self.assertEqual(level_from_xp(4000), 6)
        self.assertEqual(level_from_xp(5500), 7)

    def test_negative_xp_is_level_one(self):
        self.assertEqual(level_from_xp(-5), 1)


class TierTests(unittest.TestCase):
    def test_tier_bands(self):
        self.assertEqual(tier_from_level(1), "Pemula")
        self.assertEqual(tier_from_level(2), "Pemula")
        self.assertEqual(tier_from_level(3), "Menengah")
        self.assertEqual(tier_from_level(4), "Menengah")
        self.assertEqual(tier_from_level(5), "Mahir")
        self.assertEqual(tier_from_level(9), "Mahir")


class NextThresholdTests(unittest.TestCase):
    def test_next_thresholds(self):
        self.assertEqual(next_threshold(0), 250)
        self.assertEqual(next_threshold(250), 750)
        self.assertEqual(next_threshold(749), 750)
        self.assertEqual(next_threshold(1000), 1500)

    def test_after_max_keeps_stepping(self):
        self.assertEqual(next_threshold(2500), 4000)
        self.assertEqual(next_threshold(4000), 5500)


class ProgressTests(unittest.TestCase):
    def test_zero_xp_has_zero_progress(self):
        self.assertEqual(progress_pct(0), 0)

    def test_midway_progress(self):
        self.assertEqual(progress_pct(500), 50)  # level 2, antara 250..750

    def test_at_threshold_progress_zero_to_next(self):
        self.assertEqual(progress_pct(250), 0)   # menuju 750


class SummaryTests(unittest.TestCase):
    def test_summary_shape_and_values(self):
        s = xp_summary(500)
        self.assertEqual(
            s,
            {"total_xp": 500, "level": 2, "tier": "Pemula", "next_threshold": 750, "progress_pct": 50},
        )

    def test_summary_top_tier(self):
        s = xp_summary(3000)
        self.assertEqual((s["level"], s["tier"]), (5, "Mahir"))
        s2 = xp_summary(4000)
        self.assertEqual((s2["level"], s2["tier"]), (6, "Mahir"))


class RewardConstantsTests(unittest.TestCase):
    def test_rewards_are_positive(self):
        self.assertGreater(XP_REWARD_STEP, 0)
        self.assertGreater(XP_REWARD_ROADMAP, 0)

    def test_roadmap_bonus_is_larger_than_step(self):
        self.assertGreater(XP_REWARD_ROADMAP, XP_REWARD_STEP)


if __name__ == "__main__":
    unittest.main()