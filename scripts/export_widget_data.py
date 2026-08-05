"""把宏观面板数据导出为 Widget 工作区的 data.js。

用法：python3 scripts/export_widget_data.py <widget_workspace_dir>
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "soybean.sqlite3"


def main() -> None:
    out_dir = Path(sys.argv[1])
    con = sqlite3.connect(DB)
    cur = con.cursor()

    def series(ind):
        return [{"m": m, "v": v} for m, v in cur.execute(
            "SELECT month, value FROM macro_monthly WHERE indicator=? ORDER BY month", (ind,))]

    crush = series("大豆压榨量(实际月度)(万吨/月)")
    spot = series("豆粕现货价月均(元/吨)")

    cards = []
    for ind, label, unit in [
        ("中国:期末库存量:豆粕", "豆粕期末库存(USDA)", "百万吨"),
        ("中国:年末存栏数量:父母代肉鸡场", "父母代肉鸡存栏", "亿只"),
        ("北京:畜禽存栏量:家禽:产蛋鸡", "北京产蛋鸡存栏", "万只"),
    ]:
        row = cur.execute(
            "SELECT date, value FROM wind_observations WHERE indicator=? ORDER BY date DESC LIMIT 1",
            (ind,)).fetchone()
        if not row:
            continue
        d, v = row
        if unit == "百万吨":
            v = round(v / 100, 2)
        elif unit == "亿只":
            v = round(v / 1e8, 2)
        cards.append({"label": label, "value": v, "unit": unit, "year": d[:4]})

    cbot = cur.execute(
        "SELECT contract, close, trade_date FROM wind_cbot_snapshot "
        "WHERE close>0 ORDER BY trade_date DESC, contract LIMIT 1").fetchone()

    def mom(s):
        if len(s) >= 2 and s[-2]["v"]:
            return round((s[-1]["v"] / s[-2]["v"] - 1) * 100, 1)
        return None

    vals = [p["v"] for p in crush]
    pct = round((vals[-1] - min(vals)) / (max(vals) - min(vals)), 2) if crush else 0.5

    data = {
        "crush": crush,
        "spot": spot,
        "crushMom": mom(crush),
        "spotMom": mom(spot),
        "crushPct": pct,
        "cards": cards,
        "cbot": {"contract": cbot[0], "close": cbot[1], "date": cbot[2]} if cbot else None,
        "updated": "2026-08-01",
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "data.js").write_text(
        "window.MACRO_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    print("written:", out_dir / "data.js")
    con.close()


if __name__ == "__main__":
    main()
