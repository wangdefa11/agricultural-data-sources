from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from soybean_report.catalog import (
    attach_series_to_page,
    latest_observations,
    list_page_series,
    upsert_entity,
    upsert_entity_relation,
    upsert_metric,
    upsert_observation,
    upsert_series,
)
from soybean_report.db import connect


class CatalogTest(unittest.TestCase):
    def test_one_series_can_be_reused_by_multiple_pages(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with connect(Path(directory) / "test.sqlite3") as connection:
                for entity_id, slug, name in (
                    ("commodity_hog", "hog", "生猪"),
                    ("commodity_soymeal", "soymeal", "豆粕"),
                ):
                    upsert_entity(
                        connection,
                        entity_id=entity_id,
                        slug=slug,
                        name=name,
                        entity_type="commodity",
                    )
                upsert_entity_relation(
                    connection,
                    from_entity_id="commodity_soymeal",
                    to_entity_id="commodity_hog",
                    relation_type="feed_input_for",
                    description="豆粕是生猪养殖的蛋白饲料原料",
                )
                upsert_metric(
                    connection,
                    metric_code="hog_inventory",
                    name="生猪存栏",
                    definition="报告期末生猪存栏数量",
                    default_unit="万头",
                )
                upsert_series(
                    connection,
                    series_id="cn_hog_inventory_q_nbs",
                    metric_code="hog_inventory",
                    name="全国生猪季度末存栏",
                    geography="中国",
                    frequency="quarterly",
                    unit="万头",
                    source="国家统计局",
                )
                attach_series_to_page(
                    connection,
                    page_entity_id="commodity_hog",
                    series_id="cn_hog_inventory_q_nbs",
                    section="供给",
                    role="core",
                    display_title="全国生猪存栏",
                )
                attach_series_to_page(
                    connection,
                    page_entity_id="commodity_soymeal",
                    series_id="cn_hog_inventory_q_nbs",
                    section="下游需求",
                    role="demand_proxy",
                    display_title="生猪存栏：豆粕饲用需求参考",
                )
                upsert_observation(
                    connection,
                    series_id="cn_hog_inventory_q_nbs",
                    period="2026-Q1",
                    value=41731,
                    release_date="2026-04-18",
                )

                hog_usage = list_page_series(connection, "commodity_hog")
                soymeal_usage = list_page_series(
                    connection, "commodity_soymeal"
                )

                self.assertEqual(
                    hog_usage[0]["series_id"], "cn_hog_inventory_q_nbs"
                )
                self.assertEqual(
                    soymeal_usage[0]["series_id"], "cn_hog_inventory_q_nbs"
                )
                self.assertNotEqual(
                    hog_usage[0]["display_title"],
                    soymeal_usage[0]["display_title"],
                )

                upsert_observation(
                    connection,
                    series_id="cn_hog_inventory_q_nbs",
                    period="2026-Q1",
                    value=41800,
                    release_date="2026-04-18",
                )
                points = latest_observations(
                    connection, "cn_hog_inventory_q_nbs"
                )
                self.assertEqual(points[0]["value"], 41800)
                self.assertEqual(
                    connection.execute(
                        "SELECT COUNT(*) FROM observations"
                    ).fetchone()[0],
                    1,
                )

    def test_latest_observations_keep_revisions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with connect(Path(directory) / "test.sqlite3") as connection:
                upsert_metric(
                    connection,
                    metric_code="hog_inventory",
                    name="生猪存栏",
                    definition="报告期末生猪存栏数量",
                )
                upsert_series(
                    connection,
                    series_id="cn_hog_inventory_y_nbs",
                    metric_code="hog_inventory",
                    name="全国年末生猪存栏",
                    geography="中国",
                    frequency="annual",
                    unit="万头",
                    source="国家统计局",
                )
                for release_date, value in (
                    ("2026-01-20", 42743),
                    ("2026-02-28", 42760),
                ):
                    upsert_observation(
                        connection,
                        series_id="cn_hog_inventory_y_nbs",
                        period="2025",
                        value=value,
                        release_date=release_date,
                    )

                points = latest_observations(
                    connection, "cn_hog_inventory_y_nbs"
                )
                self.assertEqual(len(points), 1)
                self.assertEqual(points[0]["value"], 42760)
                self.assertEqual(
                    connection.execute(
                        "SELECT COUNT(*) FROM observations"
                    ).fetchone()[0],
                    2,
                )


if __name__ == "__main__":
    unittest.main()
