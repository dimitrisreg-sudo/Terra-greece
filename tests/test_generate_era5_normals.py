"""Tests for the offline generator. Run with its build-time dependencies installed."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/generate-era5-normals.py"
SPEC = importlib.util.spec_from_file_location("generate_era5_normals", SCRIPT)
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)


class Era5GeneratorTest(unittest.TestCase):
    def setUp(self):
        self.grid = (GENERATOR.ROWS, GENERATOR.COLS)

    def test_precipitation_months_and_years_are_totals(self):
        for year, days in ((1991, 365), (1992, 366)):
            values = np.ones((*self.grid, 24 * days), dtype=np.float32)
            result = GENERATOR.year_stats(values, year, "precipitation")
            self.assertEqual(result.shape, (*self.grid, 13))
            self.assertEqual(result[0, 0, 0], 24 * days)
            self.assertEqual(result[0, 0, 2], 24 * (28 + (days == 366)))

    def test_missing_hour_invalidates_only_that_cell_for_this_variable(self):
        values = np.full((*self.grid, 24 * 365), 12, dtype=np.float32)
        values[0, 0, 1] = np.nan
        result = GENERATOR.year_stats(values, 1991, "temperature_2m")
        self.assertTrue(np.isnan(result[0, 0]).all())
        self.assertTrue((result[1, 0] == 12).all())

    def test_rounding_retains_sign_and_valid_zero(self):
        np.testing.assert_array_equal(GENERATOR.round_daily(np.array([-1.25, 0, 1.25])),
                                      [-1.3, 0, 1.3])


if __name__ == "__main__":
    unittest.main()
