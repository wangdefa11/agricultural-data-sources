from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

from .db import connect
from .report import write_report
from .sources import SourceError, sync_psd, sync_wasde


DEFAULT_DB = Path("data/soybean.sqlite3")
DEFAULT_RAW = Path("data/raw")
DEFAULT_REPORTS = Path("reports")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="soybean-report",
        description="更新 USDA 大豆数据并生成全球供需宏观报告",
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    subparsers = parser.add_subparsers(dest="command", required=True)

    update = subparsers.add_parser("update", help="更新 PSD 和 WASDE 数据")
    update.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    update.add_argument(
        "--wasde-start-year",
        type=int,
        default=2021,
        help="导入该年份起的月度 WASDE CSV（默认：2021）",
    )

    report = subparsers.add_parser("report", help="生成 Markdown 宏观报告")
    report.add_argument("--output-dir", type=Path, default=DEFAULT_REPORTS)
    report.add_argument("--date", type=date.fromisoformat)

    run = subparsers.add_parser("run", help="更新数据后生成宏观报告")
    run.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW)
    run.add_argument("--output-dir", type=Path, default=DEFAULT_REPORTS)
    run.add_argument("--wasde-start-year", type=int, default=2021)
    run.add_argument("--date", type=date.fromisoformat)
    return parser


def _update(
    connection, raw_dir: Path, wasde_start_year: int
) -> None:
    psd = sync_psd(connection, raw_dir)
    print(
        f"PSD {psd['release_date']}: "
        f"读取 {psd['rows_seen']} 行，新增 {psd['rows_inserted']} 行"
    )
    wasde = sync_wasde(connection, raw_dir, wasde_start_year)
    inserted = sum(int(item["rows_inserted"]) for item in wasde)
    print(f"WASDE：处理 {len(wasde)} 期，新增 {inserted} 行")


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        with connect(args.db) as connection:
            if args.command in {"update", "run"}:
                _update(
                    connection,
                    args.raw_dir,
                    args.wasde_start_year,
                )
            if args.command in {"report", "run"}:
                path = write_report(
                    connection,
                    args.output_dir,
                    args.date,
                )
                print(f"宏观报告已生成：{path}")
        return 0
    except (SourceError, OSError, ValueError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1
