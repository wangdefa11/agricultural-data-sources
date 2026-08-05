from __future__ import annotations

import tempfile
import unittest
from datetime import date
from pathlib import Path

from soybean_report.db import connect
from soybean_report.report import build_report


class ReportTest(unittest.TestCase):
    def test_report_contains_yearly_and_monthly_changes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with connect(Path(directory) / "test.sqlite3") as connection:
                for year, value in ((2024, 170000), (2025, 175000)):
                    connection.execute(
                        """
                        INSERT INTO psd_observations VALUES (
                            NULL, '2222000', 'Oilseed, Soybean', 'BR',
                            'Brazil', ?, 2026, 7, '028', 'Production',
                            '08', '(1000 MT)', ?, '2026-07-10',
                            '2026-07-10T12:00:00+00:00', 'sample.zip'
                        )
                        """,
                        (year, value),
                    )
                for release, value, month in (
                    ("2026-06-11", 175.0, 6),
                    ("2026-07-10", 173.0, 7),
                ):
                    connection.execute(
                        """
                        INSERT INTO wasde_observations VALUES (
                            NULL, '673', 'July 2026',
                            'World Soybean Supply and Use', 'Production', '',
                            'Oilseed, Soybean', 'Brazil', '2025/26',
                            'Proj.', 'Annual', ?, 'Million Metric Tons', ?,
                            '12:00:00', 2026, ?,
                            '2026-07-10T12:00:00+00:00', 'sample.csv'
                        )
                        """,
                        (value, release, month),
                    )
                report = build_report(connection, date(2026, 7, 29))
        self.assertIn("巴西 | 产量", report)
        self.assertIn("+5.00（+2.9%）", report)
        self.assertIn("-2.00（-1.1%）", report)


if __name__ == "__main__":
    unittest.main()

