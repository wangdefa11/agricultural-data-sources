"""把 data/raw/wind/ 下的 Wind 采集 CSV 统一入库到 soybean.sqlite3。

宽表指标统一转成长表 wind_observations(date, indicator, value, source_file)，
CBOT 合约快照单独存 wind_cbot_snapshot。重复运行幂等：先删同来源文件旧行再写入。
"""
import csv
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "wind"
DB = ROOT / "data" / "soybean.sqlite3"

WIDE_FILES = [
    "wind_soymeal_stocks_annual.csv",
    "wind_soymeal_spot_monthly.csv",
    "wind_soybean_crush_monthly.csv",
    "wind_broiler_inventory.csv",
    "wind_layerhen_beijing_tianjin.csv",
    "wind_layerhen_sd_he_nheb.csv",
    "wind_layerhen_ln_js_hub.csv",
]
CBOT_FILE = "wind_cbot_soybean_snapshot.csv"


def main() -> None:
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS wind_observations(
             date TEXT, indicator TEXT, value REAL, source_file TEXT,
             PRIMARY KEY(date, indicator, source_file))"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS wind_cbot_snapshot(
             wind_code TEXT, contract TEXT, close REAL, trade_time TEXT,
             trade_date TEXT, currency TEXT, unit TEXT,
             PRIMARY KEY(wind_code, trade_date))"""
    )

    total = 0
    for name in WIDE_FILES:
        path = RAW / name
        cur.execute("DELETE FROM wind_observations WHERE source_file=?", (name,))
        with path.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            # 同名列按出现顺序加 #2/#3 后缀，避免后列被去重丢弃
            seen: dict[str, int] = {}
            indicators: list[str] = []
            for ind in header[1:]:
                seen[ind] = seen.get(ind, 0) + 1
                indicators.append(ind if seen[ind] == 1 else f"{ind}#{seen[ind]}")
            for row in reader:
                if not row or not row[0].strip():
                    continue
                date = row[0].strip()
                for i, ind in enumerate(indicators):
                    cell = row[i + 1].strip() if i + 1 < len(row) else ""
                    if not cell:
                        continue
                    cur.execute(
                        "INSERT OR REPLACE INTO wind_observations VALUES(?,?,?,?)",
                        (date, ind, float(cell), name),
                    )
                    total += 1

    cur.execute("DELETE FROM wind_cbot_snapshot")
    with (RAW / CBOT_FILE).open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            close = row["收盘价"].strip()
            cur.execute(
                "INSERT OR REPLACE INTO wind_cbot_snapshot VALUES(?,?,?,?,?,?,?)",
                (
                    row["Wind代码"].strip(),
                    row["证券简称"].strip(),
                    float(close) if close else None,
                    row["交易时间"].strip(),
                    row["日期"].strip(),
                    row["交易币种"].strip(),
                    row["报价单位"].strip(),
                ),
            )
    con.commit()

    n = cur.execute("SELECT COUNT(*) FROM wind_observations").fetchone()[0]
    m = cur.execute("SELECT COUNT(*) FROM wind_cbot_snapshot").fetchone()[0]
    print(f"wind_observations 写入 {total} 行，库内共 {n} 行；wind_cbot_snapshot 共 {m} 行")
    for ind, cnt in cur.execute(
        "SELECT indicator, COUNT(*) FROM wind_observations GROUP BY indicator ORDER BY indicator"
    ):
        print(f"  {ind}: {cnt}")
    con.close()


if __name__ == "__main__":
    main()
