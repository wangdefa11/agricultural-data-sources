from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path

from soybean_report.db import connect
from soybean_report.sources import _wasde_month_key, import_wasde_csv


HEADERS = [
    "WasdeNumber",
    "ReportDate",
    "ReportTitle",
    "Attribute",
    "ReliabilityProjection",
    "Commodity",
    "Region",
    "MarketYear",
    "ProjEstFlag",
    "AnnualQuarterFlag",
    "Value",
    "Unit",
    "ReleaseDate",
    "ReleaseTime",
    "ForecastYear",
    "ForecastMonth",
]


class ImportWasdeTest(unittest.TestCase):
    def test_month_key_accepts_corrected_v2_filename(self) -> None:
        url = (
            "https://www.usda.gov/sites/default/files/documents/"
            "oce-wasde-report-data-2026-06-V2.csv"
        )
        self.assertEqual(_wasde_month_key(url), "2026-06")

    def test_import_is_idempotent_and_filters_soybeans(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            csv_path = root / "sample.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as output:
                writer = csv.writer(output)
                writer.writerow(HEADERS)
                writer.writerow(
                    [
                        "673",
                        "July 2026",
                        "World Soybean Supply and Use",
                        "Production",
                        "",
                        "Oilseed, Soybean",
                        "Brazil",
                        "2025/26",
                        "Proj.",
                        "Annual",
                        "175.0",
                        "Million Metric Tons",
                        "2026-07-10",
                        "12:00:00",
                        "2026",
                        "7",
                    ]
                )
                writer.writerow(
                    [
                        "673",
                        "July 2026",
                        "Reliability of July Projections",
                        "Production",
                        "",
                        "Oilseed, Soybean",
                        "World",
                        "",
                        "",
                        "Annual",
                        "",
                        "Percent",
                        "2026-07-10",
                        "12:00:00",
                        "2026",
                        "7",
                    ]
                )
                writer.writerow(
                    [
                        "673",
                        "July 2026",
                        "World Wheat Supply and Use",
                        "Production",
                        "",
                        "Wheat",
                        "World",
                        "2025/26",
                        "Proj.",
                        "Annual",
                        "800.0",
                        "Million Metric Tons",
                        "2026-07-10",
                        "12:00:00",
                        "2026",
                        "7",
                    ]
                )
            with connect(root / "test.sqlite3") as connection:
                first = import_wasde_csv(connection, csv_path)
                second = import_wasde_csv(connection, csv_path)
                count = connection.execute(
                    "SELECT COUNT(*) FROM wasde_observations"
                ).fetchone()[0]
            self.assertEqual(first["rows_seen"], 1)
            self.assertEqual(first["rows_inserted"], 1)
            self.assertEqual(second["rows_inserted"], 0)
            self.assertEqual(count, 1)


if __name__ == "__main__":
    unittest.main()
