from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path


COUNTRIES = ("United States", "Brazil", "Argentina", "China")
PSD_ATTRIBUTES = (
    "Production",
    "Imports",
    "Exports",
    "Crush",
    "Domestic Consumption",
    "Ending Stocks",
)
WASDE_ATTRIBUTES = (
    "Production",
    "Imports",
    "Exports",
    "Domestic Crush",
    "Domestic Total",
    "Ending Stocks",
)
WASDE_REGIONS = ("World", "United States", "Brazil", "Argentina", "China")
WASDE_REPORT_TITLE = "World Soybean Supply and Use"

ZH = {
    "United States": "美国",
    "Brazil": "巴西",
    "Argentina": "阿根廷",
    "China": "中国",
    "World": "全球",
    "Production": "产量",
    "Imports": "进口",
    "Exports": "出口",
    "Crush": "压榨",
    "Domestic Crush": "压榨",
    "Domestic Consumption": "国内消费",
    "Domestic Total": "国内消费",
    "Ending Stocks": "期末库存",
}


def _fmt(value: float | None) -> str:
    return "—" if value is None else f"{value / 1000:,.2f}"


def _fmt_wasde(value: float | None) -> str:
    return "—" if value is None else f"{value:,.2f}"


def _change(current: float | None, previous: float | None, scale: float) -> str:
    if current is None or previous is None:
        return "—"
    delta = (current - previous) / scale
    if previous == 0:
        return f"{delta:+,.2f}"
    percent = (current / previous - 1) * 100
    return f"{delta:+,.2f}（{percent:+.1f}%）"


def _latest_psd(
    connection: sqlite3.Connection,
) -> tuple[str | None, dict[tuple[str, int, str], float]]:
    release = connection.execute(
        "SELECT MAX(release_date) FROM psd_observations"
    ).fetchone()[0]
    if not release:
        return None, {}
    placeholders_countries = ",".join("?" for _ in COUNTRIES)
    placeholders_attributes = ",".join("?" for _ in PSD_ATTRIBUTES)
    rows = connection.execute(
        f"""
        SELECT country, market_year, attribute, value
        FROM psd_observations
        WHERE release_date = ?
          AND country IN ({placeholders_countries})
          AND attribute IN ({placeholders_attributes})
          AND unit = '(1000 MT)'
        """,
        (release, *COUNTRIES, *PSD_ATTRIBUTES),
    )
    return release, {
        (row["country"], row["market_year"], row["attribute"]): row["value"]
        for row in rows
    }


def _wasde_revisions(
    connection: sqlite3.Connection,
) -> tuple[list[str], list[sqlite3.Row]]:
    releases = [
        row[0]
        for row in connection.execute(
            """
            SELECT DISTINCT release_date
            FROM wasde_observations
            ORDER BY release_date DESC
            LIMIT 2
            """
        )
    ]
    if not releases:
        return [], []
    placeholders_regions = ",".join("?" for _ in WASDE_REGIONS)
    placeholders_attributes = ",".join("?" for _ in WASDE_ATTRIBUTES)
    placeholders_releases = ",".join("?" for _ in releases)
    rows = list(
        connection.execute(
            f"""
            SELECT release_date, region, market_year, attribute, value
            FROM wasde_observations
            WHERE release_date IN ({placeholders_releases})
              AND report_title = ?
              AND region IN ({placeholders_regions})
              AND attribute IN ({placeholders_attributes})
              AND unit = 'Million Metric Tons'
            ORDER BY market_year DESC, region, attribute, release_date DESC
            """,
            (
                *releases,
                WASDE_REPORT_TITLE,
                *WASDE_REGIONS,
                *WASDE_ATTRIBUTES,
            ),
        )
    )
    return releases, rows


def build_report(
    connection: sqlite3.Connection, report_date: date | None = None
) -> str:
    today = report_date or date.today()
    psd_release, psd = _latest_psd(connection)
    wasde_releases, wasde_rows = _wasde_revisions(connection)
    lines = [
        f"# 大豆全球供需宏观报告｜{today.isoformat()}",
        "",
        "## 数据状态",
        "",
        f"- USDA PSD 最新数据集：{psd_release or '尚未导入'}",
        (
            f"- USDA WASDE 最近两次发布：{'、'.join(wasde_releases)}"
            if wasde_releases
            else "- USDA WASDE：尚未导入"
        ),
        "",
        "## 年度变化（PSD 当前官方序列）",
        "",
        "单位：百万吨；变化为最新市场年度相对上一市场年度。",
        "",
        "| 国家 | 指标 | 上一年度 | 最新年度 | 上年值 | 最新值 | 变化 |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]

    for country in COUNTRIES:
        years = sorted(
            {
                year
                for (row_country, year, _attribute) in psd
                if row_country == country
            }
        )
        if len(years) < 2:
            continue
        previous_year, current_year = years[-2:]
        for attribute in PSD_ATTRIBUTES:
            previous = psd.get((country, previous_year, attribute))
            current = psd.get((country, current_year, attribute))
            lines.append(
                f"| {ZH[country]} | {ZH[attribute]} | {previous_year}/{str(previous_year + 1)[-2:]} "
                f"| {current_year}/{str(current_year + 1)[-2:]} | {_fmt(previous)} "
                f"| {_fmt(current)} | {_change(current, previous, 1000)} |"
            )

    lines.extend(
        [
            "",
            "## 月度修订（WASDE）",
            "",
            "单位：百万吨；仅列最近两次发布之间发生变化的项目。",
            "",
        ]
    )
    if len(wasde_releases) < 2:
        lines.append("历史发布不足两期，暂时无法计算月度修订。")
    else:
        latest, previous = wasde_releases
        values = {
            (
                row["release_date"],
                row["region"],
                row["market_year"],
                row["attribute"],
            ): row["value"]
            for row in wasde_rows
        }
        changed: list[tuple[str, str, str, float, float]] = []
        keys = {
            (row["region"], row["market_year"], row["attribute"])
            for row in wasde_rows
        }
        for region, market_year, attribute in sorted(keys):
            old = values.get((previous, region, market_year, attribute))
            new = values.get((latest, region, market_year, attribute))
            if old is not None and new is not None and old != new:
                changed.append((region, market_year, attribute, old, new))
        if changed:
            lines.extend(
                [
                    f"| 地区 | 市场年度 | 指标 | {previous} | {latest} | 修订 |",
                    "|---|---:|---|---:|---:|---:|",
                ]
            )
            for region, market_year, attribute, old, new in changed:
                lines.append(
                    f"| {ZH[region]} | {market_year} | {ZH[attribute]} "
                    f"| {_fmt_wasde(old)} | {_fmt_wasde(new)} "
                    f"| {_change(new, old, 1)} |"
                )
        else:
            lines.append("最近两次发布中，所跟踪的大豆指标没有变化。")

    lines.extend(
        [
            "",
            "## 说明",
            "",
            "- PSD 是纳入历史修订后的当前官方序列，适合年度比较。",
            "- WASDE 历史文件保留每次发布时的判断，适合观察月度预测修订。",
            "- 本版尚未接入价格、仓单、基差和新闻，不据此生成多空结论。",
            "",
        ]
    )
    return "\n".join(lines)


def write_report(
    connection: sqlite3.Connection,
    output_dir: Path,
    report_date: date | None = None,
) -> Path:
    today = report_date or date.today()
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"soybean_macro_{today.isoformat()}.md"
    path.write_text(build_report(connection, today), encoding="utf-8")
    return path
